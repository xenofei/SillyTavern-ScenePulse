// tests/issue-8-macros.test.mjs — v6.13.5 (issue #8)
//
// Coverage for the {{sp_*}} macro handlers: empty-snapshot fallback,
// field extraction, list joining, quest tier splits, profile lookup,
// and registration via both the new (ctx.macros) and legacy
// (ctx.registerMacro) APIs. Error containment is verified by stubbing
// a handler to throw and confirming the wrapper returns ''.
//
// Run: node tests/issue-8-macros.test.mjs

// ─── Stubs ─────────────────────────────────────────────────────────────
const _stCtx = {
    name1: 'Alex',
    name2: 'Jenna',
    chatMetadata: { scenepulse: { snapshots: {} } },
    extensionSettings: { scenepulse: {} },
    saveMetadata: () => {},
    saveSettingsDebounced: () => {},
};
globalThis.SillyTavern = { getContext: () => _stCtx };
globalThis.toastr = { error: () => {}, warning: () => {}, info: () => {}, success: () => {} };
if (typeof crypto === 'undefined') {
    globalThis.crypto = { randomUUID: () => 'test-' + Math.random().toString(36).slice(2, 10) };
}
if (typeof document === 'undefined') {
    globalThis.document = { createElement: () => ({ style: {} }), body: { appendChild: () => {} } };
}
if (typeof window === 'undefined') globalThis.window = { addEventListener: () => {}, matchMedia: () => ({ matches: false }) };

const { HANDLERS, registerMacros, _resetForTests } = await import('../src/macros.js');
const settings = await import('../src/settings.js');
const profiles = await import('../src/profiles.js');

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
function assertContains(name, haystack, needle) {
    const ok = typeof haystack === 'string' && haystack.includes(needle);
    if (ok) { pass++; console.log('  OK   ' + name); }
    else {
        fail++;
        failures.push({ name, actual: String(haystack).substring(0, 100), expected: 'includes: ' + needle });
        console.log('  FAIL ' + name + ' — expected to include ' + JSON.stringify(needle));
    }
}

// Inject a snapshot at id 0 so getLatestSnapshot() returns it.
function setSnapshot(snap) {
    _stCtx.chatMetadata.scenepulse.snapshots = { '0': snap };
}
function clearSnapshot() {
    _stCtx.chatMetadata.scenepulse.snapshots = {};
}
function resetAll() {
    _stCtx.extensionSettings.scenepulse = {};
    _stCtx.chatMetadata.scenepulse = { snapshots: {} };
    _resetForTests();
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('issue #8 — custom macros');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// ═══════════════════════════════════════════════════════════════════════
// 1. Empty snapshot — every macro returns '' (or '0' for counts)
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 1: empty snapshot, all macros return safe values ──');
{
    resetAll();
    clearSnapshot();
    const stringMacros = ['sp_location', 'sp_time', 'sp_date', 'sp_mood', 'sp_tension', 'sp_weather', 'sp_topic', 'sp_summary', 'sp_temperature', 'sp_northstar', 'sp_characters', 'sp_relationships', 'sp_quests', 'sp_main_quests', 'sp_side_quests'];
    for (const name of stringMacros) {
        assertEq(name + ' returns empty string', HANDLERS[name](), '');
    }
    assertEq('sp_char_count returns "0"', HANDLERS.sp_char_count(), '0');
    assertEq('sp_quest_count returns "0"', HANDLERS.sp_quest_count(), '0');
}

// ═══════════════════════════════════════════════════════════════════════
// 2. Scene field extraction
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 2: scene field macros ──');
{
    resetAll();
    setSnapshot({
        location: 'Castle Hall',
        time: '7:30 PM',
        date: 'Day 3',
        sceneMood: 'tense',
        sceneTension: 'rising',
        weather: 'thunderstorm',
        sceneTopic: 'Confrontation with the duke',
        sceneSummary: 'Devon enters the throne room.',
        temperature: 'cold',
        northStar: 'Reclaim the throne',
        charactersPresent: ['Devon', 'Duke Aldric'],
        characters: [
            { name: 'Devon', role: 'Hero' },
            { name: 'Duke Aldric', role: 'Antagonist' },
        ],
        relationships: [
            { name: 'Duke Aldric', relType: 'rival', affection: 20 },
        ],
        mainQuests: [{ name: 'Defeat the duke', urgency: 'critical' }],
        sideQuests: [{ name: 'Retrieve the heirloom', urgency: 'high' }],
    });
    assertEq('sp_location', HANDLERS.sp_location(), 'Castle Hall');
    assertEq('sp_time', HANDLERS.sp_time(), '7:30 PM');
    assertEq('sp_date', HANDLERS.sp_date(), 'Day 3');
    assertEq('sp_mood', HANDLERS.sp_mood(), 'tense');
    assertEq('sp_tension', HANDLERS.sp_tension(), 'rising');
    assertEq('sp_weather', HANDLERS.sp_weather(), 'thunderstorm');
    assertEq('sp_topic', HANDLERS.sp_topic(), 'Confrontation with the duke');
    assertEq('sp_summary', HANDLERS.sp_summary(), 'Devon enters the throne room.');
    assertEq('sp_temperature', HANDLERS.sp_temperature(), 'cold');
    assertEq('sp_northstar', HANDLERS.sp_northstar(), 'Reclaim the throne');
}

// ═══════════════════════════════════════════════════════════════════════
// 3. Character + relationship + quest aggregations
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 3: aggregation macros ──');
{
    resetAll();
    setSnapshot({
        charactersPresent: ['Devon', 'Duke Aldric'],
        characters: [
            { name: 'Devon', role: 'Hero' },
            { name: 'Duke Aldric', role: 'Antagonist' },
        ],
        relationships: [
            { name: 'Duke Aldric', relType: 'rival', affection: 20 },
            { name: 'Lyra', relType: 'lover', affection: 80 },
        ],
        mainQuests: [
            { name: 'Defeat the duke', urgency: 'critical' },
            { name: 'Already done', urgency: 'resolved' },
        ],
        sideQuests: [
            { name: 'Retrieve the heirloom', urgency: 'high' },
            { name: 'Find the seer', urgency: 'moderate' },
        ],
    });

    assertEq('sp_characters joins names', HANDLERS.sp_characters(), 'Devon, Duke Aldric');
    assertEq('sp_char_count', HANDLERS.sp_char_count(), '2');

    const rels = HANDLERS.sp_relationships();
    assertContains('sp_relationships includes Duke', rels, 'Duke Aldric (rival, aff:20)');
    assertContains('sp_relationships includes Lyra', rels, 'Lyra (lover, aff:80)');

    assertEq('sp_quests joins both tiers', HANDLERS.sp_quests(), 'Defeat the duke, Retrieve the heirloom, Find the seer');
    assertEq('sp_main_quests excludes resolved', HANDLERS.sp_main_quests(), 'Defeat the duke');
    assertEq('sp_side_quests', HANDLERS.sp_side_quests(), 'Retrieve the heirloom, Find the seer');
    assertEq('sp_quest_count excludes resolved', HANDLERS.sp_quest_count(), '3');
}

// ═══════════════════════════════════════════════════════════════════════
// 4. sp_characters falls back to characters[] when charactersPresent missing
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 4: sp_characters fallback ──');
{
    resetAll();
    setSnapshot({
        characters: [
            { name: 'Alone Wolf', role: 'Solo' },
        ],
    });
    assertEq('falls back to characters[] when no present list', HANDLERS.sp_characters(), 'Alone Wolf');
    assertEq('sp_char_count uses fallback too', HANDLERS.sp_char_count(), '1');
}

// ═══════════════════════════════════════════════════════════════════════
// 5. sp_active_profile reads from profiles
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 5: sp_active_profile ──');
{
    resetAll();
    const s = settings.getSettings();
    profiles.migrateLegacySettingsToProfile(s);
    const pokemon = profiles.createProfile(s, { name: 'Pokemon' });
    profiles.setActiveProfile(s, pokemon.id);

    assertEq('returns active profile name', HANDLERS.sp_active_profile(), 'Pokemon');

    profiles.setActiveProfile(s, s.profiles[0].id);
    assertEq('switches when active changes', HANDLERS.sp_active_profile(), 'Default');
}

// ═══════════════════════════════════════════════════════════════════════
// 6. Live updating: handler re-reads snapshot on each call
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 6: live updates between calls ──');
{
    resetAll();
    setSnapshot({ location: 'Forest', time: '6:00 AM' });
    assertEq('initial location', HANDLERS.sp_location(), 'Forest');
    setSnapshot({ location: 'Cave', time: '6:30 AM' });
    assertEq('updated location reflected on next call', HANDLERS.sp_location(), 'Cave');
    assertEq('updated time too', HANDLERS.sp_time(), '6:30 AM');
}

// ═══════════════════════════════════════════════════════════════════════
// 7. Registration via new API
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 7: register via new ctx.macros API ──');
{
    resetAll();
    const captured = {};
    _stCtx.macros = {
        category: { STATE: 'state' },
        register: (name, def) => { captured[name] = def; },
    };
    registerMacros();
    assertTrue('registered via new API', Object.keys(captured).length >= 18);
    assertEq('first macro has STATE category', captured.sp_location.category, 'state');
    assertTrue('handler is wrapped', typeof captured.sp_location.handler === 'function');
    delete _stCtx.macros;
}

// ═══════════════════════════════════════════════════════════════════════
// 8. Registration via legacy fallback when new API absent
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 8: legacy fallback when new API missing ──');
{
    resetAll();
    const captured = {};
    delete _stCtx.macros;
    _stCtx.registerMacro = (name, handler, desc) => { captured[name] = { handler, desc }; };
    registerMacros();
    assertTrue('registered via legacy API', Object.keys(captured).length >= 18);
    assertContains('description present', captured.sp_location.desc, 'location');
    delete _stCtx.registerMacro;
}

// ═══════════════════════════════════════════════════════════════════════
// 9. Handler errors are caught and return ''
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 9: error containment ──');
{
    resetAll();
    const captured = {};
    _stCtx.macros = {
        category: { STATE: 'state' },
        register: (name, def) => { captured[name] = def; },
    };
    // Inject a throwing handler by overriding HANDLERS, then re-register
    // and confirm the wrapper neutralizes it.
    const originalLocation = HANDLERS.sp_location;
    HANDLERS.sp_location = () => { throw new Error('boom'); };
    registerMacros();
    const wrapped = captured.sp_location?.handler;
    assertTrue('wrapped handler exists', typeof wrapped === 'function');
    assertEq('wrapped handler swallows throw, returns ""', wrapped(), '');
    HANDLERS.sp_location = originalLocation;
    delete _stCtx.macros;
}

// ═══════════════════════════════════════════════════════════════════════
// 10. Both APIs missing — registration warns + bails, no crash
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 10: no API at all ──');
{
    resetAll();
    delete _stCtx.macros;
    delete _stCtx.registerMacro;
    let threw = false;
    try { registerMacros(); } catch { threw = true; }
    assertEq('registration does not throw when APIs absent', threw, false);
}

// ─── Summary ──────────────────────────────────────────────────────────
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`${fail === 0 ? 'PASS' : 'FAIL'} ${pass}/${pass + fail}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
if (fail > 0) {
    for (const f of failures) console.log('  - ' + f.name + '\n      expected: ' + f.expected + '\n      got:      ' + f.actual);
    process.exit(1);
}
