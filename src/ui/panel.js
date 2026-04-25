// src/ui/panel.js — Side Panel Creation, Show/Hide, Toolbar Event Handling
import { log, warn } from '../logger.js';
import { esc, clamp, str } from '../utils.js';
import { t } from '../i18n.js';
import { MASCOT_SVG, DEFAULTS, VERSION } from '../constants.js';
import { getSettings, saveSettings, ensureChatPanels, saveChatPanels, getActivePanels } from '../settings.js';
import { BUILTIN_PANELS } from '../constants.js';
import { buildDynamicSchema } from '../schema.js';
import { getActiveProfile } from '../profiles.js';
import { getLatestSnapshot } from '../settings.js';
import { normalizeTracker } from '../normalize.js';
import {
    generating, genNonce, lastGenSource, setLastGenSource,
    currentWeatherType, setCurrentWeatherType,
    currentTimePeriod, setCurrentTimePeriod,
    _cachedNormData
} from '../state.js';
import { generateTracker } from '../generation/engine.js';
import { spApplyMode, spDetectMode, spMinimizePanel, spRestorePanel, spUpdateFab, spInjectTopBar } from './mobile.js';
import { updateWeatherOverlay, clearWeatherOverlay } from './weather.js';
import { updateTimeTint, clearTimeTint } from './time-tint.js';
import { showLoadingOverlay, clearLoadingOverlay, showStopButton, hideStopButton, startElapsedTimer, stopElapsedTimer, showThoughtLoading, clearThoughtLoading } from './loading.js';
import { updatePanel } from './update-panel.js';
import { closeDiffViewer } from './diff-viewer.js';
import { updateThoughts } from './thoughts.js';
import { renderCustomPanelsMgr } from '../settings-ui/custom-panels.js';
import { mkSection } from './section.js';
import { injectStoryIdea } from '../story-ideas.js';

// Feature badge sync — exported so external modules can update the badge
export function updateFeatBadge(){
    const s=getSettings();const active=[s.showThoughts!==false,s.weatherOverlay!==false,s.timeTint!==false,s.sceneTransitions!==false].filter(Boolean).length;
    const badge=document.getElementById('sp-feat-badge');if(badge)badge.textContent=active+'/4';
    const btn=document.getElementById('sp-tb-features');if(btn)btn.classList.toggle('sp-tb-active',active>0);
}

// Brand icon state — reflects generating/idle/error
let _errorTimer=null;
export function setBrandState(state){
    const wrap=document.getElementById('sp-brand-icon-wrap');if(!wrap)return;
    if(_errorTimer){clearTimeout(_errorTimer);_errorTimer=null}
    wrap.classList.remove('sp-state-generating','sp-state-error');
    if(state==='generating')wrap.classList.add('sp-state-generating');
    else if(state==='error'){wrap.classList.add('sp-state-error');_errorTimer=setTimeout(()=>wrap.classList.remove('sp-state-error'),5000)}
}

// Font scale: overrides --sp-fs-base to scale all text proportionally.
// Since all font-sizes use variables derived from --sp-fs-base, changing
// the base value scales everything automatically.
export function _applyFontScale(scale){
    const v=scale||1;
    let el=document.getElementById('sp-font-scale-style');
    if(v===1){if(el)el.remove();return}
    if(!el){el=document.createElement('style');el.id='sp-font-scale-style';document.head.appendChild(el)}
    const base=Math.round(12*v);
    el.textContent=`#sp-panel,#sp-thought-panel{--sp-fs-base:${base}px}`;
}

export function showPanel(){
    const p=document.getElementById('sp-panel');if(!p)return;
    if(!getSettings().enabled){p.classList.remove('sp-visible');return}
    const mode=spApplyMode();
    const topBar=document.getElementById('top-bar')||document.getElementById('top-settings-holder')||document.querySelector('.header,.nav-bar,header');
    const tbH=topBar?topBar.getBoundingClientRect().bottom:0;
    // CSS has bottom:0, just set top and width. No height calc needed —
    // per-section scrolling (max-height on .sp-section-content) handles
    // content overflow within each section independently.
    // Reset ALL positioning inline styles before applying mode-specific ones.
    // This prevents stale styles from a previous mode (e.g. left:'0' from
    // mobile) persisting when switching back to desktop.
    p.style.top='';p.style.bottom='';p.style.left='';p.style.right='';p.style.width='';p.style.height='';
    if(mode==='mobile'||mode==='tablet'){
        const spTopH=44;
        // Use explicit pixel height for mobile — bottom:0 is unreliable
        // due to html{transform:translateZ(0)} containment. Desktop works
        // with bottom:0 because per-section scrolling handles overflow.
        const mobileH=Math.max(window.innerHeight,window.screen?.availHeight||0)-spTopH;
        p.style.top=spTopH+'px';p.style.height=mobileH+'px';p.style.left='0';p.style.right='0';p.style.width='100vw';
        // Force-remove compact mode on mobile/tablet — fullscreen panel
        // doesn't need condensing, and compact hides char grid/goals/fertility
        p.classList.remove('sp-compact');delete p.dataset.spAutoCompact;delete p.dataset.spUserCompact;
    }else{
        p.style.top=tbH+'px';p.style.right='0';
        const sheld=document.getElementById('sheld');
        const sheldRight=sheld?sheld.getBoundingClientRect().right:window.innerWidth*0.5;
        const availW=window.innerWidth-sheldRight;
        const _userCompact=p.dataset.spUserCompact==='true';
        if(availW<360&&!_userCompact){
            p.classList.add('sp-compact');p.dataset.spAutoCompact='true';
            p.style.width=Math.max(240,Math.min(Math.round(window.innerWidth*0.22),280))+'px';
        }else if(p.dataset.spAutoCompact==='true'&&availW>=360){
            p.classList.remove('sp-compact');delete p.dataset.spAutoCompact;
            p.style.width=Math.max(300,availW)+'px';
        }else if(p.classList.contains('sp-compact')){
            p.style.width=Math.max(240,Math.min(Math.round(window.innerWidth*0.22),280))+'px';
        }else{
            p.style.width=Math.max(300,availW)+'px';
        }
    }
    p.classList.add('sp-visible');
    _applyFontScale(getSettings().fontScale);
    spInjectTopBar(mode);
    syncThoughts();
    spUpdateFab();
    log('Panel shown, width:',p.style.width,'top:',p.style.top,'mode:',mode);
}
export function hidePanel(){
    const p=document.getElementById('sp-panel');if(!p)return;
    p.classList.remove('sp-visible');
    const tp=document.getElementById('sp-thought-panel');
    if(tp)tp.classList.remove('sp-tp-visible');
    closeDiffViewer(); // Close payload inspector when panel hides
    clearWeatherOverlay();
    clearTimeTint();
    spInjectTopBar(spDetectMode()); // Restore ST top bar on mobile
    spUpdateFab();
    log('Panel hidden');
}
export function syncThoughts(){
    const tp=document.getElementById('sp-thought-panel');if(!tp)return;
    const mode=spDetectMode();
    // No thought panel on mobile
    if(mode==='mobile'){tp.classList.remove('sp-tp-visible');return}
    const mainVisible=document.getElementById('sp-panel')?.classList.contains('sp-visible');
    const s=getSettings();
    if(mainVisible&&s.showThoughts!==false){
        const body=document.getElementById('sp-tp-body');
        if(body&&body.children.length>0)tp.classList.add('sp-tp-visible');
    }else{
        tp.classList.remove('sp-tp-visible');
    }
}

export function createPanel(){
    if(document.getElementById('sp-panel'))return;
    const panel=document.createElement('div');panel.id='sp-panel';
    panel.innerHTML=`
    <div class="sp-toolbar">
        <div class="sp-brand-icon-wrap" id="sp-brand-icon-wrap"><div class="sp-brand-icon" id="sp-brand-icon" title="ScenePulse v${VERSION}">${MASCOT_SVG}</div></div>
        <div class="sp-brand-title-wrap"><div class="sp-brand-title">Scene<span class="sp-brand-accent">Pulse</span></div><div class="sp-brand-subtitle" id="sp-brand-subtitle"></div></div>
        <span class="sp-toolbar-spacer"></span>
        <button class="sp-toolbar-btn" id="sp-tb-regen" title="${t('Regenerate all')}"><svg viewBox="0 0 16 16" width="15" height="15" fill="none"><path d="M13.5 8a5.5 5.5 0 1 1-1.3-3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M13.5 3v2.5h-2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <span class="sp-toolbar-sep"></span>
        <div class="sp-toolbar-group">
        <button class="sp-toolbar-btn" id="sp-tb-panels" title="${t('Panel Manager')}"><svg viewBox="0 0 16 16" width="15" height="15" fill="none"><rect x="1" y="2" width="6" height="4" rx="1" stroke="currentColor" stroke-width="1.1" opacity="0.6"/><rect x="9" y="2" width="6" height="4" rx="1" stroke="currentColor" stroke-width="1.1" opacity="0.6"/><rect x="1" y="8" width="6" height="4" rx="1" stroke="currentColor" stroke-width="1.1" fill="currentColor" opacity="0.15"/><rect x="9" y="8" width="6" height="4" rx="1" stroke="currentColor" stroke-width="1.1"/><line x1="3" y1="14" x2="13" y2="14" stroke="currentColor" stroke-width="1" opacity="0.25" stroke-linecap="round"/></svg></button>
        <button class="sp-toolbar-btn" id="sp-tb-wiki" title="${t('Character Wiki')}"><svg viewBox="0 0 16 16" width="15" height="15" fill="none"><path d="M2 2.5A1.5 1.5 0 0 1 3.5 1h3A1.5 1.5 0 0 1 8 2.5v11A1.5 1.5 0 0 0 6.5 12h-3A1.5 1.5 0 0 1 2 10.5v-8z" stroke="currentColor" stroke-width="1.1"/><path d="M14 2.5A1.5 1.5 0 0 0 12.5 1h-3A1.5 1.5 0 0 0 8 2.5v11A1.5 1.5 0 0 1 9.5 12h3a1.5 1.5 0 0 0 1.5-1.5v-8z" stroke="currentColor" stroke-width="1.1"/><line x1="4.5" y1="4" x2="6" y2="4" stroke="currentColor" stroke-width="0.8" opacity="0.4"/><line x1="4.5" y1="6" x2="6" y2="6" stroke="currentColor" stroke-width="0.8" opacity="0.4"/><line x1="10" y1="4" x2="11.5" y2="4" stroke="currentColor" stroke-width="0.8" opacity="0.4"/><line x1="10" y1="6" x2="11.5" y2="6" stroke="currentColor" stroke-width="0.8" opacity="0.4"/></svg></button>
        <button class="sp-toolbar-btn" id="sp-tb-toggle" title="${t('Expand/Collapse sections')}"><svg viewBox="0 0 16 16" width="15" height="15" fill="none"><rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/><rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/><rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/><rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/></svg></button>
        <button class="sp-toolbar-btn" id="sp-tb-compact" title="${t('Condense view')}"><svg viewBox="0 0 16 16" width="15" height="15" fill="none"><rect x="2" y="2" width="12" height="2.5" rx="1" fill="currentColor" opacity="0.3"/><rect x="2" y="6" width="9" height="2" rx="0.8" fill="currentColor" opacity="0.2"/><rect x="2" y="9.5" width="11" height="2" rx="0.8" fill="currentColor" opacity="0.15"/><rect x="2" y="13" width="7" height="1.5" rx="0.7" fill="currentColor" opacity="0.1"/><path d="M14 5.5L14 12" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.3"/><path d="M12.5 7l1.5-1.5L15.5 7" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round" opacity="0.4"/><path d="M12.5 10.5l1.5 1.5 1.5-1.5" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round" opacity="0.4"/></svg></button>
        </div>
        <div class="sp-toolbar-group">
        <div class="sp-feat-wrap" id="sp-feat-wrap">
            <button class="sp-toolbar-btn sp-tb-active" id="sp-tb-features" title="${t('Feature toggles')}"><svg viewBox="0 0 16 16" width="15" height="15" fill="none"><path d="M8 1.5l1.1 2.3 2.5.4-1.8 1.8.4 2.5L8 7.2 5.8 8.5l.4-2.5L4.4 4.2l2.5-.4z" stroke="currentColor" stroke-width="1.1" fill="currentColor" opacity="0.15"/><path d="M3 11h10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/><path d="M4 13.5h8" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.3"/></svg><span class="sp-feat-badge" id="sp-feat-badge"></span></button>
            <div class="sp-feat-dropdown" id="sp-feat-dropdown">
                <label class="sp-feat-item" id="sp-feat-thoughts"><input type="checkbox" id="sp-tb-thoughts" checked><svg viewBox="0 0 16 16" width="14" height="14" fill="none"><path d="M2 9.5c0 1.5 1.5 3 4 3l2 2v-2c2.5 0 4-1.5 4-3V6c0-1.5-1.5-3-4-3H6C3.5 3 2 4.5 2 6v3.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" fill="currentColor" opacity="0.15"/><circle cx="5.5" cy="7.2" r="0.8" fill="currentColor" opacity="0.6"/><circle cx="8" cy="7.2" r="0.8" fill="currentColor" opacity="0.6"/><circle cx="10.5" cy="7.2" r="0.8" fill="currentColor" opacity="0.6"/></svg><span>${t('Thoughts')}</span></label>
                <label class="sp-feat-item" id="sp-feat-weather"><input type="checkbox" id="sp-tb-weather" checked><svg viewBox="0 0 16 16" width="14" height="14" fill="none"><path d="M4.5 11.5c-2 0-3.5-1.2-3.5-3 0-1.4 1-2.6 2.4-3C4 2.8 6.2 1 9 1c2.6 0 4.8 1.8 5 4 1.5.3 2.5 1.4 2.5 2.8 0 1.7-1.5 3-3.2 3H4.5z" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg><span>${t('Weather')}</span></label>
                <label class="sp-feat-item" id="sp-feat-timetint"><input type="checkbox" id="sp-tb-timeTint" checked><svg viewBox="0 0 16 16" width="14" height="14" fill="none"><circle cx="8" cy="8" r="3" fill="currentColor" opacity="0.25" stroke="currentColor" stroke-width="1.2"/><line x1="8" y1="1.5" x2="8" y2="3.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/><line x1="8" y1="12.5" x2="8" y2="14.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/><line x1="1.5" y1="8" x2="3.5" y2="8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/><line x1="12.5" y1="8" x2="14.5" y2="8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/></svg><span>${t('Time Tint')}</span></label>
                <label class="sp-feat-item" id="sp-feat-scenetrans"><input type="checkbox" id="sp-tb-sceneTrans" checked><svg viewBox="0 0 16 16" width="14" height="14" fill="none"><path d="M2 12V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z" stroke="currentColor" stroke-width="1.1" fill="currentColor" opacity="0.08"/><path d="M5 8h6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/><path d="M9.5 5.5L12 8l-2.5 2.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>${t('Scene Transitions')}</span></label>
            </div>
        </div>
        <button class="sp-toolbar-btn" id="sp-tb-edit" title="${t('Toggle edit mode')}"><svg viewBox="0 0 16 16" width="15" height="15" fill="none"><path d="M11.5 1.5l3 3-8.5 8.5H3v-3l8.5-8.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><line x1="9.5" y1="3.5" x2="12.5" y2="6.5" stroke="currentColor" stroke-width="0.8" opacity="0.4"/><line x1="3" y1="14.5" x2="13" y2="14.5" stroke="currentColor" stroke-width="1" opacity="0.3" stroke-linecap="round"/></svg></button>
        <button class="sp-toolbar-btn" id="sp-tb-empty" title="${t('Show empty fields')}"><svg viewBox="0 0 16 16" width="15" height="15" fill="none"><rect x="2" y="3" width="12" height="2" rx="0.8" stroke="currentColor" stroke-width="1" opacity="0.6"/><rect x="2" y="7" width="12" height="2" rx="0.8" stroke="currentColor" stroke-width="1" opacity="0.3" stroke-dasharray="2 1.5"/><rect x="2" y="11" width="12" height="2" rx="0.8" stroke="currentColor" stroke-width="1" opacity="0.6"/></svg></button>
        </div>
        <div class="sp-dev-wrap" id="sp-dev-wx-wrap" style="display:none"><button class="sp-toolbar-btn sp-tb-dev" id="sp-tb-dev-wx" title="DEV: Weather overlays"><svg viewBox="0 0 16 16" width="15" height="15" fill="none"><path d="M4 12c-1.8 0-3-1-3-2.5S2 7.5 3.5 7C4 4.5 6 3 8.5 3c2.2 0 4 1.5 4.2 3.5C14 6.8 15 8 15 9.5S13.5 12 12 12z" stroke="currentColor" stroke-width="1.1" fill="currentColor" opacity="0.15"/><path d="M6 8l2-3 2 3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/><line x1="8" y1="8" x2="8" y2="13" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.6"/></svg></button><div class="sp-dev-dropdown" id="sp-dev-wx-menu"></div></div>
        <div class="sp-dev-wrap" id="sp-dev-time-wrap" style="display:none"><button class="sp-toolbar-btn sp-tb-dev" id="sp-tb-dev-time" title="DEV: Time-of-day tints"><svg viewBox="0 0 16 16" width="15" height="15" fill="none"><circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1.2"/><line x1="8" y1="8" x2="8" y2="4.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="8" y1="8" x2="11" y2="9.5" stroke="currentColor" stroke-width="1" stroke-linecap="round"/><circle cx="8" cy="8" r="0.8" fill="currentColor"/></svg></button><div class="sp-dev-dropdown" id="sp-dev-time-menu"></div></div>
        <button class="sp-toolbar-btn" id="sp-tb-minimize" title="${t('Hide panel')}" style="display:none"><svg viewBox="0 0 16 16" width="15" height="15" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><line x1="2" y1="13" x2="14" y2="13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity="0.4"/></svg></button>
    </div>
    <div id="sp-panel-body"><div class="sp-empty-state"><div class="sp-empty-icon">\uD83D\uDCE1</div><div class="sp-empty-title">${t('No scene data yet')}</div><div class="sp-empty-sub">${t('Send a message or click ⟳ to generate.')}</div></div></div>`;
    document.body.appendChild(panel);
    log('Panel appended to body');

    // ── Mobile FAB (floating action button to restore panel) ──
    if(!document.getElementById('sp-mobile-fab')){
        const fab=document.createElement('button');fab.id='sp-mobile-fab';fab.className='sp-mobile-fab';
        fab.title=t('Show ScenePulse');fab.innerHTML=MASCOT_SVG;
        fab.addEventListener('click',spRestorePanel);
        document.body.appendChild(fab);
    }
    // ── Minimize button handler ──
    document.getElementById('sp-tb-minimize').addEventListener('click',spMinimizePanel);
    // Initial mode detection -- shows FAB on mobile/tablet if panel isn't visible yet
    setTimeout(()=>spApplyMode(),100);
    // Recalculate panel width on resize + apply mode (throttled)
    let _resizeTimer=null;
    window.addEventListener('resize',()=>{
        if(_resizeTimer)return;
        _resizeTimer=setTimeout(()=>{_resizeTimer=null;const p=document.getElementById('sp-panel');if(p?.classList.contains('sp-visible'))showPanel();spApplyMode()},100);
    });

    // Easter egg: click the icon for a surprise spin
    let eggClicks=0;
    document.getElementById('sp-brand-icon').addEventListener('click',()=>{
        eggClicks++;
        const icon=document.getElementById('sp-brand-icon');
        icon.classList.add('sp-egg-spin');
        setTimeout(()=>icon.classList.remove('sp-egg-spin'),800);
        if(eggClicks>=5){eggClicks=0;icon.classList.add('sp-egg-rainbow');setTimeout(()=>icon.classList.remove('sp-egg-rainbow'),3000)}
    });
    document.getElementById('sp-tb-regen').addEventListener('click',async()=>{
        if(generating){toastr.warning('Generation already in progress');return}
        const{chat}=SillyTavern.getContext();if(!chat.length)return;
        const body=document.getElementById('sp-panel-body');
        showLoadingOverlay(body,t('Generating Scene'),t('Analyzing context'));
        setLastGenSource('manual:full');
        showStopButton();startElapsedTimer();
        // Manual regen always shows thought panel
        const tp=document.getElementById('sp-thought-panel');
        const st=getSettings();
        st.showThoughts=true;saveSettings();
        // Sync UI
        const tbBtn=document.getElementById('sp-tb-thoughts');if(tbBtn)tbBtn.checked=true;_updateFeatBadge();
        const cb=document.getElementById('sp-show-thoughts');if(cb)cb.checked=true;
        if(tp){
            tp.classList.add('sp-tp-visible');
            showThoughtLoading(t('Generating Scene'),t('Analyzing context'));
        }
        const preNonce=genNonce;
        const result=await generateTracker(chat.length-1);
        // If nonce changed beyond our generation, cancel already handled UI -- bail
        if(genNonce>preNonce+1){log('Toolbar regen: stale caller, cancel handled UI');return}
        hideStopButton();stopElapsedTimer();
        clearLoadingOverlay(body);clearThoughtLoading();
        if(!result){
            const snap=getLatestSnapshot();
            if(snap){const norm=normalizeTracker(snap);updatePanel(norm)}
            else body.innerHTML='<div class="sp-empty-state"><div class="sp-empty-icon">\u27F3</div><div class="sp-empty-title">'+t('No scene data yet')+'</div><div class="sp-empty-sub">'+t('Send a message or click ⟳ to generate.')+'</div></div>';
        }
    });
    document.getElementById('sp-tb-toggle').addEventListener('click',()=>{
        const secs=document.querySelectorAll('#sp-panel-body .sp-section');
        const anyOpen=Array.from(secs).some(s=>s.classList.contains('sp-open'));
        const st=getSettings();if(!st.openSections)st.openSections={};
        secs.forEach(s=>{
            if(anyOpen)s.classList.remove('sp-open');else s.classList.add('sp-open');
            const k=s.dataset.key;if(k)st.openSections[k]=!anyOpen;
        });
        saveSettings();
    });
    // Features dropdown toggle
    const _featBtn=document.getElementById('sp-tb-features');
    const _featDrop=document.getElementById('sp-feat-dropdown');
    const _updateFeatBadge=()=>updateFeatBadge();
    _featBtn.addEventListener('click',e=>{e.stopPropagation();_featDrop.classList.toggle('sp-feat-open')});
    _featDrop.addEventListener('click',e=>e.stopPropagation());
    document.addEventListener('click',()=>_featDrop.classList.remove('sp-feat-open'));
    // Thoughts toggle
    document.getElementById('sp-tb-thoughts').addEventListener('change',(e)=>{
        const s=getSettings();s.showThoughts=e.target.checked;saveSettings();
        syncThoughts();_updateFeatBadge();
        const cb=document.getElementById('sp-show-thoughts');if(cb)cb.checked=s.showThoughts;
    });
    // Edit mode toggle
    document.getElementById('sp-tb-edit').addEventListener('click',()=>{
        const p=document.getElementById('sp-panel');if(!p)return;
        const isEdit=p.classList.toggle('sp-edit-mode');
        document.getElementById('sp-tb-edit').classList.toggle('sp-tb-active',isEdit);
        if(isEdit)toastr.info(t('Click any highlighted field to edit'),t('Edit Mode On'));
        else toastr.info(t('Edit Mode Off'),t('Edit Mode Off'));
        log('Edit mode:',isEdit);
    });
    // Show empty fields toggle
    document.getElementById('sp-tb-empty').addEventListener('click',()=>{
        const p=document.getElementById('sp-panel');if(!p)return;
        const show=p.classList.toggle('sp-show-empty');
        document.getElementById('sp-tb-empty').classList.toggle('sp-tb-active',show);
        const st=getSettings();st.showEmptyFields=show;saveSettings();
        // Re-render panel so DOM-conditional sections (fertility) update
        const snap=getLatestSnapshot();if(snap){updatePanel(normalizeTracker(snap),true)}
        log('Show empty fields:',show);
    });
    // Compact/Focus toggle
    document.getElementById('sp-tb-compact').addEventListener('click',()=>{
        const p=document.getElementById('sp-panel');if(!p)return;
        const isCompact=p.classList.toggle('sp-compact');
        const btn=document.getElementById('sp-tb-compact');
        btn.classList.toggle('sp-tb-active',isCompact);
        // Track user-initiated compact so auto-condense doesn't override
        p.dataset.spUserCompact=isCompact?'true':'false';
        delete p.dataset.spAutoCompact;
        // Recalculate width -- compact uses less space
        if(isCompact){
            p.style.width=Math.max(240,Math.min(Math.round(window.innerWidth*0.22),280))+'px';
        }else{
            const sheld=document.getElementById('sheld');
            if(sheld)p.style.width=Math.max(300,window.innerWidth-sheld.getBoundingClientRect().right)+'px';
        }
        log('Compact:',isCompact);
    });
    // Character Wiki
    document.getElementById('sp-tb-wiki').addEventListener('click',()=>{
        import('./character-wiki.js').then(m=>m.openCharacterWiki()).catch(e=>{warn('Wiki:',e)});
    });
    // Panel Manager toggle
    document.getElementById('sp-tb-panels').addEventListener('click',()=>{
        const body=document.getElementById('sp-panel-body');if(!body)return;
        const btn=document.getElementById('sp-tb-panels');
        let mgr=document.getElementById('sp-panel-mgr');
        const closeMgr=()=>{
            if(!mgr)return;
            mgr.classList.add('sp-mgr-closing');
            setTimeout(()=>{if(mgr?.parentNode)mgr.remove()},350);
            btn.classList.remove('sp-tb-active');
        };
        if(mgr){closeMgr();return}
        btn.classList.add('sp-tb-active');
        try {
        mgr=document.createElement('div');mgr.id='sp-panel-mgr';mgr.className='sp-panel-mgr sp-mgr-closing';
        const s=getSettings();
        mgr.innerHTML=`<div class="sp-mgr-header"><span class="sp-mgr-title">${t('Panel Manager')}</span><button class="sp-mgr-close" title="${t('Close')}">\u2715</button></div><div class="sp-mgr-hint">Toggle panels on/off. Disabled panels are excluded from the LLM prompt.</div>`;
        mgr.querySelector('.sp-mgr-close').addEventListener('click',closeMgr);
        // Built-in panel toggles -- collapsible
        const builtinWrap=document.createElement('div');builtinWrap.className='sp-mgr-collapsible';
        const builtinHeader=document.createElement('div');builtinHeader.className='sp-mgr-collapse-header';
        builtinHeader.innerHTML=`<span class="sp-mgr-collapse-arrow">\u25B8</span><span class="sp-mgr-collapse-label">Built-in Panels</span><span class="sp-mgr-collapse-count">${Object.values(s.panels||DEFAULTS.panels).filter(v=>v!==false).length}/${Object.keys(BUILTIN_PANELS).length}</span>`;
        const togglesDiv=document.createElement('div');togglesDiv.className='sp-mgr-toggles sp-mgr-collapsed';
        builtinHeader.addEventListener('click',()=>{
            const collapsed=togglesDiv.classList.toggle('sp-mgr-collapsed');
            builtinHeader.querySelector('.sp-mgr-collapse-arrow').textContent=collapsed?'\u25B8':'\u25BE';
        });
        for(const[id,def] of Object.entries(BUILTIN_PANELS)){
            const panels=s.panels||{...DEFAULTS.panels};
            const row=document.createElement('label');row.className='sp-mgr-toggle';
            row.innerHTML=`<input type="checkbox" data-panel="${esc(id)}" ${panels[id]!==false?'checked':''}><span class="sp-mgr-toggle-name">${esc(def.name)}</span>`;
            const cb=row.querySelector('input');
            cb.addEventListener('change',()=>{
                if(!s.panels)s.panels={...DEFAULTS.panels};
                s.panels[cb.dataset.panel]=cb.checked;
                saveSettings();
                const sectionMap={dashboard:'.sp-env-permanent',scene:'[data-key="scene"]',quests:'[data-key="quests"]',relationships:'[data-key="relationships"]',characters:'[data-key="characters"]',storyIdeas:'[data-key="branches"]'};
                const sel=sectionMap[cb.dataset.panel];
                if(sel){const el=body.querySelector(sel);if(el){if(cb.checked)el.classList.remove('sp-panel-hidden');else el.classList.add('sp-panel-hidden')}}
                const count=Object.values(s.panels).filter(v=>v!==false).length;
                builtinHeader.querySelector('.sp-mgr-collapse-count').textContent=count+'/'+Object.keys(BUILTIN_PANELS).length;
                // Grey out sub-toggles when panel disabled; re-enable all sub-fields when panel enabled
                const nextSub=row.nextElementSibling;
                if(nextSub?.classList.contains('sp-mgr-sub-toggles')){
                    nextSub.classList.toggle('sp-mgr-sub-disabled',!cb.checked);
                    if(cb.checked){
                        // Re-enable all sub-fields for this panel
                        const panelDef=BUILTIN_PANELS[cb.dataset.panel];
                        if(panelDef){
                            if(!s.fieldToggles)s.fieldToggles={};
                            for(const f of panelDef.fields)if(!f.noToggle){s.fieldToggles[f.key]=true}
                            for(const sf of(panelDef.subFields||[]))s.fieldToggles[sf.key]=true;
                            if(cb.dataset.panel==='dashboard'){
                                if(!s.dashCards)s.dashCards={...DEFAULTS.dashCards};
                                for(const k of Object.keys(DEFAULTS.dashCards))s.dashCards[k]=true;
                            }
                        }
                        nextSub.querySelectorAll('input').forEach(i=>{i.disabled=false;i.checked=true});
                        // Apply visibility
                        body.querySelectorAll('[data-ft]').forEach(el=>{
                            const k=el.dataset.ft;
                            if(s.fieldToggles[k]!==false)el.style.display='';
                        });
                        saveSettings();
                    } else {
                        nextSub.querySelectorAll('input').forEach(i=>{i.disabled=true});
                    }
                }
                const schemaEl=document.getElementById('sp-schema');
                if(schemaEl&&!getActiveProfile(s).schema)schemaEl.value=JSON.stringify(buildDynamicSchema(s),null,2);
                // Sync toolbar icons: hide/dim when panel disabled
                if(cb.dataset.panel==='dashboard'){
                    const wxItem=document.getElementById('sp-feat-weather');
                    const ttItem=document.getElementById('sp-feat-timetint');
                    if(wxItem)wxItem.classList.toggle('sp-feat-disabled',!cb.checked);
                    if(ttItem)ttItem.classList.toggle('sp-feat-disabled',!cb.checked);
                }
                log('Panel toggled:',cb.dataset.panel,'\u2192',cb.checked);
            });
            togglesDiv.appendChild(row);
            // Sub-toggles for fields + subFields in this panel
            const allSubs=[...def.fields.filter(f=>!f.noToggle).map(f=>({...f,isDashCard:!!f.dashCard,isSub:false})),...(def.subFields||[]).map(sf=>({...sf,isDashCard:false,isSub:true}))];
            if(allSubs.length>=1){
                const subWrap=document.createElement('div');subWrap.className='sp-mgr-sub-toggles';
                const dc=s.dashCards||{...DEFAULTS.dashCards};
                const ft=s.fieldToggles||{};
                for(const f of allSubs){
                    const fKey=f.key;const fLabel=f.label||f.key;
                    const isOn=f.isDashCard?(dc[f.dashCard]!==false):(ft[fKey]!==false);
                    const sub=document.createElement('label');sub.className='sp-mgr-sub-toggle';
                    sub.innerHTML=`<input type="checkbox" ${isOn?'checked':''}><span>${esc(fLabel)}</span>`;
                    const scb=sub.querySelector('input');
                    scb.addEventListener('change',()=>{
                        if(f.isDashCard){
                            if(!s.dashCards)s.dashCards={...DEFAULTS.dashCards};
                            s.dashCards[f.dashCard]=scb.checked;
                            const card=body.querySelector(`[data-card="${f.dashCard}"]`);
                            if(card)card.style.display=scb.checked?'':'none';
                            // Sync toolbar buttons
                            if(f.dashCard==='weather'){
                                const wxCb=document.getElementById('sp-tb-weather');
                                const wxItem=document.getElementById('sp-feat-weather');
                                if(wxItem)wxItem.classList.toggle('sp-feat-disabled',!scb.checked);
                                if(scb.checked&&s.weatherOverlay===false){
                                    s.weatherOverlay=true;if(wxCb)wxCb.checked=true;
                                    const snap=getLatestSnapshot();if(snap)updateWeatherOverlay(normalizeTracker(snap).weather);
                                }
                                if(!scb.checked){s.weatherOverlay=false;clearWeatherOverlay();if(wxCb)wxCb.checked=false}
                                _updateFeatBadge();
                            }
                            if(f.dashCard==='time'){
                                const ttCb=document.getElementById('sp-tb-timeTint');
                                const ttItem=document.getElementById('sp-feat-timetint');
                                if(ttItem)ttItem.classList.toggle('sp-feat-disabled',!scb.checked);
                                if(scb.checked&&!s.timeTint){
                                    s.timeTint=true;if(ttCb)ttCb.checked=true;
                                    const snap=getLatestSnapshot();if(snap)updateTimeTint(normalizeTracker(snap).time);
                                }
                                if(!scb.checked){s.timeTint=false;clearTimeTint();if(ttCb)ttCb.checked=false}
                                _updateFeatBadge();
                            }
                        } else {
                            if(!s.fieldToggles)s.fieldToggles={};
                            s.fieldToggles[fKey]=scb.checked;
                            // CSS-only toggle -- zero rebuilds
                            body.querySelectorAll(`[data-ft="${fKey}"]`).forEach(el=>{el.style.display=scb.checked?'':'none'});
                            // char_innerThought controls the floating thoughts panel
                            if(fKey==='char_innerThought'){
                                s.showThoughts=scb.checked;
                                const tp=document.getElementById('sp-thought-panel');
                                const thCb=document.getElementById('sp-tb-thoughts');
                                const thItem=document.getElementById('sp-feat-thoughts');
                                if(!scb.checked){
                                    if(tp)tp.classList.remove('sp-tp-visible');
                                    if(thCb)thCb.checked=false;
                                    if(thItem)thItem.classList.add('sp-feat-disabled');
                                } else {
                                    if(thCb)thCb.checked=true;
                                    if(thItem)thItem.classList.remove('sp-feat-disabled');
                                    const snap=getLatestSnapshot();if(snap)updateThoughts(normalizeTracker(snap));
                                    if(tp)tp.classList.add('sp-tp-visible');
                                }
                                _updateFeatBadge();
                                const settingsCb=document.getElementById('sp-show-thoughts');
                                if(settingsCb)settingsCb.checked=scb.checked;
                            }
                        }
                        saveSettings();
                        const schemaEl=document.getElementById('sp-schema');
                        if(schemaEl&&!getActiveProfile(s).schema)schemaEl.value=JSON.stringify(buildDynamicSchema(s),null,2);
                        log((f.isDashCard?'DashCard':f.isSub?'SubField':'Field')+' toggled:',fKey,'\u2192',scb.checked);
                    });
                    subWrap.appendChild(sub);
                    if(f.dashCard==='weather'){
                        const wxHint=document.createElement('div');wxHint.className='sp-mgr-hint-tip';
                        wxHint.dataset.hintTarget='sp-tb-features';
                        wxHint.textContent='\u2139 Weather overlay is off \u2014 enable it in Features for visual effects.';
                        const wxOn=()=>dc.weather!==false&&s.weatherOverlay===false;
                        wxHint.style.display=wxOn()?'':'none';
                        wxHint.addEventListener('mouseenter',()=>{const t=document.getElementById(wxHint.dataset.hintTarget);if(t)t.classList.add('sp-tb-glow')});
                        wxHint.addEventListener('mouseleave',()=>{const t=document.getElementById(wxHint.dataset.hintTarget);if(t)t.classList.remove('sp-tb-glow')});
                        subWrap.appendChild(wxHint);
                        // Update hint on toggle
                        scb.addEventListener('change',()=>{wxHint.style.display=wxOn()?'':'none'});
                    }
                }
                togglesDiv.appendChild(subWrap);
                if(panels[id]===false){
                    subWrap.classList.add('sp-mgr-sub-disabled');
                    subWrap.querySelectorAll('input').forEach(i=>{i.disabled=true});
                }
            }
        }
        builtinWrap.appendChild(builtinHeader);builtinWrap.appendChild(togglesDiv);
        // Enable/Disable All buttons + performance warning
        const enableAllRow=document.createElement('div');enableAllRow.className='sp-mgr-enable-all';
        const btnRow=document.createElement('div');btnRow.className='sp-mgr-btn-row';
        const enableAllBtn=document.createElement('button');enableAllBtn.className='sp-mgr-enable-btn sp-mgr-btn-enable';enableAllBtn.textContent=t('Enable All');
        const disableAllBtn=document.createElement('button');disableAllBtn.className='sp-mgr-enable-btn sp-mgr-btn-disable';disableAllBtn.textContent=t('Disable All');
        // State check helpers
        function checkAllState(){
            const p=s.panels||DEFAULTS.panels;const dc=s.dashCards||DEFAULTS.dashCards;const ft=s.fieldToggles||{};
            let allOn=true,allOff=true;
            for(const pid of Object.keys(BUILTIN_PANELS)){if(p[pid]===false)allOn=false;else allOff=false}
            for(const k of Object.keys(DEFAULTS.dashCards)){if(dc[k]===false)allOn=false;else allOff=false}
            for(const[,def] of Object.entries(BUILTIN_PANELS)){
                for(const f of def.fields)if(!f.noToggle){if(ft[f.key]===false)allOn=false;else allOff=false}
                for(const sf of(def.subFields||[])){if(ft[sf.key]===false)allOn=false;else allOff=false}
            }
            enableAllBtn.disabled=allOn;enableAllBtn.classList.toggle('sp-mgr-btn-dimmed',allOn);
            disableAllBtn.disabled=allOff;disableAllBtn.classList.toggle('sp-mgr-btn-dimmed',allOff);
        }
        enableAllBtn.addEventListener('click',()=>{
            if(!s.panels)s.panels={...DEFAULTS.panels};
            for(const pid of Object.keys(BUILTIN_PANELS))s.panels[pid]=true;
            if(!s.fieldToggles)s.fieldToggles={};
            for(const[,def] of Object.entries(BUILTIN_PANELS)){
                for(const f of def.fields)if(!f.noToggle)s.fieldToggles[f.key]=true;
                for(const sf of(def.subFields||[]))s.fieldToggles[sf.key]=true;
            }
            if(!s.dashCards)s.dashCards={...DEFAULTS.dashCards};
            for(const k of Object.keys(DEFAULTS.dashCards))s.dashCards[k]=true;
            s.showThoughts=true;
            saveSettings();
            togglesDiv.querySelectorAll('input[data-panel]').forEach(cb=>{cb.checked=true});
            togglesDiv.querySelectorAll('.sp-mgr-sub-toggle input').forEach(cb=>{cb.checked=true;cb.disabled=false});
            togglesDiv.querySelectorAll('.sp-mgr-sub-toggles').forEach(sw=>{sw.classList.remove('sp-mgr-sub-disabled')});
            body.querySelectorAll('.sp-panel-hidden').forEach(el=>el.classList.remove('sp-panel-hidden'));
            body.querySelectorAll('[data-ft]').forEach(el=>{el.style.display=''});
            body.querySelectorAll('[data-card]').forEach(el=>{el.style.display=''});
            for(const bid of['sp-tb-weather','sp-tb-timeTint','sp-tb-thoughts','sp-tb-sceneTrans']){
                const b=document.getElementById(bid);if(b)b.checked=true;
            }
            for(const fid of['sp-feat-weather','sp-feat-timetint','sp-feat-thoughts','sp-feat-scenetrans']){
                const fi=document.getElementById(fid);if(fi)fi.classList.remove('sp-feat-disabled');
            }
            s.weatherOverlay=true;s.timeTint=true;s.sceneTransitions=true;_updateFeatBadge();
            const snap=getLatestSnapshot();
            if(snap){const n=normalizeTracker(snap);updateWeatherOverlay(n.weather);updateTimeTint(n.time);updateThoughts(n);const tp=document.getElementById('sp-thought-panel');if(tp)tp.classList.add('sp-tp-visible')}
            builtinHeader.querySelector('.sp-mgr-collapse-count').textContent=Object.keys(BUILTIN_PANELS).length+'/'+Object.keys(BUILTIN_PANELS).length;
            const schemaEl=document.getElementById('sp-schema');
            if(schemaEl&&!getActiveProfile(s).schema)schemaEl.value=JSON.stringify(buildDynamicSchema(s),null,2);
            checkAllState();
            toastr.info('All panels and fields enabled','ScenePulse');
            log('Enable All: all panels + fields activated');
        });
        disableAllBtn.addEventListener('click',()=>{
            if(!s.panels)s.panels={...DEFAULTS.panels};
            for(const pid of Object.keys(BUILTIN_PANELS))s.panels[pid]=false;
            if(!s.fieldToggles)s.fieldToggles={};
            for(const[,def] of Object.entries(BUILTIN_PANELS)){
                for(const f of def.fields)if(!f.noToggle)s.fieldToggles[f.key]=false;
                for(const sf of(def.subFields||[]))s.fieldToggles[sf.key]=false;
            }
            if(!s.dashCards)s.dashCards={...DEFAULTS.dashCards};
            for(const k of Object.keys(DEFAULTS.dashCards))s.dashCards[k]=false;
            s.showThoughts=false;s.weatherOverlay=false;s.timeTint=false;
            saveSettings();
            togglesDiv.querySelectorAll('input[data-panel]').forEach(cb=>{cb.checked=false});
            togglesDiv.querySelectorAll('.sp-mgr-sub-toggle input').forEach(cb=>{cb.checked=false;cb.disabled=true});
            togglesDiv.querySelectorAll('.sp-mgr-sub-toggles').forEach(sw=>{sw.classList.add('sp-mgr-sub-disabled')});
            // Hide all panel sections
            const sectionMap={dashboard:'.sp-env-permanent',scene:'[data-key="scene"]',quests:'[data-key="quests"]',relationships:'[data-key="relationships"]',characters:'[data-key="characters"]',storyIdeas:'[data-key="branches"]'};
            for(const sel of Object.values(sectionMap)){const el=body.querySelector(sel);if(el)el.classList.add('sp-panel-hidden')}
            body.querySelectorAll('[data-ft]').forEach(el=>{el.style.display='none'});
            body.querySelectorAll('[data-card]').forEach(el=>{el.style.display='none'});
            // Disable overlays + toolbar buttons
            clearWeatherOverlay();clearTimeTint();
            const tp=document.getElementById('sp-thought-panel');if(tp)tp.classList.remove('sp-tp-visible');
            for(const bid of['sp-tb-weather','sp-tb-timeTint','sp-tb-thoughts','sp-tb-sceneTrans']){
                const b=document.getElementById(bid);if(b)b.checked=false;
            }
            for(const fid of['sp-feat-weather','sp-feat-timetint','sp-feat-thoughts','sp-feat-scenetrans']){
                const fi=document.getElementById(fid);if(fi)fi.classList.add('sp-feat-disabled');
            }
            s.sceneTransitions=false;_updateFeatBadge();
            builtinHeader.querySelector('.sp-mgr-collapse-count').textContent='0/'+Object.keys(BUILTIN_PANELS).length;
            const schemaEl=document.getElementById('sp-schema');
            if(schemaEl&&!getActiveProfile(s).schema)schemaEl.value=JSON.stringify(buildDynamicSchema(s),null,2);
            checkAllState();
            toastr.info('All panels disabled','ScenePulse');
            log('Disable All: all panels + fields deactivated');
        });
        btnRow.appendChild(enableAllBtn);btnRow.appendChild(disableAllBtn);
        enableAllRow.appendChild(btnRow);
        const enableWarn=document.createElement('div');enableWarn.className='sp-mgr-perf-warn';
        enableWarn.textContent='\u26A0 All panels enabled will add ~1,500\u20132,500 tokens to every generation. Expect up to 3 minutes per response depending on your model and provider.';
        enableAllRow.appendChild(enableWarn);
        builtinWrap.appendChild(enableAllRow);
        // Wire every toggle to refresh button state
        togglesDiv.addEventListener('change',()=>setTimeout(checkAllState,10));
        checkAllState();
        mgr.appendChild(builtinWrap);
        // Custom panels section
        const cpHeader=document.createElement('div');cpHeader.className='sp-mgr-subheader';cpHeader.textContent=t('Custom Panels');
        mgr.appendChild(cpHeader);
        const cpList=document.createElement('div');cpList.id='sp-panel-mgr-custom';
        mgr.appendChild(cpList);
        renderCustomPanelsMgr(s,cpList,body);
        const addBtn=document.createElement('button');addBtn.className='sp-btn sp-mgr-add-panel';addBtn.textContent=t('+ Add Custom Panel');
        addBtn.addEventListener('click',()=>{
            const _chatPanels=ensureChatPanels();
            const newPanel={id:'cp_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),name:'',fields:[{key:'',label:'',type:'text',desc:''}]};
            _chatPanels.push(newPanel);
            saveChatPanels();renderCustomPanelsMgr(s,cpList,body);
            // Insert just the new section -- no full rebuild
            const d=_cachedNormData||{};
            const cpKey='custom_'+(newPanel.name||'untitled').replace(/\s+/g,'_').toLowerCase();
            const newSec=mkSection(cpKey,newPanel.name||'Untitled',null,()=>{
                const frag=document.createDocumentFragment();
                for(const f of newPanel.fields){
                    const r=document.createElement('div');r.className='sp-row';
                    r.innerHTML=`<div class="sp-row-label">${esc(f.label||f.key)}</div>`;
                    const val=document.createElement('div');val.className='sp-row-value';val.textContent=str(d[f.key])||'\u2014';
                    r.appendChild(val);frag.appendChild(r);
                }
                return frag;
            },s);
            // Insert before timeline or at end of body
            const tl=document.getElementById('sp-timeline');
            if(tl)body.insertBefore(newSec,tl);
            else{const footer=body.querySelector('.sp-gen-footer');if(footer)body.insertBefore(newSec,footer);else body.appendChild(newSec)}
            newSec.classList.add('sp-panel-hidden');
            requestAnimationFrame(()=>newSec.classList.remove('sp-panel-hidden'));
            toastr.success('Panel created');
        });
        mgr.appendChild(addBtn);

        // v6.9.11: export/import + genre template buttons
        const cpActions=document.createElement('div');cpActions.className='sp-cp-actions';

        // Export panels
        const exportBtn=document.createElement('button');exportBtn.className='sp-btn sp-btn-sm';exportBtn.textContent='\u2913 '+t('Export Panels');
        exportBtn.addEventListener('click',()=>{
            const data=JSON.stringify(getActivePanels(s),null,2);
            const blob=new Blob([data],{type:'application/json'});
            const a=document.createElement('a');a.href=URL.createObjectURL(blob);
            a.download='scenepulse-panels.json';a.click();URL.revokeObjectURL(a.href);
            toastr.info('Panels exported');
        });
        cpActions.appendChild(exportBtn);

        // Import panels
        const importBtn=document.createElement('button');importBtn.className='sp-btn sp-btn-sm';importBtn.textContent='\u2912 '+t('Import Panels');
        importBtn.addEventListener('click',()=>{
            const input=document.createElement('input');input.type='file';input.accept='.json';
            input.addEventListener('change',async()=>{
                const file=input.files?.[0];if(!file)return;
                try{
                    const text=await file.text();
                    const imported=JSON.parse(text);
                    if(!Array.isArray(imported)){toastr.error('Invalid format — expected array of panels');return}
                    const _chatPanels=ensureChatPanels();
                    for(const p of imported){
                        if(!p||typeof p!=='object')continue;
                        const existing=_chatPanels.find(e=>e.name===p.name);
                        if(existing)p.name=(p.name||'Untitled')+' (imported)';
                        if(!p.id)p.id='cp_'+Date.now()+'_'+Math.random().toString(36).slice(2,6);
                        _chatPanels.push(p);
                    }
                    saveChatPanels();renderCustomPanelsMgr(s,cpList,body);
                    toastr.success(imported.length+' panel(s) imported');
                }catch(e){toastr.error('Import failed: '+e.message)}
            });
            input.click();
        });
        cpActions.appendChild(importBtn);

        // Genre template dropdown
        const tmplBtn=document.createElement('button');tmplBtn.className='sp-btn sp-btn-sm';tmplBtn.textContent='\u2606 '+t('From Template');
        const _TEMPLATES={
            'Fantasy RPG':[
                {key:'health',label:'Health',type:'meter',desc:"{{user}}'s hit points 0-100, reduced by damage"},
                {key:'mana',label:'Mana',type:'meter',desc:'Mana remaining after spellcasting, starts at 100'},
                {key:'stamina',label:'Stamina',type:'meter',desc:'Physical energy 0-100, reduced by exertion, restored by rest'},
                {key:'inventory',label:'Inventory',type:'list',desc:'Items {{user}} is carrying'},
            ],
            'Sci-Fi / Space Opera':[
                {key:'shield_integrity',label:'Shields',type:'meter',desc:'Shield strength 0-100, reduced by damage'},
                {key:'power_reserves',label:'Power',type:'meter',desc:'Ship/suit power 0-100, consumed by systems'},
                {key:'hull_status',label:'Hull',type:'meter',desc:'Structural integrity 0-100'},
                {key:'alert_level',label:'Alert',type:'enum',desc:'Ship or station alert level',options:['green','yellow','orange','red','critical']},
                {key:'systems',label:'Systems',type:'list',desc:'Active ship/suit systems and their status'},
            ],
            'Horror / Survival':[
                {key:'sanity',label:'Sanity',type:'meter',desc:"{{user}}'s mental stability 0-100, reduced by supernatural encounters"},
                {key:'dread',label:'Dread',type:'meter',desc:'Ambient fear level 0-100, raised by threats and the unknown'},
                {key:'condition',label:'Condition',type:'enum',desc:'Physical state',options:['healthy','bruised','wounded','critical','dying']},
                {key:'evidence',label:'Evidence',type:'list',desc:'Clues, evidence, and supernatural artifacts collected'},
            ],
            'Social / Modern Drama':[
                {key:'reputation',label:'Reputation',type:'meter',desc:"{{user}}'s social standing 0-100"},
                {key:'wealth',label:'Wealth',type:'enum',desc:'Financial status',options:['broke','poor','stable','comfortable','wealthy','rich']},
                {key:'influence',label:'Influence',type:'meter',desc:'Political/social power 0-100'},
                {key:'contacts',label:'Contacts',type:'list',desc:'Key contacts and allies {{user}} can call on'},
            ],
            'Superhero / Powers':[
                {key:'energy',label:'Energy',type:'meter',desc:'Power reserves 0-100, consumed by ability use'},
                {key:'secret_identity',label:'Cover',type:'meter',desc:'How intact {{user}}\'s secret identity is, 0=blown 100=secure'},
                {key:'powers',label:'Powers',type:'list',desc:'Active superpowers and their current state'},
                {key:'threat_level',label:'Threat',type:'enum',desc:'Current threat classification',options:['none','street','city','national','global','cosmic']},
            ],
            'Western / Frontier':[
                {key:'grit',label:'Grit',type:'meter',desc:'Toughness and determination 0-100'},
                {key:'notoriety',label:'Notoriety',type:'meter',desc:'How well-known {{user}} is, 0=unknown 100=legendary'},
                {key:'bounty',label:'Bounty',type:'number',desc:'Price on {{user}}\'s head in dollars, 0 if clean'},
                {key:'provisions',label:'Provisions',type:'list',desc:'Supplies, ammunition, and gear carried'},
            ],
            'Cyberpunk / Noir':[
                {key:'street_cred',label:'Street Cred',type:'meter',desc:'Underground reputation 0-100'},
                {key:'cyberware',label:'Cyberware',type:'list',desc:'Installed cybernetic augmentations'},
                {key:'heat',label:'Heat',type:'meter',desc:'Law enforcement attention 0-100, raised by crimes'},
                {key:'cash',label:'Cash',type:'number',desc:'Current liquid funds in credits/eddies'},
            ],
            'Medieval / Political':[
                {key:'honor',label:'Honor',type:'meter',desc:'Noble standing and personal honor 0-100'},
                {key:'loyalty',label:'Loyalty',type:'meter',desc:'Loyalty of vassals and allies 0-100'},
                {key:'treasury',label:'Treasury',type:'enum',desc:'State of coffers',options:['bankrupt','depleted','modest','comfortable','overflowing']},
                {key:'titles',label:'Titles',type:'list',desc:'Titles, lands, and offices held'},
            ],
            'Post-Apocalyptic':[
                {key:'radiation',label:'Radiation',type:'meter',desc:'Radiation exposure 0-100, higher is worse'},
                {key:'hunger',label:'Hunger',type:'meter',desc:'Starvation level 0-100, higher is more desperate'},
                {key:'shelter_status',label:'Shelter',type:'enum',desc:'Current shelter quality',options:['exposed','makeshift','scavenged','fortified','bunker']},
                {key:'salvage',label:'Salvage',type:'list',desc:'Scavenged materials, parts, and tradeable goods'},
            ],
            'School / Academy':[
                {key:'grades',label:'Grades',type:'enum',desc:'Academic performance',options:['failing','poor','average','good','honors','valedictorian']},
                {key:'popularity',label:'Popularity',type:'meter',desc:'Social standing among peers 0-100'},
                {key:'energy',label:'Energy',type:'meter',desc:'Mental/physical energy 0-100, reduced by study and activities'},
                {key:'clubs',label:'Clubs',type:'list',desc:'Clubs, teams, and extracurricular activities'},
            ],
            'Pirate / Nautical':[
                {key:'ship_condition',label:'Ship',type:'meter',desc:'Ship hull and rigging condition 0-100'},
                {key:'crew_morale',label:'Morale',type:'meter',desc:'Crew loyalty and morale 0-100'},
                {key:'plunder',label:'Plunder',type:'number',desc:'Total treasure in gold doubloons'},
                {key:'wanted_level',label:'Wanted',type:'enum',desc:'Bounty status with the Crown',options:['unknown','petty','wanted','hunted','kill_on_sight']},
            ],
            'Wuxia / Martial Arts':[
                {key:'qi',label:'Qi',type:'meter',desc:'Internal energy reserves 0-100, consumed by techniques'},
                {key:'cultivation',label:'Cultivation',type:'enum',desc:'Cultivation realm',options:['mortal','qi_condensation','foundation','core_formation','nascent_soul','transcendent']},
                {key:'techniques',label:'Techniques',type:'list',desc:'Martial arts and cultivation techniques known'},
                {key:'karma',label:'Karma',type:'meter',desc:'Karmic balance 0-100, 50=neutral, lower=darker path'},
            ],
            'Romance / Slice of Life':[
                {key:'mood',label:'Mood',type:'enum',desc:"{{user}}'s current emotional state",options:['calm','happy','anxious','angry','sad','lovestruck','embarrassed','determined']},
                {key:'energy',label:'Energy',type:'meter',desc:'Social/emotional energy 0-100'},
                {key:'diary',label:'Diary',type:'list',desc:'Key moments and memories from recent events'},
            ],
        };
        tmplBtn.addEventListener('click',()=>{
            // Toggle: if menu already open, close it
            const existing=document.querySelector('.sp-cp-tmpl-menu');
            if(existing){existing.remove();return}
            // Build dropdown
            const menu=document.createElement('div');menu.className='sp-cp-tmpl-menu';
            for(const[name,fields]of Object.entries(_TEMPLATES)){
                const item=document.createElement('div');item.className='sp-cp-tmpl-item';item.textContent=name;
                item.addEventListener('click',()=>{
                    const _chatPanels=ensureChatPanels();
                    _chatPanels.push({id:'cp_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),name,enabled:true,fields:JSON.parse(JSON.stringify(fields))});
                    saveChatPanels();renderCustomPanelsMgr(s,cpList,body);
                    menu.remove();toastr.success(name+' template added');
                });
                menu.appendChild(item);
            }
            // Position the menu using fixed positioning so it's never
            // clipped by the Panel Manager's overflow. Place above the
            // button if there's room, otherwise below.
            document.body.appendChild(menu);
            const _btnRect=tmplBtn.getBoundingClientRect();
            const _menuH=Math.min(320, Object.keys(_TEMPLATES).length*36+8);
            if(_btnRect.top-_menuH-4>8){
                menu.style.bottom=(window.innerHeight-_btnRect.top+4)+'px';
                menu.style.right=(window.innerWidth-_btnRect.right)+'px';
            }else{
                menu.style.top=(_btnRect.bottom+4)+'px';
                menu.style.right=(window.innerWidth-_btnRect.right)+'px';
            }
            const dismiss=e=>{if(!menu.contains(e.target)&&e.target!==tmplBtn){menu.remove();document.removeEventListener('click',dismiss)}};
            setTimeout(()=>document.addEventListener('click',dismiss),0);
        });
        cpActions.appendChild(tmplBtn);
        mgr.appendChild(cpActions);

        body.insertBefore(mgr,body.firstChild);
        } catch(e) { console.error('[ScenePulse] Panel Manager failed to open:', e); btn.classList.remove('sp-tb-active'); }
        // Sync feature dropdown with current dashCard/thoughts state
        const _dc2=s.dashCards||DEFAULTS.dashCards;const _ft2=s.fieldToggles||{};
        const wxItem=document.getElementById('sp-feat-weather');
        if(wxItem&&_dc2.weather===false)wxItem.classList.add('sp-feat-disabled');
        const ttItem=document.getElementById('sp-feat-timetint');
        if(ttItem&&_dc2.time===false)ttItem.classList.add('sp-feat-disabled');
        const thItem=document.getElementById('sp-feat-thoughts');
        if(thItem&&(_ft2.char_innerThought===false||s.showThoughts===false))thItem.classList.add('sp-feat-disabled');
        // Trigger open transition: start from closing state, remove in next frame
        requestAnimationFrame(()=>requestAnimationFrame(()=>mgr.classList.remove('sp-mgr-closing')));
    });
    // Weather overlay toggle
    document.getElementById('sp-tb-weather').addEventListener('change',(e)=>{
        const s=getSettings();s.weatherOverlay=e.target.checked;saveSettings();
        if(!e.target.checked){clearWeatherOverlay()}
        else{const snap=getLatestSnapshot();if(snap){const n=normalizeTracker(snap);updateWeatherOverlay(n.weather)}}
        _updateFeatBadge();
        const cb=document.getElementById('sp-show-weather');if(cb)cb.checked=e.target.checked;
    });
    // Time-of-day tint toggle
    document.getElementById('sp-tb-timeTint').addEventListener('change',(e)=>{
        const s=getSettings();s.timeTint=e.target.checked;saveSettings();
        if(!e.target.checked){clearTimeTint()}
        else{const snap=getLatestSnapshot();if(snap){const n=normalizeTracker(snap);updateTimeTint(n.time)}}
        _updateFeatBadge();
        const cb=document.getElementById('sp-show-timetint');if(cb)cb.checked=e.target.checked;
    });
    // Scene transition popup toggle
    document.getElementById('sp-tb-sceneTrans').addEventListener('change',(e)=>{
        const s=getSettings();s.sceneTransitions=e.target.checked;saveSettings();
        _updateFeatBadge();
    });

    // ── DEV: Weather overlay dropdown ──
    const _devWxTypes=[
        {id:'rain',label:'Rain'},{id:'snow',label:'Snow'},{id:'hail',label:'Hail'},
        {id:'storm',label:'Storm'},{id:'fog',label:'Fog / Mist'},{id:'sandstorm',label:'Sandstorm'},
        {id:'ash',label:'Ash / Volcanic'},{id:'wind',label:'Wind'},{id:'aurora',label:'Aurora'},
        {id:'off',label:'\u23F9 Clear overlay'}
    ];
    const _devWxMenu=document.getElementById('sp-dev-wx-menu');
    _devWxTypes.forEach(wt=>{
        const item=document.createElement('div');item.className='sp-dev-dropdown-item';item.dataset.id=wt.id;item.textContent=wt.label;
        item.addEventListener('click',()=>{
            if(wt.id==='off'){setCurrentWeatherType('');clearWeatherOverlay();log('[DEV] Weather cleared');_devWxMenu.classList.remove('sp-dev-open');_devWxMenu.querySelectorAll('.sp-dev-dropdown-item').forEach(i=>i.classList.remove('sp-dev-active'));item.classList.add('sp-dev-active');return}
            const s=getSettings();s.weatherOverlay=true;saveSettings();
            const btn=document.getElementById('sp-tb-weather');if(btn)btn.checked=true;_updateFeatBadge();
            setCurrentWeatherType('');
            const fakeWx={rain:'rain',snow:'snow',hail:'hail storm',storm:'thunderstorm',fog:'fog',sandstorm:'sandstorm',ash:'volcanic ash',wind:'wind',aurora:'aurora'}[wt.id]||wt.id;
            updateWeatherOverlay(fakeWx);
            _devWxMenu.querySelectorAll('.sp-dev-dropdown-item').forEach(i=>i.classList.remove('sp-dev-active'));item.classList.add('sp-dev-active');
            log('[DEV] Weather \u2192',wt.id);
        });
        _devWxMenu.appendChild(item);
    });
    document.getElementById('sp-tb-dev-wx').addEventListener('click',e=>{
        e.stopPropagation();
        document.getElementById('sp-dev-time-menu').classList.remove('sp-dev-open');
        _featDrop.classList.remove('sp-feat-open');
        _devWxMenu.classList.toggle('sp-dev-open');
    });

    // ── DEV: Time-of-day dropdown ──
    const _devTimePeriods=[
        {id:'dawn',label:'Dawn (5\u20137 AM)',time:'5:30'},{id:'morning',label:'Morning (7\u201311 AM)',time:'9:00'},
        {id:'day',label:'Day (11 AM\u20132 PM)',time:'12:00'},{id:'afternoon',label:'Afternoon (2\u20135 PM)',time:'15:00'},
        {id:'dusk',label:'Dusk (5\u20138 PM)',time:'18:30'},{id:'evening',label:'Evening (8\u201310 PM)',time:'21:00'},
        {id:'night',label:'Night (10 PM\u20135 AM)',time:'23:00'},{id:'off',label:'\u23F9 Clear tint'}
    ];
    const _devTimeMenu=document.getElementById('sp-dev-time-menu');
    _devTimePeriods.forEach(tp=>{
        const item=document.createElement('div');item.className='sp-dev-dropdown-item';item.dataset.id=tp.id;item.textContent=tp.label;
        item.addEventListener('click',()=>{
            if(tp.id==='off'){setCurrentTimePeriod('');clearTimeTint();log('[DEV] Time tint cleared');_devTimeMenu.classList.remove('sp-dev-open');_devTimeMenu.querySelectorAll('.sp-dev-dropdown-item').forEach(i=>i.classList.remove('sp-dev-active'));item.classList.add('sp-dev-active');return}
            const s=getSettings();s.timeTint=true;saveSettings();
            const btn=document.getElementById('sp-tb-timeTint');if(btn)btn.checked=true;_updateFeatBadge();
            setCurrentTimePeriod('');
            updateTimeTint(tp.time);
            _devTimeMenu.querySelectorAll('.sp-dev-dropdown-item').forEach(i=>i.classList.remove('sp-dev-active'));item.classList.add('sp-dev-active');
            log('[DEV] Time tint \u2192',tp.id);
        });
        _devTimeMenu.appendChild(item);
    });
    document.getElementById('sp-tb-dev-time').addEventListener('click',e=>{
        e.stopPropagation();
        _devWxMenu.classList.remove('sp-dev-open');
        _featDrop.classList.remove('sp-feat-open');
        _devTimeMenu.classList.toggle('sp-dev-open');
    });

    // Close dropdowns on outside click
    document.addEventListener('click',()=>{_devWxMenu.classList.remove('sp-dev-open');_devTimeMenu.classList.remove('sp-dev-open')});
    _devWxMenu.addEventListener('click',e=>e.stopPropagation());
    _devTimeMenu.addEventListener('click',e=>e.stopPropagation());

    const snap=getLatestSnapshot();
    if(snap){updatePanel(normalizeTracker(snap));showPanel()}
    // Initialize toolbar button states
    const s=getSettings();
    const tbThoughts=document.getElementById('sp-tb-thoughts');
    if(tbThoughts)tbThoughts.checked=s.showThoughts!==false;
    const tbWeather=document.getElementById('sp-tb-weather');
    if(tbWeather)tbWeather.checked=s.weatherOverlay!==false;
    const tbTimeTint=document.getElementById('sp-tb-timeTint');
    if(tbTimeTint)tbTimeTint.checked=s.timeTint!==false;
    const tbSceneTrans=document.getElementById('sp-tb-sceneTrans');
    if(tbSceneTrans)tbSceneTrans.checked=s.sceneTransitions!==false;
    _updateFeatBadge();
    const tbEmpty=document.getElementById('sp-tb-empty');
    if(tbEmpty)tbEmpty.classList.toggle('sp-tb-active',s.showEmptyFields===true);
    if(s.showEmptyFields){const p=document.getElementById('sp-panel');if(p)p.classList.add('sp-show-empty')}
    // Dev buttons visibility
    const devVis=s.devButtons?'':'none';
    const dw=document.getElementById('sp-dev-wx-wrap');if(dw)dw.style.display=devVis;
    const dt=document.getElementById('sp-dev-time-wrap');if(dt)dt.style.display=devVis;
}
