// tests/issue-13-crash-log.test.mjs — v6.12.5
//
// Coverage for the crash-log module's algorithmic surface: capture,
// ring-buffer eviction, severity / source classification, dedup of
// repeated identical entries, context truncation, and the
// localStorage mirror.
//
// The server flush path is exercised by stubbing fetch and asserting
// the upload payload shape; the actual /api/files/upload integration
// is verified manually in-browser per the spike (issue #13).
//
// Run: node tests/issue-13-crash-log.test.mjs

// ─── Stubs ─────────────────────────────────────────────────────────────
const _stCtx = {
    version: '1.17.0',
    chatMetadata: { scenepulse: { snapshots: {} } },
    extensionSettings: { scenepulse: {} },
    getRequestHeaders: () => ({ 'Content-Type': 'application/json', 'X-CSRF-Token': 'test-token' }),
    saveMetadata: () => {},
    saveSettingsDebounced: () => {},
};
globalThis.SillyTavern = { getContext: () => _stCtx };
globalThis.toastr = { error: () => {}, warning: () => {}, info: () => {}, success: () => {} };

// localStorage stub — Node has no DOM by default
const _lsStore = new Map();
globalThis.localStorage = {
    getItem: (k) => (_lsStore.has(k) ? _lsStore.get(k) : null),
    setItem: (k, v) => _lsStore.set(k, String(v)),
    removeItem: (k) => _lsStore.delete(k),
    clear: () => _lsStore.clear(),
};

// fetch stub — capture the most recent upload payload, return 404 on
// initial server load so the loader falls through to localStorage.
let _lastUpload = null;
let _serverFile = null; // { entries: [...] } | null
globalThis.fetch = async (url, opts = {}) => {
    if (typeof url === 'string' && url.endsWith('scenepulse-crash-log.json') && (!opts.method || opts.method === 'GET')) {
        if (_serverFile) {
            return { ok: true, status: 200, json: async () => _serverFile };
        }
        return { ok: false, status: 404, json: async () => ({}) };
    }
    if (typeof url === 'string' && url.includes('/api/files/upload')) {
        try {
            const body = JSON.parse(opts.body);
            _lastUpload = body;
            // Decode the base64 payload so tests can inspect it.
            try {
                const decoded = Buffer.from(body.data, 'base64').toString('utf8');
                _lastUpload._decoded = JSON.parse(decoded);
                _serverFile = _lastUpload._decoded; // mirror to "server"
            } catch {}
        } catch {}
        return { ok: true, status: 200, json: async () => ({ path: '/user/files/scenepulse-crash-log.json' }) };
    }
    return { ok: false, status: 404, json: async () => ({}) };
};

if (typeof document === 'undefined') {
    globalThis.document = {
        createElement: () => ({ style: {} }),
        body: { appendChild: () => {} },
        addEventListener: () => {},
    };
}
if (typeof window === 'undefined') {
    globalThis.window = { addEventListener: () => {} };
}

const cl = await import('../src/crash-log.js');
const logger = await import('../src/logger.js');

// ─── Assertion helpers ─────────────────────────────────────────────────
let pass = 0, fail = 0;
const failures = [];
function assertEq(name, actual, expected) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a === e) { pass++; console.log('  OK   ' + name); }
    else {
        fail++;
        failures.push({ name, actual: a, expected: e });
        console.log('  FAIL ' + name + ' — expected ' + e + ', got ' + a);
    }
}
function assertTrue(name, v) { assertEq(name, !!v, true); }

// Helper: wait briefly so the debounced flush can fire.
async function waitFlush() { await new Promise(r => setTimeout(r, 2200)); }

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('issue #13 — crash log capture + persistence');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// ═══════════════════════════════════════════════════════════════════════
// 1. Basic capture + ring buffer
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 1: capture + ring buffer ──');
{
    cl._resetForTests();
    _lsStore.clear();
    _serverFile = null;

    cl.captureError({ source: 'scenepulse', severity: 'error', message: 'boom' });
    cl.captureError({ source: 'sillytavern', severity: 'warning', message: 'careful' });
    cl.captureError({ source: 'unknown', severity: 'info', message: 'fyi' });

    const all = cl.getEntries();
    assertEq('three entries captured', all.length, 3);
    assertEq('entry 0 source', all[0].source, 'scenepulse');
    assertEq('entry 1 severity', all[1].severity, 'warning');
    assertEq('entry 2 severity', all[2].severity, 'info');
    assertTrue('entries have timestamps', !!all[0].ts);
}

// ═══════════════════════════════════════════════════════════════════════
// 2. Source / severity normalization
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 2: source / severity normalization ──');
{
    cl._resetForTests();
    cl.captureError({ source: 'BOGUS', severity: 'CRITICAL', message: 'x' });
    const e = cl.getEntries()[0];
    assertEq('unknown source clamped', e.source, 'unknown');
    assertEq('unknown severity clamped to error', e.severity, 'error');
}

// ═══════════════════════════════════════════════════════════════════════
// 3. Dedup of repeated identical entries
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 3: dedup of repeated entries ──');
{
    cl._resetForTests();
    for (let i = 0; i < 5; i++) {
        cl.captureError({ source: 'scenepulse', severity: 'error', message: 'same', stack: 'stack' });
    }
    const all = cl.getEntries();
    assertEq('one entry kept', all.length, 1);
    assertEq('repeat counter = 5', all[0].repeat, 5);
}

// ═══════════════════════════════════════════════════════════════════════
// 4. Ring buffer eviction at MAX_ENTRIES
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 4: ring buffer eviction ──');
{
    cl._resetForTests();
    for (let i = 0; i < cl.MAX_ENTRIES + 50; i++) {
        cl.captureError({ source: 'scenepulse', severity: 'error', message: 'msg ' + i });
    }
    const all = cl.getEntries();
    assertEq('capped at MAX_ENTRIES', all.length, cl.MAX_ENTRIES);
    assertEq('oldest evicted (msg 50 first)', all[0].message, 'msg 50');
    assertEq('newest preserved', all[all.length - 1].message, 'msg ' + (cl.MAX_ENTRIES + 49));
}

// ═══════════════════════════════════════════════════════════════════════
// 5. Error object + stack normalization
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 5: Error object + stack ──');
{
    cl._resetForTests();
    const errObj = new Error('something broke');
    errObj.stack = ['Error: something broke', '    at foo (file.js:10)', '    at bar (file.js:20)'].join('\n');
    cl.captureError({ source: 'scenepulse', message: errObj });
    const e = cl.getEntries()[0];
    assertEq('message extracted from Error', e.message, 'something broke');
    assertTrue('stack captured', e.stack.includes('at foo'));
}

// ═══════════════════════════════════════════════════════════════════════
// 6. Context truncation
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 6: context truncation ──');
{
    cl._resetForTests();
    const longCtx = { bigString: 'x'.repeat(500) };
    for (let i = 0; i < 30; i++) longCtx['k' + i] = 'v' + i;
    cl.captureError({ source: 'scenepulse', message: 'with ctx', context: longCtx });
    const e = cl.getEntries()[0];
    const keys = Object.keys(e.context);
    assertEq('context capped at 12 keys', keys.length, 12);
    assertTrue('big string truncated', e.context.bigString.length <= 200);
}

// ═══════════════════════════════════════════════════════════════════════
// 7. localStorage mirror after every capture
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 7: localStorage mirror ──');
{
    cl._resetForTests();
    _lsStore.clear();
    cl.captureError({ source: 'scenepulse', message: 'first' });
    cl.captureError({ source: 'scenepulse', message: 'second' });
    const raw = _lsStore.get('scenepulse_crash_log_v1');
    assertTrue('localStorage written', !!raw);
    const parsed = JSON.parse(raw);
    assertEq('localStorage entries.length', parsed.entries.length, 2);
    assertEq('localStorage v', parsed.v, 1);
}

// ═══════════════════════════════════════════════════════════════════════
// 8. clearAll wipes both memory and localStorage
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 8: clearAll ──');
{
    cl._resetForTests();
    cl.captureError({ source: 'scenepulse', message: 'x' });
    assertEq('1 entry before clear', cl.entryCount(), 1);
    await cl.clearAll();
    assertEq('0 entries after clear', cl.entryCount(), 0);
    assertEq('localStorage cleared', _lsStore.get('scenepulse_crash_log_v1') ?? null, null);
}

// ═══════════════════════════════════════════════════════════════════════
// 9. Server flush: upload payload shape
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 9: server flush payload ──');
{
    cl._resetForTests();
    _lastUpload = null;
    cl.captureError({ source: 'scenepulse', message: 'flush me' });
    await waitFlush();
    assertTrue('upload was called', !!_lastUpload);
    assertEq('upload filename', _lastUpload?.name, 'scenepulse-crash-log.json');
    assertTrue('upload data is base64', typeof _lastUpload?.data === 'string' && _lastUpload.data.length > 0);
    assertTrue('decoded payload has entries', Array.isArray(_lastUpload?._decoded?.entries));
    assertEq('decoded entry count = 1', _lastUpload?._decoded?.entries?.length, 1);
    assertEq('decoded entry message', _lastUpload?._decoded?.entries?.[0]?.message, 'flush me');
}

// ═══════════════════════════════════════════════════════════════════════
// 10. Init loads from server when present
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 10: init loads from server ──');
{
    cl._resetForTests();
    _lsStore.clear();
    _serverFile = { v: 1, entries: [
        { ts: '2026-01-01T00:00:00.000Z', source: 'scenepulse', severity: 'error', message: 'historical' },
    ] };
    await cl.installCrashLog({ spVersion: '6.12.5' });
    assertEq('1 entry loaded from server', cl.entryCount(), 1);
    assertEq('historical message preserved', cl.getEntries()[0].message, 'historical');
}

// ═══════════════════════════════════════════════════════════════════════
// 11. Init falls back to localStorage when server is empty
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 11: init falls back to localStorage ──');
{
    cl._resetForTests();
    _serverFile = null;
    _lsStore.clear();
    _lsStore.set('scenepulse_crash_log_v1', JSON.stringify({
        v: 1,
        entries: [{ ts: '2026-01-01T00:00:00.000Z', source: 'scenepulse', severity: 'error', message: 'cached locally' }],
    }));
    await cl.installCrashLog({ spVersion: '6.12.5' });
    assertEq('1 entry loaded from localStorage', cl.entryCount(), 1);
    assertEq('cached message preserved', cl.getEntries()[0].message, 'cached locally');
}

// ═══════════════════════════════════════════════════════════════════════
// 12. Logger bridge — err() funnels into crash log
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 12: logger.err() bridge ──');
{
    cl._resetForTests();
    _serverFile = null;
    _lsStore.clear();
    await cl.installCrashLog({ spVersion: '6.12.5', setErrorListener: logger.setErrorListener });
    // Calling err() should now route through the crash log
    logger.err('test error from logger', new Error('inner'));
    const all = cl.getEntries();
    assertEq('logger.err bridged to crash log', all.length, 1);
    assertEq('source tagged scenepulse', all[0].source, 'scenepulse');
    assertTrue('message contains text', all[0].message.includes('test error'));
}

// ═══════════════════════════════════════════════════════════════════════
// 13. Capture can be disabled
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Scenario 13: setCaptureEnabled ──');
{
    cl._resetForTests();
    cl.setCaptureEnabled(false);
    cl.captureError({ source: 'scenepulse', message: 'should be ignored' });
    assertEq('capture disabled = no entries', cl.entryCount(), 0);
    cl.setCaptureEnabled(true);
    cl.captureError({ source: 'scenepulse', message: 'now ok' });
    assertEq('capture re-enabled', cl.entryCount(), 1);
}

// ─── Summary ──────────────────────────────────────────────────────────
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`${fail === 0 ? 'PASS' : 'FAIL'} ${pass}/${pass + fail}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
if (fail > 0) {
    for (const f of failures) console.log('  - ' + f.name + '\n      expected: ' + f.expected + '\n      got:      ' + f.actual);
    process.exit(1);
}
