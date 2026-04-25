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
 * Tries several context fields because different backends populate
 * different ones. Returns '' if nothing identifiable is available.
 */
export function getActiveModelId() {
    try {
        const ctx = SillyTavern.getContext?.();
        if (!ctx) return '';
        // Standard fields populated by SillyTavern across backend types.
        const candidates = [
            ctx.chatCompletionSettings?.openai_model,
            ctx.chatCompletionSettings?.model,
            ctx.textGenerationSettings?.model,
            ctx.onlineStatus,
            ctx.model,
            ctx.connectionProfile?.api_url,
        ];
        for (const c of candidates) {
            if (typeof c === 'string' && c.trim()) return c.trim();
        }
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
