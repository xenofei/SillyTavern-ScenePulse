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
    el.innerHTML = `
        <div class="sp-perf-overlay-row">
            <span class="sp-perf-overlay-pulse" aria-hidden="true"></span>
            <span class="sp-perf-overlay-title">${t('Performance capture in progress')}</span>
            <button class="sp-perf-overlay-cancel" type="button">${t('Cancel')}</button>
        </div>
        <div class="sp-perf-overlay-progress">
            <div class="sp-perf-overlay-bar"></div>
        </div>
        <div class="sp-perf-overlay-meta">
            <span class="sp-perf-overlay-countdown">—</span>
            <span class="sp-perf-overlay-hint">${t('Reproduce the slowdown now — interact with the chat / panel / weather.')}</span>
        </div>
    `;
    document.body.appendChild(el);

    const bar = el.querySelector('.sp-perf-overlay-bar');
    const countdown = el.querySelector('.sp-perf-overlay-countdown');
    let _tickTimer = null;

    function _tick() {
        const meta = getCaptureMeta();
        if (!meta) {
            unmountCaptureOverlay();
            return;
        }
        const remainingS = Math.ceil(meta.remainingMs / 1000);
        const totalS = Math.round(meta.durationMs / 1000);
        countdown.textContent = `${remainingS}s ${t('remaining')} / ${totalS}s ${t('total')}`;
        if (bar) {
            const pct = Math.min(100, (meta.elapsedMs / meta.durationMs) * 100);
            bar.style.width = pct + '%';
        }
    }
    _tick();
    _tickTimer = setInterval(_tick, 500);
    el._tickTimer = _tickTimer;

    el.querySelector('.sp-perf-overlay-cancel').addEventListener('click', () => {
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
