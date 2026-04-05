// src/ui/thoughts.js — Thought Panel (draggable, shows internal dialogue + goals)
import { log, warn } from '../logger.js';
import { esc } from '../utils.js';
import { getSettings, saveSettings } from '../settings.js';
import { charColor } from '../color.js';
import { generating, genNonce, lastGenSource, setLastGenSource } from '../state.js';
import { showThoughtLoading, showStopButton, hideStopButton, clearThoughtLoading } from './loading.js';
import { generateTracker } from '../generation/engine.js';
import { normalizeTracker } from '../normalize.js';
import { updatePanel } from './update-panel.js';
import { syncThoughts } from './panel.js';

export function createThoughtPanel(){
    if(document.getElementById('sp-thought-panel'))return;
    const tp=document.createElement('div');tp.id='sp-thought-panel';
    const s=getSettings();
    const pos=s.thoughtPos||{x:10,y:80};
    tp.style.left=pos.x+'px';tp.style.top=pos.y+'px';
    tp.innerHTML=`<div class="sp-tp-header" id="sp-tp-drag">
        <svg class="sp-tp-drag-grip" width="16" height="4" viewBox="0 0 16 4" style="opacity:0.15"><rect y="0" width="16" height="1.5" rx="0.75" fill="currentColor"/><rect y="2.5" width="16" height="1.5" rx="0.75" fill="currentColor"/></svg>
        <span class="sp-tp-title">Inner Thoughts</span>
        <span class="sp-tp-header-spacer"></span>
        <button class="sp-tp-snapleft${s.thoughtSnapLeft!==false?' sp-tb-active':''}" title="Snap to left of chat"><svg viewBox="0 0 16 16" width="15" height="15" fill="none"><rect x="1" y="2" width="6" height="12" rx="1" stroke="currentColor" stroke-width="1.2" opacity="0.8"/><rect x="9" y="2" width="6" height="12" rx="1" stroke="currentColor" stroke-width="1.2" opacity="0.35"/><path d="M4.5 6.5L2.5 8l2 1.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <button class="sp-tp-ghost${s.thoughtGhost!==false?' sp-tb-active':''}" title="Ghost mode \u2014 hide panel frame"><svg viewBox="0 0 20 20" width="15" height="15" fill="none"><path d="M10 2C6.5 2 4 4.8 4 7.5v7c0 .4.2.7.5.5l1.5-1.2 1.5 1.2c.3.2.7.2 1 0L10 13.8l1.5 1.2c.3.2.7.2 1 0l1.5-1.2 1.5 1.2c.3.2.5-.1.5-.5v-7C16 4.8 13.5 2 10 2z" fill="currentColor" opacity="0.12" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/><ellipse cx="7.8" cy="8" rx="1.3" ry="1.6" fill="currentColor" opacity="0.7"/><ellipse cx="12.2" cy="8" rx="1.3" ry="1.6" fill="currentColor" opacity="0.7"/><circle cx="7.8" cy="7.6" r="0.5" fill="var(--sp-bg, #161820)"/><circle cx="12.2" cy="7.6" r="0.5" fill="var(--sp-bg, #161820)"/><ellipse cx="10" cy="11" rx="1.5" ry="1" fill="currentColor" opacity="0.2"/></svg></button>
        <button class="sp-tp-regen" title="Regenerate thoughts"><svg viewBox="0 0 16 16" width="15" height="15" fill="none"><path d="M13.5 8a5.5 5.5 0 1 1-1.3-3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M13.5 3v2.5h-2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <button class="sp-tp-close" title="Hide thoughts"><svg viewBox="0 0 12 12" width="13" height="13" fill="none"><line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>
    </div><div id="sp-tp-body"></div>
    <div class="sp-tp-resize" title="Resize"><svg viewBox="0 0 16 16" fill="none"><line x1="14" y1="2" x2="2" y2="14" stroke="currentColor" stroke-width="1" opacity="0.4"/><line x1="14" y1="6" x2="6" y2="14" stroke="currentColor" stroke-width="1" opacity="0.4"/><line x1="14" y1="10" x2="10" y2="14" stroke="currentColor" stroke-width="1" opacity="0.4"/></svg></div>`;
    document.body.appendChild(tp);
    // Apply font scale
    const _tpFs=getSettings().fontScale;if(_tpFs&&_tpFs!==1)tp.style.zoom=_tpFs;

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
            toastr.info('Snapped to left of chat');
        } else {
            toastr.info('Free positioning enabled');
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

    // Regen button
    tp.querySelector('.sp-tp-regen').addEventListener('click',async(e)=>{
        e.stopPropagation();
        if(generating){toastr.warning('Generation already in progress');return}
        const s=getSettings();if(!s.enabled){toastr.warning('ScenePulse is disabled');return}
        const btn=e.currentTarget;
        if(btn.classList.contains('sp-spinning'))return;
        btn.classList.add('sp-spinning');
        const{chat}=SillyTavern.getContext();
        if(!chat.length){btn.classList.remove('sp-spinning');return}
        // Show loading overlay inside thought body -- existing content visible behind
        showThoughtLoading('Regenerating thoughts','Analyzing context');
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
            toastr.success('Regenerated');
        } else {
            toastr.error('Regeneration failed');
        }
    });

    // Close button -- blocked during loading to prevent showThoughts=false persisting
    tp.querySelector('.sp-tp-close').addEventListener('click',()=>{
        if(tp.classList.contains('sp-tp-loading-active')){log('Close blocked: loading active');return}
        tp.classList.remove('sp-tp-visible');
        const st=getSettings();st.showThoughts=false;saveSettings();
        // Sync toolbar button
        const btn=document.getElementById('sp-tb-thoughts');if(btn)btn.classList.remove('sp-tb-active');
        // Sync settings checkbox
        const cb=document.getElementById('sp-show-thoughts');if(cb)cb.checked=false;
    });

    // Drag support (mouse + touch)
    const drag=tp.querySelector('#sp-tp-drag');
    let dragging=false,dx=0,dy=0;
    function dragStart(cx,cy,e){
        if(e.target.closest('.sp-tp-close')||e.target.closest('.sp-tp-regen')||e.target.closest('.sp-tp-snapleft')||e.target.closest('.sp-tp-ghost'))return;
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

export function updateThoughts(d){
    createThoughtPanel();
    const panel=document.getElementById('sp-thought-panel');if(!panel){warn('Thought panel not found');return}
    const body=document.getElementById('sp-tp-body');if(!body){warn('Thought body not found');return}body.innerHTML='';
    const s=getSettings();
    log('updateThoughts: chars=',d?.characters?.length||0,'showThoughts=',s.showThoughts,'loadingActive=',panel.classList.contains('sp-tp-loading-active'));
    if(!d?.characters?.length||s.showThoughts===false){
        if(s.showThoughts===false)log('updateThoughts: hidden (showThoughts=false)');
        panel.classList.remove('sp-tp-visible');return;
    }
    // Sort: {{char}} first
    const _tpCharName=(SillyTavern.getContext().name2||'').toLowerCase();
    const sortedTpChars=[...d.characters].sort((a,b)=>{
        const aMatch=(a.name||'').toLowerCase().startsWith(_tpCharName)||_tpCharName.startsWith((a.name||'').toLowerCase());
        const bMatch=(b.name||'').toLowerCase().startsWith(_tpCharName)||_tpCharName.startsWith((b.name||'').toLowerCase());
        if(aMatch&&!bMatch)return -1;if(bMatch&&!aMatch)return 1;return 0;
    });
    for(const ch of sortedTpChars){
        const cc=charColor(ch.name);
        const card=document.createElement('div');card.className='sp-tp-card';
        card.style.setProperty('--char-bg',cc.bg);card.style.setProperty('--char-border',cc.border);card.style.setProperty('--char-accent',cc.accent);
        // SVG thought bubble icon
        const thoughtIcon=`<svg class="sp-tp-name-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="12" cy="9.5" rx="9" ry="7" fill="currentColor" opacity="0.12" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/><circle cx="6.5" cy="18.5" r="2" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="0.8"/><circle cx="4" cy="21.5" r="1.2" fill="currentColor" opacity="0.1" stroke="currentColor" stroke-width="0.6"/><circle cx="9" cy="9.5" r="0.9" fill="currentColor" opacity="0.35"/><circle cx="12" cy="9.5" r="0.9" fill="currentColor" opacity="0.35"/><circle cx="15" cy="9.5" r="0.9" fill="currentColor" opacity="0.35"/></svg>`;
        let html=`<div class="sp-tp-name">${thoughtIcon}${esc(ch.name)}</div>`;
        // Inner dialogue -- pure first-person thought, limited to 1-3 sentences
        const thought=ch.innerThought||'';
        if(thought){
            const sentences=thought.match(/[^.!?]+[.!?]+/g)||[thought];
            let th=0;for(let i=0;i<thought.length;i++)th=((th<<5)-th+thought.charCodeAt(i))|0;
            const sentenceLimit=(Math.abs(th)%3)+1;
            const limited=sentences.slice(0,sentenceLimit).join(' ').trim();
            html+=`<div class="sp-tp-monologue">${esc(limited)}</div>`;
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
// ── Auto-fit thought panel to its content height ──
export function autoFitThoughtPanel(){
    const tp=document.getElementById('sp-thought-panel');
    if(!tp||!tp.classList.contains('sp-tp-visible'))return;
    // Step 1: Remove constraints so panel can grow to natural content size
    tp.style.height='auto';
    tp.style.maxHeight='none';
    // Step 2: After layout settles, read actual height and cap at 85vh
    setTimeout(()=>{
        if(!tp.classList.contains('sp-tp-visible'))return;
        const natural=tp.scrollHeight;
        const maxH=window.innerHeight*0.85;
        tp.style.maxHeight='85vh';
        tp.style.height=Math.min(natural,maxH)+'px';
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
    // Snap to left edge of browser
    tp.style.left='0px';
    tp.style.top=Math.max(34,chatRect.top)+'px';
    // Width: from browser left to message panel left edge
    const targetW=Math.max(200,chatRect.left-gap);
    tp.style.width=targetW+'px';
    // Cap height
    const maxH=Math.min(chatRect.height,window.innerHeight*0.85);
    if(tp.offsetHeight>maxH)tp.style.height=maxH+'px';
}
