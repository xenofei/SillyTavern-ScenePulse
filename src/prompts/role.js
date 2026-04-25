// src/prompts/role.js — System prompt role routing (v6.19.0, issue #16)
//
// SillyTavern's generateRaw exposes ONE explicit `systemPrompt` param.
// Some users find that certain models (notably Claude family) follow
// instructions placed in the user message more reliably than instructions
// placed in the system message — see github.com/xenofei/SillyTavern-ScenePulse/issues/16
//
// This helper reads the active profile's `systemPromptRole` (one of
// 'system' / 'user' / 'assistant', default 'system') and adapts the
// {systemPrompt, prompt} arg pair before it is handed to generateRaw:
//
//   - 'system'    → pass through unchanged (default behavior)
//   - 'user'      → empty systemPrompt, prepend the original system text
//                   to the user prompt with a clear separator
//   - 'assistant' → same as 'user' but uses an "(assistant precedent)"
//                   wrapper. This rarely produces useful behavior; we ship
//                   it for parity with the embed-as-role selector and so
//                   power users can experiment without forking.
//
// The fallback profile (if configured separately) reuses the same role
// selection — the routing is per-profile, not per-call-site.

import { getSettings } from '../settings.js';
import { getActiveProfile } from '../profiles.js';

/**
 * Resolve the role configured on the active profile. Defaults to 'system'
 * for any profile that pre-dates v6.19.0 or has an unrecognized value.
 *
 * @returns {'system' | 'user' | 'assistant'}
 */
export function getActivePromptRole() {
    try {
        const s = getSettings();
        const p = getActiveProfile(s);
        const r = p?.systemPromptRole;
        if (r === 'user' || r === 'assistant') return r;
    } catch {}
    return 'system';
}

/**
 * Apply the active profile's role to a {systemPrompt, prompt} pair before
 * sending to generateRaw.
 *
 * @param {{systemPrompt: string, prompt: string}} pair
 * @param {'system'|'user'|'assistant'} [forceRole]  Override the active role (test/preset use)
 * @returns {{systemPrompt: string, prompt: string}}
 */
export function applyPromptRole(pair, forceRole) {
    const role = forceRole || getActivePromptRole();
    const sys = pair?.systemPrompt || '';
    const usr = pair?.prompt || '';
    if (role === 'system') return { systemPrompt: sys, prompt: usr };
    if (!sys) return { systemPrompt: '', prompt: usr };
    if (role === 'assistant') {
        // Wrap as a faux assistant precedent — the model sees its prior turn
        // listing the rules. Not all backends honor this; documented as
        // experimental in the editor UI.
        return {
            systemPrompt: '',
            prompt: `(Assistant precedent — instructions you yourself laid out in the previous turn:)\n${sys}\n\n(End precedent. Now respond to the user request below.)\n\n${usr}`,
        };
    }
    // role === 'user'
    return {
        systemPrompt: '',
        prompt: `${sys}\n\n---\n\n${usr}`,
    };
}
