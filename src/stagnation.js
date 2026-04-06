// src/stagnation.js — Scene stagnation detection
// Tracks tension + mood across snapshots and suggests pacing interventions

import { log } from './logger.js';
import { getTrackerData } from './settings.js';
import { t } from './i18n.js';

const TENSION_RANK = { calm: 0, low: 1, moderate: 2, high: 3, critical: 4 };
const STAGNATION_THRESHOLD = 4; // consecutive snapshots with same tension to flag

/**
 * Analyze recent snapshots for stagnation patterns.
 * Returns null if no stagnation detected, or an object with suggestions.
 */
export function detectStagnation() {
    const data = getTrackerData();
    const snapKeys = Object.keys(data.snapshots || {}).map(Number).sort((a, b) => a - b);
    if (snapKeys.length < STAGNATION_THRESHOLD) return null;

    const recent = snapKeys.slice(-STAGNATION_THRESHOLD);
    const tensions = [];
    const moods = [];
    const topics = [];

    for (const key of recent) {
        const snap = data.snapshots[String(key)];
        if (!snap) continue;
        tensions.push((snap.sceneTension || '').toLowerCase());
        moods.push((snap.sceneMood || '').toLowerCase());
        topics.push((snap.sceneTopic || '').toLowerCase());
    }

    const result = { stagnant: false, type: null, tension: null, suggestion: null };

    // Check tension stagnation
    if (tensions.length >= STAGNATION_THRESHOLD) {
        const allSame = tensions.every(t => t === tensions[0]);
        if (allSame && tensions[0]) {
            result.stagnant = true;
            result.tension = tensions[0];
            result.type = 'tension';

            const rank = TENSION_RANK[tensions[0]] ?? 2;
            if (rank <= 1) {
                result.suggestion = t('Scene tension has been low for several messages. Consider introducing conflict, a revelation, or a time-sensitive event.');
            } else if (rank >= 3) {
                result.suggestion = t('Tension has been high for a while. Consider a resolution beat, comic relief, or a quiet moment for characters to process.');
            } else {
                result.suggestion = t('The scene has settled into a pattern. Consider a twist, new character entrance, or location change.');
            }
        }
    }

    // Check mood stagnation (only if tension didn't flag)
    if (!result.stagnant && moods.length >= STAGNATION_THRESHOLD) {
        const allSame = moods.every(m => m === moods[0]);
        if (allSame && moods[0]) {
            result.stagnant = true;
            result.type = 'mood';
            result.suggestion = t('The emotional tone has been static. A shift in mood could re-engage the scene.');
        }
    }

    // Check topic stagnation
    if (!result.stagnant && topics.length >= STAGNATION_THRESHOLD) {
        // Check if topics are too similar (using shared word count)
        const words0 = new Set(topics[0].split(/\s+/).filter(w => w.length > 3));
        const overlaps = topics.slice(1).filter(t => {
            const tw = t.split(/\s+/).filter(w => w.length > 3);
            const shared = tw.filter(w => words0.has(w)).length;
            return shared >= Math.floor(words0.size * 0.5);
        });
        if (overlaps.length >= STAGNATION_THRESHOLD - 1) {
            result.stagnant = true;
            result.type = 'topic';
            result.suggestion = t('The scene topic has been repeating. Consider advancing the plot or moving to a new location.');
        }
    }

    if (result.stagnant) {
        log('Stagnation detected:', result.type, '— tension:', result.tension || 'n/a');
    }
    return result.stagnant ? result : null;
}
