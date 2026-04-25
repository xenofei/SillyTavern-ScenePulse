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
import { esc, spConfirm } from '../utils.js';
import { debugLog } from '../logger.js';
import { getLastRawResponse } from '../state.js';
import { getPairs as rawGetPairs, lastPair as rawLastPair, pairCount as rawPairCount } from '../raw-pairs.js';
import { getEntries as netGetEntries, addChangeListener as netAddChangeListener, clearAll as netClearAll, entryCount as netEntryCount } from '../network-log.js';
import { runDoctor, DOCTOR_STEPS, runSingleDoctorCheck } from '../doctor.js';
import {
    startFpsSampling, stopFpsSampling, addFpsListener, computeFpsStats,
    getAnimationCount, getScenePulseLayerCount,
    startCapture, stopCapture, isCapturing,
    getFpsHistory, INSTRUMENTED_MARKS, getCapturePartial,
} from '../perf-monitor.js';
import { getEntries as crashGetEntries, clearAll as crashClearAll, flushNow as crashFlushNow, entryCount as crashEntryCount, markSeen as crashMarkSeen } from '../crash-log.js';
import { getSettings, getTrackerData } from '../settings.js';
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

// v6.16.2: Resolve EFFECTIVE configuration with provenance — what the UI
// actually uses, with each source labeled. Mirrors `_buildProfileView` but
// returns the same data tagged with where each value came from. Panel C: a
// dump field without a `source:` label is an anti-pattern.
function _resolveEffectiveConfig(s) {
    let profile = null;
    try { profile = getActiveProfile(s); } catch {}
    const profileName = profile?.name || '(none)';
    const _arrSet = (v) => Array.isArray(v) && v.length > 0;
    const _objSet = (v) => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 0;
    const _strSet = (v) => typeof v === 'string' && v.trim().length > 0;
    // ALWAYS-overlaid fields: profile wins if set, else root, else empty.
    const _resolveAlways = (key, isArr) => {
        const profVal = profile?.[key];
        const rootVal = s?.[key];
        const test = isArr ? _arrSet : _objSet;
        if (test(profVal)) return { value: profVal, source: `profile:${profileName}` };
        if (test(rootVal)) return { value: rootVal, source: 'root' };
        return { value: isArr ? [] : {}, source: 'default' };
    };
    // CONDITIONALLY-overlaid scalar fields: profile wins only when non-null.
    const _resolveConditional = (key) => {
        const profVal = profile?.[key];
        const rootVal = s?.[key];
        if (_strSet(profVal)) return { value: profVal, source: `profile:${profileName}` };
        if (_strSet(rootVal)) return { value: rootVal, source: 'root' };
        return { value: null, source: `default (profile.${key} = null)` };
    };
    return {
        activeProfileId: s.activeProfileId || null,
        activeProfileName: profileName,
        panels:        _resolveAlways('panels', false),
        fieldToggles:  _resolveAlways('fieldToggles', false),
        dashCards:     _resolveAlways('dashCards', false),
        customPanels:  _resolveAlways('customPanels', true),
        schema:        _resolveConditional('schema'),
        systemPrompt:  _resolveConditional('systemPrompt'),
    };
}

// v6.16.2: Detect root-level data shadowed by the active profile. Same rule
// set as `migrateOrphanRootData` but read-only — for the Diagnostics bundle
// + the Config tab warning row.
function _detectShadowedRootData(s) {
    const out = [];
    let profile = null;
    try { profile = getActiveProfile(s); } catch {}
    if (!profile) return out;
    const profileName = profile.name || 'active profile';
    const _arrHas = (v) => Array.isArray(v) && v.length > 0;
    const _objHas = (v) => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 0;
    const _strHas = (v) => typeof v === 'string' && v.trim().length > 0;
    const _checkAlways = (key, isArr) => {
        const rootHas = isArr ? _arrHas(s[key]) : _objHas(s[key]);
        const profHas = isArr ? _arrHas(profile[key]) : _objHas(profile[key]);
        if (rootHas && profHas) {
            const summary = isArr
                ? `${s[key].length} ${s[key].length === 1 ? 'entry' : 'entries'}`
                : `${Object.keys(s[key]).length} keys`;
            out.push({ key, summary, shadowedBy: `profile:${profileName}` });
        }
    };
    _checkAlways('panels', false);
    _checkAlways('fieldToggles', false);
    _checkAlways('dashCards', false);
    _checkAlways('customPanels', true);
    for (const key of ['schema', 'systemPrompt']) {
        if (_strHas(s[key]) && _strHas(profile[key])) {
            out.push({ key, summary: `${s[key].length} chars`, shadowedBy: `profile.${key}` });
        }
    }
    return out;
}

function _buildDiagnostics({ spVersion = '', stVersion = '' } = {}) {
    // Activity log: last 50 lines
    const activity = (debugLog || []).slice(-50).map(_redact).join('\n');
    // v6.15.6: prefer the latest pair (prompt + response) over the bare last
    // response — the prompt is what the maintainer actually needs to diagnose
    // prose-not-JSON failures. Fall back to lastRawResponse for upgrade-window
    // sessions where no pairs have been captured yet.
    const lp = rawLastPair();
    const rawResp = lp?.response || getLastRawResponse() || '';
    const rawPrompt = lp?.prompt || '';
    const respTrunc = rawResp.length > 4000
        ? rawResp.slice(0, 4000) + `\n\n[…truncated, total ${rawResp.length} chars]`
        : rawResp;
    const promptTrunc = rawPrompt.length > 6000
        ? rawPrompt.slice(0, 6000) + `\n\n[…truncated, total ${rawPrompt.length} chars]`
        : rawPrompt;
    // Last 10 issues, redacted, with diagnosis hints inline
    const issues = crashGetEntries().slice(-10).reverse().map(e => {
        const dx = _diagnose(e.message || '');
        return `[${_fmtTs(e.ts)}] ${(e.severity || 'error').toUpperCase()} (${e.source})${e.repeat > 1 ? ` ×${e.repeat}` : ''}\n`
            + `Message: ${_redact(e.message || '(empty)')}\n`
            + (dx ? `Likely: ${dx}\n` : '')
            + (e.context ? `Context: ${_redact(JSON.stringify(e.context))}\n` : '')
            + (e.stack ? `Stack:\n${_redact(e.stack)}\n` : '');
    }).join('\n---\n\n');
    // v6.16.2 (Panel C): bundle now leads with EFFECTIVE configuration (what
    // the UI actually uses, with source labels), then surfaces SHADOWED root
    // data explicitly, then everything else. The previous "Non-default settings"
    // dump silently included shadowed data, generating the user's exact bug
    // report ("custom panels in JSON even though I have none enabled").
    let effectiveBlock = '(unavailable)';
    let shadowedLines = [];
    let otherSettingsBlock = '';
    let profileBlock = '';
    let profilesArrayBlock = '';
    try {
        const s = getSettings();
        const eff = _resolveEffectiveConfig(s);
        // Render effective config with [source: ...] tags inline
        const effLines = [
            `activeProfileId: ${eff.activeProfileId} ("${eff.activeProfileName}")`,
            ...['panels', 'fieldToggles', 'dashCards', 'customPanels', 'schema', 'systemPrompt'].map(key => {
                const v = eff[key].value;
                const src = eff[key].source;
                let summary;
                if (v == null) summary = 'null';
                else if (Array.isArray(v)) summary = `[${v.length} entries]`;
                else if (typeof v === 'object') summary = `{${Object.keys(v).length} keys}`;
                else if (typeof v === 'string') summary = `"${v.slice(0, 60)}${v.length > 60 ? '…' : ''}" (${v.length} chars)`;
                else summary = JSON.stringify(v);
                return `${key}: ${summary}    [source: ${src}]`;
            }),
        ];
        effectiveBlock = effLines.join('\n');
        // Shadowed root data
        const shadowed = _detectShadowedRootData(s);
        shadowedLines = shadowed.length
            ? shadowed.map(o => `- root.${o.key}: ${o.summary}    ← shadowed by ${o.shadowedBy}`)
            : ['(none — root configuration is consistent with active profile)'];
        // Non-default settings MINUS the always-overlaid keys (those are in Effective above)
        const nonDef = _nonDefaultSettings(s, DEFAULT_SETTINGS);
        const _omitFromOther = ['panels', 'fieldToggles', 'dashCards', 'customPanels', 'schema', 'systemPrompt', 'profiles', 'activeProfileId'];
        const otherOnly = {};
        for (const k of Object.keys(nonDef)) if (!_omitFromOther.includes(k)) otherOnly[k] = nonDef[k];
        otherSettingsBlock = _redact(JSON.stringify(otherOnly, null, 2));
        // Active profile detail (single profile) and full profiles array (separate sections)
        const prof = getActiveProfile(s);
        if (prof) {
            const pSafe = { id: prof.id, name: prof.name, hasSchema: !!prof.schema, hasPrompt: !!prof.systemPrompt,
                panels: Object.keys(prof.panels || {}).length, customPanels: (prof.customPanels || []).length,
                fieldToggles: Object.keys(prof.fieldToggles || {}).length };
            profileBlock = JSON.stringify(pSafe, null, 2);
        }
        if (Array.isArray(s.profiles)) {
            profilesArrayBlock = JSON.stringify(s.profiles.map(p => ({
                id: p.id, name: p.name, hasSchema: !!p.schema, hasPrompt: !!p.systemPrompt,
                panels: Object.keys(p.panels || {}).length, customPanels: (p.customPanels || []).length,
            })), null, 2);
        }
    } catch (e) { effectiveBlock = '(unavailable: ' + (e?.message || '') + ')'; }

    const body = [
        '## Versions',
        `- ScenePulse: ${spVersion || '(unknown)'}`,
        `- SillyTavern: ${stVersion || '(unknown)'}`,
        `- UA: ${(typeof navigator !== 'undefined' && navigator.userAgent) || '(unknown)'}`,
        `- Viewport: ${typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '(unknown)'}`,
        '',
        '## Effective configuration (what the UI actually uses)',
        '```', effectiveBlock, '```',
        '',
        '## Shadowed root data (persisted but NOT in effect)',
        shadowedLines.join('\n'),
        '',
        '## Active profile',
        '```json', profileBlock || '(none)', '```',
        '',
        '## All profiles (summary)',
        '```json', profilesArrayBlock || '(none)', '```',
        '',
        '## Other non-default root settings (excluding profile-overlaid)',
        '```json', otherSettingsBlock, '```',
        '',
        `## Recent issues (last ${Math.min(10, crashGetEntries().length)} of ${crashGetEntries().length})`,
        '```', issues || '(none)', '```',
        '',
        '## Latest pair',
        lp ? `*${_fmtTs(lp.ts)} · source=${lp.source}${lp.parseFailed ? ' · **PARSE FAILED**' : ''}*` : '*no pair captured yet*',
        '',
        '### Prompt sent',
        rawPrompt ? '```\n' + _redact(promptTrunc) + '\n```' : '(none)',
        '',
        '### Response received',
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

// v6.15.9: Issues footer sparkline (Panel A's recommended substitute for the
// dropped Snapshots tab). Builds a 20-char unicode block sparkline showing
// per-turn snapshot success/fail density across the current chat. Failed
// turns = highest blocks; successful turns = lowest. Cheap to render — no
// canvas, no SVG, just text.
const _SPARK_BLOCKS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
function _buildSnapshotSparkline() {
    let snaps = {};
    try { snaps = getTrackerData()?.snapshots || {}; } catch {}
    const turnIds = Object.keys(snaps).map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);
    if (turnIds.length === 0) return null;

    // v6.16.2 Panel B "real fix": backfill mesIdx for historic crash entries
    // (v6.12.3-era) that lack it in their auto-context. Strategy: each parse-
    // related crash gets its mesIdx inferred as the snapshot whose save time
    // is CLOSEST to the crash ts AND falls within a 5-minute window (typical
    // generation+retry cycle). Without a save-time map for snapshots we fall
    // back to using the crash's own ts to find the closest turnId by ts —
    // snapshots are saved at generation completion so closest-ts matching
    // gives the right answer for failures during that generation.
    //
    // If snapshots don't carry their own ts, we approximate using the snapshot
    // body's `_spMeta` / time/date fields where available, else skip backfill
    // for that entry (still counts as untracked, so we keep the qualifier).
    const snapTs = {}; // turnId -> ms timestamp
    let backfillable = false;
    for (const turnId of turnIds) {
        const snap = snaps[String(turnId)];
        // Snapshots saved post-v6.x usually have _spMeta with no ts but include
        // top-level time/date strings. Fall back to using turn order as a
        // monotonic proxy if no ts is present.
        const tsStr = snap?._spMeta?.savedAt || snap?.savedAt || null;
        if (tsStr) {
            const ms = new Date(tsStr).getTime();
            if (!isNaN(ms)) { snapTs[turnId] = ms; backfillable = true; }
        }
    }
    const failedTurnSet = new Set();
    const fails = crashGetEntries().filter(e =>
        e.source === 'scenepulse' && _isParseRelated(e.message || ''));
    const FIVE_MIN_MS = 5 * 60 * 1000;
    for (const e of fails) {
        // 1. If auto-context already has mesIdx, use it directly.
        if (e.context?.mesIdx != null) {
            failedTurnSet.add(Number(e.context.mesIdx));
            continue;
        }
        // 2. Backfill: find the snapshot whose savedAt is closest to the crash
        //    ts AND within FIVE_MIN_MS. Skip if no snapshot has a savedAt.
        if (!backfillable) continue;
        const crashMs = new Date(e.ts).getTime();
        if (isNaN(crashMs)) continue;
        let bestId = null;
        let bestDelta = Infinity;
        for (const turnId of turnIds) {
            const snapMs = snapTs[turnId];
            if (snapMs == null) continue;
            const delta = Math.abs(snapMs - crashMs);
            if (delta < bestDelta) { bestDelta = delta; bestId = turnId; }
        }
        if (bestId != null && bestDelta <= FIVE_MIN_MS) {
            failedTurnSet.add(Number(bestId));
        }
    }
    const totalTurns = turnIds.length;
    const failCount = failedTurnSet.size;
    const lastFailTurn = failedTurnSet.size
        ? Math.max(...Array.from(failedTurnSet))
        : null;
    if (totalTurns === 0) return null;
    // Bucket the turn range into BUCKETS bins; each bin's height = fail count / max bin
    const BUCKETS = 20;
    const minId = turnIds[0];
    const maxId = turnIds[turnIds.length - 1];
    const span = Math.max(1, maxId - minId);
    const bins = new Array(BUCKETS).fill(0);
    for (const turnId of failedTurnSet) {
        const idx = Math.min(BUCKETS - 1, Math.floor((turnId - minId) / span * BUCKETS));
        bins[idx]++;
    }
    const maxBin = Math.max(1, ...bins);
    const spark = bins.map(v => {
        if (v === 0) return _SPARK_BLOCKS[0];
        const ratio = v / maxBin;
        const idx = Math.min(_SPARK_BLOCKS.length - 1, Math.ceil(ratio * (_SPARK_BLOCKS.length - 1)));
        return _SPARK_BLOCKS[idx];
    }).join('');
    // backfilled = true means we have savedAt timestamps for snapshots and were
    // able to infer historic failures. The footer drops the "since v6.15.3"
    // qualifier in this case (Panel B preferred path).
    return { spark, totalTurns, failCount, lastFailTurn, backfilled: backfillable };
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
    // v6.15.6: navigate among the last 10 (prompt, response) pairs captured
    // by raw-pairs.js. When arrived via "Show in Last Response" with an
    // issue payload, jump to the pair whose ts is closest to the issue's ts.
    const pairs = rawGetPairs(); // chronological, oldest first
    const hasPairs = pairs.length > 0;
    let activeIdx = pairs.length - 1; // default to latest
    if (payload.fromIssue && pairs.length) {
        const issueTs = new Date(payload.fromIssue.ts).getTime();
        let bestIdx = activeIdx;
        let bestDelta = Infinity;
        for (let i = 0; i < pairs.length; i++) {
            const dt = Math.abs(new Date(pairs[i].ts).getTime() - issueTs);
            if (dt < bestDelta) { bestDelta = dt; bestIdx = i; }
        }
        activeIdx = bestIdx;
    }

    panel.innerHTML = `
        <div class="sp-cl-toolbar">
            <button class="sp-cl-export-btn sp-di-copy">${t('Copy response')}</button>
            <button class="sp-cl-export-btn sp-di-copy-pair">${t('Copy pair')}</button>
            <button class="sp-cl-export-btn sp-di-copy-workbench" title="${t('Copy formatted for paste into Anthropic Workbench / OpenAI Playground')}">${t('Copy → Workbench')}</button>
            <button class="sp-cl-export-btn sp-di-export">${t('Export TXT')}</button>
            <span class="sp-di-stats sp-di-meta"></span>
            ${payload.fromIssue ? `<span class="sp-di-from-issue">${t('Opened from')} <code>${esc((payload.fromIssue.message || '').slice(0, 60))}…</code></span>` : ''}
        </div>
        ${hasPairs && pairs.length > 1 ? `
        <div class="sp-cl-toolbar sp-di-pair-nav">
            <button class="sp-cl-export-btn sp-di-pair-prev" ${activeIdx === 0 ? 'disabled' : ''}>← ${t('Older')}</button>
            <span class="sp-di-pair-indicator"></span>
            <button class="sp-cl-export-btn sp-di-pair-next" ${activeIdx === pairs.length - 1 ? 'disabled' : ''}>${t('Newer')} →</button>
            <span style="flex:1"></span>
            <span class="sp-di-pair-meta"></span>
        </div>` : ''}
        <div class="sp-di-response"></div>
    `;
    const stats = panel.querySelector('.sp-di-meta');
    const body = panel.querySelector('.sp-di-response');
    const indicator = panel.querySelector('.sp-di-pair-indicator');
    const pairMeta = panel.querySelector('.sp-di-pair-meta');

    // Fallback: no pairs captured yet, but there might still be a legacy
    // lastRawResponse from a generation that ran before v6.15.6. Show that
    // so the tab isn't useless during the upgrade transition.
    const fallbackRaw = getLastRawResponse();
    if (!hasPairs && !fallbackRaw) {
        stats.textContent = '';
        body.innerHTML = `<div class="sp-cl-empty">${t('No API response captured yet. Generate a scene first.')}</div>`;
        panel.querySelector('.sp-di-copy').disabled = true;
        panel.querySelector('.sp-di-copy-pair').disabled = true;
        panel.querySelector('.sp-di-export').disabled = true;
        return () => {};
    }

    function _renderActive() {
        const pair = hasPairs ? pairs[activeIdx] : null;
        const promptStr = pair?.prompt || '';
        const respStr = pair?.response || fallbackRaw || '';
        let rendered = respStr;
        let isJson = false;
        try { rendered = JSON.stringify(JSON.parse(respStr), null, 2); isJson = true; } catch {}
        stats.textContent = `${respStr.length} ${t('chars')}${isJson ? ' · ' + t('valid JSON') : ' · ' + t('raw text')}`;
        if (indicator) indicator.textContent = `${t('Pair')} ${activeIdx + 1} / ${pairs.length}`;
        if (pairMeta && pair) {
            const fail = pair.parseFailed ? ` · <span class="sp-di-pair-failed">${t('Parse failed')}</span>` : '';
            pairMeta.innerHTML = `${esc(_fmtTs(pair.ts))} · ${esc(pair.source)}${fail}`;
        }
        // Prompt block (collapsed by default) + response block
        const promptBlock = promptStr ? `
            <details class="sp-di-prompt-details">
                <summary class="sp-cl-stack-label">${t('Prompt sent')} (${promptStr.length} ${t('chars')})</summary>
                <pre class="sp-di-response-pre sp-di-prompt-pre">${esc(promptStr)}</pre>
            </details>` : '';
        const respLabel = `<div class="sp-cl-stack-label">${t('Response received')}</div>`;
        body.innerHTML = promptBlock + respLabel + `<pre class="sp-di-response-pre">${esc(rendered)}</pre>`;
        // Update prev/next disabled state
        const prev = panel.querySelector('.sp-di-pair-prev');
        const next = panel.querySelector('.sp-di-pair-next');
        if (prev) prev.disabled = activeIdx === 0;
        if (next) next.disabled = activeIdx === pairs.length - 1;
    }

    panel.querySelector('.sp-di-copy').addEventListener('click', () => {
        const pair = hasPairs ? pairs[activeIdx] : null;
        const text = pair?.response || fallbackRaw || '';
        _copy(text, t('Response copied'));
    });
    panel.querySelector('.sp-di-copy-pair').addEventListener('click', () => {
        const pair = hasPairs ? pairs[activeIdx] : null;
        if (!pair) {
            _copy(fallbackRaw || '', t('Response copied'));
            return;
        }
        const text = `# Prompt sent (${pair.prompt.length} chars)\n\n${pair.prompt}\n\n---\n\n# Response received (${pair.response.length} chars) · source=${pair.source} · ${pair.parseFailed ? 'PARSE FAILED' : 'parsed OK'}\n\n${pair.response}`;
        _copy(text, t('Pair copied'));
    });
    // v6.15.9: "Copy → Workbench" — Panel B's safer alternative to a Reproduce
    // button. Formats the captured pair so the user can paste straight into
    // Anthropic Workbench / OpenAI Playground and re-run there. Zero API
    // risk, zero state mutation, zero recursive triage. The format below is
    // accepted by both Workbench (system + user) and Playground.
    panel.querySelector('.sp-di-copy-workbench').addEventListener('click', () => {
        const pair = hasPairs ? pairs[activeIdx] : null;
        if (!pair || !pair.prompt) {
            try { toastr.warning(t('No prompt captured for this pair')); } catch {}
            return;
        }
        // ScenePulse's prompt is built as `${sysPr}\n\nRECENT:\n${ctxText}…`
        // — the system part is everything before the first "RECENT:" or "Narrative:"
        // marker. Split heuristically; fall back to "all-as-user" if no split point.
        const splitMatch = pair.prompt.match(/\n\n(RECENT:|Narrative:)/);
        const sysPart = splitMatch ? pair.prompt.slice(0, splitMatch.index) : '';
        const userPart = splitMatch ? pair.prompt.slice(splitMatch.index + 2) : pair.prompt;
        const wb = `=== SYSTEM ===\n${sysPart || '(no system prompt extracted — paste this whole block as the user message)'}\n\n=== USER ===\n${userPart}`;
        _copy(wb, t('Workbench format copied'));
    });
    panel.querySelector('.sp-di-export').addEventListener('click', () => {
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const pair = hasPairs ? pairs[activeIdx] : null;
        const text = pair
            ? `# Prompt\n\n${pair.prompt}\n\n# Response (${pair.parseFailed ? 'PARSE FAILED' : 'OK'})\n\n${pair.response}`
            : (fallbackRaw || '');
        _exportFile(text, `scenepulse-pair-${ts}.txt`);
    });
    const prev = panel.querySelector('.sp-di-pair-prev');
    const next = panel.querySelector('.sp-di-pair-next');
    if (prev) prev.addEventListener('click', () => { if (activeIdx > 0) { activeIdx--; _renderActive(); } });
    if (next) next.addEventListener('click', () => { if (activeIdx < pairs.length - 1) { activeIdx++; _renderActive(); } });

    _renderActive();

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
                <button class="sp-cl-export-btn sp-di-copy" title="${t('Copy only the issues list (this tab). For a full debug bundle, use Diagnostics in the header.')}">${t('Copy issues')}</button>
                <button class="sp-cl-export-btn sp-di-export" title="${t('Save only the issues list as a .txt file')}">${t('Export issues')}</button>
            </div>
            <div class="sp-cl-toolbar-zone sp-cl-zone-danger">
                <button class="sp-cl-export-btn sp-cl-danger sp-di-clear">${t('Clear')}</button>
            </div>
        </div>
        <div class="sp-cl-list sp-di-crash-list"></div>
        <div class="sp-cl-footer">
            <span class="sp-cl-footer-text"></span>
            <span class="sp-di-spark" title="${t('Snapshot success per turn — last 20 buckets')}"></span>
            <span class="sp-cl-footer-hint">${t('Stored in your user data folder.')}</span>
        </div>
    `;
    const list = panel.querySelector('.sp-di-crash-list');
    const footerText = panel.querySelector('.sp-cl-footer-text');
    const sparkEl = panel.querySelector('.sp-di-spark');

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
        // v6.15.9: snapshot-success sparkline in the footer (Panel A's substitute
        // for a dedicated Snapshots tab — same diagnostic value, zero new tab).
        if (sparkEl) {
            const s = _buildSnapshotSparkline();
            if (s) {
                const passed = s.totalTurns - s.failCount;
                const lastFailStr = s.lastFailTurn != null
                    ? ` · ${t('last fail @ turn')} ${s.lastFailTurn}`
                    : '';
                // v6.16.1: Panel B note — historic v6.12.3 entries lack mesIdx
                // in their auto-context (only added v6.15.3), so failures
                // captured before the upgrade can't be attributed to a turn
                // and silently drop out of the count. Until v6.16.2 lands the
                // backfill, the qualifier prevents the metric from reading as
                // a clean lie. After backfill, `s.backfilled === true` and
                // the qualifier hides.
                const qualifier = s.backfilled
                    ? ` (${s.failCount} ${t('failed')}${lastFailStr})`
                    : ` <span class="sp-di-spark-note">${t('failure tracking added v6.15.3')}</span>`;
                sparkEl.innerHTML = `${t('Snapshots')}: ${s.totalTurns} ${t('in this chat')} <code class="sp-di-spark-text">${esc(s.spark)}</code>${qualifier}`;
            } else {
                sparkEl.textContent = '';
            }
        }
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
        // v6.17.1: replace native confirm() (jarring, blocks event loop, unstyled)
        // with the in-app spConfirm dialog. Microcopy names the COUNT being
        // deleted so users don't accidentally nuke 200 entries thinking it's 5.
        const count = crashEntryCount();
        const ok = await spConfirm(
            t('Clear issue log?'),
            count
                ? t(`This permanently deletes ${count} captured ${count === 1 ? 'entry' : 'entries'} from this device. The actual errors are NOT undone — only the log is cleared.`)
                : t('The log is already empty.'),
            { okLabel: t('Delete log'), cancelLabel: t('Keep'), danger: true }
        );
        if (!ok) return;
        await crashClearAll();
        try { toastr.success(t('Crash log cleared')); } catch {}
        _render();
    });

    _render();
    crashFlushNow();
    return () => {};
}

// ── Tab: Network (v6.16.0) ──────────────────────────────────────────────
//
// Panel B: scoped network log, metadata-only (bodies live in raw-pairs),
// 50-entry ring, redaction-on-capture (already done in network-log.js),
// reuses Issues row template, fail highlighting via left border, click-to-
// expand row body, pairId linkage to raw-pairs.

function _netTab(panel, ctx = {}) {
    const switchTo = ctx.switchTo || (() => {});
    panel.innerHTML = `
        <div class="sp-cl-toolbar">
            <span class="sp-di-stats sp-di-net-stats"></span>
            <span style="flex:1"></span>
            <button class="sp-cl-export-btn sp-di-net-copy">${t('Copy all')}</button>
            <button class="sp-cl-export-btn sp-cl-danger sp-di-net-clear">${t('Clear')}</button>
        </div>
        <div class="sp-cl-list sp-di-net-list"></div>
        <div class="sp-cl-footer">
            <span class="sp-cl-footer-text"></span>
            <span class="sp-cl-footer-hint">${t('Last 50 outbound requests · metadata only · auto-redacted')}</span>
        </div>
    `;
    const stats = panel.querySelector('.sp-di-net-stats');
    const list = panel.querySelector('.sp-di-net-list');
    const footerText = panel.querySelector('.sp-cl-footer-text');

    function _entryToText(e) {
        return [
            `[${_fmtTs(e.ts)}] ${e.method} ${e.urlRedacted}`,
            `Label: ${e.label}`,
            `Status: ${e.status ?? 'transport-failure'} · Latency: ${e.latencyMs}ms · req=${e.reqBytes}B resp=${e.respBytes}B`,
            e.errorKind ? `Error: ${e.errorKind}${e.errorMessage ? ' — ' + e.errorMessage : ''}` : '',
            e.pairId ? `Pair: ${e.pairId}` : '',
        ].filter(Boolean).join('\n');
    }

    function _renderRow(e) {
        // Row severity: 4xx/5xx red; transport failure red; >10s amber; else neutral.
        let sev = 'info';
        if (e.errorKind || (e.status && e.status >= 400)) sev = 'error';
        else if (e.latencyMs > 10000) sev = 'warning';
        const row = document.createElement('div');
        row.className = 'sp-cl-row sp-cl-sev-' + sev;
        const statusBadge = e.status != null
            ? `<span class="sp-cl-sev-pill sp-cl-sev-pill-${sev}">${e.status}</span>`
            : `<span class="sp-cl-sev-pill sp-cl-sev-pill-error">ERR</span>`;
        const latencyBadge = e.latencyMs > 10000
            ? `<span class="sp-di-net-slow" title="${t('Slow request')}">${(e.latencyMs/1000).toFixed(1)}s</span>`
            : `<span class="sp-cl-ts">${e.latencyMs}ms</span>`;
        const pairBtn = e.pairId
            ? `<button class="sp-btn sp-cl-show-response sp-di-net-jump-pair" data-pair="${esc(e.pairId)}">${t('Show pair')}</button>`
            : '';
        row.innerHTML = `
            <div class="sp-cl-row-header">
                <span class="sp-cl-chevron">▶</span>
                ${statusBadge}
                <span class="sp-cl-src">${esc(e.method)}</span>
                <span class="sp-cl-msg">${esc(e.label)} · ${esc(e.urlRedacted)}</span>
                ${latencyBadge}
                <span class="sp-cl-ts">${esc(_fmtTs(e.ts))}</span>
            </div>
            <div class="sp-cl-row-body">
                <div class="sp-cl-stack-label">${t('Details')}</div>
                <pre class="sp-cl-context">${esc(_entryToText(e))}</pre>
                <div class="sp-cl-row-actions">
                    <button class="sp-btn sp-cl-copy-one">${t('Copy')}</button>
                    ${pairBtn}
                </div>
            </div>
        `;
        row.querySelector('.sp-cl-row-header').addEventListener('click', () => row.classList.toggle('sp-cl-open'));
        row.querySelector('.sp-cl-copy-one').addEventListener('click', ev => {
            ev.stopPropagation();
            _copy(_entryToText(e), t('Entry copied'));
        });
        const jumpBtn = row.querySelector('.sp-di-net-jump-pair');
        if (jumpBtn) {
            jumpBtn.addEventListener('click', ev => {
                ev.stopPropagation();
                // Build a fake "fromIssue" payload so the response tab navigator
                // jumps to the pair whose ts is closest to this network row's ts.
                switchTo('response', {
                    fromIssue: { ts: e.ts, message: `network row pair=${e.pairId}` },
                    scrollToTop: true,
                });
            });
        }
        return row;
    }

    function _render() {
        const all = netGetEntries().slice().reverse();
        const errs = all.filter(e => e.errorKind || (e.status && e.status >= 400)).length;
        stats.textContent = `${all.length} ${t('captured')} · ${errs} ${t('failed')}`;
        list.innerHTML = '';
        if (!all.length) {
            list.innerHTML = `<div class="sp-cl-empty">${t('No outbound requests captured yet. ScenePulse network calls (generate, update check, file persist) will appear here.')}</div>`;
        } else {
            const frag = document.createDocumentFragment();
            for (const e of all) frag.appendChild(_renderRow(e));
            list.appendChild(frag);
        }
        footerText.textContent = `${all.length} ${t('shown')}`;
    }

    panel.querySelector('.sp-di-net-copy').addEventListener('click', () => {
        const all = netGetEntries().slice().reverse();
        const text = all.map(_entryToText).join('\n\n' + '─'.repeat(40) + '\n\n');
        _copy(text, t('Network log copied'));
    });
    panel.querySelector('.sp-di-net-clear').addEventListener('click', async () => {
        // v6.17.1: spConfirm replaces native confirm — same in-app styling as
        // every other ScenePulse confirmation dialog.
        const count = netEntryCount();
        const ok = await spConfirm(
            t('Clear network log?'),
            count
                ? t(`This deletes ${count} captured network ${count === 1 ? 'entry' : 'entries'}. Future requests will still be captured.`)
                : t('The network log is already empty.'),
            { okLabel: t('Clear'), cancelLabel: t('Keep'), danger: true }
        );
        if (!ok) return;
        netClearAll();
        _render();
    });
    const _unsub = netAddChangeListener(() => _render());

    _render();
    return () => { try { _unsub(); } catch {} };
}

// ── Doctor (v6.16.0) ────────────────────────────────────────────────────
//
// Panel C: ship as a manual button in the header next to Diagnostics,
// not a tab. Three states (PASS / FAIL / SKIPPED — kill yellow). Each
// result names its limitation explicitly.

let _doctorRunning = false;
let _doctorAbort = null;
async function _runDoctorAndShow(overlay) {
    if (_doctorRunning) return;
    _doctorRunning = true;
    _doctorAbort = new AbortController();
    // Render a modal-style overlay panel inside the inspector container.
    const existing = overlay.querySelector('.sp-di-doctor-modal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.className = 'sp-di-doctor-modal';
    // v6.17.1: prerender the vertical step list BEFORE runDoctor starts so the
    // user sees what's about to run (and what's currently running) instead of
    // a single opaque spinner. Each step row swaps state pills as the doctor
    // emits onStep events. Cancel button aborts the AbortController; runDoctor
    // marks remaining steps as 'cancelled'.
    const stepRowsHtml = DOCTOR_STEPS.map((s, i) => `
        <li class="sp-di-doctor-step sp-di-doctor-step-queued"
            data-step-index="${i}" data-step-id="${esc(s.id)}">
            <span class="sp-di-doctor-step-pill sp-di-doctor-step-pill-queued">${t('queued')}</span>
            <span class="sp-di-doctor-step-name">${esc(t(s.name))}</span>
            <span class="sp-di-doctor-step-phase">${esc(t(s.phase))}</span>
            <span class="sp-di-doctor-step-elapsed"></span>
        </li>
    `).join('');
    modal.innerHTML = `
        <div class="sp-di-doctor-header">
            <div class="sp-di-doctor-title">${t('Doctor')} <span class="sp-di-doctor-sub">${t('real-path diagnostic checks · runs once on demand')}</span></div>
            <button class="sp-cl-close sp-di-doctor-close" type="button" aria-label="${t('Close Doctor')}">✕</button>
        </div>
        <div class="sp-di-doctor-body">
            <div class="sp-di-doctor-progress-wrap">
                <div class="sp-di-doctor-progress-head">
                    <span class="sp-di-doctor-progress-label">${t('Running 5 checks against the live ScenePulse code paths…')}</span>
                    <button class="sp-di-doctor-cancel" type="button">${t('Cancel')}</button>
                </div>
                <ul class="sp-di-doctor-steps">${stepRowsHtml}</ul>
            </div>
        </div>
    `;
    overlay.querySelector('.sp-cl-container').appendChild(modal);
    const _cleanup = () => { _doctorRunning = false; _doctorAbort = null; };
    modal.querySelector('.sp-di-doctor-close').addEventListener('click', () => {
        try { _doctorAbort?.abort(); } catch {}
        modal.remove();
        _cleanup();
    });
    modal.querySelector('.sp-di-doctor-cancel').addEventListener('click', () => {
        try { _doctorAbort?.abort(); } catch {}
        const btn = modal.querySelector('.sp-di-doctor-cancel');
        if (btn) { btn.disabled = true; btn.textContent = t('Cancelling…'); }
    });

    // Per-step UI updater — flips the state pill and elapsed timer.
    const _stepEl = (idx) => modal.querySelector(`.sp-di-doctor-step[data-step-index="${idx}"]`);
    const onStep = (ev) => {
        const li = _stepEl(ev.index);
        if (!li) return;
        // Reset state classes before applying the new one
        li.classList.remove(
            'sp-di-doctor-step-queued', 'sp-di-doctor-step-running',
            'sp-di-doctor-step-pass', 'sp-di-doctor-step-fail',
            'sp-di-doctor-step-skipped', 'sp-di-doctor-step-cancelled',
        );
        li.classList.add(`sp-di-doctor-step-${ev.status}`);
        const pill = li.querySelector('.sp-di-doctor-step-pill');
        if (pill) {
            pill.className = `sp-di-doctor-step-pill sp-di-doctor-step-pill-${ev.status}`;
            pill.textContent = t(ev.status);
        }
        const elapsed = li.querySelector('.sp-di-doctor-step-elapsed');
        if (elapsed && typeof ev.elapsedMs === 'number' && ev.status !== 'running') {
            elapsed.textContent = `${ev.elapsedMs}ms`;
        }
        // Inline summary on completed rows so the user gets a one-line preview
        // before the full results table renders below.
        if (ev.status !== 'running' && ev.status !== 'queued' && ev.summary) {
            let sumEl = li.querySelector('.sp-di-doctor-step-summary');
            if (!sumEl) {
                sumEl = document.createElement('span');
                sumEl.className = 'sp-di-doctor-step-summary';
                li.appendChild(sumEl);
            }
            sumEl.textContent = ev.summary;
        }
    };

    let results = [];
    try {
        results = await runDoctor({ onStep, signal: _doctorAbort.signal });
    } catch (e) {
        modal.querySelector('.sp-di-doctor-body').innerHTML =
            `<div class="sp-cl-empty">${t('Doctor failed to run')}: ${esc(e?.message || String(e))}</div>`;
        _cleanup();
        return;
    }
    // Build results UI — full detail table replaces the progress wrap once done.
    const passes    = results.filter(r => r.status === 'pass').length;
    const fails     = results.filter(r => r.status === 'fail').length;
    const skips     = results.filter(r => r.status === 'skipped').length;
    const cancelled = results.filter(r => r.status === 'cancelled').length;
    const rows = results.map(r => {
        const sev = ['pass', 'fail', 'skipped', 'cancelled'].includes(r.status) ? r.status : 'skipped';
        const detail = r.detail ? `<pre class="sp-cl-context sp-di-doctor-detail">${esc(r.detail)}</pre>` : '';
        // v6.22.1: per-row Retry button on FAIL rows so users can re-run
        // a single transient failure (502 / timeout / rate-limit) without
        // re-running the whole suite. Especially useful for the schema
        // round-trip which can take 30+ seconds on reasoning models.
        const retryBtn = (r.status === 'fail')
            ? `<button class="sp-di-doctor-retry" data-doctor-id="${esc(r.id)}" title="${t('Re-run only this check')}">${t('Retry')}</button>`
            : '';
        return `
            <div class="sp-di-doctor-row sp-di-doctor-${sev}" data-doctor-id="${esc(r.id)}">
                <div class="sp-di-doctor-row-head">
                    <span class="sp-di-doctor-status sp-di-doctor-status-${sev}">${esc(r.status.toUpperCase())}</span>
                    <span class="sp-di-doctor-name">${esc(r.name)}</span>
                    <span class="sp-cl-ts">${r.elapsedMs}ms</span>
                    ${retryBtn}
                </div>
                <div class="sp-di-doctor-summary">${esc(r.summary)}</div>
                ${detail}
                <div class="sp-di-doctor-limit">${esc(r.limitation)}</div>
            </div>`;
    }).join('');
    const cancelledStat = cancelled
        ? `<span><strong class="sp-di-doctor-status-cancelled">${cancelled}</strong> ${t('cancelled')}</span>`
        : '';
    modal.querySelector('.sp-di-doctor-body').innerHTML = `
        <div class="sp-di-doctor-stats">
            <span><strong class="sp-di-doctor-status-pass">${passes}</strong> ${t('passed')}</span>
            <span><strong class="sp-di-doctor-status-fail">${fails}</strong> ${t('failed')}</span>
            <span><strong class="sp-di-doctor-status-skipped">${skips}</strong> ${t('skipped')}</span>
            ${cancelledStat}
            <span style="flex:1"></span>
            <button class="sp-cl-export-btn sp-di-doctor-copy">${t('Copy results')}</button>
        </div>
        ${rows}
    `;
    modal.querySelector('.sp-di-doctor-copy').addEventListener('click', () => {
        const text = `# ScenePulse Doctor — ${new Date().toISOString()}\n\n` + results.map(r =>
            `## ${r.status.toUpperCase()} · ${r.name} · ${r.elapsedMs}ms\n${r.summary}\nLimitation: ${r.limitation}${r.detail ? '\nDetail: ' + r.detail : ''}`
        ).join('\n\n');
        _copy(text, t('Doctor results copied'));
    });
    // v6.22.1: wire per-row Retry buttons. Re-runs ONE check, swaps the row
    // in place with the new result. Keeps total results array in sync so
    // Copy results reflects the latest state. Event delegation from the
    // body so newly-rendered retry buttons (after a previous retry) keep
    // working without re-binding.
    modal.querySelector('.sp-di-doctor-body').addEventListener('click', async (ev) => {
        const btn = ev.target.closest('.sp-di-doctor-retry');
        if (!btn) return;
        const id = btn.dataset.doctorId;
        const idx = results.findIndex(r => r.id === id);
        if (idx < 0) return;
        btn.disabled = true;
        btn.textContent = t('Retrying…');
        try {
            const fresh = await runSingleDoctorCheck(id);
            if (!fresh) { btn.disabled = false; btn.textContent = t('Retry'); return; }
            results[idx] = fresh;
            const row = modal.querySelector(`.sp-di-doctor-row[data-doctor-id="${id}"]`);
            if (row) {
                const sev = ['pass','fail','skipped','cancelled'].includes(fresh.status) ? fresh.status : 'skipped';
                const detail = fresh.detail ? `<pre class="sp-cl-context sp-di-doctor-detail">${esc(fresh.detail)}</pre>` : '';
                const newRetryBtn = (fresh.status === 'fail')
                    ? `<button class="sp-di-doctor-retry" data-doctor-id="${esc(fresh.id)}" title="${t('Re-run only this check')}">${t('Retry')}</button>`
                    : '';
                row.className = `sp-di-doctor-row sp-di-doctor-${sev}`;
                row.innerHTML = `
                    <div class="sp-di-doctor-row-head">
                        <span class="sp-di-doctor-status sp-di-doctor-status-${sev}">${esc(fresh.status.toUpperCase())}</span>
                        <span class="sp-di-doctor-name">${esc(fresh.name)}</span>
                        <span class="sp-cl-ts">${fresh.elapsedMs}ms</span>
                        ${newRetryBtn}
                    </div>
                    <div class="sp-di-doctor-summary">${esc(fresh.summary)}</div>
                    ${detail}
                    <div class="sp-di-doctor-limit">${esc(fresh.limitation)}</div>`;
            }
            const statsEl = modal.querySelector('.sp-di-doctor-stats');
            if (statsEl) {
                const passes2 = results.filter(r => r.status === 'pass').length;
                const fails2  = results.filter(r => r.status === 'fail').length;
                const skips2  = results.filter(r => r.status === 'skipped').length;
                statsEl.querySelectorAll('strong').forEach((el, i) => {
                    if (i === 0) el.textContent = passes2;
                    if (i === 1) el.textContent = fails2;
                    if (i === 2) el.textContent = skips2;
                });
            }
        } catch (e) {
            btn.disabled = false;
            btn.textContent = t('Retry');
        }
    });
    _cleanup();
}

// ── Tab: Perf (v6.17.0) ─────────────────────────────────────────────────
//
// Panel A's MVP scope. Headline strip (FPS, p95 frame, animation count,
// ScenePulse layer count) — always sampled when this tab is open. Capture
// button to start a 30s window with full PerformanceObserver instrumentation
// — produces a sortable component-attribution table from sp:* marks.
//
// Honest tooltip: "Proxy metrics — browsers don't expose true GPU load".
// Refuses to confabulate a synthesized GPU% number (Panel A: "destroys
// trust in every other number on the panel").

function _perfTab(panel) {
    let _fpsUnsub = null;
    let _strip = null;
    let _refreshTimer = null;

    panel.innerHTML = `
        <div class="sp-cl-toolbar">
            <!-- v6.23.1: removed the duration preset select. Capture now runs
                 indefinitely (with a 10-min safety ceiling) until the user
                 clicks Stop. The button label switches to "Stop capture
                 (1:23)" with a counting-UP timer so users have full control
                 over when to end the window. -->
            <button class="sp-cl-export-btn sp-di-perf-capture">${t('Start capture')}</button>
            <span style="flex:1"></span>
            <button class="sp-cl-export-btn sp-di-perf-copy">${t('Copy results')}</button>
        </div>
        <div class="sp-di-perf-headline">
            <div class="sp-di-perf-metric sp-di-perf-metric-fps">
                <span class="sp-di-perf-metric-label">${t('FPS')}</span>
                <span class="sp-di-perf-metric-value sp-di-perf-fps">—</span>
                <!-- v6.17.1: 30s FPS trend sparkline. Trends matter more than
                     spot reading — a steady 60fps and a 60fps spike between
                     two 20fps drops look identical without history. -->
                <canvas class="sp-di-perf-fps-spark" width="180" height="32"
                        aria-label="${t('FPS over the last 30 seconds')}"></canvas>
            </div>
            <div class="sp-di-perf-metric">
                <span class="sp-di-perf-metric-label">${t('p95 frame')}</span>
                <span class="sp-di-perf-metric-value sp-di-perf-p95">—</span>
            </div>
            <div class="sp-di-perf-metric">
                <span class="sp-di-perf-metric-label">${t('Animations')}</span>
                <span class="sp-di-perf-metric-value sp-di-perf-anim">—</span>
            </div>
            <div class="sp-di-perf-metric">
                <span class="sp-di-perf-metric-label">${t('SP layers')}</span>
                <span class="sp-di-perf-metric-value sp-di-perf-layers">—</span>
            </div>
            <div class="sp-di-perf-metric">
                <span class="sp-di-perf-metric-label">${t('Reduce effects')}</span>
                <span class="sp-di-perf-metric-value sp-di-perf-reduce">—</span>
            </div>
        </div>
        <div class="sp-di-perf-honesty">
            <strong>${t('ⓘ Proxy metrics:')}</strong> ${t('browsers don’t expose true GPU load. We measure FPS, frame variance, animation count, and ScenePulse-attributed paint via instrumented marks. Capture mode attaches a PerformanceObserver to attribute paint cost to specific ScenePulse components (sp:* marks); always-on stays cheap.')}
        </div>
        <div class="sp-di-perf-status"></div>
        <div class="sp-di-perf-results"></div>
    `;
    const fpsEl = panel.querySelector('.sp-di-perf-fps');
    const p95El = panel.querySelector('.sp-di-perf-p95');
    const animEl = panel.querySelector('.sp-di-perf-anim');
    const layersEl = panel.querySelector('.sp-di-perf-layers');
    const reduceEl = panel.querySelector('.sp-di-perf-reduce');
    const statusEl = panel.querySelector('.sp-di-perf-status');
    const resultsEl = panel.querySelector('.sp-di-perf-results');
    const captureBtn = panel.querySelector('.sp-di-perf-capture');
    const copyBtn = panel.querySelector('.sp-di-perf-copy');
    // v6.23.1: 10-minute hard ceiling on user-stopped capture. If the user
    // wanders off, we won't observe forever — but they have plenty of time
    // to reproduce most slowdowns at their own pace.
    const _CAPTURE_MAX_MS = 600000;
    let _lastResult = null;

    const sparkEl = panel.querySelector('.sp-di-perf-fps-spark');
    function _drawFpsSparkline() {
        if (!sparkEl) return;
        const ctx = sparkEl.getContext?.('2d');
        if (!ctx) return;
        // High-DPI: size the backing store to devicePixelRatio so the line
        // doesn't render fuzzy on retina/4K displays.
        const dpr = window.devicePixelRatio || 1;
        const cssW = sparkEl.clientWidth || 180;
        const cssH = sparkEl.clientHeight || 32;
        if (sparkEl.width !== cssW * dpr) {
            sparkEl.width = cssW * dpr;
            sparkEl.height = cssH * dpr;
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, cssW, cssH);
        const history = getFpsHistory().slice(-30); // trailing 30s
        if (history.length < 2) return;
        // Use 60fps as the visual ceiling; clamp the floor to 0. A horizontal
        // reference line at 30fps signals the "noticeable jank" threshold.
        const max = 60;
        const xStep = cssW / (history.length - 1);
        // Reference line at 30fps
        ctx.strokeStyle = 'rgba(255,255,255,0.10)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const refY = cssH - (30 / max) * cssH;
        ctx.moveTo(0, refY); ctx.lineTo(cssW, refY); ctx.stroke();
        // FPS line — accent color so it reads as the primary signal
        ctx.strokeStyle = 'rgba(77,184,164,0.95)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        history.forEach((pt, i) => {
            const fps = Math.max(0, Math.min(max, pt.fps || 0));
            const x = i * xStep;
            const y = cssH - (fps / max) * cssH;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
    }
    function _refreshHeadline() {
        const stats = computeFpsStats();
        if (stats.fps > 0) fpsEl.textContent = stats.fps;
        if (stats.frameP95Ms > 0) p95El.textContent = stats.frameP95Ms + 'ms';
        animEl.textContent = getAnimationCount();
        layersEl.textContent = getScenePulseLayerCount();
        try {
            reduceEl.textContent = document.body?.classList?.contains('sp-reduce-effects') ? 'on' : 'off';
        } catch { reduceEl.textContent = '?'; }
        _drawFpsSparkline();
    }

    function _renderResults(result) {
        const isPartial = !!result?.partial;
        if (!result || !result.components.length) {
            // v6.17.1: empty-state lists what's actually instrumented so users
            // can confirm whether their slow component is in the manifest at
            // all. v6.21.0: partial captures with 0 marks yet show a friendlier
            // "no activity yet — keep interacting" message instead of the full
            // empty-state explainer, so the user understands the window is
            // still open.
            const manifestRows = INSTRUMENTED_MARKS.map(m => `
                <li>
                    <code>${esc(m.mark)}</code>
                    <span class="sp-di-perf-manifest-desc">${esc(t(m.desc))}</span>
                    <span class="sp-di-perf-manifest-mod">${esc(m.module)}</span>
                </li>`).join('');
            const headline = isPartial
                ? `${t('No instrumented activity yet')} — ${t('keep interacting with the chat / panel for the rest of the window.')}`
                : t('No sp:* marks recorded during this capture');
            resultsEl.innerHTML = `
                <div class="sp-cl-empty sp-di-perf-empty">
                    <div class="sp-di-perf-empty-title">${esc(headline)}</div>
                    <div class="sp-di-perf-empty-body">
                        ${t('Either (a) no instrumented component ran, or (b) ScenePulse wasn’t actively rendering. Trigger the slowdown DURING the capture window so the observer can attribute it.')}
                    </div>
                    <details class="sp-di-perf-manifest">
                        <summary>${t('Currently instrumented modules')} (${INSTRUMENTED_MARKS.length})</summary>
                        <ul>${manifestRows}</ul>
                    </details>
                </div>`;
            return;
        }
        // v6.17.1: stacked horizontal bar above the table. Gives at-a-glance
        // proportion of each component's share of the capture window — the
        // table has the precise numbers, the bar communicates "this component
        // dominated" without forcing the user to read percentages.
        // Top 6 components get distinct colors; the rest collapse to "other".
        const PALETTE = [
            '#4db8a4', '#f59e0b', '#a78bfa', '#60a5fa', '#f472b6', '#34d399',
        ];
        const top = result.components.slice(0, 6);
        const rest = result.components.slice(6);
        const restPct = rest.reduce((sum, c) => sum + (c.pctOfCapture || 0), 0);
        const segments = top.map((c, i) => ({
            name: c.name, pct: c.pctOfCapture, color: PALETTE[i],
        }));
        if (restPct > 0) segments.push({ name: 'other', pct: Math.round(restPct * 10) / 10, color: 'rgba(255,255,255,0.18)' });
        const totalPct = segments.reduce((s, g) => s + g.pct, 0);
        const idleSegment = totalPct < 100 ? { name: 'idle', pct: Math.round((100 - totalPct) * 10) / 10, color: 'rgba(255,255,255,0.04)' } : null;
        const allSegments = idleSegment ? [...segments, idleSegment] : segments;
        const stackedBar = `
            <div class="sp-di-perf-stack" role="img"
                 aria-label="${t('Capture share by component')}">
                ${allSegments.filter(s => s.pct > 0.1).map(s => `
                    <span class="sp-di-perf-stack-seg"
                          style="flex:${s.pct};background:${s.color}"
                          title="${esc(s.name)} · ${s.pct}%"></span>`).join('')}
            </div>
            <div class="sp-di-perf-stack-legend">
                ${segments.map((s) => `
                    <span class="sp-di-perf-stack-key">
                        <span class="sp-di-perf-stack-swatch" style="background:${s.color}"></span>
                        <code>${esc(s.name)}</code>
                        <span class="sp-di-perf-stack-pct">${s.pct}%</span>
                    </span>`).join('')}
                ${idleSegment ? `
                    <span class="sp-di-perf-stack-key sp-di-perf-stack-key-idle">
                        <span class="sp-di-perf-stack-swatch" style="background:${idleSegment.color}"></span>
                        <span>${t('idle / unattributed')}</span>
                        <span class="sp-di-perf-stack-pct">${idleSegment.pct}%</span>
                    </span>` : ''}
            </div>`;
        const rows = result.components.map(c => `
            <tr>
                <td><code>${esc(c.name)}</code></td>
                <td class="sp-di-perf-num">${c.totalMs}</td>
                <td class="sp-di-perf-num">${c.count}</td>
                <td class="sp-di-perf-num">${c.avgMs}</td>
                <td class="sp-di-perf-num">${c.maxMs}</td>
                <td class="sp-di-perf-num">${c.pctOfCapture}%</td>
            </tr>
        `).join('');
        // v6.21.0: capture verdict line. Computes total ScenePulse-attributed
        // ms vs the capture window and bands it into a single-line verdict so
        // users don't have to interpret raw percentages themselves. Bands
        // borrow the language from `brew doctor` — "healthy" through
        // "excessive" — so the meaning lands at a glance.
        const totalSpMs = result.components.reduce((s, c) => s + c.totalMs, 0);
        const totalSpPct = result.durationMs > 0 ? (totalSpMs / result.durationMs) * 100 : 0;
        const maxFrameMs = result.components.reduce((m, c) => Math.max(m, c.maxMs), 0);
        let verdictBand, verdictLabel, verdictMsg;
        if (totalSpPct < 1) {
            verdictBand = 'good';
            verdictLabel = t('Healthy');
            verdictMsg = t('ScenePulse contributed less than 1% of the capture window. No action needed.');
        } else if (totalSpPct < 5) {
            verdictBand = 'good';
            verdictLabel = t('Acceptable');
            verdictMsg = t('ScenePulse contributed a small fraction of the window. Within the cheap-monitoring budget.');
        } else if (totalSpPct < 15) {
            verdictBand = 'warn';
            verdictLabel = t('Heavy');
            verdictMsg = t('ScenePulse used a noticeable share of frame time. Consider disabling expensive panels (weather overlay, time-tint, dashboard sparklines).');
        } else {
            verdictBand = 'bad';
            verdictLabel = t('Excessive');
            verdictMsg = t('ScenePulse dominated the capture window. Investigate the top component below — usually a single panel or overlay is responsible.');
        }
        const longTaskWarn = result.longTasks > 3
            ? `<div class="sp-di-perf-verdict-extra sp-di-perf-verdict-warn-extra">⚠ ${result.longTasks} ${t('long tasks (>50ms) — main-thread blocking detected.')}</div>`
            : (result.longTasks > 0
                ? `<div class="sp-di-perf-verdict-extra">ⓘ ${result.longTasks} ${t('long task (>50ms) — usually OK during interactions.')}</div>`
                : '');
        const frameWarn = maxFrameMs > 50
            ? `<div class="sp-di-perf-verdict-extra sp-di-perf-verdict-warn-extra">⚠ ${t('Top component frame:')} ${Math.round(maxFrameMs)}ms — ${t('exceeds the 16ms frame budget.')}</div>`
            : '';
        const verdict = `
            <div class="sp-di-perf-verdict sp-di-perf-verdict-${verdictBand}">
                <div class="sp-di-perf-verdict-head">
                    <span class="sp-di-perf-verdict-label">${esc(verdictLabel)}</span>
                    <span class="sp-di-perf-verdict-stat">${totalSpPct.toFixed(1)}% ${t('of capture')} · ${Math.round(totalSpMs)}ms ${t('across')} ${result.components.length} ${result.components.length === 1 ? t('component') : t('components')}</span>
                </div>
                <div class="sp-di-perf-verdict-msg">${esc(verdictMsg)}</div>
                ${longTaskWarn}
                ${frameWarn}
            </div>`;
        const partialBadge = isPartial ? ` <span class="sp-di-perf-partial-badge">${t('LIVE')}</span>` : '';
        resultsEl.innerHTML = `
            ${verdict}
            <div class="sp-di-perf-result-meta">
                ${t('Capture')}: ${result.durationMs}ms · ${result.components.length} ${t('components')} · ${result.longTasks} ${t('long tasks (>50ms)')}${partialBadge}
            </div>
            ${stackedBar}
            <table class="sp-di-perf-table">
                <thead><tr>
                    <th>${t('Component')}</th>
                    <th class="sp-di-perf-num">${t('Total ms')}</th>
                    <th class="sp-di-perf-num">${t('Calls')}</th>
                    <th class="sp-di-perf-num">${t('Avg ms')}</th>
                    <th class="sp-di-perf-num">${t('Max ms')}</th>
                    <th class="sp-di-perf-num">${t('% of capture')}</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        `;
    }

    // v6.21.0 → v6.23.1: user-stopped capture with count-UP timer.
    //  - No preset duration. Capture runs until user clicks Stop, with a
    //    10-min hard ceiling for safety.
    //  - Button: "Start capture" → "Stop capture (1:23)" (mm:ss elapsed,
    //    counting up). Click Stop to end immediately.
    //  - Re-renders partial results every ~1s (live LIVE badge in table).
    //  - Floating overlay survives inspector close; its Stop button also
    //    ends the capture and the inspector cleans up via the same path
    //    when the await resolves.
    //  - Cleanup is bulletproof — _resetCaptureButton runs in finally,
    //    AND we listen for the capture-ended state via getCaptureMeta() in
    //    the tick so the inspector also responds to overlay-side stops.
    let _captureTickTimer = null;
    let _captureUserStopped = false;
    function _stopCaptureTicks() {
        if (_captureTickTimer) { clearInterval(_captureTickTimer); _captureTickTimer = null; }
    }
    function _resetCaptureButton() {
        captureBtn.disabled = false;
        captureBtn.classList.remove('sp-di-perf-capture-running');
        captureBtn.textContent = t('Start capture');
    }
    function _fmtElapsed(ms) {
        const totalS = Math.floor(ms / 1000);
        const m = Math.floor(totalS / 60);
        const s = totalS % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    }
    captureBtn.addEventListener('click', async () => {
        // Mid-capture click → user stop. The await on capturePromise will
        // resolve, finally{} runs _resetCaptureButton.
        if (isCapturing()) {
            _captureUserStopped = true;
            try { stopCapture(); } catch {}
            return;
        }
        const startedAt = Date.now();
        _captureUserStopped = false;
        captureBtn.classList.add('sp-di-perf-capture-running');
        captureBtn.textContent = `${t('Stop capture')} (0:00)`;
        statusEl.innerHTML = `<div class="sp-di-perf-capturing">${t('Reproduce the issue now. Capture is open — interact with the chat / panel / weather to attribute the work. Click Stop when done.')}</div>`;
        // Kick off startCapture FIRST so _captureActive flips synchronously
        // before the overlay mount reads getCaptureMeta().
        const capturePromise = startCapture(_CAPTURE_MAX_MS);
        try {
            const ov = await import('./perf-capture-overlay.js');
            ov.mountCaptureOverlay();
        } catch {}
        // Tick: update count-up timer + partial results every 1s. Also
        // detects external stop (overlay Cancel, max-duration timeout) and
        // exits cleanly so the button doesn't keep "Stop capture" forever.
        _captureTickTimer = setInterval(() => {
            if (!isCapturing()) { _stopCaptureTicks(); return; }
            const elapsedMs = Date.now() - startedAt;
            captureBtn.textContent = `${t('Stop capture')} (${_fmtElapsed(elapsedMs)})`;
            const partial = getCapturePartial();
            if (partial) _renderResults(partial);
        }, 1000);
        try {
            _lastResult = await capturePromise;
            _stopCaptureTicks();
            if (_captureUserStopped) {
                statusEl.innerHTML = '';
            } else {
                // Hit the 10-min ceiling
                statusEl.innerHTML = `<div class="sp-di-perf-capturing">${t('Capture reached the 10-minute safety limit and was stopped automatically.')}</div>`;
            }
            _renderResults(_lastResult);
        } catch (e) {
            _stopCaptureTicks();
            statusEl.innerHTML = `<div class="sp-cl-empty">${t('Capture failed')}: ${esc(e?.message || String(e))}</div>`;
        } finally {
            _resetCaptureButton();
        }
    });

    copyBtn.addEventListener('click', () => {
        if (!_lastResult) {
            try { toastr.warning(t('Run a capture first')); } catch {}
            return;
        }
        const lines = [
            `# ScenePulse Perf Capture — ${new Date().toISOString()}`,
            `Duration: ${_lastResult.durationMs}ms · ${_lastResult.components.length} components · ${_lastResult.longTasks} long tasks`,
            '',
            'Component | Total ms | Calls | Avg ms | Max ms | % of capture',
            '---|---|---|---|---|---',
            ..._lastResult.components.map(c =>
                `${c.name} | ${c.totalMs} | ${c.count} | ${c.avgMs} | ${c.maxMs} | ${c.pctOfCapture}%`),
        ];
        _copy(lines.join('\n'), t('Perf results copied'));
    });

    // Wire FPS sampler — start when tab opens, stop when disposed
    startFpsSampling();
    _fpsUnsub = addFpsListener(_refreshHeadline);
    _refreshHeadline();
    // Refresh headline once a second even if FPS hasn't notified yet
    _refreshTimer = setInterval(_refreshHeadline, 1000);

    return () => {
        if (_fpsUnsub) try { _fpsUnsub(); } catch {}
        stopFpsSampling();
        if (_refreshTimer) clearInterval(_refreshTimer);
    };
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
        <div class="sp-di-orphan-warn"></div>
        <div class="sp-di-config-body"></div>
    `;
    const body = panel.querySelector('.sp-di-config-body');
    const orphanWarn = panel.querySelector('.sp-di-orphan-warn');

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
        // v6.16.2: orphan warning row at the top — Panel C: same data as the
        // Diagnostics _orphans block, surfaced where users edit settings so
        // they can act on it. Auto-cleanup runs via migrateOrphanRootData on
        // next save (already wired in src/settings.js getActiveSchema), but
        // this row makes the cleanup visible AND offers a manual cleanup
        // button for cases where the auto-migration didn't fire.
        try {
            const sNow = getSettings();
            const orphans = _detectShadowedRootData(sNow);
            if (orphans.length > 0) {
                const lines = orphans.map(o =>
                    `<li><code>root.${esc(o.key)}</code>: ${esc(o.summary)} <span class="sp-di-orphan-shadowed">${esc(t('shadowed by'))} ${esc(o.shadowedBy)}</span></li>`
                ).join('');
                orphanWarn.innerHTML = `
                    <div class="sp-di-orphan-card">
                        <div class="sp-di-orphan-head">
                            <span class="sp-di-orphan-icon">!</span>
                            <strong>${orphans.length} ${t('settings overridden by profile (not in effect)')}</strong>
                            <button class="sp-cl-export-btn sp-di-orphan-clean" type="button">${t('Clean up legacy root data')}</button>
                        </div>
                        <ul class="sp-di-orphan-list">${lines}</ul>
                        <div class="sp-di-orphan-hint">${t('These root values are persisted but ignored — the active profile owns them. Cleanup is auto-run on next save; manual button is for cases where the auto-migration did not fire (e.g. imported settings backup).')}</div>
                    </div>
                `;
                orphanWarn.querySelector('.sp-di-orphan-clean').addEventListener('click', async () => {
                    const sLatest = getSettings();
                    const { migrateOrphanRootData } = await import('../profiles.js');
                    const touched = migrateOrphanRootData(sLatest);
                    if (touched > 0) {
                        const { saveSettings } = await import('../settings.js');
                        saveSettings();
                        try { toastr.success(`${t('Cleaned up')} ${touched} ${t('orphaned root settings')}`); } catch {}
                        _build();
                    } else {
                        try { toastr.info(t('Nothing to clean up')); } catch {}
                    }
                });
            } else {
                orphanWarn.innerHTML = '';
            }
        } catch {}
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
// v6.16.0: Network tab added (Panel B: scoped fetch capture, metadata-only).
// v6.17.0: Perf tab added (Panel A MVP: FPS headline + capture mode for
// component attribution via sp:* marks).
const TABS = [
    { id: 'crashes', label: 'Issues', render: _issuesTab, badge: () => crashEntryCount() },
    { id: 'activity', label: 'Activity', render: _activityTab },
    // v6.16.1: renamed from "Last Response" — the tab is a pair-navigator
    // over the last 10 prompt+response tuples, not a stream-of-one. Plural
    // matches the reality (Panel B audit).
    { id: 'response', label: 'Responses', render: _lastResponseTab },
    { id: 'network', label: 'Network', render: _netTab, badge: () => netEntryCount() },
    // v6.17.1: full word "Performance" in the tab; CSS cascades down to "Perf"
    // at <720px and an icon at <420px so the bar never wraps.
    { id: 'perf', label: 'Performance', shortLabel: 'Perf', render: _perfTab },
    { id: 'config', label: 'Config', render: _configTab },
];

export function openDebugInspector(initialTab = 'crashes') {
    document.querySelector('.sp-cl-overlay')?.remove();
    // v6.15.4: opening the inspector marks all captured entries as "seen" so the
    // toolbar button's flash/dot indicator clears.
    try { crashMarkSeen(); } catch {}

    const overlay = document.createElement('div');
    overlay.className = 'sp-cl-overlay';
    // v6.15.7: visible info popover next to the Diagnostics button (the
    // user couldn't tell at a glance how Diagnostics differs from the per-tab
    // Copy/Export buttons). Native `title` is desktop-only and slow; a CSS
    // hover popover is visible on every platform and discoverable.
    overlay.innerHTML = `
        <div class="sp-cl-container sp-di-container">
            <div class="sp-cl-header">
                <div class="sp-cl-title">${t('Debug Inspector')}</div>
                <div class="sp-di-doctor-wrap">
                    <button class="sp-cl-export-btn sp-di-doctor">${t('Doctor')}</button>
                    <span class="sp-di-info-area">
                        <button class="sp-di-info" type="button" aria-label="${t('What does Doctor do?')}" tabindex="0">
                            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                                <circle cx="8" cy="4.25" r="1.25" fill="currentColor"/>
                                <rect x="7" y="6.75" width="2" height="6.5" rx="1" fill="currentColor"/>
                            </svg>
                        </button>
                        <div class="sp-di-info-popover" role="tooltip">
                            <div class="sp-di-info-title">${t('Doctor')} <span class="sp-di-info-badge">${t('5 real-path checks · runs on demand')}</span></div>
                            <div class="sp-di-info-body">
                                ${t('One click → runs 5 checks against the actual ScenePulse code paths (no mocks):')}
                                <ul>
                                    <li><strong>${t('Storage')}:</strong> ${t('write + read + verify a probe file via /api/files/upload')}</li>
                                    <li><strong>${t('Model echo')}:</strong> ${t('POST a 1-token prompt via the active connection — confirms the model responds')}</li>
                                    <li><strong>${t('Schema round-trip')}:</strong> ${t('send a minimal generation + parse via the live JSON schema (skipped if model echo fails)')}</li>
                                    <li><strong>${t('Context budget')}:</strong> ${t('local token estimate vs the active connection max_context')}</li>
                                    <li><strong>${t('Tokenizer parity')}:</strong> ${t('local estimate vs the ST endpoint count for a known string — fails if drift > 25%')}</li>
                                </ul>
                                <div class="sp-di-info-divider"></div>
                                <div class="sp-di-info-compare">
                                    <strong>${t('Three states only:')}</strong> ${t('PASS / FAIL / SKIPPED. No yellow — every PASS row names what it does NOT guarantee, so a green is never mistaken for the wrong promise.')}
                                </div>
                            </div>
                        </div>
                    </span>
                </div>
                <div class="sp-di-diag-wrap">
                    <button class="sp-cl-export-btn sp-di-diagnostics">${t('Diagnostics')}</button>
                    <span class="sp-di-info-area">
                        <button class="sp-di-info" type="button" aria-label="${t('What does Diagnostics do?')}" tabindex="0">
                            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                                <circle cx="8" cy="4.25" r="1.25" fill="currentColor"/>
                                <rect x="7" y="6.75" width="2" height="6.5" rx="1" fill="currentColor"/>
                            </svg>
                        </button>
                        <div class="sp-di-info-popover" role="tooltip">
                            <div class="sp-di-info-title">${t('Diagnostics')} <span class="sp-di-info-badge">${t('whole-inspector bundle')}</span></div>
                            <div class="sp-di-info-body">
                                ${t('One click → paste-ready markdown report combining EVERYTHING the inspector knows:')}
                                <ul>
                                    <li><strong>${t('Latest pair')}:</strong> ${t('the prompt sent + response received from the most recent generation')}</li>
                                    <li><strong>${t('Last 10 issues')}:</strong> ${t('with diagnosis hints inline')}</li>
                                    <li><strong>${t('Activity log')}:</strong> ${t('last 50 lines')}</li>
                                    <li><strong>${t('Active profile')} + ${t('non-default settings')}</strong></li>
                                    <li><strong>${t('Versions')}:</strong> ${t('SP, ST, browser, viewport')}</li>
                                    <li><strong>${t('6-char hash header')}:</strong> ${t('tells two pastes apart at a glance')}</li>
                                    <li><strong>${t('Auto-redacted')}:</strong> ${t('API keys, paths, emails')}</li>
                                </ul>
                                <div class="sp-di-info-divider"></div>
                                <div class="sp-di-info-compare">
                                    <strong>${t('Versus the per-tab Copy / Export buttons:')}</strong> ${t('those copy ONLY the content of the current tab (e.g. Issues tab → only the issues list). Diagnostics gives you the full picture in one paste — best for filing a bug report.')}
                                </div>
                            </div>
                        </div>
                    </span>
                </div>
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
        // v6.17.1: dual-label spans let CSS swap full-word ("Performance") for
        // a short form ("Perf") at narrow widths instead of truncating mid-word.
        const longHtml = `<span class="sp-di-tab-long">${esc(t(tab.label))}</span>`;
        const shortHtml = tab.shortLabel ? `<span class="sp-di-tab-short">${esc(t(tab.shortLabel))}</span>` : '';
        const badgeHtml = badge ? ` <span class="sp-di-tab-badge">${badge}</span>` : '';
        btn.innerHTML = `${longHtml}${shortHtml}${badgeHtml}`;
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
    // v6.16.0: Doctor button — runs 5 real-path checks on demand. Manual
    // trigger only (no auto-run, no background polling per Panel C).
    overlay.querySelector('.sp-di-doctor').addEventListener('click', () => {
        _runDoctorAndShow(overlay);
    });
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
