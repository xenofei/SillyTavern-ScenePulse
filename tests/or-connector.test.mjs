// tests/or-connector.test.mjs — v6.27.0 OpenRouter runtime connector tests
//
// Verifies src/presets/or-connector.js refreshStats() failure modes,
// cache TTL, session-flag, cooldowns, and runtime overlay merge.
//
// Stubs globalThis.fetch + a minimal localStorage so the connector can
// run outside a browser. The connector ONLY hits OR's public models
// endpoint — no other external calls — so a single fetch stub suffices.

// ── Minimal browser-env shims ─────────────────────────────────────────
const _ls = new Map();
globalThis.localStorage = {
    getItem(k) { return _ls.has(k) ? _ls.get(k) : null; },
    setItem(k, v) { _ls.set(k, String(v)); },
    removeItem(k) { _ls.delete(k); },
    clear() { _ls.clear(); },
};

// SettingsBag — accumulates the saveSettings calls so we can assert on
// cooldown writes / orConnectorEnabled state. The real settings module
// exposes `getSettings()` returning a mutable object that `saveSettings`
// flushes; for these tests we just use one shared object.
const _settings = {
    orConnectorEnabled: true,
};
let _saveSettingsCalls = 0;

// jsdoc-light dependency mock: settings.js is what or-connector.js imports
// to read the toggle + write cooldowns. We override it via a small
// import-map fake — easiest path is to reach into the real module's
// exported state instead. Cleanest approach: provide a compatible
// settings shim by writing a tiny mock module to disk before import.
// But to avoid touching disk, we exploit the fact that or-connector.js
// imports `getSettings, saveSettings` from '../settings.js'. We can
// instead inject our shim by importing or-connector AFTER stubbing the
// module via the module loader hook.
//
// Simpler: import settings.js normally and patch its exports. The real
// settings.js depends on SillyTavern.getContext, which we stub.

globalThis.SillyTavern = {
    getContext: () => ({
        extensionSettings: { scenepulse: _settings },
        chatCompletionSettings: {}, textGenerationSettings: {},
        saveSettingsDebounced: () => {},
    }),
};
if (typeof document === 'undefined') {
    globalThis.document = { querySelectorAll: () => [] };
}

// jQuery is referenced in some settings paths but not by or-connector
// directly. Stub minimally to avoid import-time side effects.
globalThis.$ = globalThis.jQuery = (() => {
    const fn = () => ({ length: 0, on: () => {}, val: () => '', html: () => {}, prop: () => {}, toggle: () => {}, find: () => ({ length: 0 }), each: () => {} });
    fn.fn = {};
    return fn;
})();

// Real OR `/api/v1/models` payload shape — minimal subset that the
// connector parses. Two entries cover both pricing modes (paid + free).
const SYNTHETIC_OR_PAYLOAD = {
    data: [
        {
            id: 'deepseek/deepseek-v3.2-speciale-20251201',
            canonical_slug: 'deepseek/deepseek-v3.2-speciale-20251201',
            context_length: 163840,
            pricing: { prompt: '0.0000004', completion: '0.0000012' },
        },
        {
            id: 'google/gemini-2.5-flash-lite',
            canonical_slug: 'google/gemini-2.5-flash-lite',
            context_length: 1000000,
            pricing: { prompt: '0', completion: '0' },
        },
    ],
};

// fetch state machine — drives the connector's failure-mode tests.
let _fetchMode = 'ok'; // 'ok' | 'http429' | 'http500' | 'http403' | 'shape' | 'parsefail' | 'timeout' | 'network'
globalThis.fetch = async (_url, opts = {}) => {
    if (_fetchMode === 'timeout') {
        return new Promise((_, reject) => {
            const sig = opts.signal;
            if (sig) sig.addEventListener('abort', () => {
                const e = new Error('aborted'); e.name = 'AbortError'; reject(e);
            });
            // Don't resolve — let AbortController fire after 3s. Tests
            // override FETCH_TIMEOUT via a shorter delay.
        });
    }
    if (_fetchMode === 'network') throw new Error('ENETUNREACH');
    if (_fetchMode === 'http429') return { ok: false, status: 429, async json() { return {}; } };
    if (_fetchMode === 'http500') return { ok: false, status: 503, async json() { return {}; } };
    if (_fetchMode === 'http403') return { ok: false, status: 403, async json() { return {}; } };
    if (_fetchMode === 'parsefail') return { ok: true, status: 200, async json() { throw new Error('not json'); } };
    if (_fetchMode === 'shape')    return { ok: true, status: 200, async json() { return { not_data: 'whoops' }; } };
    return { ok: true, status: 200, async json() { return SYNTHETIC_OR_PAYLOAD; } };
};

// Wire saveSettingsDebounced to the counter so cooldown-set tests can
// assert that the connector actually called saveSettings (which calls
// saveSettingsDebounced). The connector imports settings.js directly,
// which reads extensionSettings.scenepulse from SillyTavern.getContext
// — so as long as that returns _settings, mutations are visible.
globalThis.SillyTavern.getContext = () => ({
    extensionSettings: { scenepulse: _settings },
    chatCompletionSettings: {}, textGenerationSettings: {},
    saveSettingsDebounced: () => { _saveSettingsCalls++; },
});

const { invalidateSettingsCache } = await import('../src/settings.js');
const { refreshStats, getRuntimeOverlay, getLastRefreshAt, _resetForTests } =
    await import('../src/presets/or-connector.js');

// ── Test harness ──────────────────────────────────────────────────────
let pass = 0, fail = 0;
const failures = [];
function assertEq(name, actual, expected) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a === e) { pass++; console.log('  OK   ' + name); }
    else { fail++; failures.push({ name, actual: a, expected: e }); console.log('  FAIL ' + name + ' — expected ' + e + ', got ' + a); }
}
function assertTrue(name, v) { assertEq(name, !!v, true); }

function resetWorld() {
    _ls.clear();
    _saveSettingsCalls = 0;
    _resetForTests();
    delete _settings._spOrConnectorCorsCooldownUntil;
    delete _settings._spOrConnectorRateCooldownUntil;
    _settings.orConnectorEnabled = true;
    invalidateSettingsCache();
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('OR connector — v6.27.0');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// ── Toggle gating ─────────────────────────────────────────────────────
console.log('\n── Toggle gating ──');
resetWorld();
_settings.orConnectorEnabled = false;
{
    const r = await refreshStats({ silent: true });
    assertEq('disabled toggle skips silently', r, { ok: true, refreshed: false, reason: 'disabled' });
    assertEq('disabled toggle: no fetch overlay', getRuntimeOverlay(), null);
}

// Force=true MUST bypass disabled toggle (manual button works even when
// the user has the auto-refresh off and just wants a one-shot pull).
{
    resetWorld();
    _settings.orConnectorEnabled = false;
    _fetchMode = 'ok';
    const r = await refreshStats({ silent: false, force: true });
    assertEq('force=true bypasses disabled toggle', r.refreshed, true);
}

// ── Successful refresh ────────────────────────────────────────────────
console.log('\n── Successful refresh ──');
resetWorld();
_fetchMode = 'ok';
{
    const r = await refreshStats({ silent: true });
    assertEq('first refresh ok', r.ok, true);
    assertEq('first refresh count = 2 models', r.count, 2);
    const ov = getRuntimeOverlay();
    assertTrue('overlay exists after refresh', ov);
    assertTrue('overlay has bySlug map', ov?.bySlug);
    assertTrue('overlay has deepseek slug', ov?.bySlug?.['deepseek/deepseek-v3.2-speciale-20251201']);
    const ds = ov?.bySlug?.['deepseek/deepseek-v3.2-speciale-20251201'];
    assertEq('deepseek context_length captured', ds?.contextLength, 163840);
    assertEq('deepseek input price (per M tokens)', ds?.pricing?.input, 0.4);
    assertEq('deepseek output price (per M tokens)', ds?.pricing?.output, 1.2);
    const flash = ov?.bySlug?.['google/gemini-2.5-flash-lite'];
    assertEq('flash-lite is free tier', flash?.pricing?.input, 0);
}

// ── Session flag prevents repeat auto-refreshes ───────────────────────
console.log('\n── Session flag ──');
{
    // After previous successful refresh, second silent call should bail.
    const r = await refreshStats({ silent: true });
    assertEq('second silent call bails (cache fresh OR session-already-tried)',
        ['cache-fresh', 'session-already-tried'].includes(r.reason), true);
}
{
    // Force bypasses the session flag.
    const r = await refreshStats({ silent: false, force: true });
    assertEq('force=true bypasses session flag', r.refreshed, true);
}

// ── Cache TTL / freshness ─────────────────────────────────────────────
console.log('\n── Cache TTL ──');
resetWorld();
_fetchMode = 'ok';
{
    await refreshStats({ silent: false, force: true });
    const ov = getRuntimeOverlay();
    assertTrue('fresh cache returned by getRuntimeOverlay', ov);
}
{
    // Manually expire the cache by rewriting localStorage.
    const raw = JSON.parse(_ls.get('sp_openrouter_cache_v1'));
    raw.expiresAt = Date.now() - 1000;
    _ls.set('sp_openrouter_cache_v1', JSON.stringify(raw));
    _resetForTests(); // clear in-memory mirror so we re-read LS
    const ov = getRuntimeOverlay();
    assertEq('expired cache returns null', ov, null);
}

// ── 429 rate-limit cooldown ───────────────────────────────────────────
console.log('\n── 429 cooldown ──');
resetWorld();
_fetchMode = 'http429';
{
    const r = await refreshStats({ silent: false, force: true });
    assertEq('429 returns rate-limit reason', r.reason, 'rate-limit');
    assertTrue('429 sets rate cooldown', _settings._spOrConnectorRateCooldownUntil);
    assertTrue('429 calls saveSettings', _saveSettingsCalls > 0);
}
{
    // Within cooldown window, a non-forced refresh must skip.
    _resetForTests();
    _fetchMode = 'ok';
    const r = await refreshStats({ silent: true });
    assertTrue('rate cooldown blocks silent refresh',
        r.reason && r.reason.startsWith('cooldown'));
}

// ── 5xx returns error without cooldown ────────────────────────────────
console.log('\n── 5xx no-cooldown ──');
resetWorld();
_fetchMode = 'http500';
{
    const r = await refreshStats({ silent: false, force: true });
    assertEq('5xx returns server reason', r.reason, 'server');
    assertEq('5xx does NOT set cors cooldown', _settings._spOrConnectorCorsCooldownUntil, undefined);
    assertEq('5xx does NOT set rate cooldown', _settings._spOrConnectorRateCooldownUntil, undefined);
}

// ── 4xx (CORS / shape failure) sets 1-day cooldown ────────────────────
console.log('\n── 4xx CORS cooldown ──');
resetWorld();
_fetchMode = 'http403';
{
    const r = await refreshStats({ silent: false, force: true });
    assertEq('403 returns http reason', r.reason, 'http');
    assertTrue('403 sets cors cooldown', _settings._spOrConnectorCorsCooldownUntil);
    const dayMs = 24 * 60 * 60 * 1000;
    const until = _settings._spOrConnectorCorsCooldownUntil;
    const remaining = until - Date.now();
    assertTrue('cors cooldown ~24h', remaining > dayMs - 5000 && remaining <= dayMs);
}

// ── Shape-mismatch sets cors cooldown (defensive) ─────────────────────
console.log('\n── Shape-mismatch cooldown ──');
resetWorld();
_fetchMode = 'shape';
{
    const r = await refreshStats({ silent: false, force: true });
    assertEq('shape mismatch returns shape reason', r.reason, 'shape');
    assertTrue('shape mismatch sets cors cooldown', _settings._spOrConnectorCorsCooldownUntil);
}

// ── Parse failure sets cors cooldown ──────────────────────────────────
console.log('\n── Parse-failure cooldown ──');
resetWorld();
_fetchMode = 'parsefail';
{
    const r = await refreshStats({ silent: false, force: true });
    assertEq('parse fail returns parse reason', r.reason, 'parse');
    assertTrue('parse fail sets cors cooldown', _settings._spOrConnectorCorsCooldownUntil);
}

// ── Network error: skip silently, no cooldown ─────────────────────────
console.log('\n── Network error ──');
resetWorld();
_fetchMode = 'network';
{
    const r = await refreshStats({ silent: false, force: true });
    assertEq('network error returns network reason', r.reason, 'network');
    assertEq('network error does NOT set cors cooldown',
        _settings._spOrConnectorCorsCooldownUntil, undefined);
    assertEq('network error does NOT set rate cooldown',
        _settings._spOrConnectorRateCooldownUntil, undefined);
}

// ── Successful refresh clears stale cooldowns ─────────────────────────
console.log('\n── Cooldown clearing ──');
resetWorld();
_settings._spOrConnectorCorsCooldownUntil = Date.now() - 1000; // expired-but-set
_fetchMode = 'ok';
{
    const r = await refreshStats({ silent: false, force: true });
    assertEq('successful refresh ok', r.ok, true);
    assertEq('successful refresh clears cors cooldown',
        _settings._spOrConnectorCorsCooldownUntil, undefined);
}

// ── getLastRefreshAt ──────────────────────────────────────────────────
console.log('\n── getLastRefreshAt ──');
resetWorld();
_fetchMode = 'ok';
{
    assertEq('no cache → null timestamp', getLastRefreshAt(), null);
    await refreshStats({ silent: false, force: true });
    const ts = getLastRefreshAt();
    assertTrue('after refresh, getLastRefreshAt returns ISO string',
        typeof ts === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(ts));
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
if (fail === 0) {
    console.log('PASS ' + pass + '/' + (pass + fail));
} else {
    console.log('FAIL ' + fail + ' / PASS ' + pass + ' (' + (pass + fail) + ' total)');
    for (const f of failures) console.log('  ' + f.name + ': expected ' + f.expected + ', got ' + f.actual);
    process.exit(1);
}
