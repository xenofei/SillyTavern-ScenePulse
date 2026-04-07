// Manual dev test for delta-merge.js fuzzy quest deduplication.
// Run from project root: node tests/delta-merge-fuzzy.test.mjs
// Not loaded by the extension — manifest.json only references index.js.
//
// Tests:
//   - exact name match still works (characters, relationships, quests)
//   - fuzzy match catches real paraphrased cases from the debug log
//   - fuzzy match does NOT apply to characters or relationships
//   - threshold is tight enough to avoid false positives on unrelated quests
//   - post-merge dedup pass consolidates near-dupes already in prev snapshot
//   - a single delta batch containing two paraphrases of the same quest
//     collapses to one entry via the post-merge pass
//
// delta-merge.js imports logger.js which uses `log` (a no-op here, but
// we can import the real module because logger has no DOM dependencies).

import { mergeDelta } from '../src/generation/delta-merge.js';

const cases = [];
let pass = 0, fail = 0;
const failures = [];

function assertEq(name, actual, expected) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a === e) { pass++; console.log('  OK  ' + name); }
    else {
        fail++;
        failures.push({ name, actual: a, expected: e });
        console.log('  FAIL ' + name);
        console.log('    expected: ' + e);
        console.log('    actual:   ' + a);
    }
}

function assertLen(name, arr, expected) {
    if (Array.isArray(arr) && arr.length === expected) { pass++; console.log('  OK  ' + name + ' (len=' + expected + ')'); }
    else {
        fail++;
        const actualLen = Array.isArray(arr) ? arr.length : 'not-an-array';
        failures.push({ name, actual: actualLen, expected });
        console.log('  FAIL ' + name + ' — expected len=' + expected + ', got ' + actualLen);
    }
}

function questNames(arr) {
    return (arr || []).map(q => q.name);
}

// ═══════════════════════════════════════════════════════════════════════
// 1. Exact match still works (regression)
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Exact match regression ──');
{
    const prev = {
        mainQuests: [
            { name: 'Fix the broken door', urgency: 'moderate', detail: 'before winter' },
            { name: 'Call the landlord', urgency: 'low', detail: '' }
        ]
    };
    const delta = {
        mainQuests: [
            { name: 'Fix the broken door', urgency: 'high', detail: 'urgent — storm incoming' }
        ]
    };
    const merged = mergeDelta(prev, delta);
    assertLen('exact match does not add duplicate', merged.mainQuests, 2);
    assertEq('exact match updates urgency', merged.mainQuests[0].urgency, 'high');
    assertEq('exact match updates detail', merged.mainQuests[0].detail, 'urgent — storm incoming');
    assertEq('unchanged quest preserved', merged.mainQuests[1].name, 'Call the landlord');
}

// ═══════════════════════════════════════════════════════════════════════
// 2. Fuzzy match — the real debug log cases
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Fuzzy match: real paraphrase cases ──');
{
    const prev = {
        mainQuests: [
            { name: 'pay and dismiss uber driver', urgency: 'high', detail: '' }
        ]
    };
    const delta = {
        mainQuests: [
            { name: 'pay and direct uber driver', urgency: 'high', detail: 'give the new destination' }
        ]
    };
    const merged = mergeDelta(prev, delta);
    assertLen('fuzzy match: dismiss/direct uber driver collapses to 1', merged.mainQuests, 1);
    assertEq('fuzzy match prefers later detail', merged.mainQuests[0].detail, 'give the new destination');
}

// ═══════════════════════════════════════════════════════════════════════
// 3. Fuzzy match — below threshold, should NOT merge
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Fuzzy match threshold: related but distinct ──');
{
    const prev = {
        mainQuests: [
            { name: 'get jenna medical help', urgency: 'critical', detail: 'a' }
        ]
    };
    const delta = {
        mainQuests: [
            { name: 'get jenna to hospital', urgency: 'critical', detail: 'b' }
        ]
    };
    const merged = mergeDelta(prev, delta);
    // Jaccard: {get,jenna,medical,help} vs {get,jenna,hospital} = 2/5 = 0.40 < 0.6
    assertLen('related but distinct quests stay separate', merged.mainQuests, 2);
}

// ═══════════════════════════════════════════════════════════════════════
// 4. Fuzzy match — parent vs qualified child stay separate
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Fuzzy match: parent vs qualified child ──');
{
    const prev = {
        mainQuests: [
            { name: 'comfort jenna', urgency: 'high', detail: 'general' }
        ]
    };
    const delta = {
        mainQuests: [
            { name: 'comfort jenna after confession', urgency: 'critical', detail: 'specific' }
        ]
    };
    const merged = mergeDelta(prev, delta);
    // After stopword removal (`after` is NOT a stopword — it carries temporal
    // meaning): {comfort,jenna} vs {comfort,jenna,after,confession}
    // Jaccard: 2/4 = 0.50 < 0.6 → NOT merged. The qualified child is a distinct
    // more-specific task; keeping it separate lets the user see both the ongoing
    // general intent and the in-the-moment qualified version.
    assertLen('parent and qualified child stay separate', merged.mainQuests, 2);
}

// ═══════════════════════════════════════════════════════════════════════
// 5. Fuzzy match does NOT apply to characters (names are identity)
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Characters: exact match only, no fuzzy ──');
{
    const prev = {
        characters: [
            { name: 'Jenna', role: 'spouse', hair: 'brown' }
        ]
    };
    const delta = {
        characters: [
            { name: 'Jenna Smith', role: 'spouse', hair: 'brown' }
        ]
    };
    const merged = mergeDelta(prev, delta);
    assertLen('character names must match exactly — "Jenna" != "Jenna Smith"', merged.characters, 2);
}

// ═══════════════════════════════════════════════════════════════════════
// 6. Fuzzy match does NOT apply to relationships
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Relationships: exact match only, no fuzzy ──');
{
    const prev = {
        relationships: [
            { name: 'Mike', affection: 30 }
        ]
    };
    const delta = {
        relationships: [
            { name: 'Mike Johnson', affection: 40 }
        ]
    };
    const merged = mergeDelta(prev, delta);
    assertLen('relationship names must match exactly', merged.relationships, 2);
}

// ═══════════════════════════════════════════════════════════════════════
// 7. Post-merge dedup heals a pile that already contains near-dupes
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Post-merge dedup heals existing pile ──');
{
    const prev = {
        mainQuests: [
            { name: 'pay and dismiss uber driver', urgency: 'high', detail: 'original' },
            { name: 'pay and direct uber driver', urgency: 'high', detail: 'second paraphrase' },
            { name: 'get jenna medical help', urgency: 'critical', detail: '' },
            { name: 'convince jenna to accept medical help', urgency: 'critical', detail: '' }
        ]
    };
    const delta = { time: '15:30' }; // no quest changes
    const merged = mergeDelta(prev, delta);
    // Post-merge dedup should consolidate pairs 1&2 (0.60 overlap) and
    // 3&4: tokens {get,jenna,medical,help} vs {convince,jenna,accept,medical,help}
    // intersection = {jenna,medical,help} = 3, union = 6, 3/6 = 0.50 → NOT merged
    // Only the uber driver pair merges → 3 remaining
    assertLen('uber driver pair consolidates via post-merge dedup', merged.mainQuests, 3);
}

// ═══════════════════════════════════════════════════════════════════════
// 8. Same-batch paraphrase (two paraphrases of one new quest in delta)
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Same-batch paraphrases consolidate ──');
{
    const prev = { mainQuests: [] };
    const delta = {
        mainQuests: [
            { name: 'book the flight to Tokyo', urgency: 'high', detail: 'a' },
            { name: 'book flight to Tokyo', urgency: 'high', detail: 'b' }
        ]
    };
    const merged = mergeDelta(prev, delta);
    // Both added in mergeEntityArray as distinct (fuzzy only runs against prev).
    // Post-merge dedup pass catches them:
    // tokens {book,flight,tokyo} vs {book,flight,tokyo} after stopword removal = identical = 1.0
    assertLen('same-batch paraphrases collapse to 1', merged.mainQuests, 1);
}

// ═══════════════════════════════════════════════════════════════════════
// 9. Many unrelated quests stay separate
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Unrelated quests stay separate (no false positives) ──');
{
    const prev = {
        mainQuests: [
            { name: 'call the plumber', urgency: 'moderate', detail: '' },
            { name: 'buy groceries', urgency: 'low', detail: '' },
            { name: 'finish the report', urgency: 'high', detail: '' },
            { name: 'pick up dry cleaning', urgency: 'low', detail: '' },
            { name: 'schedule dentist appointment', urgency: 'moderate', detail: '' }
        ]
    };
    const delta = { time: '15:30' };
    const merged = mergeDelta(prev, delta);
    assertLen('5 unrelated quests all preserved', merged.mainQuests, 5);
}

// ═══════════════════════════════════════════════════════════════════════
// 10. Main/side quest tiers also get fuzzy dedup
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Fuzzy dedup applies to mainQuests and sideQuests too ──');
{
    const prev = {
        mainQuests: [
            { name: 'rebuild trust with Jenna', urgency: 'high', detail: '' }
        ],
        sideQuests: [
            { name: 'learn to cook pasta', urgency: 'low', detail: '' }
        ]
    };
    const delta = {
        mainQuests: [
            { name: 'rebuild Jenna trust', urgency: 'high', detail: 'updated' }
        ],
        sideQuests: [
            { name: 'learn cooking pasta', urgency: 'low', detail: '' }
        ]
    };
    const merged = mergeDelta(prev, delta);
    assertLen('main quest paraphrase consolidates', merged.mainQuests, 1);
    assertLen('side quest paraphrase consolidates', merged.sideQuests, 1);
}

// ═══════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('delta-merge.js fuzzy quest dedup — ' + (pass + fail) + ' cases');
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
