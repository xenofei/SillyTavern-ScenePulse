// ScenePulse — Delta Merge Module
// Merges a delta JSON response (only changed fields) with a previous full snapshot

import { log, warn } from '../logger.js';

// Array fields merged by 'name' key (entity merge)
const ENTITY_ARRAYS = {
    characters: 'name',
    relationships: 'name',
    mainQuests: 'name',
    sideQuests: 'name',
    activeTasks: 'name'
};

// Array fields always replaced entirely from delta (not merged)
const REPLACE_ARRAYS = ['plotBranches', 'charactersPresent', 'witnesses'];

/**
 * Merge a delta JSON response with a previous full snapshot.
 * - Scalar fields: delta overwrites previous
 * - Entity arrays: merge by name key
 * - Replace arrays: delta replaces entirely
 * - Missing fields in delta: carry forward from previous
 */
export function mergeDelta(prev, delta) {
    if (!prev || typeof prev !== 'object') return delta;
    if (!delta || typeof delta !== 'object') return prev;

    const merged = {};

    // 1. Start with all previous fields
    for (const [k, v] of Object.entries(prev)) {
        if (k === '_spMeta') continue;
        merged[k] = Array.isArray(v) ? v.map(item =>
            (item && typeof item === 'object') ? { ...item } : item
        ) : (v && typeof v === 'object' && !Array.isArray(v)) ? { ...v } : v;
    }

    // 1b. Strip resolved quests from carried-forward data — they had their grace period
    for (const qk of ['mainQuests', 'sideQuests', 'activeTasks']) {
        if (Array.isArray(merged[qk])) merged[qk] = merged[qk].filter(q => q.urgency !== 'resolved');
    }

    // 2. Apply delta overrides
    const deltaKeys = [];
    for (const [k, v] of Object.entries(delta)) {
        if (k === '_spMeta') continue;
        deltaKeys.push(k);

        if (k in ENTITY_ARRAYS && Array.isArray(v) && Array.isArray(merged[k])) {
            merged[k] = mergeEntityArray(merged[k], v, ENTITY_ARRAYS[k]);
        } else if (REPLACE_ARRAYS.includes(k)) {
            merged[k] = v;
        } else {
            merged[k] = v;
        }
    }

    // 3. Warn if delta was suspiciously small
    if (deltaKeys.length < 2) {
        warn('Delta merge: delta has only', deltaKeys.length, 'keys — possible empty response');
    }

    log('Delta merge: prev=', Object.keys(prev).length, 'keys, delta=',
        deltaKeys.length, 'keys, merged=', Object.keys(merged).length, 'keys');

    return merged;
}

/**
 * Merge two arrays of objects by a key field (e.g., 'name').
 * Delta entities are MERGED with matching previous entities (field-level),
 * preserving previous fields the LLM omitted.
 * Previous entities not in delta are preserved unchanged.
 * New entities in delta (not in previous) are added.
 */
function mergeEntityArray(prevArr, deltaArr, keyField) {
    const result = prevArr.map(item => ({ ...item }));
    const prevMap = new Map();
    for (let i = 0; i < result.length; i++) {
        const key = (result[i][keyField] || '').toLowerCase();
        if (key) prevMap.set(key, i);
    }

    for (const deltaItem of deltaArr) {
        const key = (deltaItem[keyField] || '').toLowerCase();
        if (!key) continue;

        const existingIdx = prevMap.get(key);
        if (existingIdx !== undefined) {
            // Field-level merge: delta fields overwrite, previous fields preserved
            const prev = result[existingIdx];
            const merged = { ...prev };
            for (const [fk, fv] of Object.entries(deltaItem)) {
                // Only overwrite if delta has a non-empty value
                if (fv !== undefined && fv !== null && fv !== '') {
                    merged[fk] = fv;
                }
            }
            result[existingIdx] = merged;
            log('Entity merge:', key, '— delta fields:', Object.keys(deltaItem).length,
                'prev fields:', Object.keys(prev).length, 'merged:', Object.keys(merged).length);
        } else {
            result.push(deltaItem);
            log('Entity merge: new entity added:', key);
        }
    }

    return result;
}
