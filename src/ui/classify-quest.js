// src/ui/classify-quest.js — Quest change classification
//
// Compares a current quest against its previous-snapshot counterpart and
// returns one of: 'new' | 'updated' | 'stale' | 'resolved'.
//
// The classifier is tuned to suppress cosmetic edits the model makes under
// structured-output pressure (rephrasing a detail, swapping synonyms, adding
// filler clauses) so the "Updated" badge only fires when a quest has
// *meaningfully* advanced in the story. See the threshold comment below.
//
// Pure function — no DOM dependencies. Imported by update-panel.js and by
// tests/classify-quest.test.mjs.

import { log } from '../logger.js';
import { tokenizeQuestText, jaccardSimilarity } from '../generation/delta-merge.js';

// Threshold for "this detail change is meaningfully different from the
// previous version, not just cosmetic."
//
// We tokenize both details (lowercase, strip punctuation, drop stopwords,
// stem suffixes via the shared quest tokenizer in delta-merge.js) and
// compute Jaccard SIMILARITY over the resulting token sets. If the similarity
// is >= COSMETIC_SIMILARITY, the change is considered cosmetic and the quest
// is classified 'stale' (no badge). Below that threshold the change is
// substantive and the quest is classified 'updated'.
//
// 0.75 means at least 75% of the non-stopword, stemmed content tokens must
// overlap for the change to count as cosmetic. Tuned against realistic cases:
//
//   "Help her feel safe" vs "Help her feel safe."
//     tokens A={help,feel,safe} B={help,feel,safe}    → 1.00 cosmetic ✗ badge
//
//   "Pay the uber driver" vs "Pay the Uber driver"
//     A={pay,uber,driver} B={pay,uber,driver}         → 1.00 cosmetic ✗ badge
//
//   "The photo shows her smiling" vs "The photograph shows her smiling"
//     A={photo,show,smil}  B={photograph,show,smil}   → 2/4 = 0.50 → badge
//     (this IS flagged — "photo" and "photograph" stem to different tokens;
//     the classifier errs on the side of flagging borderline changes)
//
//   "Make sure she eats" vs "Make sure she's eating"
//     A={make,sure,eat}  B={make,sure,eat}            → 1.00 cosmetic ✗ badge
//     (apostrophe stripped, stemmer normalizes eat/eating)
//
//   "Call mom back" vs "Call mom back before 5 PM when she leaves for work"
//     A={call,mom,back}  B={call,mom,back,before,5,pm,when,leav,work}
//     → 3/10 = 0.30 → badge (new concrete info added)
//
//   "Get her to the hospital" vs "Call 911 for ambulance"
//     A={get,hospital}  B={call,911,ambulanc}          → 0/5 = 0.00 → badge
//
// Any urgency change ALWAYS counts as substantive, regardless of detail diff —
// urgency is the strongest signal that the story actually shifted stakes.
//
// Name changes also always count as substantive (rare post-fuzzy-dedup).
const COSMETIC_SIMILARITY = 0.75;

/**
 * Classify a quest's change state between the previous snapshot and the
 * current one.
 *
 * @param {Object} q - Current quest entry {name, urgency, detail}
 * @param {Object|null} prev - Matching entry from the previous snapshot,
 *                             or null if there was no match (means new).
 *                             If the previous snapshot itself was absent
 *                             (first turn), pass null and the function
 *                             returns 'new'.
 * @param {boolean} hasPrevSnap - Whether a previous snapshot exists at all.
 *                                First-turn quests should classify as 'new'
 *                                only when this is true; otherwise everything
 *                                is trivially new and we don't want to badge
 *                                every quest on the first turn of a fresh chat.
 * @returns {'new'|'updated'|'stale'|'resolved'}
 */
export function classifyQuest(q, prev, hasPrevSnap) {
    // 'resolved' takes priority over everything — a resolved quest is visually
    // distinct and the state is self-evident regardless of what else changed.
    if ((q?.urgency || '') === 'resolved') return 'resolved';

    // First turn of a fresh chat: no previous snapshot means no comparison
    // basis. Don't badge anything as 'new' — a first-turn panel would otherwise
    // light up every quest. The caller already handles the "no prev map" case
    // upstream; this is belt-and-braces.
    if (!hasPrevSnap) return 'stale';

    // Quest didn't exist in previous snapshot → genuinely new
    if (!prev) return 'new';

    // Name change → always substantive. Rare after v6.8.8 fuzzy dedup (which
    // matches by normalized name), but possible when the model explicitly
    // renames or when the fuzzy match threshold doesn't fire.
    const nameChanged = (q.name || '').trim() !== (prev.name || '').trim();
    if (nameChanged) return 'updated';

    // Urgency change → always substantive. This is the strongest signal that
    // the story shifted the quest's stakes.
    const urgencyChanged = (q.urgency || '') !== (prev.urgency || '');
    if (urgencyChanged) return 'updated';

    // Detail change → substantive only if it carries meaningful new content.
    // Use the shared tokenizer to normalize both sides, then measure Jaccard
    // similarity. High similarity means cosmetic (rephrasing, punctuation,
    // minor synonym swaps within the same semantic core); low similarity
    // means real new information.
    const curDetail = (q.detail || '').trim();
    const prevDetail = (prev.detail || '').trim();
    if (curDetail === prevDetail) return 'stale';

    // Both details present but different — check substantiveness.
    const curTokens = tokenizeQuestText(curDetail);
    const prevTokens = tokenizeQuestText(prevDetail);

    // Edge case: one side has content and the other is empty → substantive
    // (the model either added info where there was none, or removed all of
    // it — both are meaningful state changes worth flagging).
    if (curTokens.size === 0 || prevTokens.size === 0) {
        return (curTokens.size === prevTokens.size) ? 'stale' : 'updated';
    }

    const similarity = jaccardSimilarity(curTokens, prevTokens);
    if (similarity >= COSMETIC_SIMILARITY) {
        // Diagnostic: log the suppressed cosmetic diff so we can see how
        // often the model is ignoring the prompt rule. Useful for tuning
        // the threshold if it turns out to be wrong in practice.
        log('classifyQuest: suppressed cosmetic diff for', JSON.stringify(q.name || ''),
            'similarity=', similarity.toFixed(2),
            'prev=', JSON.stringify(prevDetail.substring(0, 60)),
            'curr=', JSON.stringify(curDetail.substring(0, 60)));
        return 'stale';
    }
    return 'updated';
}

// Export the threshold and the test helpers so tests can assert against
// the same constants without drifting.
export { COSMETIC_SIMILARITY };
