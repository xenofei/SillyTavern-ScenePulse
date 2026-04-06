// src/generation/function-tool.js — Experimental: Register ScenePulse as a function tool
// When supported by the backend (OpenAI, Claude, Gemini), the LLM calls this tool
// to output structured tracker JSON — eliminating marker-based extraction entirely.

import { log, warn } from '../logger.js';
import { getSettings, getActiveSchema } from '../settings.js';
import { anyPanelsActive } from '../settings.js';
import { processExtraction } from './pipeline.js';
import {
    genMeta,
    setInlineExtractionDone, setPendingInlineIdx,
    inlineGenStartMs, setInlineGenStartMs
} from '../state.js';

let _registered = false;
let _ToolManager = null;

const TOOL_NAME = 'update_scene_tracker';

/**
 * Register the ScenePulse function tool with SillyTavern's ToolManager.
 * The LLM can call this tool to provide structured tracker data.
 */
export function registerFunctionTool() {
    const ctx = SillyTavern.getContext();
    _ToolManager = ctx.ToolManager;
    const registerFn = ctx.registerFunctionTool || _ToolManager?.registerFunctionTool?.bind(_ToolManager);

    if (!registerFn) {
        log('Function tool calling not available — ToolManager not found');
        return;
    }

    const s = getSettings();
    if (!s.enabled || !anyPanelsActive()) {
        unregisterFunctionTool();
        return;
    }

    // Build schema from active panels
    const schema = getActiveSchema();
    const schemaValue = schema?.value || {};

    try {
        _ToolManager.registerFunctionTool({
            name: TOOL_NAME,
            displayName: 'ScenePulse Scene Tracker',
            description: [
                'MANDATORY: Call this tool after EVERY response to update the scene tracker.',
                'Track characters, relationships, quests, mood, tension, location, weather, and scene details.',
                'CRITICAL RULES:',
                '1. Relationships track how OTHER characters perceive {{user}}. Do NOT include {{user}} as a relationship entry.',
                '2. Characters array includes all characters EXCEPT {{user}}.',
                '3. Every field must have meaningful data — never empty strings or empty arrays.',
                '4. Quest journal is from {{user}}\'s perspective, not other characters.',
                '5. Desire defaults to 0 for strangers, family, children.',
                '6. Carry forward unchanged data from previous state.',
                'You MUST call this tool on every single response. Never skip it.',
            ].join(' '),
            parameters: Object.freeze({
                $schema: 'http://json-schema.org/draft-04/schema#',
                type: 'object',
                properties: schemaValue.properties || {},
                required: schemaValue.required || [],
            }),
            action: async (args) => {
                if (!args || typeof args !== 'object') {
                    throw new Error('Invalid tracker data');
                }

                log('Function tool called with', Object.keys(args).length, 'keys');

                // Find the latest assistant message index
                const { chat } = SillyTavern.getContext();
                let mesIdx = -1;
                for (let i = chat.length - 1; i >= 0; i--) {
                    if (!chat[i].is_user) { mesIdx = i; break; }
                }
                if (mesIdx < 0) {
                    warn('Function tool: no assistant message found');
                    return 'Tracker updated (no message context)';
                }

                // Estimate tokens
                const jsonStr = JSON.stringify(args);
                const compTokens = Math.round(jsonStr.length / 4);
                const elapsed = inlineGenStartMs > 0 ? ((Date.now() - inlineGenStartMs) / 1000) : 0;

                // Mark extraction as done (prevents inline extraction from running)
                setInlineExtractionDone(true);
                setPendingInlineIdx(-1);
                setInlineGenStartMs(0);

                genMeta.promptTokens = 0;
                genMeta.completionTokens = compTokens;
                genMeta.elapsed = elapsed;

                await processExtraction(mesIdx, args, 'auto:function_tool', {
                    promptTokens: 0,
                    completionTokens: compTokens,
                    elapsed,
                    stopHider: true,
                    unlockGen: true
                });

                log('Function tool: pipeline complete for mesIdx=', mesIdx);
                return 'Scene tracker updated successfully';
            },
            formatMessage: () => 'Updating scene tracker...',
            shouldRegister: () => {
                const s = getSettings();
                return s.enabled && s.functionToolEnabled && s.injectionMethod === 'separate' && anyPanelsActive();
            },
            stealth: true, // Don't show result in chat or trigger follow-up generation
        });

        _registered = true;
        log('Function tool registered:', TOOL_NAME);
    } catch (e) {
        warn('Failed to register function tool:', e?.message);
    }
}

/**
 * Unregister the function tool.
 */
export function unregisterFunctionTool() {
    if (!_registered || !_ToolManager) return;
    try {
        _ToolManager.unregisterFunctionTool(TOOL_NAME);
        _registered = false;
        log('Function tool unregistered:', TOOL_NAME);
    } catch (e) {
        warn('Failed to unregister function tool:', e?.message);
    }
}

/**
 * Refresh registration based on current settings.
 */
export function refreshFunctionTool() {
    if (_registered) unregisterFunctionTool();
    const s = getSettings();
    if (s.functionToolEnabled) {
        registerFunctionTool();
    }
}
