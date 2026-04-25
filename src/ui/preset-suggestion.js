// src/ui/preset-suggestion.js — One-time per-model preset toast (v6.20.0)
//
// On startup (and on connection profile change), check whether the active
// model has a bundled preset. If yes AND the user hasn't already applied
// or dismissed this preset, show a non-modal toast with two actions:
// "Apply preset" and "Don't suggest again". Quiet by default — never
// blocks generation, never re-fires for a model the user has decided on.
//
// Storage:
//   - sessionStorage 'sp:preset-shown' — set of preset ids shown this
//     session (so opening + closing settings doesn't re-toast).
//   - localStorage 'sp:preset-dismissed' — set of preset ids the user
//     has explicitly dismissed (persists across sessions).
//   - profile.appliedPresetId — set when the user clicks Apply, so the
//     editor + settings can show "Currently applied: Claude Sonnet 4.6".
//
// The toast uses ScenePulse's spConfirm dialog rather than toastr because
// toastr buttons render unstyled and don't survive ST's toast pruner.

import { t } from '../i18n.js';
import { spConfirm } from '../utils.js';
import { getSettings, saveSettings } from '../settings.js';
import { getActiveProfile, updateActiveProfile } from '../profiles.js';
import { findMatchingPreset, getActiveModelId, buildPresetPatch } from '../presets/registry.js';

const _SHOWN_KEY     = 'sp:preset-shown';
const _DISMISSED_KEY = 'sp:preset-dismissed';

function _readSet(storage, key) {
    try {
        const raw = storage.getItem(key);
        if (!raw) return new Set();
        const parsed = JSON.parse(raw);
        return new Set(Array.isArray(parsed) ? parsed : []);
    } catch { return new Set(); }
}
function _writeSet(storage, key, set) {
    try { storage.setItem(key, JSON.stringify([...set])); } catch {}
}

function _isShownThisSession(presetId) {
    try { return _readSet(sessionStorage, _SHOWN_KEY).has(presetId); } catch { return false; }
}
function _markShownThisSession(presetId) {
    try {
        const s = _readSet(sessionStorage, _SHOWN_KEY);
        s.add(presetId);
        _writeSet(sessionStorage, _SHOWN_KEY, s);
    } catch {}
}
function _isPermanentlyDismissed(presetId) {
    try { return _readSet(localStorage, _DISMISSED_KEY).has(presetId); } catch { return false; }
}
function _markPermanentlyDismissed(presetId) {
    try {
        const s = _readSet(localStorage, _DISMISSED_KEY);
        s.add(presetId);
        _writeSet(localStorage, _DISMISSED_KEY, s);
    } catch {}
}

/**
 * Check the active connection's model id against the bundled presets and
 * surface a one-time suggestion toast if a match is found and the user
 * hasn't already applied or dismissed it.
 *
 * Idempotent — safe to call from connection-change events.
 */
export async function maybeSuggestPreset() {
    const modelId = getActiveModelId();
    if (!modelId) return;
    const preset = findMatchingPreset(modelId);
    if (!preset) return;

    const s = getSettings();
    const profile = getActiveProfile(s);
    if (!profile) return;

    // If the active profile already has this preset applied, nothing to suggest.
    if (profile.appliedPresetId === preset.id) return;
    // Per-session + permanent dismissal checks.
    if (_isShownThisSession(preset.id)) return;
    if (_isPermanentlyDismissed(preset.id)) return;
    _markShownThisSession(preset.id);

    const choice = await spConfirm(
        t(`Apply ${preset.displayName} preset?`),
        t(`We detected your active model matches our ${preset.displayName} preset.\n\n${preset.notes}\n\nApplying will update your active profile's prompt slot overrides + system-prompt role. Your panels, schema, and other settings are not touched. You can revert at any time from the prompt editor.`),
        { okLabel: t('Apply preset'), cancelLabel: t('Not now'), danger: false }
    );
    if (!choice) return;

    // Apply
    const patch = buildPresetPatch(preset, profile);
    updateActiveProfile(s, { ...patch, appliedPresetId: preset.id });
    saveSettings();
    try { toastr.success(t(`Applied ${preset.displayName} preset to "${profile.name}"`)); } catch {}
}

/**
 * Permanently dismiss the suggestion for the currently-detected preset.
 * Useful as a settings UI affordance ("Don't suggest presets for this model").
 */
export function dismissPresetSuggestion() {
    const modelId = getActiveModelId();
    if (!modelId) return;
    const preset = findMatchingPreset(modelId);
    if (!preset) return;
    _markPermanentlyDismissed(preset.id);
    try { toastr.info(t(`Won't suggest the ${preset.displayName} preset again. Re-enable in localStorage if you change your mind.`)); } catch {}
}

/**
 * Test/diagnostic: clear all dismissal state. Not surfaced in the UI yet —
 * a hidden affordance for the Diagnostics button could unset this in v6.21.
 */
export function _resetSuggestionState() {
    try { sessionStorage.removeItem(_SHOWN_KEY); } catch {}
    try { localStorage.removeItem(_DISMISSED_KEY); } catch {}
}
