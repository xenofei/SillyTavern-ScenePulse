// src/settings-ui/profiles-manager.js — Full-screen profile manager (v6.13.0, issue #15)
//
// Lazy-imported overlay with one-row-per-profile list view. Inline rename,
// duplicate, delete, set-active, export. Lets the user reorder by drag is
// out of scope for this first cut — alphabetic + active-first sort here.
//
// Reuses the .sp-cl-* overlay classes from css/crash-log.css for the modal
// shell + common toolbar/list patterns.

import { t } from '../i18n.js';
import { esc } from '../utils.js';
import { getSettings, saveSettings } from '../settings.js';
import {
    getActiveProfile, createProfile, duplicateProfile, renameProfile,
    deleteProfile, setActiveProfile, exportProfile, validateImportedProfile,
    importProfile,
} from '../profiles.js';

function _fmtTs(iso) {
    if (!iso) return '';
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

export function openProfilesManager(onChange) {
    document.querySelector('.sp-cl-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'sp-cl-overlay';
    overlay.innerHTML = `
        <div class="sp-cl-container">
            <div class="sp-cl-header">
                <div class="sp-cl-title">${t('Profile Manager')}</div>
                <button class="sp-cl-export-btn" id="sp-pm-new">＋ ${t('New')}</button>
                <button class="sp-cl-export-btn" id="sp-pm-import">⬆ ${t('Import')}</button>
                <input type="file" id="sp-pm-import-file" accept=".json" style="display:none">
                <button class="sp-cl-close">✕</button>
            </div>
            <div class="sp-cl-list" id="sp-pm-list"></div>
            <div class="sp-cl-footer">
                <span class="sp-cl-footer-text" id="sp-pm-stats"></span>
                <span class="sp-cl-footer-hint">${t('Active profile drives schema + prompt generation.')}</span>
            </div>
        </div>
    `;

    const list = overlay.querySelector('#sp-pm-list');
    const stats = overlay.querySelector('#sp-pm-stats');

    function render() {
        const s = getSettings();
        const profiles = Array.isArray(s.profiles) ? s.profiles.slice() : [];
        const active = getActiveProfile(s);
        // Sort: active first, then alphabetic
        profiles.sort((a, b) => {
            if (a.id === active?.id) return -1;
            if (b.id === active?.id) return 1;
            return (a.name || '').localeCompare(b.name || '');
        });
        list.innerHTML = '';
        if (!profiles.length) {
            list.innerHTML = `<div class="sp-cl-empty">${t('No profiles. Click "New" to create one.')}</div>`;
        } else {
            const frag = document.createDocumentFragment();
            for (const p of profiles) frag.appendChild(_renderRow(p, active));
            list.appendChild(frag);
        }
        stats.textContent = `${profiles.length} ${t('profile(s)')} · ${t('active')}: ${active?.name || '(none)'}`;
    }

    function _renderRow(p, active) {
        const isActive = active && p.id === active.id;
        const row = document.createElement('div');
        row.className = 'sp-cl-row sp-cl-sev-info' + (isActive ? ' sp-pm-row-active' : '');
        const tags = [];
        if (p.systemPrompt) tags.push(t('custom prompt'));
        if (p.schema) tags.push(t('custom schema'));
        if (Array.isArray(p.customPanels) && p.customPanels.length) tags.push(`${p.customPanels.length} ${t('panels')}`);
        const tagHtml = tags.length ? `<span class="sp-cl-src">${esc(tags.join(' · '))}</span>` : '';
        row.innerHTML = `
            <div class="sp-cl-row-header">
                ${isActive ? `<span class="sp-cl-sev-pill sp-cl-sev-pill-info">${t('ACTIVE')}</span>` : ''}
                <span class="sp-cl-msg"><strong>${esc(p.name)}</strong>${p.description ? ` — <span style="opacity:0.7">${esc(p.description)}</span>` : ''}</span>
                ${tagHtml}
                <span class="sp-cl-ts">${esc(_fmtTs(p.updatedAt))}</span>
            </div>
            <div class="sp-cl-row-actions" style="padding:6px 14px 8px 14px;display:flex;gap:4px;border-top:1px solid var(--sp-border)">
                ${isActive ? '' : `<button class="sp-btn sp-pm-activate">${t('Set Active')}</button>`}
                <button class="sp-btn sp-pm-rename">${t('Rename')}</button>
                <button class="sp-btn sp-pm-duplicate">${t('Duplicate')}</button>
                <button class="sp-btn sp-pm-export">${t('Export')}</button>
                <button class="sp-btn sp-pm-delete" style="color:#fca5a5">${t('Delete')}</button>
            </div>
        `;
        const actBtn = row.querySelector('.sp-pm-activate');
        if (actBtn) actBtn.addEventListener('click', (ev) => { ev.stopPropagation(); _activate(p.id); });
        row.querySelector('.sp-pm-rename').addEventListener('click', (ev) => { ev.stopPropagation(); _rename(p.id); });
        row.querySelector('.sp-pm-duplicate').addEventListener('click', (ev) => { ev.stopPropagation(); _duplicate(p.id); });
        row.querySelector('.sp-pm-export').addEventListener('click', (ev) => { ev.stopPropagation(); _export(p); });
        row.querySelector('.sp-pm-delete').addEventListener('click', (ev) => { ev.stopPropagation(); _delete(p.id, p.name); });
        return row;
    }

    function _notify() { try { if (typeof onChange === 'function') onChange(); } catch {} }

    function _activate(id) {
        const s = getSettings();
        if (!setActiveProfile(s, id)) return;
        saveSettings();
        try { import('../settings.js').then(m => m.forceFullStateRefresh && m.forceFullStateRefresh()); } catch {}
        try { toastr.success(t('Switched profile')); } catch {}
        _notify(); render();
    }

    function _rename(id) {
        const s = getSettings();
        const p = s.profiles?.find(x => x.id === id); if (!p) return;
        const newName = window.prompt(t('New name:'), p.name);
        if (!newName || !newName.trim()) return;
        if (renameProfile(s, id, newName.trim())) {
            saveSettings(); _notify(); render();
        }
    }

    function _duplicate(id) {
        const s = getSettings();
        const dup = duplicateProfile(s, id);
        if (!dup) return;
        saveSettings(); _notify(); render();
        try { toastr.success(t('Duplicated as') + ' ' + dup.name); } catch {}
    }

    function _export(p) {
        const payload = exportProfile(p);
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const safeName = (p.name || 'profile').replace(/[^a-z0-9_-]+/gi, '_').toLowerCase();
        const a = document.createElement('a'); a.href = url; a.download = `scenepulse-profile-${safeName}.json`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    }

    function _delete(id, name) {
        const s = getSettings();
        const profiles = Array.isArray(s.profiles) ? s.profiles : [];
        if (profiles.length <= 1) {
            try { toastr.warning(t('Cannot delete the last profile.')); } catch {}
            return;
        }
        if (!confirm(t('Delete profile') + ' "' + name + '"? ' + t('This cannot be undone.'))) return;
        if (deleteProfile(s, id)) {
            saveSettings(); _notify(); render();
            try { toastr.success(t('Deleted')); } catch {}
        }
    }

    overlay.querySelector('#sp-pm-new').addEventListener('click', () => {
        const name = window.prompt(t('Name for new profile:'), 'New Profile');
        if (!name || !name.trim()) return;
        const s = getSettings();
        const p = createProfile(s, { name: name.trim() });
        setActiveProfile(s, p.id); saveSettings();
        try { toastr.success(t('Created') + ': ' + p.name); } catch {}
        _notify(); render();
    });

    overlay.querySelector('#sp-pm-import').addEventListener('click', () => document.getElementById('sp-pm-import-file')?.click());
    overlay.querySelector('#sp-pm-import-file').addEventListener('change', async function () {
        const file = this.files?.[0]; if (!file) return; this.value = '';
        try {
            const text = await file.text();
            const raw = JSON.parse(text);
            const v = validateImportedProfile(raw);
            if (!v.ok) {
                try { toastr.error(t('Invalid profile') + ': ' + v.errors.join('; ')); } catch {}
                return;
            }
            const s = getSettings();
            const imp = importProfile(s, v.profile);
            saveSettings();
            try { toastr.success(t('Imported') + ': ' + imp.name); } catch {}
            _notify(); render();
        } catch (e) {
            try { toastr.error(t('Import failed') + ': ' + (e?.message || '')); } catch {}
        }
    });

    // Close handlers
    const _esc = (e) => { if (e.key === 'Escape') { _close(); e.stopPropagation(); } };
    function _close() { overlay.remove(); document.removeEventListener('keydown', _esc, true); }
    overlay.querySelector('.sp-cl-close').addEventListener('click', _close);
    overlay.addEventListener('click', e => { if (e.target === overlay) _close(); });
    const _stop = (e) => e.stopPropagation();
    overlay.addEventListener('mousedown', _stop);
    overlay.addEventListener('click', _stop);
    overlay.addEventListener('pointerdown', _stop);
    document.addEventListener('keydown', _esc, true);

    document.body.appendChild(overlay);
    render();
}
