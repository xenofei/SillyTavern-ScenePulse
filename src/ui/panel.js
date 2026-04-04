// src/ui/panel.js — Side Panel Creation, Show/Hide, Toolbar Event Handling
import { log, warn } from '../logger.js';
import { esc, clamp, str } from '../utils.js';
import { MASCOT_SVG, DEFAULTS, VERSION } from '../constants.js';
import { getSettings, saveSettings } from '../settings.js';
import { BUILTIN_PANELS } from '../constants.js';
import { buildDynamicSchema } from '../schema.js';
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
import { updateThoughts } from './thoughts.js';
import { renderCustomPanelsMgr } from '../settings-ui/custom-panels.js';
import { mkSection } from './section.js';
import { injectStoryIdea } from '../story-ideas.js';

export function showPanel(){
    const p=document.getElementById('sp-panel');if(!p)return;
    if(!getSettings().enabled){p.classList.remove('sp-visible');return}
    const mode=spApplyMode();
    // Measure ST's top bar for all modes
    const topBar=document.getElementById('top-bar')||document.getElementById('top-settings-holder')||document.querySelector('.header,.nav-bar,header');
    const tbH=topBar?topBar.getBoundingClientRect().bottom:0;
    if(mode==='mobile'){
        const spTopH=44; // SP mobile top bar height
        p.style.top=spTopH+'px';p.style.height=`calc(100vh - ${spTopH}px)`;p.style.width='100vw';p.style.right='0';
    }else if(mode==='tablet'){
        const tbW=Math.min(Math.round(window.innerWidth*0.7),600);
        p.style.top=tbH+'px';p.style.height=`calc(100vh - ${tbH}px)`;p.style.width=tbW+'px';p.style.right='0';
    }else{
        p.style.top=tbH+'px';
        p.style.height=`calc(100vh - ${tbH}px)`;
        if(!p.classList.contains('sp-compact')){
            const sheld=document.getElementById('sheld');
            if(sheld){
                const rect=sheld.getBoundingClientRect();
                const panelW=Math.max(300,window.innerWidth-rect.right);
                p.style.width=panelW+'px';
            }
        }else{
            const compactW=Math.max(240,Math.min(Math.round(window.innerWidth*0.22),280));
            p.style.width=compactW+'px';
        }
    }
    p.classList.add('sp-visible');
    // Must call AFTER sp-visible is set so spInjectTopBar sees panel as visible
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
        <div class="sp-brand-icon" id="sp-brand-icon" title="ScenePulse v${VERSION}">${MASCOT_SVG}</div>
        <div class="sp-brand-title">Scene<span class="sp-brand-accent">Pulse</span></div>
        <span class="sp-toolbar-spacer"></span>
        <button class="sp-toolbar-btn" id="sp-tb-regen" title="Regenerate all"><svg viewBox="0 0 16 16" width="15" height="15" fill="none"><path d="M13.5 8a5.5 5.5 0 1 1-1.3-3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M13.5 3v2.5h-2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <span class="sp-toolbar-sep"></span>
        <button class="sp-toolbar-btn" id="sp-tb-panels" title="Panel Manager"><svg viewBox="0 0 16 16" width="15" height="15" fill="none"><rect x="1" y="2" width="6" height="4" rx="1" stroke="currentColor" stroke-width="1.1" opacity="0.6"/><rect x="9" y="2" width="6" height="4" rx="1" stroke="currentColor" stroke-width="1.1" opacity="0.6"/><rect x="1" y="8" width="6" height="4" rx="1" stroke="currentColor" stroke-width="1.1" fill="currentColor" opacity="0.15"/><rect x="9" y="8" width="6" height="4" rx="1" stroke="currentColor" stroke-width="1.1"/><line x1="3" y1="14" x2="13" y2="14" stroke="currentColor" stroke-width="1" opacity="0.25" stroke-linecap="round"/></svg></button>
        <button class="sp-toolbar-btn" id="sp-tb-toggle" title="Expand/Collapse sections"><svg viewBox="0 0 16 16" width="15" height="15" fill="none"><rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/><rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/><rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/><rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/></svg></button>
        <button class="sp-toolbar-btn" id="sp-tb-compact" title="Condense view"><svg viewBox="0 0 16 16" width="15" height="15" fill="none"><rect x="2" y="2" width="12" height="2.5" rx="1" fill="currentColor" opacity="0.3"/><rect x="2" y="6" width="9" height="2" rx="0.8" fill="currentColor" opacity="0.2"/><rect x="2" y="9.5" width="11" height="2" rx="0.8" fill="currentColor" opacity="0.15"/><rect x="2" y="13" width="7" height="1.5" rx="0.7" fill="currentColor" opacity="0.1"/><path d="M14 5.5L14 12" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.3"/><path d="M12.5 7l1.5-1.5L15.5 7" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round" opacity="0.4"/><path d="M12.5 10.5l1.5 1.5 1.5-1.5" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round" opacity="0.4"/></svg></button>
        <span class="sp-toolbar-sep"></span>
        <button class="sp-toolbar-btn sp-tb-active" id="sp-tb-thoughts" title="Toggle thoughts"><svg viewBox="0 0 16 16" width="15" height="15" fill="none"><path d="M2 9.5c0 1.5 1.5 3 4 3l2 2v-2c2.5 0 4-1.5 4-3V6c0-1.5-1.5-3-4-3H6C3.5 3 2 4.5 2 6v3.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" fill="currentColor" opacity="0.15"/><circle cx="5.5" cy="7.2" r="0.8" fill="currentColor" opacity="0.6"/><circle cx="8" cy="7.2" r="0.8" fill="currentColor" opacity="0.6"/><circle cx="10.5" cy="7.2" r="0.8" fill="currentColor" opacity="0.6"/></svg></button>
        <button class="sp-toolbar-btn sp-tb-active" id="sp-tb-weather" title="Toggle weather overlay"><svg viewBox="0 0 16 16" width="15" height="15" fill="none"><path d="M4.5 11.5c-2 0-3.5-1.2-3.5-3 0-1.4 1-2.6 2.4-3C4 2.8 6.2 1 9 1c2.6 0 4.8 1.8 5 4 1.5.3 2.5 1.4 2.5 2.8 0 1.7-1.5 3-3.2 3H4.5z" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><line x1="5" y1="13" x2="4" y2="15.5" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.4"/><line x1="8.5" y1="13" x2="7.5" y2="15.5" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.4"/><line x1="12" y1="13" x2="11" y2="15.5" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.4"/></svg></button>
        <button class="sp-toolbar-btn sp-tb-active" id="sp-tb-timeTint" title="Toggle time-of-day ambience"><svg viewBox="0 0 16 16" width="15" height="15" fill="none"><circle cx="8" cy="8" r="3" fill="currentColor" opacity="0.25" stroke="currentColor" stroke-width="1.2"/><line x1="8" y1="1.5" x2="8" y2="3.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/><line x1="8" y1="12.5" x2="8" y2="14.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/><line x1="1.5" y1="8" x2="3.5" y2="8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/><line x1="12.5" y1="8" x2="14.5" y2="8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/><line x1="3.4" y1="3.4" x2="4.8" y2="4.8" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.35"/><line x1="11.2" y1="11.2" x2="12.6" y2="12.6" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.35"/><line x1="3.4" y1="12.6" x2="4.8" y2="11.2" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.35"/><line x1="11.2" y1="4.8" x2="12.6" y2="3.4" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.35"/></svg></button>
        <button class="sp-toolbar-btn sp-tb-active" id="sp-tb-sceneTrans" title="Toggle location change popups"><svg viewBox="0 0 16 16" width="15" height="15" fill="none"><path d="M2 12V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z" stroke="currentColor" stroke-width="1.1" fill="currentColor" opacity="0.08"/><path d="M5 8h6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/><path d="M9.5 5.5L12 8l-2.5 2.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <span class="sp-toolbar-sep"></span>
        <button class="sp-toolbar-btn" id="sp-tb-edit" title="Toggle edit mode"><svg viewBox="0 0 16 16" width="15" height="15" fill="none"><path d="M11.5 1.5l3 3-8.5 8.5H3v-3l8.5-8.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><line x1="9.5" y1="3.5" x2="12.5" y2="6.5" stroke="currentColor" stroke-width="0.8" opacity="0.4"/><line x1="3" y1="14.5" x2="13" y2="14.5" stroke="currentColor" stroke-width="1" opacity="0.3" stroke-linecap="round"/></svg></button>
        <div class="sp-dev-wrap" id="sp-dev-wx-wrap" style="display:none"><button class="sp-toolbar-btn sp-tb-dev" id="sp-tb-dev-wx" title="DEV: Weather overlays"><svg viewBox="0 0 16 16" width="15" height="15" fill="none"><path d="M4 12c-1.8 0-3-1-3-2.5S2 7.5 3.5 7C4 4.5 6 3 8.5 3c2.2 0 4 1.5 4.2 3.5C14 6.8 15 8 15 9.5S13.5 12 12 12z" stroke="currentColor" stroke-width="1.1" fill="currentColor" opacity="0.15"/><path d="M6 8l2-3 2 3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/><line x1="8" y1="8" x2="8" y2="13" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.6"/></svg></button><div class="sp-dev-dropdown" id="sp-dev-wx-menu"></div></div>
        <div class="sp-dev-wrap" id="sp-dev-time-wrap" style="display:none"><button class="sp-toolbar-btn sp-tb-dev" id="sp-tb-dev-time" title="DEV: Time-of-day tints"><svg viewBox="0 0 16 16" width="15" height="15" fill="none"><circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1.2"/><line x1="8" y1="8" x2="8" y2="4.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="8" y1="8" x2="11" y2="9.5" stroke="currentColor" stroke-width="1" stroke-linecap="round"/><circle cx="8" cy="8" r="0.8" fill="currentColor"/></svg></button><div class="sp-dev-dropdown" id="sp-dev-time-menu"></div></div>
        <button class="sp-toolbar-btn" id="sp-tb-minimize" title="Hide panel" style="display:none"><svg viewBox="0 0 16 16" width="15" height="15" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><line x1="2" y1="13" x2="14" y2="13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity="0.4"/></svg></button>
    </div>
    <div id="sp-panel-body"><div class="sp-empty-state"><div class="sp-empty-icon">\uD83D\uDCE1</div><div class="sp-empty-title">No scene data yet</div><div class="sp-empty-sub">Send a message or click <strong>\u27F3</strong> to generate.</div></div></div>`;
    document.body.appendChild(panel);
    log('Panel appended to body');

    // ── Mobile FAB (floating action button to restore panel) ──
    if(!document.getElementById('sp-mobile-fab')){
        const fab=document.createElement('button');fab.id='sp-mobile-fab';fab.className='sp-mobile-fab';
        fab.title='Show ScenePulse';fab.innerHTML=MASCOT_SVG;
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
        showLoadingOverlay(body,'Regenerating Scene','Analyzing context and building tracker');
        setLastGenSource('manual:full');
        showStopButton();startElapsedTimer();
        // Manual regen always shows thought panel
        const tp=document.getElementById('sp-thought-panel');
        const st=getSettings();
        st.showThoughts=true;saveSettings();
        // Sync UI
        const tbBtn=document.getElementById('sp-tb-thoughts');if(tbBtn)tbBtn.classList.add('sp-tb-active');
        const cb=document.getElementById('sp-show-thoughts');if(cb)cb.checked=true;
        if(tp){
            tp.classList.add('sp-tp-visible');
            showThoughtLoading('Updating thoughts','Analyzing context');
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
            else body.innerHTML='<div class="sp-empty-state"><div class="sp-empty-icon">\u27F3</div><div class="sp-empty-title">No scene data yet</div><div class="sp-empty-sub">Send a message or click <strong>\u27F3</strong> to generate.</div></div>';
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
    // Thoughts toggle
    document.getElementById('sp-tb-thoughts').addEventListener('click',()=>{
        const s=getSettings();s.showThoughts=!s.showThoughts;saveSettings();
        const btn=document.getElementById('sp-tb-thoughts');
        btn.classList.toggle('sp-tb-active',s.showThoughts);
        syncThoughts();
        // Also update settings checkbox if it exists
        const cb=document.getElementById('sp-show-thoughts');if(cb)cb.checked=s.showThoughts;
    });
    // Edit mode toggle
    document.getElementById('sp-tb-edit').addEventListener('click',()=>{
        const p=document.getElementById('sp-panel');if(!p)return;
        const isEdit=p.classList.toggle('sp-edit-mode');
        document.getElementById('sp-tb-edit').classList.toggle('sp-tb-active',isEdit);
        if(isEdit)toastr.info('Click any highlighted field to edit','Edit Mode On');
        else toastr.info('Edit mode off','Edit Mode Off');
        log('Edit mode:',isEdit);
    });
    // Compact/Focus toggle
    document.getElementById('sp-tb-compact').addEventListener('click',()=>{
        const p=document.getElementById('sp-panel');if(!p)return;
        const isCompact=p.classList.toggle('sp-compact');
        const btn=document.getElementById('sp-tb-compact');
        btn.classList.toggle('sp-tb-active',isCompact);
        // Recalculate width -- compact uses less space
        if(isCompact){
            const compactW=Math.max(240,Math.min(Math.round(window.innerWidth*0.22),280));
            p.style.width=compactW+'px';
        }else{
            // Restore full width
            const sheld=document.getElementById('sheld');
            if(sheld){const rect=sheld.getBoundingClientRect();p.style.width=Math.max(300,window.innerWidth-rect.right)+'px'}
        }
        log('Compact:',isCompact);
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
        mgr=document.createElement('div');mgr.id='sp-panel-mgr';mgr.className='sp-panel-mgr sp-mgr-closing';
        const s=getSettings();
        mgr.innerHTML=`<div class="sp-mgr-header"><span class="sp-mgr-title">Panel Manager</span><button class="sp-mgr-close" title="Close">\u2715</button></div><div class="sp-mgr-hint">Toggle panels on/off. Disabled panels are excluded from the LLM prompt.</div>`;
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
                if(schemaEl&&!s.schema)schemaEl.value=JSON.stringify(buildDynamicSchema(s),null,2);
                // Sync toolbar icons: hide/dim when panel disabled
                if(cb.dataset.panel==='dashboard'){
                    const wxBtn=document.getElementById('sp-tb-weather');
                    const ttBtn=document.getElementById('sp-tb-timeTint');
                    if(wxBtn)wxBtn.style.opacity=cb.checked?'':'0.25';
                    if(ttBtn)ttBtn.style.opacity=cb.checked?'':'0.25';
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
                                const wxBtn=document.getElementById('sp-tb-weather');
                                if(wxBtn){wxBtn.style.opacity=scb.checked?'':'0.25';wxBtn.style.pointerEvents=scb.checked?'':'none'}
                                if(scb.checked&&s.weatherOverlay===false){
                                    s.weatherOverlay=true;if(wxBtn)wxBtn.classList.add('sp-tb-active');
                                    const snap=getLatestSnapshot();if(snap)updateWeatherOverlay(normalizeTracker(snap).weather);
                                }
                                if(!scb.checked){s.weatherOverlay=false;clearWeatherOverlay();if(wxBtn)wxBtn.classList.remove('sp-tb-active')}
                            }
                            if(f.dashCard==='time'){
                                const ttBtn=document.getElementById('sp-tb-timeTint');
                                if(ttBtn){ttBtn.style.opacity=scb.checked?'':'0.25';ttBtn.style.pointerEvents=scb.checked?'':'none'}
                                if(scb.checked&&!s.timeTint){
                                    s.timeTint=true;if(ttBtn)ttBtn.classList.add('sp-tb-active');
                                    const snap=getLatestSnapshot();if(snap)updateTimeTint(normalizeTracker(snap).time);
                                }
                                if(!scb.checked){s.timeTint=false;clearTimeTint();if(ttBtn)ttBtn.classList.remove('sp-tb-active')}
                            }
                        } else {
                            if(!s.fieldToggles)s.fieldToggles={};
                            s.fieldToggles[fKey]=scb.checked;
                            // CSS-only toggle -- zero rebuilds
                            body.querySelectorAll(`[data-ft="${fKey}"]`).forEach(el=>{el.style.display=scb.checked?'':'none'});
                            // char_thoughts controls the floating thoughts panel
                            if(fKey==='char_thoughts'){
                                s.showThoughts=scb.checked;
                                const tp=document.getElementById('sp-thought-panel');
                                const thBtn=document.getElementById('sp-tb-thoughts');
                                if(!scb.checked){
                                    if(tp)tp.classList.remove('sp-tp-visible');
                                    if(thBtn){thBtn.classList.remove('sp-tb-active');thBtn.style.opacity='0.25';thBtn.style.pointerEvents='none'}
                                } else {
                                    if(thBtn){thBtn.classList.add('sp-tb-active');thBtn.style.opacity='';thBtn.style.pointerEvents=''}
                                    const snap=getLatestSnapshot();if(snap)updateThoughts(normalizeTracker(snap));
                                    if(tp)tp.classList.add('sp-tp-visible');
                                }
                                const settingsCb=document.getElementById('sp-show-thoughts');
                                if(settingsCb)settingsCb.checked=scb.checked;
                            }
                        }
                        saveSettings();
                        const schemaEl=document.getElementById('sp-schema');
                        if(schemaEl&&!s.schema)schemaEl.value=JSON.stringify(buildDynamicSchema(s),null,2);
                        log((f.isDashCard?'DashCard':f.isSub?'SubField':'Field')+' toggled:',fKey,'\u2192',scb.checked);
                    });
                    subWrap.appendChild(sub);
                    if(f.dashCard==='weather'){
                        const wxHint=document.createElement('div');wxHint.className='sp-mgr-hint-tip';
                        wxHint.dataset.hintTarget='sp-tb-weather';
                        wxHint.textContent='\u2139 Weather overlay is off \u2014 enable it in the toolbar for visual effects.';
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
        const enableAllBtn=document.createElement('button');enableAllBtn.className='sp-mgr-enable-btn sp-mgr-btn-enable';enableAllBtn.textContent='Enable All';
        const disableAllBtn=document.createElement('button');disableAllBtn.className='sp-mgr-enable-btn sp-mgr-btn-disable';disableAllBtn.textContent='Disable All';
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
            for(const bid of['sp-tb-weather','sp-tb-timeTint','sp-tb-thoughts']){
                const b=document.getElementById(bid);if(b){b.style.opacity='';b.style.pointerEvents='';b.classList.add('sp-tb-active')}
            }
            s.weatherOverlay=true;s.timeTint=true;
            const snap=getLatestSnapshot();
            if(snap){const n=normalizeTracker(snap);updateWeatherOverlay(n.weather);updateTimeTint(n.time);updateThoughts(n);const tp=document.getElementById('sp-thought-panel');if(tp)tp.classList.add('sp-tp-visible')}
            builtinHeader.querySelector('.sp-mgr-collapse-count').textContent=Object.keys(BUILTIN_PANELS).length+'/'+Object.keys(BUILTIN_PANELS).length;
            const schemaEl=document.getElementById('sp-schema');
            if(schemaEl&&!s.schema)schemaEl.value=JSON.stringify(buildDynamicSchema(s),null,2);
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
            for(const bid of['sp-tb-weather','sp-tb-timeTint','sp-tb-thoughts']){
                const b=document.getElementById(bid);if(b){b.style.opacity='0.25';b.style.pointerEvents='none';b.classList.remove('sp-tb-active')}
            }
            builtinHeader.querySelector('.sp-mgr-collapse-count').textContent='0/'+Object.keys(BUILTIN_PANELS).length;
            const schemaEl=document.getElementById('sp-schema');
            if(schemaEl&&!s.schema)schemaEl.value=JSON.stringify(buildDynamicSchema(s),null,2);
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
        const cpHeader=document.createElement('div');cpHeader.className='sp-mgr-subheader';cpHeader.textContent='Custom Panels';
        mgr.appendChild(cpHeader);
        const cpList=document.createElement('div');cpList.id='sp-panel-mgr-custom';
        mgr.appendChild(cpList);
        renderCustomPanelsMgr(s,cpList,body);
        const addBtn=document.createElement('button');addBtn.className='sp-btn sp-mgr-add-panel';addBtn.textContent='+ Add Custom Panel';
        addBtn.addEventListener('click',()=>{
            if(!s.customPanels)s.customPanels=[];
            const newPanel={name:'',fields:[{key:'',label:'',type:'text',desc:''}]};
            s.customPanels.push(newPanel);
            saveSettings();renderCustomPanelsMgr(s,cpList,body);
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
        body.insertBefore(mgr,body.firstChild);
        // Sync toolbar buttons with current dashCard/thoughts state
        const _dc=s.dashCards||DEFAULTS.dashCards;
        const wxBtn=document.getElementById('sp-tb-weather');
        if(wxBtn&&_dc.weather===false){wxBtn.style.opacity='0.25';wxBtn.style.pointerEvents='none'}
        const ttBtn=document.getElementById('sp-tb-timeTint');
        if(ttBtn&&_dc.time===false){ttBtn.style.opacity='0.25';ttBtn.style.pointerEvents='none'}
        const thBtn=document.getElementById('sp-tb-thoughts');
        const _ft=s.fieldToggles||{};
        if(thBtn&&(_ft.char_thoughts===false||s.showThoughts===false)){thBtn.style.opacity='0.25';thBtn.style.pointerEvents='none'}
        // Trigger open transition: start from closing state, remove in next frame
        requestAnimationFrame(()=>requestAnimationFrame(()=>mgr.classList.remove('sp-mgr-closing')));
    });
    // Weather overlay toggle
    document.getElementById('sp-tb-weather').addEventListener('click',()=>{
        const s=getSettings();s.weatherOverlay=s.weatherOverlay===false?true:false;saveSettings();
        const btn=document.getElementById('sp-tb-weather');
        btn.classList.toggle('sp-tb-active',s.weatherOverlay!==false);
        if(s.weatherOverlay===false){clearWeatherOverlay()}
        else{const snap=getLatestSnapshot();if(snap){const n=normalizeTracker(snap);updateWeatherOverlay(n.weather)}}
        const cb=document.getElementById('sp-show-weather');if(cb)cb.checked=s.weatherOverlay!==false;
    });
    // Time-of-day tint toggle
    document.getElementById('sp-tb-timeTint').addEventListener('click',()=>{
        const s=getSettings();s.timeTint=s.timeTint===false?true:false;saveSettings();
        const btn=document.getElementById('sp-tb-timeTint');
        btn.classList.toggle('sp-tb-active',s.timeTint!==false);
        if(s.timeTint===false){clearTimeTint()}
        else{const snap=getLatestSnapshot();if(snap){const n=normalizeTracker(snap);updateTimeTint(n.time)}}
        const cb=document.getElementById('sp-show-timetint');if(cb)cb.checked=s.timeTint!==false;
    });
    // Scene transition popup toggle
    {const _stBtn=document.getElementById('sp-tb-sceneTrans');
    const _stInit=getSettings();_stBtn.classList.toggle('sp-tb-active',_stInit.sceneTransitions!==false);
    _stBtn.addEventListener('click',()=>{
        const s=getSettings();s.sceneTransitions=s.sceneTransitions===false?true:false;saveSettings();
        _stBtn.classList.toggle('sp-tb-active',s.sceneTransitions!==false);
    });}

    // ── DEV: Weather overlay dropdown ──
    const _devWxTypes=[
        {id:'rain',label:'Rain'},{id:'snow',label:'Snow'},{id:'hail',label:'Hail'},
        {id:'storm',label:'Storm'},{id:'fog',label:'Fog / Mist'},{id:'sandstorm',label:'Sandstorm'},
        {id:'ash',label:'Ash / Volcanic'},{id:'wind',label:'Wind'},{id:'aurora',label:'Aurora'},
        {id:'off',label:'\u23F9 Clear overlay'}
    ];
    const _devWxMenu=document.getElementById('sp-dev-wx-menu');
    _devWxTypes.forEach(t=>{
        const item=document.createElement('div');item.className='sp-dev-dropdown-item';item.dataset.id=t.id;item.textContent=t.label;
        item.addEventListener('click',()=>{
            if(t.id==='off'){setCurrentWeatherType('');clearWeatherOverlay();log('[DEV] Weather cleared');_devWxMenu.classList.remove('sp-dev-open');_devWxMenu.querySelectorAll('.sp-dev-dropdown-item').forEach(i=>i.classList.remove('sp-dev-active'));item.classList.add('sp-dev-active');return}
            const s=getSettings();s.weatherOverlay=true;saveSettings();
            const btn=document.getElementById('sp-tb-weather');if(btn)btn.classList.add('sp-tb-active');
            setCurrentWeatherType('');
            const fakeWx={rain:'rain',snow:'snow',hail:'hail storm',storm:'thunderstorm',fog:'fog',sandstorm:'sandstorm',ash:'volcanic ash',wind:'wind',aurora:'aurora'}[t.id]||t.id;
            updateWeatherOverlay(fakeWx);
            _devWxMenu.querySelectorAll('.sp-dev-dropdown-item').forEach(i=>i.classList.remove('sp-dev-active'));item.classList.add('sp-dev-active');
            log('[DEV] Weather \u2192',t.id);
        });
        _devWxMenu.appendChild(item);
    });
    document.getElementById('sp-tb-dev-wx').addEventListener('click',e=>{
        e.stopPropagation();
        document.getElementById('sp-dev-time-menu').classList.remove('sp-dev-open');
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
    _devTimePeriods.forEach(t=>{
        const item=document.createElement('div');item.className='sp-dev-dropdown-item';item.dataset.id=t.id;item.textContent=t.label;
        item.addEventListener('click',()=>{
            if(t.id==='off'){setCurrentTimePeriod('');clearTimeTint();log('[DEV] Time tint cleared');_devTimeMenu.classList.remove('sp-dev-open');_devTimeMenu.querySelectorAll('.sp-dev-dropdown-item').forEach(i=>i.classList.remove('sp-dev-active'));item.classList.add('sp-dev-active');return}
            const s=getSettings();s.timeTint=true;saveSettings();
            const btn=document.getElementById('sp-tb-timeTint');if(btn)btn.classList.add('sp-tb-active');
            setCurrentTimePeriod('');
            updateTimeTint(t.time);
            _devTimeMenu.querySelectorAll('.sp-dev-dropdown-item').forEach(i=>i.classList.remove('sp-dev-active'));item.classList.add('sp-dev-active');
            log('[DEV] Time tint \u2192',t.id);
        });
        _devTimeMenu.appendChild(item);
    });
    document.getElementById('sp-tb-dev-time').addEventListener('click',e=>{
        e.stopPropagation();
        _devWxMenu.classList.remove('sp-dev-open');
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
    if(tbThoughts)tbThoughts.classList.toggle('sp-tb-active',s.showThoughts!==false);
    const tbWeather=document.getElementById('sp-tb-weather');
    if(tbWeather)tbWeather.classList.toggle('sp-tb-active',s.weatherOverlay!==false);
    const tbTimeTint=document.getElementById('sp-tb-timeTint');
    if(tbTimeTint)tbTimeTint.classList.toggle('sp-tb-active',s.timeTint!==false);
    // Dev buttons visibility
    const devVis=s.devButtons?'':'none';
    const dw=document.getElementById('sp-dev-wx-wrap');if(dw)dw.style.display=devVis;
    const dt=document.getElementById('sp-dev-time-wrap');if(dt)dt.style.display=devVis;
}
