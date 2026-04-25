// src/settings-ui/profiles-manager.js — Full-screen profile manager (v6.13.0, issue #15)
//
// Lazy-imported overlay with one-row-per-profile list view. Inline rename,
// duplicate, delete, set-active, export. Lets the user reorder by drag is
// out of scope for this first cut — alphabetic + active-first sort here.
//
// Reuses the .sp-cl-* overlay classes from css/crash-log.css for the modal
// shell + common toolbar/list patterns.

import { t } from '../i18n.js';
import { esc, spConfirm, spPrompt } from '../utils.js';
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
        // Each tag carries a `title` tooltip explaining what it means so
        // users don't have to guess. "2 PANELS" alone is opaque; the
        // tooltip explains it's the profile's seed panel set.
        const tags = [];
        if (p.systemPrompt) tags.push(`<span class="sp-pm-tag" title="${esc(t('Profile overrides the dynamically built system prompt with custom text.'))}">${esc(t('Custom Prompt'))}</span>`);
        if (p.schema) tags.push(`<span class="sp-pm-tag" title="${esc(t('Profile overrides the dynamically built JSON schema with custom JSON.'))}">${esc(t('Custom Schema'))}</span>`);
        if (Array.isArray(p.customPanels) && p.customPanels.length) {
            const n = p.customPanels.length;
            const names = p.customPanels.map(cp => cp?.name || 'Untitled').join(', ');
            tags.push(`<span class="sp-pm-tag" title="${esc(t('This profile defines') + ' ' + n + ' ' + t('custom panel(s) used as the default starting set for new chats:') + ' ' + names)}">${n} ${esc(n === 1 ? t('Custom Panel') : t('Custom Panels'))}</span>`);
        }
        const tagHtml = tags.join(' ');
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
                ${Array.isArray(p.customPanels) && p.customPanels.length ? `<button class="sp-btn sp-pm-clear-panels" title="${esc(t('Remove all custom panels from this profile so they no longer seed new chats.'))}">${t('Clear Panels')}</button>` : ''}
                <button class="sp-btn sp-pm-delete">${t('Delete')}</button>
            </div>
        `;
        const actBtn = row.querySelector('.sp-pm-activate');
        if (actBtn) actBtn.addEventListener('click', (ev) => { ev.stopPropagation(); _activate(p.id); });
        row.querySelector('.sp-pm-rename').addEventListener('click', (ev) => { ev.stopPropagation(); _rename(p.id); });
        row.querySelector('.sp-pm-duplicate').addEventListener('click', (ev) => { ev.stopPropagation(); _duplicate(p.id); });
        row.querySelector('.sp-pm-export').addEventListener('click', (ev) => { ev.stopPropagation(); _export(p); });
        const clearBtn = row.querySelector('.sp-pm-clear-panels');
        if (clearBtn) clearBtn.addEventListener('click', (ev) => { ev.stopPropagation(); _clearPanels(p.id, p.name); });
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

    async function _rename(id) {
        const s = getSettings();
        const p = s.profiles?.find(x => x.id === id); if (!p) return;
        const newName = await spPrompt(
            t('Rename profile'),
            t('Enter a new name for') + ` "${p.name}":`,
            { value: p.name, placeholder: t('Profile name'),
              validate: v => v ? null : t('Name cannot be empty.') }
        );
        if (!newName) return;
        if (renameProfile(s, id, newName)) {
            saveSettings(); _notify(); render();
            try { toastr.success(t('Profile renamed')); } catch {}
        }
    }

    function _duplicate(id) {
        const s = getSettings();
        const dup = duplicateProfile(s, id);
        if (!dup) return;
        saveSettings(); _notify(); render();
        try { toastr.success(t('Duplicated as') + ' ' + dup.name); } catch {}
    }

    async function _clearPanels(id, name) {
        const s = getSettings();
        const p = s.profiles?.find(x => x.id === id); if (!p) return;
        const n = Array.isArray(p.customPanels) ? p.customPanels.length : 0;
        if (!await spConfirm(
            t('Clear custom panels?'),
            t('Remove all') + ` ${n} ` + t('custom panel(s) from profile') + ` "${name}". ` +
            t('Existing chats keep their per-chat panels untouched, but new chats started under this profile will no longer seed those panels. This cannot be undone.'),
            { okLabel: t('Clear Panels'), danger: true }
        )) return;
        p.customPanels = [];
        p.updatedAt = new Date().toISOString();
        // v6.22.1: also drain the legacy root-level mirror so the orphan
        // migration in src/profiles.js doesn't promote it back into the
        // profile on the next read.
        if (Array.isArray(s.customPanels) && s.customPanels.length) {
            s.customPanels = [];
        }
        saveSettings(); _notify(); render();
        try { toastr.success(t('Cleared') + ' ' + n + ' ' + t('panel(s) from profile')); } catch {}
    }

    function _export(p) {
        const payload = exportProfile(p);
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const safeName = (p.name || 'profile').replace(/[^a-z0-9_-]+/gi, '_').toLowerCase();
        const a = document.createElement('a'); a.href = url; a.download = `scenepulse-profile-${safeName}.json`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    }

    async function _delete(id, name) {
        const s = getSettings();
        const profiles = Array.isArray(s.profiles) ? s.profiles : [];
        if (profiles.length <= 1) {
            try { toastr.warning(t('Cannot delete the last profile.')); } catch {}
            return;
        }
        if (!await spConfirm(
            t('Delete profile?'),
            `"${name}" ` + t('will be permanently removed. This cannot be undone.'),
            { okLabel: t('Delete'), danger: true }
        )) return;
        if (deleteProfile(s, id)) {
            saveSettings(); _notify(); render();
            try { toastr.success(t('Profile deleted')); } catch {}
        }
    }

    overlay.querySelector('#sp-pm-new').addEventListener('click', async () => {
        const name = await spPrompt(
            t('Create new profile'),
            t('Give your new profile a name (e.g. "Medieval Fantasy" or "Pokemon"):'),
            { placeholder: t('Profile name'), value: 'New Profile',
              validate: v => v ? null : t('Name cannot be empty.') }
        );
        if (!name) return;
        const s = getSettings();
        const p = createProfile(s, { name });
        setActiveProfile(s, p.id); saveSettings();
        try { toastr.success(t('Profile created') + ': ' + p.name); } catch {}
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
