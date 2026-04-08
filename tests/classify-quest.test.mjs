// Manual dev test for src/ui/classify-quest.js
// Run from project root: node tests/classify-quest.test.mjs
// Not loaded by the extension — manifest.json only references index.js.
//
// Verifies the meaningfulness-aware quest classifier suppresses cosmetic
// edits (the v6.8.13 fix) while still flagging real story progress.
//
// Import chain: classify-quest.js → delta-merge.js (tokenizer) → logger.js
// None of those have DOM dependencies, so the module is directly importable
// in node.

import { classifyQuest, COSMETIC_SIMILARITY } from '../src/ui/classify-quest.js';

let pass = 0, fail = 0;
const failures = [];

function assertEq(name, actual, expected) {
    if (actual === expected) { pass++; console.log('  OK   ' + name); }
    else {
        fail++;
        failures.push({ name, actual, expected });
        console.log('  FAIL ' + name + ' — expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
    }
}

function q(name, urgency, detail) {
    return { name, urgency, detail };
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('classifyQuest — threshold=' + COSMETIC_SIMILARITY);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// ═══════════════════════════════════════════════════════════════════════
// 1. Baseline states: resolved, new, no prev snap
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Baseline states ──');
{
    const curr = q('Foo', 'resolved', 'done');
    assertEq('resolved urgency → resolved', classifyQuest(curr, null, true), 'resolved');
}
{
    const curr = q('Foo', 'high', 'something');
    assertEq('no prev entry + hasPrev → new', classifyQuest(curr, null, true), 'new');
}
{
    const curr = q('Foo', 'high', 'something');
    assertEq('no prev snap at all → stale (first turn, no badge)', classifyQuest(curr, null, false), 'stale');
}

// ═══════════════════════════════════════════════════════════════════════
// 2. Identical quest → stale (no badge)
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Identical entries stay stale ──');
{
    const prev = q('Fix the door', 'moderate', 'Before the storm arrives');
    const curr = q('Fix the door', 'moderate', 'Before the storm arrives');
    assertEq('byte-identical → stale', classifyQuest(curr, prev, true), 'stale');
}

// ═══════════════════════════════════════════════════════════════════════
// 3. Cosmetic detail edits → stale (the v6.8.13 fix)
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Cosmetic edits are suppressed ──');
{
    const prev = q('Help her feel safe', 'high', 'Reassure her she is not alone');
    const curr = q('Help her feel safe', 'high', 'Reassure her she is not alone.');
    assertEq('trailing punctuation only → stale', classifyQuest(curr, prev, true), 'stale');
}
{
    // Name-compare is case-sensitive: 'uber' vs 'Uber' flags as updated.
    // This IS the intended behavior — names are identifiers, so
    // capitalization changes signal the model re-noun'd the quest.
    const prev = q('Pay the uber driver', 'moderate', 'Tip in cash');
    const curr = q('Pay the Uber driver', 'moderate', 'tip in cash');
    assertEq('name casing differs (uber→Uber) → updated', classifyQuest(curr, prev, true), 'updated');
}
{
    // Detail-only casing with identical name → stale. Tokenizer
    // lowercases both sides before Jaccard, so pure casing swaps
    // tokenize identically and get suppressed.
    const prev = q('Pay the uber driver', 'moderate', 'Tip in cash');
    const curr = q('Pay the uber driver', 'moderate', 'tip in cash');
    assertEq('detail casing only, same name → stale', classifyQuest(curr, prev, true), 'stale');
}
{
    // Contraction "hasn't" vs "has not" is a real rephrasing, not
    // pure cosmetic. After apostrophe strip, "hasnt" is a distinct
    // token from "has"+"not". Tokens: {ha, not, eaten, all, day}
    // (has→ha via stem) vs {hasnt, eaten, all, day}. Jaccard ~0.6
    // which is BELOW the 0.75 cosmetic threshold, so it flags as
    // updated. This is the classifier correctly distinguishing
    // "same words, different punctuation" from "different words".
    const prev = q('Make sure she eats', 'high', 'She has not eaten all day');
    const curr = q('Make sure she eats', 'high', "She hasn't eaten all day");
    assertEq("contraction swap (hasn't vs has not) → updated", classifyQuest(curr, prev, true), 'updated');
}
{
    const prev = q('Talk to Jenna', 'high', 'She seems upset about something');
    const curr = q('Talk to Jenna', 'high', 'She seems upset about something.');
    assertEq('punctuation only → stale', classifyQuest(curr, prev, true), 'stale');
}
{
    const prev = q('Find the notebook', 'moderate', 'It was in the drawer before');
    const curr = q('Find the notebook', 'moderate', 'It was in the drawer before.');
    assertEq('trailing period → stale', classifyQuest(curr, prev, true), 'stale');
}

// ═══════════════════════════════════════════════════════════════════════
// 4. Urgency change → always updated (even if detail identical)
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Urgency changes always flag ──');
{
    const prev = q('Get to the hospital', 'high', 'Jenna needs help');
    const curr = q('Get to the hospital', 'critical', 'Jenna needs help');
    assertEq('urgency high→critical, same detail → updated', classifyQuest(curr, prev, true), 'updated');
}
{
    const prev = q('Survive the night', 'critical', 'Stay quiet');
    const curr = q('Survive the night', 'moderate', 'Stay quiet');
    assertEq('urgency critical→moderate → updated', classifyQuest(curr, prev, true), 'updated');
}
{
    const prev = q('Foo', 'low', 'bar');
    const curr = q('Foo', 'high', 'bar');
    assertEq('urgency low→high → updated', classifyQuest(curr, prev, true), 'updated');
}

// ═══════════════════════════════════════════════════════════════════════
// 5. Substantive detail changes → updated
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Substantive detail changes flag ──');
{
    const prev = q('Call mom back', 'moderate', 'She left a voicemail yesterday');
    const curr = q('Call mom back', 'moderate', 'She left a voicemail yesterday; said it was about the inheritance and Aunt Ruth');
    assertEq('added concrete new facts → updated', classifyQuest(curr, prev, true), 'updated');
}
{
    const prev = q('Find the missing key', 'high', 'Lost somewhere in the apartment');
    const curr = q('Find the missing key', 'high', 'Last seen on the kitchen counter by the fruit bowl');
    assertEq('completely different content → updated', classifyQuest(curr, prev, true), 'updated');
}
{
    const prev = q('Get Jenna home', 'high', 'She needs rest');
    const curr = q('Get Jenna home', 'high', 'Uber is three blocks away, ETA 6 minutes');
    assertEq('different facts replaced the detail → updated', classifyQuest(curr, prev, true), 'updated');
}

// ═══════════════════════════════════════════════════════════════════════
// 6. Name changes → always updated
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Name changes always flag ──');
{
    const prev = q('Comfort her', 'high', 'She is shaking');
    const curr = q('Comfort Jenna', 'high', 'She is shaking');
    assertEq('name got more specific → updated', classifyQuest(curr, prev, true), 'updated');
}
{
    const prev = q('Old name', 'moderate', 'same detail');
    const curr = q('New name', 'moderate', 'same detail');
    assertEq('name completely replaced → updated', classifyQuest(curr, prev, true), 'updated');
}

// ═══════════════════════════════════════════════════════════════════════
// 7. Empty-detail edge cases
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Empty-detail edge cases ──');
{
    const prev = q('Foo', 'high', '');
    const curr = q('Foo', 'high', 'now has actual content');
    assertEq('empty → non-empty detail → updated', classifyQuest(curr, prev, true), 'updated');
}
{
    const prev = q('Foo', 'high', 'had content');
    const curr = q('Foo', 'high', '');
    assertEq('non-empty → empty detail → updated', classifyQuest(curr, prev, true), 'updated');
}
{
    const prev = q('Foo', 'high', '');
    const curr = q('Foo', 'high', '');
    assertEq('both empty → stale', classifyQuest(curr, prev, true), 'stale');
}

// ═══════════════════════════════════════════════════════════════════════
// 8. Borderline: small additions and synonym swaps
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Borderline cases ──');
{
    // Adding a 4-word qualifier to a 3-word detail
    // A={help,feel,safe} vs B={help,feel,safe,tonight,especial}
    // intersection=3 union=5 → 0.60 < 0.75 → updated
    const prev = q('Help her', 'high', 'Help her feel safe');
    const curr = q('Help her', 'high', 'Help her feel safe tonight especially');
    assertEq('3-word detail + 2 new content words → updated', classifyQuest(curr, prev, true), 'updated');
}
{
    // Tiny padding addition that stays below the threshold
    // A={fetch,wallet}, B={fetch,wallet,quickly}
    // intersection=2 union=3 → 0.67 < 0.75 → updated
    const prev = q('Grab wallet', 'low', 'Fetch wallet');
    const curr = q('Grab wallet', 'low', 'Fetch wallet quickly');
    assertEq('one added content word on a 2-word detail → updated', classifyQuest(curr, prev, true), 'updated');
}
{
    // Filler-only padding with zero content change
    // Stopwords (the, a, and, of) don't count so both sides tokenize the same
    // A={find,key} vs B={find,key}
    const prev = q('Find key', 'low', 'Find the key');
    const curr = q('Find key', 'low', 'Find a key');
    assertEq('stopword swap only (the→a) → stale', classifyQuest(curr, prev, true), 'stale');
}

// ═══════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('classify-quest.js — ' + (pass + fail) + ' cases');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log((fail === 0 ? 'PASS ' : 'FAIL ') + pass + '/' + (pass + fail));

if (failures.length) {
    console.log('\nFailures:');
    for (const f of failures) {
        console.log('  [' + f.name + ']');
        console.log('    expected: ' + JSON.stringify(f.expected));
        console.log('    actual:   ' + JSON.stringify(f.actual));
    }
}

process.exit(failures.length ? 1 : 0);
