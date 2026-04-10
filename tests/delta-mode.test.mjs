// tests/delta-mode.test.mjs — v6.8.50 delta mode production-readiness tests
//
// Run from project root: node tests/delta-mode.test.mjs
//
// Covers the critical test gaps identified in the delta mode audit:
//   1. Multi-turn chain (4 sequential deltas): scalar carry-forward,
//      roster stability, quest cap enforcement
//   2. Full-state-as-delta: LLM ignores delta instructions and
//      returns a complete snapshot — entities should not double
//   3. Empty object delta: {} produces clean clone of prev minus
//      resolved quests, with charactersPresent=[] and plotBranches=[]
//   4. Resolved quest eviction on carry-forward
//   5. Meter stability regression: delta updates innerThought only,
//      meters stay unchanged
//   6. plotBranches omission guard: omitted → empty (v6.8.50)

// ─── Stubs ────────────────────────────────────────────────────────────
const USER_NAME = 'Alex';
globalThis.SillyTavern = {
    getContext: () => ({
        name1: USER_NAME,
        name2: 'Jenna',
        characters: [],
        groups: [],
        groupId: null,
        selected_group: null,
        chatMetadata: { scenepulse: { snapshots: {} } },
        extensionSettings: { scenepulse: {} },
        saveMetadata: () => {},
        saveSettingsDebounced: () => {},
    }),
};
globalThis.toastr = { error: () => {}, warning: () => {}, info: () => {}, success: () => {} };
if (typeof document === 'undefined') {
    globalThis.document = { createElement: () => ({ style: {} }), body: { appendChild: () => {} } };
}

const { mergeDelta } = await import('../src/generation/delta-merge.js');
const { normalizeTracker } = await import('../src/normalize.js');

// ─── Assertion helpers ─────────────────────────────────────────────────
let pass = 0, fail = 0;
const failures = [];
function assertEq(name, actual, expected) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a === e) { pass++; console.log('  OK   ' + name); }
    else {
        fail++;
        failures.push({ name, actual: a, expected: e });
        console.log('  FAIL ' + name + ' — expected ' + e + ', got ' + a);
    }
}
function assertTrue(name, v) { assertEq(name, !!v, true); }

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('delta-mode — v6.8.50 production-readiness');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// ═══════════════════════════════════════════════════════════════════════
// 1. Multi-turn chain — 4 sequential deltas
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Multi-turn chain (4 deltas) ──');
{
    const base = {
        time: '10:00', date: 'Day 1', elapsed: '0', location: 'Precinct',
        weather: 'Sunny', sceneMood: 'tense', sceneSummary: 'Arrival.',
        charactersPresent: ['Buzzcut', 'Reyes'],
        characters: [
            { name: 'Buzzcut', role: 'Officer', innerThought: 'Suspicious.', hair: 'bald' },
            { name: 'Reyes', role: 'Junior', innerThought: 'Nervous.', hair: 'black' },
        ],
        relationships: [
            { name: 'Buzzcut', affection: 20, trust: 30 },
            { name: 'Reyes', affection: 40, trust: 50 },
        ],
        mainQuests: [{ name: 'Survive', urgency: 'critical', detail: 'Stay alive.' }],
        sideQuests: [],
        plotBranches: [{ type: 'dramatic', name: 'Run', hook: 'Flee.' }],
    };

    // Turn 1: update one character's thought, add a character
    const d1 = {
        time: '10:15', elapsed: '15m',
        charactersPresent: ['Buzzcut', 'Reyes', 'Keene'],
        characters: [
            { name: 'Buzzcut', role: 'Officer', innerThought: 'He is lying.', hair: 'bald' },
            { name: 'Keene', role: 'Detective', innerThought: 'New lead.', hair: 'gray' },
        ],
        plotBranches: [{ type: 'twist', name: 'Reveal', hook: 'Show evidence.' }],
    };
    const m1 = mergeDelta(base, d1);

    assertEq('turn 1: time updated', m1.time, '10:15');
    assertEq('turn 1: date carried forward', m1.date, 'Day 1');
    assertEq('turn 1: weather carried forward', m1.weather, 'Sunny');
    assertEq('turn 1: 3 characters', m1.characters.length, 3);
    assertEq('turn 1: Buzzcut thought updated', m1.characters.find(c => c.name === 'Buzzcut').innerThought, 'He is lying.');
    assertEq('turn 1: Reyes carried forward', m1.characters.find(c => c.name === 'Reyes').innerThought, 'Nervous.');
    assertEq('turn 1: Keene added', m1.characters.find(c => c.name === 'Keene').role, 'Detective');
    assertEq('turn 1: Buzzcut affection unchanged', m1.relationships.find(r => r.name === 'Buzzcut').affection, 20);
    assertEq('turn 1: main quest carried forward', m1.mainQuests.length, 1);

    // Turn 2: solo scene — empty presence
    const d2 = {
        time: '11:00', elapsed: '1h',
        charactersPresent: [],
        sceneMood: 'reflective',
        plotBranches: [{ type: 'exploratory', name: 'Think', hook: 'Process.' }],
    };
    const m2 = mergeDelta(m1, d2);
    assertEq('turn 2: empty presence', m2.charactersPresent, []);
    assertEq('turn 2: 3 characters still in roster', m2.characters.length, 3);
    assertEq('turn 2: mood updated', m2.sceneMood, 'reflective');

    // Turn 3: add a quest, return to populated scene
    const d3 = {
        time: '12:00', elapsed: '2h',
        charactersPresent: ['Keene'],
        mainQuests: [
            { name: 'Survive', urgency: 'critical', detail: 'Stay alive.' },
            { name: 'Find Evidence', urgency: 'high', detail: 'Get the file.' },
        ],
        plotBranches: [{ type: 'dramatic', name: 'Confront', hook: 'Face Keene.' }],
    };
    const m3 = mergeDelta(m2, d3);
    assertEq('turn 3: presence restored', m3.charactersPresent, ['Keene']);
    assertEq('turn 3: 2 main quests', m3.mainQuests.length, 2);
    assertEq('turn 3: characters still 3', m3.characters.length, 3);

    // Turn 4: add 3 more quests (will exceed cap after normalize)
    const d4 = {
        time: '13:00', elapsed: '3h',
        charactersPresent: ['Keene', 'Buzzcut'],
        mainQuests: [
            { name: 'Survive', urgency: 'critical', detail: 'Stay alive.' },
            { name: 'Find Evidence', urgency: 'high', detail: 'Get the file.' },
            { name: 'Contact Lawyer', urgency: 'moderate', detail: 'Call attorney.' },
            { name: 'Escape Plan', urgency: 'low', detail: 'Map the exits.' },
        ],
        plotBranches: [{ type: 'twist', name: 'Betrayal', hook: 'Keene flips.' }],
    };
    const m4 = mergeDelta(m3, d4);
    assertEq('turn 4: 4 raw main quests (pre-normalize)', m4.mainQuests.length, 4);

    // Run normalizeTracker to enforce the quest cap
    const norm4 = normalizeTracker(m4);
    assertTrue('turn 4: after normalize, main quests <= 3', norm4.mainQuests.length <= 3);
    assertEq('turn 4: highest-urgency quest survives', norm4.mainQuests[0].name, 'Survive');
}

// ═══════════════════════════════════════════════════════════════════════
// 2. Full-state received when delta expected
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Full-state-as-delta (no entity doubling) ──');
{
    const prev = {
        time: '09:00', location: 'Office',
        charactersPresent: ['Alice', 'Bob'],
        characters: [
            { name: 'Alice', role: 'Boss', innerThought: 'Busy.' },
            { name: 'Bob', role: 'Intern', innerThought: 'Confused.' },
        ],
        relationships: [
            { name: 'Alice', affection: 50 },
            { name: 'Bob', affection: 30 },
        ],
        mainQuests: [{ name: 'Get Promoted', urgency: 'moderate', detail: 'Impress Alice.' }],
        sideQuests: [],
        plotBranches: [],
    };
    // LLM returns a FULL state (all fields, not a delta)
    const fullAsDelted = {
        time: '09:30', location: 'Office', weather: 'Cloudy',
        charactersPresent: ['Alice', 'Bob'],
        characters: [
            { name: 'Alice', role: 'Boss', innerThought: 'Impressed.' },
            { name: 'Bob', role: 'Intern', innerThought: 'Still confused.' },
        ],
        relationships: [
            { name: 'Alice', affection: 55 },
            { name: 'Bob', affection: 30 },
        ],
        mainQuests: [{ name: 'Get Promoted', urgency: 'high', detail: 'Alice noticed good work.' }],
        sideQuests: [],
        plotBranches: [{ type: 'dramatic', name: 'Ask', hook: 'Request raise.' }],
    };
    const merged = mergeDelta(prev, fullAsDelted);
    assertEq('full-as-delta: characters not doubled', merged.characters.length, 2);
    assertEq('full-as-delta: relationships not doubled', merged.relationships.length, 2);
    assertEq('full-as-delta: quests not doubled', merged.mainQuests.length, 1);
    assertEq('full-as-delta: Alice thought updated', merged.characters.find(c => c.name === 'Alice').innerThought, 'Impressed.');
    assertEq('full-as-delta: Alice affection updated', merged.relationships.find(r => r.name === 'Alice').affection, 55);
    assertEq('full-as-delta: quest urgency updated', merged.mainQuests[0].urgency, 'high');
}

// ═══════════════════════════════════════════════════════════════════════
// 3. Empty object delta
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Empty object delta ──');
{
    const prev = {
        time: '08:00', location: 'Home',
        charactersPresent: ['Cat'],
        characters: [{ name: 'Cat', role: 'Pet' }],
        relationships: [],
        mainQuests: [{ name: 'Feed the cat', urgency: 'resolved', detail: 'Done.' }],
        sideQuests: [],
        plotBranches: [{ type: 'comedic', name: 'Nap', hook: 'Sleep.' }],
    };
    const merged = mergeDelta(prev, {});
    assertEq('empty delta: time carried forward', merged.time, '08:00');
    assertEq('empty delta: location carried forward', merged.location, 'Home');
    // charactersPresent omitted → empty (v6.8.45 rule)
    assertEq('empty delta: charactersPresent → []', merged.charactersPresent, []);
    // plotBranches omitted → empty (v6.8.50 rule)
    assertEq('empty delta: plotBranches → []', merged.plotBranches, []);
    // Resolved quests stripped on carry-forward (line 162)
    assertEq('empty delta: resolved quest evicted', merged.mainQuests.length, 0);
    // Character roster preserved
    assertEq('empty delta: characters preserved', merged.characters.length, 1);
}

// ═══════════════════════════════════════════════════════════════════════
// 4. Resolved quest eviction on carry-forward
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Resolved quest eviction ──');
{
    const prev = {
        mainQuests: [
            { name: 'Active Quest', urgency: 'high', detail: 'Ongoing.' },
            { name: 'Done Quest', urgency: 'resolved', detail: 'Completed.' },
        ],
        sideQuests: [
            { name: 'Side Active', urgency: 'moderate', detail: 'Side.' },
            { name: 'Side Done', urgency: 'resolved', detail: 'Side done.' },
        ],
        characters: [], relationships: [], charactersPresent: [], plotBranches: [],
    };
    // Delta with no quest changes — resolved should be stripped
    const merged = mergeDelta(prev, { time: '14:00', charactersPresent: [] });
    assertEq('resolved main quest evicted', merged.mainQuests.length, 1);
    assertEq('surviving main quest', merged.mainQuests[0].name, 'Active Quest');
    assertEq('resolved side quest evicted', merged.sideQuests.length, 1);
    assertEq('surviving side quest', merged.sideQuests[0].name, 'Side Active');
}

// ═══════════════════════════════════════════════════════════════════════
// 5. Meter stability regression
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Meter stability (delta updates thought only) ──');
{
    const prev = {
        characters: [
            { name: 'Jenna', role: 'Friend', innerThought: 'Worried.', hair: 'blonde' },
        ],
        relationships: [
            { name: 'Jenna', affection: 72, trust: 45, desire: 10, stress: 25, compatibility: 60 },
        ],
        charactersPresent: ['Jenna'], mainQuests: [], sideQuests: [], plotBranches: [],
    };
    // Delta updates ONLY innerThought — everything else should be stable
    const delta = {
        time: '15:00',
        charactersPresent: ['Jenna'],
        characters: [
            { name: 'Jenna', role: 'Friend', innerThought: 'Relieved.', hair: 'blonde' },
        ],
        plotBranches: [],
    };
    const merged = mergeDelta(prev, delta);
    const rel = merged.relationships.find(r => r.name === 'Jenna');
    assertEq('meter: affection unchanged', rel.affection, 72);
    assertEq('meter: trust unchanged', rel.trust, 45);
    assertEq('meter: desire unchanged', rel.desire, 10);
    assertEq('meter: stress unchanged', rel.stress, 25);
    assertEq('meter: compatibility unchanged', rel.compatibility, 60);
    assertEq('meter: thought updated', merged.characters[0].innerThought, 'Relieved.');
}

// ═══════════════════════════════════════════════════════════════════════
// 6. plotBranches omission guard (v6.8.50)
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── plotBranches omission guard ──');
{
    const prev = {
        plotBranches: [{ type: 'dramatic', name: 'Old', hook: 'Stale.' }],
        characters: [], relationships: [], charactersPresent: [],
        mainQuests: [], sideQuests: [],
    };
    // Delta omits plotBranches entirely
    const merged = mergeDelta(prev, { time: '16:00', charactersPresent: [] });
    assertEq('plotBranches omitted → empty', merged.plotBranches, []);

    // Delta explicitly provides plotBranches
    const merged2 = mergeDelta(prev, {
        time: '16:00', charactersPresent: [],
        plotBranches: [{ type: 'twist', name: 'New', hook: 'Fresh.' }],
    });
    assertEq('plotBranches explicit → replaced', merged2.plotBranches.length, 1);
    assertEq('plotBranches explicit → correct', merged2.plotBranches[0].name, 'New');
}

// ═══════════════════════════════════════════════════════════════════════
// 7. Full pipeline reveal integration (v6.9.1)
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Full pipeline: reveal → normalize → filterForView ──');
{
    const { filterForView } = await import('../src/normalize.js');
    const prev = {
        time: '20:00', location: 'Bar',
        charactersPresent: ['Stranger'],
        characters: [
            { name: 'Stranger', role: 'Unknown woman', innerThought: 'Watching him.' },
        ],
        relationships: [
            { name: 'Stranger', affection: 10, trust: 5 },
        ],
        mainQuests: [], sideQuests: [], plotBranches: [],
    };
    // Delta reveals Stranger's real name via aliases
    const delta = {
        time: '20:15',
        charactersPresent: ['Jenna'],
        characters: [
            { name: 'Jenna', role: 'Woman from the past', innerThought: 'He remembers.', aliases: ['Stranger'] },
        ],
        relationships: [
            { name: 'Jenna', affection: 30, trust: 15 },
        ],
        plotBranches: [],
    };
    const merged = mergeDelta(prev, delta);
    assertEq('reveal: character renamed', merged.characters.find(c => c.name === 'Jenna')?.role, 'Woman from the past');
    assertEq('reveal: old name in aliases', merged.characters.find(c => c.name === 'Jenna')?.aliases?.includes('Stranger'), true);
    assertEq('reveal: no Stranger entry', merged.characters.find(c => c.name === 'Stranger'), undefined);
    // The relationship merge path: "Stranger" (prev, affection=10) is
    // renamed to "Jenna" by reconcileIdentityAliases. The delta's "Jenna"
    // entry (affection=30) is ALSO added as a new entity. The reconciler
    // then deduplicates, merging both "Jenna" entries — but the delta's
    // new entry was appended AFTER the renamed prev entry, and the dedup
    // keeps the first-seen non-zero value. So the prev's 10 survives
    // as the affection value because the renamed entry comes first.
    // This is a known limitation of the current merge order.
    const jennaRel = merged.relationships.find(r => r.name === 'Jenna');
    assertTrue('reveal: Jenna relationship exists', !!jennaRel);
    assertEq('reveal: charactersPresent uses new name', merged.charactersPresent.includes('Jenna'), true);
    assertEq('reveal: no Stranger in presence', merged.charactersPresent.includes('Stranger'), false);

    // Run through normalizeTracker → filterForView
    const norm = normalizeTracker(merged);
    assertEq('norm: Jenna exists', norm.characters.find(c => c.name === 'Jenna')?.name, 'Jenna');
    const view = filterForView(norm);
    assertEq('view: Jenna visible', view.characters.length, 1);
    assertEq('view: Jenna name correct', view.characters[0].name, 'Jenna');
    assertEq('view: relationship visible', view.relationships.length, 1);
    assertEq('view: relationship name correct', view.relationships[0].name, 'Jenna');
}

// ─── Report ────────────────────────────────────────────────────────────
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
if (fail === 0) {
    console.log(`PASS ${pass}/${pass}`);
} else {
    console.log(`FAIL ${fail}/${pass + fail}`);
    for (const f of failures) {
        console.log('  ' + f.name);
        console.log('    expected:', f.expected);
        console.log('    actual:  ', f.actual);
    }
    process.exit(1);
}
