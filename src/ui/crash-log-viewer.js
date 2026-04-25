// src/ui/crash-log-viewer.js — Crash Log overlay (issue #13)
//
// Full-screen overlay listing every captured entry from src/crash-log.js.
// Same modal pattern as character-wiki and the snapshot browser.
//
// Features:
//   - Filter pills: All | Errors | Warnings | Info
//   - Source filter pills: All | ScenePulse | SillyTavern | Unknown
//   - Search box (matches message + stack)
//   - Expand row to see stack + context
//   - Buttons: Copy entry, Copy all, Clear, Export TXT,
//              Report on GitHub (opens new-issue template prefilled)

import { t } from '../i18n.js';
import { esc } from '../utils.js';
import { getEntries, clearAll, flushNow, entryCount } from '../crash-log.js';

const REPO_NEW_ISSUE = 'https://github.com/xenofei/SillyTavern-ScenePulse/issues/new';

function _fmtTs(iso) {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        return d.toLocaleString();
    } catch { return iso; }
}

function _entryToText(e) {
    const lines = [];
    lines.push(`[${_fmtTs(e.ts)}] ${e.severity?.toUpperCase()} (${e.source})${e.repeat > 1 ? ` ×${e.repeat}` : ''}`);
    lines.push(`Message: ${e.message || '(empty)'}`);
    if (e.stack) lines.push('Stack:\n' + e.stack);
    if (e.context) lines.push('Context: ' + JSON.stringify(e.context));
    if (e.spVersion) lines.push('ScenePulse: ' + e.spVersion);
    if (e.stVersion) lines.push('SillyTavern: ' + e.stVersion);
    return lines.join('\n');
}

function _allToText(entries) {
    const header = `ScenePulse Crash Log — exported ${new Date().toISOString()}\nEntries: ${entries.length}\n${'─'.repeat(60)}\n\n`;
    return header + entries.map(_entryToText).join('\n\n' + '─'.repeat(60) + '\n\n');
}

function _copy(text, successMsg) {
    if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).then(
            () => { try { toastr.success(successMsg); } catch {} },
            () => _fallbackCopy(text, successMsg)
        );
    } else {
        _fallbackCopy(text, successMsg);
    }
}

function _fallbackCopy(text, successMsg) {
    try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        toastr.success(successMsg);
    } catch {
        try { toastr.error(t('Copy failed')); } catch {}
    }
}

function _exportFile(text, filename) {
    try {
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
    } catch (e) {
        try { toastr.error(t('Export failed') + ': ' + (e?.message || '')); } catch {}
    }
}

function _reportOnGitHub(entry) {
    const body = [
        '## Bug Report',
        '',
        '_Auto-filled from ScenePulse Crash Log._',
        '',
        '### What happened?',
        '',
        '<!-- describe what you were doing when the error occurred -->',
        '',
        '### Captured error',
        '',
        '```',
        _entryToText(entry),
        '```',
    ].join('\n');
    const params = new URLSearchParams({
        title: '[crash] ' + (entry.message || 'Captured error').substring(0, 80),
        body,
        labels: 'bug',
    });
    window.open(REPO_NEW_ISSUE + '?' + params.toString(), '_blank', 'noopener');
}

// ── Filter / search ─────────────────────────────────────────────────────
function _filter(entries, severity, source, search) {
    let out = entries;
    if (severity && severity !== 'all') out = out.filter(e => e.severity === severity);
    if (source && source !== 'all') out = out.filter(e => e.source === source);
    if (search) {
        const q = search.toLowerCase();
        out = out.filter(e =>
            (e.message || '').toLowerCase().includes(q)
            || (e.stack || '').toLowerCase().includes(q)
            || (e.source || '').toLowerCase().includes(q)
        );
    }
    return out;
}

// ── Render an entry row ─────────────────────────────────────────────────
function _renderRow(e, idx) {
    const row = document.createElement('div');
    row.className = 'sp-cl-row sp-cl-sev-' + (e.severity || 'error');
    row.dataset.idx = String(idx);

    const repeat = e.repeat > 1 ? `<span class="sp-cl-repeat">×${e.repeat}</span>` : '';
    row.innerHTML = `
        <div class="sp-cl-row-header">
            <span class="sp-cl-chevron">▶</span>
            <span class="sp-cl-sev-pill sp-cl-sev-pill-${esc(e.severity || 'error')}">${esc((e.severity || 'error').toUpperCase())}</span>
            <span class="sp-cl-src">${esc(e.source || 'unknown')}</span>
            <span class="sp-cl-msg">${esc(e.message || '(no message)')}</span>
            ${repeat}
            <span class="sp-cl-ts">${esc(_fmtTs(e.ts))}</span>
        </div>
        <div class="sp-cl-row-body">
            ${e.stack ? `<div class="sp-cl-stack-label">${esc(t('Stack'))}</div><pre class="sp-cl-stack">${esc(e.stack)}</pre>` : ''}
            ${e.context ? `<div class="sp-cl-stack-label">${esc(t('Context'))}</div><pre class="sp-cl-context">${esc(JSON.stringify(e.context, null, 2))}</pre>` : ''}
            <div class="sp-cl-meta">
                ${e.spVersion ? `<span>SP ${esc(e.spVersion)}</span>` : ''}
                ${e.stVersion ? `<span>ST ${esc(e.stVersion)}</span>` : ''}
            </div>
            <div class="sp-cl-row-actions">
                <button class="sp-btn sp-cl-copy-one">${t('Copy')}</button>
                <button class="sp-btn sp-cl-report-one">${t('Report on GitHub')}</button>
            </div>
        </div>
    `;
    row.querySelector('.sp-cl-row-header').addEventListener('click', () => {
        row.classList.toggle('sp-cl-open');
    });
    row.querySelector('.sp-cl-copy-one').addEventListener('click', (ev) => {
        ev.stopPropagation();
        _copy(_entryToText(e), t('Entry copied'));
    });
    row.querySelector('.sp-cl-report-one').addEventListener('click', (ev) => {
        ev.stopPropagation();
        _reportOnGitHub(e);
    });
    return row;
}

// ── Open the overlay ────────────────────────────────────────────────────
export function openCrashLogViewer() {
    document.querySelector('.sp-cl-overlay')?.remove();

    let severity = 'all';
    let source = 'all';
    let search = '';

    const overlay = document.createElement('div');
    overlay.className = 'sp-cl-overlay';
    overlay.innerHTML = `
        <div class="sp-cl-container">
            <div class="sp-cl-header">
                <div class="sp-cl-title">${t('Crash Log')} <span class="sp-cl-count"></span></div>
                <button class="sp-cl-export-btn" id="sp-cl-export">${t('Export TXT')}</button>
                <button class="sp-cl-export-btn" id="sp-cl-copy-all">${t('Copy All')}</button>
                <button class="sp-cl-export-btn sp-cl-danger" id="sp-cl-clear">${t('Clear')}</button>
                <button class="sp-cl-close">✕</button>
            </div>
            <div class="sp-cl-toolbar">
                <input class="sp-cl-search" type="text" placeholder="${t('Search messages and stacks...')}">
                <div class="sp-cl-filters" data-group="severity">
                    <button class="sp-cl-filter sp-cl-filter-active" data-sev="all">${t('All')}</button>
                    <button class="sp-cl-filter" data-sev="error">${t('Errors')}</button>
                    <button class="sp-cl-filter" data-sev="warning">${t('Warnings')}</button>
                    <button class="sp-cl-filter" data-sev="info">${t('Info')}</button>
                </div>
                <div class="sp-cl-filters" data-group="source">
                    <button class="sp-cl-filter sp-cl-filter-active" data-src="all">${t('All sources')}</button>
                    <button class="sp-cl-filter" data-src="scenepulse">ScenePulse</button>
                    <button class="sp-cl-filter" data-src="sillytavern">SillyTavern</button>
                    <button class="sp-cl-filter" data-src="unknown">${t('Unknown')}</button>
                </div>
            </div>
            <div class="sp-cl-list"></div>
            <div class="sp-cl-footer">
                <span class="sp-cl-footer-text"></span>
                <span class="sp-cl-footer-hint">${t('Stored in your user data folder.')}</span>
            </div>
        </div>
    `;

    const list = overlay.querySelector('.sp-cl-list');
    const titleCount = overlay.querySelector('.sp-cl-count');
    const footerText = overlay.querySelector('.sp-cl-footer-text');

    function _render() {
        const all = getEntries().slice().reverse(); // newest first
        const filtered = _filter(all, severity, source, search);
        list.innerHTML = '';
        if (!filtered.length) {
            list.innerHTML = `<div class="sp-cl-empty">${all.length ? t('No entries match your filters.') : t('No errors recorded yet. 🎉')}</div>`;
        } else {
            const frag = document.createDocumentFragment();
            for (let i = 0; i < filtered.length; i++) frag.appendChild(_renderRow(filtered[i], i));
            list.appendChild(frag);
        }
        titleCount.textContent = `(${all.length})`;
        footerText.textContent = `${filtered.length} ${t('shown')} · ${all.length} ${t('total')}`;
    }

    // Close handlers
    const _esc = (e) => { if (e.key === 'Escape') _close(); };
    function _close() { overlay.remove(); document.removeEventListener('keydown', _esc); }
    overlay.querySelector('.sp-cl-close').addEventListener('click', _close);
    overlay.addEventListener('click', e => { if (e.target === overlay) _close(); });
    document.addEventListener('keydown', _esc);

    // Search
    let _t;
    overlay.querySelector('.sp-cl-search').addEventListener('input', e => {
        clearTimeout(_t);
        _t = setTimeout(() => { search = e.target.value; _render(); }, 150);
    });

    // Filter pills
    overlay.querySelectorAll('.sp-cl-filters[data-group="severity"] .sp-cl-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            overlay.querySelectorAll('.sp-cl-filters[data-group="severity"] .sp-cl-filter')
                .forEach(b => b.classList.remove('sp-cl-filter-active'));
            btn.classList.add('sp-cl-filter-active');
            severity = btn.dataset.sev;
            _render();
        });
    });
    overlay.querySelectorAll('.sp-cl-filters[data-group="source"] .sp-cl-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            overlay.querySelectorAll('.sp-cl-filters[data-group="source"] .sp-cl-filter')
                .forEach(b => b.classList.remove('sp-cl-filter-active'));
            btn.classList.add('sp-cl-filter-active');
            source = btn.dataset.src;
            _render();
        });
    });

    // Toolbar actions
    overlay.querySelector('#sp-cl-copy-all').addEventListener('click', () => {
        _copy(_allToText(getEntries()), t('Crash log copied'));
    });
    overlay.querySelector('#sp-cl-export').addEventListener('click', () => {
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        _exportFile(_allToText(getEntries()), `scenepulse-crash-log-${ts}.txt`);
    });
    overlay.querySelector('#sp-cl-clear').addEventListener('click', async () => {
        if (!confirm(t('Clear all crash log entries? This cannot be undone.'))) return;
        await clearAll();
        try { toastr.success(t('Crash log cleared')); } catch {}
        _render();
    });

    document.body.appendChild(overlay);
    _render();
    // Best-effort flush so the file on disk reflects what the user is looking at.
    flushNow();
}

// Optional: expose the count for a settings-button badge.
export function getCrashLogCount() { return entryCount(); }
