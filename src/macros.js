// src/macros.js — ScenePulse Custom Macro Registration
// Registers {{sp_location}}, {{sp_time}}, {{sp_mood}}, {{sp_tension}}, {{sp_characters}}, {{sp_weather}}, {{sp_quests}}

import { log, warn } from './logger.js';
import { getLatestSnapshot } from './settings.js';
import { normalizeTracker } from './normalize.js';

let _registered = false;

export function registerMacros() {
    if (_registered) return;
    const ctx = SillyTavern.getContext();

    // Use the new macro system if available, otherwise fall back to legacy
    const macros = ctx.macros;
    const legacyRegister = ctx.registerMacro;

    if (!macros && !legacyRegister) {
        warn('Macro registration API not available — macros disabled');
        return;
    }
    _registered = true;

    const MACROS = [
        {
            name: 'sp_location',
            desc: 'Current scene location from ScenePulse tracker',
            handler: () => _getField('location'),
        },
        {
            name: 'sp_time',
            desc: 'Current scene time from ScenePulse tracker',
            handler: () => _getField('time'),
        },
        {
            name: 'sp_date',
            desc: 'Current scene date from ScenePulse tracker',
            handler: () => _getField('date'),
        },
        {
            name: 'sp_mood',
            desc: 'Current scene mood from ScenePulse tracker',
            handler: () => _getField('sceneMood'),
        },
        {
            name: 'sp_tension',
            desc: 'Current scene tension level from ScenePulse tracker',
            handler: () => _getField('sceneTension'),
        },
        {
            name: 'sp_weather',
            desc: 'Current weather from ScenePulse tracker',
            handler: () => _getField('weather'),
        },
        {
            name: 'sp_topic',
            desc: 'Current scene topic from ScenePulse tracker',
            handler: () => _getField('sceneTopic'),
        },
        {
            name: 'sp_characters',
            desc: 'Comma-separated list of characters present in scene',
            handler: () => {
                const snap = getLatestSnapshot();
                if (!snap) return '';
                const norm = normalizeTracker(snap);
                return (norm.charactersPresent || norm.characters?.map(c => c.name) || []).join(', ');
            },
        },
        {
            name: 'sp_quests',
            desc: 'Active quest names from ScenePulse tracker',
            handler: () => {
                const snap = getLatestSnapshot();
                if (!snap) return '';
                const norm = normalizeTracker(snap);
                const all = [
                    ...(norm.mainQuests || []),
                    ...(norm.sideQuests || []),
                ].filter(q => q.urgency !== 'resolved');
                return all.map(q => q.name).join(', ');
            },
        },
        {
            name: 'sp_northstar',
            desc: "User's north star / driving purpose from ScenePulse tracker",
            handler: () => _getField('northStar'),
        },
        {
            name: 'sp_summary',
            desc: 'Current scene summary from ScenePulse tracker',
            handler: () => _getField('sceneSummary'),
        },
        {
            name: 'sp_temperature',
            desc: 'Current temperature from ScenePulse tracker',
            handler: () => _getField('temperature'),
        },
    ];

    if (macros?.register) {
        // New macro system (recommended)
        const category = macros.category?.STATE || 'state';
        for (const m of MACROS) {
            try {
                macros.register(m.name, {
                    category,
                    description: m.desc,
                    handler: () => m.handler(),
                });
            } catch (e) {
                warn('Failed to register macro', m.name, ':', e?.message);
            }
        }
        log('Registered', MACROS.length, 'macros via new system');
    } else if (legacyRegister) {
        // Legacy system (deprecated but still works)
        for (const m of MACROS) {
            try {
                legacyRegister(m.name, m.handler, m.desc);
            } catch (e) {
                warn('Failed to register macro', m.name, ':', e?.message);
            }
        }
        log('Registered', MACROS.length, 'macros via legacy system');
    }
}

function _getField(key) {
    const snap = getLatestSnapshot();
    if (!snap) return '';
    const norm = normalizeTracker(snap);
    const val = norm[key];
    if (val === undefined || val === null) return '';
    if (Array.isArray(val)) return val.join(', ');
    return String(val);
}
