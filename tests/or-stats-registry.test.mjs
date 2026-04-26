// tests/or-stats-registry.test.mjs — v6.26.0 OpenRouter stats sidecar tests
//
// Verifies src/presets/registry.js helpers added for the popularity sort +
// inline OR chips:
//   - hasOrStats() — boolean: do we have stats data loaded
//   - getOrStats(preset) — match preset.matchPatterns against the stats keys
//   - getStatsTimestamp() — ISO date of last refresh
//
// Stubs `globalThis.fetch` to feed a synthetic or-stats.json payload, so
// the test doesn't depend on the actual presets/or-stats.json file or any
// network access.

import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

globalThis.SillyTavern = {
    getContext: () => ({ chatCompletionSettings: {}, textGenerationSettings: {} }),
};
if (typeof document === 'undefined') {
    globalThis.document = { querySelectorAll: () => [] };
}

// Real or-stats.json (post-script run) for a realistic baseline test.
const __dirname = dirname(fileURLToPath(import.meta.url));
const REAL_OR_STATS_PATH = resolve(__dirname, '..', 'presets', 'or-stats.json');
let REAL_OR_STATS = null;
try {
    REAL_OR_STATS = JSON.parse(await readFile(REAL_OR_STATS_PATH, 'utf8'));
} catch {
    // or-stats.json missing — acceptable for fresh checkouts; tests use
    // synthetic data only in that case.
}

// Synthetic stats payload used for matching-logic tests (independent of
// whatever's in the live or-stats.json so the tests stay deterministic).
// Stats keys mirror the v6.26.0 or-rankings.json convention: simple
// human-readable slugs that overlap (substring, either direction) with
// at least one of each preset's matchPatterns. The `orSlug` field
// preserves the live OR canonical_slug for display.
const SYNTHETIC = {
    fetchedAt: '2026-04-26T12:00:00.000Z',
    stats: {
        'deepseek-v3.2': {
            weeklyTokens: 1100000000000, rank: 1, collections: ['roleplay'],
            contextLength: 128000, pricing: { input: 0.27, output: 1.10 },
            orSlug: 'deepseek/deepseek-v3.2-20251201',
        },
        'claude-opus-4-7': {
            weeklyTokens: 18000000000, rank: 11, collections: ['roleplay'],
            contextLength: 200000, pricing: { input: 15.00, output: 75.00 },
            orSlug: 'anthropic/claude-4.7-opus-20260416',
        },
        'gemini-2.5-flash-lite': {
            weeklyTokens: 100000000000, rank: 4, collections: ['roleplay'],
            contextLength: 1000000, pricing: { input: 0, output: 0 },
            orSlug: 'google/gemini-2.5-flash-lite',
        },
        'cydonia-24b-v4': {
            weeklyTokens: 3500000000, rank: 23, collections: ['roleplay'],
            contextLength: null, pricing: null,
            orSlug: null,
        },
    },
};

let _activeStats = SYNTHETIC;
globalThis.fetch = async () => ({
    ok: true,
    async json() { return _activeStats; },
});

const { _resetOrStatsCache, getOrStats, getStatsTimestamp, hasOrStats } =
    await import('../src/presets/registry.js');

let pass = 0, fail = 0;
const failures = [];
function assertEq(name, actual, expected) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a === e) { pass++; console.log('  OK   ' + name); }
    else { fail++; failures.push({ name, actual: a, expected: e }); console.log('  FAIL ' + name + ' — expected ' + e + ', got ' + a); }
}
function assertTrue(name, v) { assertEq(name, !!v, true); }

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('OR stats registry — v6.26.0');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// ── hasOrStats / getStatsTimestamp ────────────────────────────────────
console.log('\n── hasOrStats / getStatsTimestamp ──');
_activeStats = SYNTHETIC;
_resetOrStatsCache();
assertTrue('hasOrStats true with stats loaded', await hasOrStats());
assertEq('getStatsTimestamp returns iso string', await getStatsTimestamp(), '2026-04-26T12:00:00.000Z');

_activeStats = { stats: {}, fetchedAt: null };
_resetOrStatsCache();
assertEq('hasOrStats false with empty stats', await hasOrStats(), false);
assertEq('getStatsTimestamp null when no fetchedAt', await getStatsTimestamp(), null);

// ── getOrStats matching ───────────────────────────────────────────────
console.log('\n── getOrStats matching ──');
_activeStats = SYNTHETIC;
_resetOrStatsCache();

{
    const deepseek = await getOrStats({ matchPatterns: ['deepseek-v3.2', 'deepseek/deepseek-v3.2'] });
    assertTrue('matches deepseek by pattern substring', deepseek);
    assertEq('deepseek rank', deepseek?.rank, 1);
    assertEq('deepseek weekly tokens', deepseek?.weeklyTokens, 1100000000000);
}
{
    const opus = await getOrStats({ matchPatterns: ['claude-opus-4-7', 'anthropic/claude-opus-4-7'] });
    assertTrue('matches claude opus 4.7', opus);
    assertEq('opus rank', opus?.rank, 11);
}
{
    const flashLite = await getOrStats({ matchPatterns: ['gemini-2.5-flash-lite'] });
    assertTrue('matches gemini flash lite', flashLite);
    assertEq('flash lite is free tier', flashLite?.pricing?.input, 0);
}
{
    const cydonia = await getOrStats({ matchPatterns: ['cydonia-24b-v4'] });
    assertTrue('matches cydonia v4', cydonia);
    assertEq('cydonia has null pricing (not on OR live API)', cydonia?.pricing, null);
}
{
    const noMatch = await getOrStats({ matchPatterns: ['totally-fake-model-xyz'] });
    assertEq('no match returns null', noMatch, null);
}
{
    const noPatterns = await getOrStats({ matchPatterns: [] });
    assertEq('empty matchPatterns returns null', noPatterns, null);
}
{
    const noPreset = await getOrStats(null);
    assertEq('null preset returns null', noPreset, null);
}

// ── Empty stats fallback ──────────────────────────────────────────────
console.log('\n── Empty stats fallback ──');
_activeStats = { stats: {}, fetchedAt: null };
_resetOrStatsCache();
{
    const noData = await getOrStats({ matchPatterns: ['deepseek-v3.2'] });
    assertEq('empty stats returns null even with valid pattern', noData, null);
}

// ── Real or-stats.json sanity (only runs if file exists) ──────────────
if (REAL_OR_STATS) {
    console.log('\n── Real or-stats.json sanity ──');
    _activeStats = REAL_OR_STATS;
    _resetOrStatsCache();
    assertTrue('real or-stats has roleplay rankings', await hasOrStats());
    const ts = await getStatsTimestamp();
    assertTrue('real or-stats has fetchedAt timestamp', typeof ts === 'string' && ts.length > 0);
    const deepseek = await getOrStats({ matchPatterns: ['deepseek-v3.2', 'deepseek/deepseek-v3.2'] });
    assertTrue('real or-stats matches DeepSeek V3.2', deepseek);
    if (deepseek) assertEq('DeepSeek V3.2 is rank 1', deepseek.rank, 1);
} else {
    console.log('\n  ⚠ presets/or-stats.json not found — skipping live-data sanity tests');
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
if (fail === 0) {
    console.log('PASS ' + pass + '/' + (pass + fail));
} else {
    console.log('FAIL ' + fail + ' / PASS ' + pass + ' (' + (pass + fail) + ' total)');
    for (const f of failures) console.log('  ' + f.name + ': expected ' + f.expected + ', got ' + f.actual);
    process.exit(1);
}
