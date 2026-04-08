// Manual dev test for src/normalize.js isUserName() and the user-strip
// guards in normalizeTracker() / filterForView().
//
// Run from project root: node tests/no-user-as-character.test.mjs
// Not loaded by the extension — manifest.json only references index.js.
//
// Verifies that {{user}} never appears as a character entry, relationship
// entry, or in charactersPresent, regardless of which name alias the model
// uses (persona name, "User", "You", literal template token).
//
// normalize.js uses SillyTavern.getContext()?.name1 to identify the user.
// We stub a minimal SillyTavern global before importing so the test runs
// in node without the full DOM context.

const USER_NAME = 'Alex';

// Minimal SillyTavern stub — must be in place BEFORE normalize.js is imported
globalThis.SillyTavern = {
    getContext: () => ({
        name1: USER_NAME,
        name2: 'Jenna',
        chatMetadata: { scenepulse: { snapshots: {} } },
    }),
};

// normalize.js also transitively imports settings.js → which reads
// extensionSettings and chatMetadata on init. Stub extensionSettings too.
if (!globalThis.SillyTavern.getContext().extensionSettings) {
    globalThis.SillyTavern.getContext = () => ({
        name1: USER_NAME,
        name2: 'Jenna',
        chatMetadata: { scenepulse: { snapshots: {} } },
        extensionSettings: { scenepulse: {} },
        saveMetadata: () => {},
        saveSettingsDebounced: () => {},
    });
}

// Stub toastr which some ST-adjacent imports reference
globalThis.toastr = { error: () => {}, warning: () => {}, info: () => {}, success: () => {} };
// Stub document minimally (color.js may touch it)
if (typeof document === 'undefined') {
    globalThis.document = { createElement: () => ({ style: {} }), body: { appendChild: () => {} } };
}

const { isUserName, normalizeTracker, filterForView } = await import('../src/normalize.js');

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
function assertTrue(name, actual) { assertEq(name, !!actual, true); }
function assertFalse(name, actual) { assertEq(name, !!actual, false); }

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('no-user-as-character — user stub name1="' + USER_NAME + '"');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// ═══════════════════════════════════════════════════════════════════════
// 1. isUserName() direct tests
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── isUserName() direct matches ──');

assertTrue('persona name exact', isUserName('Alex'));
assertTrue('persona name lowercase', isUserName('alex'));
assertTrue('persona name trimmed', isUserName('  Alex  '));
assertTrue('persona name mixed case', isUserName('ALEX'));

assertTrue('literal {{user}} template token', isUserName('{{user}}'));
assertTrue('"User" alias', isUserName('User'));
assertTrue('"user" lowercase', isUserName('user'));
assertTrue('"You" alias', isUserName('You'));
assertTrue('"you" lowercase', isUserName('you'));
assertTrue('"Player" alias', isUserName('Player'));
assertTrue('"me" alias', isUserName('me'));

console.log('\n── isUserName() non-matches (characters that should pass through) ──');
assertFalse('bot character name (Jenna)', isUserName('Jenna'));
assertFalse('unrelated NPC', isUserName('Mike'));
assertFalse('empty string', isUserName(''));
assertFalse('null', isUserName(null));
assertFalse('undefined', isUserName(undefined));
assertFalse('non-string number', isUserName(42));
assertFalse('"users" (plural)', isUserName('users'));
assertFalse('"usernal" (partial match in longer word)', isUserName('usernal'));
// The bot {{char}} name must NEVER match — that's the primary character
assertFalse('{{char}} template token', isUserName('{{char}}'));

// ═══════════════════════════════════════════════════════════════════════
// 2. normalizeTracker strips user from characters
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── normalizeTracker: characters array ──');
{
    const d = {
        time: '12:00', date: '01/01/2026', location: 'park',
        charactersPresent: ['Alex', 'Jenna', 'Mike'],
        characters: [
            { name: 'Alex', role: 'The user', innerThought: 'I should not be here' },
            { name: 'Jenna', role: 'spouse', innerThought: 'Where is he' },
            { name: 'Mike', role: 'friend', innerThought: 'Nice day' },
        ],
        relationships: [
            { name: 'Jenna', affection: 80, trust: 70 },
            { name: 'Mike', affection: 40, trust: 50 },
        ],
    };
    const norm = normalizeTracker(d);
    assertEq('characters count after strip', norm.characters.length, 2);
    assertFalse('Alex not in characters', norm.characters.some(c => c.name === 'Alex'));
    assertTrue('Jenna kept', norm.characters.some(c => c.name === 'Jenna'));
    assertTrue('Mike kept', norm.characters.some(c => c.name === 'Mike'));
}

// ═══════════════════════════════════════════════════════════════════════
// 3. normalizeTracker strips user under alternate name aliases
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── normalizeTracker: character aliases ──');
{
    const d = {
        time: '12:00', date: '01/01/2026',
        charactersPresent: ['{{user}}', 'Jenna'],
        characters: [
            { name: '{{user}}', role: 'player', innerThought: 'hmm' },
            { name: 'Jenna', role: 'spouse', innerThought: 'yep' },
        ],
        relationships: [],
    };
    const norm = normalizeTracker(d);
    assertEq('{{user}} stripped from characters', norm.characters.length, 1);
    assertEq('{{user}} stripped from charactersPresent',
        norm.charactersPresent.filter(n => n === '{{user}}').length, 0);
    assertEq('Jenna kept', norm.characters[0].name, 'Jenna');
}
{
    const d = {
        time: '12:00', date: '01/01/2026',
        charactersPresent: ['User', 'Jenna'],
        characters: [
            { name: 'User', role: 'player', innerThought: 'hmm' },
            { name: 'Jenna', role: 'spouse', innerThought: 'yep' },
        ],
        relationships: [],
    };
    const norm = normalizeTracker(d);
    assertEq('"User" alias stripped', norm.characters.length, 1);
    assertEq('Jenna kept', norm.characters[0].name, 'Jenna');
}
{
    const d = {
        time: '12:00', date: '01/01/2026',
        charactersPresent: ['You', 'Jenna'],
        characters: [
            { name: 'You', role: 'player' },
            { name: 'Jenna', role: 'spouse' },
        ],
        relationships: [],
    };
    const norm = normalizeTracker(d);
    assertEq('"You" alias stripped', norm.characters.length, 1);
}

// ═══════════════════════════════════════════════════════════════════════
// 4. normalizeTracker strips user from relationships (self-relationship)
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── normalizeTracker: self-relationship ──');
{
    const d = {
        time: '12:00', date: '01/01/2026',
        characters: [{ name: 'Jenna', role: 'spouse' }],
        relationships: [
            { name: 'Alex', affection: 100, trust: 100 }, // self-relationship
            { name: 'Jenna', affection: 80, trust: 70 },
        ],
    };
    const norm = normalizeTracker(d);
    assertEq('relationships count after strip', norm.relationships.length, 1);
    assertFalse('Alex self-rel stripped', norm.relationships.some(r => r.name === 'Alex'));
    assertTrue('Jenna relationship kept', norm.relationships.some(r => r.name === 'Jenna'));
}

// ═══════════════════════════════════════════════════════════════════════
// 5. normalizeTracker strips user from charactersPresent
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── normalizeTracker: charactersPresent ──');
{
    const d = {
        time: '12:00', date: '01/01/2026',
        charactersPresent: ['Alex', 'Jenna', 'Mike', '{{user}}', 'You'],
        characters: [
            { name: 'Jenna', role: 'spouse' },
            { name: 'Mike', role: 'friend' },
        ],
        relationships: [],
    };
    const norm = normalizeTracker(d);
    assertEq('charactersPresent stripped to 2', norm.charactersPresent.length, 2);
    assertFalse('Alex not in charactersPresent', norm.charactersPresent.includes('Alex'));
    assertFalse('{{user}} not in charactersPresent', norm.charactersPresent.includes('{{user}}'));
    assertFalse('You not in charactersPresent', norm.charactersPresent.includes('You'));
    assertTrue('Jenna in charactersPresent', norm.charactersPresent.includes('Jenna'));
    assertTrue('Mike in charactersPresent', norm.charactersPresent.includes('Mike'));
}

// ═══════════════════════════════════════════════════════════════════════
// 6. filterForView defensive strip (belt-and-braces)
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── filterForView: defensive strip from legacy snapshots ──');
{
    // Simulate a legacy snapshot that bypassed normalize (e.g. saved before
    // v6.8.14). filterForView must still strip the user from the view.
    const legacySnap = {
        time: '12:00', date: '01/01/2026',
        charactersPresent: ['Alex', 'Jenna'],
        characters: [
            { name: 'Alex', role: 'player' },
            { name: 'Jenna', role: 'spouse' },
        ],
        relationships: [
            { name: 'Alex', affection: 100 },
            { name: 'Jenna', affection: 80 },
        ],
    };
    const view = filterForView(legacySnap);
    assertEq('view characters count', view.characters.length, 1);
    assertEq('view character is Jenna', view.characters[0].name, 'Jenna');
    assertEq('view relationships count', view.relationships.length, 1);
    assertEq('view charactersPresent count', view.charactersPresent.length, 1);
}

// ═══════════════════════════════════════════════════════════════════════
// 7. Normal NPC-only data passes through unchanged
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Regression: NPC-only data unaffected ──');
{
    const d = {
        time: '12:00', date: '01/01/2026',
        charactersPresent: ['Jenna', 'Mike', 'Uber Driver'],
        characters: [
            { name: 'Jenna', role: 'spouse' },
            { name: 'Mike', role: 'friend' },
            { name: 'Uber Driver', role: 'driver' },
        ],
        relationships: [
            { name: 'Jenna', affection: 80, trust: 70 },
            { name: 'Mike', affection: 50, trust: 60 },
        ],
    };
    const norm = normalizeTracker(d);
    assertEq('all 3 NPCs kept', norm.characters.length, 3);
    assertEq('all 3 in charactersPresent', norm.charactersPresent.length, 3);
    assertEq('all 2 relationships kept', norm.relationships.length, 2);
}

// ═══════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('no-user-as-character — ' + (pass + fail) + ' cases');
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
