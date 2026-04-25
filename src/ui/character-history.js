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

    // ── Pass 2.5: backfill from the wiki archive (v6.22.1) ─────────
    // The archive is append-only and survives snapshot pruning; if a
    // character was pruned out of all snapshots they'd be missing from
    // the meta map even though their data is preserved. Walk the archive
    // and add any names not already in `out`. Use msg index 0 + 0
    // appearances since their snapshot context is gone.
    try {
        const arc = data?._spArchive || {};
        const archChars = arc.characters || {};
        for (const [nameLow, archCh] of Object.entries(archChars)) {
            if (!nameLow || nameLow === '?') continue;
            // Resolve via canonLookup in case the archived name is an
            // alias the snapshots already canonicalized differently.
            const canon = resolve(archCh?.name || nameLow);
            const canonLow = canon.toLowerCase();
            if (!canonLow || out.has(canonLow)) continue;
            // Check alias overlap with any existing meta to avoid creating
            // duplicate entries for the same person.
            let merged = false;
            for (const [, existing] of out) {
                if (existing.aliasesLow.has(canonLow) || existing.aliasesLow.has(nameLow)) {
                    existing.aliasesLow.add(canonLow);
                    existing.aliasesLow.add(nameLow);
                    merged = true;
                    break;
                }
            }
            if (merged) continue;
            // Genuinely new entry — synthesize meta from archive only.
            const aliasesLow = new Set([canonLow, nameLow]);
            if (Array.isArray(archCh.aliases)) {
                for (const a of archCh.aliases) {
                    const al = String(a || '').toLowerCase().trim();
                    if (al) aliasesLow.add(al);
                }
            }
            out.set(canonLow, {
                firstSeen: 0, lastSeen: 0, appearances: 0,
                lastLocation: '',
                canonical: canon || archCh.name || nameLow,
                aliasesLow,
                _archivedOnly: true,
            });
        }
    } catch (e) { /* archive optional — never fail history build */ }

    // ── Pass 3: post-hoc consolidation ──────────────────────────────
    // Walk the output map once and merge any entry whose aliasesLow
    // overlaps with another entry's canonical key. This catches edge
    // cases where pass 1's canonLookup missed an alias mapping because
    // (e.g.) the alias was added to one snap via delta-merge REVEAL but
    // never backfilled into older snapshots, AND the iteration order
    // meant pass 1 set canonLookup[oldName]=oldName before the alias
    // update. Merging in pass 3 guarantees one entry per canonical
    // regardless of the order in which the walker encountered data.
    //
    // Merge semantics:
    //   - Keep the entry with the MOST RECENT lastSeen as the winner
    //     (so canonical name reflects the current name, not the old
    //     placeholder).
    //   - Sum appearances.
    //   - Keep the earliest firstSeen.
    //   - Union aliasesLow.
    //   - Keep the winner's lastLocation.
    const entries = [...out.entries()];
    const removed = new Set();
    for (let i = 0; i < entries.length; i++) {
        const [keyA, metaA] = entries[i];
        if (removed.has(keyA)) continue;
        for (let j = i + 1; j < entries.length; j++) {
            const [keyB, metaB] = entries[j];
            if (removed.has(keyB)) continue;
            // Merge condition: either entry's alias set contains the
            // other's canonical key. This is the symmetric form of
            // "these are the same character under different recorded
            // names."
            const overlap = metaA.aliasesLow.has(keyB) || metaB.aliasesLow.has(keyA);
            if (!overlap) continue;
            // Winner = most recent lastSeen. Tie → entry A.
            const winner = metaA.lastSeen >= metaB.lastSeen ? metaA : metaB;
            const loser = winner === metaA ? metaB : metaA;
            const loserKey = winner === metaA ? keyB : keyA;
            winner.appearances += loser.appearances;
            if (loser.firstSeen < winner.firstSeen) winner.firstSeen = loser.firstSeen;
            for (const al of loser.aliasesLow) winner.aliasesLow.add(al);
            if (!winner.lastLocation && loser.lastLocation) winner.lastLocation = loser.lastLocation;
            out.delete(loserKey);
            removed.add(loserKey);
        }
    }

    return out;
}

/**
 * Get the cached history map. The cache key is built from both the
 * snapshot count AND a fingerprint of the latest snapshot's characters
 * array, so regenerating the current turn (which overwrites the latest
 * snap in place without changing the key count) still invalidates the
 * cache. Without this, re-gen would leave stale history entries keyed
 * under the pre-regen names — exactly the scenario that produced orphan
 * off-scene stubs for aliased characters before v6.8.24.
 *
 * invalidateCharacterHistory() remains available for explicit busts
 * (e.g. after the manual merge flow in update-panel.js).
 */
export function getCharacterHistory() {
    const data = getTrackerData();
    const snaps = data?.snapshots || {};
    const keys = Object.keys(snaps);
    const keyCount = keys.length;
    // Fingerprint the latest snapshot's character roster so re-gens on
    // the same message index bust the cache. Uses character name +
    // aliases joined; cheap for typical chat sizes (< 30 chars * 2-3
    // aliases each).
    let latestFingerprint = '';
    if (keyCount > 0) {
        const latestKey = Math.max(...keys.map(Number));
        const latest = snaps[String(latestKey)];
        if (latest && Array.isArray(latest.characters)) {
            const parts = [];
            for (const c of latest.characters) {
                const n = (c?.name || '').toLowerCase().trim();
                const al = Array.isArray(c?.aliases)
                    ? c.aliases.map(a => (a || '').toLowerCase().trim()).sort().join(',')
                    : '';
                parts.push(n + '|' + al);
            }
            latestFingerprint = parts.sort().join(';');
        }
    }
    const cacheKey = `${keyCount}|${latestFingerprint}`;
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
