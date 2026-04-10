// tests/solo-scene.test.mjs — v6.8.45 regression
//
// Run from project root: node tests/solo-scene.test.mjs
// Not loaded by the extension — manifest.json only references index.js.
//
// Verifies the "Alex alone in the train yard" bug is fixed. The bug:
// when {{user}} was alone in a solitude beat, the wiki and relationships
// panel still showed every character from the previous multi-character
// scene as "In Scene". Four stacked failure modes defeated the empty
// charactersPresent signal, and this test locks down all four:
//
//   1. delta-merge.js carried forward prev charactersPresent when the
//      delta omitted the field (fixed: omission now means empty)
//   2. normalize.js filled empty charactersPresent from characters[]
//      (fixed: fallback removed)
//   3. normalize.js carried forward prev charactersPresent if empty
//      (fixed: carry-forward removed)
//   4. normalize.js filterForView skipped filtering when
//      charactersPresent was empty, leaving every character visible
//      (fixed: empty means solo, return empty arrays)

// ─── Stubs (parallel to character-aliases.test.mjs) ────────────────────
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

const { normalizeTracker, filterForView } = await import('../src/normalize.js');
const { mergeDelta } = await import('../src/generation/delta-merge.js');

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

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('solo-scene — v6.8.45 regression');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// ═══════════════════════════════════════════════════════════════════════
// Failure mode 1 — delta-merge carryover when field is omitted
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── delta-merge: omitted charactersPresent means empty ──');
{
    const prev = {
        charactersPresent: ['Buzzcut', 'Detective Keene', 'Detective Orozco', 'Jack Browning'],
        characters: [
            { name: 'Buzzcut' },
            { name: 'Detective Keene' },
            { name: 'Detective Orozco' },
            { name: 'Jack Browning' },
        ],
        relationships: [],
    };
    // Delta for a solo beat — LLM omits charactersPresent per the old
    // misinterpretation of "omit if unchanged". After v6.8.45, the
    // delta-merge path treats this omission as an explicit empty roster.
    const delta = {
        time: '04:22',
        sceneSummary: 'Alex sits alone against cold metal in a train yard at dawn.',
    };
    const merged = mergeDelta(prev, delta);
    assertEq('omitted field → empty roster (not carry-forward)',
        merged.charactersPresent, []);
    // Characters array is unchanged (the roster persists even when no
    // one is in the current beat — that's the wiki's job to show).
    assertEq('characters array preserved',
        merged.characters.length, 4);
}

// ═══════════════════════════════════════════════════════════════════════
// Explicit empty delta also flows through cleanly
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── delta-merge: explicit empty charactersPresent ──');
{
    const prev = {
        charactersPresent: ['Buzzcut', 'Detective Keene'],
        characters: [{ name: 'Buzzcut' }, { name: 'Detective Keene' }],
        relationships: [],
    };
    const delta = {
        time: '04:22',
        charactersPresent: [],
    };
    const merged = mergeDelta(prev, delta);
    assertEq('explicit [] → empty roster', merged.charactersPresent, []);
}

// ═══════════════════════════════════════════════════════════════════════
// Non-empty delta charactersPresent still replaces the prior value
// (REPLACE_ARRAYS semantics unchanged)
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── delta-merge: explicit non-empty charactersPresent replaces ──');
{
    const prev = {
        charactersPresent: ['Buzzcut', 'Detective Keene'],
        characters: [{ name: 'Buzzcut' }, { name: 'Detective Keene' }, { name: 'Mrs. Patterson' }],
        relationships: [],
    };
    const delta = {
        charactersPresent: ['Mrs. Patterson'],
    };
    const merged = mergeDelta(prev, delta);
    assertEq('non-empty delta replaces prior',
        merged.charactersPresent, ['Mrs. Patterson']);
}

// ═══════════════════════════════════════════════════════════════════════
// Failure mode 2 — normalize no longer fills from characters[]
// Failure mode 3 — normalize no longer carries forward
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── normalize: empty charactersPresent stays empty ──');
{
    // Raw tracker (as if it just came off the delta-merge) with an
    // empty charactersPresent but a full characters roster. normalize
    // must NOT synthesize present-list from characters or from any
    // previous snapshot.
    const snap = {
        time: '04:22',
        date: 'Today',
        elapsed: '6h',
        location: 'Train yard',
        weather: 'Cold',
        temperature: '38F',
        soundEnvironment: 'Silence',
        sceneTopic: 'Solitude',
        sceneMood: 'Quiet',
        sceneInteraction: 'Introspection',
        sceneSummary: 'Alex alone at dawn.',
        charactersPresent: [],
        characters: [
            { name: 'Buzzcut', role: 'Officer' },
            { name: 'Jack Browning', role: 'Suspect' },
        ],
        relationships: [
            { name: 'Buzzcut', affection: 20, trust: 20 },
            { name: 'Jack Browning', affection: 40, trust: 50 },
        ],
        mainQuests: [],
        sideQuests: [],
        plotBranches: [],
    };
    const out = normalizeTracker(snap);
    assertEq('normalize: charactersPresent preserved as empty',
        out.charactersPresent, []);
    // The full roster is still there; only filterForView decides
    // what's visible in the main panel.
    assertEq('normalize: characters array untouched',
        out.characters.length, 2);
}

// ═══════════════════════════════════════════════════════════════════════
// Failure mode 4 — filterForView returns empty characters/relationships
// for solo scenes instead of skipping the filter
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── filterForView: solo scene shows empty view ──');
{
    const snap = {
        charactersPresent: [],
        characters: [
            { name: 'Buzzcut', role: 'Officer' },
            { name: 'Jack Browning', role: 'Suspect' },
            { name: 'Mrs. Patterson', role: 'Neighbor' },
        ],
        relationships: [
            { name: 'Buzzcut', affection: 20 },
            { name: 'Jack Browning', affection: 40 },
            { name: 'Mrs. Patterson', affection: 60 },
        ],
        mainQuests: [],
        sideQuests: [],
        plotBranches: [],
    };
    const view = filterForView(snap);
    assertEq('filterForView: characters empty in solo scene',
        view.characters, []);
    assertEq('filterForView: relationships empty in solo scene',
        view.relationships, []);
}

// ═══════════════════════════════════════════════════════════════════════
// Control: non-empty charactersPresent still filters normally
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── filterForView: control — non-empty charactersPresent ──');
{
    const snap = {
        charactersPresent: ['Buzzcut'],
        characters: [
            { name: 'Buzzcut', role: 'Officer' },
            { name: 'Jack Browning', role: 'Suspect' },
        ],
        relationships: [
            { name: 'Buzzcut', affection: 20 },
            { name: 'Jack Browning', affection: 40 },
        ],
        mainQuests: [],
        sideQuests: [],
        plotBranches: [],
    };
    const view = filterForView(snap);
    assertEq('filterForView: only Buzzcut remains', view.characters.length, 1);
    assertEq('filterForView: Buzzcut is the one',
        view.characters[0].name, 'Buzzcut');
    assertEq('filterForView: only Buzzcut relationship',
        view.relationships.length, 1);
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
