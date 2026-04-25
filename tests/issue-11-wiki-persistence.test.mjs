// tests/issue-11-wiki-persistence.test.mjs — v6.12.4
//
// Regression tests for issue #11 ("Character Wiki not compiling
// previous characters" + "characters get deleted occasionally
// mid-scene"). Three scenarios:
//
//   1. Pipeline non-delta path preserves off-scene characters from
//      the previous snapshot when the LLM returns only present chars.
//      (Was: every periodic forced refresh silently dropped the
//      off-scene roster.)
//
//   2. Cumulative wiki roster — characters present in older snapshots
//      but missing from the latest snap are still surfaced via
//      character-history walk + per-snapshot freshest-data lookup.
//
//   3. renderExisting backfill — replaying N tracker blocks via
//      mergeDelta produces the union of all introduced characters
//      in the final snapshot, so character-history sees the full
//      historical roster.
//
// Run from project root: node tests/issue-11-wiki-persistence.test.mjs

// ─── Stubs ────────────────────────────────────────────────────────────
// Shared context — getContext must return the SAME instance each call so
// snapshot writes via chatMetadata are visible to subsequent reads.
const _stCtx = {
    name1: 'Alex',
    name2: 'Jenna',
    characters: [],
    groups: [],
    groupId: null,
    selected_group: null,
    chatMetadata: { scenepulse: { snapshots: {} } },
    extensionSettings: { scenepulse: {} },
    saveMetadata: () => {},
    saveSettingsDebounced: () => {},
};
globalThis.SillyTavern = {
    getContext: () => _stCtx,
};
globalThis.toastr = { error: () => {}, warning: () => {}, info: () => {}, success: () => {} };
if (typeof document === 'undefined') {
    globalThis.document = { createElement: () => ({ style: {} }), body: { appendChild: () => {} } };
}

const { mergeDelta } = await import('../src/generation/delta-merge.js');
const { getCharacterHistory, invalidateCharacterHistory } = await import('../src/ui/character-history.js');

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

// Inline copy of the pipeline non-delta preservation block (pipeline.js
// imports state/ui modules that don't load cleanly outside ST). The
// test verifies the algorithm itself, not the surrounding plumbing.
function preserveOffScene(extracted, prevSnap) {
    if (!prevSnap) return extracted;
    for (const k of ['characters', 'relationships']) {
        if (Array.isArray(extracted[k]) && Array.isArray(prevSnap[k])) {
            const newNames = new Set(extracted[k].map(e => (e.name || '').toLowerCase().trim()));
            for (const prev of prevSnap[k]) {
                const pn = (prev.name || '').toLowerCase().trim();
                if (pn && !newNames.has(pn)) {
                    extracted[k].push(JSON.parse(JSON.stringify(prev)));
                }
            }
        }
    }
    return extracted;
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('issue #11 — wiki persistence + cumulative roster');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// ═══════════════════════════════════════════════════════════════════════
// 1. Pipeline non-delta preservation
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 1: pipeline non-delta preservation ──');
{
    const prev = {
        charactersPresent: ['Alice', 'Bob', 'Carol'],
        characters: [
            { name: 'Alice', role: 'Boss', innerThought: 'Busy.', hair: 'red' },
            { name: 'Bob', role: 'Intern', innerThought: 'Confused.', hair: 'blond' },
            { name: 'Carol', role: 'Customer', innerThought: 'Annoyed.', hair: 'black' },
        ],
        relationships: [
            { name: 'Alice', affection: 50, trust: 60 },
            { name: 'Bob', affection: 30, trust: 40 },
            { name: 'Carol', affection: 10, trust: 20 },
        ],
    };
    // LLM emits a periodic full-state response showing only Alice
    // (Bob and Carol left the scene this turn).
    const extracted = {
        charactersPresent: ['Alice'],
        characters: [
            { name: 'Alice', role: 'Boss', innerThought: 'Focused.', hair: 'red' },
        ],
        relationships: [
            { name: 'Alice', affection: 55, trust: 65 },
        ],
    };

    const result = preserveOffScene(extracted, prev);

    assertEq('chars roster size after preservation', result.characters.length, 3);
    assertEq('Alice updated to new thought', result.characters.find(c => c.name === 'Alice').innerThought, 'Focused.');
    assertEq('Bob preserved with full data', result.characters.find(c => c.name === 'Bob').innerThought, 'Confused.');
    assertEq('Carol preserved with full data', result.characters.find(c => c.name === 'Carol').innerThought, 'Annoyed.');
    assertEq('Alice meters updated', result.relationships.find(r => r.name === 'Alice').affection, 55);
    assertEq('Bob meters preserved', result.relationships.find(r => r.name === 'Bob').affection, 30);
    assertEq('Carol meters preserved', result.relationships.find(r => r.name === 'Carol').affection, 10);
    assertEq('charactersPresent reflects this turn only', result.charactersPresent, ['Alice']);
}

// ═══════════════════════════════════════════════════════════════════════
// 2. Cumulative wiki roster via character-history walk
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 2: cumulative wiki roster ──');
{
    // Simulate three snapshots where characters drift in and out.
    // Snap 0: Alice introduced
    // Snap 1: Alice + Bob present
    // Snap 2: Only Carol present (Alice + Bob fell out of latest characters[])
    //         — this is the bug scenario: pre-fix, Alice/Bob would never
    //         show in the wiki because latest.characters=[Carol].
    const ctx = SillyTavern.getContext();
    ctx.chatMetadata.scenepulse = { snapshots: {} };
    ctx.chatMetadata.scenepulse.snapshots = {
        '0': {
            charactersPresent: ['Alice'],
            characters: [{ name: 'Alice', role: 'Boss', hair: 'red' }],
            location: 'Office',
        },
        '1': {
            charactersPresent: ['Alice', 'Bob'],
            characters: [
                { name: 'Alice', role: 'Boss', hair: 'red' },
                { name: 'Bob', role: 'Intern', hair: 'blond' },
            ],
            location: 'Cafe',
        },
        '2': {
            charactersPresent: ['Carol'],
            // Latest only contains Carol — Alice/Bob fell out.
            characters: [{ name: 'Carol', role: 'Customer', hair: 'black' }],
            location: 'Park',
        },
    };

    invalidateCharacterHistory();
    const meta = getCharacterHistory();

    assertEq('history has 3 distinct characters', meta.size, 3);
    assertTrue('Alice in history', meta.has('alice'));
    assertTrue('Bob in history', meta.has('bob'));
    assertTrue('Carol in history', meta.has('carol'));
    assertEq('Alice firstSeen=0', meta.get('alice').firstSeen, 0);
    assertEq('Alice lastSeen=1 (last present)', meta.get('alice').lastSeen, 1);
    assertEq('Alice appearances=2', meta.get('alice').appearances, 2);
    assertEq('Carol firstSeen=2', meta.get('carol').firstSeen, 2);

    // Now exercise the wiki's freshest-data lookup. For each canonical
    // name the wiki walks snapshots newest-first and returns the first
    // character entry matching by name or alias.
    const snapKeys = Object.keys(ctx.chatMetadata.scenepulse.snapshots).map(Number).sort((a, b) => a - b);
    const findLatest = (kind, aliasesLow) => {
        for (let i = snapKeys.length - 1; i >= 0; i--) {
            const snap = ctx.chatMetadata.scenepulse.snapshots[String(snapKeys[i])];
            const arr = snap && Array.isArray(snap[kind]) ? snap[kind] : null;
            if (!arr) continue;
            for (const item of arr) {
                const nm = (item?.name || '').toLowerCase().trim();
                if (nm && aliasesLow.has(nm)) return item;
            }
        }
        return null;
    };

    const aliceEntry = findLatest('characters', meta.get('alice').aliasesLow);
    const bobEntry = findLatest('characters', meta.get('bob').aliasesLow);
    const carolEntry = findLatest('characters', meta.get('carol').aliasesLow);

    assertTrue('wiki: Alice resurfaces from older snap', !!aliceEntry);
    assertEq('wiki: Alice data from snap 1 (her last appearance)', aliceEntry.role, 'Boss');
    assertTrue('wiki: Bob resurfaces from older snap', !!bobEntry);
    assertEq('wiki: Bob data from snap 1', bobEntry.role, 'Intern');
    assertTrue('wiki: Carol comes from latest', !!carolEntry);
    assertEq('wiki: Carol data from snap 2', carolEntry.role, 'Customer');
}

// ═══════════════════════════════════════════════════════════════════════
// 3. renderExisting backfill replay
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 3: renderExisting chronological replay ──');
{
    // Simulate three AI messages each containing an inline tracker block.
    // The user enables ScenePulse mid-chat; the recovery path walks all
    // messages chronologically and replays via mergeDelta.
    //
    // Pre-fix: only ONE snapshot was recovered (the last) — Alice/Bob
    // never made it into character-history.
    // Post-fix: each block becomes a snapshot, mergedSoFar accumulates,
    // and the final state contains the union of all characters.
    const m0 = {
        charactersPresent: ['Alice'],
        characters: [{ name: 'Alice', role: 'Boss', innerThought: 'Welcome.' }],
        relationships: [{ name: 'Alice', affection: 10 }],
        mainQuests: [], sideQuests: [], plotBranches: [],
    };
    const d1 = {
        charactersPresent: ['Alice', 'Bob'],
        characters: [
            { name: 'Alice', role: 'Boss', innerThought: 'Acknowledging Bob.' },
            { name: 'Bob', role: 'Intern', innerThought: 'Nervous.' },
        ],
        relationships: [
            { name: 'Alice', affection: 15 },
            { name: 'Bob', affection: 20 },
        ],
    };
    const d2 = {
        charactersPresent: ['Carol'],
        characters: [{ name: 'Carol', role: 'Customer', innerThought: 'Browsing.' }],
        relationships: [{ name: 'Carol', affection: 5 }],
    };

    let mergedSoFar = null;
    const snapshots = {};
    for (const [idx, payload] of [[0, m0], [1, d1], [2, d2]]) {
        const merged = mergedSoFar ? mergeDelta(mergedSoFar, payload) : payload;
        snapshots[String(idx)] = merged;
        mergedSoFar = merged;
    }

    assertEq('backfill produced 3 snapshots', Object.keys(snapshots).length, 3);
    const finalSnap = snapshots['2'];
    const finalNames = (finalSnap.characters || []).map(c => c.name).sort();
    assertEq('final snap contains all three characters', finalNames, ['Alice', 'Bob', 'Carol']);
    assertEq('Alice retained latest thought from d1', finalSnap.characters.find(c => c.name === 'Alice').innerThought, 'Acknowledging Bob.');
    assertEq('Bob preserved from d1', finalSnap.characters.find(c => c.name === 'Bob').innerThought, 'Nervous.');
    assertEq('Carol added in d2', finalSnap.characters.find(c => c.name === 'Carol').innerThought, 'Browsing.');
    assertEq('charactersPresent reflects last turn only', finalSnap.charactersPresent, ['Carol']);

    // Wire the snapshots into ST context and verify character-history
    // builds a complete cumulative roster post-backfill.
    const ctx = SillyTavern.getContext();
    ctx.chatMetadata.scenepulse = { snapshots: {} };
    ctx.chatMetadata.scenepulse.snapshots = snapshots;
    invalidateCharacterHistory();
    const meta = getCharacterHistory();
    assertEq('post-backfill history has 3 chars', meta.size, 3);
    assertEq('Alice firstSeen=0', meta.get('alice').firstSeen, 0);
    assertEq('Bob firstSeen=1', meta.get('bob').firstSeen, 1);
    assertEq('Carol firstSeen=2', meta.get('carol').firstSeen, 2);
}

// ═══════════════════════════════════════════════════════════════════════
// 4. Alias-aware freshest-data lookup
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 4: alias-aware lookup (Stranger → Jenna reveal) ──');
{
    // Snap 0: Stranger appears
    // Snap 1: Reveal — same character now known as "Jenna" with aliases=["Stranger"]
    // Snap 2: Solo beat, Jenna not present
    // Wiki should still show Jenna with snap 1 data.
    const ctx = SillyTavern.getContext();
    ctx.chatMetadata.scenepulse = { snapshots: {} };
    ctx.chatMetadata.scenepulse.snapshots = {
        '0': {
            charactersPresent: ['Stranger'],
            characters: [{ name: 'Stranger', role: 'Mysterious figure', hair: 'hooded' }],
        },
        '1': {
            charactersPresent: ['Jenna'],
            characters: [{ name: 'Jenna', role: 'Nurse', hair: 'red', aliases: ['Stranger'] }],
        },
        '2': {
            charactersPresent: [],
            characters: [{ name: 'Jenna', role: 'Nurse', hair: 'red', aliases: ['Stranger'] }],
        },
    };

    invalidateCharacterHistory();
    const meta = getCharacterHistory();

    assertEq('alias collapsed: 1 history entry', meta.size, 1);
    assertTrue('history keyed by Jenna canonical', meta.has('jenna'));
    const jennaMeta = meta.get('jenna');
    assertTrue('aliasesLow contains stranger', jennaMeta.aliasesLow.has('stranger'));
    assertTrue('aliasesLow contains jenna', jennaMeta.aliasesLow.has('jenna'));
    assertEq('Jenna firstSeen=0 (when she was Stranger)', jennaMeta.firstSeen, 0);
    assertEq('Jenna canonical reflects latest name', jennaMeta.canonical, 'Jenna');
}

// ─── Summary ──────────────────────────────────────────────────────────
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`${fail === 0 ? 'PASS' : 'FAIL'} ${pass}/${pass + fail}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
if (fail > 0) {
    for (const f of failures) console.log('  - ' + f.name + '\n      expected: ' + f.expected + '\n      got:      ' + f.actual);
    process.exit(1);
}
