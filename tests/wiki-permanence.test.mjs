// tests/wiki-permanence.test.mjs — v6.22.1
//
// Verifies the v6.22.1 wiki permanence guarantee: every character ever
// observed in the chat must remain visible in the Character Wiki, even
// after snapshot pruning, model omission, or delta-merge replacement.
//
// Three-tier fallback the wiki uses:
//   1. _findLatest(snapshots) — current behavior, walks live snapshots
//   2. _findArchived(_spArchive) — append-only archive maintained on save
//   3. _spStub from history meta — bare-bones synthesis (always works)
//
// This test focuses on the SETTINGS / archive layer (the wiki UI render
// is not testable in node, but the data the UI reads is).

const _ctx = {
    name1: 'Alex', name2: 'Jenna',
    characters: [], groups: [], groupId: null, selected_group: null,
    chatMetadata: { scenepulse: { snapshots: {} } },
    extensionSettings: { scenepulse: {} },
    saveMetadata: () => {}, saveSettingsDebounced: () => {},
};
globalThis.SillyTavern = { getContext: () => _ctx };
globalThis.toastr = { error: () => {}, warning: () => {}, info: () => {}, success: () => {} };
if (typeof document === 'undefined') {
    globalThis.document = { createElement: () => ({ style: {} }), body: { appendChild: () => {} }, querySelector: () => null, querySelectorAll: () => [] };
}
if (typeof localStorage === 'undefined') {
    globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
}

const { saveSnapshot, getWikiArchive, getTrackerData } = await import('../src/settings.js');

let pass = 0, fail = 0;
const failures = [];
function assertEq(name, actual, expected) {
    const a = JSON.stringify(actual), e = JSON.stringify(expected);
    if (a === e) { pass++; console.log('  OK   ' + name); }
    else { fail++; failures.push({ name, actual: a, expected: e }); console.log('  FAIL ' + name + ' — expected ' + e + ', got ' + a); }
}
function assertTrue(name, v) { if (v) { pass++; console.log('  OK   ' + name); } else { fail++; failures.push({ name, actual: v, expected: true }); console.log('  FAIL ' + name); } }

function _resetChat() {
    _ctx.chatMetadata = { scenepulse: { snapshots: {}, _spActiveTasksMigrated: true, _spQuestDedupMigrated: true, _spUserStripMigrated: true, _spWikiArchiveBackfilled: true } };
}

function _snapWith(characters, relationships = []) {
    return { time: '12:00', date: '01/01/2026', elapsed: '0m',
        location: 'Test', weather: '', temperature: '',
        characters, relationships, charactersPresent: characters.map(c => c.name),
    };
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Wiki Permanence — v6.22.1 archive + stub fallback');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// ═══════════════════════════════════════════════════════════════════════
// 1. Archive captures characters on save
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Archive capture on save ──');
{
    _resetChat();
    saveSnapshot(0, _snapWith([{ name: 'Karen', role: 'neighbor', aliases: [] }]));
    const arc = getWikiArchive();
    assertTrue('archive has Karen', !!arc.characters['karen']);
    assertEq('Karen role preserved', arc.characters['karen'].role, 'neighbor');
}

// ═══════════════════════════════════════════════════════════════════════
// 2. Latest write wins
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Latest write wins in archive ──');
{
    _resetChat();
    saveSnapshot(0, _snapWith([{ name: 'Karen', role: 'neighbor' }]));
    saveSnapshot(1, _snapWith([{ name: 'Karen', role: 'friend' }]));
    const arc = getWikiArchive();
    assertEq('Karen role updated to friend', arc.characters['karen'].role, 'friend');
}

// ═══════════════════════════════════════════════════════════════════════
// 3. Aliases are indexed
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Aliases indexed in archive ──');
{
    _resetChat();
    saveSnapshot(0, _snapWith([{ name: 'Stranger', role: '?' }]));
    saveSnapshot(1, _snapWith([{ name: 'Karen', role: 'neighbor', aliases: ['Stranger'] }]));
    const arc = getWikiArchive();
    assertTrue('Karen entry exists', !!arc.characters['karen']);
    assertTrue('Stranger alias points to same entry', arc.characters['stranger'] === arc.characters['karen']
        || (arc.characters['stranger'] && arc.characters['stranger'].name === 'Karen'));
}

// ═══════════════════════════════════════════════════════════════════════
// 4. Character pruned from snapshots survives in archive (the core promise)
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Character pruned from all snapshots survives in archive ──');
{
    _resetChat();
    // Snap 0 has Karen; snap 1 has Devon only (model omitted Karen)
    saveSnapshot(0, _snapWith([{ name: 'Karen', role: 'neighbor' }]));
    saveSnapshot(1, _snapWith([{ name: 'Devon', role: 'protagonist' }]));
    const arc = getWikiArchive();
    assertTrue('Karen still in archive', !!arc.characters['karen']);
    assertTrue('Devon also in archive', !!arc.characters['devon']);
    // And confirm snap 1 doesn't contain Karen — proves the archive is the
    // ONLY thing keeping her alive.
    const data = getTrackerData();
    const snap1 = data.snapshots['1'];
    const karenInSnap1 = (snap1.characters || []).some(c => (c.name || '').toLowerCase() === 'karen');
    assertEq('Karen NOT in snap 1 characters[]', karenInSnap1, false);
    assertTrue('Karen IS in archive (the wiki will fall back to this)',
        !!arc.characters['karen']);
}

// ═══════════════════════════════════════════════════════════════════════
// 5. Pruning by maxSnapshots doesn't lose characters
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── maxSnapshots pruning preserves archive ──');
{
    _resetChat();
    _ctx.extensionSettings.scenepulse.maxSnapshots = 2;
    saveSnapshot(0, _snapWith([{ name: 'Karen', role: 'neighbor' }]));
    saveSnapshot(1, _snapWith([{ name: 'Devon', role: 'protagonist' }]));
    saveSnapshot(2, _snapWith([{ name: 'Jenna', role: 'partner' }]));
    saveSnapshot(3, _snapWith([{ name: 'Buzzcut', role: 'cop' }]));
    // Snap 0 + 1 should be pruned; snap 2 + 3 remain
    const data = getTrackerData();
    const remainingKeys = Object.keys(data.snapshots).sort();
    assertEq('Only 2 snapshots remain', remainingKeys.length, 2);
    // Archive must still know all 4 characters
    const arc = getWikiArchive();
    assertTrue('Karen survived prune', !!arc.characters['karen']);
    assertTrue('Devon survived prune', !!arc.characters['devon']);
    assertTrue('Jenna survived prune', !!arc.characters['jenna']);
    assertTrue('Buzzcut survived prune', !!arc.characters['buzzcut']);
    _ctx.extensionSettings.scenepulse.maxSnapshots = 0; // reset
}

// ═══════════════════════════════════════════════════════════════════════
// 6. Relationships also archived
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Relationships also archived ──');
{
    _resetChat();
    saveSnapshot(0, _snapWith(
        [{ name: 'Karen', role: 'neighbor' }],
        [{ name: 'Karen', relType: 'Co-worker', affection: 50, trust: 60 }]
    ));
    saveSnapshot(1, _snapWith(
        [{ name: 'Devon', role: 'protagonist' }],
        [{ name: 'Devon', relType: 'Partner', affection: 80, trust: 90 }]
    ));
    const arc = getWikiArchive();
    assertTrue('Karen relationship in archive', !!arc.relationships['karen']);
    assertTrue('Devon relationship in archive', !!arc.relationships['devon']);
    assertEq('Karen relType preserved', arc.relationships['karen'].relType, 'Co-worker');
    assertEq('Devon relType preserved', arc.relationships['devon'].relType, 'Partner');
}

// ═══════════════════════════════════════════════════════════════════════
// 7. Backfill from existing snapshots when archive is missing
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Backfill from existing snapshots ──');
{
    _resetChat();
    // Manually populate snapshots WITHOUT archive (simulating a chat from
    // a pre-v6.22.1 install). Don't go through saveSnapshot.
    _ctx.chatMetadata.scenepulse.snapshots = {
        '0': _snapWith([{ name: 'Karen', role: 'neighbor' }]),
        '1': _snapWith([{ name: 'Devon', role: 'protagonist' }]),
    };
    _ctx.chatMetadata.scenepulse._spWikiArchiveBackfilled = false;
    delete _ctx.chatMetadata.scenepulse._spArchive;
    // First call to getTrackerData triggers backfill
    getTrackerData();
    const arc = getWikiArchive();
    assertTrue('Backfill captured Karen', !!arc.characters['karen']);
    assertTrue('Backfill captured Devon', !!arc.characters['devon']);
    assertEq('Backfill flag set', _ctx.chatMetadata.scenepulse._spWikiArchiveBackfilled, true);
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const total = pass + fail;
if (fail === 0) console.log(`PASS ${pass}/${total}`);
else {
    console.log(`FAIL ${fail}/${total} (${pass} passed)`);
    for (const f of failures) console.log('  - ' + f.name);
    process.exit(1);
}
