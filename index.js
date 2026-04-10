// ScenePulse — Modular Architecture
// Thin entry point: imports, event wiring, globalThis export

// ── Foundation ──
import './src/logger.js';
import { VERSION } from './src/constants.js';
import { log, warn, err } from './src/logger.js';

// ── Core Logic ──
import {
    generating, genNonce, genMeta,
    inlineGenStartMs,
    inlineExtractionDone,
    setGenerating, setGenNonce, setCancelRequested,
    setInlineGenStartMs,
    setPendingInlineIdx, setInlineExtractionDone,
    setPrevLocation, setPrevTimePeriod,
    resetSessionTokens,
    _inlineWaitTimerId, set_inlineWaitTimerId
} from './src/state.js';
import {
    getSettings, anyPanelsActive,
    getLatestSnapshot,
    ensureChatSaved, invalidateSettingsCache
} from './src/settings.js';
import { normalizeTracker, clearNormCache } from './src/normalize.js';
import { resetColorMap } from './src/color.js';
import { initI18n } from './src/i18n.js';

// ── Generation ──
import { extractInlineTracker } from './src/generation/extraction.js';
import { stopStreamingHider } from './src/generation/streaming.js';
import { cancelGeneration } from './src/generation/engine.js';
import { scenePulseInterceptor } from './src/generation/interceptor.js';
import { processExtraction } from './src/generation/pipeline.js';

// ── UI ──
import { spSetGenerating } from './src/ui/mobile.js';
import { createPanel } from './src/ui/panel.js';
import { updatePanel } from './src/ui/update-panel.js';
import { clearWeatherOverlay } from './src/ui/weather.js';
import { clearTimeTint } from './src/ui/time-tint.js';
import { onCharMsg, renderExisting, spOnMessageDeleted } from './src/ui/message.js';
import { cleanupGenUI, clearThoughtLoading } from './src/ui/loading.js';

// ── Settings UI ──
import { createSettings } from './src/settings-ui/create-settings.js';
import { loadUI } from './src/settings-ui/bind-ui.js';
import { showSetupGuide } from './src/settings-ui/setup-guide.js';
import { checkForUpdate, showUpdateBadge, showUpdateBanner } from './src/update-check.js';

// ── Slash Commands & Macros ──
import { registerSlashCommands } from './src/slash-commands.js';
import { registerMacros } from './src/macros.js';

// ── Function Tool Calling ──
import { registerFunctionTool } from './src/generation/function-tool.js';

// ── Register interceptor on globalThis (required by manifest.json "generate_interceptor") ──
globalThis.scenePulseInterceptor = scenePulseInterceptor;

// ── Wire SillyTavern Events ──
const { eventSource, event_types } = SillyTavern.getContext();

// Create panel immediately — DOM is ready when ST loads extensions
try { createPanel(); log('Panel created at load'); } catch (e) { warn('Early panel:', e); }

eventSource.on(event_types.APP_READY, async () => { try {
    log('APP_READY: start');
    // v6.9.10: AWAIT initI18n so t() calls during panel/settings
    // construction have translations ready. Without await, non-English
    // users saw an English flash on every page load because the async
    // fetch hadn't completed before createPanel()/createSettings() ran.
    try { await initI18n(); log('APP_READY: i18n ok'); } catch { /* degrade to English */ }
    createPanel(); log('APP_READY: panel ok');
    createSettings(); log('APP_READY: settings ok');
    // Register slash commands & macros
    try { registerSlashCommands(); log('APP_READY: slash commands ok'); } catch (e) { warn('Slash commands:', e); }
    try { registerMacros(); log('APP_READY: macros ok'); } catch (e) { warn('Macros:', e); }
    try { registerFunctionTool(); log('APP_READY: function tool ok'); } catch (e) { warn('Function tool:', e); }
    // Delayed retry: ST may populate profile dropdowns after our init
    setTimeout(() => { try { loadUI(); log('APP_READY: delayed profile refresh'); } catch (e) {} }, 2000);
    renderExisting(); log('APP_READY: render ok');
    // First-run: show setup guide if not dismissed
    const _s = getSettings();
    if (!_s.setupDismissed) {
        setTimeout(() => showSetupGuide(), 2000);
    }
    log('v' + VERSION + ' ready');
    // Apply saved theme
    try {
        const _ts = getSettings();
        if (_ts.theme && _ts.theme !== 'default') {
            import('./src/themes.js').then(m => m.applyTheme(_ts.theme)).catch(() => {});
        }
    } catch {}
    // ST version compatibility check
    try {
        const _ctx = SillyTavern.getContext();
        const _stVer = _ctx.version || _ctx.getVersion?.() || '';
        if (_stVer) {
            log('SillyTavern version:', _stVer);
            // Known minimum: 1.12.0 required, tested up to 1.16.x
            const _verMatch = String(_stVer).match(/(\d+)\.(\d+)/);
            if (_verMatch) {
                const _major = Number(_verMatch[1]);
                const _minor = Number(_verMatch[2]);
                if (_major < 1 || (_major === 1 && _minor < 12)) {
                    toastr.warning('ScenePulse requires SillyTavern 1.12.0 or newer. Some features may not work.', 'ScenePulse', { timeOut: 10000 });
                }
            }
        }
    } catch {}
    // Register regex script to hide tracker JSON from DOM display.
    // markdownOnly:true = only runs during markdown rendering (display), NOT on raw msg.mes.
    // This is the same approach used by RPG Companion and Dooms Enhancement Suite.
    try {
        const _ctx = SillyTavern.getContext();
        if (_ctx.extensionSettings) {
            if (!_ctx.extensionSettings.regex) _ctx.extensionSettings.regex = [];
            // Remove old broken version (v5.9.0 had markdownOnly:false which stripped msg.mes)
            const _oldIdx = _ctx.extensionSettings.regex.findIndex(r => r.scriptName === 'ScenePulse Tracker Hider');
            if (_oldIdx !== -1) _ctx.extensionSettings.regex.splice(_oldIdx, 1);
            // Register with markdownOnly:true — cleans display but preserves msg.mes for extraction
            _ctx.extensionSettings.regex.push({
                scriptName: 'ScenePulse Tracker Hider',
                findRegex: '<!--SP_TRACKER_START-->[\\s\\S]*?(<!--SP_TRACKER_END-->|$)|\\{\\{//SP_TRACKER_START\\}\\}[\\s\\S]*?(\\{\\{//SP_TRACKER_END\\}\\}|$)|\\[SCENE TRACKER[^\\]]*\\][\\s\\S]*$|\\{\\s*"time"\\s*:\\s*"\\d{1,2}:\\d{2}[\\s\\S]*$',
                replaceString: '',
                trimStrings: [],
                placement: [2],
                disabled: false,
                markdownOnly: true,
                promptOnly: false,
                runOnEdit: true,
                substituteRegex: 0,
            });
            log('Registered ST regex filter (markdownOnly) for tracker hiding');
        }
    } catch (e) { warn('Could not register regex filter:', e); }
    // Check for updates (non-blocking)
    setTimeout(async () => {
        try {
            const info = await checkForUpdate();
            if (info) {
                const branchEl = document.getElementById('sp-branch-info');
                if (branchEl) branchEl.textContent = `${info.branch} · ${info.commit}`;
                if (!info.isUpToDate) { showUpdateBadge(); showUpdateBanner(); }
            }
        } catch (e) {}
    }, 3000);
} catch (e) { err('APP_READY:', e); } });

eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, idx => onCharMsg(idx));

// CRITICAL: Save chat the INSTANT generation ends, BEFORE other extensions
// can trigger profile switches that cause CHAT_CHANGED → chat reload → message loss.
eventSource.on(event_types.GENERATION_ENDED, async () => {
    try { if(_inlineWaitTimerId){clearInterval(_inlineWaitTimerId);set_inlineWaitTimerId(null)} const w = document.getElementById('sp-inline-wait'); if (w) w.remove(); } catch {}
    clearThoughtLoading();
    // ── PRIMARY EXTRACTION for Together/Inline mode ──
    // Guard: only extract when ScenePulse actually injected a prompt (inlineGenStartMs > 0).
    // Other extensions (e.g. MemoryBooks) may trigger GENERATION_ENDED for their own quiet
    // generations — we must NOT attempt extraction from messages we didn't inject into.
    const s = getSettings();
    if (s.enabled && s.injectionMethod === 'inline' && !inlineExtractionDone && anyPanelsActive() && inlineGenStartMs > 0) {
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
                const _compTokens = Math.round(fullMsgLen / 4);
                const _elapsed = inlineGenStartMs > 0 ? ((Date.now() - inlineGenStartMs) / 1000) : 0;
                setInlineGenStartMs(0);
                genMeta.promptTokens = 0;
                genMeta.completionTokens = _compTokens;
                genMeta.elapsed = _elapsed;
                await processExtraction(targetIdx, extracted, 'auto:together', {
                    promptTokens: 0, completionTokens: _compTokens, elapsed: _elapsed,
                    stopHider: true, unlockGen: true
                });
                log('GENERATION_ENDED: pipeline complete');
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
        // Defensive: clear inline generation ownership state so a subsequent
        // message from another extension (e.g. MemoryBooks) does not get
        // misattributed to our cancelled generation.
        setInlineGenStartMs(0); setInlineExtractionDone(false); setPendingInlineIdx(-1);
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
    resetSessionTokens();
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

// ── Keyboard shortcuts ──
document.addEventListener('keydown', (e) => {
    // Escape: close diff viewer or overlays
    if (e.key === 'Escape') {
        try {
            const diffOverlay = document.querySelector('.sp-diff-overlay');
            if (diffOverlay) { diffOverlay.remove(); e.preventDefault(); return; }
            const graphPopup = document.querySelector('.sp-graph-popup');
            if (graphPopup) { graphPopup.remove(); e.preventDefault(); return; }
            const confirmOverlay = document.querySelector('.sp-confirm-overlay');
            if (confirmOverlay) { confirmOverlay.remove(); e.preventDefault(); return; }
        } catch {}
    }
    // Alt+Shift+P: toggle panel (avoids Firefox Ctrl+Shift+P print conflict)
    if (e.altKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        try {
            const panel = document.getElementById('sp-panel');
            if (panel && panel.classList.contains('sp-visible')) {
                import('./src/ui/panel.js').then(m => m.hidePanel());
            } else {
                import('./src/ui/panel.js').then(m => m.showPanel());
            }
        } catch {}
    }
    // Alt+Shift+R: regenerate tracker with loading animations
    if (e.altKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        if (!generating && getSettings().enabled) {
            const { chat } = SillyTavern.getContext();
            let mesIdx = -1;
            for (let i = chat.length - 1; i >= 0; i--) {
                if (!chat[i].is_user) { mesIdx = i; break; }
            }
            if (mesIdx >= 0) {
                (async () => {
                    const [stateM, engineM, loadM, mobileM, panelM] = await Promise.all([
                        import('./src/state.js'), import('./src/generation/engine.js'),
                        import('./src/ui/loading.js'), import('./src/ui/mobile.js'), import('./src/ui/panel.js')
                    ]);
                    stateM.setLastGenSource('shortcut:regen');
                    mobileM.spAutoShow();
                    loadM.showLoadingOverlay(document.getElementById('sp-panel-body'), 'Generating Scene', 'Keyboard shortcut');
                    loadM.showStopButton(); loadM.startElapsedTimer();
                    loadM.showThoughtLoading('Generating Scene', 'Analyzing context');
                    const result = await engineM.generateTracker(mesIdx);
                    loadM.hideStopButton(); loadM.stopElapsedTimer();
                    loadM.clearLoadingOverlay(document.getElementById('sp-panel-body'));
                    loadM.clearThoughtLoading();
                    if (result) panelM.showPanel();
                })().catch(() => {});
            }
        }
    }
});

log('v' + VERSION + ' init');
