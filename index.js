// ScenePulse — Modular Architecture
// Thin entry point: imports, event wiring, globalThis export

// ── Foundation ──
import './src/logger.js';
import { VERSION } from './src/constants.js';
import { log, warn, err } from './src/logger.js';

// ── Core Logic ──
import {
    generating, genNonce, genMeta,
    inlineGenStartMs, lastGenSource,
    inlineExtractionDone,
    setGenerating, setGenNonce, setCancelRequested,
    setInlineGenStartMs, setCurrentSnapshotMesIdx, setLastGenSource, setLastRawResponse, setLastDeltaPayload,
    setPendingInlineIdx, setInlineExtractionDone,
    setPrevLocation, setPrevTimePeriod
} from './src/state.js';
import {
    getSettings, anyPanelsActive,
    getLatestSnapshot, saveSnapshot,
    ensureChatSaved, invalidateSettingsCache
} from './src/settings.js';
import { normalizeTracker, clearNormCache } from './src/normalize.js';
import { resetColorMap } from './src/color.js';

// ── Generation ──
import { extractInlineTracker } from './src/generation/extraction.js';
import { mergeDelta } from './src/generation/delta-merge.js';
import { stopStreamingHider } from './src/generation/streaming.js';
import { cancelGeneration } from './src/generation/engine.js';
import { scenePulseInterceptor } from './src/generation/interceptor.js';

// ── UI ──
import { spSetGenerating, spPostGenShow } from './src/ui/mobile.js';
import { createPanel } from './src/ui/panel.js';
import { updatePanel } from './src/ui/update-panel.js';
import { clearWeatherOverlay } from './src/ui/weather.js';
import { clearTimeTint } from './src/ui/time-tint.js';
import { addMesButton, onCharMsg, renderExisting, spOnMessageDeleted } from './src/ui/message.js';
import { cleanupGenUI, clearThoughtLoading } from './src/ui/loading.js';

// ── Settings UI ──
import { createSettings } from './src/settings-ui/create-settings.js';
import { loadUI } from './src/settings-ui/bind-ui.js';
import { showSetupGuide } from './src/settings-ui/setup-guide.js';
import { checkForUpdate, showUpdateBadge } from './src/update-check.js';

// ── Register interceptor on globalThis (required by manifest.json "generate_interceptor") ──
globalThis.scenePulseInterceptor = scenePulseInterceptor;

// ── Wire SillyTavern Events ──
const { eventSource, event_types } = SillyTavern.getContext();

// Create panel immediately — DOM is ready when ST loads extensions
try { createPanel(); log('Panel created at load'); } catch (e) { warn('Early panel:', e); }

eventSource.on(event_types.APP_READY, () => { try {
    log('APP_READY: start');
    createPanel(); log('APP_READY: panel ok');
    createSettings(); log('APP_READY: settings ok');
    // Delayed retry: ST may populate profile dropdowns after our init
    setTimeout(() => { try { loadUI(); log('APP_READY: delayed profile refresh'); } catch (e) {} }, 2000);
    renderExisting(); log('APP_READY: render ok');
    // First-run: show setup guide if not dismissed
    const _s = getSettings();
    if (!_s.setupDismissed) {
        setTimeout(() => showSetupGuide(), 2000);
    }
    log('v' + VERSION + ' ready');
    // Clean up any previously-registered regex filter (v5.9.0 registered one that
    // broke extraction — ST's regex pipeline modifies msg.mes BEFORE extraction)
    try {
        const _ctx = SillyTavern.getContext();
        if (_ctx.extensionSettings?.regex) {
            const _oldIdx = _ctx.extensionSettings.regex.findIndex(r => r.scriptName === 'ScenePulse Tracker Hider');
            if (_oldIdx !== -1) { _ctx.extensionSettings.regex.splice(_oldIdx, 1); log('Removed stale regex filter from v5.9.0'); }
        }
    } catch (e) {}
    // Check for updates (non-blocking)
    setTimeout(async () => {
        try {
            const info = await checkForUpdate();
            if (info) {
                const branchEl = document.getElementById('sp-branch-info');
                if (branchEl) branchEl.textContent = `${info.branch} · ${info.commit}`;
                if (!info.isUpToDate) showUpdateBadge();
            }
        } catch (e) {}
    }, 3000);
} catch (e) { err('APP_READY:', e); } });

eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, idx => onCharMsg(idx));

// CRITICAL: Save chat the INSTANT generation ends, BEFORE other extensions
// can trigger profile switches that cause CHAT_CHANGED → chat reload → message loss.
eventSource.on(event_types.GENERATION_ENDED, async () => {
    try { const w = document.getElementById('sp-inline-wait'); if (w) { if (w._timerInterval) clearInterval(w._timerInterval); w.remove(); } } catch {}
    clearThoughtLoading();
    // ── PRIMARY EXTRACTION for Together/Inline mode ──
    const s = getSettings();
    if (s.enabled && s.injectionMethod === 'inline' && !inlineExtractionDone && anyPanelsActive()) {
        const { chat } = SillyTavern.getContext();
        let targetIdx = -1;
        for (let i = chat.length - 1; i >= 0; i--) {
            if (!chat[i].is_user) { targetIdx = i; break; }
        }
        if (targetIdx >= 0) {
            log('GENERATION_ENDED: primary extraction attempt for message', targetIdx);
            const fullMsgLen = (chat[targetIdx]?.mes || '').length;
            let extracted = extractInlineTracker(targetIdx);
            if (extracted) {
                log('GENERATION_ENDED: primary extraction SUCCESS for message', targetIdx);
                setInlineExtractionDone(true); setPendingInlineIdx(-1);
                genMeta.promptTokens = 0;
                genMeta.completionTokens = Math.round(fullMsgLen / 4);
                genMeta.elapsed = inlineGenStartMs > 0 ? ((Date.now() - inlineGenStartMs) / 1000) : 0;
                setInlineGenStartMs(0);
                setLastGenSource('auto:together');
                setLastRawResponse(JSON.stringify(extracted, null, 2));
                // Delta merge for inline mode
                const prevSnap = getLatestSnapshot();
                if(s.deltaMode && prevSnap){
                    setLastDeltaPayload(extracted);
                    extracted = mergeDelta(prevSnap, extracted);
                    log('GENERATION_ENDED: delta merge applied');
                } else {
                    setLastDeltaPayload(null);
                }
                const norm = normalizeTracker(extracted);
                setCurrentSnapshotMesIdx(targetIdx);
                log('=== TOGETHER MODE SUMMARY === source=', lastGenSource);
                log('  chars:', norm.characters?.length || 0, 'rels:', norm.relationships?.length || 0);
                log('  quests: main=', norm.mainQuests?.length || 0, 'side=', norm.sideQuests?.length || 0, 'tasks=', norm.activeTasks?.length || 0);
                log('  ideas:', norm.plotBranches?.length || 0, 'northStar:', JSON.stringify(norm.northStar || '').substring(0, 50));
                log('  scene: topic=' + (norm.sceneTopic ? '✓' : '✗'), 'mood=' + (norm.sceneMood ? '✓' : '✗'), 'tension=' + (norm.sceneTension ? '✓' : '✗'));
                if (norm.characters?.length) for (const c of norm.characters) log('  char:', c.name, 'role=', c.role ? '✓' : '✗', 'thought=', c.innerThought ? '✓' : '✗');
                if (norm.relationships?.length) for (const r of norm.relationships) log('  rel:', r.name, 'aff=', r.affection, 'trust=', r.trust, 'desire=', r.desire, 'compat=', r.compatibility);
                extracted._spMeta = { promptTokens: 0, completionTokens: genMeta.completionTokens, elapsed: genMeta.elapsed, source: 'auto:together', injectionMethod: 'inline' };
                saveSnapshot(targetIdx, extracted);
                updatePanel(norm); spPostGenShow();
                spSetGenerating(false);
                stopStreamingHider();
                log('GENERATION_ENDED: panel updated — extraction complete before cascade');
                const el = document.querySelector(`.mes[mesid="${targetIdx}"]`);
                if (el) addMesButton(el);
                try { await ensureChatSaved(); log('GENERATION_ENDED: chat saved'); }
                catch (e) { warn('GENERATION_ENDED save failed:', e); }
                return;
            } else {
                const msgLen = (chat[targetIdx]?.mes || '').length;
                log('GENERATION_ENDED: primary extraction failed for message', targetIdx, '(' + msgLen + ' chars), deferring to onCharMsg');
                setPendingInlineIdx(targetIdx);
            }
        } else {
            log('GENERATION_ENDED: no assistant message found, deferring to onCharMsg');
        }
    } else {
        spSetGenerating(false);
        stopStreamingHider();
    }
    try { await ensureChatSaved(); log('GENERATION_ENDED: chat saved preemptively'); }
    catch (e) { warn('GENERATION_ENDED save failed:', e); }
});

// If user clicks ST's own stop button, cancel our generation too
eventSource.on(event_types.GENERATION_STOPPED, () => {
    if (generating) {
        log('ST generation_stopped event — cancelling ScenePulse generation');
        const oldNonce = genNonce;
        setGenNonce(genNonce + 1);
        setCancelRequested(true);
        setGenerating(false); spSetGenerating(false);
        log('CANCEL (ST stop): nonce', oldNonce, '→', genNonce);
        cleanupGenUI();
        const snap = getLatestSnapshot();
        const body = document.getElementById('sp-panel-body');
        if (snap) { const norm = normalizeTracker(snap); updatePanel(norm); }
        else if (body) body.innerHTML = '<div class="sp-empty-state"><div class="sp-empty-icon">📡</div><div class="sp-empty-title">No scene data yet</div><div class="sp-empty-sub">Generation was stopped. Click <strong>⟳</strong> to try again.</div></div>';
    }
});

eventSource.on(event_types.CHAT_CHANGED, async () => {
    try { await ensureChatSaved(); } catch (e) { warn('CHAT_CHANGED save:', e); }
    if (generating) cancelGeneration();
    const tp = document.getElementById('sp-thought-panel');
    if (tp) { tp.classList.remove('sp-tp-visible'); const tpb = document.getElementById('sp-tp-body'); if (tpb) tpb.innerHTML = ''; }
    clearWeatherOverlay();
    clearTimeTint();
    clearNormCache();
    resetColorMap();
    invalidateSettingsCache();
    setPrevLocation(''); setPrevTimePeriod('');
    setTimeout(() => {
        renderExisting();
        const msgs = document.querySelectorAll('.mes');
        if (msgs.length === 0) setTimeout(renderExisting, 500);
    }, 200);
});

// Message deleted — remove associated snapshot and refresh timeline
if (event_types.MESSAGE_DELETED) {
    eventSource.on(event_types.MESSAGE_DELETED, (idx) => {
        log('MESSAGE_DELETED event, idx=', idx);
        spOnMessageDeleted(Number(idx));
    });
}
// Also catch swipe/edit which may renumber messages
if (event_types.MESSAGE_UPDATED) {
    eventSource.on(event_types.MESSAGE_UPDATED, () => { setTimeout(renderExisting, 300); });
}

log('v' + VERSION + ' init');
