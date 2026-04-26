// src/ui/thoughts.js — Thought Panel (draggable, shows internal dialogue + goals)
import { log, warn } from '../logger.js';
import { esc } from '../utils.js';
import { t } from '../i18n.js';
import { getSettings, saveSettings } from '../settings.js';
import { charColor } from '../color.js';
import { generating, genNonce, lastGenSource, setLastGenSource } from '../state.js';
import { showThoughtLoading, showStopButton, hideStopButton, clearThoughtLoading } from './loading.js';
import { generateTracker } from '../generation/engine.js';
import { guardRegenIfBusy } from '../generation/regen-guard.js';
import { normalizeTracker, filterForView } from '../normalize.js';
import { updateFeatBadge } from './panel.js';
import { updatePanel } from './update-panel.js';
import { syncThoughts } from './panel.js';
import { getPortraitHtml, buildPortraitIndex } from './portraits.js';

export function createThoughtPanel(){
    if(document.getElementById('sp-thought-panel'))return;
    const tp=document.createElement('div');tp.id='sp-thought-panel';
    const s=getSettings();
    const pos=s.thoughtPos||{x:10,y:80};
    tp.style.left=pos.x+'px';tp.style.top=pos.y+'px';
    tp.innerHTML=`<div class="sp-tp-header" id="sp-tp-drag">
        <svg class="sp-tp-drag-grip" width="16" height="4" viewBox="0 0 16 4" style="opacity:0.15"><rect y="0" width="16" height="1.5" rx="0.75" fill="currentColor"/><rect y="2.5" width="16" height="1.5" rx="0.75" fill="currentColor"/></svg>
        <span class="sp-tp-title">${t('Inner Thoughts')}</span>
        <span class="sp-tp-header-spacer"></span>
        <button class="sp-tp-snapleft${s.thoughtSnapLeft!==false?' sp-tb-active':''}" title="${t('Snap to left of chat')}"><svg viewBox="0 0 16 16" width="15" height="15" fill="none"><rect x="1" y="2" width="6" height="12" rx="1" stroke="currentColor" stroke-width="1.2" opacity="0.8"/><rect x="9" y="2" width="6" height="12" rx="1" stroke="currentColor" stroke-width="1.2" opacity="0.35"/><path d="M4.5 6.5L2.5 8l2 1.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <button class="sp-tp-ghost${s.thoughtGhost!==false?' sp-tb-active':''}" title="${t('Ghost mode')}"><svg viewBox="0 0 20 20" width="15" height="15" fill="none"><path d="M10 2C6.5 2 4 4.8 4 7.5v7c0 .4.2.7.5.5l1.5-1.2 1.5 1.2c.3.2.7.2 1 0L10 13.8l1.5 1.2c.3.2.7.2 1 0l1.5-1.2 1.5 1.2c.3.2.5-.1.5-.5v-7C16 4.8 13.5 2 10 2z" fill="currentColor" opacity="0.12" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/><ellipse cx="7.8" cy="8" rx="1.3" ry="1.6" fill="currentColor" opacity="0.7"/><ellipse cx="12.2" cy="8" rx="1.3" ry="1.6" fill="currentColor" opacity="0.7"/><circle cx="7.8" cy="7.6" r="0.5" fill="var(--sp-bg, #161820)"/><circle cx="12.2" cy="7.6" r="0.5" fill="var(--sp-bg, #161820)"/><ellipse cx="10" cy="11" rx="1.5" ry="1" fill="currentColor" opacity="0.2"/></svg></button>
        <button class="sp-tp-fit${s.thoughtPanelFit===true?' sp-tb-active':''}" title="${t('Auto-fit thoughts to screen')}"><svg viewBox="0 0 16 16" width="15" height="15" fill="none"><path d="M2 2 L5 2 L5 5 M2 2 L5 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 2 L11 2 L11 5 M14 2 L11 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 14 L5 14 L5 11 M2 14 L5 11" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 14 L11 14 L11 11 M14 14 L11 11" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><rect x="6" y="6" width="4" height="4" rx="0.5" fill="currentColor" opacity="0.3"/></svg></button>
        <button class="sp-tp-regen" title="${t('Regenerate thoughts')}"><svg viewBox="0 0 16 16" width="15" height="15" fill="none"><path d="M13.5 8a5.5 5.5 0 1 1-1.3-3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M13.5 3v2.5h-2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <button class="sp-tp-close" title="${t('Hide thoughts')}"><svg viewBox="0 0 12 12" width="13" height="13" fill="none"><line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>
    </div><div id="sp-tp-body"></div>
    <div class="sp-tp-resize" title="${t('Resize')}"><svg viewBox="0 0 16 16" fill="none"><line x1="14" y1="2" x2="2" y2="14" stroke="currentColor" stroke-width="1" opacity="0.4"/><line x1="14" y1="6" x2="6" y2="14" stroke="currentColor" stroke-width="1" opacity="0.4"/><line x1="14" y1="10" x2="10" y2="14" stroke="currentColor" stroke-width="1" opacity="0.4"/></svg></div>`;
    document.body.appendChild(tp);

    // Snap-left toggle button
    tp.querySelector('.sp-tp-snapleft').addEventListener('click',(e)=>{
        e.stopPropagation();
        const st=getSettings();
        st.thoughtSnapLeft=st.thoughtSnapLeft!==false?false:true;
        saveSettings();
        const btn=e.currentTarget;
        btn.classList.toggle('sp-tb-active',st.thoughtSnapLeft!==false);
        if(st.thoughtSnapLeft!==false){
            snapThoughtToLeft();
            toastr.info(t('Snapped to left of chat'));
        } else {
            toastr.info(t('Free positioning enabled'));
        }
    });
    // Apply snap-left on creation if enabled
    if(s.thoughtSnapLeft!==false)setTimeout(()=>snapThoughtToLeft(),50);

    // Ghost mode toggle -- hides panel chrome, leaves thought cards floating
    tp.querySelector('.sp-tp-ghost').addEventListener('click',(e)=>{
        e.stopPropagation();
        const st=getSettings();
        st.thoughtGhost=st.thoughtGhost!==false?false:true;
        saveSettings();
        const btn=e.currentTarget;
        btn.classList.toggle('sp-tb-active',st.thoughtGhost!==false);
        tp.classList.toggle('sp-tp-ghost-mode',st.thoughtGhost!==false);
    });
    // Apply ghost on creation if enabled
    if(s.thoughtGhost!==false)tp.classList.add('sp-tp-ghost-mode');

    // v6.8.39: Auto-fit toggle — mirrors settings.thoughtPanelFit so
    // users can toggle it from the thought panel header without
    // opening the settings drawer. Keeps the checkbox in the settings
    // UI in sync via the DOM.
    tp.querySelector('.sp-tp-fit').addEventListener('click',(e)=>{
        e.stopPropagation();
        const st=getSettings();
        st.thoughtPanelFit=st.thoughtPanelFit!==true;
        saveSettings();
        const btn=e.currentTarget;
        btn.classList.toggle('sp-tb-active',st.thoughtPanelFit===true);
        // Keep the settings drawer checkbox in sync if it's rendered
        const cb=document.getElementById('sp-thought-fit');
        if(cb)cb.checked=st.thoughtPanelFit===true;
        // Re-run autofit immediately so the scale change is visible
        autoFitThoughtPanel();
    });

    // Regen button
    tp.querySelector('.sp-tp-regen').addEventListener('click',async(e)=>{
        e.stopPropagation();
        // v6.27.17: was a hard block + toast. Now offers cancel-and-restart.
        if (!(await guardRegenIfBusy())) return;
        const s=getSettings();if(!s.enabled){toastr.warning(t('ScenePulse is disabled'));return}
        const btn=e.currentTarget;
        if(btn.classList.contains('sp-spinning'))return;
        btn.classList.add('sp-spinning');
        const{chat}=SillyTavern.getContext();
        if(!chat.length){btn.classList.remove('sp-spinning');return}
        // Show loading overlay inside thought body -- existing content visible behind
        showThoughtLoading(t('Regenerating thoughts'),t('Analyzing context'));
        showStopButton();
        log('Thought regen: starting...');
        setLastGenSource('manual:thoughts');
        const result=await generateTracker(chat.length-1);
        btn.classList.remove('sp-spinning');
        hideStopButton();
        clearThoughtLoading();
        if(result){
            const norm=normalizeTracker(result);
            updatePanel(norm);
            toastr.success(t('Regenerated'));
        } else {
            toastr.error(t('Regeneration failed'));
        }
    });

    // Close button -- blocked during loading to prevent showThoughts=false persisting
    tp.querySelector('.sp-tp-close').addEventListener('click',()=>{
        if(tp.classList.contains('sp-tp-loading-active')){log('Close blocked: loading active');return}
        tp.classList.remove('sp-tp-visible');
        const st=getSettings();st.showThoughts=false;saveSettings();
        // Sync toolbar button
        const btn=document.getElementById('sp-tb-thoughts');if(btn)btn.checked=false;updateFeatBadge();
        // Sync settings checkbox
        const cb=document.getElementById('sp-show-thoughts');if(cb)cb.checked=false;
    });

    // Drag support (mouse + touch)
    const drag=tp.querySelector('#sp-tp-drag');
    let dragging=false,dx=0,dy=0;
    function dragStart(cx,cy,e){
        if(e.target.closest('.sp-tp-close')||e.target.closest('.sp-tp-regen')||e.target.closest('.sp-tp-snapleft')||e.target.closest('.sp-tp-ghost')||e.target.closest('.sp-tp-fit'))return;
        dragging=true;dx=cx-tp.offsetLeft;dy=cy-tp.offsetTop;
        e.preventDefault();
    }
    function dragMove(cx,cy){
        if(!dragging)return;
        let newLeft=Math.max(0,cx-dx);
        let newTop=Math.max(0,cy-dy);
        // Prevent overlapping chat area
        const chat=document.getElementById('chat');
        const chatParent=chat?.parentElement;
        if(chatParent){
            const chatRect=chatParent.getBoundingClientRect();
            const tpW=tp.offsetWidth;
            // If dragging into the chat column, cap left so panel stays left of chat
            if(newLeft+tpW>chatRect.left-4)newLeft=Math.max(0,chatRect.left-tpW-4);
        }
        // Keep within viewport
        newLeft=Math.min(newLeft,window.innerWidth-tp.offsetWidth);
        newTop=Math.min(newTop,window.innerHeight-40);
        tp.style.left=newLeft+'px';tp.style.top=newTop+'px';
    }
    function dragEnd(){
        if(!dragging)return;dragging=false;
        const st=getSettings();st.thoughtPos={x:tp.offsetLeft,y:tp.offsetTop};
        if(st.thoughtSnapLeft){st.thoughtSnapLeft=false;const slBtn=tp.querySelector('.sp-tp-snapleft');if(slBtn)slBtn.classList.remove('sp-tb-active')}
        saveSettings();
    }
    const _dragMouseMove=(e)=>dragMove(e.clientX,e.clientY);
    const _dragMouseUp=()=>{dragEnd();document.removeEventListener('mousemove',_dragMouseMove);document.removeEventListener('mouseup',_dragMouseUp)};
    drag.addEventListener('mousedown',(e)=>{dragStart(e.clientX,e.clientY,e);document.addEventListener('mousemove',_dragMouseMove);document.addEventListener('mouseup',_dragMouseUp)});
    const _dragTouchMove=(e)=>{if(!dragging)return;const t=e.touches[0];dragMove(t.clientX,t.clientY)};
    const _dragTouchEnd=()=>{dragEnd();document.removeEventListener('touchmove',_dragTouchMove);document.removeEventListener('touchend',_dragTouchEnd)};
    drag.addEventListener('touchstart',(e)=>{const t=e.touches[0];dragStart(t.clientX,t.clientY,e);document.addEventListener('touchmove',_dragTouchMove,{passive:true});document.addEventListener('touchend',_dragTouchEnd)},{passive:false});

    // Resize handle (mouse + touch)
    const resizeHandle=tp.querySelector('.sp-tp-resize');
    let resizing=false,rStartX=0,rStartY=0,rStartW=0,rStartH=0;
    function resizeStart(cx,cy,e){resizing=true;rStartX=cx;rStartY=cy;rStartW=tp.offsetWidth;rStartH=tp.offsetHeight;e.preventDefault();e.stopPropagation()}
    function resizeMove(cx,cy){if(!resizing)return;tp.style.width=Math.max(180,rStartW+(cx-rStartX))+'px';tp.style.height=Math.max(100,rStartH+(cy-rStartY))+'px'}
    function resizeEnd(){if(!resizing)return;resizing=false;const st=getSettings();st.thoughtSize={w:tp.offsetWidth,h:tp.offsetHeight};saveSettings()}
    const _resMouseMove=(e)=>resizeMove(e.clientX,e.clientY);
    const _resMouseUp=()=>{resizeEnd();document.removeEventListener('mousemove',_resMouseMove);document.removeEventListener('mouseup',_resMouseUp)};
    resizeHandle.addEventListener('mousedown',(e)=>{resizeStart(e.clientX,e.clientY,e);document.addEventListener('mousemove',_resMouseMove);document.addEventListener('mouseup',_resMouseUp)});
    const _resTouchMove=(e)=>{if(!resizing)return;const t=e.touches[0];resizeMove(t.clientX,t.clientY)};
    const _resTouchEnd=()=>{resizeEnd();document.removeEventListener('touchmove',_resTouchMove);document.removeEventListener('touchend',_resTouchEnd)};
    resizeHandle.addEventListener('touchstart',(e)=>{const t=e.touches[0];resizeStart(t.clientX,t.clientY,e);document.addEventListener('touchmove',_resTouchMove,{passive:true});document.addEventListener('touchend',_resTouchEnd)},{passive:false});
    // Dynamic resize: adjust thought panel when window resizes so it doesn't overlap chat
    let _tpResizeTimer=null;
    window.addEventListener('resize',()=>{
        if(_tpResizeTimer)return;
        _tpResizeTimer=setTimeout(()=>{
            _tpResizeTimer=null;
            if(!tp.classList.contains('sp-tp-visible'))return;
            const st=getSettings();
            if(st.thoughtSnapLeft!==false){snapThoughtToLeft();return}
            // Free-floating: constrain to viewport and away from chat
            const chat=document.getElementById('chat');
            const chatParent=chat?.parentElement;
            if(chatParent){
                const chatRect=chatParent.getBoundingClientRect();
                const tpW=tp.offsetWidth;
                if(tp.offsetLeft+tpW>chatRect.left-4)tp.style.left=Math.max(0,chatRect.left-tpW-4)+'px';
            }
            if(tp.offsetLeft+tp.offsetWidth>window.innerWidth)tp.style.left=Math.max(0,window.innerWidth-tp.offsetWidth)+'px';
            if(tp.offsetTop+40>window.innerHeight)tp.style.top=Math.max(0,window.innerHeight-40)+'px';
            const maxH=window.innerHeight*0.85;
            if(tp.offsetHeight>maxH)tp.style.height=maxH+'px';
        },100);
    });
    log('Thought panel created');
}

// v6.17.0: instrumented for perf-monitor capture (Panel A MVP).
import { markStart as _spMarkStart, markEnd as _spMarkEnd } from '../perf-monitor.js';
export function updateThoughts(d){
    _spMarkStart('sp:thoughts-update');
    try { return _updateThoughtsInner(d); }
    finally { _spMarkEnd('sp:thoughts-update'); }
}
function _updateThoughtsInner(d){
    createThoughtPanel();
    const panel=document.getElementById('sp-thought-panel');if(!panel){warn('Thought panel not found');return}
    const body=document.getElementById('sp-tp-body');if(!body){warn('Thought body not found');return}body.innerHTML='';
    const s=getSettings();
    // Apply view-layer filter at the render choke point.
    //
    // Character storage accumulates every character ever encountered in the chat
    // (see v6.6.5 — required for the Character Wiki). Filtering down to the
    // currently-present set happens at the view layer via filterForView, which
    // uses d.charactersPresent as the ground truth.
    //
    // updatePanel already runs this filter before calling updateThoughts, but
    // five other callers (renderExisting on page refresh, toolbar thoughts
    // toggle, panel re-show, settings toggle, settings reset) pass raw
    // normalized data directly. Filtering here catches all of them without
    // touching the call sites. filterForView is idempotent and sets a
    // _spViewFiltered flag, so re-filtering already-filtered data is a no-op.
    if(d&&!d._spViewFiltered)d=filterForView(d);
    log('updateThoughts: chars=',d?.characters?.length||0,'showThoughts=',s.showThoughts,'loadingActive=',panel.classList.contains('sp-tp-loading-active'));
    if(!d?.characters?.length||s.showThoughts===false){
        if(s.showThoughts===false)log('updateThoughts: hidden (showThoughts=false)');
        panel.classList.remove('sp-tp-visible');return;
    }
    // Sort: primary character(s) first. v6.8.15 uses _isPrimary computed in
    // normalize (group-aware). Falls back to name2 string match for legacy
    // snapshots where the flag isn't set. In a group chat, every group member
    // is marked primary, so they all bubble to the top as a cohort.
    const _tpCharName=(SillyTavern.getContext().name2||'').toLowerCase();
    const _tpPrim=(c)=>{
        if(c?._isPrimary!=null)return !!c._isPrimary;
        const n=(c?.name||'').toLowerCase();
        return !!_tpCharName&&(n.startsWith(_tpCharName)||_tpCharName.startsWith(n));
    };
    const sortedTpChars=[...d.characters].sort((a,b)=>{
        const aP=_tpPrim(a),bP=_tpPrim(b);
        if(aP&&!bP)return -1;
        if(bP&&!aP)return 1;
        return 0;
    });
    // v6.8.38: portrait index built once for the whole render loop
    const _tpPortraitIdx=buildPortraitIndex();
    for(const ch of sortedTpChars){
        const cc=charColor(ch.name);
        const card=document.createElement('div');card.className='sp-tp-card';
        card.style.setProperty('--char-bg',cc.bg);card.style.setProperty('--char-border',cc.border);card.style.setProperty('--char-accent',cc.accent);if(cc.pattern)card.style.setProperty('--char-pattern',cc.pattern);
        // v6.8.38: portrait thumbnail on the left of the name. The existing
        // thought-bubble icon is kept on the right (it floats via order:1
        // + margin-left:auto in the CSS) as a decorative accent so the
        // card still reads as "thoughts" at a glance.
        const portraitHtml=getPortraitHtml(ch,cc.accent,_tpPortraitIdx);
        const thoughtIcon=`<svg class="sp-tp-name-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="12" cy="9.5" rx="9" ry="7" fill="currentColor" opacity="0.12" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/><circle cx="6.5" cy="18.5" r="2" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="0.8"/><circle cx="4" cy="21.5" r="1.2" fill="currentColor" opacity="0.1" stroke="currentColor" stroke-width="0.6"/><circle cx="9" cy="9.5" r="0.9" fill="currentColor" opacity="0.35"/><circle cx="12" cy="9.5" r="0.9" fill="currentColor" opacity="0.35"/><circle cx="15" cy="9.5" r="0.9" fill="currentColor" opacity="0.35"/></svg>`;
        let html=`<div class="sp-tp-name">${portraitHtml}<span class="sp-tp-name-text">${esc(ch.name)}</span>${thoughtIcon}</div>`;
        // Inner dialogue — pure first-person thought.
        //
        // Default (v6.8.23+): render the full thought as the model wrote it.
        // Opt-in truncate mode (settings.thoughtPanelTruncate=true) keeps the
        // legacy behavior: hash the thought to a stable 1–3 sentence count
        // and slice to that limit. The hash is stable per thought so the
        // same input always renders with the same length across re-renders,
        // while *different* thoughts vary visually between 1 and 3 sentences
        // — creating a sense of distinct character voices at a glance.
        const thought=ch.innerThought||'';
        if(thought){
            let rendered=thought;
            if(s.thoughtPanelTruncate){
                const sentences=thought.match(/[^.!?]+[.!?]+/g)||[thought];
                let th=0;for(let i=0;i<thought.length;i++)th=((th<<5)-th+thought.charCodeAt(i))|0;
                const sentenceLimit=(Math.abs(th)%3)+1;
                rendered=sentences.slice(0,sentenceLimit).join(' ').trim();
            }
            html+=`<div class="sp-tp-monologue">${esc(rendered)}</div>`;
        } else {
            html+=`<div class="sp-tp-monologue sp-tp-monologue-empty">\u2026</div>`;
        }
        card.innerHTML=html;
        body.appendChild(card);
    }
    // Sync visibility with main panel
    syncThoughts();
    // Auto-fit panel to content -- defer to next frame so layout has completed
    requestAnimationFrame(()=>requestAnimationFrame(()=>autoFitThoughtPanel()));
}
// ── v6.8.32: dynamic top-bar measurement ────────────────────────────────
// Mirrors the same approach panel.js uses to compute the top offset so
// the thought panel aligns with whatever vertical space ST has actually
// made available. Before v6.8.32 the thought panel hardcoded a 34px top
// offset and an 85vh height cap, which left ~15vh of dead space at the
// bottom even when the panel had more content to show. Now it matches
// the main ScenePulse panel's full-height behavior.
function _measureTopBar(){
    const topBar=document.getElementById('top-bar')
        ||document.getElementById('top-settings-holder')
        ||document.querySelector('.header,.nav-bar,header');
    return topBar?Math.max(0,topBar.getBoundingClientRect().bottom):0;
}
// Bottom margin: leave a small gap above the viewport edge so the panel
// doesn't butt right against the send bar or the browser's scrollbar.
const _TP_BOTTOM_MARGIN=8;

// ── Auto-fit thought panel to its content height ──
export function autoFitThoughtPanel(){
    const tp=document.getElementById('sp-thought-panel');
    if(!tp||!tp.classList.contains('sp-tp-visible'))return;
    // Step 1: reset the fit-scale to 1 BEFORE measuring natural height
    // so we're always measuring the unscaled content. Without this,
    // repeated autoFit calls would compound the scale factor and the
    // cards would shrink further every render.
    tp.style.removeProperty('--sp-tp-fit-scale');
    tp.style.height='auto';
    tp.style.maxHeight='none';
    // Step 2: After layout settles, measure natural height and cap at
    // viewport - topBar - bottom margin.
    setTimeout(()=>{
        if(!tp.classList.contains('sp-tp-visible'))return;
        const natural=tp.scrollHeight;
        const topOffset=_measureTopBar();
        const maxH=Math.max(120,window.innerHeight-topOffset-_TP_BOTTOM_MARGIN);
        tp.style.maxHeight=maxH+'px';
        // v6.8.38: opt-in auto-fit mode — when the natural content would
        // overflow the panel (typical with 6+ characters visible at once),
        // compute a scale factor and apply it as a CSS custom property
        // that the .sp-tp-card rules multiply into font-size, padding,
        // and margin. Scale is clamped to [0.55, 1.0] so the text stays
        // readable. Without this mode the panel scrolls internally.
        const s=getSettings();
        if(s.thoughtPanelFit===true&&natural>maxH){
            // Leave a few pixels of slack so rounding + border widths
            // don't push us just past the limit after scaling.
            const slack=12;
            const rawScale=(maxH-slack)/natural;
            const scale=Math.max(0.55,Math.min(1,rawScale));
            tp.style.setProperty('--sp-tp-fit-scale',scale.toFixed(3));
            // After scaling, height should be `natural * scale` but we
            // also want it to match the viewport cap exactly so the
            // panel fills the available column without an empty gap.
            tp.style.height=maxH+'px';
        } else {
            tp.style.height=Math.min(natural,maxH)+'px';
        }
        snapThoughtToLeft();
    },50);
}
// ── Snap thought panel to left of browser, width to message area ──
export function snapThoughtToLeft(){
    const s=getSettings();
    if(s.thoughtSnapLeft===false)return;
    const tp=document.getElementById('sp-thought-panel');
    if(!tp||!tp.classList.contains('sp-tp-visible'))return;
    // Find ST chat container
    const chat=document.getElementById('chat');
    const chatParent=chat?.parentElement;
    if(!chatParent)return;
    const chatRect=chatParent.getBoundingClientRect();
    const gap=6;
    // v6.8.32: dynamic top-bar offset (was hardcoded 34).
    // Align the panel with whatever vertical space ST leaves below the
    // top bar, matching the main panel's positioning.
    const topOffset=_measureTopBar();
    tp.style.left='0px';
    tp.style.top=Math.max(topOffset,chatRect.top)+'px';
    // Width: from browser left to message panel left edge
    const targetW=Math.max(200,chatRect.left-gap);
    tp.style.width=targetW+'px';
    // v6.8.32: full available height minus top bar and bottom margin.
    // Previously capped at min(chatRect.height, 85vh) which was never
    // the right answer — chatRect.height excludes ST's send bar area,
    // and 85vh left dead space. Now the panel grows to the full usable
    // column.
    const panelTop=parseFloat(tp.style.top)||topOffset;
    const maxH=Math.max(120,window.innerHeight-panelTop-_TP_BOTTOM_MARGIN);
    tp.style.maxHeight=maxH+'px';
    if(tp.offsetHeight>maxH)tp.style.height=maxH+'px';
}
