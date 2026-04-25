// src/profiles.js — Prompt + Schema Profile system (issue #15, v6.13.0)
//
// A "profile" is a self-contained bundle that drives schema + prompt
// generation: { id, name, schema, systemPrompt, panels, fieldToggles,
// dashCards, customPanels }. Switching profiles swaps which bundle the
// active schema/prompt is read from — no destructive copy, no merging.
//
// The legacy single-pair model (`s.schema`, `s.systemPrompt`,
// `s.customPanels`, `s.panels`, `s.fieldToggles`, `s.dashCards`) is
// preserved as `profiles[0]` named "Default (migrated)" on first run.
// Subsequent reads route through the active profile via the four
// chokepoint getters in src/settings.js.
//
// Per-chat profile override: a chat may set
// `chatMetadata.scenepulse.activeProfileId` to override the global
// `s.activeProfileId`. Used by the dropdown switcher when "this chat
// only" is selected.

import { log, warn } from './logger.js';

// v6.18.0: promptOverrides (per-slot overrides) added.
// v6.19.0: systemPromptRole (issue #16 — choose system/user/assistant for the
// outgoing system-prompt message) added.
const PROFILE_FIELDS = ['schema', 'systemPrompt', 'promptOverrides', 'systemPromptRole', 'panels', 'fieldToggles', 'dashCards', 'customPanels'];
const SCHEMA_VERSION = 1;

function _uuid() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    // Cheap fallback for older environments
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

function _nowIso() { return new Date().toISOString(); }

/**
 * Build a fresh profile object from a partial template.
 * Always returns all PROFILE_FIELDS as keys (null/empty defaults).
 */
export function makeProfile(partial = {}) {
    return {
        id: partial.id || _uuid(),
        name: partial.name || 'Untitled Profile',
        schemaVersion: SCHEMA_VERSION,
        createdAt: partial.createdAt || _nowIso(),
        updatedAt: partial.updatedAt || _nowIso(),
        description: partial.description || '',
        schema: partial.schema || null,
        // v6.18.0: legacy full-text override. New profiles should prefer
        // `promptOverrides` (per-slot) so they only diverge from defaults
        // where intentional. systemPrompt still wins over the slot system
        // for backward compatibility with hand-authored prompts.
        systemPrompt: partial.systemPrompt || null,
        // v6.18.0: per-slot prompt overrides keyed by slot id (see
        // src/prompts/slots.js SLOT_IDS). Each value is a string that
        // replaces the default text for that slot. Empty string or missing
        // key means "use the default". The editor in v6.19.0 reads/writes
        // this map; v6.20.0 model presets apply by writing into it.
        promptOverrides: partial.promptOverrides && typeof partial.promptOverrides === 'object'
            ? { ...partial.promptOverrides }
            : {},
        // v6.19.0 (issue #16): role to send the assembled system prompt as.
        // 'system' (default) is what every existing profile gets. 'user' and
        // 'assistant' merge the system prompt into the user-message slot
        // before generateRaw, since the SillyTavern generateRaw signature
        // only exposes one explicit systemPrompt field.
        systemPromptRole: ['system', 'user', 'assistant'].includes(partial.systemPromptRole)
            ? partial.systemPromptRole
            : 'system',
        panels: partial.panels && typeof partial.panels === 'object' ? { ...partial.panels } : {},
        fieldToggles: partial.fieldToggles && typeof partial.fieldToggles === 'object' ? { ...partial.fieldToggles } : {},
        dashCards: partial.dashCards && typeof partial.dashCards === 'object' ? { ...partial.dashCards } : {},
        customPanels: Array.isArray(partial.customPanels) ? JSON.parse(JSON.stringify(partial.customPanels)) : [],
    };
}

/**
 * Idempotent migration: if no profiles exist, wrap the user's current
 * legacy settings (s.schema, s.systemPrompt, s.customPanels, s.panels,
 * s.fieldToggles, s.dashCards) into a "Default" profile and set
 * activeProfileId to it. Safe to call on every settings load.
 *
 * Returns true if a migration ran (caller should saveSettings then).
 */
export function migrateLegacySettingsToProfile(s) {
    if (!s || typeof s !== 'object') return false;
    if (Array.isArray(s.profiles) && s.profiles.length > 0 && s.activeProfileId) {
        // Already migrated; ensure activeProfileId still points at a real
        // profile. If the active one was deleted out-of-band, fall back
        // to the first one to avoid null-pointer crashes downstream.
        const exists = s.profiles.some(p => p && p.id === s.activeProfileId);
        if (!exists) {
            s.activeProfileId = s.profiles[0].id;
            return true;
        }
        return false;
    }
    // Capture legacy values into the migrated profile. Use null/empty
    // defaults rather than copying the DEFAULTS values — the legacy
    // schema/systemPrompt fields are nullable overrides, so null here
    // means "use dynamically built schema/prompt from panels+toggles".
    const legacy = makeProfile({
        name: 'Default',
        description: 'Migrated from your previous configuration.',
        schema: typeof s.schema === 'string' && s.schema.trim() ? s.schema : null,
        systemPrompt: typeof s.systemPrompt === 'string' && s.systemPrompt.trim() ? s.systemPrompt : null,
        panels: s.panels && typeof s.panels === 'object' ? s.panels : {},
        fieldToggles: s.fieldToggles && typeof s.fieldToggles === 'object' ? s.fieldToggles : {},
        dashCards: s.dashCards && typeof s.dashCards === 'object' ? s.dashCards : {},
        customPanels: Array.isArray(s.customPanels) ? s.customPanels : [],
    });
    s.profiles = [legacy];
    s.activeProfileId = legacy.id;
    log('Profiles migration: wrapped legacy settings as "Default" profile', legacy.id);
    return true;
}

/**
 * v6.16.2 backfill — clean up "shadowed root data" orphaned by the v6.13.0
 * migration. The original `migrateLegacySettingsToProfile` COPIED legacy
 * values into the new profile but left the originals at the root. Result:
 * the diagnostics bundle and other consumers that read from raw `s` saw
 * stale data that the UI was no longer using (Panel C synthesis).
 *
 * Rules per Panel C Q3 (treats all six profile-overlay fields uniformly):
 *  - panels / fieldToggles / dashCards / customPanels: ALWAYS overlaid by
 *    profile. If profile has its own value, root is dead → clear. If profile
 *    is empty/missing the field, MOVE root → profile.
 *  - schema / systemPrompt: only overlaid when profile.<x> is non-null. If
 *    profile.<x> IS non-null, root is dead → clear. Otherwise root is
 *    genuinely effective; leave it.
 *
 * Idempotent. Logs each field cleared. Returns the count of fields touched.
 */
export function migrateOrphanRootData(s) {
    if (!s || typeof s !== 'object') return 0;
    if (!Array.isArray(s.profiles) || !s.profiles.length || !s.activeProfileId) return 0;
    const profile = s.profiles.find(p => p && p.id === s.activeProfileId);
    if (!profile) return 0;
    let touched = 0;

    // Always-overlaid object/array fields
    const _alwaysOverlaid = [
        { key: 'panels',        emptyVal: () => ({}) },
        { key: 'fieldToggles',  emptyVal: () => ({}) },
        { key: 'dashCards',     emptyVal: () => ({}) },
        { key: 'customPanels',  emptyVal: () => [] },
    ];
    for (const { key, emptyVal } of _alwaysOverlaid) {
        const rootVal = s[key];
        const profVal = profile[key];
        const rootHas = (Array.isArray(rootVal) ? rootVal.length > 0
                          : (rootVal && typeof rootVal === 'object' && Object.keys(rootVal).length > 0));
        if (!rootHas) continue;
        const profHas = (Array.isArray(profVal) ? profVal.length > 0
                          : (profVal && typeof profVal === 'object' && Object.keys(profVal).length > 0));
        if (profHas) {
            // Profile owns it; root is dead weight.
            log(`Orphan migration: cleared root.${key} (shadowed by profile "${profile.name}")`);
            s[key] = emptyVal();
            touched++;
        } else {
            // Profile is empty; promote root → profile.
            log(`Orphan migration: moved root.${key} → profile "${profile.name}"`);
            profile[key] = rootVal;
            s[key] = emptyVal();
            touched++;
        }
    }

    // Conditionally-overlaid scalar fields — only touch if profile sets them.
    const _conditionallyOverlaid = ['schema', 'systemPrompt'];
    for (const key of _conditionallyOverlaid) {
        const profSet = (typeof profile[key] === 'string' && profile[key].trim().length > 0);
        if (!profSet) continue; // root is genuinely effective; leave it
        const rootVal = s[key];
        if (typeof rootVal === 'string' && rootVal.trim().length > 0) {
            log(`Orphan migration: cleared root.${key} (shadowed by profile.${key})`);
            s[key] = null;
            touched++;
        }
    }

    if (touched > 0) {
        profile.updatedAt = new Date().toISOString();
    }
    return touched;
}

/**
 * Resolve the currently-active profile.
 *
 * Resolution order:
 *   1. If chat metadata has scenepulse.activeProfileId AND that profile
 *      exists, use it (per-chat override).
 *   2. Else use s.activeProfileId.
 *   3. Else fall back to s.profiles[0].
 *   4. Else (no profiles at all — shouldn't happen post-migration) build
 *      an emergency stub from legacy fields directly. Defensive only.
 */
export function getActiveProfile(s, chatMetadata) {
    if (!s || typeof s !== 'object') s = {};
    const profiles = Array.isArray(s.profiles) ? s.profiles : [];

    let activeId = null;
    try {
        const cm = chatMetadata || (typeof SillyTavern !== 'undefined' ? SillyTavern.getContext().chatMetadata : null);
        if (cm && cm.scenepulse && cm.scenepulse.activeProfileId) {
            const overrideId = cm.scenepulse.activeProfileId;
            if (profiles.some(p => p && p.id === overrideId)) {
                activeId = overrideId;
            }
        }
    } catch {}

    if (!activeId && s.activeProfileId) {
        if (profiles.some(p => p && p.id === s.activeProfileId)) {
            activeId = s.activeProfileId;
        }
    }

    if (!activeId && profiles.length > 0) {
        activeId = profiles[0].id;
    }

    if (activeId) {
        const found = profiles.find(p => p && p.id === activeId);
        if (found) return found;
    }

    // Emergency fallback — synthesize from legacy fields. Only happens if
    // migration never ran (e.g. settings stub from a test).
    return makeProfile({
        name: 'Emergency Default',
        schema: typeof s.schema === 'string' && s.schema.trim() ? s.schema : null,
        systemPrompt: typeof s.systemPrompt === 'string' && s.systemPrompt.trim() ? s.systemPrompt : null,
        panels: s.panels || {},
        fieldToggles: s.fieldToggles || {},
        dashCards: s.dashCards || {},
        customPanels: Array.isArray(s.customPanels) ? s.customPanels : [],
    });
}

/**
 * CRUD: create a new profile, append to s.profiles. Returns the new
 * profile. Caller is responsible for saveSettings().
 */
export function createProfile(s, partial = {}) {
    if (!Array.isArray(s.profiles)) s.profiles = [];
    const name = _uniqueName(s.profiles, partial.name || 'New Profile');
    const p = makeProfile({ ...partial, name });
    s.profiles.push(p);
    return p;
}

/**
 * Duplicate the named profile. Auto-suffixes "(copy)" / "(copy 2)" so
 * the new name is unique. Returns the duplicate.
 */
export function duplicateProfile(s, profileId) {
    const src = s.profiles.find(p => p.id === profileId);
    if (!src) return null;
    const baseName = src.name + ' (copy)';
    const name = _uniqueName(s.profiles, baseName);
    const copy = makeProfile({
        ...JSON.parse(JSON.stringify(src)),
        id: _uuid(),
        name,
        createdAt: _nowIso(),
        updatedAt: _nowIso(),
    });
    s.profiles.push(copy);
    return copy;
}

/**
 * Rename a profile. Returns true if the rename happened. Auto-resolves
 * collisions by adding a numeric suffix.
 */
export function renameProfile(s, profileId, newName) {
    const p = s.profiles.find(x => x.id === profileId);
    if (!p) return false;
    const trimmed = String(newName || '').trim();
    if (!trimmed) return false;
    if (trimmed === p.name) return true;
    p.name = _uniqueName(s.profiles.filter(x => x.id !== profileId), trimmed);
    p.updatedAt = _nowIso();
    return true;
}

/**
 * Delete a profile. Refuses to delete the last remaining profile.
 * If the deleted profile was active, falls back to the first remaining.
 * Returns the new activeProfileId (or null if deletion was refused).
 */
export function deleteProfile(s, profileId) {
    if (!Array.isArray(s.profiles) || s.profiles.length <= 1) return null;
    const idx = s.profiles.findIndex(p => p.id === profileId);
    if (idx < 0) return null;
    s.profiles.splice(idx, 1);
    if (s.activeProfileId === profileId) {
        s.activeProfileId = s.profiles[0].id;
    }
    // Clear any per-chat override pointing at the deleted profile.
    try {
        const cm = SillyTavern.getContext().chatMetadata;
        if (cm && cm.scenepulse && cm.scenepulse.activeProfileId === profileId) {
            cm.scenepulse.activeProfileId = null;
            try { SillyTavern.getContext().saveMetadata(); } catch {}
        }
    } catch {}
    return s.activeProfileId;
}

/**
 * Set the global active profile. Returns true on success. Does NOT save.
 */
export function setActiveProfile(s, profileId) {
    if (!s.profiles || !s.profiles.some(p => p.id === profileId)) return false;
    s.activeProfileId = profileId;
    return true;
}

/**
 * Set or clear the per-chat profile override.
 * Pass null to clear (revert to global).
 */
export function setChatActiveProfile(profileId) {
    try {
        const ctx = SillyTavern.getContext();
        if (!ctx || !ctx.chatMetadata) return false;
        if (!ctx.chatMetadata.scenepulse) ctx.chatMetadata.scenepulse = { snapshots: {} };
        if (profileId) ctx.chatMetadata.scenepulse.activeProfileId = profileId;
        else delete ctx.chatMetadata.scenepulse.activeProfileId;
        try { ctx.saveMetadata(); } catch {}
        return true;
    } catch { return false; }
}

/**
 * Update fields on the active profile. Used when the user edits the
 * schema textarea / system prompt textarea / customPanels list. The
 * read-through getter resolves through profiles, so writes need to land
 * on the active profile, not on legacy s.schema / s.systemPrompt.
 */
export function updateActiveProfile(s, patch) {
    const p = getActiveProfile(s);
    if (!p) return false;
    const live = s.profiles.find(x => x.id === p.id);
    if (!live) return false;
    for (const k of PROFILE_FIELDS) {
        if (k in patch) live[k] = patch[k];
    }
    live.updatedAt = _nowIso();
    return true;
}

/**
 * Validate an imported profile object. Returns { ok, profile, errors }.
 * Strict-enough to refuse obviously-malformed input but permissive on
 * cosmetic fields.
 */
export function validateImportedProfile(raw) {
    const errors = [];
    if (!raw || typeof raw !== 'object') {
        return { ok: false, profile: null, errors: ['Not a JSON object'] };
    }
    if (typeof raw.name !== 'string' || !raw.name.trim()) {
        errors.push('Missing or empty "name"');
    }
    if (raw.schema != null && typeof raw.schema !== 'string') {
        errors.push('"schema" must be a string (JSON-encoded) or null');
    }
    if (typeof raw.schema === 'string' && raw.schema.trim()) {
        try {
            const parsed = JSON.parse(raw.schema);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                errors.push('"schema" parses but is not a JSON object');
            } else if (parsed.type && parsed.type !== 'object') {
                errors.push('"schema" root type must be "object"');
            }
        } catch (e) {
            errors.push('"schema" is not valid JSON: ' + (e?.message || 'parse error'));
        }
    }
    if (raw.systemPrompt != null && typeof raw.systemPrompt !== 'string') {
        errors.push('"systemPrompt" must be a string or null');
    }
    if (raw.customPanels != null && !Array.isArray(raw.customPanels)) {
        errors.push('"customPanels" must be an array');
    }
    if (errors.length > 0) {
        return { ok: false, profile: null, errors };
    }
    // Build a clean profile from the raw payload, dropping any unknown
    // top-level keys. Always assigns a fresh id to avoid collisions with
    // existing profiles on import.
    const profile = makeProfile({
        name: raw.name,
        description: raw.description || '',
        schema: raw.schema || null,
        systemPrompt: raw.systemPrompt || null,
        // v6.18.0: per-slot prompt overrides survive export/import so users
        // can share customized prompts via the existing profile JSON file.
        promptOverrides: raw.promptOverrides && typeof raw.promptOverrides === 'object'
            ? raw.promptOverrides : {},
        // v6.19.0: role selector also survives export/import.
        systemPromptRole: raw.systemPromptRole,
        panels: raw.panels || {},
        fieldToggles: raw.fieldToggles || {},
        dashCards: raw.dashCards || {},
        customPanels: raw.customPanels || [],
    });
    return { ok: true, profile, errors: [] };
}

/**
 * Import a validated profile into s.profiles. Auto-suffixes the name to
 * avoid collision with existing profiles. Returns the imported profile.
 */
export function importProfile(s, profile) {
    if (!Array.isArray(s.profiles)) s.profiles = [];
    profile.name = _uniqueName(s.profiles, profile.name);
    s.profiles.push(profile);
    return profile;
}

/**
 * Serialize a profile for export. Strips the id (recipient gets a fresh
 * one on import) and any per-chat residue. Adds an export marker.
 */
export function exportProfile(profile) {
    if (!profile) return null;
    const { id, ...rest } = profile;
    return {
        ...rest,
        _scenepulseExport: 'profile',
        _exportedAt: _nowIso(),
    };
}

// ─── Helpers ───────────────────────────────────────────────────────────

function _uniqueName(profiles, desired) {
    const existing = new Set((profiles || []).map(p => (p?.name || '').toLowerCase().trim()));
    const trimmed = String(desired || 'Profile').trim() || 'Profile';
    if (!existing.has(trimmed.toLowerCase())) return trimmed;
    for (let i = 2; i < 1000; i++) {
        const candidate = `${trimmed} (${i})`;
        if (!existing.has(candidate.toLowerCase())) return candidate;
    }
    return `${trimmed} (${Date.now()})`;
}

// ─── Exports for tests ──────────────────────────────────────────────────
export const _internals = { _uuid, _uniqueName, PROFILE_FIELDS, SCHEMA_VERSION };
