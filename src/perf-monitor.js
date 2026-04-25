// src/perf-monitor.js — Performance monitor MVP (v6.17.0)
//
// Panel A's MVP scope (from the v6.16+ inspector synthesis). The full
// "resource graph" feature was killed at the planning stage because:
//   - True GPU% is NOT exposed by any Web API; we can only proxy.
//   - performance.memory is Chrome-only; user runs Firefox 150.
//   - Always-on detailed monitoring at attribution-grade resolution
//     becomes a measurable contributor to the jank it diagnoses
//     (the observer-effect trap).
//
// What we DO ship:
//   - Cheap rAF-based FPS sampler (1Hz when inspector is open, off otherwise)
//   - performance.mark(name) / performance.measure(name, start, end) wrappers
//     so ScenePulse components can self-instrument with a one-line wrap
//   - Capture mode: explicit start/stop window. Observers are only attached
//     during capture. Returns a sortable component-attribution table.
//
// Honest tooltip on the UI: "Proxy metrics — browsers don't expose true
// GPU load. We measure FPS, frame variance, animation count, and ScenePulse-
// attributed paint via instrumented marks."
//
// Panels were unanimous: refuse to confabulate the metric the platform
// doesn't deliver. No synthesized "GPU load: 73%" number.

import { log, warn } from './logger.js';

const MARK_PREFIX = 'sp:';

// ── Always-on FPS sampler (1Hz when active) ────────────────────────────
//
// Light enough to leave running while the inspector is open. rAF deltas
// give us an honest "what FPS is the page actually seeing right now".

let _fpsSamplingActive = false;
let _fpsRafId = null;
let _fpsLastTimestamp = 0;
let _fpsFrames = [];           // ring of frame deltas (last ~120 frames)
const _MAX_FRAME_BUFFER = 120;
let _fpsListeners = new Set();
// v6.17.1: rolling 30-second FPS history for the inspector sparkline. Each
// entry is one ~1Hz snapshot {ts, fps, frameP95Ms}. Capped at 60 entries so
// the sparkline can show up to a 60s trend; the UI selects the trailing 30s.
let _fpsHistory = [];
const _MAX_FPS_HISTORY = 60;

function _sampleTick(ts) {
    if (!_fpsSamplingActive) return;
    if (_fpsLastTimestamp > 0) {
        const delta = ts - _fpsLastTimestamp;
        _fpsFrames.push(delta);
        if (_fpsFrames.length > _MAX_FRAME_BUFFER) _fpsFrames.shift();
        // Notify subscribers ~once per second by debouncing on accumulated time
        const recentSum = _fpsFrames.reduce((a, b) => a + b, 0);
        if (recentSum >= 1000) _notifyFps();
    }
    _fpsLastTimestamp = ts;
    _fpsRafId = requestAnimationFrame(_sampleTick);
}

function _notifyFps() {
    const stats = computeFpsStats();
    // v6.17.1: append to rolling history before notifying — listeners can pull
    // the sparkline data from getFpsHistory() if they want a trend chart.
    _fpsHistory.push({ ts: Date.now(), fps: stats.fps, frameP95Ms: stats.frameP95Ms });
    if (_fpsHistory.length > _MAX_FPS_HISTORY) _fpsHistory.shift();
    for (const fn of _fpsListeners) {
        try { fn(stats); } catch {}
    }
}

/**
 * Return the rolling FPS history (newest last). Each entry: {ts, fps, frameP95Ms}.
 * v6.17.1: powers the inspector's 30s FPS sparkline.
 */
export function getFpsHistory() { return _fpsHistory.slice(); }

/** Compute FPS / frame-time stats from the current ring buffer. */
export function computeFpsStats() {
    const frames = _fpsFrames.slice();
    if (frames.length < 2) return { fps: 0, frameP95Ms: 0, sampleCount: 0 };
    const sortedDeltas = frames.slice().sort((a, b) => a - b);
    const p95Idx = Math.min(sortedDeltas.length - 1, Math.floor(sortedDeltas.length * 0.95));
    const frameP95Ms = sortedDeltas[p95Idx];
    const totalMs = frames.reduce((a, b) => a + b, 0);
    const fps = totalMs > 0 ? Math.round((frames.length * 1000) / totalMs) : 0;
    return { fps, frameP95Ms: Math.round(frameP95Ms * 10) / 10, sampleCount: frames.length };
}

/** Start the rAF sampler. Idempotent. Call when inspector opens. */
export function startFpsSampling() {
    if (_fpsSamplingActive) return;
    _fpsSamplingActive = true;
    _fpsLastTimestamp = 0;
    _fpsFrames = [];
    _fpsHistory = [];
    _fpsRafId = requestAnimationFrame(_sampleTick);
}

/** Stop the rAF sampler. Call when inspector closes. */
export function stopFpsSampling() {
    _fpsSamplingActive = false;
    if (_fpsRafId != null) {
        try { cancelAnimationFrame(_fpsRafId); } catch {}
        _fpsRafId = null;
    }
}

/** Subscribe to FPS updates (~1Hz). Returns an unsubscribe function. */
export function addFpsListener(fn) {
    if (typeof fn === 'function') _fpsListeners.add(fn);
    return () => _fpsListeners.delete(fn);
}

// ── Always-on cheap counters ───────────────────────────────────────────

/** Count of currently-running CSS/Web Animations (proxy for compositor pressure). */
export function getAnimationCount() {
    try {
        if (typeof document?.getAnimations === 'function') {
            return document.getAnimations().length;
        }
    } catch {}
    return 0;
}

/** Count of ScenePulse elements with will-change or transform set (layer proxy). */
export function getScenePulseLayerCount() {
    try {
        const els = document.querySelectorAll(
            '#sp-panel [style*="will-change"], #sp-panel [style*="transform"], ' +
            '#sp-thought-panel [style*="will-change"], #sp-thought-panel [style*="transform"], ' +
            '.sp-weather-overlay, .sp-time-tint, .sp-wdm-canvas'
        );
        return els.length;
    } catch { return 0; }
}

// v6.17.1: static manifest of components that emit sp:* marks. The inspector's
// Perf tab uses this to surface "what's instrumented" in the empty state when
// a capture records 0 measures (so users know if their slow component is even
// being attributed). Keep in sync with actual markStart/markEnd call sites —
// adding a new instrumented module without listing it here just means users
// won't see it in the empty-state hint.
export const INSTRUMENTED_MARKS = [
    { mark: 'sp:weather-update',  module: 'src/ui/weather.js',     desc: 'Weather overlay update pass' },
    { mark: 'sp:time-tint',       module: 'src/ui/time-tint.js',   desc: 'Day/night tint compositing' },
    { mark: 'sp:thoughts-update', module: 'src/ui/thoughts.js',    desc: 'Inner-thought panel re-render' },
    { mark: 'sp:panel-update',    module: 'src/ui/update-panel.js',desc: 'Main scene panel update pass' },
];

// ── ScenePulse instrumentation marks ───────────────────────────────────
//
// One-line wrap for component render code:
//   markStart('sp:weather-rain'); /* ... draw ... */ markEnd('sp:weather-rain');
//
// Or with a measured callback:
//   measure('sp:dashboard-card', () => renderCard(...));
//
// Marks are emitted ALWAYS (cheap — microseconds). They're only OBSERVED
// during capture mode (see startCapture below), so always-on cost is near
// zero. Panels were emphatic: cheap marks + capture-mode observation is
// the right trade-off for a 1-user, 7-events/day deployment.

/**
 * Emit a start mark. Wrap with markEnd. Name should be sp:<component>.
 * Both are no-ops if performance.mark is unavailable.
 */
export function markStart(name) {
    try { performance.mark?.(name + ':start'); } catch {}
}

/** Emit the matching end mark + a measure spanning start→end. */
export function markEnd(name) {
    try {
        performance.mark?.(name + ':end');
        performance.measure?.(name, name + ':start', name + ':end');
    } catch {}
}

/** Sync helper — measure a callback. Returns the callback's return value. */
export function measure(name, fn) {
    markStart(name);
    try { return fn(); }
    finally { markEnd(name); }
}

// ── Capture mode ───────────────────────────────────────────────────────
//
// Explicit start → user does the action that causes the perf problem →
// stop → results table. Only during capture do we attach the
// PerformanceObserver and accumulate per-component totals. Outside
// capture the marks fire but no observer is listening, so the cost
// stays at ~microseconds per mark.

let _captureActive = false;
let _captureObserver = null;
let _captureStartTs = 0;
let _captureEndTs = 0;
let _captureBuckets = new Map(); // name -> { name, totalMs, count, maxMs }
let _captureLongTasks = 0;
// v6.23.1: hold the in-flight capture's resolver so external `stopCapture()`
// calls (overlay Stop, inspector Stop, max-duration timer) all resolve the
// SAME promise immediately. Previously the promise only resolved when the
// internal setTimeout fired, so a manual stop forced the caller to wait
// the full duration before seeing results — broken with the v6.23.1 user-
// stopped capture model where duration can be 10 minutes.
let _captureResolver = null;
let _captureAutoStopTimer = null;

/**
 * Start capture. observer attaches; marks emitted during capture get
 * aggregated into per-component buckets. Auto-stops after durationMs.
 *
 * @param {number} [durationMs=30000] Capture window length, max 120000
 * @returns {Promise<{durationMs, components, longTasks}>} resolves when capture ends
 */
export function startCapture(durationMs = 30000) {
    if (_captureActive) {
        return Promise.reject(new Error('Capture already in progress'));
    }
    const dur = Math.max(1000, Math.min(120000, Number(durationMs) || 30000));
    _captureActive = true;
    _captureStartTs = performance.now();
    _captureDurationMs = dur;
    _captureBuckets = new Map();
    _captureLongTasks = 0;

    // Observe sp:* measures + longtasks (where supported) during the window.
    try {
        _captureObserver = new PerformanceObserver(list => {
            for (const entry of list.getEntries()) {
                if (entry.entryType === 'measure' && entry.name.startsWith(MARK_PREFIX)) {
                    const b = _captureBuckets.get(entry.name) || { name: entry.name, totalMs: 0, count: 0, maxMs: 0 };
                    b.totalMs += entry.duration;
                    b.count++;
                    if (entry.duration > b.maxMs) b.maxMs = entry.duration;
                    _captureBuckets.set(entry.name, b);
                } else if (entry.entryType === 'longtask') {
                    _captureLongTasks++;
                }
            }
        });
        // Two separate observe calls — Firefox may not support longtask;
        // each is wrapped so a missing type doesn't kill the other.
        try { _captureObserver.observe({ entryTypes: ['measure'] }); } catch {}
        try { _captureObserver.observe({ entryTypes: ['longtask'] }); } catch {}
    } catch (e) {
        warn('PerformanceObserver unavailable:', e?.message || e);
    }

    // v6.23.1: stash the resolver so manual stopCapture() can resolve the
    // promise immediately. Auto-stop timer is also tracked so we can clear
    // it on manual stop (otherwise it'd fire later and try to re-resolve).
    return new Promise(resolve => {
        _captureResolver = resolve;
        _captureAutoStopTimer = setTimeout(() => {
            _captureAutoStopTimer = null;
            // Will resolve via the resolver path inside stopCapture
            stopCapture();
        }, dur);
    });
}

/**
 * Snapshot the in-flight capture without stopping it. Returns the same
 * shape as `stopCapture()` so the inspector UI can render a live partial
 * results table during the capture window. v6.21.0.
 *
 * Returns null if no capture is in progress.
 */
export function getCapturePartial() {
    if (!_captureActive) return null;
    const durationMs = performance.now() - _captureStartTs;
    const components = Array.from(_captureBuckets.values())
        .map(b => ({
            name: b.name,
            totalMs: Math.round(b.totalMs * 10) / 10,
            count: b.count,
            avgMs: b.count > 0 ? Math.round((b.totalMs / b.count) * 100) / 100 : 0,
            maxMs: Math.round(b.maxMs * 10) / 10,
            pctOfCapture: durationMs > 0 ? Math.round((b.totalMs / durationMs) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.totalMs - a.totalMs);
    return {
        durationMs: Math.round(durationMs),
        components,
        longTasks: _captureLongTasks,
        partial: true,
    };
}

/**
 * Stop capture immediately. Returns the result. v6.23.1: also resolves
 * the in-flight startCapture() promise with the same result so manual
 * stops (overlay Stop, inspector Stop) don't wait out the original
 * 10-min ceiling for the await to complete.
 */
export function stopCapture() {
    if (!_captureActive) return { durationMs: 0, components: [], longTasks: 0 };
    _captureActive = false;
    _captureEndTs = performance.now();
    if (_captureObserver) {
        try { _captureObserver.disconnect(); } catch {}
        _captureObserver = null;
    }
    // v6.23.1: clear the auto-stop timer so it doesn't fire later and
    // recursively call stopCapture (would no-op since _captureActive is
    // already false, but better to be tidy).
    if (_captureAutoStopTimer != null) {
        try { clearTimeout(_captureAutoStopTimer); } catch {}
        _captureAutoStopTimer = null;
    }
    const durationMs = _captureEndTs - _captureStartTs;
    const components = Array.from(_captureBuckets.values())
        .map(b => ({
            name: b.name,
            totalMs: Math.round(b.totalMs * 10) / 10,
            count: b.count,
            avgMs: Math.round((b.totalMs / b.count) * 100) / 100,
            maxMs: Math.round(b.maxMs * 10) / 10,
            pctOfCapture: durationMs > 0 ? Math.round((b.totalMs / durationMs) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.totalMs - a.totalMs);
    const result = { durationMs: Math.round(durationMs), components, longTasks: _captureLongTasks };
    log('PerfMonitor capture: completed,', components.length, 'components,',
        Math.round(durationMs), 'ms,', _captureLongTasks, 'long tasks');
    // v6.23.1: resolve the startCapture() promise here so any external stop
    // (manual or timer) propagates the result back to the original caller
    // without waiting for the auto-stop setTimeout that was just cleared.
    if (_captureResolver) {
        const r = _captureResolver;
        _captureResolver = null;
        try { r(result); } catch {}
    }
    return result;
}

/** Currently capturing? */
export function isCapturing() { return _captureActive; }

/**
 * Capture metadata for the currently-active capture, or null if no
 * capture is in progress. v6.22.0: powers the floating capture overlay
 * (src/ui/perf-capture-overlay.js) so it can show countdown + cancel
 * independently of the Debug Inspector lifecycle.
 *
 * @returns {{startedAt: number, durationMs: number, elapsedMs: number, remainingMs: number} | null}
 */
let _captureDurationMs = 0;
export function getCaptureMeta() {
    if (!_captureActive) return null;
    const elapsedMs = performance.now() - _captureStartTs;
    return {
        startedAt: _captureStartTs,
        durationMs: _captureDurationMs,
        elapsedMs,
        remainingMs: Math.max(0, _captureDurationMs - elapsedMs),
    };
}

/** Test reset hook. */
export function _resetForTests() {
    stopCapture();
    stopFpsSampling();
    _fpsListeners.clear();
}
