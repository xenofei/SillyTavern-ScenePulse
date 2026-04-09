// Manual dev test for v6.8.30 paren-alias canonicalization.
//
// Run from project root: node tests/character-paren-aliases.test.mjs
// Not loaded by the extension — manifest.json only references index.js.
//
// Reproduces the "Officer Jane (The Entity/Lilith)" bug reported in v6.8.29:
// the LLM emitted a character with canonical name "Officer Jane" and aliases
// ["The Entity", "Lilith"] in the characters[] array, but referenced the
// same character as "Officer Jane (The Entity)" in relationships[] and
// "Officer Jane (The Entity/Lilith)" in charactersPresent. The downstream
// filterForView path dropped the real character and built an empty stub
// from the mismatched relationship entry, causing the card to render blank.
//
// v6.8.30 normalization should:
//   1. Strip paren-aliases from the name field itself when they look
//      name-like, folding them into the aliases array.
//   2. Build an alias → canonical map and rewrite relationships[].name +
//      charactersPresent through it.
//   3. Deduplicate relationships after canonicalization (multiple entries
//      may collapse to the same canonical name).
//   4. Leave descriptive parentheticals ("John (the scientist)") alone.

const USER_NAME = 'Alex';

globalThis.SillyTavern = {
    getContext: () => ({
        name1: USER_NAME,
        name2: 'Officer Jane',
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

const { normalizeChar, normalizeTracker, filterForView } = await import('../src/normalize.js');

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
console.log('character-paren-aliases — v6.8.30');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// ═══════════════════════════════════════════════════════════════════════
// 1. normalizeChar strips paren-aliases from the name field
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── normalizeChar: paren-alias split ──');
{
    const ch = normalizeChar({ name: 'Officer Jane (The Entity)' });
    assertEq('single paren alias: name stripped', ch.name, 'Officer Jane');
    assertEq('single paren alias: folded into aliases', ch.aliases, ['The Entity']);
}
{
    const ch = normalizeChar({ name: 'Officer Jane (The Entity/Lilith)' });
    assertEq('slash-separated: name stripped', ch.name, 'Officer Jane');
    assertEq('slash-separated: both aliases folded', ch.aliases, ['The Entity', 'Lilith']);
}
{
    const ch = normalizeChar({ name: 'Officer Jane (The Entity, Lilith)' });
    assertEq('comma-separated: name stripped', ch.name, 'Officer Jane');
    assertEq('comma-separated: both aliases folded', ch.aliases, ['The Entity', 'Lilith']);
}
{
    const ch = normalizeChar({ name: 'Officer Jane (The Entity; Lilith)' });
    assertEq('semicolon-separated: name stripped', ch.name, 'Officer Jane');
    assertEq('semicolon-separated: both aliases folded', ch.aliases, ['The Entity', 'Lilith']);
}
{
    const ch = normalizeChar({ name: 'Officer Jane (The Entity)', aliases: ['Lilith'] });
    assertEq('preserves existing aliases + adds paren ones',
        ch.aliases.sort(), ['Lilith', 'The Entity'].sort());
    assertEq('name stripped even with existing aliases', ch.name, 'Officer Jane');
}
{
    const ch = normalizeChar({ name: 'Jenna' });
    assertEq('no parens: name unchanged', ch.name, 'Jenna');
    assertEq('no parens: aliases empty', ch.aliases, []);
}

// ═══════════════════════════════════════════════════════════════════════
// 2. normalizeChar leaves descriptive parentheticals alone
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── normalizeChar: descriptive parens preserved ──');
{
    // Contains sentence-ending punctuation — likely prose, not alias list
    const ch = normalizeChar({ name: 'John (the scientist who studied black holes.)' });
    assertEq('sentence punctuation: paren preserved',
        ch.name, 'John (the scientist who studied black holes.)');
    assertEq('sentence punctuation: aliases empty', ch.aliases, []);
}
{
    // Contains possessive — likely descriptive phrase
    const ch = normalizeChar({ name: "Mark (Jenna's brother)" });
    assertEq("possessive 's: paren preserved", ch.name, "Mark (Jenna's brother)");
    assertEq("possessive 's: aliases empty", ch.aliases, []);
}
{
    // Very long parenthetical — likely description
    const ch = normalizeChar({ name: 'Alex (a young aspiring musician with ambitions beyond measure who left town)' });
    assertTrue('long descriptive paren preserved in name', ch.name.includes('('));
}

// ═══════════════════════════════════════════════════════════════════════
// 3. normalizeTracker canonicalizes cross-array references
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── normalizeTracker: cross-array canonicalization ──');
{
    const d = {
        time: '12:00',
        date: '01/01/2026',
        characters: [
            {
                name: 'Officer Jane',
                aliases: ['The Entity', 'Lilith'],
                role: 'Police officer',
                innerThought: 'This is wild.',
            },
        ],
        relationships: [
            { name: 'Officer Jane (The Entity)', relType: 'Eternal Mates', affection: 95 },
            { name: 'Officer Jane (The Entity/Lilith)', relType: 'Eternal Mates', affection: 100 },
        ],
        charactersPresent: ['Officer Jane (The Entity/Lilith)'],
    };
    const norm = normalizeTracker(d);
    assertEq('characters unchanged (already canonical)', norm.characters.length, 1);
    assertEq('character name canonical', norm.characters[0].name, 'Officer Jane');
    // Relationships: both entries should collapse to canonical name
    assertEq('relationships canonicalized + deduped', norm.relationships.length, 1);
    assertEq('relationship name canonical', norm.relationships[0].name, 'Officer Jane');
    // Affection: merged from both entries (non-zero wins on collision)
    assertTrue('relationship affection preserved (>= 95)', norm.relationships[0].affection >= 95);
    // charactersPresent rewritten
    assertEq('charactersPresent canonicalized', norm.charactersPresent, ['Officer Jane']);
}

// ═══════════════════════════════════════════════════════════════════════
// 4. filterForView now keeps the real character and its data
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── filterForView: real character survives after canonicalization ──');
{
    const d = {
        time: '12:00',
        date: '01/01/2026',
        characters: [
            {
                name: 'Officer Jane',
                aliases: ['The Entity', 'Lilith'],
                role: 'Police officer turned divine vessel',
                innerThought: 'He remembers.',
                hair: 'Black, jaw-length',
            },
        ],
        relationships: [
            { name: 'Officer Jane (The Entity/Lilith)', relType: 'Eternal Mates', affection: 100, trust: 95 },
        ],
        charactersPresent: ['Officer Jane (The Entity/Lilith)'],
    };
    const norm = normalizeTracker(d);
    const view = filterForView(norm);
    assertEq('view has exactly 1 character', view.characters.length, 1);
    assertEq('view character is canonical Officer Jane', view.characters[0].name, 'Officer Jane');
    // Critical: the FULL data survives, not a stub
    assertEq('view character has role', view.characters[0].role, 'Police officer turned divine vessel');
    assertEq('view character has innerThought', view.characters[0].innerThought, 'He remembers.');
    assertEq('view character has hair', view.characters[0].hair, 'Black, jaw-length');
}

// ═══════════════════════════════════════════════════════════════════════
// 5. normalizeChar handles the same pattern on the character entry itself
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── normalizeTracker: character with paren-name gets split ──');
{
    const d = {
        time: '12:00',
        date: '01/01/2026',
        characters: [
            {
                name: 'Officer Jane (The Entity/Lilith)',
                role: 'Vessel of reborn Lilith',
                innerThought: 'My Adam.',
            },
        ],
        relationships: [
            { name: 'Officer Jane', relType: 'Eternal Mates', affection: 100 },
        ],
        charactersPresent: ['Officer Jane'],
    };
    const norm = normalizeTracker(d);
    assertEq('one character', norm.characters.length, 1);
    assertEq('character name stripped to canonical', norm.characters[0].name, 'Officer Jane');
    assertEq('character aliases populated from name',
        norm.characters[0].aliases.sort(), ['Lilith', 'The Entity'].sort());
    assertEq('role preserved', norm.characters[0].role, 'Vessel of reborn Lilith');
}

// ═══════════════════════════════════════════════════════════════════════
// 6. Regression: normal character emission still works unchanged
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Regression: no-parens characters unaffected ──');
{
    const d = {
        time: '12:00',
        date: '01/01/2026',
        characters: [
            { name: 'Jenna', role: 'friend', innerThought: 'hi' },
            { name: 'Marcus', role: 'brother', innerThought: 'hmm' },
        ],
        relationships: [
            { name: 'Jenna', affection: 75, trust: 60 },
            { name: 'Marcus', affection: 50, trust: 80 },
        ],
        charactersPresent: ['Jenna', 'Marcus'],
    };
    const norm = normalizeTracker(d);
    assertEq('two characters preserved', norm.characters.length, 2);
    assertEq('two relationships preserved', norm.relationships.length, 2);
    assertEq('two charactersPresent preserved', norm.charactersPresent.length, 2);
    const view = filterForView(norm);
    assertEq('view has two characters', view.characters.length, 2);
}

// ═══════════════════════════════════════════════════════════════════════
// 7. Reverse case: characters have paren names, relationships don't
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Reverse: char has parens, rel uses canonical ──');
{
    const d = {
        time: '12:00',
        date: '01/01/2026',
        characters: [
            { name: 'Jane (Lilith)', role: 'officer' },
        ],
        relationships: [
            { name: 'Lilith', affection: 80 },
        ],
        charactersPresent: ['Jane'],
    };
    const norm = normalizeTracker(d);
    assertEq('character canonical is Jane', norm.characters[0].name, 'Jane');
    assertEq('character aliases contain Lilith', norm.characters[0].aliases, ['Lilith']);
    // Relationship referenced by alias — should resolve to canonical
    assertEq('relationship resolved via alias', norm.relationships[0].name, 'Jane');
}

// ═══════════════════════════════════════════════════════════════════════
// 8. Multiple canonicalization collisions in relationships
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Collision merge: non-zero meters win ──');
{
    const d = {
        time: '12:00',
        date: '01/01/2026',
        characters: [
            { name: 'Jane', aliases: ['Lilith', 'The Entity'] },
        ],
        relationships: [
            { name: 'Jane', affection: 0, trust: 50 },
            { name: 'Lilith', affection: 90, trust: 0 },
            { name: 'Jane (The Entity)', affection: 0, trust: 0, desire: 100 },
        ],
        charactersPresent: ['Jane'],
    };
    const norm = normalizeTracker(d);
    assertEq('three entries collapsed to 1', norm.relationships.length, 1);
    assertEq('merged name is canonical', norm.relationships[0].name, 'Jane');
    assertEq('non-zero affection won', norm.relationships[0].affection, 90);
    assertEq('non-zero trust preserved', norm.relationships[0].trust, 50);
    assertEq('non-zero desire preserved', norm.relationships[0].desire, 100);
}

// ═══════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('character-paren-aliases — ' + (pass + fail) + ' cases');
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
