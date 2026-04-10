// ScenePulse — Delta Merge Module
// Merges a delta JSON response (only changed fields) with a previous full snapshot

import { log, warn } from '../logger.js';

// Array fields merged by 'name' key (entity merge)
const ENTITY_ARRAYS = {
    characters: 'name',
    relationships: 'name',
    mainQuests: 'name',
    sideQuests: 'name'
};

// Quest arrays get fuzzy dedup on top of exact name match. Quest names are
// generated fresh each turn by the model and drift across paraphrasings like
// "rebuild trust with Jenna" vs "rebuild Jenna trust" — exact match fails on
// those, the delta entry becomes a new quest, and the tier grows unboundedly.
// Fuzzy match catches semantic near-duplicates at merge time.
const QUEST_ARRAYS = new Set(['mainQuests', 'sideQuests']);

// v6.8.18: alias-aware arrays. Characters carry an `aliases` array listing
// former names (descriptive placeholders like "Stranger") so the merge step
// can reconcile an unknown→known identity reveal into a single entry. When
// `useAliases` is enabled on mergeEntityArray, the matching path adds two
// fallbacks after exact name match: (1) alias lookup — delta name matches a
// prev entry's aliases → merge into that prev entry, keep prev canonical
// name; (2) reveal lookup — delta aliases contain a prev canonical name →
// merge into that prev entry, RENAME prev to the delta's new canonical
// name, and push the old prev name into aliases.
const ALIAS_ARRAYS = new Set(['characters']);

// Array fields always replaced entirely from delta (not merged)
const REPLACE_ARRAYS = ['plotBranches', 'charactersPresent', 'witnesses'];

// ── Fuzzy quest name matching ─────────────────────────────────────────────
// Normalize a quest name to a stable token set for comparison:
//   1. lowercase, strip punctuation (keep alphanumerics and spaces)
//   2. collapse whitespace
//   3. drop English stopwords that don't carry quest identity
//   4. return a Set of the remaining tokens
const _QUEST_STOPWORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'to', 'for', 'with', 'of', 'in', 'on',
    'at', 'by', 'from', 'about', 'into', 'out', 'up', 'down', 'over', 'under',
    'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'do', 'does', 'did', 'doing',
    'have', 'has', 'had', 'having',
    'this', 'that', 'these', 'those',
    'my', 'your', 'his', 'her', 'their', 'our',
    'it', 'its', 's'
]);
// Crude suffix-strip stemmer. Not linguistically correct — the goal is simply
// to make paraphrase tokens collide consistently. "cook" / "cooking" / "cooked"
// / "cooks" all need to map to the same stem; the stem itself doesn't need to
// be a real word. Rules are conservative (length guards) to avoid chopping
// short words into nonsense.
function _stem(t) {
    if (t.length > 5 && t.endsWith('ing')) return t.slice(0, -3);
    if (t.length > 4 && t.endsWith('ed'))  return t.slice(0, -2);
    if (t.length > 3 && t.endsWith('s') && !t.endsWith('ss')) return t.slice(0, -1);
    return t;
}
function _tokenizeQuestName(name) {
    if (!name || typeof name !== 'string') return new Set();
    const cleaned = name.toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')   // strip punctuation
        .replace(/\s+/g, ' ')            // collapse whitespace
        .trim();
    if (!cleaned) return new Set();
    const tokens = cleaned.split(' ')
        .filter(t => t && !_QUEST_STOPWORDS.has(t))
        .map(_stem);
    return new Set(tokens);
}
// Jaccard similarity between two token sets: |A ∩ B| / |A ∪ B|.
// Returns 0 when either set is empty (prevents spurious matches on empty names).
function _jaccardSimilarity(setA, setB) {
    if (setA.size === 0 || setB.size === 0) return 0;
    let intersection = 0;
    for (const t of setA) if (setB.has(t)) intersection++;
    const union = setA.size + setB.size - intersection;
    return union === 0 ? 0 : intersection / union;
}

// ── Public tokenizer/similarity helpers ─────────────────────────────────
// The quest-name tokenizer and Jaccard helper are not name-specific —
// they work on any short quest-journal text (name, detail, etc). The
// internal names stay scoped private; these exports provide stable
// public entry points for other modules that want to reuse the same
// normalization rules (stopword set, stemmer, punctuation strip) without
// reimplementing them. update-panel.js uses these in _classifyQuest to
// detect cosmetic-only detail changes and suppress noisy "updated" badges.
export const tokenizeQuestText = _tokenizeQuestName;
export const jaccardSimilarity = _jaccardSimilarity;
// Threshold for "these two quest names refer to the same quest". 0.6 means
// at least 60% of the non-stopword, stemmed tokens must overlap (inclusive
// of the boundary — exactly 0.60 qualifies). Tuned against real log data:
//
//   "pay and dismiss uber driver" vs "pay and direct uber driver"
//     tokens A={pay,dismiss,uber,driver} B={pay,direct,uber,driver}
//     intersection=3 union=5 → 0.60 ✓ match
//
//   "learn to cook pasta" vs "learn cooking pasta"
//     stopword "to" dropped; stemmer maps "cooking" → "cook"
//     tokens A={learn,cook,pasta} B={learn,cook,pasta} → 1.00 ✓ match
//
//   "get jenna medical help" vs "get jenna to hospital"
//     A={get,jenna,medical,help} B={get,jenna,hospital}
//     intersection=2 union=5 → 0.40 ✗ no match (related but distinct
//     intents — leave separate and let the model's prompt-level
//     consolidation handle it if appropriate)
//
//   "comfort jenna" vs "comfort jenna after confession"
//     A={comfort,jenna} B={comfort,jenna,after,confession} (`after` carries
//     temporal meaning — not a stopword)
//     intersection=2 union=4 → 0.50 ✗ no match (qualified child is treated
//     as a distinct more-specific task, preserving both entries)
//
// Tunable — raise for fewer false positives, lower for more aggressive dedup.
const _QUEST_FUZZY_THRESHOLD = 0.6;
function _findFuzzyQuestMatch(deltaName, prevArr, alreadyMatchedIdxs) {
    const deltaTokens = _tokenizeQuestName(deltaName);
    if (deltaTokens.size === 0) return -1;
    // Track best >= threshold. Using `>=` means the threshold itself qualifies,
    // so 0.60 is inclusive — the canonical "pay and dismiss/direct uber driver"
    // case scores exactly 0.60 post-stopword-strip.
    let bestIdx = -1, bestScore = -1;
    for (let i = 0; i < prevArr.length; i++) {
        if (alreadyMatchedIdxs.has(i)) continue;
        const prevTokens = _tokenizeQuestName(prevArr[i]?.name);
        const score = _jaccardSimilarity(deltaTokens, prevTokens);
        if (score >= _QUEST_FUZZY_THRESHOLD && score > bestScore) {
            bestScore = score;
            bestIdx = i;
        }
    }
    return bestIdx;
}

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
    for (const qk of ['mainQuests', 'sideQuests']) {
        if (Array.isArray(merged[qk])) merged[qk] = merged[qk].filter(q => q.urgency !== 'resolved');
    }
    // 1c. Drop any activeTasks field that survives in legacy snapshots. The tier
    // is removed as of v6.8.9 — silently strip on merge so it stops leaking into
    // delta prompts as context.
    delete merged.activeTasks;

    // 2. Apply delta overrides
    const deltaKeys = [];
    for (const [k, v] of Object.entries(delta)) {
        if (k === '_spMeta') continue;
        // Silently drop legacy activeTasks field from delta output. The tier was
        // removed in v6.8.9; models may still emit it if an old snapshot bled
        // into their context. Ignoring it here keeps merged state clean.
        if (k === 'activeTasks') continue;
        deltaKeys.push(k);

        if (k in ENTITY_ARRAYS && Array.isArray(v) && Array.isArray(merged[k])) {
            merged[k] = mergeEntityArray(merged[k], v, ENTITY_ARRAYS[k], QUEST_ARRAYS.has(k), ALIAS_ARRAYS.has(k));
        } else if (REPLACE_ARRAYS.includes(k)) {
            merged[k] = v;
        } else {
            merged[k] = v;
        }
    }

    // v6.8.45: charactersPresent is "ALWAYS include" per the delta-mode
    // prompt contract (schema.js rule 7). If the delta still omits it,
    // treat the absence as an EMPTY scene roster rather than carrying
    // forward the prior snapshot's value. Old behavior was: omitted
    // field → previous array survives untouched, which caused every
    // tracked character from earlier scenes to remain marked "In Scene"
    // during a solo beat (e.g. {{user}} walking alone at night while
    // a 9-person cast from the prior interrogation scene stayed "In
    // Scene" indefinitely). The prompt now explicitly requires an empty
    // array for solitude beats, and this fallback matches that contract
    // for any model that forgets. mergeDelta is only ever called from
    // delta-mode codepaths (engine.js:351, pipeline.js:50), so no
    // isDelta guard is needed — reaching this function means we're
    // processing a delta where every turn must carry its OWN presence.
    if (!('charactersPresent' in delta)) {
        merged.charactersPresent = [];
    }
    // v6.8.50: plotBranches is "ALWAYS include" per delta-mode rule 6.
    // Branches should be fresh every turn (5 new suggestions). If the
    // LLM omits them, stale branches from a prior turn would persist
    // indefinitely. Same pattern as the charactersPresent guard above.
    if (!('plotBranches' in delta)) {
        merged.plotBranches = [];
    }

    // v6.8.18: reconcile relationships and charactersPresent against the
    // merged character roster's alias map. If a character was renamed this
    // turn via the reveal path (e.g. "Stranger" → "Jenna" with aliases=
    // ["Stranger"]), any stale relationship or charactersPresent entry that
    // still references the old name gets remapped to the canonical name.
    // Also merges duplicate relationship entries when both names collapse
    // to the same canonical character.
    reconcileIdentityAliases(merged);

    // Post-merge: run a single fuzzy-dedup + cross-tier pass. This consolidates
    // accumulated near-duplicates from prior turns that the per-entry merge
    // path couldn't catch, and resolves quests that appear in BOTH mainQuests
    // and sideQuests to the main tier. See consolidateQuests() below.
    consolidateQuests(merged);

    // 3. Warn if delta was suspiciously small
    if (deltaKeys.length < 2) {
        warn('Delta merge: delta has only', deltaKeys.length, 'keys — possible empty response');
    }

    // NOTE: Characters and relationships are NOT pruned here.
    // All accumulated data persists in the snapshot for returning-character support.
    // Filtering for display is done at the view layer via filterForView().

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
 *
 * When `useFuzzy` is true (set for quest arrays), a fuzzy match step runs
 * after exact name match fails: tokenize both names, drop stopwords, compute
 * Jaccard similarity, and treat entries scoring >= _QUEST_FUZZY_THRESHOLD
 * as the same quest. Prevents paraphrased duplicates from accumulating.
 *
 * When `useAliases` is true (set for characters), two additional match paths
 * run after exact match but before giving up:
 *   - ALIAS: delta name matches a previous entry's `aliases` list → merge
 *     into that prev entry, keep the prev canonical name. Handles the case
 *     where the model references a character by their old placeholder
 *     ("Stranger") after the real name has already been learned.
 *   - REVEAL: delta `aliases` list contains a previous entry's canonical
 *     name → merge into that prev entry, RENAME prev to the delta's new
 *     canonical name, push the old name into aliases. Handles the
 *     unknown→known identity reveal.
 */
function mergeEntityArray(prevArr, deltaArr, keyField, useFuzzy, useAliases) {
    const result = prevArr.map(item => ({ ...item }));

    // Build two indexes: canonical-name → index, and (optionally) alias → index.
    // Both are maintained in sync as we process delta entries so subsequent
    // deltas can match on entries added earlier in the same batch.
    const prevMap = new Map();
    const aliasMap = new Map();
    const _lowKey = (v) => (v || '').toString().toLowerCase().trim();
    const _rebuildAliasIndex = (i) => {
        if (!useAliases) return;
        const aliases = Array.isArray(result[i]?.aliases) ? result[i].aliases : [];
        for (const a of aliases) {
            const al = _lowKey(a);
            if (!al) continue;
            // First writer wins — if two entries share an alias, we'd rather
            // merge the earlier one consistently. This is edge-case behavior.
            if (!aliasMap.has(al)) aliasMap.set(al, i);
        }
    };
    for (let i = 0; i < result.length; i++) {
        const key = _lowKey(result[i][keyField]);
        if (key) prevMap.set(key, i);
        _rebuildAliasIndex(i);
    }

    // Track which prev indices have already absorbed a delta entry so one
    // prev quest can't be matched twice in the same merge pass.
    const matchedIdxs = new Set();

    for (let deltaItem of deltaArr) {
        const key = _lowKey(deltaItem[keyField]);
        if (!key) continue;

        let existingIdx = prevMap.get(key);
        let matchKind = 'exact';

        // Alias fallback for alias-enabled arrays (characters only): the
        // delta's current name matches a prev entry's aliases list. This
        // means the model is referring to a character by an old name
        // that's already been superseded. We merge INTO the prev entry
        // and do NOT rename — the canonical name stays the newer one.
        //
        // Note: we intentionally do NOT check matchedIdxs here. Alias and
        // reveal are supposed to *collapse* multiple delta entries into a
        // single prev entry — if the model emits both a reveal and a stale
        // old-name continuation in the same batch, both should merge into
        // the same character. matchedIdxs is only a fuzzy-quest guard.
        if (existingIdx === undefined && useAliases) {
            const aliasHit = aliasMap.get(key);
            if (aliasHit !== undefined) {
                existingIdx = aliasHit;
                matchKind = 'alias';
                log('Entity merge [alias]:', JSON.stringify(result[aliasHit].name),
                    '← referenced via alias', JSON.stringify(deltaItem[keyField]));
            }
        }

        // Reveal fallback for alias-enabled arrays: the delta's aliases
        // list contains a prev entry's canonical name. This is an
        // unknown→known identity reveal (prev entry was "Stranger", delta
        // is "Jenna" with aliases=["Stranger"]). We merge INTO the prev
        // entry, RENAME it to the delta's new name, and push the old
        // name into aliases.
        if (existingIdx === undefined && useAliases && Array.isArray(deltaItem.aliases)) {
            for (const a of deltaItem.aliases) {
                const al = _lowKey(a);
                if (!al) continue;
                const revealIdx = prevMap.get(al);
                if (revealIdx !== undefined) {
                    existingIdx = revealIdx;
                    matchKind = 'reveal';
                    log('Entity merge [reveal]:', JSON.stringify(result[revealIdx].name),
                        '→', JSON.stringify(deltaItem[keyField]),
                        '(via alias', JSON.stringify(a) + ')');
                    break;
                }
            }
        }

        // Fuzzy fallback for quest arrays only
        if (existingIdx === undefined && useFuzzy) {
            const fuzzyIdx = _findFuzzyQuestMatch(deltaItem[keyField], result, matchedIdxs);
            if (fuzzyIdx !== -1) {
                existingIdx = fuzzyIdx;
                matchKind = 'fuzzy';
                log('Entity merge [fuzzy]:', JSON.stringify(result[fuzzyIdx].name),
                    '<-', JSON.stringify(deltaItem[keyField]));
            }
        }

        if (existingIdx !== undefined) {
            matchedIdxs.add(existingIdx);
            // Field-level merge: delta fields overwrite, previous fields preserved
            const prev = result[existingIdx];
            const merged = { ...prev };
            const oldName = prev[keyField];
            for (const [fk, fv] of Object.entries(deltaItem)) {
                // On FUZZY match (not exact), keep the existing canonical name so
                // quest identity stays stable across turns. The user tracks quests
                // by name in the journal UI; reshuffling "pay and dismiss uber driver"
                // → "pay and direct uber driver" → "pay and send uber driver off" each
                // turn would make the journal unreadable. On EXACT match the two
                // names are identical by definition so skipping is a no-op.
                if (fk === 'name' && matchKind === 'fuzzy') continue;
                // On ALIAS match, keep the existing canonical name. The delta
                // referenced the character by an old placeholder ("Stranger")
                // but we already know their real name ("Jenna") — do NOT
                // rename Jenna back to Stranger.
                if (fk === 'name' && matchKind === 'alias') continue;
                // Aliases handled separately below so we can union the lists.
                if (fk === 'aliases') continue;
                // Only overwrite if delta has a non-empty value
                if (fv !== undefined && fv !== null && fv !== '') {
                    merged[fk] = fv;
                }
            }
            // Alias list reconciliation: union of prev and delta aliases,
            // deduplicated case-insensitively, with the current canonical
            // name excluded. On REVEAL match, the old prev canonical name
            // is pushed into the alias list so the identity history is
            // preserved.
            if (useAliases) {
                const aliasSet = new Set();
                const aliasOut = [];
                const add = (val) => {
                    const s = String(val || '').trim();
                    if (!s) return;
                    const sl = s.toLowerCase();
                    if (aliasSet.has(sl)) return;
                    aliasSet.add(sl);
                    aliasOut.push(s);
                };
                const prevAliases = Array.isArray(prev.aliases) ? prev.aliases : [];
                const deltaAliases = Array.isArray(deltaItem.aliases) ? deltaItem.aliases : [];
                for (const a of prevAliases) add(a);
                for (const a of deltaAliases) add(a);
                // On REVEAL, the prev canonical name becomes an alias
                if (matchKind === 'reveal' && oldName) add(oldName);
                // Strip the current canonical name from the alias list
                const canonLow = _lowKey(merged[keyField]);
                merged.aliases = aliasOut.filter(a => a.toLowerCase() !== canonLow);
            }
            result[existingIdx] = merged;
            log('Entity merge:', key, '(' + matchKind + ') — delta fields:', Object.keys(deltaItem).length,
                'prev fields:', Object.keys(prev).length, 'merged:', Object.keys(merged).length);
            // REVEAL renamed the prev entry, so the prevMap and aliasMap
            // need updating: drop the old key, add the new one, and
            // register any newly-added aliases so subsequent delta items
            // in the same batch can still match the updated entry.
            if (matchKind === 'reveal') {
                const oldLow = _lowKey(oldName);
                const newLow = _lowKey(merged[keyField]);
                if (oldLow && prevMap.get(oldLow) === existingIdx) prevMap.delete(oldLow);
                if (newLow) prevMap.set(newLow, existingIdx);
            }
            _rebuildAliasIndex(existingIdx);
        } else {
            // Normalize aliases on new entries so downstream code can trust
            // the field exists and is an array.
            if (useAliases && !Array.isArray(deltaItem.aliases)) {
                deltaItem = { ...deltaItem, aliases: [] };
            }
            result.push(deltaItem);
            // Newly-added delta entries are immediately eligible for fuzzy matching
            // by *subsequent* delta items in the same batch — otherwise the model
            // could emit two paraphrases of the same new quest in a single turn and
            // both would survive. Insert them into prevMap so exact-match catches
            // duplicate phrasings, and rely on the post-merge dedup pass in mergeDelta
            // to catch fuzzy cases within the same batch.
            prevMap.set(key, result.length - 1);
            _rebuildAliasIndex(result.length - 1);
            log('Entity merge: new entity added:', key);
        }
    }

    return result;
}

/**
 * v6.8.18: Reconcile identity aliases after a character merge pass.
 * Builds an alias → canonical map from the merged characters array and
 * rewrites any relationships or charactersPresent entries that still
 * reference an old alias to the canonical name. When two relationship
 * entries collapse to the same canonical character, their fields are
 * merged (the entry with non-zero meters wins; otherwise earlier wins).
 *
 * Safe to call on any snapshot-shaped object. Does nothing if no
 * characters have aliases.
 */
export function reconcileIdentityAliases(snap) {
    if (!snap || typeof snap !== 'object') return snap;
    if (!Array.isArray(snap.characters)) return snap;

    // Build alias → canonical name map from characters
    const aliasToCanon = new Map();
    for (const ch of snap.characters) {
        if (!ch || !ch.name || !Array.isArray(ch.aliases)) continue;
        const canon = ch.name;
        for (const a of ch.aliases) {
            const al = (a || '').toString().toLowerCase().trim();
            if (al) aliasToCanon.set(al, canon);
        }
    }
    if (aliasToCanon.size === 0) return snap;

    let renamedRels = 0, mergedRels = 0, renamedPresent = 0;

    // 1. Relationships — rename aliased entries and merge duplicates
    if (Array.isArray(snap.relationships)) {
        const byCanon = new Map(); // canonical-low → index in result
        const result = [];
        for (const rel of snap.relationships) {
            if (!rel || !rel.name) { result.push(rel); continue; }
            const nameLow = rel.name.toLowerCase().trim();
            const canon = aliasToCanon.get(nameLow);
            let finalRel = rel;
            if (canon && canon !== rel.name) {
                finalRel = { ...rel, name: canon };
                renamedRels++;
            }
            const keyLow = finalRel.name.toLowerCase().trim();
            if (byCanon.has(keyLow)) {
                // Merge into the existing entry — prefer non-empty / non-zero fields
                const existingIdx = byCanon.get(keyLow);
                const existing = result[existingIdx];
                const merged = { ...existing };
                for (const [fk, fv] of Object.entries(finalRel)) {
                    if (fk === 'name') continue;
                    // Scalar meters: prefer non-zero
                    if (typeof fv === 'number') {
                        if (fv !== 0 && (existing[fk] == null || existing[fk] === 0)) merged[fk] = fv;
                    } else if (fv !== undefined && fv !== null && fv !== '') {
                        if (!existing[fk]) merged[fk] = fv;
                    }
                }
                result[existingIdx] = merged;
                mergedRels++;
            } else {
                byCanon.set(keyLow, result.length);
                result.push(finalRel);
            }
        }
        snap.relationships = result;
    }

    // 2. charactersPresent — rename aliased entries, dedupe
    if (Array.isArray(snap.charactersPresent)) {
        const seen = new Set();
        const result = [];
        for (const n of snap.charactersPresent) {
            if (!n) continue;
            const low = n.toLowerCase().trim();
            const canon = aliasToCanon.get(low) || n;
            const canonLow = canon.toLowerCase().trim();
            if (seen.has(canonLow)) continue;
            seen.add(canonLow);
            result.push(canon);
            if (canon !== n) renamedPresent++;
        }
        snap.charactersPresent = result;
    }

    if (renamedRels + mergedRels + renamedPresent > 0) {
        log('reconcileIdentityAliases: rels renamed=', renamedRels, 'rels merged=', mergedRels,
            'present renamed=', renamedPresent);
    }
    return snap;
}

/**
 * Post-merge dedup pass for quest arrays. Consolidates near-duplicates that
 * snuck through the per-entry merge path — either because they already
 * existed in the carried-forward prev snapshot from before this fix landed,
 * or because the model emitted two paraphrases of the same quest in a
 * single delta batch.
 *
 * Uses the same fuzzy matcher as mergeEntityArray. For each quest, searches
 * backward for an earlier quest that matches fuzzily; if found, merges the
 * later entry's fields into the earlier one (earlier wins on name to keep
 * the quest ID stable across turns).
 */
function _dedupQuestArray(arr) {
    if (!Array.isArray(arr) || arr.length < 2) return arr;
    const result = [];
    const resultTokens = []; // cached per output entry
    for (const item of arr) {
        if (!item || !item.name) { result.push(item); resultTokens.push(new Set()); continue; }
        const tokens = _tokenizeQuestName(item.name);
        // Scan existing output for a fuzzy match (threshold inclusive — see
        // _findFuzzyQuestMatch for rationale on the 0.60 boundary case)
        let matchedIdx = -1, bestScore = -1;
        for (let i = 0; i < result.length; i++) {
            const score = _jaccardSimilarity(tokens, resultTokens[i]);
            if (score >= _QUEST_FUZZY_THRESHOLD && score > bestScore) {
                bestScore = score;
                matchedIdx = i;
            }
        }
        if (matchedIdx === -1) {
            result.push(item);
            resultTokens.push(tokens);
        } else {
            // Merge fields: keep earlier entry's name, fill in missing fields
            // from the later entry, and prefer the more recent urgency/detail
            // since later entries are typically more current.
            const earlier = result[matchedIdx];
            const merged = { ...earlier };
            for (const [fk, fv] of Object.entries(item)) {
                if (fk === 'name') continue; // keep earlier name as canonical
                if (fv !== undefined && fv !== null && fv !== '') merged[fk] = fv;
            }
            result[matchedIdx] = merged;
        }
    }
    return result;
}

/**
 * Post-merge cleanup pass over every quest tier on a tracker snapshot.
 * Mutates the snapshot in place and returns it for chaining.
 *
 * Two phases:
 *
 * PHASE 1 — In-tier fuzzy dedup. For each quest tier (mainQuests, sideQuests),
 * consolidate paraphrased near-duplicates via _dedupQuestArray using the same
 * Jaccard-over-stemmed-token-set matcher mergeEntityArray uses. Heals piles
 * that already contained near-duplicates before the delta arrived (e.g. a
 * snapshot restored from a pre-fuzzy-dedup version) and catches two
 * paraphrases of the same quest submitted in a single delta batch.
 *
 * PHASE 2 — Cross-tier dedup. mainQuests wins over sideQuests: if a sideQuest
 * fuzzy-matches (>= 0.60) a mainQuest, the sideQuest is dropped and its
 * field values are merged into the mainQuest (non-empty wins, name stays
 * canonical). This prevents the model from listing the same underlying
 * quest in both tiers — a failure mode the prompt now explicitly forbids
 * but which the model may still emit under long-context pressure.
 *
 * Safe to call on any snapshot-shaped object, including legacy ones with
 * missing or non-array tier fields. Idempotent.
 */
export function consolidateQuests(snap) {
    if (!snap || typeof snap !== 'object') return snap;

    // Phase 1: in-tier dedup
    for (const qk of QUEST_ARRAYS) {
        if (Array.isArray(snap[qk]) && snap[qk].length > 1) {
            const before = snap[qk].length;
            snap[qk] = _dedupQuestArray(snap[qk]);
            if (snap[qk].length < before) {
                log('Quest dedup:', qk, before, '→', snap[qk].length, '(-' + (before - snap[qk].length) + ')');
            }
        }
    }

    // Phase 2: cross-tier dedup — mainQuests absorbs any fuzzy-matching sideQuest.
    // Iterate sideQuests once; for each, scan mainQuests for a fuzzy hit. If
    // found, merge the sideQuest's non-empty fields into the matching main
    // entry (keeping the main name as canonical) and drop the sideQuest.
    if (Array.isArray(snap.mainQuests) && Array.isArray(snap.sideQuests) &&
        snap.mainQuests.length > 0 && snap.sideQuests.length > 0) {
        const mainTokens = snap.mainQuests.map(q => _tokenizeQuestName(q?.name));
        const keptSide = [];
        let absorbed = 0;
        for (const sq of snap.sideQuests) {
            if (!sq || !sq.name) { keptSide.push(sq); continue; }
            const sqTokens = _tokenizeQuestName(sq.name);
            let bestIdx = -1, bestScore = -1;
            for (let i = 0; i < mainTokens.length; i++) {
                const score = _jaccardSimilarity(sqTokens, mainTokens[i]);
                if (score >= _QUEST_FUZZY_THRESHOLD && score > bestScore) {
                    bestScore = score;
                    bestIdx = i;
                }
            }
            if (bestIdx === -1) {
                keptSide.push(sq);
            } else {
                // mainQuests wins — absorb non-empty fields from sq into the matching main
                const main = snap.mainQuests[bestIdx];
                const merged = { ...main };
                for (const [fk, fv] of Object.entries(sq)) {
                    if (fk === 'name') continue; // main name is canonical
                    if (fv !== undefined && fv !== null && fv !== '') merged[fk] = fv;
                }
                snap.mainQuests[bestIdx] = merged;
                absorbed++;
                log('Quest cross-tier:', JSON.stringify(sq.name), '→ absorbed into mainQuests', JSON.stringify(main.name));
            }
        }
        if (absorbed > 0) {
            snap.sideQuests = keptSide;
            log('Quest cross-tier: absorbed', absorbed, 'sideQuest(s) into mainQuests');
        }
    }

    return snap;
}
