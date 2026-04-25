// src/ui/debug-inspector.js — Unified Debug Inspector overlay (v6.12.8)
//
// Replaces the previous SP Log + View Log + Last Response + Crash Log
// buttons with a single tabbed overlay. Each tab presents one debug
// surface with its own search / filter / copy / export controls in
// the same overlay-style UX as the prior Crash Log viewer.
//
// Tabs:
//   - Activity   — chronological logger.js debug log (every log/warn/err
//                  call, in-memory ring buffer, current session only)
//   - Last Resp. — raw LLM response from the most recent generation
//                  (pretty-printed if valid JSON)
//   - Crashes    — persistent error log (combined ScenePulse + ST,
//                  backed by src/crash-log.js, survives reloads)
//
// Reuses .sp-cl-* classes from css/crash-log.css for the overlay shell
// and .sp-debug-line / .sp-debug-error / .sp-debug-warn / .sp-debug-audit
// from css/debug.css for the activity log color-coding. Tab styling
// lives in css/crash-log.css alongside the existing overlay styles.

import { t } from '../i18n.js';
import { esc } from '../utils.js';
import { debugLog } from '../logger.js';
import { lastRawResponse } from '../state.js';
import { getEntries as crashGetEntries, clearAll as crashClearAll, flushNow as crashFlushNow, entryCount as crashEntryCount } from '../crash-log.js';

const REPO_NEW_ISSUE = 'https://github.com/xenofei/SillyTavern-ScenePulse/issues/new';

// ── Shared helpers ──────────────────────────────────────────────────────

function _fmtTs(iso) {
    if (!iso) return '';
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
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
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
        toastr.success(successMsg);
    } catch { try { toastr.error(t('Copy failed')); } catch {} }
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

// ── Crash Log helpers (port of crash-log-viewer.js) ─────────────────────

function _crashEntryToText(e) {
    const lines = [];
    lines.push(`[${_fmtTs(e.ts)}] ${e.severity?.toUpperCase()} (${e.source})${e.repeat > 1 ? ` ×${e.repeat}` : ''}`);
    lines.push(`Message: ${e.message || '(empty)'}`);
    const dx = _diagnose(e.message || '');
    if (dx) lines.push(`Likely cause: ${dx}`);
    if (e.stack) lines.push('Stack:\n' + e.stack);
    if (e.context) lines.push('Context: ' + JSON.stringify(e.context));
    if (e.spVersion) lines.push('ScenePulse: ' + e.spVersion);
    if (e.stVersion) lines.push('SillyTavern: ' + e.stVersion);
    return lines.join('\n');
}

// v6.15.3: pattern-match common error messages to a one-line cause hint.
// Returns '' when no pattern matches — callers should not render the section.
// Keep these short; the goal is to orient the user, not write documentation.
function _diagnose(message) {
    if (!message) return '';
    const m = message.toLowerCase();
    if (m.includes('no json object found') || m.includes('cleanjson')) {
        return 'The model emitted prose instead of JSON — likely broke out of structured-output mode mid-generation. Common in long, charged, or NSFW scenes. The first 200 chars of the response are shown above; check the Last Response tab for more.';
    }
    if (m.includes('parse fail')) {
        return 'A parse retry attempt failed. ScenePulse retries up to 3 times before giving up. See the cleanJson entry just before this one for the actual response.';
    }
    if (m.includes('502') || m.includes('503') || m.includes('504') || m.includes('bad gateway')) {
        return 'Backend HTTP error (transient). ScenePulse skips tracking for this turn. If it recurs, check your API endpoint or proxy.';
    }
    if (m.includes('networkerror') || m.includes('failed to fetch') || m.includes('network request failed')) {
        return 'Network failure (transient). Could be a dropped connection, DNS hiccup, or CORS issue. ScenePulse will retry on the next turn.';
    }
    if (m.includes('aborted') || m.includes('cancelled by stop') || m.includes('cancelled by user')) {
        return 'Generation cancelled — usually because you clicked Stop, or another generation was already in flight. Not actually an error.';
    }
    if (m.includes('streamingprocessor is null')) {
        return 'SillyTavern internal race when stop is clicked during streaming. Harmless — ST is cleaning up. Not caused by ScenePulse.';
    }
    if (m.includes('quota') || m.includes('rate limit') || m.includes('429')) {
        return 'Rate-limited by the API provider. Wait a few seconds and try again. Lower temperature or shorter context can also help.';
    }
    if (m.includes('context length') || m.includes('maximum context') || m.includes('token limit')) {
        return 'Prompt exceeded the model\'s context window. Trim chat history, lower max snapshots, or switch to a longer-context model.';
    }
    if (m.includes('401') || m.includes('unauthorized') || m.includes('invalid api key')) {
        return 'API authentication failed. Check your API key in SillyTavern\'s connection settings.';
    }
    return '';
}
function _crashAllToText(entries) {
    const header = `ScenePulse Crash Log — exported ${new Date().toISOString()}\nEntries: ${entries.length}\n${'─'.repeat(60)}\n\n`;
    return header + entries.map(_crashEntryToText).join('\n\n' + '─'.repeat(60) + '\n\n');
}
function _reportOnGitHub(entry) {
    const body = [
        '## Bug Report', '', '_Auto-filled from ScenePulse Debug Inspector._', '',
        '### What happened?', '', '<!-- describe what you were doing when the error occurred -->', '',
        '### Captured error', '', '```', _crashEntryToText(entry), '```',
    ].join('\n');
    const params = new URLSearchParams({
        title: '[crash] ' + (entry.message || 'Captured error').substring(0, 80),
        body, labels: 'bug',
    });
    window.open(REPO_NEW_ISSUE + '?' + params.toString(), '_blank', 'noopener');
}

// ── Tab: Activity Log ───────────────────────────────────────────────────

function _activityTab(panel) {
    let levelFilter = 'all'; // all|error|warn|info
    let search = '';
    let liveRefresh = true;
    let _refreshTimer = null;

    panel.innerHTML = `
        <div class="sp-cl-toolbar">
            <input class="sp-cl-search sp-di-search" type="text" placeholder="${t('Search log lines...')}">
            <div class="sp-cl-filters" data-group="level">
                <button class="sp-cl-filter sp-cl-filter-active" data-lvl="all">${t('All')}</button>
                <button class="sp-cl-filter" data-lvl="error">${t('Errors')}</button>
                <button class="sp-cl-filter" data-lvl="warn">${t('Warnings')}</button>
                <button class="sp-cl-filter" data-lvl="info">${t('Info')}</button>
            </div>
            <label class="sp-di-live"><input type="checkbox" checked> ${t('Live refresh')}</label>
            <button class="sp-cl-export-btn sp-di-copy">${t('Copy All')}</button>
            <button class="sp-cl-export-btn sp-di-export">${t('Export TXT')}</button>
        </div>
        <div class="sp-di-stats sp-cl-empty"></div>
        <div class="sp-di-log-list"></div>
    `;
    const stats = panel.querySelector('.sp-di-stats');
    const list = panel.querySelector('.sp-di-log-list');

    function _matchLevel(line) {
        if (levelFilter === 'all') return true;
        if (levelFilter === 'error') return line.includes('[ERROR');
        if (levelFilter === 'warn') return line.includes('[WARN');
        // info = anything not error/warn
        return !line.includes('[ERROR') && !line.includes('[WARN');
    }

    function _render() {
        const errs = debugLog.filter(e => e.includes('[ERROR')).length;
        const warns = debugLog.filter(e => e.includes('[WARN')).length;
        const audits = debugLog.filter(e => e.includes('AUDIT')).length;
        stats.textContent = `${debugLog.length} ${t('total')} · ${errs} errors · ${warns} warnings · ${audits} audits`;
        const q = search.toLowerCase();
        const filtered = debugLog.filter(e => _matchLevel(e) && (!q || e.toLowerCase().includes(q)));
        // Only full rebuild if count changed — keeps scroll position stable
        // when live-refresh ticks but no new entries arrived.
        if (list.children.length !== filtered.length) {
            const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 30;
            list.innerHTML = '';
            if (!filtered.length) {
                list.innerHTML = `<div class="sp-cl-empty">${debugLog.length ? t('No lines match your filters.') : t('No log entries yet.')}</div>`;
            } else {
                const frag = document.createDocumentFragment();
                for (const entry of filtered) {
                    const line = document.createElement('div');
                    line.className = 'sp-debug-line';
                    if (entry.includes('[ERROR')) line.classList.add('sp-debug-error');
                    else if (entry.includes('[WARN')) line.classList.add('sp-debug-warn');
                    else if (entry.includes('AUDIT')) line.classList.add('sp-debug-audit');
                    else if (entry.includes('===')) line.classList.add('sp-debug-section');
                    else if (entry.includes('Unwrap:')) line.classList.add('sp-debug-unwrap');
                    line.textContent = entry;
                    frag.appendChild(line);
                }
                list.appendChild(frag);
            }
            if (atBottom) list.scrollTop = list.scrollHeight;
        }
    }

    let _searchT;
    panel.querySelector('.sp-di-search').addEventListener('input', e => {
        clearTimeout(_searchT);
        _searchT = setTimeout(() => { search = e.target.value; _render(); }, 150);
    });
    panel.querySelectorAll('.sp-cl-filters[data-group="level"] .sp-cl-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            panel.querySelectorAll('.sp-cl-filters[data-group="level"] .sp-cl-filter')
                .forEach(b => b.classList.remove('sp-cl-filter-active'));
            btn.classList.add('sp-cl-filter-active');
            levelFilter = btn.dataset.lvl;
            // Force rebuild on filter change since count comparison is irrelevant.
            list.innerHTML = '';
            _render();
        });
    });
    panel.querySelector('.sp-di-live input').addEventListener('change', e => {
        liveRefresh = !!e.target.checked;
        if (liveRefresh && !_refreshTimer) _refreshTimer = setInterval(_render, 1500);
        else if (!liveRefresh && _refreshTimer) { clearInterval(_refreshTimer); _refreshTimer = null; }
    });
    panel.querySelector('.sp-di-copy').addEventListener('click', () => {
        const text = `ScenePulse Debug Log (${new Date().toISOString()})\n` + debugLog.join('\n');
        _copy(text, t('Activity log copied') + ` (${debugLog.length})`);
    });
    panel.querySelector('.sp-di-export').addEventListener('click', () => {
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const text = `ScenePulse Debug Log (${new Date().toISOString()})\n` + debugLog.join('\n');
        _exportFile(text, `scenepulse-activity-log-${ts}.txt`);
    });

    _render();
    _refreshTimer = setInterval(_render, 1500);

    return () => { if (_refreshTimer) { clearInterval(_refreshTimer); _refreshTimer = null; } };
}

// ── Tab: Last Response ──────────────────────────────────────────────────

function _lastResponseTab(panel) {
    panel.innerHTML = `
        <div class="sp-cl-toolbar">
            <button class="sp-cl-export-btn sp-di-copy">${t('Copy')}</button>
            <button class="sp-cl-export-btn sp-di-export">${t('Export TXT')}</button>
            <span class="sp-di-stats sp-di-meta"></span>
        </div>
        <div class="sp-di-response"></div>
    `;
    const stats = panel.querySelector('.sp-di-meta');
    const body = panel.querySelector('.sp-di-response');

    if (!lastRawResponse) {
        stats.textContent = '';
        body.innerHTML = `<div class="sp-cl-empty">${t('No API response captured yet. Generate a scene first.')}</div>`;
        panel.querySelector('.sp-di-copy').disabled = true;
        panel.querySelector('.sp-di-export').disabled = true;
        return () => {};
    }

    // Pretty-print if valid JSON; otherwise show raw.
    let rendered = lastRawResponse;
    let isJson = false;
    try {
        const parsed = JSON.parse(lastRawResponse);
        rendered = JSON.stringify(parsed, null, 2);
        isJson = true;
    } catch {}

    stats.textContent = `${lastRawResponse.length} ${t('chars')}${isJson ? ' · ' + t('valid JSON') : ' · ' + t('raw text')}`;
    body.innerHTML = `<pre class="sp-di-response-pre">${esc(rendered)}</pre>`;

    panel.querySelector('.sp-di-copy').addEventListener('click', () => {
        _copy(lastRawResponse, t('Last response copied'));
    });
    panel.querySelector('.sp-di-export').addEventListener('click', () => {
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        _exportFile(lastRawResponse, `scenepulse-last-response-${ts}.txt`);
    });

    return () => {};
}

// ── Tab: Crashes ────────────────────────────────────────────────────────

function _crashTab(panel) {
    let severity = 'all';
    let source = 'all';
    let search = '';

    panel.innerHTML = `
        <div class="sp-cl-toolbar">
            <input class="sp-cl-search sp-di-crash-search" type="text" placeholder="${t('Search messages and stacks...')}">
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
            <button class="sp-cl-export-btn sp-di-copy">${t('Copy All')}</button>
            <button class="sp-cl-export-btn sp-di-export">${t('Export TXT')}</button>
            <button class="sp-cl-export-btn sp-cl-danger sp-di-clear">${t('Clear')}</button>
        </div>
        <div class="sp-cl-list sp-di-crash-list"></div>
        <div class="sp-cl-footer">
            <span class="sp-cl-footer-text"></span>
            <span class="sp-cl-footer-hint">${t('Stored in your user data folder.')}</span>
        </div>
    `;
    const list = panel.querySelector('.sp-di-crash-list');
    const footerText = panel.querySelector('.sp-cl-footer-text');

    function _filter(entries) {
        let out = entries;
        if (severity !== 'all') out = out.filter(e => e.severity === severity);
        if (source !== 'all') out = out.filter(e => e.source === source);
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

    function _renderRow(e) {
        const row = document.createElement('div');
        row.className = 'sp-cl-row sp-cl-sev-' + (e.severity || 'error');
        const repeat = e.repeat > 1 ? `<span class="sp-cl-repeat">×${e.repeat}</span>` : '';
        // v6.15.3: expanded body always shows useful sections — full message
        // (header is truncated by overflow), diagnosis hint for known patterns,
        // when/where metadata, stack (if present), context (if present), versions,
        // actions. Previously the body could be near-empty when a string-only
        // err() captured no stack and no context.
        const dx = _diagnose(e.message || '');
        const ctxKeys = e.context ? Object.keys(e.context) : [];
        const hasCtx = ctxKeys.length > 0;
        const _section = (label, html) => `<div class="sp-cl-stack-label">${esc(t(label))}</div>${html}`;
        const bodyParts = [];
        // Full message (always — header is truncated by CSS)
        bodyParts.push(_section('Full message',
            `<pre class="sp-cl-fullmsg">${esc(e.message || '(empty)')}</pre>`));
        // Diagnosis (only when matched)
        if (dx) {
            bodyParts.push(`<div class="sp-cl-stack-label">${esc(t('Likely cause'))}</div>` +
                `<div class="sp-cl-diagnosis">${esc(dx)}</div>`);
        }
        // When / Where (always)
        const whenWhere = [
            `<span><strong>${esc(t('Time'))}:</strong> ${esc(_fmtTs(e.ts))}</span>`,
            `<span><strong>${esc(t('Source'))}:</strong> ${esc(e.source || 'unknown')}</span>`,
            `<span><strong>${esc(t('Severity'))}:</strong> ${esc(e.severity || 'error')}</span>`,
            e.repeat > 1 ? `<span><strong>${esc(t('Occurrences'))}:</strong> ${e.repeat}</span>` : '',
        ].filter(Boolean).join('');
        bodyParts.push(_section('When', `<div class="sp-cl-whenwhere">${whenWhere}</div>`));
        // Stack
        if (e.stack) {
            bodyParts.push(_section('Stack', `<pre class="sp-cl-stack">${esc(e.stack)}</pre>`));
        }
        // Context (auto + manual merged at capture time)
        if (hasCtx) {
            bodyParts.push(_section('Context', `<pre class="sp-cl-context">${esc(JSON.stringify(e.context, null, 2))}</pre>`));
        }
        // Versions row
        const ver = [
            e.spVersion ? `<span>SP ${esc(e.spVersion)}</span>` : '',
            e.stVersion ? `<span>ST ${esc(e.stVersion)}</span>` : '',
        ].filter(Boolean).join('');
        if (ver) bodyParts.push(`<div class="sp-cl-meta">${ver}</div>`);
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
                ${bodyParts.join('')}
                <div class="sp-cl-row-actions">
                    <button class="sp-btn sp-cl-copy-one">${t('Copy')}</button>
                    <button class="sp-btn sp-cl-report-one">${t('Report on GitHub')}</button>
                </div>
            </div>
        `;
        row.querySelector('.sp-cl-row-header').addEventListener('click', () => row.classList.toggle('sp-cl-open'));
        row.querySelector('.sp-cl-copy-one').addEventListener('click', ev => {
            ev.stopPropagation();
            _copy(_crashEntryToText(e), t('Entry copied'));
        });
        row.querySelector('.sp-cl-report-one').addEventListener('click', ev => {
            ev.stopPropagation();
            _reportOnGitHub(e);
        });
        return row;
    }

    function _render() {
        const all = crashGetEntries().slice().reverse();
        const filtered = _filter(all);
        list.innerHTML = '';
        if (!filtered.length) {
            list.innerHTML = `<div class="sp-cl-empty">${all.length ? t('No entries match your filters.') : t('No errors recorded yet. 🎉')}</div>`;
        } else {
            const frag = document.createDocumentFragment();
            for (const e of filtered) frag.appendChild(_renderRow(e));
            list.appendChild(frag);
        }
        footerText.textContent = `${filtered.length} ${t('shown')} · ${all.length} ${t('total')}`;
    }

    let _searchT;
    panel.querySelector('.sp-di-crash-search').addEventListener('input', e => {
        clearTimeout(_searchT);
        _searchT = setTimeout(() => { search = e.target.value; _render(); }, 150);
    });
    panel.querySelectorAll('.sp-cl-filters[data-group="severity"] .sp-cl-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            panel.querySelectorAll('.sp-cl-filters[data-group="severity"] .sp-cl-filter')
                .forEach(b => b.classList.remove('sp-cl-filter-active'));
            btn.classList.add('sp-cl-filter-active');
            severity = btn.dataset.sev;
            _render();
        });
    });
    panel.querySelectorAll('.sp-cl-filters[data-group="source"] .sp-cl-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            panel.querySelectorAll('.sp-cl-filters[data-group="source"] .sp-cl-filter')
                .forEach(b => b.classList.remove('sp-cl-filter-active'));
            btn.classList.add('sp-cl-filter-active');
            source = btn.dataset.src;
            _render();
        });
    });
    panel.querySelector('.sp-di-copy').addEventListener('click', () => {
        _copy(_crashAllToText(crashGetEntries()), t('Crash log copied'));
    });
    panel.querySelector('.sp-di-export').addEventListener('click', () => {
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        _exportFile(_crashAllToText(crashGetEntries()), `scenepulse-crash-log-${ts}.txt`);
    });
    panel.querySelector('.sp-di-clear').addEventListener('click', async () => {
        if (!confirm(t('Clear all crash log entries? This cannot be undone.'))) return;
        await crashClearAll();
        try { toastr.success(t('Crash log cleared')); } catch {}
        _render();
    });

    _render();
    crashFlushNow();
    return () => {};
}

// ── Overlay ────────────────────────────────────────────────────────────

const TABS = [
    { id: 'activity', label: 'Activity', render: _activityTab },
    { id: 'response', label: 'Last Response', render: _lastResponseTab },
    { id: 'crashes', label: 'Crashes', render: _crashTab, badge: () => crashEntryCount() },
];

export function openDebugInspector(initialTab = 'activity') {
    document.querySelector('.sp-cl-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'sp-cl-overlay';
    overlay.innerHTML = `
        <div class="sp-cl-container sp-di-container">
            <div class="sp-cl-header">
                <div class="sp-cl-title">${t('Debug Inspector')}</div>
                <button class="sp-cl-close">✕</button>
            </div>
            <div class="sp-di-tabs"></div>
            <div class="sp-di-tabpanel"></div>
        </div>
    `;

    const tabsBar = overlay.querySelector('.sp-di-tabs');
    const tabPanel = overlay.querySelector('.sp-di-tabpanel');
    let activeTab = initialTab;
    let _disposeTab = () => {};

    for (const tab of TABS) {
        const btn = document.createElement('button');
        btn.className = 'sp-di-tab';
        btn.dataset.tab = tab.id;
        const badge = tab.badge ? tab.badge() : 0;
        btn.innerHTML = `${esc(t(tab.label))}${badge ? ` <span class="sp-di-tab-badge">${badge}</span>` : ''}`;
        btn.addEventListener('click', () => _switchTo(tab.id));
        tabsBar.appendChild(btn);
    }

    function _switchTo(id) {
        const tab = TABS.find(x => x.id === id);
        if (!tab) return;
        activeTab = id;
        tabsBar.querySelectorAll('.sp-di-tab').forEach(b => {
            b.classList.toggle('sp-di-tab-active', b.dataset.tab === id);
        });
        try { _disposeTab(); } catch {}
        tabPanel.innerHTML = '';
        try { _disposeTab = tab.render(tabPanel) || (() => {}); }
        catch (e) {
            tabPanel.innerHTML = `<div class="sp-cl-empty">${t('Tab failed to render')}: ${esc(e?.message || String(e))}</div>`;
            _disposeTab = () => {};
        }
    }

    // Close handlers
    const _esc = (e) => { if (e.key === 'Escape') { _close(); e.stopPropagation(); } };
    function _close() {
        try { _disposeTab(); } catch {}
        overlay.remove();
        document.removeEventListener('keydown', _esc, true);
    }
    overlay.querySelector('.sp-cl-close').addEventListener('click', _close);
    overlay.addEventListener('click', e => { if (e.target === overlay) _close(); });

    // Stop pointer events from bubbling to ST's outside-click handler.
    const _stop = (e) => e.stopPropagation();
    overlay.addEventListener('mousedown', _stop);
    overlay.addEventListener('click', _stop);
    overlay.addEventListener('pointerdown', _stop);
    document.addEventListener('keydown', _esc, true);

    document.body.appendChild(overlay);
    _switchTo(activeTab);
}

export function getCrashLogCount() { return crashEntryCount(); }
