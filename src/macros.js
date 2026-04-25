// src/macros.js — ScenePulse Custom Macro Registration
//
// Registers a set of {{sp_*}} macros that resolve from the latest tracker
// snapshot. Handlers always re-read the snapshot at resolution time so
// values stay live across generations — there's no caching layer to
// invalidate. Empty/missing fields return '' (ST treats this as no-op).
//
// Registration prefers ST's new macro system (`ctx.macros.register`,
// available since ST 1.13). Falls back to the deprecated
// `ctx.registerMacro` for older builds. Each handler is wrapped in
// try/catch so a runtime error in one macro can't poison ST's prompt
// build — the failed macro just returns ''.

import { log, warn, err } from './logger.js';
import { getLatestSnapshot, getSettings } from './settings.js';
import { normalizeTracker } from './normalize.js';
import { getActiveProfile } from './profiles.js';

let _registered = false;

// ─── Handlers ──────────────────────────────────────────────────────────
//
// Defined as module-level functions so the test suite can drive each one
// directly without registering against a fake ST. Each returns a string
// (never null/undefined). Internal try/catch is the registration wrapper
// in registerMacros() below — handlers themselves can throw and the
// wrapper neutralizes it.

function _norm() {
    const snap = getLatestSnapshot();
    if (!snap) return null;
    return normalizeTracker(snap);
}

function _field(key) {
    const n = _norm();
    if (!n) return '';
    const v = n[key];
    if (v === undefined || v === null) return '';
    if (Array.isArray(v)) return v.join(', ');
    return String(v);
}

export const HANDLERS = {
    sp_location: () => _field('location'),
    sp_time: () => _field('time'),
    sp_date: () => _field('date'),
    sp_mood: () => _field('sceneMood'),
    sp_tension: () => _field('sceneTension'),
    sp_weather: () => _field('weather'),
    sp_topic: () => _field('sceneTopic'),
    sp_summary: () => _field('sceneSummary'),
    sp_temperature: () => _field('temperature'),
    sp_northstar: () => _field('northStar'),

    sp_characters: () => {
        const n = _norm(); if (!n) return '';
        // Prefer charactersPresent (the explicit "in scene now" list) so
        // the macro reflects the current beat, not the cumulative roster.
        // Falsy-OR doesn't work here because an empty array is truthy in
        // JS — explicit length check picks the right list.
        const list = (Array.isArray(n.charactersPresent) && n.charactersPresent.length)
            ? n.charactersPresent
            : (n.characters || []).map(c => c.name).filter(Boolean);
        return list.join(', ');
    },

    // v6.13.5 (issue #8): present-character count for conditional prompts
    // like "When alone with {{user}}, the {{char}} feels..."
    sp_char_count: () => {
        const n = _norm(); if (!n) return '0';
        const list = (Array.isArray(n.charactersPresent) && n.charactersPresent.length)
            ? n.charactersPresent
            : (n.characters || []).map(c => c.name).filter(Boolean);
        return String(list.length);
    },

    // v6.13.5 (issue #8): relationship summary list. Format:
    //   "Jenna (lover, aff:75), Detective Reyes (rival, aff:30)"
    sp_relationships: () => {
        const n = _norm(); if (!n) return '';
        const rels = Array.isArray(n.relationships) ? n.relationships : [];
        return rels.map(r => {
            const parts = [];
            if (r.relType) parts.push(r.relType);
            if (typeof r.affection === 'number') parts.push(`aff:${r.affection}`);
            const tag = parts.length ? ` (${parts.join(', ')})` : '';
            return `${r.name}${tag}`;
        }).filter(Boolean).join(', ');
    },

    // Original {{sp_quests}} kept for backward compat — both tiers, names only
    sp_quests: () => {
        const n = _norm(); if (!n) return '';
        const all = [...(n.mainQuests || []), ...(n.sideQuests || [])]
            .filter(q => q.urgency !== 'resolved');
        return all.map(q => q.name).filter(Boolean).join(', ');
    },

    // v6.13.5 (issue #8): split quest tiers + counts
    sp_main_quests: () => {
        const n = _norm(); if (!n) return '';
        return (n.mainQuests || []).filter(q => q.urgency !== 'resolved')
            .map(q => q.name).filter(Boolean).join(', ');
    },
    sp_side_quests: () => {
        const n = _norm(); if (!n) return '';
        return (n.sideQuests || []).filter(q => q.urgency !== 'resolved')
            .map(q => q.name).filter(Boolean).join(', ');
    },
    sp_quest_count: () => {
        const n = _norm(); if (!n) return '0';
        const c = [...(n.mainQuests || []), ...(n.sideQuests || [])]
            .filter(q => q.urgency !== 'resolved').length;
        return String(c);
    },

    // v6.13.5 (issue #8): active profile name. Useful for prompts that
    // want to swap behavior based on which RP setup is loaded.
    sp_active_profile: () => {
        try {
            const ap = getActiveProfile(getSettings());
            return ap?.name || '';
        } catch { return ''; }
    },
};

const DESCRIPTIONS = {
    sp_location: 'Current scene location from ScenePulse tracker',
    sp_time: 'Current scene time from ScenePulse tracker',
    sp_date: 'Current scene date from ScenePulse tracker',
    sp_mood: 'Current scene mood from ScenePulse tracker',
    sp_tension: 'Current scene tension level from ScenePulse tracker',
    sp_weather: 'Current weather from ScenePulse tracker',
    sp_topic: 'Current scene topic from ScenePulse tracker',
    sp_summary: 'Current scene summary from ScenePulse tracker',
    sp_temperature: 'Current temperature from ScenePulse tracker',
    sp_northstar: "User's north star / driving purpose from ScenePulse tracker",
    sp_characters: 'Comma-separated names of characters present in the current scene',
    sp_char_count: 'Number of characters present in the current scene',
    sp_relationships: 'Comma-separated relationship summaries (name, type, affection)',
    sp_quests: 'Active quest names (main + side) from ScenePulse tracker',
    sp_main_quests: 'Active main quest names only',
    sp_side_quests: 'Active side quest names only',
    sp_quest_count: 'Total count of active (non-resolved) quests',
    sp_active_profile: 'Name of the currently active ScenePulse profile',
};

// ─── Registration ──────────────────────────────────────────────────────

export function registerMacros() {
    if (_registered) return;
    const ctx = SillyTavern.getContext();
    const macros = ctx.macros;
    const legacyRegister = ctx.registerMacro;

    if (!macros?.register && !legacyRegister) {
        warn('Macro registration API not available — macros disabled');
        return;
    }
    _registered = true;

    // Wrap every handler so a runtime error returns '' instead of
    // bubbling into ST's prompt processor.
    const safe = (name, fn) => () => {
        try { return fn(); }
        catch (e) {
            err('Macro', name, 'failed:', e?.message);
            return '';
        }
    };

    let registered = 0;
    if (macros?.register) {
        // New macro system (ST 1.13+). Prefer this path — the legacy
        // path triggers a deprecation warning per call.
        const STATE = macros.category?.STATE || 'state';
        for (const [name, handler] of Object.entries(HANDLERS)) {
            try {
                macros.register(name, {
                    category: STATE,
                    description: DESCRIPTIONS[name] || '',
                    handler: safe(name, handler),
                });
                registered++;
            } catch (e) {
                warn('Failed to register macro', name, ':', e?.message);
            }
        }
        log('Registered', registered, 'macros via new system');
    } else {
        // Legacy fallback — older ST builds. Each call here triggers a
        // deprecation warning in modern ST, but only on init.
        for (const [name, handler] of Object.entries(HANDLERS)) {
            try {
                legacyRegister(name, safe(name, handler), DESCRIPTIONS[name] || '');
                registered++;
            } catch (e) {
                warn('Failed to register macro', name, ':', e?.message);
            }
        }
        log('Registered', registered, 'macros via legacy system');
    }
}

// ─── Test hook ─────────────────────────────────────────────────────────
// Resets the _registered flag so tests can re-run registration.
export function _resetForTests() { _registered = false; }
