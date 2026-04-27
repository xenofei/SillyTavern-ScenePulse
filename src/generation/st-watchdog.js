// src/generation/st-watchdog.js — v6.27.19
//
// DOM-level watchdog that polls SillyTavern's stop button (#mes_stop)
// to detect when ST has stopped generating but ScenePulse hasn't been
// notified. This is the most reliable fast signal we have for the
// ECONNRESET / TLS-failure class of bugs where:
//   - ST sees the network failure and updates its own UI (hides stop
//     button, shows API error toast)
//   - But the underlying fetch's promise never rejects up SP's await
//     chain
//   - SP keeps showing "Generating Scene · 41s" indefinitely
//
// The Promise.race timeouts in engine.js (v6.27.18) are the safety net
// at 60s/180s. This watchdog is the *fast* detector — typically 6-9
// seconds from "ST hid its stop button" to "SP unlocks UI."
//
// Polls every 3 seconds. Force-resets SP state after CONSECUTIVE_THRESHOLD
// consecutive polls where ST's stop button is hidden AND SP's
// `generating === true`. Two-poll requirement avoids race-condition
// false positives during brief transitions.
//
// Auto-stops when SP's `generating` goes false (natural cleanup path).
// Callers don't need to remember to stop it explicitly — just start it
// when generation begins.
//
// Limitations:
//   - Coupled to ST's DOM (#mes_stop selector + display:none toggle).
//     Documented in ARCHITECTURE.md so future ST upgrades don't silently
//     defeat the watchdog.
//   - Won't catch the case where ST's stop button is stuck visible but
//     ST has actually stopped — that's what the engine.js Promise.race
//     timeouts handle.

import { warn } from '../logger.js';
import {
    generating,
    setGenerating,
    setInlineGenStartMs,
    setInlineExtractionDone,
    setPendingInlineIdx,
    setCancelRequested,
} from '../state.js';
import { spSetGenerating } from '../ui/mobile.js';
import { cleanupGenUI } from '../ui/loading.js';

const POLL_INTERVAL_MS = 3000;
const GRACE_PERIOD_MS = 5000;          // ignore the first 5s; ST may not have started yet
const CONSECUTIVE_HIDDEN_THRESHOLD = 2; // 2 polls × 3s = 6s of hidden before firing

const ST_STOP_SELECTORS = [
    '#mes_stop',
    '.mes_stop',
    '#stop_button',
    '.stop_button',
];

let _intervalId = null;
let _startMs = 0;
let _hiddenCount = 0;

function _isStStopButtonVisible() {
    for (const sel of ST_STOP_SELECTORS) {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
            const style = getComputedStyle(el);
            if (style.display !== 'none' && style.visibility !== 'hidden') {
                return true;
            }
        }
    }
    return false;
}

function _check() {
    if (!generating) {
        // Natural completion — SP cleared its own state. Stop polling.
        stopStWatchdog();
        return;
    }
    if (Date.now() - _startMs < GRACE_PERIOD_MS) {
        return; // too early; ST may not have set up yet
    }
    if (_isStStopButtonVisible()) {
        _hiddenCount = 0;
        return;
    }
    _hiddenCount++;
    if (_hiddenCount >= CONSECUTIVE_HIDDEN_THRESHOLD) {
        const elapsed = Math.round((Date.now() - _startMs) / 1000);
        const detectionLag = (CONSECUTIVE_HIDDEN_THRESHOLD * POLL_INTERVAL_MS) / 1000;
        warn(
            'ST watchdog: ST stop button hidden for ' + detectionLag + 's but SP is still generating — force-resetting (elapsed ' + elapsed + 's)'
        );
        setGenerating(false);
        spSetGenerating(false);
        setInlineGenStartMs(0);
        setInlineExtractionDone(false);
        setPendingInlineIdx(-1);
        setCancelRequested(false);
        try { cleanupGenUI(); } catch {}
        try {
            toastr.warning(
                'SillyTavern stopped generating but ScenePulse wasn\'t notified (likely ECONNRESET). UI unlocked after ' + elapsed + 's.',
                'ScenePulse'
            );
        } catch {}
        stopStWatchdog();
    }
}

/**
 * Start polling ST's stop button. Idempotent — restarts the timer if
 * already running. Auto-stops when SP's `generating` goes false.
 */
export function startStWatchdog() {
    stopStWatchdog();
    _startMs = Date.now();
    _hiddenCount = 0;
    _intervalId = setInterval(_check, POLL_INTERVAL_MS);
}

/**
 * Stop polling explicitly. Called automatically when SP's generating
 * goes false; only callers that want to force-stop early need this.
 */
export function stopStWatchdog() {
    if (_intervalId) {
        clearInterval(_intervalId);
        _intervalId = null;
    }
    _startMs = 0;
    _hiddenCount = 0;
}
