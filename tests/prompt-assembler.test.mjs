// tests/prompt-assembler.test.mjs — v6.18.0 prompt slot system
//
// Verifies the new src/prompts/assembler.js (and slots.js) shipped in
// v6.18.0 for the prompt slot architecture. Coverage:
//
//   1. Default text equivalence — assembler output with no profile
//      contains every block the previous monolithic buildDynamicPrompt
//      produced (role, critical rules, language directive, dashboard,
//      scene, characters + name awareness, quests + quest validation,
//      relationships, story ideas, custom panels, delta mode).
//
//   2. Slot override merge — profile.promptOverrides[slotId] replaces
//      the default text for THAT slot only; other slots remain unchanged.
//
//   3. Legacy systemPrompt full override still wins — when profile has
//      both a systemPrompt and promptOverrides, the full systemPrompt is
//      returned verbatim and overrides are ignored (backward compat).
//
//   4. Conditional inclusion — sections that depend on panels/toggles
//      stay properly gated (e.g. nameAwareness only appears when
//      panels.characters is enabled; deltaMode only when isDelta).
//
//   5. Empty/whitespace overrides fall through to defaults (so a user
//      who clears the editor textarea reverts cleanly).

// ─── Stubs ────────────────────────────────────────────────────────────
// getContext() must return a stable reference so mutations to
// extensionSettings.scenepulse persist across getSettings() calls inside
// the assembler / settings.js helpers.
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
    globalThis.document = {
        createElement: () => ({ style: {} }),
        body: { appendChild: () => {} },
        querySelector: () => null,
        querySelectorAll: () => [],
    };
}
if (typeof localStorage === 'undefined') {
    globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
}

const { assemblePrompt } = await import('../src/prompts/assembler.js');
const { DEFAULT_SLOT_TEXT, SLOT_IDS, getSlotText, isSlotOverridden } = await import('../src/prompts/slots.js');

// ─── Helpers ──────────────────────────────────────────────────────────
let pass = 0, fail = 0;
const failures = [];

function assertEq(name, actual, expected) {
    const ok = actual === expected;
    if (ok) { pass++; console.log('  OK   ' + name); }
    else {
        fail++;
        failures.push({ name, actual, expected });
        console.log('  FAIL ' + name);
        console.log('       expected: ' + JSON.stringify(String(expected).slice(0, 80)));
        console.log('       actual:   ' + JSON.stringify(String(actual).slice(0, 80)));
    }
}
function assertTrue(name, v) {
    if (v) { pass++; console.log('  OK   ' + name); }
    else { fail++; failures.push({ name, actual: v, expected: true }); console.log('  FAIL ' + name + ' — value was falsy'); }
}
function assertContains(name, haystack, needle) {
    const ok = typeof haystack === 'string' && haystack.includes(needle);
    if (ok) { pass++; console.log('  OK   ' + name); }
    else {
        fail++;
        failures.push({ name, actual: 'missing: ' + needle.slice(0, 60), expected: 'contains' });
        console.log('  FAIL ' + name + ' — needle "' + needle.slice(0, 60) + '" not found');
    }
}
function assertNotContains(name, haystack, needle) {
    const ok = typeof haystack === 'string' && !haystack.includes(needle);
    if (ok) { pass++; console.log('  OK   ' + name); }
    else {
        fail++;
        failures.push({ name, actual: 'unexpected: ' + needle.slice(0, 60), expected: 'absent' });
        console.log('  FAIL ' + name + ' — needle "' + needle.slice(0, 60) + '" present');
    }
}

function _allOnSettings() {
    return {
        panels: {
            dashboard: true, scene: true, characters: true,
            quests: true, relationships: true, storyIdeas: true,
        },
        fieldToggles: {},
        dashCards: {},
        deltaMode: false,
        customPanels: [],
    };
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Prompt assembler — slot system + backward compat');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// ═══════════════════════════════════════════════════════════════════════
// 1. Default text contains every expected block
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Default output contains every expected section ──');
{
    const out = assemblePrompt(_allOnSettings(), null, {});
    assertContains('contains opening header',   out, '# SCENE TRACKER');
    assertContains('contains role text',        out, 'You are a precise scene analysis engine.');
    assertContains('contains critical rules',   out, '## CRITICAL RULES');
    assertContains('contains rule 1',           out, 'EVERY field in the schema MUST contain meaningful data');
    assertContains('contains FIELD SPECIFICATIONS heading', out, '## FIELD SPECIFICATIONS');
    assertContains('contains dashboard env block', out, '### Environment');
    assertContains('contains scene block',      out, '### Scene Analysis');
    assertContains('contains characters block', out, '### Characters');
    assertContains('contains name awareness',   out, '#### NAME AWARENESS');
    assertContains('contains promotion examples', out, 'Buzzcut');
    assertContains('contains quests block',     out, '### Quest Journal');
    assertContains('contains quest validation', out, '#### QUEST VALIDATION');
    assertContains('contains player action test', out, 'PLAYER ACTION TEST');
    assertContains('contains relationships',    out, '### Relationships');
    assertContains('contains story ideas',      out, '### Plot Branches');
    assertNotContains('does NOT contain delta mode (isDelta:false)', out, '## DELTA MODE');
}

// ═══════════════════════════════════════════════════════════════════════
// 2. Delta mode appears only when isDelta passed
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Delta mode conditional ──');
{
    const noDelta = assemblePrompt(_allOnSettings(), null, { isDelta: false });
    const withDelta = assemblePrompt(_allOnSettings(), null, { isDelta: true });
    assertNotContains('isDelta:false omits delta block', noDelta, '## DELTA MODE');
    assertContains('isDelta:true includes delta heading', withDelta, '## DELTA MODE — RETURN ONLY CHANGES');
    assertContains('isDelta:true includes rule 7 (charactersPresent)', withDelta, 'charactersPresent: ALWAYS include');
}

// ═══════════════════════════════════════════════════════════════════════
// 3. Per-slot override replaces THAT slot only
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Per-slot override replaces only the targeted slot ──');
{
    const profile = {
        promptOverrides: {
            role: 'CUSTOM ROLE TEXT — output JSON, that is all.',
        },
    };
    const out = assemblePrompt(_allOnSettings(), profile, {});
    assertContains('override appears in output', out, 'CUSTOM ROLE TEXT — output JSON, that is all.');
    assertNotContains('default role text removed', out, 'You are a precise scene analysis engine.');
    // Other slots unchanged:
    assertContains('critical rules unchanged',  out, 'EVERY field in the schema MUST contain meaningful data');
    assertContains('name awareness unchanged',  out, 'Buzzcut');
    assertContains('quest validation unchanged', out, 'PLAYER ACTION TEST');
}

// ═══════════════════════════════════════════════════════════════════════
// 4. Multiple slot overrides compose
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Multiple slot overrides compose ──');
{
    const profile = {
        promptOverrides: {
            role: 'X-ROLE',
            criticalRules: '## CRITICAL RULES\nObey all rules.',
            nameAwareness: 'X-NAME-CHECKLIST',
            questValidation: 'X-QUEST-CHECKLIST',
            deltaMode: 'X-DELTA',
        },
    };
    const out = assemblePrompt(_allOnSettings(), profile, { isDelta: true });
    assertContains('role overridden',            out, 'X-ROLE');
    assertContains('critical rules overridden',  out, 'Obey all rules.');
    assertContains('name awareness overridden',  out, 'X-NAME-CHECKLIST');
    assertContains('quest validation overridden', out, 'X-QUEST-CHECKLIST');
    assertContains('delta mode overridden',      out, 'X-DELTA');
    assertNotContains('default role gone',       out, 'You are a precise scene analysis engine.');
    assertNotContains('default name awareness gone', out, 'Buzzcut');
}

// ═══════════════════════════════════════════════════════════════════════
// 5. Legacy systemPrompt wins over slot system entirely
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Legacy profile.systemPrompt overrides everything ──');
{
    const profile = {
        systemPrompt: 'LEGACY FULL TEXT — slot overrides should be ignored.',
        promptOverrides: { role: 'X-ROLE-IGNORED' },
    };
    const out = assemblePrompt(_allOnSettings(), profile, { isDelta: true });
    assertEq('output is exactly the legacy systemPrompt',
        out, 'LEGACY FULL TEXT — slot overrides should be ignored.');
    assertNotContains('slot override does NOT appear', out, 'X-ROLE-IGNORED');
    assertNotContains('default text does NOT appear', out, '## CRITICAL RULES');
}

// ═══════════════════════════════════════════════════════════════════════
// 6. Empty / whitespace overrides fall through to defaults
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Empty / whitespace overrides revert to defaults ──');
{
    const profileEmpty   = { promptOverrides: { role: '' } };
    const profileSpace   = { promptOverrides: { role: '   \n\t  ' } };
    const profileNull    = { promptOverrides: { role: null } };

    const outEmpty = assemblePrompt(_allOnSettings(), profileEmpty, {});
    const outSpace = assemblePrompt(_allOnSettings(), profileSpace, {});
    const outNull  = assemblePrompt(_allOnSettings(), profileNull, {});

    assertContains('empty string override → default',     outEmpty, 'You are a precise scene analysis engine.');
    assertContains('whitespace-only override → default',  outSpace, 'You are a precise scene analysis engine.');
    assertContains('null override → default',             outNull,  'You are a precise scene analysis engine.');
}

// ═══════════════════════════════════════════════════════════════════════
// 7. nameAwareness only when characters panel enabled
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── nameAwareness gating on characters panel ──');
{
    const sNoChars = _allOnSettings();
    sNoChars.panels.characters = false;
    const out = assemblePrompt(sNoChars, null, {});
    assertNotContains('characters disabled → no name awareness', out, '#### NAME AWARENESS');
    assertNotContains('characters disabled → no characters block', out, '### Characters');
    // Other sections still present:
    assertContains('quests still present', out, '### Quest Journal');
}

// ═══════════════════════════════════════════════════════════════════════
// 8. questValidation only when mainQuests OR sideQuests enabled
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── questValidation gating on mainQuests/sideQuests toggles ──');
{
    const sNoQuestKinds = _allOnSettings();
    sNoQuestKinds.fieldToggles = { mainQuests: false, sideQuests: false };
    const out = assemblePrompt(sNoQuestKinds, null, {});
    assertNotContains('no mainQuests/sideQuests → no QUEST VALIDATION block',
        out, '#### QUEST VALIDATION');
}

// ═══════════════════════════════════════════════════════════════════════
// 9. SLOT_IDS exhaustiveness — every id has matching default text (except `fields`)
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── slots.js metadata is internally consistent ──');
{
    for (const id of SLOT_IDS) {
        if (id === 'fields') {
            assertEq(`${id}: dynamic slot omitted from DEFAULT_SLOT_TEXT`,
                Object.prototype.hasOwnProperty.call(DEFAULT_SLOT_TEXT, id), false);
        } else {
            assertTrue(`${id}: has default text`, typeof DEFAULT_SLOT_TEXT[id] === 'string' && DEFAULT_SLOT_TEXT[id].length > 0);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════
// 10. getSlotText / isSlotOverridden helpers
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── getSlotText / isSlotOverridden helpers ──');
{
    assertEq('getSlotText with null profile → default',
        getSlotText('role', null), DEFAULT_SLOT_TEXT.role);
    assertEq('getSlotText with empty overrides → default',
        getSlotText('role', { promptOverrides: {} }), DEFAULT_SLOT_TEXT.role);
    assertEq('getSlotText with override → override',
        getSlotText('role', { promptOverrides: { role: 'X' } }), 'X');
    assertEq('getSlotText with whitespace override → default',
        getSlotText('role', { promptOverrides: { role: '  ' } }), DEFAULT_SLOT_TEXT.role);
    assertEq('isSlotOverridden: no profile → false',
        isSlotOverridden('role', null), false);
    assertEq('isSlotOverridden: empty override → false',
        isSlotOverridden('role', { promptOverrides: { role: '' } }), false);
    assertEq('isSlotOverridden: real override → true',
        isSlotOverridden('role', { promptOverrides: { role: 'X' } }), true);
}

// ═══════════════════════════════════════════════════════════════════════
// 11. Language slot template substitution
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Language slot template substitution ──');
//
// getLanguage() reads from SillyTavern.getContext().extensionSettings.scenepulse,
// not the settings object passed to assemblePrompt. Inject the language by
// mutating the shared stub's scenepulse settings between sub-tests.
function _setStubLang(lang) {
    const ctx = globalThis.SillyTavern.getContext();
    ctx.extensionSettings.scenepulse.language = lang;
}
{
    _setStubLang('Japanese');
    const out = assemblePrompt(_allOnSettings(), null, {});
    assertContains('language directive appears',     out, '## LANGUAGE');
    assertContains('language token substituted',     out, 'MUST be in Japanese');
    assertNotContains('${language} placeholder gone', out, '${language}');
}
{
    _setStubLang(undefined);
    const out = assemblePrompt(_allOnSettings(), null, {});
    assertNotContains('no language → no LANGUAGE heading', out, '## LANGUAGE');
}
{
    _setStubLang('Spanish');
    const profile = {
        promptOverrides: {
            language: '## CUSTOM LANGUAGE BLOCK\nWrite everything in ${language}, including JSON keys.',
        },
    };
    const out = assemblePrompt(_allOnSettings(), profile, {});
    assertContains('custom language slot appears',         out, '## CUSTOM LANGUAGE BLOCK');
    assertContains('custom slot also gets substitution',   out, 'Write everything in Spanish, including JSON keys.');
}
_setStubLang(undefined); // tidy up

// ─── Summary ──────────────────────────────────────────────────────────
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const total = pass + fail;
if (fail === 0) {
    console.log(`PASS ${pass}/${total}`);
} else {
    console.log(`FAIL ${fail}/${total} (${pass} passed)`);
    for (const f of failures) {
        console.log('  - ' + f.name);
    }
    process.exit(1);
}
