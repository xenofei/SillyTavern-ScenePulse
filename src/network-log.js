// src/network-log.js — Outbound HTTP request capture (v6.16.0)
//
// Panel B's "Network tab" specification (3-panel review for v6.16.0):
// - Scoped, NOT global. Wrap only ScenePulse-controlled fetch call sites
//   via instrumentedFetch(label, fn). Global window.fetch patching breaks
//   across SillyTavern upgrades, captures noise we can't act on, and has
//   shown a six-month-rot pattern across the DevTools panel's experience.
// - Metadata-only ring buffer. Body capture lives in raw-pairs.js for
//   generation calls; storing it here too duplicates the leak surface.
// - Redact on capture, not on render. A renderer bug then can't leak
//   secrets that were never stored.
// - 50 entries (~20KB peak) — sized for a triage horizon, not a perf
//   tool. The DevTools 200-entry budget anchored on a 200MB allowance
//   ScenePulse doesn't have.
// - pairId linkage to raw-pairs entries — the Honeycomb panel's "killer
//   feature": generation network rows jump straight to the prompt+response
//   the inspector already captured.

const MAX_ENTRIES = 50;

/**
 * @typedef {Object} NetworkEntry
 * @property {string} id           Random id for jump-to references
 * @property {string} ts           ISO timestamp
 * @property {string} label        Caller-supplied tag ("generate", "portrait", "world-info")
 * @property {string} method
 * @property {string} urlRedacted  URL with query string + secret-shaped path segments removed
 * @property {number|null} status  HTTP status, or null on transport failure
 * @property {number} latencyMs    Wall-clock ms
 * @property {number} reqBytes     Approx request body size
 * @property {number} respBytes    Approx response body size
 * @property {string|null} errorKind  'transport' | 'http' | 'parseFailed' | null
 * @property {string|null} errorMessage
 * @property {string|null} pairId  Linkage to raw-pairs entry, when applicable
 */

/** @type {NetworkEntry[]} */
let _entries = [];
const _changeListeners = new Set();

function _notify() {
    for (const fn of _changeListeners) {
        try { fn({ count: _entries.length }); } catch {}
    }
}

// ── Redaction (apply in order — order matters per Panel B's recipe) ────

function _redactUrl(url) {
    if (!url || typeof url !== 'string') return '';
    let out = url;
    // Strip query string entirely — no whitelist; OpenRouter et al. put keys here.
    const qIdx = out.indexOf('?');
    if (qIdx >= 0) out = out.slice(0, qIdx) + '?[REDACTED]';
    // Path segments matching secret-shapes — broad but conservative.
    out = out
        .replace(/sk-(?:ant-)?[A-Za-z0-9_\-]{20,}/g, '[KEY]')
        .replace(/AIza[A-Za-z0-9_-]{35}/g, '[KEY]')
        .replace(/\/[A-Za-z0-9_-]{32,}/g, '/[KEY]');
    return out;
}

function _approxByteSize(body) {
    if (body == null) return 0;
    if (typeof body === 'string') return body.length;
    if (body instanceof FormData || body instanceof Blob) return body.size || 0;
    try { return JSON.stringify(body).length; } catch { return 0; }
}

// ── Public API ─────────────────────────────────────────────────────────

/**
 * Record a captured request. Called from instrumentedFetch's wrapper but
 * also exported so non-fetch network call sites (e.g. ST's own jQuery
 * AJAX wrapped via SillyTavern.getContext) can manually report.
 *
 * @param {Partial<NetworkEntry>} entry
 * @returns {NetworkEntry}
 */
export function record(entry) {
    const e = {
        id: Math.random().toString(36).slice(2, 10),
        ts: new Date().toISOString(),
        label: entry.label || 'unknown',
        method: entry.method || 'GET',
        urlRedacted: _redactUrl(entry.urlRedacted || entry.url || ''),
        status: typeof entry.status === 'number' ? entry.status : null,
        latencyMs: typeof entry.latencyMs === 'number' ? Math.round(entry.latencyMs) : 0,
        reqBytes: typeof entry.reqBytes === 'number' ? entry.reqBytes : 0,
        respBytes: typeof entry.respBytes === 'number' ? entry.respBytes : 0,
        errorKind: entry.errorKind || null,
        errorMessage: entry.errorMessage ? String(entry.errorMessage).slice(0, 300) : null,
        pairId: entry.pairId || null,
    };
    _entries.push(e);
    if (_entries.length > MAX_ENTRIES) _entries.splice(0, _entries.length - MAX_ENTRIES);
    _notify();
    return e;
}

/**
 * Wrap a fetch call so the request is recorded with timing + status.
 * Use at every ScenePulse-controlled fetch call site instead of bare fetch.
 *
 * @param {string} label  Short identifier for the call site
 * @param {string|Request} input  fetch's first arg
 * @param {RequestInit} [init]    fetch's second arg
 * @returns {Promise<Response>}
 */
export async function instrumentedFetch(label, input, init) {
    const started = performance?.now ? performance.now() : Date.now();
    const url = typeof input === 'string' ? input : (input?.url || '');
    const method = (init?.method || (typeof input === 'object' && input?.method) || 'GET').toUpperCase();
    const reqBytes = _approxByteSize(init?.body);
    let res, status = null, respBytes = 0, errorKind = null, errorMessage = null;
    try {
        res = await fetch(input, init);
        status = res.status;
        // We can't read the body here without consuming the stream the caller
        // will read. Use Content-Length when present; otherwise leave 0.
        const cl = res.headers?.get?.('content-length');
        respBytes = cl ? Number(cl) || 0 : 0;
        if (status >= 400) errorKind = 'http';
    } catch (e) {
        errorKind = 'transport';
        errorMessage = e?.message || String(e);
    }
    const latencyMs = (performance?.now ? performance.now() : Date.now()) - started;
    record({ label, method, url, status, latencyMs, reqBytes, respBytes, errorKind, errorMessage });
    if (errorKind === 'transport') throw new Error(errorMessage);
    return res;
}

/** Returns a shallow copy of the buffer (oldest first). */
export function getEntries() { return _entries.slice(); }

/** Returns the entry count. */
export function entryCount() { return _entries.length; }

/** Subscribe to entry-added/cleared events. Returns an unsubscribe fn. */
export function addChangeListener(fn) {
    if (typeof fn === 'function') _changeListeners.add(fn);
    return () => _changeListeners.delete(fn);
}

/** Clear the buffer. */
export function clearAll() {
    _entries = [];
    _notify();
}

/** Test reset hook. */
export function _resetForTests() {
    _entries = [];
    _changeListeners.clear();
}
