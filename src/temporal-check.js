// src/temporal-check.js — Temporal validation for LLM-emitted tracker time
//
// PROBLEM (v6.23.x bug class): the LLM occasionally emits a `time` field that
// goes backwards versus the prior snapshot, or jumps wildly forward without
// narrative justification. The user sees nonsense timelines like #60 16:15 →
// #62 14:52 → #64 15:00. This module detects and corrects those errors.
//
// CONTRACT: pure function, no side effects, no DOM, no settings reads, no
// SillyTavern context lookups. Inputs are plain values; outputs are a record
// the caller (pipeline.js) acts on. Mirrors the stagnation.js pattern.
//
// THE THREE BLOCK RULES (LLM output only — user edits bypass entirely):
//   1. New time goes BACKWARD, no flashback signal, no date change
//      → rewrite to (prev time + parsed elapsed) or (prev time + 1m)
//   2. New time goes FORWARD by >2× the model's claimed `elapsed`
//      → rewrite to (prev time + claimed elapsed)
//   3. New time goes FORWARD with no `elapsed` and >1h jump
//      → rewrite to (prev time + 1m)
//
// FLASHBACK SIGNALS (any one bypasses block rule #1):
//   - next.temporalIntent === 'flashback'
//   - next.elapsed contains "flashback" / "earlier" / "going back"
//   - next.date !== prev.date (cross-date jump trusted)
//
// SKIP CONDITIONS (validator bows out, no rewrite, no warning):
//   - prev is null/undefined (cold start — no anchor to compare against)
//   - next is null/undefined or missing time
//   - next._spMeta.userEdited === true (user authored, never override)
//   - prev._temporal?.action === 'rewrite' (anti-cascade — refuse to anchor on
//     a known-bad snapshot; otherwise one bad turn poisons all subsequent)
//   - opts.isGroupChat === true (per-character clocks unsupported in v1)
//
// UNPARSEABLE TIMES: returned as 'accept' with reason='unparseable-time'.
// We never claim regression on data we couldn't parse — that produces flag
// fatigue (per the v6.24.0 panel review's NSFW-advocate critique).

// Module-level regex constants — compiled once, not per call.
const TIME_RE = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?$/i;
const ELAPSED_RE = /(\d+(?:\.\d+)?)\s*(h(?:ours?|rs?)?|m(?:inutes?|in)?|s(?:econds?|ec)?|d(?:ays?)?)\b/gi;
const FLASHBACK_RE = /\b(flashback|earlier|going back|in reverse|reverse-cut)\b/i;
const SECONDS_PER_DAY = 86400;

/**
 * Parse an HH:MM[:SS] or H:MM with optional AM/PM into seconds-since-midnight.
 * Returns null for unparseable (qualitative names, malformed, etc).
 */
export function parseTimeToSeconds(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const m = timeStr.trim().match(TIME_RE);
    if (!m) return null;
    let hours = parseInt(m[1], 10);
    const minutes = parseInt(m[2], 10);
    const seconds = m[3] ? parseInt(m[3], 10) : 0;
    if (hours > 23 || minutes > 59 || seconds > 59) return null;
    const meridiem = m[4] ? m[4].toLowerCase().replace(/\./g, '') : '';
    if (meridiem === 'pm' && hours < 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;
    return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Parse the model's `elapsed` string (e.g., "10m", "2h 30m", "30 seconds")
 * into total seconds. Returns null if no recognized duration token found.
 * Handles parenthetical context like "30s (dialogue continues)" by ignoring it.
 */
export function parseElapsedToSeconds(elapsedStr) {
    if (!elapsedStr || typeof elapsedStr !== 'string') return null;
    let total = 0;
    let matched = false;
    ELAPSED_RE.lastIndex = 0;
    let m;
    while ((m = ELAPSED_RE.exec(elapsedStr)) !== null) {
        const n = parseFloat(m[1]);
        if (!isFinite(n)) continue;
        const unit = m[2][0].toLowerCase();
        if (unit === 's') total += n;
        else if (unit === 'm') total += n * 60;
        else if (unit === 'h') total += n * 3600;
        else if (unit === 'd') total += n * SECONDS_PER_DAY;
        matched = true;
    }
    return matched ? total : null;
}

/**
 * Format seconds-since-midnight back to HH:MM:SS. Wraps modulo 24h so that
 * prev=23:59 + bump=120s = "00:01:00" rather than "24:01:00".
 */
export function formatTime(seconds) {
    const wrapped = ((Math.floor(seconds) % SECONDS_PER_DAY) + SECONDS_PER_DAY) % SECONDS_PER_DAY;
    const h = Math.floor(wrapped / 3600);
    const m = Math.floor((wrapped % 3600) / 60);
    const s = wrapped % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Classify a time change between snapshots and recommend an action.
 *
 * @param {object} args
 * @param {object|null} args.prev - Previous snapshot (or null for cold start)
 * @param {object|null} args.next - New tracker being saved
 * @param {boolean} [args.isGroupChat=false] - Group chat context (skip in v1)
 * @returns {{
 *   action: 'accept'|'rewrite'|'skip',
 *   newTime?: string,
 *   reason: string,
 *   signals: object
 * }}
 */
export function classifyTimeChange({ prev, next, isGroupChat = false } = {}) {
    const signals = {};

    // Skip conditions — defensive, ordered cheapest-first
    if (!prev || typeof prev !== 'object') {
        return { action: 'skip', reason: 'cold-start', signals };
    }
    if (!next || typeof next !== 'object') {
        return { action: 'skip', reason: 'no-tracker', signals };
    }
    if (isGroupChat) {
        return { action: 'skip', reason: 'group-chat-deferred', signals };
    }
    if (next._spMeta && next._spMeta.userEdited === true) {
        return { action: 'skip', reason: 'user-edited', signals };
    }
    // Anti-cascade: refuse to anchor on a snapshot we already corrected.
    // Without this, one bad turn locks every subsequent classification.
    if (prev._temporal && prev._temporal.action === 'rewrite') {
        return { action: 'skip', reason: 'prev-was-rewritten', signals };
    }

    const prevSec = parseTimeToSeconds(prev.time);
    const nextSec = parseTimeToSeconds(next.time);
    signals.prevTime = prev.time || null;
    signals.nextTime = next.time || null;
    signals.prevSec = prevSec;
    signals.nextSec = nextSec;

    // Unparseable on either side — accept; we won't claim regression on bad data
    if (prevSec === null || nextSec === null) {
        return { action: 'accept', reason: 'unparseable-time', signals };
    }

    // Date changed → accept (cross-date logic is complex; trust the model)
    const prevDate = (prev.date || '').trim();
    const nextDate = (next.date || '').trim();
    if (prevDate && nextDate && prevDate !== nextDate) {
        signals.dateChanged = true;
        return { action: 'accept', reason: 'date-changed', signals };
    }
    signals.dateChanged = false;

    const deltaSec = nextSec - prevSec;
    signals.deltaSeconds = deltaSec;

    // Read intent + elapsed signals (used by both backward and forward branches)
    const intent = String(next.temporalIntent || '').toLowerCase().trim();
    signals.hasFlashbackIntent = intent === 'flashback';
    signals.hasTimeSkipIntent = intent === 'timeskip' || intent === 'parallel';

    const elapsedStr = String(next.elapsed || '');
    signals.hasFlashbackMarker = FLASHBACK_RE.test(elapsedStr);
    signals.elapsedSeconds = parseElapsedToSeconds(elapsedStr);

    // RULE 1 — Backward time
    if (deltaSec < 0) {
        if (signals.hasFlashbackIntent || signals.hasFlashbackMarker) {
            return { action: 'accept', reason: 'backward-flashback-declared', signals };
        }
        // Block: rewrite to prev + parsed elapsed (or prev + 1m if elapsed unparseable)
        const bumpSec = signals.elapsedSeconds !== null ? signals.elapsedSeconds : 60;
        return {
            action: 'rewrite',
            newTime: formatTime(prevSec + bumpSec),
            reason: 'backward-without-flashback',
            signals,
        };
    }

    // RULE 2 + 3 — Forward time
    if (deltaSec > 0) {
        // Explicit timeSkip / parallel intent → accept any forward magnitude
        if (signals.hasTimeSkipIntent) {
            return { action: 'accept', reason: 'forward-intent-declared', signals };
        }
        // Has parseable elapsed claim → allow up to 2× as slack
        if (signals.elapsedSeconds !== null) {
            const allowedSec = Math.max(60, signals.elapsedSeconds * 2);
            if (deltaSec > allowedSec) {
                return {
                    action: 'rewrite',
                    newTime: formatTime(prevSec + signals.elapsedSeconds),
                    reason: 'forward-exceeds-elapsed',
                    signals,
                };
            }
            return { action: 'accept', reason: 'forward-matches-elapsed', signals };
        }
        // No elapsed claim — small jumps fine; >1h flagged as suspicious
        if (deltaSec > 3600) {
            return {
                action: 'rewrite',
                newTime: formatTime(prevSec + 60),
                reason: 'forward-no-elapsed-large-jump',
                signals,
            };
        }
        return { action: 'accept', reason: 'forward-small-no-elapsed', signals };
    }

    // deltaSec === 0
    return { action: 'accept', reason: 'no-change', signals };
}
