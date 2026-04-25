// src/ui/preset-browser.js — Browseable list of bundled model presets (v6.21.0)
//
// Discoverability fix: in v6.20.0 the only way to apply a bundled preset was
// the auto-suggestion toast at startup, which only fired if model detection
// matched and the user accepted it in the moment. This modal lets users
// browse all 30 presets, search, filter by family, and apply manually.
//
// Pattern matches the Debug Inspector / Prompt Editor: full-screen overlay
// reusing .sp-cl-overlay, lazy-imported on button click.

import { t } from '../i18n.js';
import { esc, spConfirm, spPrompt } from '../utils.js';
import { getSettings, saveSettings } from '../settings.js';
import { getActiveProfile, updateActiveProfile, makeProfile } from '../profiles.js';
import { BUILT_IN_PRESETS, buildPresetPatch, getActiveModelId, findMatchingPreset } from '../presets/registry.js';
import { getPresetFamilies } from '../presets/built-in.js';

let _activeBrowser = null;

/**
 * @param {object} [opts]
 * @param {boolean} [opts.createNewMode]  When true, the default Apply behavior
 *   creates a new profile from the template instead of overlaying onto the
 *   active one. Used by the Profile Manager's "+ New from template" button.
 */
export function openPresetBrowser(opts = {}) {
    closePresetBrowser();
    const _createNewMode = !!opts.createNewMode;
    const s = getSettings();
    const profile = getActiveProfile(s);
    if (!profile) {
        try { toastr.error(t('No active profile — open the Profile manager first.')); } catch {}
        return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'sp-cl-overlay sp-pb-overlay';
    const families = ['all', ...getPresetFamilies()];
    const detectedModel = getActiveModelId();
    const detectedPreset = detectedModel ? findMatchingPreset(detectedModel) : null;

    // v6.23.0: shared "Configure Prompts" header with tab strip — Templates
    // tab is the active one. Slots tab swaps to the prompt editor modal.
    overlay.innerHTML = `
        <div class="sp-cl-container sp-pb-container">
            <div class="sp-cl-header">
                <div class="sp-cl-title">${t('Configure Prompts')} <span class="sp-pe-profile-tag">${esc(profile.name || 'Untitled')}</span></div>
                <button class="sp-cl-close sp-pb-close" type="button" aria-label="${t('Close')}">✕</button>
            </div>
            <div class="sp-cp-tabstrip">
                <button class="sp-cp-tab" data-cp-tab="slots">${t('Slots')}</button>
                <button class="sp-cp-tab sp-cp-tab-active" data-cp-tab="templates">${t('Templates')} <span class="sp-pb-count">${BUILT_IN_PRESETS.length}</span></button>
            </div>
            <div class="sp-pb-body">
                <div class="sp-pb-detection">
                    ${detectedModel
                        ? (detectedPreset
                            ? t(`Active model: <code>${esc(detectedModel)}</code> → matched preset: <strong>${esc(detectedPreset.displayName)}</strong>`)
                            : t(`Active model: <code>${esc(detectedModel)}</code> — no bundled preset matched. Browse below or contribute one.`))
                        : t('No active model detected. Connect to an API to see preset suggestions.')}
                </div>
                ${_createNewMode ? `<div class="sp-pb-mode-banner">${t('Pick a template to create a NEW profile from. The template seeds the profile with model-tuned prompt slots; your existing profiles are not touched.')}</div>` : ''}
                <div class="sp-pb-toolbar">
                    <input type="search" class="sp-pb-search" placeholder="${t('Search by name, model id, or family…')}">
                    <div class="sp-pb-family-pills">
                        ${families.map(f => `<button class="sp-pb-family-pill ${f === 'all' ? 'sp-pb-family-active' : ''}" data-family="${esc(f)}">${esc(f === 'all' ? t('All') : f)}</button>`).join('')}
                    </div>
                </div>
                <ol class="sp-pb-list"></ol>
            </div>
        </div>
    `;

    const listEl = overlay.querySelector('.sp-pb-list');
    let activeFilter = 'all';
    let searchQ = '';

    function _renderList() {
        const q = searchQ.trim().toLowerCase();
        const filtered = BUILT_IN_PRESETS.filter(p => {
            if (activeFilter !== 'all' && p.family !== activeFilter) return false;
            if (!q) return true;
            const hay = [p.id, p.displayName, p.family, p.provider, p.notes, ...(p.matchPatterns || [])].join(' ').toLowerCase();
            return hay.includes(q);
        });
        if (!filtered.length) {
            listEl.innerHTML = `<li class="sp-pb-empty">${t('No presets match your filter.')}</li>`;
            return;
        }
        listEl.innerHTML = filtered.map(p => {
            const isApplied = profile.appliedPresetId === p.id;
            const isMatched = detectedPreset?.id === p.id;
            const slotCount = Object.keys(p.promptOverrides || {}).length;
            const overridesSummary = slotCount === 0
                ? t('No slot overrides — preset only sets the role.')
                : t(`Overrides ${slotCount} slot${slotCount === 1 ? '' : 's'}: ${Object.keys(p.promptOverrides).join(', ')}`);
            // v6.23.0: primary action defaults to "Create new profile" (the
            // panel's recommendation — invert the v6.20 default of overwriting
            // the active profile). "Apply to current" remains as a smaller
            // secondary button next to it for users who deliberately want to
            // overlay onto their active profile.
            return `
                <li class="sp-pb-row ${isApplied ? 'sp-pb-row-applied' : ''} ${isMatched ? 'sp-pb-row-matched' : ''}" data-preset-id="${esc(p.id)}">
                    <div class="sp-pb-row-head">
                        <div class="sp-pb-row-titles">
                            <span class="sp-pb-row-name">${esc(p.displayName)}</span>
                            <span class="sp-pb-row-family">${esc(p.family)}</span>
                            <span class="sp-pb-row-role" title="${t('System prompt sent as this role')}">${esc(p.systemPromptRole)}</span>
                            ${isMatched ? `<span class="sp-pb-row-tag sp-pb-row-tag-matched">${t('matches your model')}</span>` : ''}
                            ${isApplied ? `<span class="sp-pb-row-tag sp-pb-row-tag-applied">${t('applied')}</span>` : ''}
                        </div>
                        <div class="sp-pb-row-actions">
                            <button class="sp-cl-export-btn sp-pb-create" data-preset-id="${esc(p.id)}"
                                title="${t('Create a NEW profile seeded from this template. Your existing profiles are untouched.')}">${t('+ New profile')}</button>
                            <button class="sp-cl-export-btn sp-pb-overlay" data-preset-id="${esc(p.id)}" ${isApplied ? 'disabled' : ''}
                                title="${t('Apply this template ON TOP of your currently-active profile. Replaces matching prompt slots; preserves your other settings. Reversible.')}">${isApplied ? t('Applied') : t('Apply to current')}</button>
                        </div>
                    </div>
                    <div class="sp-pb-row-notes">${esc(p.notes)}</div>
                    <div class="sp-pb-row-meta">
                        <span class="sp-pb-row-meta-item">${t('Provider')}: ${esc(p.provider)}</span>
                        ${p.contextWindow ? `<span class="sp-pb-row-meta-item">${t('Context')}: ${(p.contextWindow / 1000).toFixed(0)}K</span>` : ''}
                        <span class="sp-pb-row-meta-item">${esc(overridesSummary)}</span>
                    </div>
                </li>`;
        }).join('');
        // Wire action buttons
        listEl.querySelectorAll('.sp-pb-create').forEach(btn => {
            btn.addEventListener('click', () => _createFromTemplate(btn.dataset.presetId));
        });
        listEl.querySelectorAll('.sp-pb-overlay').forEach(btn => {
            btn.addEventListener('click', () => _apply(btn.dataset.presetId));
        });
    }

    // v6.23.0: create a new profile seeded from a template. Default name is
    // the preset's displayName with a numeric suffix if needed; user can
    // edit the name in the prompt that fires before the create.
    async function _createFromTemplate(presetId) {
        const preset = BUILT_IN_PRESETS.find(p => p.id === presetId);
        if (!preset) return;
        const sNow = getSettings();
        const existingNames = new Set((sNow.profiles || []).map(p => p.name));
        let baseName = preset.displayName;
        let suggestedName = baseName;
        let n = 2;
        while (existingNames.has(suggestedName)) {
            suggestedName = `${baseName} (${n++})`;
        }
        const chosenName = await spPrompt(
            t('Create new profile from template'),
            t(`Pick a name for the new profile. The "${preset.displayName}" template will seed its prompt slots and system-prompt role; panels, schema, and other settings start empty (you can copy from another profile via Duplicate later).`),
            { value: suggestedName, placeholder: suggestedName, okLabel: t('Create profile') }
        );
        if (!chosenName || !chosenName.trim()) return;
        const finalName = chosenName.trim();
        // Build profile via makeProfile so all defaults (incl. promptOverrides /
        // systemPromptRole / appliedPresetId) flow through one path.
        const newProfile = makeProfile({
            name: finalName,
            description: t(`Seeded from template: ${preset.displayName}`),
            promptOverrides: { ...(preset.promptOverrides || {}) },
            systemPromptRole: preset.systemPromptRole || 'system',
            appliedPresetId: preset.id,
        });
        if (!Array.isArray(sNow.profiles)) sNow.profiles = [];
        sNow.profiles.push(newProfile);
        sNow.activeProfileId = newProfile.id;
        saveSettings();
        try { toastr.success(t(`Created "${finalName}" from ${preset.displayName} template — switched to it.`)); } catch {}
        // Local view update so the row reflects the new applied state.
        profile.appliedPresetId = newProfile.appliedPresetId;
        profile.promptOverrides = newProfile.promptOverrides;
        profile.systemPromptRole = newProfile.systemPromptRole;
        _renderList();
    }

    // v6.23.0: "Apply to current" — secondary path. Renamed from _apply for
    // clarity. The primary path is now _createFromTemplate which spins up a
    // new profile (non-destructive). This overlay path is what the user
    // explicitly chose when they clicked "Apply to current" — confirmation
    // microcopy spells out that it MERGES into the active profile.
    async function _apply(presetId) {
        const preset = BUILT_IN_PRESETS.find(p => p.id === presetId);
        if (!preset) return;
        const sNow = getSettings();
        const profileNow = getActiveProfile(sNow);
        if (!profileNow) { try { toastr.error(t('No active profile')); } catch {} return; }
        const slotCount = Object.keys(preset.promptOverrides || {}).length;
        const ok = await spConfirm(
            t(`Apply ${preset.displayName} on top of "${profileNow.name}"?`),
            `${preset.notes}\n\n${slotCount === 0
                ? t('This preset only sets the system-prompt role; no prompt slots will be modified.')
                : t(`This template will OVERWRITE ${slotCount} slot${slotCount === 1 ? '' : 's'} in your current profile (${Object.keys(preset.promptOverrides).join(', ')}). Your edits in OTHER slots are preserved.`)}\n\n${t('Your panels, schema, and other settings are not touched. Reversible from the prompt editor (Clear preset).')}\n\n${t('Tip: prefer "+ New profile" if you want to keep your current setup unchanged.')}`,
            { okLabel: t('Apply to current'), cancelLabel: t('Cancel'), danger: true }
        );
        if (!ok) return;
        const patch = buildPresetPatch(preset, profileNow);
        updateActiveProfile(sNow, { ...patch, appliedPresetId: preset.id });
        saveSettings();
        try { toastr.success(t(`Applied ${preset.displayName} to "${profileNow.name}"`)); } catch {}
        // Update the local profile reference + re-render so the new "applied"
        // badge reflects the change without closing the browser.
        profile.appliedPresetId = preset.id;
        profile.promptOverrides = patch.promptOverrides;
        profile.systemPromptRole = patch.systemPromptRole;
        _renderList();
    }

    _renderList();

    // Toolbar wiring
    overlay.querySelector('.sp-pb-search').addEventListener('input', function () {
        searchQ = this.value || '';
        _renderList();
    });
    overlay.querySelectorAll('.sp-pb-family-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            activeFilter = pill.dataset.family;
            overlay.querySelectorAll('.sp-pb-family-pill').forEach(p =>
                p.classList.toggle('sp-pb-family-active', p === pill));
            _renderList();
        });
    });
    // v6.23.0: Slots tab switches to the prompt editor modal.
    overlay.querySelector('.sp-cp-tab[data-cp-tab="slots"]')?.addEventListener('click', async () => {
        const ed = await import('./prompt-editor.js');
        _close();
        ed.openPromptEditor();
    });

    function _close() {
        try { document.removeEventListener('keydown', _esc, true); } catch {}
        overlay.remove();
        _activeBrowser = null;
    }
    overlay.querySelector('.sp-pb-close').addEventListener('click', _close);
    overlay.addEventListener('click', e => { if (e.target === overlay) _close(); });
    const _stop = (e) => e.stopPropagation();
    overlay.addEventListener('mousedown', _stop);
    overlay.addEventListener('pointerdown', _stop);
    const _esc = (e) => { if (e.key === 'Escape') { _close(); e.stopPropagation(); } };
    document.addEventListener('keydown', _esc, true);

    document.body.appendChild(overlay);
    _activeBrowser = overlay;
}

export function closePresetBrowser() {
    if (_activeBrowser) {
        try { _activeBrowser.remove(); } catch {}
        _activeBrowser = null;
    }
}
