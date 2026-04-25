// tests/profile-orphan-migration.test.mjs — v6.16.2
//
// Verifies migrateOrphanRootData behavior across all six profile-overlay fields
// (panels / fieldToggles / dashCards / customPanels / schema / systemPrompt).
//
// Panel C synthesis: orphans must be detected AND migrated according to two
// rules:
//   - ALWAYS-overlaid (panels/fieldToggles/dashCards/customPanels): if profile
//     has its own value, root is dead → clear; if profile is empty, MOVE root
//     into profile.
//   - CONDITIONALLY-overlaid (schema/systemPrompt): only shadowed when the
//     profile field is non-null. Otherwise root is genuinely effective.
//
// Run: node tests/profile-orphan-migration.test.mjs

import { migrateLegacySettingsToProfile, migrateOrphanRootData, makeProfile } from '../src/profiles.js';

let pass = 0, fail = 0;
const failures = [];

function assertEq(name, actual, expected) {
    const a = JSON.stringify(actual), e = JSON.stringify(expected);
    if (a === e) { pass++; console.log('  OK   ' + name); }
    else {
        fail++;
        failures.push({ name, actual, expected });
        console.log('  FAIL ' + name + ' — expected ' + e + ', got ' + a);
    }
}

function _profile({ name = 'Default', panels = {}, fieldToggles = {}, dashCards = {}, customPanels = [], schema = null, systemPrompt = null } = {}) {
    return makeProfile({ name, panels, fieldToggles, dashCards, customPanels, schema, systemPrompt });
}
function _settingsWith(overrides = {}) {
    return {
        profiles: [], activeProfileId: '',
        panels: {}, fieldToggles: {}, dashCards: {}, customPanels: [],
        schema: null, systemPrompt: null,
        ...overrides,
    };
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('migrateOrphanRootData — v6.16.2 backfill');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// ═══════════════════════════════════════════════════════════════════════
// Scenario 1: No profiles at all → no-op
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 1: No profiles → no-op ──');
{
    const s = _settingsWith({ customPanels: [{ id: '1', name: 'X' }] });
    const touched = migrateOrphanRootData(s);
    assertEq('no profiles → 0 touched', touched, 0);
    assertEq('no profiles → root.customPanels untouched', s.customPanels.length, 1);
}

// ═══════════════════════════════════════════════════════════════════════
// Scenario 2: Profile exists, root has data, profile is empty → MOVE root → profile
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 2: profile empty, root has data → MOVE ──');
for (const key of ['panels', 'fieldToggles', 'dashCards']) {
    const p = _profile();
    const s = _settingsWith({ profiles: [p], activeProfileId: p.id, [key]: { foo: true, bar: false } });
    const touched = migrateOrphanRootData(s);
    assertEq(`MOVE ${key}: 1 touched`, touched, 1);
    assertEq(`MOVE ${key}: profile.${key} populated`, p[key], { foo: true, bar: false });
    assertEq(`MOVE ${key}: root.${key} cleared`, s[key], {});
}
{
    const p = _profile();
    const s = _settingsWith({ profiles: [p], activeProfileId: p.id, customPanels: [{ id: 'cp1', name: 'CP1' }] });
    const touched = migrateOrphanRootData(s);
    assertEq('MOVE customPanels: 1 touched', touched, 1);
    assertEq('MOVE customPanels: profile populated', p.customPanels.length, 1);
    assertEq('MOVE customPanels: root cleared', s.customPanels, []);
}

// ═══════════════════════════════════════════════════════════════════════
// Scenario 3: Profile has data, root has data → CLEAR root (profile wins)
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 3: profile populated, root populated → CLEAR root ──');
for (const key of ['panels', 'fieldToggles', 'dashCards']) {
    const p = _profile({ [key]: { real: true } });
    const s = _settingsWith({ profiles: [p], activeProfileId: p.id, [key]: { stale: true } });
    const touched = migrateOrphanRootData(s);
    assertEq(`CLEAR ${key}: 1 touched`, touched, 1);
    assertEq(`CLEAR ${key}: profile preserved`, p[key], { real: true });
    assertEq(`CLEAR ${key}: root cleared`, s[key], {});
}
{
    const p = _profile({ customPanels: [{ id: 'profCP', name: 'Profile' }] });
    const s = _settingsWith({ profiles: [p], activeProfileId: p.id, customPanels: [{ id: 'rootCP', name: 'Root' }] });
    const touched = migrateOrphanRootData(s);
    assertEq('CLEAR customPanels: 1 touched', touched, 1);
    assertEq('CLEAR customPanels: profile preserved', p.customPanels[0].name, 'Profile');
    assertEq('CLEAR customPanels: root cleared', s.customPanels, []);
}

// ═══════════════════════════════════════════════════════════════════════
// Scenario 4: Profile empty, root empty → no-op (nothing to migrate)
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 4: profile empty, root empty → no-op ──');
{
    const p = _profile();
    const s = _settingsWith({ profiles: [p], activeProfileId: p.id });
    const touched = migrateOrphanRootData(s);
    assertEq('all empty → 0 touched', touched, 0);
}

// ═══════════════════════════════════════════════════════════════════════
// Scenario 5: schema/systemPrompt — only shadowed when profile sets them
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 5: schema/systemPrompt conditional overlay ──');
for (const key of ['schema', 'systemPrompt']) {
    // Profile sets it AND root has stale → CLEAR root
    {
        const p = _profile({ [key]: 'profile value' });
        const s = _settingsWith({ profiles: [p], activeProfileId: p.id, [key]: 'root stale' });
        const touched = migrateOrphanRootData(s);
        assertEq(`${key} CLEAR when profile sets it: 1 touched`, touched, 1);
        assertEq(`${key} CLEAR: root cleared`, s[key], null);
        assertEq(`${key} CLEAR: profile preserved`, p[key], 'profile value');
    }
    // Profile null AND root has value → KEEP (root is effective)
    {
        const p = _profile();
        const s = _settingsWith({ profiles: [p], activeProfileId: p.id, [key]: 'root effective' });
        const touched = migrateOrphanRootData(s);
        assertEq(`${key} KEEP when profile null: 0 touched`, touched, 0);
        assertEq(`${key} KEEP: root preserved`, s[key], 'root effective');
    }
    // Profile null AND root null → no-op
    {
        const p = _profile();
        const s = _settingsWith({ profiles: [p], activeProfileId: p.id });
        const touched = migrateOrphanRootData(s);
        assertEq(`${key} both null: 0 touched`, touched, 0);
    }
}

// ═══════════════════════════════════════════════════════════════════════
// Scenario 6: Multiple shadowed fields in one settings → cumulative count
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 6: cumulative migration count ──');
{
    const p = _profile({ panels: { real: true }, customPanels: [{ id: 'c1', name: 'C1' }] });
    const s = _settingsWith({
        profiles: [p], activeProfileId: p.id,
        panels: { stale: true },
        fieldToggles: { extra: 1 },          // promote
        customPanels: [{ id: 'cs', name: 'Stale' }],
        schema: 'root only',                 // keep (profile.schema null)
        systemPrompt: 'shadow',              // can't be shadowed: profile.systemPrompt null
    });
    const touched = migrateOrphanRootData(s);
    // panels CLEAR + customPanels CLEAR + fieldToggles MOVE = 3 touched
    assertEq('cumulative: 3 touched', touched, 3);
    assertEq('panels CLEAR: profile preserved', p.panels, { real: true });
    assertEq('panels CLEAR: root cleared', s.panels, {});
    assertEq('fieldToggles MOVE: profile populated', p.fieldToggles, { extra: 1 });
    assertEq('fieldToggles MOVE: root cleared', s.fieldToggles, {});
    assertEq('customPanels CLEAR: profile preserved', p.customPanels[0].name, 'C1');
    assertEq('customPanels CLEAR: root cleared', s.customPanels, []);
    // schema not touched: profile.schema is null
    assertEq('schema KEEP: root preserved', s.schema, 'root only');
    // systemPrompt not touched: profile.systemPrompt is null
    assertEq('systemPrompt KEEP: root preserved', s.systemPrompt, 'shadow');
}

// ═══════════════════════════════════════════════════════════════════════
// Scenario 7: Idempotency — second call is a no-op
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 7: idempotent ──');
{
    const p = _profile({ customPanels: [{ id: 'p1', name: 'P1' }] });
    const s = _settingsWith({ profiles: [p], activeProfileId: p.id, customPanels: [{ id: 'r1', name: 'R1' }] });
    const first = migrateOrphanRootData(s);
    const second = migrateOrphanRootData(s);
    assertEq('first call touched 1', first, 1);
    assertEq('second call touched 0', second, 0);
}

// ═══════════════════════════════════════════════════════════════════════
// Scenario 8: activeProfileId points at non-existent profile → no-op
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 8: stale activeProfileId ──');
{
    const p = _profile();
    const s = _settingsWith({ profiles: [p], activeProfileId: 'non-existent-id', customPanels: [{ id: 'r1', name: 'R1' }] });
    const touched = migrateOrphanRootData(s);
    assertEq('stale id → 0 touched', touched, 0);
    assertEq('stale id → root preserved', s.customPanels.length, 1);
}

// ═══════════════════════════════════════════════════════════════════════
// Scenario 9: Combination with legacy migration → run both, end state correct
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 9: legacy migration + orphan migration sequence ──');
{
    const s = _settingsWith({
        customPanels: [{ id: 'old', name: 'Legacy' }],
        panels: { dashboard: true },
    });
    // Step 1: legacy migration creates Default profile, copies root → profile.
    const ranLegacy = migrateLegacySettingsToProfile(s);
    assertEq('legacy migration ran', ranLegacy, true);
    assertEq('legacy: Default profile created', s.profiles.length, 1);
    // Bug: legacy migration did NOT clear root, so root still has the data.
    assertEq('legacy: root.customPanels still populated (the orphan bug)', s.customPanels.length, 1);
    // Step 2: orphan migration cleans it up.
    const touched = migrateOrphanRootData(s);
    assertEq('orphan migration touched 2', touched, 2); // panels + customPanels
    assertEq('orphan: profile.customPanels preserved', s.profiles[0].customPanels[0].name, 'Legacy');
    assertEq('orphan: root.customPanels cleared', s.customPanels, []);
    assertEq('orphan: profile.panels preserved', s.profiles[0].panels, { dashboard: true });
    assertEq('orphan: root.panels cleared', s.panels, {});
}

// ═══════════════════════════════════════════════════════════════════════
// Scenario 10: Defensive — null/undefined inputs
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 10: defensive null handling ──');
assertEq('null settings → 0', migrateOrphanRootData(null), 0);
assertEq('undefined settings → 0', migrateOrphanRootData(undefined), 0);
assertEq('non-object settings → 0', migrateOrphanRootData('string'), 0);
assertEq('empty object settings → 0', migrateOrphanRootData({}), 0);

// ═══════════════════════════════════════════════════════════════════════
// Scenario 11: Profile updatedAt stamp on non-zero migration
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 11: updatedAt stamp ──');
{
    const p = _profile();
    const beforeStamp = p.updatedAt;
    const s = _settingsWith({ profiles: [p], activeProfileId: p.id, customPanels: [{ id: 'r1', name: 'R' }] });
    // Wait a moment so the updated stamp differs (real-world ms granularity)
    const start = Date.now();
    while (Date.now() - start < 2) { /* spin */ }
    const touched = migrateOrphanRootData(s);
    assertEq('migration touched 1', touched, 1);
    assertEq('updatedAt advanced', p.updatedAt !== beforeStamp, true);
}

// ═══════════════════════════════════════════════════════════════════════
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
if (fail === 0) {
    console.log(`PASS ${pass}/${pass}`);
} else {
    console.log(`FAIL ${fail}/${pass + fail} (passed ${pass})`);
    process.exit(1);
}
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
