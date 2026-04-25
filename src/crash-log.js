// src/crash-log.js — Combined crash log (issue #13)
//
// Persistent error/warning log capturing failures from both ScenePulse
// AND the host SillyTavern instance. Three capture sources:
//
//   1. window.onerror               — synchronous JS errors
//   2. window.unhandledrejection    — promise rejections
//   3. logger.js err() bridge       — ScenePulse-internal errors
//
// Persistence is hybrid:
//   - in-memory ring buffer (MAX_ENTRIES) — primary read source
//   - localStorage mirror on every write   — instant, survives reload
//                                            even if server flush fails
//   - server flush to /user/files/         — durable across browsers
//     scenepulse-crash-log.json              and extension reinstalls
//
// Server reads/writes go through SillyTavern's /api/files/* endpoints
// (verified spike — see issue #13 thread). The literal "extension
// folder" path is not writable from browser-side code; per-user
// `data/<user>/user/files/` is the closest durable location.

const VERSION = 1;
const FILE_NAME = 'scenepulse-crash-log.json';
const SERVER_PATH = '/user/files/' + FILE_NAME;
const LS_KEY = 'scenepulse_crash_log_v1';
export const MAX_ENTRIES = 500;
const FLUSH_DEBOUNCE_MS = 2000;

const SOURCES = ['scenepulse', 'sillytavern', 'unknown'];
const SEVERITIES = ['error', 'warning', 'info'];

// In-memory ring buffer. Shared with the viewer.
let _entries = [];
let _flushTimer = null;
let _dirty = false;
let _initialized = false;
let _captureEnabled = true;
let _spVersion = '';
let _stVersion = '';

function _now() { return new Date().toISOString(); }

function _truncate(s, n) {
    if (typeof s !== 'string') return s;
    return s.length > n ? s.substring(0, n - 1) + '…' : s;
}

function _normalizeStack(stack) {
    if (!stack || typeof stack !== 'string') return '';
    // Keep first ~12 frames; longer stacks waste space and rarely add signal.
    const lines = stack.split('\n').slice(0, 12);
    return _truncate(lines.join('\n'), 4000);
}

function _normalizeMessage(msg) {
    if (msg == null) return '';
    if (typeof msg === 'string') return _truncate(msg, 800);
    if (msg instanceof Error) return _truncate(msg.message || String(msg), 800);
    try { return _truncate(JSON.stringify(msg), 800); }
    catch { return _truncate(String(msg), 800); }
}

function _stVersionFromContext() {
    try {
        const ctx = (typeof SillyTavern !== 'undefined' && SillyTavern.getContext)
            ? SillyTavern.getContext() : null;
        if (!ctx) return '';
        return ctx.version || (typeof ctx.getVersion === 'function' ? ctx.getVersion() : '') || '';
    } catch { return ''; }
}

// v6.15.3: Auto-capture context that's almost always available — chat ID,
// message index, character name, model name. Each lookup is independently
// try/catched so a single missing global doesn't suppress the rest. Caller
// can override or extend by passing their own context to captureError().
function _autoContext() {
    const out = {};
    try {
        const ctx = (typeof SillyTavern !== 'undefined' && SillyTavern.getContext)
            ? SillyTavern.getContext() : null;
        if (ctx) {
            try { if (ctx.chatId) out.chatId = String(ctx.chatId).slice(-12); } catch {}
            try { if (Array.isArray(ctx.chat)) out.mesIdx = ctx.chat.length - 1; } catch {}
            try { if (ctx.name2) out.character = String(ctx.name2).slice(0, 60); } catch {}
            try {
                const model = ctx.chatCompletionSettings?.openai_model
                    || ctx.textGenerationSettings?.preset
                    || ctx.mainApi || '';
                if (model) out.model = String(model).slice(0, 80);
            } catch {}
            try { if (ctx.groupId) out.groupChat = true; } catch {}
        }
    } catch {}
    try {
        if (typeof window !== 'undefined') {
            out.viewport = `${window.innerWidth}x${window.innerHeight}`;
        }
    } catch {}
    return out;
}

// ─── Public API ────────────────────────────────────────────────────────

/**
 * Capture an error/warning/info entry.
 * @param {object} opts
 * @param {'scenepulse'|'sillytavern'|'unknown'} opts.source
 * @param {'error'|'warning'|'info'} [opts.severity='error']
 * @param {string|Error} opts.message
 * @param {string} [opts.stack]
 * @param {object} [opts.context]   Extra metadata (mesIdx, generationMode, etc.)
 *                                   Caller is responsible for not leaking PII.
 */
export function captureError(opts) {
    if (!_captureEnabled) return null;
    if (!opts || typeof opts !== 'object') return null;
    const source = SOURCES.includes(opts.source) ? opts.source : 'unknown';
    const severity = SEVERITIES.includes(opts.severity) ? opts.severity : 'error';
    let stack = opts.stack;
    if (!stack && opts.message instanceof Error) stack = opts.message.stack;
    const entry = {
        ts: _now(),
        source,
        severity,
        message: _normalizeMessage(opts.message),
        stack: _normalizeStack(stack),
        context: opts.context && typeof opts.context === 'object'
            ? _truncateContext(opts.context) : null,
        spVersion: _spVersion,
        stVersion: _stVersion || _stVersionFromContext(),
    };
    // De-dupe consecutive identical entries — common when an error fires
    // both from console.error and from the global onerror handler.
    const last = _entries[_entries.length - 1];
    if (last && last.message === entry.message && last.stack === entry.stack
        && last.source === entry.source && last.severity === entry.severity) {
        last.repeat = (last.repeat || 1) + 1;
        last.ts = entry.ts;
        _scheduleSave();
        return last;
    }
    _entries.push(entry);
    if (_entries.length > MAX_ENTRIES) _entries.splice(0, _entries.length - MAX_ENTRIES);
    _scheduleSave();
    return entry;
}

function _truncateContext(ctx) {
    const out = {};
    let keys = 0;
    for (const k of Object.keys(ctx)) {
        if (keys++ >= 12) break;
        const v = ctx[k];
        if (v == null) { out[k] = v; continue; }
        if (typeof v === 'string') out[k] = _truncate(v, 200);
        else if (typeof v === 'number' || typeof v === 'boolean') out[k] = v;
        else { try { out[k] = _truncate(JSON.stringify(v), 200); } catch { out[k] = String(v); } }
    }
    return out;
}

export function getEntries() { return _entries.slice(); }
export function entryCount() { return _entries.length; }

export function clearAll() {
    _entries = [];
    try { localStorage.removeItem(LS_KEY); } catch {}
    _dirty = true;
    return _flushNow();
}

export function setCaptureEnabled(enabled) { _captureEnabled = !!enabled; }
export function isCaptureEnabled() { return _captureEnabled; }

/**
 * Initialize the crash-log subsystem. Idempotent.
 * - Loads prior entries from server file (then localStorage fallback)
 * - Installs window.onerror + unhandledrejection handlers
 * - Wraps the existing logger.err() so SP-internal errors get captured
 * - Schedules periodic flush + flush on beforeunload
 *
 * @param {object} opts
 * @param {string} [opts.spVersion]      Extension version for entry tagging
 * @param {function} [opts.setErrorListener]  Logger hook setter (logger.setErrorListener)
 */
export async function installCrashLog(opts = {}) {
    if (_initialized) return;
    _initialized = true;
    _spVersion = opts.spVersion || '';
    _stVersion = _stVersionFromContext();

    // 1. Load prior entries — server first (authoritative), localStorage fallback
    try {
        const res = await fetch(SERVER_PATH, { cache: 'no-store' });
        if (res.ok) {
            const json = await res.json();
            if (json && Array.isArray(json.entries)) {
                _entries = json.entries.slice(-MAX_ENTRIES);
            }
        }
    } catch {}
    if (!_entries.length) {
        try {
            const raw = localStorage.getItem(LS_KEY);
            if (raw) {
                const json = JSON.parse(raw);
                if (json && Array.isArray(json.entries)) {
                    _entries = json.entries.slice(-MAX_ENTRIES);
                }
            }
        } catch {}
    }

    // 2. Global error handler — taggs every browser-level error as
    //    sillytavern unless the stack mentions our extension folder.
    if (typeof window !== 'undefined') {
        window.addEventListener('error', _onWindowError);
        window.addEventListener('unhandledrejection', _onUnhandledRejection);
        window.addEventListener('beforeunload', () => { _flushNow(); });
    }

    // 3. Bridge from logger.err() so any SP internal error lands here too.
    //    The logger module exposes a setErrorListener hook to avoid
    //    circular imports / namespace-mutation issues.
    if (typeof opts.setErrorListener === 'function') {
        opts.setErrorListener((args) => {
            // v6.15.3: synthesize a stack when the err() call had no Error
            // object in args. Strips the bridge + listener frames so what
            // remains points to the actual err() callsite. Also auto-captures
            // SillyTavern context (chatId, mesIdx, character, model, viewport)
            // so users opening the entry see WHERE in their session the
            // failure happened, not just the message string.
            let stack = Array.isArray(args) ? _stackFromArgs(args) : '';
            if (!stack) {
                try {
                    const synth = new Error('synthetic-stack-marker').stack || '';
                    stack = synth
                        .split('\n')
                        .filter(l => !l.includes('synthetic-stack-marker')
                            && !l.includes('crash-log.js')
                            && !l.includes('logger.js'))
                        .slice(0, 12)
                        .join('\n');
                } catch {}
            }
            captureError({
                source: 'scenepulse', severity: 'error',
                message: Array.isArray(args) ? args.map(_argToString).join(' ') : _argToString(args),
                stack,
                context: _autoContext(),
            });
        });
    }
}

function _argToString(a) {
    if (a == null) return String(a);
    if (a instanceof Error) return a.message || String(a);
    if (typeof a === 'string') return a;
    if (typeof a === 'object') { try { return JSON.stringify(a).substring(0, 300); } catch { return String(a); } }
    return String(a);
}
function _stackFromArgs(args) {
    for (const a of args) if (a instanceof Error && a.stack) return a.stack;
    return '';
}

function _classifySource(stack) {
    if (typeof stack === 'string' && stack.includes('SillyTavern-ScenePulse')) return 'scenepulse';
    return 'sillytavern';
}

function _onWindowError(ev) {
    try {
        const msg = ev?.message || (ev?.error?.message) || 'Unknown error';
        const stack = ev?.error?.stack || '';
        // v6.15.3: merge filename/line/col with auto-captured ST context so the
        // user sees WHERE in their session the error occurred, not just where
        // in the JS source.
        captureError({
            source: _classifySource(stack), severity: 'error',
            message: msg, stack,
            context: { filename: ev?.filename, line: ev?.lineno, col: ev?.colno, ..._autoContext() },
        });
    } catch {}
}

function _onUnhandledRejection(ev) {
    try {
        const reason = ev?.reason;
        const msg = reason?.message || (typeof reason === 'string' ? reason : 'Unhandled promise rejection');
        const stack = reason?.stack || '';
        captureError({
            source: _classifySource(stack), severity: 'error',
            message: msg, stack,
            context: { kind: 'unhandledrejection', ..._autoContext() },
        });
    } catch {}
}

// ─── Persistence ───────────────────────────────────────────────────────

function _scheduleSave() {
    _dirty = true;
    // Mirror to localStorage immediately — survives a hard reload even
    // before the server flush completes.
    try {
        localStorage.setItem(LS_KEY, JSON.stringify({ v: VERSION, entries: _entries }));
    } catch (e) {
        // Quota exceeded — drop oldest half and retry once.
        try {
            _entries = _entries.slice(-Math.floor(MAX_ENTRIES / 2));
            localStorage.setItem(LS_KEY, JSON.stringify({ v: VERSION, entries: _entries }));
        } catch {}
    }
    if (_flushTimer) return;
    _flushTimer = setTimeout(() => { _flushTimer = null; _flushNow(); }, FLUSH_DEBOUNCE_MS);
}

async function _flushNow() {
    if (!_dirty) return;
    _dirty = false;
    const payload = JSON.stringify({ v: VERSION, entries: _entries });
    let headers = { 'Content-Type': 'application/json' };
    try {
        const ctx = SillyTavern.getContext();
        if (ctx?.getRequestHeaders) headers = ctx.getRequestHeaders();
    } catch {}
    try {
        const data = _b64encode(payload);
        const res = await fetch('/api/files/upload', {
            method: 'POST', headers,
            body: JSON.stringify({ name: FILE_NAME, data }),
        });
        if (!res.ok) {
            // Mark dirty again so the next scheduleSave retries.
            _dirty = true;
        }
    } catch {
        _dirty = true;
    }
}

// Manual flush — used by viewer's "Save now" button and by clearAll.
export function flushNow() { return _flushNow(); }

function _b64encode(str) {
    // Encode UTF-8 → base64 in the browser. btoa() doesn't handle
    // non-Latin1 characters; encodeURIComponent + unescape works
    // around it. In Node test envs (no btoa), Buffer is available.
    if (typeof btoa === 'function') {
        try {
            return btoa(unescape(encodeURIComponent(str)));
        } catch {
            return btoa(str);
        }
    }
    if (typeof Buffer !== 'undefined') return Buffer.from(str, 'utf8').toString('base64');
    return str;
}

// ─── Test hooks (exposed for tests/issue-13-crash-log.test.mjs) ─────
export function _resetForTests() {
    _entries = [];
    _initialized = false;
    _captureEnabled = true;
    _dirty = false;
    if (_flushTimer) { clearTimeout(_flushTimer); _flushTimer = null; }
    _spVersion = '';
    _stVersion = '';
}
