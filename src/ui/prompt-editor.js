// src/ui/prompt-editor.js — Per-slot prompt editor modal (v6.19.0)
//
// Surfaces the v6.18.0 slot architecture as an editable UI. Full-screen
// overlay with one collapsible panel per editable slot. Edits are tracked
// in a working copy; "Save" commits to profile.promptOverrides atomically;
// "Cancel" discards. Per-slot revert removes that slot's override.
//
// Issue #16 (per-prompt role selector) lands here too: a one-line role
// dropdown above the slot list lets users send the assembled prompt as
// system / user / assistant. Stored as profile.systemPromptRole.
//
// Architecture notes:
//   - This module is lazy-imported on button click (same pattern as
//     debug-inspector / character-wiki / analytics) so the settings panel
//     load stays cheap.
//   - We mutate a local _draft state, not the profile directly. Save
//     calls updateActiveProfile(s, {...}) once with the diff.
//   - The fields slot is rendered as a read-only preview because it is
//     dynamically generated from panel/toggle settings, not text.
//   - spConfirm() is used for the unsaved-changes prompt + "Revert all"
//     to match every other ScenePulse confirmation.

import { t } from '../i18n.js';
import { esc, spConfirm } from '../utils.js';
import { getSettings, saveSettings } from '../settings.js';
import { getActiveProfile, updateActiveProfile } from '../profiles.js';
import { SLOT_IDS, SLOT_META, DEFAULT_SLOT_TEXT, isSlotOverridden } from '../prompts/slots.js';
import { findPresetById } from '../presets/built-in.js';

const ROLE_OPTIONS = [
    { value: 'system',    label: 'System (default)',
      hint: 'Sent as the system message. Most models follow these strictly.' },
    { value: 'user',      label: 'User',
      hint: 'Sent as a user message. Some models (notably Claude family) follow user-role JSON instructions more reliably than system.' },
    { value: 'assistant', label: 'Assistant',
      hint: 'Sent as if the assistant said it previously. Rarely useful — included for parity with embed-as-role.' },
];

let _activeEditor = null;

/**
 * Open the prompt editor for the active profile. Idempotent — a second
 * open call closes the existing instance first.
 */
export function openPromptEditor() {
    closePromptEditor();
    const s = getSettings();
    const profile = getActiveProfile(s);
    if (!profile) {
        try { toastr.error(t('No active profile — open the Profile manager first.')); } catch {}
        return;
    }

    // Working copy: { [slotId]: stringOrEmpty }. Empty string means "use default".
    const _draft = {
        overrides: { ...(profile.promptOverrides || {}) },
        role: profile.systemPromptRole || 'system',
        legacyFullPrompt: profile.systemPrompt || '',
    };
    let _dirty = false;

    const overlay = document.createElement('div');
    overlay.className = 'sp-cl-overlay sp-pe-overlay';

    // v6.22.0: applied-preset badge in the header so the user can see at a
    // glance which bundled preset (if any) is currently active. The Clear
    // button only clears the preset attribution — it does NOT auto-revert
    // the slot overrides the preset added (use Revert all / per-slot Revert
    // for that, since users may have made their own edits on top).
    const _appliedPreset = profile.appliedPresetId ? findPresetById(profile.appliedPresetId) : null;
    const _presetRow = _renderPresetRow(_appliedPreset);
    // v6.23.0: shared "Configure Prompts" header with tab strip. The slot
    // editor and the preset browser are now sibling tabs of one modal —
    // clicking "Templates" closes this modal and opens the preset browser
    // with the same shared chrome. Discoverability + IA per the v6.23.0
    // panel: one entry point, two views of one concept.
    overlay.innerHTML = `
        <div class="sp-cl-container sp-pe-container">
            <div class="sp-cl-header">
                <div class="sp-cl-title">${t('Configure Prompts')} <span class="sp-pe-profile-tag">${esc(profile.name || 'Untitled')}</span></div>
                <button class="sp-cl-export-btn sp-pe-revert-all" title="${t('Revert every slot to its default text. Does not affect the role selector.')}">${t('Revert all')}</button>
                <button class="sp-cl-export-btn sp-pe-cancel">${t('Cancel')}</button>
                <button class="sp-cl-export-btn sp-pe-save sp-pe-save-disabled" disabled>${t('Save')}</button>
                <button class="sp-cl-close sp-pe-close" type="button" aria-label="${t('Close editor')}">✕</button>
            </div>
            <div class="sp-cp-tabstrip">
                <button class="sp-cp-tab sp-cp-tab-active" data-cp-tab="slots">${t('Slots')}</button>
                <button class="sp-cp-tab" data-cp-tab="templates">${t('Templates')}</button>
            </div>
            <div class="sp-pe-body">
                ${_presetRow}
                ${_renderRoleRow(_draft.role)}
                ${_draft.legacyFullPrompt ? _renderLegacyBanner() : ''}
                <ol class="sp-pe-slot-list"></ol>
                <details class="sp-pe-preview">
                    <summary>${t('Preview the assembled prompt')}</summary>
                    <pre class="sp-pe-preview-body"></pre>
                </details>
            </div>
        </div>
    `;

    const slotList = overlay.querySelector('.sp-pe-slot-list');
    for (const id of SLOT_IDS) {
        const meta = SLOT_META[id];
        if (!meta) continue;
        slotList.appendChild(_renderSlotPanel(id, meta, _draft));
    }

    document.body.appendChild(overlay);

    function _markDirty() {
        _dirty = true;
        const btn = overlay.querySelector('.sp-pe-save');
        if (btn) { btn.disabled = false; btn.classList.remove('sp-pe-save-disabled'); }
    }

    function _refreshPreview() {
        const pre = overlay.querySelector('.sp-pe-preview-body');
        if (!pre) return;
        // Build a synthetic profile that reflects the current draft so the
        // preview shows what Save would actually produce. We pass the live
        // settings (with the active profile applied via _buildProfileView)
        // by reading getActivePrompt — but we want THIS draft, not the
        // saved one. Easiest: import assemblePrompt and call directly.
        try {
            // Lazy import to avoid the circular settings.js → prompts/assembler.js cycle
            // at module-eval time of this UI module.
            import('../prompts/assembler.js').then(({ assemblePrompt }) => {
                const draftProfile = {
                    promptOverrides: _draft.overrides,
                    systemPrompt: null, // preview ignores legacy override so users see the slot result
                };
                const sNow = getSettings();
                const text = assemblePrompt(sNow, draftProfile, {});
                pre.textContent = text;
            }).catch(() => {});
        } catch {}
    }
    _refreshPreview();

    function _close({ skipDirtyCheck = false } = {}) {
        if (!skipDirtyCheck && _dirty) {
            spConfirm(
                t('Discard unsaved changes?'),
                t('You have edits that have not been saved. Closing now will discard them.'),
                { okLabel: t('Discard'), cancelLabel: t('Keep editing'), danger: true }
            ).then(ok => { if (ok) _close({ skipDirtyCheck: true }); });
            return;
        }
        try { document.removeEventListener('keydown', _esc, true); } catch {}
        overlay.remove();
        _activeEditor = null;
    }

    function _save() {
        if (!_dirty) return;
        // Strip empty strings so persisted JSON stays minimal — empty/falsy
        // means "use default" by getSlotText semantics.
        const overridesClean = {};
        for (const [k, v] of Object.entries(_draft.overrides)) {
            if (typeof v === 'string' && v.trim()) overridesClean[k] = v;
        }
        const sNow = getSettings();
        updateActiveProfile(sNow, {
            promptOverrides: overridesClean,
            systemPromptRole: _draft.role,
        });
        saveSettings();
        try { toastr.success(t('Prompt saved')); } catch {}
        _dirty = false;
        _close({ skipDirtyCheck: true });
    }

    // Wire toolbar
    overlay.querySelector('.sp-pe-cancel').addEventListener('click', () => _close());
    overlay.querySelector('.sp-pe-close').addEventListener('click', () => _close());
    overlay.querySelector('.sp-pe-save').addEventListener('click', _save);
    // v6.23.0: tab strip wiring — clicking Templates closes this modal and
    // opens the preset browser with the same chrome. Dirty-edit guard fires
    // before the swap.
    overlay.querySelector('.sp-cp-tab[data-cp-tab="templates"]')?.addEventListener('click', async () => {
        const _swap = async () => {
            const ov = await import('./preset-browser.js');
            _close({ skipDirtyCheck: true });
            ov.openPresetBrowser();
        };
        if (_dirty) {
            const ok = await spConfirm(
                t('Switch to Templates tab?'),
                t('You have unsaved slot edits. Switching tabs will discard them.'),
                { okLabel: t('Discard and switch'), cancelLabel: t('Keep editing'), danger: true }
            );
            if (!ok) return;
        }
        _swap();
    });
    overlay.querySelector('.sp-pe-revert-all').addEventListener('click', async () => {
        const customCount = Object.values(_draft.overrides).filter(v => typeof v === 'string' && v.trim()).length;
        if (customCount === 0) { try { toastr.info(t('Nothing to revert — every slot is already on its default.')); } catch {} return; }
        const ok = await spConfirm(
            t('Revert all slots to defaults?'),
            t(`This will clear ${customCount} customized ${customCount === 1 ? 'slot' : 'slots'} in this draft. Press Save afterwards to commit, or Cancel to discard the revert too.`),
            { okLabel: t('Revert all'), cancelLabel: t('Keep edits'), danger: true }
        );
        if (!ok) return;
        _draft.overrides = {};
        // Re-render slot list in place
        slotList.innerHTML = '';
        for (const id of SLOT_IDS) {
            const meta = SLOT_META[id];
            if (!meta) continue;
            slotList.appendChild(_renderSlotPanel(id, meta, _draft));
        }
        _markDirty();
        _refreshPreview();
    });

    // Wire role row
    overlay.querySelector('.sp-pe-role-select')?.addEventListener('change', function () {
        _draft.role = this.value;
        _updateRoleHint(overlay, this.value);
        _markDirty();
    });
    // v6.22.0: Clear preset button — clears appliedPresetId so the suggestion
    // toast can re-fire and the editor stops showing the "Active preset" badge.
    // Slot overrides the preset added are NOT auto-reverted; user uses
    // Revert all / per-slot Revert for that, since they may have edited
    // some slots manually on top of the preset.
    // v6.22.0: Clear legacy prompt button (only present when banner is shown).
    // The legacy textarea was removed from Settings, so this is now the only
    // user-facing path to clear profile.systemPrompt.
    overlay.querySelector('.sp-pe-legacy-clear')?.addEventListener('click', async () => {
        const ok = await spConfirm(
            t('Clear the legacy full prompt?'),
            t('This removes the hand-authored full prompt from this profile. The slot system (with any overrides + applied preset) will take effect immediately. Your slot edits in this draft are unaffected.'),
            { okLabel: t('Clear legacy prompt'), cancelLabel: t('Keep'), danger: true }
        );
        if (!ok) return;
        const sNow = getSettings();
        updateActiveProfile(sNow, { systemPrompt: null });
        saveSettings();
        try { toastr.success(t('Legacy prompt cleared. Slots are now active.')); } catch {}
        // Remove the banner from this draft so the user sees the change without re-opening.
        _draft.legacyFullPrompt = '';
        const banner = overlay.querySelector('.sp-pe-legacy-banner');
        if (banner) banner.remove();
        _refreshPreview();
    });
    overlay.querySelector('.sp-pe-preset-clear')?.addEventListener('click', () => {
        const sNow = getSettings();
        updateActiveProfile(sNow, { appliedPresetId: null });
        saveSettings();
        try { toastr.info(t('Preset attribution cleared. Slot overrides remain — use Revert to undo any of them.')); } catch {}
        // Update local view
        profile.appliedPresetId = null;
        const row = overlay.querySelector('.sp-pe-preset-row');
        if (row) row.outerHTML = _renderPresetRow(null);
    });

    // Wire per-slot panels
    overlay.querySelectorAll('.sp-pe-slot').forEach(panel => {
        const id = panel.dataset.slotId;
        const ta = panel.querySelector('.sp-pe-ta');
        if (ta) {
            ta.addEventListener('input', () => {
                _draft.overrides[id] = ta.value;
                _updateSlotStatus(panel, id, _draft);
                _markDirty();
                _refreshPreview();
            });
        }
        const revertBtn = panel.querySelector('.sp-pe-slot-revert');
        if (revertBtn) {
            revertBtn.addEventListener('click', () => {
                delete _draft.overrides[id];
                if (ta) ta.value = DEFAULT_SLOT_TEXT[id] || '';
                _updateSlotStatus(panel, id, _draft);
                _markDirty();
                _refreshPreview();
            });
        }
    });

    // Backdrop click closes (with dirty check); inner clicks don't bubble
    overlay.addEventListener('click', e => { if (e.target === overlay) _close(); });
    const _stop = (e) => e.stopPropagation();
    overlay.addEventListener('mousedown', _stop);
    overlay.addEventListener('pointerdown', _stop);
    const _esc = (e) => { if (e.key === 'Escape') { _close(); e.stopPropagation(); } };
    document.addEventListener('keydown', _esc, true);

    _activeEditor = overlay;
}

export function closePromptEditor() {
    if (_activeEditor) {
        try { _activeEditor.remove(); } catch {}
        _activeEditor = null;
    }
}

// ── Renderers ──────────────────────────────────────────────────────────

function _renderPresetRow(preset) {
    if (!preset) {
        return `
            <div class="sp-pe-preset-row sp-pe-preset-row-none">
                <span class="sp-pe-preset-label">${t('Active preset:')}</span>
                <span class="sp-pe-preset-none">${t('none — slots use defaults / your edits only')}</span>
            </div>`;
    }
    return `
        <div class="sp-pe-preset-row">
            <span class="sp-pe-preset-label">${t('Active preset:')}</span>
            <span class="sp-pe-preset-name">${esc(preset.displayName)}</span>
            <span class="sp-pe-preset-family">${esc(preset.family)}</span>
            <span class="sp-pe-preset-notes">${esc(preset.notes)}</span>
            <button class="sp-pe-preset-clear" type="button"
                title="${t('Clear preset attribution. Slot overrides the preset added are kept — use Revert all to undo those too.')}">${t('Clear preset')}</button>
        </div>`;
}

function _renderRoleRow(currentRole) {
    const opts = ROLE_OPTIONS.map(o =>
        `<option value="${o.value}" ${o.value === currentRole ? 'selected' : ''}>${esc(t(o.label))}</option>`).join('');
    const initialHint = ROLE_OPTIONS.find(o => o.value === currentRole)?.hint || '';
    return `
        <div class="sp-pe-role-row">
            <label class="sp-pe-role-label" for="sp-pe-role">${t('Send prompt as role')}</label>
            <select class="sp-pe-role-select" id="sp-pe-role">${opts}</select>
            <span class="sp-pe-role-hint">${esc(t(initialHint))}</span>
        </div>
    `;
}

function _updateRoleHint(overlay, value) {
    const hint = ROLE_OPTIONS.find(o => o.value === value)?.hint || '';
    const el = overlay.querySelector('.sp-pe-role-hint');
    if (el) el.textContent = t(hint);
}

function _renderLegacyBanner() {
    return `
        <div class="sp-pe-legacy-banner">
            <strong>${t('Heads up:')}</strong>
            ${t('this profile has a legacy "full system prompt" set, which currently overrides the slot system entirely. Your slot edits below will be saved but won\'t take effect until the legacy prompt is cleared.')}
            <button class="sp-pe-legacy-clear" type="button">${t('Clear legacy prompt')}</button>
        </div>
    `;
}

function _renderSlotPanel(id, meta, draft) {
    const li = document.createElement('li');
    li.className = 'sp-pe-slot';
    li.dataset.slotId = id;
    if (!meta.editable) li.classList.add('sp-pe-slot-readonly');

    const overridden = isSlotOverridden(id, { promptOverrides: draft.overrides });
    if (overridden) li.classList.add('sp-pe-slot-modified');

    const text = meta.editable
        ? (typeof draft.overrides[id] === 'string' ? draft.overrides[id] : (DEFAULT_SLOT_TEXT[id] || ''))
        : '';

    const editor = meta.editable
        ? `<textarea class="sp-pe-ta" rows="6" spellcheck="false" placeholder="${t('Use the default text for this slot.')}">${esc(text)}</textarea>`
        : `<div class="sp-pe-readonly">${t('This slot is auto-generated from your enabled Panels and Field Toggles. Change those settings to customize what fields the AI is asked to produce.')}</div>`;

    const tplVars = (meta.templateVars || []).length
        ? `<div class="sp-pe-tplvars">${t('Template variables:')} ${meta.templateVars.map(v => `<code>\${${esc(v)}}</code>`).join(' ')}</div>`
        : '';

    li.innerHTML = `
        <header class="sp-pe-slot-head">
            <span class="sp-pe-slot-order">${meta.order}</span>
            <div class="sp-pe-slot-titles">
                <div class="sp-pe-slot-name">${esc(t(meta.name))}</div>
                <div class="sp-pe-slot-desc">${esc(t(meta.description))}</div>
            </div>
            <span class="sp-pe-slot-status">${overridden ? t('modified') : t('default')}</span>
            ${meta.editable ? `<button class="sp-pe-slot-revert" type="button"
                ${overridden ? '' : 'disabled'}
                title="${t('Replace this slot with its default text. Doesn\'t take effect until Save.')}">${t('Revert')}</button>` : ''}
        </header>
        ${tplVars}
        <div class="sp-pe-slot-editor">${editor}</div>
    `;
    return li;
}

function _updateSlotStatus(panel, id, draft) {
    const overridden = isSlotOverridden(id, { promptOverrides: draft.overrides });
    panel.classList.toggle('sp-pe-slot-modified', overridden);
    const status = panel.querySelector('.sp-pe-slot-status');
    if (status) status.textContent = overridden ? t('modified') : t('default');
    const revertBtn = panel.querySelector('.sp-pe-slot-revert');
    if (revertBtn) revertBtn.disabled = !overridden;
}
