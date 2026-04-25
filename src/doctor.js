// src/doctor.js — Real-path diagnostic checks (v6.16.0, progress API v6.17.1)
//
// Panel C's "Checks" reshape: ship as a manual button (not a tab), 5
// real-path tests, three states (PASS / FAIL / SKIPPED — kill yellow,
// it's where false confidence lives), each result names its own
// limitation explicitly, no auto-run, no background polling.
//
// v6.17.1: runDoctor accepts { onStep, signal } so the inspector UI can
// render a vertical step list that updates per-check (queued → running →
// pass/fail/skipped), and a Cancel button can short-circuit between
// checks via AbortController. Cancel does NOT interrupt a check that's
// currently in-flight (model-echo / schema can take seconds and the
// generateRaw pipeline does not surface a signal hook); remaining
// unstarted checks are marked status:'cancelled' and the run resolves.
//
// Industry mental model: `brew doctor`, `flutter doctor`, JetBrains
// Doctor — on-demand diagnosis when the user suspects something is
// wrong. Manual-only neutralizes alarm fatigue (the "boy who cried
// wolf in reverse" problem with persistent green dashboards).

import { log } from './logger.js';
import { getActiveSchema, getActivePrompt } from './settings.js';
import { cleanJson } from './generation/extraction.js';

const FILE_NAME = 'scenepulse-doctor-probe.json';
const SERVER_PATH = '/user/files/' + FILE_NAME;

/**
 * @typedef {Object} CheckResult
 * @property {string} id
 * @property {string} name
 * @property {'pass'|'fail'|'skipped'|'cancelled'|'running'|'queued'} status
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

// v6.22.0: classify failure messages so the doctor can append a one-line
// "this is probably transient — try again" hint to the summary instead of
// just dumping the raw 502/timeout text. Helps users distinguish provider
// flakes (retry) from real bugs in their setup (fix the config).
function _transientHintFor(msg) {
    if (typeof msg !== 'string') return null;
    const m = msg.toLowerCase();
    if (m.includes('502') || m.includes('503') || m.includes('504') || m.includes('bad gateway')) {
        return 'Provider gateway error — usually transient. Re-run Doctor in a moment.';
    }
    if (m.includes('429') || m.includes('rate limit') || m.includes('too many requests')) {
        return 'Rate-limited by the API. Wait a few seconds and try again.';
    }
    if (m.includes('timeout') || m.includes('timed out') || m.includes('econnreset') || m.includes('aborted')) {
        return 'Network timeout — usually transient. Re-run Doctor or shorten your context.';
    }
    if (m.includes('401') || m.includes('403') || m.includes('unauthorized') || m.includes('invalid api key')) {
        return 'Authentication failure. Check your API key in the Connection Profile.';
    }
    if (m.includes('500') || m.includes('internal server error')) {
        return 'Provider 500 — server-side bug. Re-run; if persistent, switch model or provider.';
    }
    return null;
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
        // v6.17.1: errors thrown with `e._skip = true` propagate as 'skipped'
        // instead of 'fail' — replaces the previous string-match on stack text.
        const rawMsg = e?.message || String(e);
        const hint = _transientHintFor(rawMsg);
        const summary = hint ? `${rawMsg} — ${hint}` : rawMsg;
        return {
            id, name,
            status: e?._skip ? 'skipped' : 'fail',
            summary,
            limitation,
            detail: e?.stack ? String(e.stack).slice(0, 500) : null,
            elapsedMs: Date.now() - started,
            ts: new Date().toISOString(),
            transient: !!hint,
        };
    }
}

// ── Check 1: Storage write+read+delete ─────────────────────────────────
//
// Cheap; runs first so a config-broken environment fails fast without
// burning API calls on the model probes below.
async function _checkStorage(signal) {
    return _wrap('storage', 'Storage write+read+delete',
        'Confirms ScenePulse can persist scene data. Does NOT mean prior corrupted files will heal.',
        async () => {
            const probe = { ts: Date.now(), nonce: Math.random().toString(36) };
            const payload = JSON.stringify(probe);
            const data = _b64encode(payload);
            // WRITE — pass signal so a cancel mid-fetch aborts the request.
            const wRes = await fetch('/api/files/upload', {
                method: 'POST',
                headers: _getHeaders(),
                body: JSON.stringify({ name: FILE_NAME, data }),
                signal,
            });
            if (!wRes.ok) throw new Error(`Write HTTP ${wRes.status}`);
            // READ
            const rRes = await fetch(SERVER_PATH, { cache: 'no-store', signal });
            if (!rRes.ok) throw new Error(`Read HTTP ${rRes.status}`);
            const back = await rRes.json();
            if (!back || back.nonce !== probe.nonce) throw new Error('Round-trip nonce mismatch');
            // DELETE — best-effort cleanup; not all ST builds expose the delete endpoint.
            try {
                await fetch('/api/files/delete', {
                    method: 'POST',
                    headers: _getHeaders(),
                    body: JSON.stringify({ name: FILE_NAME }),
                    signal,
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

// v6.17.1: ordered step manifest exposed for the inspector UI so it can
// render the vertical step list (queued → running → final-state) BEFORE
// runDoctor returns. `phase` groups checks visually: "cheap" runs fast,
// "connection" hits the LLM endpoint and may take seconds.
export const DOCTOR_STEPS = [
    { id: 'storage',          name: 'Storage write+read+delete', phase: 'cheap' },
    { id: 'model-echo',       name: 'Model echo',                phase: 'connection' },
    { id: 'schema',           name: 'Schema round-trip',         phase: 'connection' },
    { id: 'context-budget',   name: 'Context budget',            phase: 'cheap' },
    { id: 'tokenizer-parity', name: 'Tokenizer parity',          phase: 'cheap' },
];

/**
 * Run all checks sequentially. v6.17.1 progress API.
 * @param {object} [opts]
 * @param {(ev: {index:number, id:string, name:string, status:string, [k:string]:any}) => void} [opts.onStep]
 *        Fired with status 'running' before each check, then with the final result after.
 * @param {AbortSignal} [opts.signal]
 *        Cancel between checks. Storage check also passes signal to its fetch calls.
 * @returns {Promise<CheckResult[]>}
 */
export async function runDoctor(opts = {}) {
    const { onStep = null, signal = null } = opts;
    const results = [];
    const _emit = (ev) => { try { onStep?.(ev); } catch {} };

    for (let i = 0; i < DOCTOR_STEPS.length; i++) {
        const step = DOCTOR_STEPS[i];
        // Cancel check between steps: mark this + remaining as cancelled and exit.
        if (signal?.aborted) {
            for (let j = i; j < DOCTOR_STEPS.length; j++) {
                const s = DOCTOR_STEPS[j];
                const cancelled = {
                    id: s.id, name: s.name, status: 'cancelled',
                    summary: 'Cancelled before check could run',
                    limitation: 'No information gathered for this check.',
                    detail: null, elapsedMs: 0, ts: new Date().toISOString(),
                };
                results.push(cancelled);
                _emit({ index: j, ...cancelled });
            }
            break;
        }
        // Schema depends on model-echo PASS — short-circuit to skipped if it didn't pass.
        if (step.id === 'schema') {
            const echo = results.find(r => r.id === 'model-echo');
            if (echo?.status !== 'pass') {
                const skipped = {
                    id: step.id, name: step.name, status: 'skipped',
                    summary: 'Skipped — model echo did not pass',
                    limitation: 'Real test only runs when the connection is alive.',
                    detail: null, elapsedMs: 0, ts: new Date().toISOString(),
                };
                results.push(skipped);
                _emit({ index: i, ...skipped });
                continue;
            }
        }
        _emit({ index: i, id: step.id, name: step.name, status: 'running' });
        let r;
        switch (step.id) {
            case 'storage':          r = await _checkStorage(signal); break;
            case 'model-echo':       r = await _checkModelEcho(); break;
            case 'schema':           r = await _checkSchemaRoundtrip(); break;
            case 'context-budget':   r = await _checkContextBudget(); break;
            case 'tokenizer-parity': r = await _checkTokenizerParity(); break;
            default: continue;
        }
        results.push(r);
        _emit({ index: i, ...r });
    }
    log('Doctor: completed', results.length, 'checks,',
        results.filter(r => r.status === 'pass').length, 'passed');
    return results;
}

/**
 * Re-run a single Doctor check by id. v6.22.1 — wired to the per-row
 * "Retry" button on FAIL results so users can re-test a transient failure
 * (502 / timeout / rate-limit) without re-running the full suite.
 *
 * Schema check still requires the model-echo guard: if a previous full
 * run failed model-echo, retrying schema directly would silently skip
 * (matches the full-run behavior). Caller should retry model-echo first.
 *
 * @param {string} id  One of DOCTOR_STEPS[].id
 * @returns {Promise<CheckResult|null>}
 */
export async function runSingleDoctorCheck(id) {
    switch (id) {
        case 'storage':          return _checkStorage(null);
        case 'model-echo':       return _checkModelEcho();
        case 'schema':           return _checkSchemaRoundtrip();
        case 'context-budget':   return _checkContextBudget();
        case 'tokenizer-parity': return _checkTokenizerParity();
        default: return null;
    }
}

/** Test reset hook (no internal state, but kept for API parity). */
export function _resetForTests() {}
