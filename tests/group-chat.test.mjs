// Manual dev test for src/normalize.js group chat handling.
//
// Run from project root: node tests/group-chat.test.mjs
// Not loaded by the extension — manifest.json only references index.js.
//
// Verifies the v6.8.15 group chat fix:
//   - getGroupMemberNames() resolves group members from SillyTavern context
//   - normalizeTracker carries forward missing group members from prev snap
//   - normalizeTracker derives _isPrimary for group members AND single-chat bot
//   - filterForView preserves group members even when charactersPresent omits them
//
// We stub SillyTavern's context before importing normalize.js so the test
// runs in node without the full DOM + ST runtime.

// Mutable context state so we can switch between group mode and single mode
// across tests without re-importing the module.
let _ctxState = {
    name1: 'Alex',
    name2: 'Alice',
    characters: [],
    groups: [],
    groupId: null,
    selected_group: null,
    chatMetadata: { scenepulse: { snapshots: {} } },
    extensionSettings: { scenepulse: {} },
    saveMetadata: () => {},
    saveSettingsDebounced: () => {},
};
globalThis.SillyTavern = { getContext: () => _ctxState };
globalThis.toastr = { error: () => {}, warning: () => {}, info: () => {}, success: () => {} };
if (typeof document === 'undefined') {
    globalThis.document = { createElement: () => ({ style: {} }), body: { appendChild: () => {} } };
}

const { getGroupMemberNames, normalizeTracker, filterForView } = await import('../src/normalize.js');

function setSingleChat(botName) {
    _ctxState.name2 = botName;
    _ctxState.characters = [{ name: botName, avatar: `${botName}.png` }];
    _ctxState.groups = [];
    _ctxState.groupId = null;
    _ctxState.selected_group = null;
}

function setGroupChat(botNames) {
    _ctxState.name2 = botNames[0];
    _ctxState.characters = botNames.map(n => ({ name: n, avatar: `${n}.png` }));
    _ctxState.groups = [{ id: 'test-group', members: botNames.map(n => `${n}.png`) }];
    _ctxState.groupId = 'test-group';
    _ctxState.selected_group = 'test-group';
    // Reset metadata so prev-snapshot carry-forward starts clean per test
    _ctxState.chatMetadata = { scenepulse: { snapshots: {} } };
}

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
function assertFalse(name, v) { assertEq(name, !!v, false); }

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('group-chat — v6.8.15 group support');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// ═══════════════════════════════════════════════════════════════════════
// 1. getGroupMemberNames() basic behavior
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── getGroupMemberNames() ──');
{
    setSingleChat('Alice');
    assertEq('single-chat: empty member list', getGroupMemberNames(), []);
}
{
    setGroupChat(['Alice', 'Bob', 'Carol']);
    assertEq('group chat: resolves 3 members', getGroupMemberNames(), ['Alice', 'Bob', 'Carol']);
}
{
    setGroupChat(['Alice']);
    // Single-member "group" is edge case — technically a group but we treat
    // members of 1 the same as single-chat for interceptor-prompt purposes.
    // getGroupMemberNames still returns the list; the interceptor checks > 1.
    assertEq('group with 1 member: still returned', getGroupMemberNames(), ['Alice']);
}

// ═══════════════════════════════════════════════════════════════════════
// 2. isPrimaryChar derivation — single chat
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── _isPrimary in single chat ──');
{
    setSingleChat('Alice');
    const d = {
        time: '12:00', date: '01/01/2026',
        charactersPresent: ['Alice', 'Bob'],
        characters: [
            { name: 'Alice', role: 'friend', innerThought: 'hey' },
            { name: 'Bob', role: 'stranger', innerThought: 'hmm' },
        ],
        relationships: [],
    };
    const norm = normalizeTracker(d);
    const alice = norm.characters.find(c => c.name === 'Alice');
    const bob = norm.characters.find(c => c.name === 'Bob');
    assertTrue('single chat: bot (Alice) is _isPrimary', alice?._isPrimary);
    assertFalse('single chat: non-bot (Bob) is NOT _isPrimary', bob?._isPrimary);
}

// ═══════════════════════════════════════════════════════════════════════
// 3. isPrimaryChar derivation — group chat (all members primary)
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── _isPrimary in group chat ──');
{
    setGroupChat(['Alice', 'Bob', 'Carol']);
    const d = {
        time: '12:00', date: '01/01/2026',
        charactersPresent: ['Alice', 'Bob', 'Carol', 'Waiter'],
        characters: [
            { name: 'Alice', role: 'friend', innerThought: 'hey' },
            { name: 'Bob', role: 'friend', innerThought: 'hmm' },
            { name: 'Carol', role: 'friend', innerThought: 'yo' },
            { name: 'Waiter', role: 'service worker', innerThought: 'busy night' },
        ],
        relationships: [],
    };
    const norm = normalizeTracker(d);
    const alice = norm.characters.find(c => c.name === 'Alice');
    const bob = norm.characters.find(c => c.name === 'Bob');
    const carol = norm.characters.find(c => c.name === 'Carol');
    const waiter = norm.characters.find(c => c.name === 'Waiter');
    assertTrue('group chat: Alice is primary', alice?._isPrimary);
    assertTrue('group chat: Bob is primary', bob?._isPrimary);
    assertTrue('group chat: Carol is primary', carol?._isPrimary);
    assertFalse('group chat: Waiter (not a member) is NOT primary', waiter?._isPrimary);
}

// ═══════════════════════════════════════════════════════════════════════
// 4. Group carry-forward — missing members restored from prev snapshot
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Group carry-forward: missing members restored ──');
{
    setGroupChat(['Alice', 'Bob', 'Carol']);
    // Seed a previous snapshot with full state for all three group members
    _ctxState.chatMetadata.scenepulse.snapshots['0'] = {
        time: '11:00', date: '01/01/2026',
        characters: [
            { name: 'Alice', role: 'friend', innerThought: 'prev alice', hair: 'red', face: '', outfit: '', posture: '', proximity: '', notableDetails: '', inventory: [], fertStatus: 'N/A', fertNotes: '' },
            { name: 'Bob', role: 'friend', innerThought: 'prev bob', hair: 'brown', face: '', outfit: '', posture: '', proximity: '', notableDetails: '', inventory: [], fertStatus: 'N/A', fertNotes: '' },
            { name: 'Carol', role: 'friend', innerThought: 'prev carol', hair: 'black', face: '', outfit: '', posture: '', proximity: '', notableDetails: '', inventory: [], fertStatus: 'N/A', fertNotes: '' },
        ],
        charactersPresent: ['Alice', 'Bob', 'Carol'],
    };
    // Current turn: model only emitted Alice (simulates the bug)
    const d = {
        time: '12:00', date: '01/01/2026',
        charactersPresent: ['Alice'],
        characters: [
            { name: 'Alice', role: 'friend', innerThought: 'current alice', hair: 'red' },
        ],
        relationships: [],
    };
    const norm = normalizeTracker(d);
    // All three group members should be present in the normalized output
    assertEq('carry-forward: 3 chars in output', norm.characters.length, 3);
    const names = norm.characters.map(c => c.name).sort();
    assertEq('carry-forward: names preserved', names, ['Alice', 'Bob', 'Carol']);
    // Alice gets the fresh data from the current turn
    const alice = norm.characters.find(c => c.name === 'Alice');
    assertEq('Alice has fresh innerThought', alice?.innerThought, 'current alice');
    // Bob and Carol are carried forward from prev with their old data intact
    const bob = norm.characters.find(c => c.name === 'Bob');
    const carol = norm.characters.find(c => c.name === 'Carol');
    assertEq('Bob carried forward with prev data', bob?.innerThought, 'prev bob');
    assertEq('Carol carried forward with prev data', carol?.innerThought, 'prev carol');
}

// ═══════════════════════════════════════════════════════════════════════
// 5. filterForView preserves group members even if missing from charactersPresent
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── filterForView: group member rescue ──');
{
    setGroupChat(['Alice', 'Bob', 'Carol']);
    const snap = {
        time: '12:00', date: '01/01/2026',
        // Model listed only Alice in charactersPresent even though Bob and
        // Carol are in the group
        charactersPresent: ['Alice'],
        characters: [
            { name: 'Alice', role: 'friend' },
            { name: 'Bob', role: 'friend' },
            { name: 'Carol', role: 'friend' },
            { name: 'Waiter', role: 'service worker' },
        ],
        relationships: [
            { name: 'Alice', relType: 'friend', affection: 80 },
            { name: 'Bob', relType: 'friend', affection: 75 },
            { name: 'Carol', relType: 'friend', affection: 70 },
            { name: 'Waiter', relType: 'service', affection: 50 },
        ],
    };
    const view = filterForView(snap);
    const viewNames = (view.characters || []).map(c => c.name).sort();
    // Alice (in charactersPresent), Bob (group member), Carol (group member)
    // should all survive. Waiter (not in charactersPresent, not a group member)
    // should be filtered out.
    assertEq('filterForView preserves group members', viewNames, ['Alice', 'Bob', 'Carol']);
    const viewRels = (view.relationships || []).map(r => r.name).sort();
    assertEq('filterForView preserves group member relationships', viewRels, ['Alice', 'Bob', 'Carol']);
}

// ═══════════════════════════════════════════════════════════════════════
// 6. Single chat regression — view filter still works as before
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── filterForView: single chat regression ──');
{
    setSingleChat('Alice');
    const snap = {
        time: '12:00', date: '01/01/2026',
        charactersPresent: ['Alice', 'Waiter'],
        characters: [
            { name: 'Alice', role: 'bot' },
            { name: 'Waiter', role: 'service worker' },
            { name: 'OldFriend', role: 'absent' }, // not in charactersPresent
        ],
        relationships: [
            { name: 'Alice', affection: 80 },
            { name: 'Waiter', affection: 30 },
            { name: 'OldFriend', affection: 60 },
        ],
    };
    const view = filterForView(snap);
    const viewNames = (view.characters || []).map(c => c.name).sort();
    assertEq('single chat: only charactersPresent kept', viewNames, ['Alice', 'Waiter']);
}

// ═══════════════════════════════════════════════════════════════════════
// 7. Group carry-forward doesn't duplicate present members
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Group carry-forward: no duplication ──');
{
    setGroupChat(['Alice', 'Bob']);
    _ctxState.chatMetadata.scenepulse.snapshots['0'] = {
        characters: [
            { name: 'Alice', innerThought: 'old', fertStatus: 'N/A' },
            { name: 'Bob', innerThought: 'old', fertStatus: 'N/A' },
        ],
        charactersPresent: ['Alice', 'Bob'],
    };
    // Current turn: model emitted BOTH members. Carry-forward should NOT
    // add duplicates because both are already in the current output.
    const d = {
        time: '12:00', date: '01/01/2026',
        charactersPresent: ['Alice', 'Bob'],
        characters: [
            { name: 'Alice', innerThought: 'new' },
            { name: 'Bob', innerThought: 'new' },
        ],
        relationships: [],
    };
    const norm = normalizeTracker(d);
    assertEq('no duplicate chars', norm.characters.length, 2);
    const alice = norm.characters.find(c => c.name === 'Alice');
    const bob = norm.characters.find(c => c.name === 'Bob');
    assertEq('Alice uses current (not prev)', alice?.innerThought, 'new');
    assertEq('Bob uses current (not prev)', bob?.innerThought, 'new');
}

// ═══════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('group-chat — ' + (pass + fail) + ' cases');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log((fail === 0 ? 'PASS ' : 'FAIL ') + pass + '/' + (pass + fail));

if (failures.length) {
    console.log('\nFailures:');
    for (const f of failures) {
        console.log('  [' + f.name + ']');
        console.log('    expected: ' + f.expected);
        console.log('    actual:   ' + f.actual);
    }
}

process.exit(failures.length ? 1 : 0);
