// tests/preset-registry.test.mjs — v6.20.0 model preset registry
//
// Verifies the bundled BUILT_IN_PRESETS array + the matcher / patch-builder
// in src/presets/registry.js. No DOM / SillyTavern context needed — these
// are pure data + lookup helpers.
//
// Coverage:
//   1. All 30 bundled presets pass shape validation (required keys present,
//      types correct, schema sane).
//   2. matchPatterns are unique across the bundle (no preset accidentally
//      shadows another for the same id).
//   3. findMatchingPreset returns the longest-match winner on collision
//      (Cydonia × Magnum > plain Cydonia).
//   4. buildPresetPatch merges into existing profile.promptOverrides
//      without dropping unrelated user customizations.
//   5. Empty / null model id returns null gracefully.

// Stub SillyTavern context BEFORE importing registry, so getActiveModelId
// (which closes over a global SillyTavern reference) can be exercised.
globalThis.SillyTavern = {
    getContext: () => ({ chatCompletionSettings: {}, textGenerationSettings: {} }),
};
if (typeof document === 'undefined') {
    globalThis.document = {
        querySelectorAll: () => [],
    };
}

const { BUILT_IN_PRESETS, findPresetById, getPresetFamilies } = await import('../src/presets/built-in.js');
const { findMatchingPreset, buildPresetPatch, getActiveModelId } = await import('../src/presets/registry.js');

let pass = 0, fail = 0;
const failures = [];

function assertEq(name, actual, expected) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a === e) { pass++; console.log('  OK   ' + name); }
    else { fail++; failures.push({ name, actual: a, expected: e }); console.log('  FAIL ' + name + ' — expected ' + e + ', got ' + a); }
}
function assertTrue(name, v, msg = '') {
    if (v) { pass++; console.log('  OK   ' + name); }
    else { fail++; failures.push({ name, actual: v, expected: true }); console.log('  FAIL ' + name + (msg ? ' — ' + msg : '')); }
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Preset registry — bundled + matcher + patch builder');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// ═══════════════════════════════════════════════════════════════════════
// 1. All bundled presets pass shape validation
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Bundled preset shape validation ──');
const REQUIRED_KEYS = ['id', 'displayName', 'family', 'provider', 'matchPatterns', 'systemPromptRole', 'promptOverrides', 'notes'];
const VALID_ROLES = ['system', 'user', 'assistant'];
const VALID_FAMILIES = ['claude', 'gpt', 'gemini', 'deepseek', 'kimi', 'glm', 'qwen', 'mistral-finetune', 'llama-finetune', 'gemma-finetune', 'command-r', 'grok', 'legacy'];
const VALID_SLOT_IDS = new Set(['role', 'criticalRules', 'language', 'nameAwareness', 'questValidation', 'deltaMode']);

// v6.25.0: count grew from 30 → 39 (added GLM-5, GLM-5.1, Claude Opus 4.7,
// Claude Sonnet 4.7, Anubis-Pro 70B, EVA-Llama 3.33 70B, Cydonia 24B v4,
// Magidonia 24B v4.3, Cydonia-R1 24B v4.1).
assertEq('39 bundled presets', BUILT_IN_PRESETS.length, 39);

for (const p of BUILT_IN_PRESETS) {
    for (const k of REQUIRED_KEYS) {
        assertTrue(`${p.id || '(no-id)'}.${k} present`, k in p);
    }
    assertTrue(`${p.id}: id is non-empty string`, typeof p.id === 'string' && p.id.length > 0);
    assertTrue(`${p.id}: displayName is non-empty string`, typeof p.displayName === 'string' && p.displayName.length > 0);
    assertTrue(`${p.id}: family valid`, VALID_FAMILIES.includes(p.family), `got ${p.family}`);
    assertTrue(`${p.id}: matchPatterns is non-empty array`,
        Array.isArray(p.matchPatterns) && p.matchPatterns.length > 0);
    for (const pat of p.matchPatterns) {
        assertTrue(`${p.id}: matchPattern "${pat}" is non-empty string`,
            typeof pat === 'string' && pat.length > 0);
    }
    assertTrue(`${p.id}: systemPromptRole is valid`, VALID_ROLES.includes(p.systemPromptRole));
    assertTrue(`${p.id}: promptOverrides is object`,
        typeof p.promptOverrides === 'object' && p.promptOverrides !== null && !Array.isArray(p.promptOverrides));
    for (const slotId of Object.keys(p.promptOverrides)) {
        assertTrue(`${p.id}: override key "${slotId}" is a known slot`,
            VALID_SLOT_IDS.has(slotId), `not in SLOT_IDS - check src/prompts/slots.js`);
    }
    assertTrue(`${p.id}: notes is short enough`, typeof p.notes === 'string' && p.notes.length > 0 && p.notes.length < 500);
}

// ═══════════════════════════════════════════════════════════════════════
// 2. ids are unique
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── id uniqueness ──');
{
    const ids = BUILT_IN_PRESETS.map(p => p.id);
    const uniqueIds = new Set(ids);
    assertEq('every preset has a unique id', uniqueIds.size, ids.length);
}

// ═══════════════════════════════════════════════════════════════════════
// 3. findMatchingPreset
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── findMatchingPreset ──');
{
    assertEq('null model id → null',  findMatchingPreset(null),  null);
    assertEq('empty model id → null', findMatchingPreset(''),    null);
    assertEq('unknown model id → null', findMatchingPreset('some-totally-unknown-model-xyz'), null);

    const claude = findMatchingPreset('anthropic/claude-sonnet-4-6');
    assertEq('claude sonnet matches preset id', claude?.id, 'claude-sonnet-4-6');

    // v6.25.0: claude-opus-4-7 now has its own dedicated preset (effort-based,
    // no temp/top_p/top_k samplers). Pre-v6.25.0 it fell through to claude-opus-4-6.
    const opus = findMatchingPreset('claude-opus-4-7');
    assertEq('claude opus 4.7 matches its own preset', opus?.id, 'claude-opus-4-7');

    const ds = findMatchingPreset('deepseek/deepseek-v3.2');
    assertEq('deepseek v3.2 matches', ds?.id, 'deepseek-v3-2');

    // Longest-match wins: Cydonia × Magnum should beat plain Cydonia
    const cydMagnum = findMatchingPreset('cydonia-v1.2-magnum-v4-22b');
    assertEq('cydonia × magnum wins over plain cydonia', cydMagnum?.id, 'cydonia-magnum-v4-22b');

    // Plain cydonia still matches its own preset
    const plainCyd = findMatchingPreset('thedrummer/cydonia-24b-v2');
    assertEq('plain cydonia matches cydonia-24b-v2', plainCyd?.id, 'cydonia-24b-v2');

    // v6.21.0 regression: model ids with feature suffixes ("thinking", etc.)
    // must still match. NanoGPT in particular emits model ids like
    // "deepseek/deepseek-v4-pro:thinking" — the previous v6.20.0 matcher
    // worked but only because of substring fallthrough; capture the case
    // explicitly so a future tightening of match logic doesn't regress it.
    const dsThinking = findMatchingPreset('deepseek/deepseek-v4-pro:thinking');
    assertEq('deepseek-v4-pro:thinking → deepseek-v4-pro preset', dsThinking?.id, 'deepseek-v4-pro');

    // v6.25.0: 4-7-thinking now resolves to the dedicated 4.7 preset, not 4.6
    const claudeThinking = findMatchingPreset('claude-opus-4-7-thinking');
    assertEq('claude-opus-4-7-thinking → claude-opus-4-7 preset', claudeThinking?.id, 'claude-opus-4-7');
}

// ═══════════════════════════════════════════════════════════════════════
// 3b. getActiveModelId — v6.21.0 fix for source-specific *_model fields
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── getActiveModelId source-aware probing ──');
{
    function _setCtx(cc, tg) {
        globalThis.SillyTavern.getContext = () => ({
            chatCompletionSettings: cc || {},
            textGenerationSettings: tg || {},
        });
    }
    // 1. NanoGPT (the user's case): chat_completion_source=nanogpt + nanogpt_model
    _setCtx({ chat_completion_source: 'nanogpt', nanogpt_model: 'deepseek/deepseek-v4-pro:thinking' });
    assertEq('NanoGPT source picks up nanogpt_model',
        getActiveModelId(), 'deepseek/deepseek-v4-pro:thinking');

    // 2. DeepSeek native API: chat_completion_source=deepseek + deepseek_model
    _setCtx({ chat_completion_source: 'deepseek', deepseek_model: 'deepseek-chat' });
    assertEq('DeepSeek source picks up deepseek_model',
        getActiveModelId(), 'deepseek-chat');

    // 3. Claude
    _setCtx({ chat_completion_source: 'claude', claude_model: 'claude-sonnet-4-6' });
    assertEq('Claude source picks up claude_model',
        getActiveModelId(), 'claude-sonnet-4-6');

    // 4. OpenRouter
    _setCtx({ chat_completion_source: 'openrouter', openrouter_model: 'anthropic/claude-opus-4-6' });
    assertEq('OpenRouter source picks up openrouter_model',
        getActiveModelId(), 'anthropic/claude-opus-4-6');

    // 5. Source unset but a *_model field IS populated → scan-fallback wins
    _setCtx({ openai_model: 'gpt-5.4' });
    assertEq('Scan fallback finds *_model when source missing',
        getActiveModelId(), 'gpt-5.4');

    // 6. Empty everything → '' (must not throw)
    _setCtx({}, {});
    assertEq('Empty context → empty string', getActiveModelId(), '');
}

// ═══════════════════════════════════════════════════════════════════════
// 4. buildPresetPatch — merges with existing overrides
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── buildPresetPatch merging ──');
{
    const preset = findPresetById('claude-sonnet-4-6');
    assertTrue('test fixture: claude preset exists', !!preset);
    // No existing profile → patch comes straight from preset
    {
        const patch = buildPresetPatch(preset, null);
        assertEq('null profile → systemPromptRole from preset',
            patch.systemPromptRole, 'user');
        assertEq('null profile → promptOverrides from preset',
            'role' in patch.promptOverrides, true);
    }
    // Existing profile with unrelated overrides → preserve them
    {
        const profile = {
            promptOverrides: {
                deltaMode: 'CUSTOM USER DELTA',
                language: 'CUSTOM USER LANG',
            },
            systemPromptRole: 'system',
        };
        const patch = buildPresetPatch(preset, profile);
        assertEq('existing deltaMode preserved',  patch.promptOverrides.deltaMode, 'CUSTOM USER DELTA');
        assertEq('existing language preserved',   patch.promptOverrides.language,  'CUSTOM USER LANG');
        assertEq('preset role added',             'role' in patch.promptOverrides, true);
        assertEq('preset role wins over default', patch.systemPromptRole, 'user');
    }
    // Preset with empty promptOverrides → only updates role
    {
        const minimalPreset = findPresetById('grok-4');
        assertTrue('grok-4 fixture exists', !!minimalPreset);
        const profile = {
            promptOverrides: { role: 'USER ROLE' },
            systemPromptRole: 'system',
        };
        const patch = buildPresetPatch(minimalPreset, profile);
        assertEq('user role preserved (preset has no role override)',
            patch.promptOverrides.role, 'USER ROLE');
    }
}

// ═══════════════════════════════════════════════════════════════════════
// 5. getPresetFamilies — diagnostic helper
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── getPresetFamilies ──');
{
    const families = getPresetFamilies();
    assertTrue('returns sorted array', Array.isArray(families) && families.length > 0);
    assertTrue('claude family present', families.includes('claude'));
    assertTrue('deepseek family present', families.includes('deepseek'));
    assertTrue('output is sorted', JSON.stringify(families) === JSON.stringify([...families].sort()));
}

// ─── Summary ──────────────────────────────────────────────────────────
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const total = pass + fail;
if (fail === 0) {
    console.log(`PASS ${pass}/${total}`);
} else {
    console.log(`FAIL ${fail}/${total} (${pass} passed)`);
    for (const f of failures.slice(0, 20)) console.log('  - ' + f.name);
    process.exit(1);
}
