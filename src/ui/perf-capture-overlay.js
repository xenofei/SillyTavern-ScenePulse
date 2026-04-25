// src/ui/perf-capture-overlay.js — Floating capture overlay (v6.22.0)
//
// Mounts to <body> when a Performance capture starts so the user sees a
// persistent countdown + Cancel button + interaction hint that survives
// closing the Debug Inspector. Without this, users who closed the inspector
// mid-capture had no idea the capture was still running and lost the result
// because the inspector tab's local tick timer was disposed.
//
// Polls perf-monitor's getCaptureMeta() every ~500ms (cheap — just reads a
// memoized number). Auto-unmounts when the capture ends. Uses position:
// fixed top-right so it doesn't compete with the chat for screen real estate.

import { t } from '../i18n.js';
import { getCaptureMeta, stopCapture, isCapturing } from '../perf-monitor.js';

const _OVERLAY_ID = 'sp-perf-capture-overlay';

export function mountCaptureOverlay() {
    // Idempotent — re-mount replaces any stale instance.
    unmountCaptureOverlay();
    // v6.22.1: removed the `if (!isCapturing()) return` early-return guard.
    // It created an order-of-operations trap: callers had to remember to
    // start the capture BEFORE mounting, otherwise the overlay would
    // silently no-op. The _tick() loop below already handles the "capture
    // ended (or never started)" case via getCaptureMeta() returning null
    // → unmount. So mounting unconditionally is safe.

    const el = document.createElement('div');
    el.id = _OVERLAY_ID;
    el.className = 'sp-perf-overlay';
    // v6.23.1: count-up timer (mm:ss elapsed) + Stop button. Removed the
    // progress bar (the capture has no fixed duration, so progress is
    // meaningless). The pulse + bright accent still signal "active state."
    el.innerHTML = `
        <div class="sp-perf-overlay-row">
            <span class="sp-perf-overlay-pulse" aria-hidden="true"></span>
            <span class="sp-perf-overlay-title">${t('Performance capture in progress')}</span>
            <button class="sp-perf-overlay-cancel" type="button">${t('Stop')}</button>
        </div>
        <div class="sp-perf-overlay-meta">
            <span class="sp-perf-overlay-countdown">0:00</span>
            <span class="sp-perf-overlay-hint">${t('Reproduce the slowdown now — interact with the chat / panel / weather. Click Stop when done.')}</span>
        </div>
    `;
    document.body.appendChild(el);

    const countdown = el.querySelector('.sp-perf-overlay-countdown');
    let _tickTimer = null;

    function _fmtElapsed(ms) {
        const totalS = Math.floor(ms / 1000);
        const m = Math.floor(totalS / 60);
        const s = totalS % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    }

    function _tick() {
        const meta = getCaptureMeta();
        if (!meta) {
            unmountCaptureOverlay();
            return;
        }
        countdown.textContent = `${_fmtElapsed(meta.elapsedMs)} ${t('elapsed')}`;
    }
    _tick();
    _tickTimer = setInterval(_tick, 500);
    el._tickTimer = _tickTimer;

    el.querySelector('.sp-perf-overlay-cancel').addEventListener('click', () => {
        // v6.23.1: stopCapture flips _captureActive=false synchronously;
        // the inspector's tick will see that on its next 1s cycle and
        // _stopCaptureTicks itself, the await resolves, and finally{}
        // resets the inspector button. Unmount immediately for instant
        // visual feedback rather than waiting for the next _tick.
        try { stopCapture(); } catch {}
        unmountCaptureOverlay();
    });
}

export function unmountCaptureOverlay() {
    const existing = document.getElementById(_OVERLAY_ID);
    if (existing) {
        try {
            if (existing._tickTimer) clearInterval(existing._tickTimer);
            existing.remove();
        } catch {}
    }
}
