// src/presets/registry.js — Preset matcher + applier (v6.20.0)
//
// Glues the bundled BUILT_IN_PRESETS to the active SillyTavern connection.
// Two responsibilities:
//
//   1. Match: given the user's currently-selected model id, find the
//      best-matching preset (or null). Uses case-insensitive substring
//      matching on each preset's matchPatterns array; longest pattern
//      wins on ties so specific compounds beat generic prefixes
//      (Cydonia × Magnum > plain Cydonia).
//
//   2. Apply: copy a preset's promptOverrides + systemPromptRole into a
//      profile. Non-destructive — caller passes the patch into
//      updateActiveProfile() or merges manually. Does NOT touch the
//      profile's panels, fieldToggles, dashCards, customPanels, schema,
//      or systemPrompt — only the prompt slot system + role.

import { BUILT_IN_PRESETS } from './built-in.js';

/**
 * Resolve the model id reported by SillyTavern's active connection.
 *
 * v6.21.0: rewritten because v6.20.0 only probed `openai_model` / `model` /
 * `onlineStatus`, missing the source-specific *_model fields that ST uses
 * for every chat-completion backend (NanoGPT, DeepSeek, Claude, Google,
 * OpenRouter, Mistral, Cohere, Groq, xAI, Custom, etc.). Verified against
 * SillyTavern openai.js getChatCompletionModel().
 *
 * Resolution order:
 *  1. chat_completion_source → ${source}_model (the canonical lookup,
 *     mirrors ST's own getChatCompletionModel())
 *  2. Scan every *_model key on chatCompletionSettings for the first
 *     non-empty value (catches sources we don't have a static map for,
 *     e.g. brand-new backends added after this code was written)
 *  3. textGenerationSettings.online_status_model / model
 *  4. DOM fallback — the currently-:selected option in any #model_*_select
 *     dropdown (last-resort but reliable when settings haven't been saved
 *     since the user changed the dropdown)
 *  5. ctx.model / ctx.onlineStatus (legacy + textgen fallback)
 */
const _CC_SOURCE_TO_MODEL_KEY = {
    claude: 'claude_model',
    openai: 'openai_model',
    makersuite: 'google_model',
    vertexai: 'vertexai_model',
    openrouter: 'openrouter_model',
    ai21: 'ai21_model',
    mistralai: 'mistralai_model',
    custom: 'custom_model',
    cohere: 'cohere_model',
    perplexity: 'perplexity_model',
    groq: 'groq_model',
    siliconflow: 'siliconflow_model',
    electronhub: 'electronhub_model',
    chutes: 'chutes_model',
    nanogpt: 'nanogpt_model',
    deepseek: 'deepseek_model',
    aimlapi: 'aimlapi_model',
    xai: 'xai_model',
    pollinations: 'pollinations_model',
    cometapi: 'cometapi_model',
    moonshot: 'moonshot_model',
    fireworks: 'fireworks_model',
    azure_openai: 'azure_openai_model',
    zai: 'zai_model',
};

function _firstNonEmpty(...candidates) {
    for (const c of candidates) {
        if (typeof c === 'string' && c.trim()) return c.trim();
    }
    return '';
}

export function getActiveModelId() {
    try {
        const ctx = SillyTavern.getContext?.();
        if (!ctx) return '';
        const cc = ctx.chatCompletionSettings || {};

        // 1. Source-specific lookup (mirrors ST's getChatCompletionModel).
        const source = cc.chat_completion_source;
        if (source && _CC_SOURCE_TO_MODEL_KEY[source]) {
            const v = cc[_CC_SOURCE_TO_MODEL_KEY[source]];
            if (typeof v === 'string' && v.trim()) return v.trim();
        }

        // 2. Scan every *_model key on chatCompletionSettings. Catches sources
        //    added after this file was written.
        for (const [k, v] of Object.entries(cc)) {
            if (k.endsWith('_model') && typeof v === 'string' && v.trim()) {
                return v.trim();
            }
        }

        // 3. textgen settings — local KoboldCpp / textgen webui / ollama etc.
        const tg = ctx.textGenerationSettings || {};
        const fromTg = _firstNonEmpty(tg.online_status_model, tg.model);
        if (fromTg) return fromTg;

        // 4. DOM fallback — read the visible model dropdown directly. SillyTavern
        //    selects always have id="model_<source>_select". Useful when the
        //    user changed the dropdown but settings haven't been persisted yet.
        if (typeof document !== 'undefined') {
            const sels = document.querySelectorAll(
                'select[id^="model_"][id$="_select"], #custom_model_id, #openrouter_model'
            );
            for (const sel of sels) {
                const v = sel?.value || sel?.options?.[sel.selectedIndex]?.value;
                if (typeof v === 'string' && v.trim()) return v.trim();
            }
        }

        // 5. Legacy / textgen catch-all
        return _firstNonEmpty(ctx.model, ctx.onlineStatus);
    } catch {}
    return '';
}

/**
 * Return the best-matching preset for a given model id, or null.
 * Match strategy: longest matchPatterns substring wins; case-insensitive.
 *
 * @param {string} modelId
 * @returns {object | null}
 */
export function findMatchingPreset(modelId) {
    if (!modelId || typeof modelId !== 'string') return null;
    const lc = modelId.toLowerCase();
    let best = null;
    let bestLen = 0;
    for (const preset of BUILT_IN_PRESETS) {
        for (const pat of preset.matchPatterns || []) {
            const p = String(pat).toLowerCase();
            if (!p) continue;
            if (lc.includes(p) && p.length > bestLen) {
                best = preset;
                bestLen = p.length;
                break; // any match for this preset is enough — keep scanning others
            }
        }
    }
    return best;
}

/**
 * Build the profile patch object for applying a preset. Returns the keys
 * `promptOverrides` and `systemPromptRole` ready to pass to
 * `updateActiveProfile(s, patch)`. Caller is responsible for the actual
 * write + saveSettings.
 *
 * @param {object} preset
 * @param {object} [currentProfile]  Used to merge with existing overrides
 *   so applying a preset doesn't blow away unrelated user customizations
 *   from earlier slots.
 * @returns {{promptOverrides: object, systemPromptRole: string}}
 */
export function buildPresetPatch(preset, currentProfile) {
    const merged = { ...(currentProfile?.promptOverrides || {}) };
    for (const [k, v] of Object.entries(preset.promptOverrides || {})) {
        if (typeof v === 'string' && v.trim()) merged[k] = v;
    }
    return {
        promptOverrides: merged,
        systemPromptRole: preset.systemPromptRole || currentProfile?.systemPromptRole || 'system',
    };
}

/**
 * Re-export the bundled presets so callers can browse them without
 * importing built-in.js directly.
 */
export { BUILT_IN_PRESETS };
