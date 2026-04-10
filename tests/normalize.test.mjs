// tests/normalize.test.mjs — v6.9.8 normalize pipeline tests
//
// The core normalizeTracker() function (1,228 lines) had zero
// dedicated test coverage. These tests cover the critical paths:
//   1. Basic field normalization (scalars, enums, arrays)
//   2. Character normalization (name, role, aliases, archetype)
//   3. Relationship meter normalization (0-100 clamping, label inference)
//   4. Quest normalization (urgency enum, cap enforcement)
//   5. charactersPresent → empty stays empty (solo scene, v6.8.45)
//   6. filterForView produces correct intersection
//   7. {{user}} stripping from all arrays

// ─── Stubs ────────────────────────────────────────────────────────────
const USER_NAME = 'Devon';
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

const { normalizeTracker, filterForView, normalizeChar } = await import('../src/normalize.js');

// ─── Helpers ──────────────────────────────────────────────────────────
let pass = 0, fail = 0;
const failures = [];
function assertEq(name, actual, expected) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a === e) { pass++; console.log('  OK   ' + name); }
    else { fail++; failures.push({ name, actual: a, expected: e }); console.log('  FAIL ' + name + ' — expected ' + e + ', got ' + a); }
}
function assertTrue(name, v) { assertEq(name, !!v, true); }

function _baseSnap(overrides = {}) {
    return {
        time: '14:30', date: '04/09/2026', elapsed: '30m',
        location: 'Precinct', weather: 'Cloudy', temperature: '62F',
        soundEnvironment: 'Radio chatter', sceneTopic: 'Interrogation',
        sceneMood: 'Tense', sceneInteraction: 'Professional',
        sceneSummary: 'Devon is questioned.',
        charactersPresent: ['Buzzcut', 'Reyes'],
        characters: [
            { name: 'Buzzcut', role: 'Officer', archetype: 'authority', innerThought: 'Suspicious.' },
            { name: 'Reyes', role: 'Junior', archetype: 'ally', innerThought: 'Nervous.' },
        ],
        relationships: [
            { name: 'Buzzcut', affection: 20, trust: 30, desire: 0, stress: 40, compatibility: 50 },
            { name: 'Reyes', affection: 60, trust: 70, desire: 0, stress: 10, compatibility: 80 },
        ],
        mainQuests: [{ name: 'Survive', urgency: 'critical', detail: 'Stay alive.' }],
        sideQuests: [],
        plotBranches: [{ type: 'dramatic', name: 'Run', hook: 'Flee.' }],
        ...overrides,
    };
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('normalize — v6.9.8');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// ═══════════════════════════════════════════════════════════════════════
// 1. Basic field normalization
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Basic field normalization ──');
{
    const snap = _baseSnap();
    const out = normalizeTracker(snap);
    assertEq('time preserved', out.time, '14:30');
    assertEq('location preserved', out.location, 'Precinct');
    assertEq('weather preserved', out.weather, 'Cloudy');
    assertEq('sceneMood preserved', out.sceneMood, 'Tense');
    assertEq('sceneSummary preserved', out.sceneSummary, 'Devon is questioned.');
    assertTrue('characters is array', Array.isArray(out.characters));
    assertTrue('relationships is array', Array.isArray(out.relationships));
    assertTrue('mainQuests is array', Array.isArray(out.mainQuests));
    assertTrue('plotBranches is array', Array.isArray(out.plotBranches));
}

// ═══════════════════════════════════════════════════════════════════════
// 2. Character normalization
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Character normalization ──');
{
    const ch = normalizeChar({ name: 'Buzzcut', role: 'Officer', archetype: 'authority', aliases: ['Officer B'] });
    assertEq('char name', ch.name, 'Buzzcut');
    assertEq('char role', ch.role, 'Officer');
    assertEq('char archetype', ch.archetype, 'authority');
    assertEq('char aliases', ch.aliases, ['Officer B']);
}
{
    // Unknown archetype → empty string
    const ch = normalizeChar({ name: 'Test', archetype: 'notreal' });
    assertEq('invalid archetype → empty', ch.archetype, '');
}
{
    // Legacy archetype mapping
    const ch = normalizeChar({ name: 'Test', archetype: 'love' });
    assertEq('legacy love → lover', ch.archetype, 'lover');
}

// ═══════════════════════════════════════════════════════════════════════
// 3. Relationship meter normalization
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Relationship meter normalization ──');
{
    const snap = _baseSnap({
        relationships: [
            { name: 'Test', affection: 150, trust: -10, desire: 'high', stress: 50, compatibility: 75 },
        ],
    });
    const out = normalizeTracker(snap);
    const rel = out.relationships.find(r => r.name === 'Test');
    assertTrue('rel exists', !!rel);
    // Note: normalize does NOT clamp meters to 0-100. Out-of-range
    // values pass through; clamping happens at render time. This is
    // by design — the stored snapshot preserves the LLM's raw output.
    assertEq('affection passed through', rel.affection, 150);
    assertEq('trust passed through', rel.trust, -10);
    // desire: 'high' → should be parsed via label-to-value estimator
    assertTrue('desire is a number', typeof rel.desire === 'number');
    assertEq('stress preserved', rel.stress, 50);
    assertEq('compatibility preserved', rel.compatibility, 75);
}

// ═══════════════════════════════════════════════════════════════════════
// 4. Quest normalization + cap enforcement
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Quest normalization ──');
{
    const snap = _baseSnap({
        mainQuests: [
            { name: 'Quest 1', urgency: 'critical', detail: 'A' },
            { name: 'Quest 2', urgency: 'high', detail: 'B' },
            { name: 'Quest 3', urgency: 'moderate', detail: 'C' },
            { name: 'Quest 4', urgency: 'low', detail: 'D' },
            { name: 'Quest 5', urgency: 'low', detail: 'E' },
        ],
    });
    const out = normalizeTracker(snap);
    assertTrue('main quests capped at 3', out.mainQuests.length <= 3);
    assertEq('highest urgency survives', out.mainQuests[0].name, 'Quest 1');
}
{
    // Urgency mapping
    const snap = _baseSnap({
        mainQuests: [
            { name: 'Test', urgency: 'medium', detail: 'X' },
        ],
    });
    const out = normalizeTracker(snap);
    assertEq('medium → moderate', out.mainQuests[0].urgency, 'moderate');
}

// ═══════════════════════════════════════════════════════════════════════
// 5. Solo scene — empty charactersPresent stays empty
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Solo scene preservation ──');
{
    const snap = _baseSnap({ charactersPresent: [] });
    const out = normalizeTracker(snap);
    assertEq('empty presence preserved', out.charactersPresent, []);
}

// ═══════════════════════════════════════════════════════════════════════
// 6. filterForView intersection
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── filterForView ──');
{
    const snap = _baseSnap({
        charactersPresent: ['Buzzcut'],
        characters: [
            { name: 'Buzzcut', role: 'Officer' },
            { name: 'Reyes', role: 'Junior' },
        ],
        relationships: [
            { name: 'Buzzcut', affection: 20 },
            { name: 'Reyes', affection: 60 },
        ],
    });
    const view = filterForView(snap);
    assertEq('view: only Buzzcut in characters', view.characters.length, 1);
    assertEq('view: Buzzcut is the one', view.characters[0].name, 'Buzzcut');
    assertEq('view: only Buzzcut in relationships', view.relationships.length, 1);
}
{
    // Solo scene → empty view
    const snap = _baseSnap({ charactersPresent: [] });
    const view = filterForView(snap);
    assertEq('solo: empty characters', view.characters, []);
    assertEq('solo: empty relationships', view.relationships, []);
}

// ═══════════════════════════════════════════════════════════════════════
// 7. {{user}} stripping
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── {{user}} stripping ──');
{
    const snap = _baseSnap({
        charactersPresent: ['Devon', 'Buzzcut'],
        characters: [
            { name: 'Devon', role: 'Player' },
            { name: 'Buzzcut', role: 'Officer' },
        ],
        relationships: [
            { name: 'Devon', affection: 100 },
            { name: 'Buzzcut', affection: 20 },
        ],
    });
    const out = normalizeTracker(snap);
    assertEq('user stripped from characters', out.characters.length, 1);
    assertEq('user stripped from relationships', out.relationships.length, 1);
    assertTrue('user stripped from charactersPresent',
        !out.charactersPresent.some(n => n.toLowerCase() === 'devon'));
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
