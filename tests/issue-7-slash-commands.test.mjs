// tests/issue-7-slash-commands.test.mjs — v6.13.4 (issue #7)
//
// Coverage for the synchronous slash command handlers: status, toggle,
// profile, debug, help, plus the /sp dispatcher's subcommand routing.
//
// Async/DOM-bound handlers (regen, refresh, clear, export) are not
// covered here — they require lazy-imported generation/UI modules and
// belong in manual integration testing.
//
// Run: node tests/issue-7-slash-commands.test.mjs

// ─── Stubs ─────────────────────────────────────────────────────────────
const _stCtx = {
    name1: 'Alex',
    name2: 'Jenna',
    chat: [],
    chatMetadata: { scenepulse: { snapshots: {}, chatPanels: [] } },
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
    globalThis.document = {
        createElement: () => ({ style: {}, click: () => {}, classList: { add: () => {}, remove: () => {}, toggle: () => {} }, addEventListener: () => {}, querySelector: () => null, querySelectorAll: () => [], appendChild: () => {} }),
        body: { appendChild: () => {}, removeChild: () => {} },
        getElementById: () => null,
        querySelector: () => null,
        querySelectorAll: () => [],
        addEventListener: () => {},
        removeEventListener: () => {},
    };
}
if (typeof window === 'undefined') globalThis.window = { addEventListener: () => {}, matchMedia: () => ({ matches: false }) };
if (typeof URL === 'undefined') globalThis.URL = { createObjectURL: () => 'blob:test', revokeObjectURL: () => {} };
if (typeof Blob === 'undefined') globalThis.Blob = function (parts) { this.parts = parts; };

// Re-import the slash-commands module fresh after stubs are in place.
const profiles = await import('../src/profiles.js');
const settings = await import('../src/settings.js');
// Slash commands are NOT auto-registered; we pull the handlers via the
// module's internal closures. To test, we need to invoke registerSlashCommands
// and then pick handlers via a fake SCP. Easier: re-export internals would
// require changing src code. Cheaper: replay the dispatch logic by importing
// the underlying module functions through a tiny shim.
//
// Pragmatic compromise: do a structural import that runs registerSlashCommands
// against a recording stub, capturing each registered command's callback.
const captured = {};
const fakeSCP = { addCommandObject: (cmd) => { captured[cmd.name] = cmd.callback; } };
const fakeSC = { fromProps: (p) => p };
const fakeSA = function () {};
const fakeAT = { STRING: 'string' };
_stCtx.SlashCommandParser = fakeSCP;
_stCtx.SlashCommand = fakeSC;
_stCtx.SlashCommandArgument = fakeSA;
_stCtx.ARGUMENT_TYPE = fakeAT;

const slash = await import('../src/slash-commands.js');
slash.registerSlashCommands();

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

// Every test resets settings between runs to avoid cross-pollution
function resetSettings() {
    _stCtx.extensionSettings.scenepulse = {};
    _stCtx.chatMetadata.scenepulse = { snapshots: {}, chatPanels: [] };
    settings.invalidateSettingsCache?.();
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('issue #7 — slash command handlers');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// ═══════════════════════════════════════════════════════════════════════
// 1. All commands registered
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 1: all expected commands registered ──');
{
    const expected = ['sp', 'sp-regen', 'sp-status', 'sp-clear', 'sp-toggle', 'sp-export', 'sp-debug', 'sp-help', 'sp-refresh', 'sp-profile'];
    for (const name of expected) {
        assertTrue(`/${name} registered`, typeof captured[name] === 'function');
    }
}

// ═══════════════════════════════════════════════════════════════════════
// 2. /sp help — listing
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 2: /sp help text ──');
{
    const out = await captured['sp-help']({}, '');
    assertContains('mentions status', out, '/sp status');
    assertContains('mentions regen', out, '/sp regen');
    assertContains('mentions refresh', out, '/sp refresh');
    assertContains('mentions toggle', out, '/sp toggle');
    assertContains('mentions profile', out, '/sp profile');
    assertContains('mentions export', out, '/sp export');
    assertContains('mentions debug', out, '/sp debug');
    assertContains('mentions standalone shortcuts', out, 'Standalone shortcuts');
    assertContains('mentions /scenepulse alias', out, '/scenepulse');
}

// ═══════════════════════════════════════════════════════════════════════
// 3. /sp dispatcher routes correctly
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 3: /sp dispatcher routing ──');
{
    resetSettings();
    const r1 = await captured['sp']({}, 'help');
    assertContains('routes "help" to help', r1, 'Slash Commands');
    const r2 = await captured['sp']({}, '');
    assertContains('routes empty to help', r2, 'Slash Commands');
    const r3 = await captured['sp']({}, 'status');
    assertContains('routes "status" to status', r3, 'ScenePulse v');
    const r4 = await captured['sp']({}, 'gibberish');
    assertContains('unknown subcommand error', r4, 'Unknown subcommand');
    assertContains('unknown lists valid', r4, 'profile');
}

// ═══════════════════════════════════════════════════════════════════════
// 4. /sp status — no snapshot path
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 4: /sp-status without data ──');
{
    resetSettings();
    const out = await captured['sp-status']({}, '');
    assertContains('shows no-data hint', out, 'No tracker data yet');
    assertContains('shows profile line', out, 'Profile:');
    assertContains('shows ScenePulse version', out, 'ScenePulse v');
}

// ═══════════════════════════════════════════════════════════════════════
// 5. /sp toggle — no arg lists state, including custom panels
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 5: /sp-toggle listing + custom panels ──');
{
    resetSettings();
    _stCtx.chatMetadata.scenepulse.chatPanels = [
        { id: 'cp1', name: 'Inventory', enabled: true, fields: [] },
        { id: 'cp2', name: 'Reputation', enabled: false, fields: [] },
    ];
    const out = await captured['sp-toggle']({}, '');
    assertContains('lists built-in panels', out, 'dashboard');
    assertContains('lists custom panels section', out, 'Custom panels');
    assertContains('lists Inventory custom panel', out, 'Inventory');
    assertContains('lists Reputation custom panel', out, 'Reputation');
    assertContains('shows OFF state for disabled', out, 'Reputation: OFF');
}

// ═══════════════════════════════════════════════════════════════════════
// 6. /sp toggle — built-in case-insensitive match
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 6: /sp-toggle built-in case-insensitive ──');
{
    resetSettings();
    const out1 = await captured['sp-toggle']({}, 'DASHBOARD');
    assertContains('uppercase still matches dashboard', out1, 'Dashboard');
    const out2 = await captured['sp-toggle']({}, 'CharaCters');
    assertContains('mixed case still matches characters', out2, 'Characters');
}

// ═══════════════════════════════════════════════════════════════════════
// 7. /sp toggle — custom panel by name (case-insensitive)
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 7: /sp-toggle custom panel ──');
{
    resetSettings();
    _stCtx.chatMetadata.scenepulse.chatPanels = [
        { id: 'cp1', name: 'Inventory', enabled: true, fields: [] },
    ];
    const out = await captured['sp-toggle']({}, 'inventory');  // lowercase
    assertContains('toggled custom panel acknowledged', out, 'Inventory');
    assertContains('marked as custom', out, '(custom)');
    assertEq('chatPanels enabled flipped', _stCtx.chatMetadata.scenepulse.chatPanels[0].enabled, false);
}

// ═══════════════════════════════════════════════════════════════════════
// 8. /sp toggle — unknown panel reports valid options
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 8: /sp-toggle unknown panel ──');
{
    resetSettings();
    _stCtx.chatMetadata.scenepulse.chatPanels = [{ id: 'cp1', name: 'Inventory', enabled: true, fields: [] }];
    const out = await captured['sp-toggle']({}, 'nonexistent');
    assertContains('reports unknown', out, 'Unknown panel');
    assertContains('lists built-ins', out, 'dashboard');
    assertContains('lists custom in suggestion', out, 'Inventory');
}

// ═══════════════════════════════════════════════════════════════════════
// 9. /sp profile — no arg lists profiles with active marker
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 9: /sp-profile listing ──');
{
    resetSettings();
    const s = settings.getSettings();
    profiles.migrateLegacySettingsToProfile(s);
    profiles.createProfile(s, { name: 'Pokemon' });
    const out = await captured['sp-profile']({}, '');
    assertContains('lists Default', out, 'Default');
    assertContains('lists Pokemon', out, 'Pokemon');
    assertContains('marks active with asterisk', out, '* Default');
}

// ═══════════════════════════════════════════════════════════════════════
// 10. /sp profile — switch by name (case-insensitive)
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 10: /sp-profile switch ──');
{
    resetSettings();
    const s = settings.getSettings();
    profiles.migrateLegacySettingsToProfile(s);
    const pokemon = profiles.createProfile(s, { name: 'Pokemon' });
    const out = await captured['sp-profile']({}, 'pokemon');  // lowercase
    assertContains('switch acknowledged', out, 'Pokemon');
    assertEq('activeProfileId updated', s.activeProfileId, pokemon.id);

    // Switching to already-active reports gracefully
    const out2 = await captured['sp-profile']({}, 'Pokemon');
    assertContains('reports already-on', out2, 'Already on');
}

// ═══════════════════════════════════════════════════════════════════════
// 11. /sp profile — unknown name lists available
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 11: /sp-profile unknown ──');
{
    resetSettings();
    const s = settings.getSettings();
    profiles.migrateLegacySettingsToProfile(s);
    const out = await captured['sp-profile']({}, 'NotARealProfile');
    assertContains('reports unknown', out, 'Unknown profile');
    assertContains('lists available', out, 'Default');
}

// ═══════════════════════════════════════════════════════════════════════
// 12. /sp debug — uses dynamic snapshot cap, not hardcoded 30
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 12: /sp-debug honors maxSnapshots ──');
{
    resetSettings();
    const s = settings.getSettings();
    s.maxSnapshots = 0;
    const out1 = await captured['sp-debug']({}, '');
    assertContains('shows infinity for unlimited', out1, '/ ∞');

    s.maxSnapshots = 100;
    const out2 = await captured['sp-debug']({}, '');
    assertContains('shows actual cap', out2, '/ 100');
}

// ─── Summary ──────────────────────────────────────────────────────────
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`${fail === 0 ? 'PASS' : 'FAIL'} ${pass}/${pass + fail}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
if (fail > 0) {
    for (const f of failures) console.log('  - ' + f.name + '\n      expected: ' + f.expected + '\n      got:      ' + f.actual);
    process.exit(1);
}
