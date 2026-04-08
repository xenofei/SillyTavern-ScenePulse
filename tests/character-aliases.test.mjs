// Manual dev test for v6.8.18 character alias support.
//
// Run from project root: node tests/character-aliases.test.mjs
// Not loaded by the extension — manifest.json only references index.js.
//
// Verifies:
//   1. normalizeChar() parses `aliases` defensively (array / string / missing)
//      and strips the canonical name from the list
//   2. mergeEntityArray() exact match path is unchanged (regression)
//   3. ALIAS match: delta references character by old placeholder → merges
//      into existing entry WITHOUT renaming
//   4. REVEAL match: delta has aliases pointing to prev canonical name →
//      RENAMES prev entry, pushes old name into aliases
//   5. Alias list union across prev and delta, deduped case-insensitively
//   6. Canonical name is never listed as its own alias
//   7. Subsequent delta entries in the same batch see updates from earlier
//      deltas (prevMap + aliasMap stay in sync)
//   8. reconcileIdentityAliases() rewrites relationships and
//      charactersPresent entries that reference old placeholders
//   9. Duplicate relationship entries (same canonical after rewrite) are
//      merged, non-empty fields preserved
//  10. Characters without aliases pass through unchanged (regression)

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

const { normalizeChar } = await import('../src/normalize.js');
const { mergeDelta, reconcileIdentityAliases } = await import('../src/generation/delta-merge.js');

// ─── Assertion helpers ────────────────────────────────────────────────
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
console.log('character-aliases — v6.8.18');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// ═══════════════════════════════════════════════════════════════════════
// 1. normalizeChar() parses aliases defensively
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── normalizeChar: aliases parsing ──');
{
    const ch = normalizeChar({ name: 'Jenna', aliases: ['Stranger', 'Woman in Red'] });
    assertEq('array: parsed both entries', ch.aliases, ['Stranger', 'Woman in Red']);
}
{
    const ch = normalizeChar({ name: 'Jenna', aliases: 'Stranger' });
    assertEq('string: wrapped to array', ch.aliases, ['Stranger']);
}
{
    const ch = normalizeChar({ name: 'Jenna' });
    assertEq('missing: defaults to empty array', ch.aliases, []);
}
{
    const ch = normalizeChar({ name: 'Jenna', aliases: [] });
    assertEq('empty array: preserved', ch.aliases, []);
}
{
    const ch = normalizeChar({ name: 'Jenna', aliases: ['Stranger', 'jenna', 'JENNA'] });
    assertEq('canonical name stripped from aliases (case-insensitive)',
        ch.aliases, ['Stranger']);
}
{
    const ch = normalizeChar({ name: 'Jenna', aliases: ['Stranger', 'Stranger', ' stranger '] });
    assertEq('duplicate aliases deduped case-insensitively',
        ch.aliases, ['Stranger']);
}
{
    const ch = normalizeChar({ name: 'Jenna', aliases: [null, '', undefined, 'Woman'] });
    assertEq('empty/nullish aliases filtered', ch.aliases, ['Woman']);
}

// ═══════════════════════════════════════════════════════════════════════
// 2. Exact match regression — merge without aliases
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Merge: exact match regression ──');
{
    const prev = {
        characters: [
            { name: 'Jenna', role: 'friend', innerThought: 'old', aliases: [] }
        ]
    };
    const delta = {
        characters: [
            { name: 'Jenna', innerThought: 'new' }
        ]
    };
    const merged = mergeDelta(prev, delta);
    assertEq('one character after exact merge', merged.characters.length, 1);
    assertEq('name preserved', merged.characters[0].name, 'Jenna');
    assertEq('innerThought updated from delta', merged.characters[0].innerThought, 'new');
    assertEq('role carried forward from prev', merged.characters[0].role, 'friend');
    assertEq('empty aliases preserved', merged.characters[0].aliases, []);
}

// ═══════════════════════════════════════════════════════════════════════
// 3. ALIAS match: model references character by old placeholder
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Merge: ALIAS match (old name referenced) ──');
{
    // Prev already knows Jenna and remembers she was once called "Stranger"
    const prev = {
        characters: [
            { name: 'Jenna', role: 'friend', innerThought: 'hey', aliases: ['Stranger'] }
        ]
    };
    // Delta still calls her "Stranger" by mistake
    const delta = {
        characters: [
            { name: 'Stranger', innerThought: 'new thought' }
        ]
    };
    const merged = mergeDelta(prev, delta);
    assertEq('single character after alias merge', merged.characters.length, 1);
    assertEq('canonical name preserved (not renamed to Stranger)',
        merged.characters[0].name, 'Jenna');
    assertEq('innerThought updated from delta', merged.characters[0].innerThought, 'new thought');
    assertEq('alias list preserved', merged.characters[0].aliases, ['Stranger']);
}

// ═══════════════════════════════════════════════════════════════════════
// 4. REVEAL match: delta has aliases pointing to prev canonical name
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Merge: REVEAL match (unknown→known identity) ──');
{
    // Prev knows only "Stranger" (no aliases yet)
    const prev = {
        characters: [
            { name: 'Stranger', role: 'mysterious woman', innerThought: 'old thought', hair: 'red', aliases: [] }
        ]
    };
    // Delta reveals her real name is Jenna
    const delta = {
        characters: [
            { name: 'Jenna', aliases: ['Stranger'], innerThought: 'now I can tell them who I am' }
        ]
    };
    const merged = mergeDelta(prev, delta);
    assertEq('single character after reveal merge', merged.characters.length, 1);
    assertEq('canonical name upgraded to Jenna', merged.characters[0].name, 'Jenna');
    assertEq('old name pushed into aliases', merged.characters[0].aliases, ['Stranger']);
    assertEq('innerThought updated', merged.characters[0].innerThought, 'now I can tell them who I am');
    assertEq('role carried forward', merged.characters[0].role, 'mysterious woman');
    assertEq('hair carried forward', merged.characters[0].hair, 'red');
}

// ═══════════════════════════════════════════════════════════════════════
// 5. Alias list union across prev and delta
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Merge: alias list union ──');
{
    const prev = {
        characters: [
            { name: 'Jenna', aliases: ['Stranger', 'The Nurse'] }
        ]
    };
    const delta = {
        characters: [
            { name: 'Jenna', aliases: ['The Nurse', 'Woman in White'] }
        ]
    };
    const merged = mergeDelta(prev, delta);
    assertEq('unioned + deduped (case-insensitive)',
        merged.characters[0].aliases.sort(),
        ['Stranger', 'The Nurse', 'Woman in White'].sort());
}

// ═══════════════════════════════════════════════════════════════════════
// 6. Canonical name must NEVER appear in its own aliases
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Merge: canonical name never in aliases ──');
{
    const prev = {
        characters: [
            { name: 'Jenna', aliases: [] }
        ]
    };
    // Model accidentally lists canonical name in the aliases field
    const delta = {
        characters: [
            { name: 'Jenna', aliases: ['jenna', 'JENNA', 'Stranger'] }
        ]
    };
    const merged = mergeDelta(prev, delta);
    assertEq('self-alias stripped, Stranger kept',
        merged.characters[0].aliases, ['Stranger']);
}

// ═══════════════════════════════════════════════════════════════════════
// 7. Multi-entry same batch: reveal + continuation both resolve to one
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Merge: reveal + stale-name reference in same batch ──');
{
    const prev = {
        characters: [
            { name: 'Stranger', innerThought: 'old', role: 'masked woman', aliases: [] }
        ]
    };
    // Model emits BOTH a reveal AND a stale "Stranger" reference in one delta.
    // Must collapse to a single Jenna entry.
    const delta = {
        characters: [
            { name: 'Jenna', aliases: ['Stranger'], innerThought: 'the reveal' },
            { name: 'Stranger', innerThought: 'leftover old-name emission' }
        ]
    };
    const merged = mergeDelta(prev, delta);
    assertEq('collapsed to single character', merged.characters.length, 1);
    assertEq('canonical name is Jenna', merged.characters[0].name, 'Jenna');
    assertEq('Stranger is in aliases', merged.characters[0].aliases, ['Stranger']);
    // Second delta entry's innerThought overwrites the first (last write wins)
    assertEq('later alias-match delta data wins',
        merged.characters[0].innerThought, 'leftover old-name emission');
}
{
    // Reverse order: stale-name reference THEN reveal
    const prev = {
        characters: [
            { name: 'Stranger', innerThought: 'old', role: 'masked woman', aliases: [] }
        ]
    };
    const delta = {
        characters: [
            { name: 'Stranger', innerThought: 'stale first' },
            { name: 'Jenna', aliases: ['Stranger'], innerThought: 'reveal second' }
        ]
    };
    const merged = mergeDelta(prev, delta);
    assertEq('collapsed to single character (reverse order)', merged.characters.length, 1);
    assertEq('canonical is Jenna (reveal wins)', merged.characters[0].name, 'Jenna');
    assertEq('Stranger is in aliases', merged.characters[0].aliases, ['Stranger']);
}

// ═══════════════════════════════════════════════════════════════════════
// 8. reconcileIdentityAliases: relationships renamed after reveal
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── reconcileIdentityAliases: relationships ──');
{
    const snap = {
        characters: [
            { name: 'Jenna', aliases: ['Stranger'], role: 'friend' }
        ],
        relationships: [
            { name: 'Stranger', affection: 30, trust: 20 }
        ],
        charactersPresent: ['Stranger']
    };
    reconcileIdentityAliases(snap);
    assertEq('relationship renamed to canonical',
        snap.relationships[0].name, 'Jenna');
    assertEq('affection preserved', snap.relationships[0].affection, 30);
    assertEq('charactersPresent renamed',
        snap.charactersPresent, ['Jenna']);
}

// ═══════════════════════════════════════════════════════════════════════
// 9. reconcileIdentityAliases: duplicate relationships merged
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── reconcileIdentityAliases: duplicate relationship merge ──');
{
    const snap = {
        characters: [
            { name: 'Jenna', aliases: ['Stranger'] }
        ],
        relationships: [
            { name: 'Jenna', affection: 0, trust: 50 },
            { name: 'Stranger', affection: 30, trust: 0 }
        ],
        charactersPresent: ['Jenna', 'Stranger']
    };
    reconcileIdentityAliases(snap);
    assertEq('duplicate relationships merged to 1', snap.relationships.length, 1);
    assertEq('canonical name Jenna', snap.relationships[0].name, 'Jenna');
    // trust=50 was non-zero in the first entry, kept
    assertEq('first entry trust preserved', snap.relationships[0].trust, 50);
    // affection=0 in first entry, affection=30 in Stranger — Stranger's wins (non-zero)
    assertEq('second entry affection merged (non-zero wins)',
        snap.relationships[0].affection, 30);
    assertEq('charactersPresent deduped to 1 entry',
        snap.charactersPresent, ['Jenna']);
}

// ═══════════════════════════════════════════════════════════════════════
// 10. Regression: characters without aliases pass through unchanged
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Merge: no-aliases regression ──');
{
    const prev = {
        characters: [
            { name: 'Bob', role: 'rival', aliases: [] },
            { name: 'Carol', role: 'ally', aliases: [] }
        ]
    };
    const delta = {
        characters: [
            { name: 'Bob', role: 'rival-turned-ally' }
        ]
    };
    const merged = mergeDelta(prev, delta);
    assertEq('2 characters preserved', merged.characters.length, 2);
    assertEq('Bob role updated', merged.characters.find(c => c.name === 'Bob').role,
        'rival-turned-ally');
    assertEq('Carol preserved unchanged', merged.characters.find(c => c.name === 'Carol').role,
        'ally');
    assertFalse('no aliases on Bob',
        Array.isArray(merged.characters.find(c => c.name === 'Bob').aliases) &&
        merged.characters.find(c => c.name === 'Bob').aliases.length > 0);
}

// ═══════════════════════════════════════════════════════════════════════
// 11. New character with aliases already set (e.g. a fresh reveal where
//     the model emits the aliases on first entry)
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Merge: new character with aliases pre-set ──');
{
    const prev = { characters: [] };
    const delta = {
        characters: [
            { name: 'Jenna', aliases: ['Stranger'], role: 'friend' }
        ]
    };
    const merged = mergeDelta(prev, delta);
    assertEq('new character added', merged.characters.length, 1);
    assertEq('aliases preserved from delta',
        merged.characters[0].aliases, ['Stranger']);
}

// ═══════════════════════════════════════════════════════════════════════
// 12. New character without aliases defaults to empty array
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Merge: new character without aliases gets [] ──');
{
    const prev = { characters: [] };
    const delta = {
        characters: [
            { name: 'Jenna', role: 'friend' }
        ]
    };
    const merged = mergeDelta(prev, delta);
    assertEq('new character has empty aliases',
        merged.characters[0].aliases, []);
}

// ═══════════════════════════════════════════════════════════════════════
// 13. Quest merge is unaffected (aliases logic only applies to characters)
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Merge: quests unaffected ──');
{
    const prev = {
        mainQuests: [
            { name: 'Find the key', urgency: 'high', detail: 'old' }
        ]
    };
    const delta = {
        mainQuests: [
            { name: 'Find the key', urgency: 'critical' }
        ]
    };
    const merged = mergeDelta(prev, delta);
    assertEq('quest count unchanged', merged.mainQuests.length, 1);
    assertEq('urgency updated', merged.mainQuests[0].urgency, 'critical');
    assertEq('detail carried forward', merged.mainQuests[0].detail, 'old');
}

// ═══════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('character-aliases — ' + (pass + fail) + ' cases');
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
