// src/generation/regen-guard.js — v6.27.17
//
// Pre-flight check for user-initiated tracker regeneration buttons. If
// ScenePulse is currently mid-generation (manual, auto-fallback, or
// continuation re-prompt), the previous behavior was to silently block
// the click and emit a "Generation already in progress" toast. That
// confused users in one specific scenario reported repeatedly:
//
//   1. Together-mode chat completes, but the assistant message has no
//      tracker JSON (sampling glitch or NSFW prose-mode break)
//   2. ScenePulse auto-fallback runs through engine.js — this can take
//      30-120s on a slow upstream (DeepSeek V4 thinking, NanoGPT under
//      load, etc.)
//   3. User sees "No scene data yet" on the panel during the fallback
//      and assumes the system stalled
//   4. User clicks regen — toast blocks them with no recourse
//
// This module replaces the silent block with a confirm dialog: cancel
// the in-flight generation and start a new one, or keep waiting.
//
// Only used for USER-INITIATED regen. Do not call from the auto-
// fallback or interceptor paths — those should never spontaneously
// abort an existing generation.

import { spConfirm } from '../utils.js';
import { generating, inlineGenStartMs } from '../state.js';
import { cancelGeneration } from './engine.js';

/**
 * Returns true if the caller may proceed with a fresh regeneration,
 * false if they should bail (user kept waiting or dismissed the
 * confirm dialog).
 *
 * @returns {Promise<boolean>}
 */
export async function guardRegenIfBusy() {
    if (!generating) return true;
    // inlineGenStartMs is only set for Together/inline-mode generations;
    // engine.js's separate-mode auto-fallback doesn't update it. Fall
    // back to "no elapsed time" rather than misreporting a stale value.
    const elapsed = inlineGenStartMs > 0 ? Math.round((Date.now() - inlineGenStartMs) / 1000) : 0;
    const elapsedStr = elapsed > 0 ? ` (${elapsed}s elapsed)` : '';
    const ok = await spConfirm(
        'Tracker generation in progress',
        `ScenePulse is currently generating a tracker${elapsedStr}. This is most likely an auto-fallback after the model omitted the tracker payload — these can take 30-120s on slow upstreams.\n\nCancel the in-flight generation and start a new one?`,
        { okLabel: 'Cancel + restart', cancelLabel: 'Keep waiting', danger: true }
    );
    if (!ok) return false;
    cancelGeneration();
    return true;
}
