// tests/issue-15-profiles.test.mjs — v6.13.0 (issue #15)
//
// Coverage for the prompt+schema profile system: migration of legacy
// settings into a "Default" profile, active profile resolution, CRUD
// operations, name-collision handling, import validation, and the
// per-chat override.
//
// Run: node tests/issue-15-profiles.test.mjs

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

const profiles = await import('../src/profiles.js');
const {
    makeProfile, migrateLegacySettingsToProfile, getActiveProfile,
    createProfile, duplicateProfile, renameProfile, deleteProfile,
    setActiveProfile, setChatActiveProfile, updateActiveProfile,
    validateImportedProfile, importProfile, exportProfile,
} = profiles;

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
function assertFalse(name, v) { assertEq(name, !!v, false); }

// Helper: build a fresh settings stub with optional legacy fields populated.
function freshSettings(legacy = {}) {
    return {
        schema: legacy.schema || null,
        systemPrompt: legacy.systemPrompt || null,
        panels: legacy.panels || {},
        fieldToggles: legacy.fieldToggles || {},
        dashCards: legacy.dashCards || {},
        customPanels: legacy.customPanels || [],
        profiles: [],
        activeProfileId: '',
    };
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('issue #15 — prompt + schema profiles');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// ═══════════════════════════════════════════════════════════════════════
// 1. Migration: empty legacy settings → one "Default" profile
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 1: empty legacy settings migration ──');
{
    const s = freshSettings();
    const ran = migrateLegacySettingsToProfile(s);
    assertTrue('migration ran', ran);
    assertEq('one profile created', s.profiles.length, 1);
    assertEq('active profile set', s.activeProfileId, s.profiles[0].id);
    assertEq('default profile name', s.profiles[0].name, 'Default');
    assertEq('schema is null (use dynamic)', s.profiles[0].schema, null);
    assertEq('systemPrompt is null (use dynamic)', s.profiles[0].systemPrompt, null);
}

// ═══════════════════════════════════════════════════════════════════════
// 2. Migration preserves user customizations
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 2: migration preserves customizations ──');
{
    const s = freshSettings({
        schema: '{"type":"object","properties":{"foo":{"type":"string"}}}',
        systemPrompt: 'My custom prompt',
        panels: { dashboard: false, scene: true },
        customPanels: [{ id: 'cp1', name: 'Inventory', fields: [] }],
    });
    migrateLegacySettingsToProfile(s);
    const p = s.profiles[0];
    assertTrue('schema preserved', !!p.schema && p.schema.includes('foo'));
    assertEq('systemPrompt preserved', p.systemPrompt, 'My custom prompt');
    assertEq('panels preserved', p.panels.dashboard, false);
    assertEq('customPanels preserved', p.customPanels.length, 1);
    assertEq('customPanels deep-cloned', p.customPanels[0].name, 'Inventory');
}

// ═══════════════════════════════════════════════════════════════════════
// 3. Migration is idempotent
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 3: migration idempotent ──');
{
    const s = freshSettings();
    migrateLegacySettingsToProfile(s);
    const firstId = s.activeProfileId;
    const ran2 = migrateLegacySettingsToProfile(s);
    assertFalse('second migration is no-op', ran2);
    assertEq('still one profile', s.profiles.length, 1);
    assertEq('same active id', s.activeProfileId, firstId);
}

// ═══════════════════════════════════════════════════════════════════════
// 4. Migration repairs orphaned activeProfileId
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 4: orphan activeProfileId repair ──');
{
    const s = freshSettings();
    migrateLegacySettingsToProfile(s);
    s.activeProfileId = 'does-not-exist';
    const ran = migrateLegacySettingsToProfile(s);
    assertTrue('repair ran', ran);
    assertEq('falls back to first profile', s.activeProfileId, s.profiles[0].id);
}

// ═══════════════════════════════════════════════════════════════════════
// 5. CRUD: create, duplicate, rename, delete
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 5: CRUD operations ──');
{
    const s = freshSettings();
    migrateLegacySettingsToProfile(s);

    const p2 = createProfile(s, { name: 'Pokemon' });
    assertEq('two profiles after create', s.profiles.length, 2);
    assertEq('p2 name', p2.name, 'Pokemon');

    const dup = duplicateProfile(s, p2.id);
    assertEq('three profiles after duplicate', s.profiles.length, 3);
    assertEq('dup auto-suffixed', dup.name, 'Pokemon (copy)');

    const dup2 = duplicateProfile(s, p2.id);
    assertEq('second dup auto-numbered', dup2.name, 'Pokemon (copy) (2)');

    renameProfile(s, p2.id, 'Pokemon Gen 1');
    assertEq('p2 renamed', s.profiles.find(p => p.id === p2.id).name, 'Pokemon Gen 1');

    // Rename to existing name auto-suffixes
    renameProfile(s, dup.id, 'Pokemon Gen 1');
    assertEq('rename collision auto-suffixed', s.profiles.find(p => p.id === dup.id).name, 'Pokemon Gen 1 (2)');

    const newActive = deleteProfile(s, dup.id);
    assertEq('deleted profile gone', s.profiles.length, 3);
    assertTrue('deleteProfile returned new active id', !!newActive);
}

// ═══════════════════════════════════════════════════════════════════════
// 6. deleteProfile refuses last profile
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 6: cannot delete last profile ──');
{
    const s = freshSettings();
    migrateLegacySettingsToProfile(s);
    assertEq('one profile to start', s.profiles.length, 1);
    const result = deleteProfile(s, s.profiles[0].id);
    assertEq('refuses to delete last', result, null);
    assertEq('profile still there', s.profiles.length, 1);
}

// ═══════════════════════════════════════════════════════════════════════
// 7. deleteProfile reassigns active when active is deleted
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 7: delete-active reassigns ──');
{
    const s = freshSettings();
    migrateLegacySettingsToProfile(s);
    const p2 = createProfile(s, { name: 'Profile B' });
    setActiveProfile(s, p2.id);
    const newActive = deleteProfile(s, p2.id);
    assertTrue('returned a new active', !!newActive);
    assertEq('active is now first remaining', s.activeProfileId, s.profiles[0].id);
    assertFalse('deleted profile gone', s.profiles.some(p => p.id === p2.id));
}

// ═══════════════════════════════════════════════════════════════════════
// 8. updateActiveProfile writes to active, not legacy
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 8: updateActiveProfile targets active ──');
{
    const s = freshSettings();
    migrateLegacySettingsToProfile(s);
    const p2 = createProfile(s, { name: 'B' });
    setActiveProfile(s, p2.id);
    updateActiveProfile(s, { systemPrompt: 'B prompt' });
    const stored = s.profiles.find(p => p.id === p2.id);
    assertEq('B got the prompt', stored.systemPrompt, 'B prompt');
    assertEq('first profile untouched', s.profiles[0].systemPrompt, null);
}

// ═══════════════════════════════════════════════════════════════════════
// 9. Active profile resolution: per-chat override beats global
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 9: per-chat override ──');
{
    const s = freshSettings();
    migrateLegacySettingsToProfile(s);
    const pA = s.profiles[0];
    const pB = createProfile(s, { name: 'B' });

    setActiveProfile(s, pA.id);
    assertEq('global active = A', getActiveProfile(s).id, pA.id);

    // Override via chat metadata
    setChatActiveProfile(pB.id);
    assertEq('per-chat override wins', getActiveProfile(s).id, pB.id);

    // Clear override
    setChatActiveProfile(null);
    assertEq('clear override falls back to global', getActiveProfile(s).id, pA.id);
}

// ═══════════════════════════════════════════════════════════════════════
// 10. Import validation rejects malformed profiles
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 10: import validation ──');
{
    assertEq('null rejected', validateImportedProfile(null).ok, false);
    assertEq('not-object rejected', validateImportedProfile('hello').ok, false);
    assertEq('missing name rejected', validateImportedProfile({}).ok, false);
    assertEq('non-string schema rejected', validateImportedProfile({ name: 'x', schema: 123 }).ok, false);
    assertEq('non-array customPanels rejected', validateImportedProfile({ name: 'x', customPanels: {} }).ok, false);
    assertEq('schema string but invalid JSON rejected',
        validateImportedProfile({ name: 'x', schema: '{not valid' }).ok, false);
    assertEq('schema parses but is array rejected',
        validateImportedProfile({ name: 'x', schema: '[1,2,3]' }).ok, false);

    const ok = validateImportedProfile({
        name: 'My Profile',
        schema: '{"type":"object","properties":{"foo":{"type":"string"}}}',
        systemPrompt: 'Be helpful',
        customPanels: [{ id: 'cp1', name: 'Inv', fields: [] }],
    });
    assertEq('valid profile accepted', ok.ok, true);
    assertEq('built profile has clean name', ok.profile.name, 'My Profile');
    assertTrue('built profile has fresh id', !!ok.profile.id);
}

// ═══════════════════════════════════════════════════════════════════════
// 11. Import auto-suffixes name on collision
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 11: import collision auto-suffix ──');
{
    const s = freshSettings();
    migrateLegacySettingsToProfile(s);
    createProfile(s, { name: 'Medieval' });

    const v = validateImportedProfile({ name: 'Medieval', schema: null });
    importProfile(s, v.profile);
    const last = s.profiles[s.profiles.length - 1];
    assertEq('imported name auto-suffixed', last.name, 'Medieval (2)');
}

// ═══════════════════════════════════════════════════════════════════════
// 12. exportProfile strips id and adds export marker
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 12: export shape ──');
{
    const p = makeProfile({ name: 'Pokemon', systemPrompt: 'gotta catch em all' });
    const out = exportProfile(p);
    assertFalse('id stripped', 'id' in out);
    assertEq('marker present', out._scenepulseExport, 'profile');
    assertTrue('exportedAt present', !!out._exportedAt);
    assertEq('name preserved', out.name, 'Pokemon');
    assertEq('prompt preserved', out.systemPrompt, 'gotta catch em all');
}

// ─── Summary ──────────────────────────────────────────────────────────
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`${fail === 0 ? 'PASS' : 'FAIL'} ${pass}/${pass + fail}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
if (fail > 0) {
    for (const f of failures) console.log('  - ' + f.name + '\n      expected: ' + f.expected + '\n      got:      ' + f.actual);
    process.exit(1);
}
