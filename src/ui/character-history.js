// src/ui/character-history.js — v6.8.21
// Shared helper that walks the entire snapshot history for a chat and
// builds per-character metadata: first-seen message index, last-seen
// message index, total appearance count, most recent known location,
// and the canonical name that alias matching settled on.
//
// Used by:
//   - Character Wiki overlay (firstSeen/lastSeen/appearances columns)
//   - Main character card header (v6.8.21 Feature E: "Scene #23 together")
//   - Main character card list (v6.8.21 Feature D: off-scene stub list)
//
// Previously the wiki had its own walker inlined. This module extracts
// the logic into one place AND teaches it about v6.8.18 aliases: a
// character tracked as "Stranger" in early snapshots and as "Jenna"
// in later ones (with aliases=["Stranger"]) resolves to a single
// history entry keyed by "jenna".
//
// Results are cached per-snapshot-set using object identity on the
// trackerData.snapshots reference. The reference changes whenever
// saveSnapshot writes new data, so the cache invalidates naturally.

import { getTrackerData } from '../settings.js';

let _cache = null;
let _cacheKey = null;

// Rebuild the history map for the current chat's snapshots.
// Returns Map<lowerCanonicalName, HistoryMeta> where HistoryMeta is:
//   {
//     firstSeen: number,       // first msg index where this character appeared
//     lastSeen: number,        // most recent msg index where in charactersPresent
//     appearances: number,     // count of snapshots where in charactersPresent
//     lastLocation: string,    // snap.location at lastSeen
//     canonical: string,       // the canonical name (original case)
//     aliasesLow: Set<string>, // every lowercase alias OR canonical this entity
//                              // has ever been known by. Read-only — do not mutate.
//   }
function _buildHistory() {
    const data = getTrackerData();
    const snaps = data?.snapshots || {};
    const snapKeys = Object.keys(snaps).map(Number).sort((a, b) => a - b);
    const out = new Map();

    // ── Pass 1: build alias → canonical resolver ────────────────────
    // Walk all snapshots, find any character with a non-empty aliases
    // list, and record that their aliases should map to their canonical
    // name. Later turns' canonical names WIN over earlier ones — if a
    // character was "Stranger" in snap 0 and "Jenna" in snap 5 with
    // aliases=["Stranger"], we want {stranger → Jenna, jenna → Jenna}.
    //
    // Iterate snapshots in order so later entries overwrite earlier
    // ones when both appear in the same character's history.
    const canonLookup = new Map(); // lowercase any-name → canonical (original case)
    for (const key of snapKeys) {
        const snap = snaps[String(key)];
        if (!snap || !Array.isArray(snap.characters)) continue;
        for (const ch of snap.characters) {
            const canon = (ch?.name || '').trim();
            if (!canon || canon === '?') continue;
            const canonLow = canon.toLowerCase();
            // The canonical name always maps to itself
            canonLookup.set(canonLow, canon);
            // Each alias also maps to this canonical
            if (Array.isArray(ch.aliases)) {
                for (const a of ch.aliases) {
                    const al = String(a || '').trim().toLowerCase();
                    if (!al) continue;
                    canonLookup.set(al, canon);
                }
            }
        }
    }

    // Helper: resolve any name (canonical or alias) to the canonical
    // form we should key the history map by. Falls back to the input
    // (lowercased) if no mapping exists.
    const resolve = (name) => {
        const low = (name || '').toLowerCase().trim();
        if (!low) return '';
        return (canonLookup.get(low) || name).trim();
    };

    // ── Pass 2: accumulate history per canonical name ──────────────
    for (const key of snapKeys) {
        const snap = snaps[String(key)];
        if (!snap) continue;
        const chars = Array.isArray(snap.characters) ? snap.characters : [];
        const presentRaw = Array.isArray(snap.charactersPresent) ? snap.charactersPresent : [];
        // Build a per-snapshot presentSet that includes BOTH the raw names
        // and their canonical resolutions. This catches the case where
        // charactersPresent still lists an old placeholder but the
        // canonical character list has already been renamed.
        const presentCanon = new Set();
        for (const n of presentRaw) {
            const c = resolve(n).toLowerCase();
            if (c) presentCanon.add(c);
        }

        for (const ch of chars) {
            const canon = resolve(ch?.name);
            const canonLow = canon.toLowerCase();
            if (!canonLow || canonLow === '?') continue;
            let meta = out.get(canonLow);
            if (!meta) {
                meta = {
                    firstSeen: key,
                    lastSeen: key,
                    appearances: 0,
                    lastLocation: '',
                    canonical: canon,
                    aliasesLow: new Set([canonLow]),
                };
                out.set(canonLow, meta);
            } else {
                // Canonical-name promotion: the most recent turn's canonical
                // name wins. Snapshots are iterated in order so each pass
                // overwrites the previous canonical.
                meta.canonical = canon;
                if (key < meta.firstSeen) meta.firstSeen = key;
            }
            // Record the raw name and aliases the character was seen under
            // this turn so alias lookups in either direction work.
            const rawLow = (ch?.name || '').toLowerCase().trim();
            if (rawLow) meta.aliasesLow.add(rawLow);
            if (Array.isArray(ch.aliases)) {
                for (const a of ch.aliases) {
                    const al = String(a || '').toLowerCase().trim();
                    if (al) meta.aliasesLow.add(al);
                }
            }

            // Presence tracking: if this character (or any of their aliases)
            // is in charactersPresent for this snapshot, bump appearances
            // and update lastSeen / lastLocation.
            let isPresent = presentCanon.has(canonLow);
            if (!isPresent) {
                for (const al of meta.aliasesLow) {
                    if (presentCanon.has(al)) { isPresent = true; break; }
                }
            }
            if (isPresent) {
                if (key > meta.lastSeen) meta.lastSeen = key;
                meta.appearances++;
                if (snap.location) meta.lastLocation = snap.location;
            }
        }
    }

    return out;
}

/**
 * Get the cached history map. Rebuilds on first call and whenever the
 * underlying snapshots reference changes (saveSnapshot mutates the
 * tracker data; the reference is the map identity, so as long as
 * saveSnapshot replaces the snapshots object when adding new keys
 * we invalidate on new turns. In practice settings.saveSnapshot does
 * mutate keys in place, so we also re-build when the key count changes).
 */
export function getCharacterHistory() {
    const data = getTrackerData();
    const snaps = data?.snapshots || {};
    const keyCount = Object.keys(snaps).length;
    const cacheKey = `${snaps}|${keyCount}`;
    if (_cache && _cacheKey === cacheKey) return _cache;
    _cache = _buildHistory();
    _cacheKey = cacheKey;
    return _cache;
}

/**
 * Convenience accessor: look up a single character's history entry by
 * any name (canonical OR alias). Returns null if not found.
 */
export function getCharacterHistoryEntry(name) {
    if (!name) return null;
    const hist = getCharacterHistory();
    const low = name.toLowerCase().trim();
    // Direct canonical hit
    if (hist.has(low)) return hist.get(low);
    // Walk the map looking for an alias match — O(n) but the map is
    // typically small (< 30 characters per chat).
    for (const meta of hist.values()) {
        if (meta.aliasesLow.has(low)) return meta;
    }
    return null;
}

/**
 * Explicit cache bust. Call after operations that mutate snapshots in
 * place without changing the outer reference (e.g. the manual merge
 * action in update-panel.js).
 */
export function invalidateCharacterHistory() {
    _cache = null;
    _cacheKey = null;
}
