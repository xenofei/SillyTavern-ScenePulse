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
import { getLastRawResponse } from '../state.js';
import { getEntries as crashGetEntries, clearAll as crashClearAll, flushNow as crashFlushNow, entryCount as crashEntryCount, markSeen as crashMarkSeen } from '../crash-log.js';
import { getSettings } from '../settings.js';
import { getActiveProfile } from '../profiles.js';
import { DEFAULTS as DEFAULT_SETTINGS } from '../constants.js';

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

// ── Diagnostics bundle (v6.15.5) ────────────────────────────────────────
//
// Per Panel B's MUST tier: one click → paste-ready markdown bundle that kills
// the back-and-forth in bug reports. Auto-redacts API keys, absolute paths,
// emails. 6-char hash header so the maintainer can tell two pastes apart at
// a glance. Per Panel C: button label is "Diagnostics" (not "Diagnostic
// Bundle" — bundle is webpack-coded; the action is to gather diagnostics).

const _REDACT_PATTERNS = [
    [/sk-(?:ant-)?[A-Za-z0-9_\-]{20,}/g, '[REDACTED:api_key]'],
    [/(?:gsk|pk_live|pk_test|sk_live|sk_test)_[A-Za-z0-9_\-]{16,}/g, '[REDACTED:api_key]'],
    [/Bearer\s+[A-Za-z0-9._\-]{16,}/gi, 'Bearer [REDACTED]'],
    [/\b(?:api[_-]?key|token|secret|password|auth)["'\s:=]+["']?[A-Za-z0-9_\-./+=]{12,}["']?/gi, '$1=[REDACTED]'],
    [/[A-Z]:\\Users\\[^\\\s"'<>|]+/g, '[REDACTED:user_path]'],
    [/\/(?:home|Users)\/[^\/\s"'<>]+/g, '[REDACTED:user_path]'],
    [/\bfile:\/\/\/?[^\s"'<>]+/g, '[REDACTED:file_url]'],
    [/\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g, '[REDACTED:email]'],
];
function _redact(text) {
    if (typeof text !== 'string' || !text) return text;
    let out = text;
    for (const [re, repl] of _REDACT_PATTERNS) out = out.replace(re, repl);
    return out;
}
// Cheap deterministic 6-char hash (DJB2 variant) — purely for distinguishing
// pastes, not cryptographic. Lets the maintainer say "are these the same?"
// at a glance when reviewing two reports.
function _shortHash(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
    return (h >>> 0).toString(16).padStart(8, '0').slice(0, 6);
}
// Diff settings against DEFAULTS, returning only values that differ.
// Recurses one level for nested objects (panels, dashCards, fieldToggles).
function _nonDefaultSettings(s, defaults) {
    const out = {};
    for (const k of Object.keys(defaults)) {
        const v = s?.[k];
        const d = defaults[k];
        if (v === undefined) continue;
        if (typeof d === 'object' && d !== null && !Array.isArray(d)) {
            const sub = {};
            for (const sk of Object.keys(d)) {
                if (v && v[sk] !== d[sk] && v[sk] !== undefined) sub[sk] = v[sk];
            }
            if (Object.keys(sub).length) out[k] = sub;
        } else if (Array.isArray(d)) {
            // Always include arrays if non-empty AND not the same length-0 default
            if (Array.isArray(v) && v.length > 0) out[k] = v;
        } else if (v !== d) {
            out[k] = v;
        }
    }
    // Capture any keys present in settings but absent from defaults (custom user data)
    for (const k of Object.keys(s || {})) {
        if (!(k in defaults) && !k.startsWith('_')) out[k] = s[k];
    }
    return out;
}

function _buildDiagnostics({ spVersion = '', stVersion = '' } = {}) {
    // Activity log: last 50 lines
    const activity = (debugLog || []).slice(-50).map(_redact).join('\n');
    // Last response (truncated to 4000 chars to keep bundles paste-friendly)
    const rawResp = getLastRawResponse() || '';
    const respTrunc = rawResp.length > 4000
        ? rawResp.slice(0, 4000) + `\n\n[…truncated, total ${rawResp.length} chars]`
        : rawResp;
    // Last 10 issues, redacted, with diagnosis hints inline
    const issues = crashGetEntries().slice(-10).reverse().map(e => {
        const dx = _diagnose(e.message || '');
        return `[${_fmtTs(e.ts)}] ${(e.severity || 'error').toUpperCase()} (${e.source})${e.repeat > 1 ? ` ×${e.repeat}` : ''}\n`
            + `Message: ${_redact(e.message || '(empty)')}\n`
            + (dx ? `Likely: ${dx}\n` : '')
            + (e.context ? `Context: ${_redact(JSON.stringify(e.context))}\n` : '')
            + (e.stack ? `Stack:\n${_redact(e.stack)}\n` : '');
    }).join('\n---\n\n');
    // Settings (non-default only) + active profile
    let settingsBlock = '';
    let profileBlock = '';
    try {
        const s = getSettings();
        const nonDef = _nonDefaultSettings(s, DEFAULT_SETTINGS);
        settingsBlock = _redact(JSON.stringify(nonDef, null, 2));
        const prof = getActiveProfile(s);
        if (prof) {
            const pSafe = { id: prof.id, name: prof.name, hasSchema: !!prof.schema, hasPrompt: !!prof.systemPrompt, panels: prof.panels?.length || 0 };
            profileBlock = JSON.stringify(pSafe, null, 2);
        }
    } catch (e) { settingsBlock = '(unavailable: ' + (e?.message || '') + ')'; }
    // Build the bundle, then prepend the hash header so the hash covers content.
    const body = [
        '## Versions',
        `- ScenePulse: ${spVersion || '(unknown)'}`,
        `- SillyTavern: ${stVersion || '(unknown)'}`,
        `- UA: ${(typeof navigator !== 'undefined' && navigator.userAgent) || '(unknown)'}`,
        `- Viewport: ${typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '(unknown)'}`,
        '',
        '## Active profile',
        '```json', profileBlock || '(none)', '```',
        '',
        '## Non-default settings',
        '```json', settingsBlock, '```',
        '',
        `## Recent issues (last ${Math.min(10, crashGetEntries().length)} of ${crashGetEntries().length})`,
        '```', issues || '(none)', '```',
        '',
        '## Last response',
        rawResp ? '```\n' + _redact(respTrunc) + '\n```' : '(none captured)',
        '',
        `## Activity log (last ${Math.min(50, (debugLog || []).length)} lines)`,
        '```', activity || '(empty)', '```',
    ].join('\n');
    const hash = _shortHash(body);
    return `# ScenePulse Diagnostics — ${new Date().toISOString()}\n`
        + `**Bundle ID:** \`${hash}\` · API keys / paths / emails auto-redacted.\n\n`
        + body;
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

// v6.15.5: detect parse-related errors (cleanJson / Parse fail / no JSON object).
// Used to decide whether to render the "Show in Last Response" jump button.
function _isParseRelated(message) {
    if (!message) return false;
    const m = message.toLowerCase();
    return m.includes('cleanjson') || m.includes('no json object') || m.includes('parse fail');
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

function _lastResponseTab(panel, ctx = {}) {
    const payload = ctx.payload || {};
    panel.innerHTML = `
        <div class="sp-cl-toolbar">
            <button class="sp-cl-export-btn sp-di-copy">${t('Copy')}</button>
            <button class="sp-cl-export-btn sp-di-export">${t('Export TXT')}</button>
            <span class="sp-di-stats sp-di-meta"></span>
            ${payload.fromIssue ? `<span class="sp-di-from-issue">${t('Opened from')} <code>${esc((payload.fromIssue.message || '').slice(0, 60))}…</code></span>` : ''}
        </div>
        <div class="sp-di-response"></div>
    `;
    const stats = panel.querySelector('.sp-di-meta');
    const body = panel.querySelector('.sp-di-response');

    // v6.15.4: getter avoids the live-binding trap — reads current state value
    // at render time, not the stale module-load-time snapshot.
    const raw = getLastRawResponse();
    if (!raw) {
        stats.textContent = '';
        body.innerHTML = `<div class="sp-cl-empty">${t('No API response captured yet. Generate a scene first.')}</div>`;
        panel.querySelector('.sp-di-copy').disabled = true;
        panel.querySelector('.sp-di-export').disabled = true;
        return () => {};
    }

    // Pretty-print if valid JSON; otherwise show raw.
    let rendered = raw;
    let isJson = false;
    try {
        const parsed = JSON.parse(raw);
        rendered = JSON.stringify(parsed, null, 2);
        isJson = true;
    } catch {}

    stats.textContent = `${raw.length} ${t('chars')}${isJson ? ' · ' + t('valid JSON') : ' · ' + t('raw text')}`;
    body.innerHTML = `<pre class="sp-di-response-pre">${esc(rendered)}</pre>`;

    panel.querySelector('.sp-di-copy').addEventListener('click', () => {
        _copy(raw, t('Last response copied'));
    });
    panel.querySelector('.sp-di-export').addEventListener('click', () => {
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        _exportFile(raw, `scenepulse-last-response-${ts}.txt`);
    });

    // v6.15.5: when arrived from "Show in Last Response", scroll the response
    // pane back to the top so the user starts at the beginning. Future:
    // highlight the byte range where parsing failed (needs raw-pair ring
    // buffer with column-from-error info, planned for v6.15.6).
    if (payload.scrollToTop) {
        const pre = panel.querySelector('.sp-di-response-pre');
        if (pre) pre.scrollTop = 0;
    }

    return () => {};
}

// ── Tab: Issues (v6.15.4 — renamed from "Crashes" since contents include warnings/info) ──

const TIME_WINDOWS = [
    { key: 'session', label: 'This session', ms: null },  // since-last-clear / since page load
    { key: '5m', label: '5m', ms: 5 * 60 * 1000 },
    { key: '1h', label: '1h', ms: 60 * 60 * 1000 },
    { key: '1d', label: '1d', ms: 24 * 60 * 60 * 1000 },
    { key: 'all', label: 'All', ms: -1 },
];

// v6.15.4: Group consecutive cleanJson + Parse fail (N) entries into one logical
// event. The maintainer reported 17 entries for 7 actual events because every
// JSON-parse failure logs both the cleanJson error AND the Parse fail retry —
// once per attempt. Grouping reads {parent: cleanJson, children: [Parse fail …]}
// when the source is scenepulse and timestamps are within 60s.
function _groupParsePairs(entries) {
    const grouped = [];
    const PAIR_WINDOW_MS = 60 * 1000;
    let i = 0;
    while (i < entries.length) {
        const e = entries[i];
        const isCleanJson = e.source === 'scenepulse' && /cleanjson/i.test(e.message || '');
        if (isCleanJson) {
            const children = [];
            let j = i + 1;
            while (j < entries.length) {
                const n = entries[j];
                const dtMs = Math.abs(new Date(n.ts) - new Date(e.ts));
                if (n.source === 'scenepulse'
                    && /parse fail/i.test(n.message || '')
                    && dtMs <= PAIR_WINDOW_MS) {
                    children.push(n);
                    j++;
                } else break;
            }
            if (children.length > 0) {
                grouped.push({ ...e, _group: { children, kind: 'parse-pair' } });
                i = j;
                continue;
            }
        }
        grouped.push(e);
        i++;
    }
    return grouped;
}

function _issuesTab(panel, ctx = {}) {
    const switchTo = ctx.switchTo || (() => {});
    let severity = 'all';
    let source = 'all';
    let search = '';
    let timeWindow = 'session';
    const sessionStart = Date.now();

    const tw = TIME_WINDOWS.map(w =>
        `<button class="sp-cl-filter${w.key === 'session' ? ' sp-cl-filter-active' : ''}" data-tw="${w.key}">${esc(t(w.label))}</button>`
    ).join('');

    panel.innerHTML = `
        <div class="sp-cl-toolbar sp-di-issues-toolbar">
            <div class="sp-cl-toolbar-zone sp-cl-zone-query">
                <input class="sp-cl-search sp-di-crash-search" type="text" placeholder="${t('Search messages and stacks...')}">
                <div class="sp-cl-filter-field">
                    <span class="sp-cl-filter-label">${t('Severity')}</span>
                    <div class="sp-cl-filters sp-cl-segmented sp-cl-filters-severity" data-group="severity" role="radiogroup" aria-label="${t('Severity')}">
                        <button class="sp-cl-filter sp-cl-filter-active" data-sev="all" role="radio" aria-checked="true">${t('All')}</button>
                        <button class="sp-cl-filter sp-cl-filter-error" data-sev="error" role="radio" aria-checked="false">${t('Errors')}</button>
                        <button class="sp-cl-filter sp-cl-filter-warn" data-sev="warning" role="radio" aria-checked="false">${t('Warnings')}</button>
                        <button class="sp-cl-filter sp-cl-filter-info" data-sev="info" role="radio" aria-checked="false">${t('Info')}</button>
                    </div>
                </div>
                <div class="sp-cl-filter-field">
                    <span class="sp-cl-filter-label">${t('Source')}</span>
                    <div class="sp-cl-filters sp-cl-segmented" data-group="source" role="radiogroup" aria-label="${t('Source')}">
                        <button class="sp-cl-filter sp-cl-filter-active" data-src="all" role="radio" aria-checked="true">${t('All')}</button>
                        <button class="sp-cl-filter" data-src="scenepulse" role="radio" aria-checked="false">ScenePulse</button>
                        <button class="sp-cl-filter" data-src="sillytavern" role="radio" aria-checked="false">SillyTavern</button>
                        <button class="sp-cl-filter" data-src="unknown" role="radio" aria-checked="false">${t('Unknown')}</button>
                    </div>
                </div>
                <div class="sp-cl-filter-field">
                    <span class="sp-cl-filter-label">${t('Since')}</span>
                    <div class="sp-cl-filters sp-cl-segmented sp-cl-filters-time" data-group="time" role="radiogroup" aria-label="${t('Since')}">
                        ${tw}
                    </div>
                </div>
            </div>
            <div class="sp-cl-toolbar-zone sp-cl-zone-actions">
                <button class="sp-cl-export-btn sp-di-copy">${t('Copy All')}</button>
                <button class="sp-cl-export-btn sp-di-export">${t('Export TXT')}</button>
            </div>
            <div class="sp-cl-toolbar-zone sp-cl-zone-danger">
                <button class="sp-cl-export-btn sp-cl-danger sp-di-clear">${t('Clear')}</button>
            </div>
        </div>
        <div class="sp-cl-list sp-di-crash-list"></div>
        <div class="sp-cl-footer">
            <span class="sp-cl-footer-text"></span>
            <span class="sp-cl-footer-hint">${t('Stored in your user data folder.')}</span>
        </div>
    `;
    const list = panel.querySelector('.sp-di-crash-list');
    const footerText = panel.querySelector('.sp-cl-footer-text');

    function _windowCutoff() {
        const w = TIME_WINDOWS.find(x => x.key === timeWindow);
        if (!w) return 0;
        if (w.key === 'session') return sessionStart;
        if (w.ms === -1) return 0;
        return Date.now() - w.ms;
    }

    function _filter(entries) {
        let out = entries;
        const cutoff = _windowCutoff();
        if (cutoff > 0) {
            out = out.filter(e => {
                const ts = new Date(e.ts).getTime();
                return !isNaN(ts) && ts >= cutoff;
            });
        }
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
        // v6.15.4: grouped entry — show "+N attempts" pill in header, list
        // children at the top of the expanded body. The parent (cleanJson)
        // already carries the diagnosis hint; children are just timestamps
        // + brief lines. Per Panel B refinement: preserve original chronological
        // order of children inside the group, even though the group itself
        // appears at the parent's position in the newest-first list.
        const grp = e._group;
        const groupPill = grp?.children?.length
            ? `<span class="sp-cl-group-pill" title="${esc(t('Includes related parse retries'))}">+${grp.children.length} ${esc(t(grp.children.length === 1 ? 'attempt' : 'attempts'))}</span>`
            : '';
        const dx = _diagnose(e.message || '');
        const ctxKeys = e.context ? Object.keys(e.context) : [];
        const hasCtx = ctxKeys.length > 0;
        const _section = (label, html) => `<div class="sp-cl-stack-label">${esc(t(label))}</div>${html}`;
        const bodyParts = [];
        // Group children (when grouped) — listed first since they're the
        // "what else happened" context for this parent event.
        if (grp?.children?.length) {
            const childLines = grp.children.map(c => {
                const sev = esc((c.severity || 'error'));
                return `<li class="sp-cl-group-child sp-cl-sev-${sev}">
                    <span class="sp-cl-ts">${esc(_fmtTs(c.ts))}</span>
                    <span class="sp-cl-msg">${esc(c.message || '(no message)')}</span>
                </li>`;
            }).join('');
            bodyParts.push(_section('Related attempts',
                `<ul class="sp-cl-group-children">${childLines}</ul>`));
        }
        bodyParts.push(_section('Full message',
            `<pre class="sp-cl-fullmsg">${esc(e.message || '(empty)')}</pre>`));
        if (dx) {
            bodyParts.push(`<div class="sp-cl-stack-label">${esc(t('Likely cause'))}</div>` +
                `<div class="sp-cl-diagnosis">${esc(dx)}</div>`);
        }
        const whenWhere = [
            `<span><strong>${esc(t('Time'))}:</strong> ${esc(_fmtTs(e.ts))}</span>`,
            `<span><strong>${esc(t('Source'))}:</strong> ${esc(e.source || 'unknown')}</span>`,
            `<span><strong>${esc(t('Severity'))}:</strong> ${esc(e.severity || 'error')}</span>`,
            e.repeat > 1 ? `<span><strong>${esc(t('Occurrences'))}:</strong> ${e.repeat}</span>` : '',
        ].filter(Boolean).join('');
        bodyParts.push(_section('When', `<div class="sp-cl-whenwhere">${whenWhere}</div>`));
        if (e.stack) {
            bodyParts.push(_section('Stack', `<pre class="sp-cl-stack">${esc(e.stack)}</pre>`));
        }
        if (hasCtx) {
            bodyParts.push(_section('Context', `<pre class="sp-cl-context">${esc(JSON.stringify(e.context, null, 2))}</pre>`));
        }
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
                ${groupPill}
                ${repeat}
                <span class="sp-cl-ts">${esc(_fmtTs(e.ts))}</span>
            </div>
            <div class="sp-cl-row-body">
                ${bodyParts.join('')}
                <div class="sp-cl-row-actions">
                    <button class="sp-btn sp-cl-copy-one">${t('Copy')}</button>
                    ${_isParseRelated(e.message) ? `<button class="sp-btn sp-cl-show-response">${t('Show in Last Response')}</button>` : ''}
                    <button class="sp-btn sp-cl-report-one">${t('Report on GitHub')}</button>
                </div>
            </div>
        `;
        row.querySelector('.sp-cl-row-header').addEventListener('click', () => row.classList.toggle('sp-cl-open'));
        row.querySelector('.sp-cl-copy-one').addEventListener('click', ev => {
            ev.stopPropagation();
            // For groups, include children in the copied text so the maintainer
            // gets the full event with all retries in one paste.
            const text = grp?.children?.length
                ? _crashEntryToText(e) + '\n\n' + t('Related attempts') + ':\n'
                    + grp.children.map(c => `  [${_fmtTs(c.ts)}] ${c.message}`).join('\n')
                : _crashEntryToText(e);
            _copy(text, t('Entry copied'));
        });
        // v6.15.5: jump to Last Response tab for parse-related entries — Panel B's
        // MUST. The payload tells the response tab to scroll to where parsing
        // likely failed (top of the buffer for now; precise byte-range highlight
        // is a v6.15.6+ enhancement once we have the raw-pair ring buffer).
        const showBtn = row.querySelector('.sp-cl-show-response');
        if (showBtn) {
            showBtn.addEventListener('click', ev => {
                ev.stopPropagation();
                switchTo('response', { fromIssue: e, scrollToTop: true });
            });
        }
        row.querySelector('.sp-cl-report-one').addEventListener('click', ev => {
            ev.stopPropagation();
            _reportOnGitHub(e);
        });
        return row;
    }

    function _render() {
        // v6.15.4: filter on the chronological list FIRST (oldest→newest) so
        // _groupParsePairs can identify true neighbors, then reverse the
        // grouped result for display (newest→oldest at the top).
        const allChrono = crashGetEntries();
        const filteredChrono = _filter(allChrono);
        const grouped = _groupParsePairs(filteredChrono);
        const display = grouped.slice().reverse();
        list.innerHTML = '';
        if (!display.length) {
            list.innerHTML = `<div class="sp-cl-empty">${allChrono.length ? t('No entries match your filters.') : t('No issues recorded yet. 🎉')}</div>`;
        } else {
            const frag = document.createDocumentFragment();
            for (const e of display) frag.appendChild(_renderRow(e));
            list.appendChild(frag);
        }
        const groupCount = display.length;
        const eventCount = display.reduce((acc, e) => acc + 1 + (e._group?.children?.length || 0), 0);
        footerText.textContent = groupCount === eventCount
            ? `${groupCount} ${t('shown')} · ${allChrono.length} ${t('total')}`
            : `${groupCount} ${t('groups')} · ${eventCount} ${t('events')} · ${allChrono.length} ${t('total')}`;
    }

    let _searchT;
    panel.querySelector('.sp-di-crash-search').addEventListener('input', e => {
        clearTimeout(_searchT);
        _searchT = setTimeout(() => { search = e.target.value; _render(); }, 150);
    });
    // v6.15.5: Helper for segmented controls — single-select among siblings
    // in the same data-group, with aria-checked sync for screen readers.
    const _wireSegmented = (group, onChange) => {
        const buttons = panel.querySelectorAll(`.sp-cl-filters[data-group="${group}"] .sp-cl-filter`);
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => {
                    b.classList.remove('sp-cl-filter-active');
                    b.setAttribute('aria-checked', 'false');
                });
                btn.classList.add('sp-cl-filter-active');
                btn.setAttribute('aria-checked', 'true');
                onChange(btn);
                _render();
            });
        });
    };
    _wireSegmented('severity', btn => { severity = btn.dataset.sev; });
    _wireSegmented('source',   btn => { source   = btn.dataset.src; });
    _wireSegmented('time',     btn => { timeWindow = btn.dataset.tw; });
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

// ── Tab: Config (v6.15.5) ───────────────────────────────────────────────
//
// Active profile + chat metadata + non-default settings, paste-ready. Per
// Panel C: name is "Config" (not "Settings dump" — "dump" leaks the
// implementation; the user wants to see CONFIG). Per Panel B refinement:
// non-default values are the default view (massively cuts paste size); a
// "show all" toggle reveals the full settings tree for completeness.
function _configTab(panel) {
    let showAll = false;
    panel.innerHTML = `
        <div class="sp-cl-toolbar">
            <label class="sp-di-toggle"><input type="checkbox" class="sp-di-show-all"> ${t('Show all settings (not just non-defaults)')}</label>
            <span style="flex:1"></span>
            <button class="sp-cl-export-btn sp-di-copy">${t('Copy')}</button>
            <button class="sp-cl-export-btn sp-di-export">${t('Export TXT')}</button>
        </div>
        <div class="sp-di-config-body"></div>
    `;
    const body = panel.querySelector('.sp-di-config-body');

    function _build() {
        const s = (() => { try { return getSettings(); } catch { return null; } })();
        let profileBlock = '(unavailable)';
        let metaBlock = '(unavailable)';
        let settingsBlock = '(unavailable)';
        if (s) {
            try {
                const prof = getActiveProfile(s);
                if (prof) {
                    profileBlock = JSON.stringify({
                        id: prof.id,
                        name: prof.name,
                        hasCustomSchema: !!prof.schema,
                        hasCustomPrompt: !!prof.systemPrompt,
                        customPanels: prof.panels?.length || 0,
                        fieldToggleOverrides: Object.keys(prof.fieldToggles || {}).length,
                    }, null, 2);
                } else {
                    profileBlock = '(no profile active — running on raw settings)';
                }
            } catch (e) { profileBlock = '(error: ' + (e?.message || '') + ')'; }
            try {
                const ctx = (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) ? SillyTavern.getContext() : null;
                if (ctx) {
                    metaBlock = JSON.stringify({
                        chatId: ctx.chatId ? String(ctx.chatId).slice(-12) : null,
                        mesIdx: Array.isArray(ctx.chat) ? ctx.chat.length - 1 : null,
                        character: ctx.name2 || null,
                        groupId: ctx.groupId || null,
                        mainApi: ctx.mainApi || null,
                        viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : null,
                    }, null, 2);
                } else {
                    metaBlock = '(SillyTavern context unavailable)';
                }
            } catch (e) { metaBlock = '(error: ' + (e?.message || '') + ')'; }
            try {
                const data = showAll ? s : _nonDefaultSettings(s, DEFAULT_SETTINGS);
                settingsBlock = _redact(JSON.stringify(data, null, 2));
            } catch (e) { settingsBlock = '(error: ' + (e?.message || '') + ')'; }
        }
        body.innerHTML = `
            <div class="sp-cl-stack-label">${t('Active profile')}</div>
            <pre class="sp-cl-context">${esc(profileBlock)}</pre>
            <div class="sp-cl-stack-label">${t('Chat metadata')}</div>
            <pre class="sp-cl-context">${esc(metaBlock)}</pre>
            <div class="sp-cl-stack-label">${showAll ? t('All settings') : t('Non-default settings')}</div>
            <pre class="sp-cl-context">${esc(settingsBlock)}</pre>
            <div class="sp-cl-meta"><span>${t('API keys, paths, and emails are auto-redacted in this view.')}</span></div>
        `;
    }

    function _toText() {
        const lines = [];
        const s = (() => { try { return getSettings(); } catch { return null; } })();
        if (!s) return '(settings unavailable)';
        try {
            const prof = getActiveProfile(s);
            lines.push('Active profile:', JSON.stringify(prof ? { id: prof.id, name: prof.name } : null, null, 2));
        } catch {}
        try {
            const ctx = (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) ? SillyTavern.getContext() : null;
            lines.push('', 'Chat metadata:', JSON.stringify({
                chatId: ctx?.chatId ? String(ctx.chatId).slice(-12) : null,
                mesIdx: Array.isArray(ctx?.chat) ? ctx.chat.length - 1 : null,
                character: ctx?.name2 || null,
            }, null, 2));
        } catch {}
        const data = showAll ? s : _nonDefaultSettings(s, DEFAULT_SETTINGS);
        lines.push('', showAll ? 'All settings:' : 'Non-default settings:', _redact(JSON.stringify(data, null, 2)));
        return lines.join('\n');
    }

    panel.querySelector('.sp-di-show-all').addEventListener('change', e => {
        showAll = !!e.target.checked;
        _build();
    });
    panel.querySelector('.sp-di-copy').addEventListener('click', () => {
        _copy(_toText(), t('Config copied'));
    });
    panel.querySelector('.sp-di-export').addEventListener('click', () => {
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        _exportFile(_toText(), `scenepulse-config-${ts}.txt`);
    });

    _build();
    return () => {};
}

// ── Overlay ────────────────────────────────────────────────────────────

// v6.15.4: "Crashes" renamed to "Issues" — the contents include warnings + info,
// not just crashes. Tab id stays 'crashes' for back-compat with openDebugInspector
// callers that pass the initial tab name.
// v6.15.5: Config tab added (Panel C: "Config" not "Settings dump").
const TABS = [
    { id: 'crashes', label: 'Issues', render: _issuesTab, badge: () => crashEntryCount() },
    { id: 'activity', label: 'Activity', render: _activityTab },
    { id: 'response', label: 'Last Response', render: _lastResponseTab },
    { id: 'config', label: 'Config', render: _configTab },
];

export function openDebugInspector(initialTab = 'crashes') {
    document.querySelector('.sp-cl-overlay')?.remove();
    // v6.15.4: opening the inspector marks all captured entries as "seen" so the
    // toolbar button's flash/dot indicator clears.
    try { crashMarkSeen(); } catch {}

    const overlay = document.createElement('div');
    overlay.className = 'sp-cl-overlay';
    overlay.innerHTML = `
        <div class="sp-cl-container sp-di-container">
            <div class="sp-cl-header">
                <div class="sp-cl-title">${t('Debug Inspector')}</div>
                <button class="sp-cl-export-btn sp-di-diagnostics" title="${t('Copy a paste-ready report: recent activity, last response, errors, settings, versions')}">${t('Diagnostics')}</button>
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

    // v6.15.5: tab.render now receives a 2nd arg `{ switchTo, payload }`.
    // switchTo lets a tab open another tab with optional context (the
    // "Show in Last Response" button on a parse-error entry uses this).
    // payload is whatever the previous switchTo call passed.
    function _switchTo(id, payload) {
        const tab = TABS.find(x => x.id === id);
        if (!tab) return;
        activeTab = id;
        tabsBar.querySelectorAll('.sp-di-tab').forEach(b => {
            b.classList.toggle('sp-di-tab-active', b.dataset.tab === id);
        });
        try { _disposeTab(); } catch {}
        tabPanel.innerHTML = '';
        try { _disposeTab = tab.render(tabPanel, { switchTo: _switchTo, payload }) || (() => {}); }
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
    // v6.15.5: Diagnostics button — bundles activity + response + issues +
    // non-default settings + active profile + versions into a paste-ready
    // markdown block, copies to clipboard, optionally saves as a .md file.
    overlay.querySelector('.sp-di-diagnostics').addEventListener('click', () => {
        let spVersion = '', stVersion = '';
        try {
            // Pull versions from the same source as the issues entries — the most
            // recent captured entry has them.
            const recent = crashGetEntries().slice(-1)[0];
            if (recent) { spVersion = recent.spVersion || ''; stVersion = recent.stVersion || ''; }
        } catch {}
        const md = _buildDiagnostics({ spVersion, stVersion });
        _copy(md, t('Diagnostics copied'));
    });
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
