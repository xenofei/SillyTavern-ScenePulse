// src/raw-pairs.js — Ring buffer of {prompt, response} pairs (v6.15.6)
//
// Panel B's critical-missing addition from the v6.15.4 inspector synthesis:
// "To diagnose JSON-mode dropouts you need the actual bytes the model emitted,
//  before any cleaning, alongside the system prompt + last user turn that
//  elicited it. Without it, every parse-fail report becomes a guessing game."
//
// Captured alongside setLastRawResponse() at every generation callsite. The
// Last Response tab navigates between pairs; the Diagnostics bundle includes
// the latest pair (prompt + response) instead of just the response.
//
// Memory budget: 10 pairs × (avg ~10KB prompt + ~3KB response) ≈ 130KB peak.
// Both are truncated to MAX_FIELD_CHARS to defend against 1MB+ prompts.

const MAX_PAIRS = 10;
const MAX_FIELD_CHARS = 200_000; // ~50K tokens — generous but bounded

/** @typedef {{ ts: string, mesIdx: number|null, prompt: string, response: string, source: string, parseFailed: boolean, parseError: string|null }} RawPair */

/** @type {RawPair[]} */
let _pairs = [];

function _truncate(s, n) {
    if (typeof s !== 'string') return '';
    return s.length > n ? s.substring(0, n - 1) + '…' : s;
}

/**
 * Push a new pair into the ring buffer.
 *
 * @param {object} opts
 * @param {string} opts.prompt    Full prompt sent to the model
 * @param {string} opts.response  Raw response received (pre-clean)
 * @param {number|null} [opts.mesIdx]  ST chat index, if known
 * @param {string} [opts.source]  'engine'|'pipeline'|'continuation'|'fallback'
 */
export function pushPair(opts) {
    if (!opts || typeof opts !== 'object') return null;
    const pair = {
        // v6.16.0: stable id for cross-references — Network tab rows link
        // back to their pair via this id.
        id: 'pair-' + Math.random().toString(36).slice(2, 10),
        ts: new Date().toISOString(),
        mesIdx: typeof opts.mesIdx === 'number' ? opts.mesIdx : null,
        prompt: _truncate(opts.prompt, MAX_FIELD_CHARS),
        response: _truncate(opts.response, MAX_FIELD_CHARS),
        source: opts.source || 'unknown',
        parseFailed: !!opts.parseFailed,
        parseError: opts.parseError || null,
    };
    _pairs.push(pair);
    if (_pairs.length > MAX_PAIRS) _pairs.splice(0, _pairs.length - MAX_PAIRS);
    return pair;
}

/**
 * Mark the most recent pair as having failed to parse, with optional error
 * message. Called from cleanJson / parse-fail paths so the inspector can
 * highlight which pairs were the actual problems.
 */
export function markLastPairParseFailed(errorMessage) {
    const last = _pairs[_pairs.length - 1];
    if (last) {
        last.parseFailed = true;
        last.parseError = errorMessage ? String(errorMessage).slice(0, 500) : null;
    }
}

/** Returns a shallow copy of the pair buffer, oldest first. */
export function getPairs() { return _pairs.slice(); }

/** Returns the most recent pair, or null. */
export function lastPair() { return _pairs[_pairs.length - 1] || null; }

/** Returns count of pairs currently in the buffer. */
export function pairCount() { return _pairs.length; }

/** Clear the buffer. */
export function clearPairs() { _pairs = []; }

/** Test reset hook. */
export function _resetForTests() { _pairs = []; }
