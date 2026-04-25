// src/doctor.js — Real-path diagnostic checks (v6.16.0)
//
// Panel C's "Checks" reshape: ship as a manual button (not a tab), 5
// real-path tests, three states (PASS / FAIL / SKIPPED — kill yellow,
// it's where false confidence lives), each result names its own
// limitation explicitly, no auto-run, no background polling.
//
// Industry mental model: `brew doctor`, `flutter doctor`, JetBrains
// Doctor — on-demand diagnosis when the user suspects something is
// wrong. Manual-only neutralizes alarm fatigue (the "boy who cried
// wolf in reverse" problem with persistent green dashboards).

import { log, warn } from './logger.js';
import { getSettings, getActiveSchema, getActivePrompt } from './settings.js';
import { cleanJson } from './generation/extraction.js';

const FILE_NAME = 'scenepulse-doctor-probe.json';
const SERVER_PATH = '/user/files/' + FILE_NAME;

/**
 * @typedef {Object} CheckResult
 * @property {string} id
 * @property {string} name
 * @property {'pass'|'fail'|'skipped'} status
 * @property {string} summary       One-line outcome
 * @property {string} limitation    What PASS does NOT mean (per Panel C — anti-false-confidence)
 * @property {string|null} detail   Verbatim error or extra info
 * @property {number} elapsedMs
 * @property {string} ts
 */

function _getHeaders() {
    let headers = { 'Content-Type': 'application/json' };
    try { const ctx = SillyTavern.getContext(); if (ctx.getRequestHeaders) headers = ctx.getRequestHeaders(); } catch {}
    return headers;
}

function _b64encode(str) {
    if (typeof btoa === 'function') {
        try { return btoa(unescape(encodeURIComponent(str))); }
        catch { return btoa(str); }
    }
    if (typeof Buffer !== 'undefined') return Buffer.from(str, 'utf8').toString('base64');
    return str;
}

async function _wrap(id, name, limitation, fn) {
    const started = Date.now();
    try {
        const out = await fn();
        return {
            id, name, status: 'pass',
            summary: out?.summary || 'OK',
            limitation,
            detail: out?.detail || null,
            elapsedMs: Date.now() - started,
            ts: new Date().toISOString(),
        };
    } catch (e) {
        return {
            id, name, status: 'fail',
            summary: e?.message || String(e),
            limitation,
            detail: e?.stack ? String(e.stack).slice(0, 500) : null,
            elapsedMs: Date.now() - started,
            ts: new Date().toISOString(),
        };
    }
}

// ── Check 1: Storage write+read+delete ─────────────────────────────────
//
// Cheap; runs first so a config-broken environment fails fast without
// burning API calls on the model probes below.
async function _checkStorage() {
    return _wrap('storage', 'Storage write+read+delete',
        'Confirms ScenePulse can persist scene data. Does NOT mean prior corrupted files will heal.',
        async () => {
            const probe = { ts: Date.now(), nonce: Math.random().toString(36) };
            const payload = JSON.stringify(probe);
            const data = _b64encode(payload);
            // WRITE
            const wRes = await fetch('/api/files/upload', {
                method: 'POST',
                headers: _getHeaders(),
                body: JSON.stringify({ name: FILE_NAME, data }),
            });
            if (!wRes.ok) throw new Error(`Write HTTP ${wRes.status}`);
            // READ
            const rRes = await fetch(SERVER_PATH, { cache: 'no-store' });
            if (!rRes.ok) throw new Error(`Read HTTP ${rRes.status}`);
            const back = await rRes.json();
            if (!back || back.nonce !== probe.nonce) throw new Error('Round-trip nonce mismatch');
            // DELETE — best-effort cleanup; not all ST builds expose the delete endpoint.
            try {
                await fetch('/api/files/delete', {
                    method: 'POST',
                    headers: _getHeaders(),
                    body: JSON.stringify({ name: FILE_NAME }),
                });
            } catch {}
            return { summary: 'Wrote + read + verified probe file' };
        });
}

// ── Check 2: Model echo ────────────────────────────────────────────────
//
// The most basic real-path test for the LLM connection. 1-token instruction.
async function _checkModelEcho() {
    return _wrap('model-echo', 'Model echo',
        'Configured connection profile reaches a model that answers. Does NOT mean the model will follow ScenePulse\'s schema.',
        async () => {
            const ctx = SillyTavern.getContext?.();
            if (!ctx?.generateRaw) throw new Error('SillyTavern.getContext().generateRaw is not available');
            const reply = await ctx.generateRaw({
                systemPrompt: 'You are a test endpoint. Reply with the single word ok and nothing else.',
                prompt: 'reply with: ok',
            });
            if (!reply || typeof reply !== 'string') throw new Error('No reply received');
            const trimmed = String(reply).trim().toLowerCase().replace(/[^a-z]/g, '');
            if (!trimmed.startsWith('ok')) throw new Error(`Reply did not start with "ok": "${String(reply).slice(0, 80)}"`);
            return { summary: `Replied in expected format (${reply.length} chars)`, detail: String(reply).slice(0, 200) };
        });
}

// ── Check 3: Schema round-trip ─────────────────────────────────────────
//
// Sends a minimal generation prompt to the model + parses with the live
// JSON schema. Most expensive check — only useful when checks 1 and 2 pass.
async function _checkSchemaRoundtrip() {
    return _wrap('schema', 'Schema round-trip',
        'Model can produce schema-conformant JSON for THIS profile right now. Does NOT mean every future generation will parse — model nondeterminism remains.',
        async () => {
            const ctx = SillyTavern.getContext?.();
            if (!ctx?.generateRaw) throw new Error('generateRaw unavailable');
            const schema = getActiveSchema();
            const sysPr = getActivePrompt();
            if (!schema || !sysPr) throw new Error('Active schema or system prompt is empty');
            const reply = await ctx.generateRaw({
                systemPrompt: sysPr,
                prompt: 'RECENT:\nThe sun is rising over the city.\n\nGenerate a minimal valid tracker JSON.',
            });
            if (!reply || typeof reply !== 'string') throw new Error('No reply');
            const parsed = cleanJson(reply);
            if (!parsed || typeof parsed !== 'object') throw new Error(`cleanJson returned ${parsed === null ? 'null' : typeof parsed}`);
            const keys = Object.keys(parsed);
            if (keys.length === 0) throw new Error('Parsed object has no keys');
            return { summary: `Parsed ${keys.length} top-level keys`, detail: `keys: ${keys.slice(0, 8).join(', ')}` };
        });
}

// ── Check 4: Context budget probe ──────────────────────────────────────
//
// Estimates whether the next generation's prompt will fit in the model's
// context window. Uses local 4-chars-per-token heuristic — same one
// engine.js uses to log promptTokens.
async function _checkContextBudget() {
    return _wrap('context-budget', 'Context budget',
        'Your next generation\'s prompt will fit. Does NOT mean output will be good — only that input won\'t truncate.',
        async () => {
            const sysPr = getActivePrompt() || '';
            const ctx = SillyTavern.getContext?.();
            const estimatedPromptTokens = Math.round(sysPr.length / 4) + 500; // headroom for chat context
            // Try to read context window from active connection settings; fall back to assumptions.
            const limit =
                ctx?.chatCompletionSettings?.openai_max_context
                || ctx?.textGenerationSettings?.max_context
                || 8192; // safe default; most models exceed this
            if (estimatedPromptTokens >= limit) {
                throw new Error(`System prompt alone (~${estimatedPromptTokens} tok) exceeds limit (${limit} tok)`);
            }
            const headroom = limit - estimatedPromptTokens;
            return {
                summary: `~${estimatedPromptTokens} prompt tokens vs ${limit} limit (~${headroom} headroom)`,
                detail: `Heuristic: chars/4. Real tokenizer may differ — see Tokenizer parity check.`,
            };
        });
}

// ── Check 5: Tokenizer parity ──────────────────────────────────────────
//
// Panel C's critical missing check: ST's tokenizer setting and the
// model's actual tokenizer can drift, especially with custom OpenAI-
// compatible endpoints. Compare local count to endpoint count for a
// known string. Skip if no tokenizer endpoint is reachable.
async function _checkTokenizerParity() {
    return _wrap('tokenizer-parity', 'Tokenizer parity',
        'Local token counter agrees (within 25%) with the endpoint that will actually count tokens. PASS does NOT guarantee perfect parity — only that the drift won\'t silently truncate prompts.',
        async () => {
            const ctx = SillyTavern.getContext?.();
            const tokenizers = ctx?.getTextGenServer ? ctx : null;
            const probe = 'The quick brown fox jumps over the lazy dog. Now is the time for all good people to come to the aid of their party.';
            const localEstimate = Math.round(probe.length / 4);
            // Try ST's getTokenCount API if it exists; otherwise SKIP rather than fail.
            if (typeof ctx?.getTokenCountAsync !== 'function') {
                const e = new Error('SillyTavern.getContext().getTokenCountAsync not available');
                e._skip = true;
                throw e;
            }
            const reported = await ctx.getTokenCountAsync(probe);
            if (typeof reported !== 'number') throw new Error(`Reported count is not a number: ${typeof reported}`);
            const delta = Math.abs(reported - localEstimate);
            const deltaPct = (delta / Math.max(localEstimate, 1)) * 100;
            if (deltaPct > 25) {
                throw new Error(`Local estimate ${localEstimate} vs endpoint ${reported} — ${deltaPct.toFixed(1)}% drift (>25% threshold)`);
            }
            return {
                summary: `Local ${localEstimate} ≈ endpoint ${reported} (${deltaPct.toFixed(1)}% delta)`,
                detail: `Probe: 28 words / ${probe.length} chars`,
            };
        });
}

/** Run all checks sequentially (cheap-first, model-probes last). */
export async function runDoctor() {
    const results = [];
    // Storage first — fail fast without burning API
    results.push(await _checkStorage());
    // Model echo before schema round-trip (cheaper, isolates connection vs schema)
    results.push(await _checkModelEcho());
    // Schema only if model echo passed (otherwise the failure is upstream)
    const echoOk = results[results.length - 1].status === 'pass';
    if (echoOk) {
        results.push(await _checkSchemaRoundtrip());
    } else {
        results.push({
            id: 'schema', name: 'Schema round-trip',
            status: 'skipped',
            summary: 'Skipped — model echo failed first',
            limitation: 'Real test only runs when the connection is alive.',
            detail: null,
            elapsedMs: 0, ts: new Date().toISOString(),
        });
    }
    // Cheap local checks
    results.push(await _checkContextBudget());
    // Tokenizer parity — special skip handling for missing API
    const tk = await _checkTokenizerParity();
    if (tk.status === 'fail' && tk.detail?.includes('not available') === false) {
        // Real failure — keep
        results.push(tk);
    } else if (tk.status === 'fail') {
        results.push({ ...tk, status: 'skipped', summary: tk.summary });
    } else {
        results.push(tk);
    }
    log('Doctor: completed', results.length, 'checks,',
        results.filter(r => r.status === 'pass').length, 'passed');
    return results;
}

/** Test reset hook (no internal state, but kept for API parity). */
export function _resetForTests() {}
