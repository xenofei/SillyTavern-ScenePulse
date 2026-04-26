#!/usr/bin/env node
// tools/refresh-or-stats.mjs — maintainer-run script
//
// Regenerates presets/or-stats.json by joining:
//   1. Live OpenRouter /api/v1/models data (pricing, context window) —
//      fetched fresh on every run. Public endpoint, no auth required.
//   2. Hand-curated tools/or-rankings.json (popularity rank, weekly tokens,
//      collection membership) — the maintainer transcribes this from
//      https://openrouter.ai/collections/roleplay periodically because
//      OR exposes no public popularity API.
//
// Output: presets/or-stats.json — consumed by src/presets/registry.js
// `getOrStats(preset)` at runtime. The preset browser surfaces the data
// as inline chips on each card (rank, weekly volume, cost, FREE flag,
// RP-collection badge).
//
// Usage (from project root):
//   node tools/refresh-or-stats.mjs
//
// On success: writes presets/or-stats.json and prints a summary. The
// maintainer reviews the diff and commits manually — this script does
// NOT auto-commit (per the v6.26.0 design discussion: stay manual so
// the maintainer eyeballs surprising changes).
//
// On failure: exits non-zero with a clear error. No partial writes.

import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const RANKINGS_PATH = resolve(__dirname, 'or-rankings.json');
const OUTPUT_PATH = resolve(PROJECT_ROOT, 'presets', 'or-stats.json');

const OR_MODELS_URL = 'https://openrouter.ai/api/v1/models';
const FETCH_TIMEOUT_MS = 15000;

async function fetchOpenRouterModels() {
    console.log('→ Fetching', OR_MODELS_URL);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
        const res = await fetch(OR_MODELS_URL, { signal: ctrl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
        const json = await res.json();
        if (!json || !Array.isArray(json.data)) {
            throw new Error('Response shape unexpected — expected { data: [...] }');
        }
        console.log(`  ↳ ${json.data.length} models returned`);
        return json.data;
    } finally {
        clearTimeout(timer);
    }
}

async function loadRankings() {
    console.log('→ Reading', RANKINGS_PATH);
    let raw;
    try {
        raw = await readFile(RANKINGS_PATH, 'utf8');
    } catch (e) {
        throw new Error(`Cannot read ${RANKINGS_PATH}: ${e.message}`);
    }
    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch (e) {
        throw new Error(`tools/or-rankings.json is not valid JSON: ${e.message}`);
    }
    if (!parsed || !Array.isArray(parsed.rankings)) {
        throw new Error('tools/or-rankings.json must contain a `rankings` array');
    }
    console.log(`  ↳ ${parsed.rankings.length} ranked entries; last updated ${parsed._lastUpdated || '(unknown)'}`);
    return parsed;
}

function modelMetaToStats(modelMeta) {
    // Convert a single OR /api/v1/models entry into a normalized stats entry.
    // Only extracts the fields ScenePulse cares about — everything else is
    // ignored (and out of scope for a roleplay tracker).
    const pricing = modelMeta.pricing || {};
    const inputPerToken = parseFloat(pricing.prompt || pricing.input || '0') || 0;
    const outputPerToken = parseFloat(pricing.completion || pricing.output || '0') || 0;
    return {
        contextLength: typeof modelMeta.context_length === 'number' ? modelMeta.context_length : null,
        // OR returns prices as USD per token; convert to USD per million tokens
        // for human-friendly display (the standard quote unit).
        pricing: {
            input: Number((inputPerToken * 1e6).toFixed(4)),
            output: Number((outputPerToken * 1e6).toFixed(4)),
        },
    };
}

function findOrMatch(rankingId, orModels) {
    // OR slugs use dated suffixes (`deepseek/deepseek-v4-pro-20260423`,
    // `anthropic/claude-4.7-opus-20260416`, `z-ai/glm-5-20260211`) that
    // hand-curated rankings can't predict. Match strategy, in order:
    //   1. Exact slug match (rare but cheap)
    //   2. The ranking id as a substring of an OR slug (covers dated suffixes)
    //   3. The ranking id's tail (model name without provider prefix) as a
    //      substring — handles `deepseek-v3.2` matching
    //      `deepseek/deepseek-v3.2-speciale-20251201`
    //
    // Among multiple substring matches, prefer the most-recent OR slug by
    // string sort (dates sort right with ISO-style YYYYMMDD suffixes).
    const needle = rankingId.toLowerCase();
    const tail = needle.includes('/') ? needle.split('/').pop() : needle;
    let best = null;
    for (const m of orModels) {
        const slug = (m.canonical_slug || m.id || '').toLowerCase();
        if (!slug) continue;
        if (slug === needle) return m; // exact wins immediately
        if (slug.includes(needle) || slug.includes(tail)) {
            if (!best || slug > (best.canonical_slug || best.id || '').toLowerCase()) {
                best = m;
            }
        }
    }
    return best;
}

function buildStats(orModels, rankings) {
    const stats = {};
    let matched = 0;
    let unmatched = 0;

    // Walk the hand-curated rankings; for each, find the live OR entry and
    // merge popularity + pricing/context. Stats are keyed by the human-
    // readable ranking modelId so the runtime registry helper can reason
    // about stable IDs that don't shift with OR's dated slug rotation.
    for (const rank of rankings.rankings) {
        const slug = String(rank.modelId || '').toLowerCase();
        if (!slug) continue;
        const orMeta = findOrMatch(slug, orModels);
        const entry = {
            weeklyTokens: rank.weeklyTokens || 0,
            rank: rank.rank || null,
            collections: Array.isArray(rank.collections) ? rank.collections : [],
        };
        if (orMeta) {
            const liveStats = modelMetaToStats(orMeta);
            Object.assign(entry, liveStats);
            entry.orSlug = orMeta.canonical_slug || orMeta.id || null;
            matched++;
        } else {
            // Hand-curated entry without a live OR match (model removed or
            // never on OR — local finetunes hosted on Featherless/Infermatic).
            // Keep the popularity data; pricing/context stay null.
            entry.contextLength = null;
            entry.pricing = null;
            entry.orSlug = null;
            unmatched++;
        }
        stats[slug] = entry;
    }

    return { stats, matched, unmatched };
}

async function main() {
    console.log('ScenePulse OR-stats refresh — generating presets/or-stats.json');
    console.log('');

    const [orModels, rankings] = await Promise.all([
        fetchOpenRouterModels(),
        loadRankings(),
    ]);

    const { stats, matched, unmatched } = buildStats(orModels, rankings);

    const output = {
        _generatedBy: 'tools/refresh-or-stats.mjs',
        _comment: 'Regenerate via `node tools/refresh-or-stats.mjs` from the project root. Do not edit by hand — modify tools/or-rankings.json (popularity) and re-run.',
        fetchedAt: new Date().toISOString(),
        rankingsLastUpdated: rankings._lastUpdated || null,
        modelCountFromOR: orModels.length,
        rankedEntries: rankings.rankings.length,
        matched,
        unmatched,
        stats,
    };

    const json = JSON.stringify(output, null, 2);
    await writeFile(OUTPUT_PATH, json + '\n', 'utf8');

    console.log('');
    console.log('✓ Wrote', OUTPUT_PATH);
    console.log(`  ↳ ${matched} ranked models matched live OR data`);
    console.log(`  ↳ ${unmatched} ranked models with no live OR match (kept popularity, pricing=null)`);
    console.log(`  ↳ Total stats entries: ${Object.keys(stats).length}`);
    console.log('');
    console.log('Review the diff and commit manually when ready.');
}

main().catch(err => {
    console.error('');
    console.error('✗ refresh-or-stats failed:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
});
