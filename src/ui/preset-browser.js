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
import { esc, spConfirm } from '../utils.js';
import { getSettings, saveSettings } from '../settings.js';
import { getActiveProfile, updateActiveProfile } from '../profiles.js';
import { BUILT_IN_PRESETS, buildPresetPatch, getActiveModelId, findMatchingPreset } from '../presets/registry.js';
import { getPresetFamilies } from '../presets/built-in.js';

let _activeBrowser = null;

export function openPresetBrowser() {
    closePresetBrowser();
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

    overlay.innerHTML = `
        <div class="sp-cl-container sp-pb-container">
            <div class="sp-cl-header">
                <div class="sp-cl-title">${t('Model Presets')} <span class="sp-pb-count">${BUILT_IN_PRESETS.length}</span></div>
                <button class="sp-cl-close sp-pb-close" type="button" aria-label="${t('Close')}">✕</button>
            </div>
            <div class="sp-pb-body">
                <div class="sp-pb-detection">
                    ${detectedModel
                        ? (detectedPreset
                            ? t(`Active model: <code>${esc(detectedModel)}</code> → matched preset: <strong>${esc(detectedPreset.displayName)}</strong>`)
                            : t(`Active model: <code>${esc(detectedModel)}</code> — no bundled preset matched. Browse below or contribute one.`))
                        : t('No active model detected. Connect to an API to see preset suggestions.')}
                </div>
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
                        <button class="sp-cl-export-btn sp-pb-apply" data-preset-id="${esc(p.id)}" ${isApplied ? 'disabled' : ''}>${isApplied ? t('Applied') : t('Apply')}</button>
                    </div>
                    <div class="sp-pb-row-notes">${esc(p.notes)}</div>
                    <div class="sp-pb-row-meta">
                        <span class="sp-pb-row-meta-item">${t('Provider')}: ${esc(p.provider)}</span>
                        ${p.contextWindow ? `<span class="sp-pb-row-meta-item">${t('Context')}: ${(p.contextWindow / 1000).toFixed(0)}K</span>` : ''}
                        <span class="sp-pb-row-meta-item">${esc(overridesSummary)}</span>
                    </div>
                </li>`;
        }).join('');
        // Wire Apply buttons
        listEl.querySelectorAll('.sp-pb-apply').forEach(btn => {
            btn.addEventListener('click', () => _apply(btn.dataset.presetId));
        });
    }

    async function _apply(presetId) {
        const preset = BUILT_IN_PRESETS.find(p => p.id === presetId);
        if (!preset) return;
        const sNow = getSettings();
        const profileNow = getActiveProfile(sNow);
        if (!profileNow) { try { toastr.error(t('No active profile')); } catch {} return; }
        const slotCount = Object.keys(preset.promptOverrides || {}).length;
        const ok = await spConfirm(
            t(`Apply ${preset.displayName} preset?`),
            `${preset.notes}\n\n${slotCount === 0
                ? t('This preset only sets the system-prompt role; no prompt slots will be modified.')
                : t(`This preset overrides ${slotCount} slot${slotCount === 1 ? '' : 's'}. Your existing customizations in OTHER slots are preserved.`)}\n\n${t('Your panels, schema, and other settings are not touched. Reversible from the prompt editor.')}`,
            { okLabel: t('Apply'), cancelLabel: t('Cancel'), danger: false }
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
