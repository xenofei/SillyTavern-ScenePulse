// src/ui/loading.js — Loading overlays, stop button, elapsed timer
import { log } from '../logger.js';
import { esc } from '../utils.js';
import { t } from '../i18n.js';
import {
    elapsedInterval, setElapsedInterval,
    _tpLoadingTimerId, set_tpLoadingTimerId,
    _tpBannerTimerId, set_tpBannerTimerId
} from '../state.js';
import { spDetectMode } from './mobile.js';
import { cancelGeneration } from '../generation/engine.js';

export function showStopButton(){
    let btn=document.getElementById('sp-stop-btn');
    if(!btn){
        btn=document.createElement('button');btn.id='sp-stop-btn';btn.className='sp-stop-btn';
        btn.addEventListener('click',cancelGeneration);
        document.body.appendChild(btn);
    }
    // Position to match panel bottom edge
    const panel=document.getElementById('sp-panel');
    if(panel){
        const r=panel.getBoundingClientRect();
        btn.style.left=r.left+'px';
        btn.style.width=r.width+'px';
        btn.style.bottom='0px';
    }
    btn.textContent=t('Stop Generation');btn.disabled=false;btn.style.display='flex';
}
export function hideStopButton(){const btn=document.getElementById('sp-stop-btn');if(btn)btn.style.display='none'}

export function startElapsedTimer(){
    stopElapsedTimer();
    const start=Date.now();
    const el=document.getElementById('sp-regen-elapsed');
    if(el)el.textContent='0s';
    setElapsedInterval(setInterval(()=>{
        const el=document.getElementById('sp-regen-elapsed');
        if(el)el.textContent=((Date.now()-start)/1000|0)+'s';
    },1000));
}
export function stopElapsedTimer(){if(elapsedInterval){clearInterval(elapsedInterval);setElapsedInterval(null)}}
export function cleanupGenUI(){
    hideStopButton();stopElapsedTimer();
    // Clear all loading overlays -- panel, fixed, and thought
    clearLoadingOverlay(document.getElementById('sp-panel-body'));
    clearThoughtLoading();
}

// ── Loading overlay helpers -- transparent overlays that sit on top of existing content ──
export function loadingHTML(label,sub,inline=false){
    const cls=inline?'sp-regen-overlay sp-regen-inline':'sp-regen-overlay';
    return `<div class="${cls}"><div class="sp-regen-spinner"><span class="sp-ring-3"></span></div><div class="sp-regen-text">${esc(label)}</div>${sub?`<div class="sp-regen-sub">${esc(sub)}<span class="sp-ellipsis"></span></div>`:''}</div>`;
}
export function showLoadingOverlay(container,label,sub,inline=false){
    if(!container)return;
    clearLoadingOverlay(container);
    const ov=document.createElement('div');
    if(inline){
        // Section-level: absolute within section content
        container.style.position='relative';
        ov.className='sp-loading-glass sp-loading-glass-inline';
        ov.innerHTML=`<div class="sp-regen-overlay sp-regen-inline"><div class="sp-regen-spinner"><span class="sp-ring-3"></span></div><div class="sp-regen-text">${esc(label)}</div>${sub?`<div class="sp-regen-sub">${esc(sub)}<span class="sp-ellipsis"></span></div>`:''}</div>`;
        container.appendChild(ov);
        log('Overlay [inline]: "'+label+'"');
    } else {
        // Full panel: fixed to VIEWPORT on document.body, z-index above panel (1000)
        // Cannot be inside #sp-panel because overflow:auto + transform makes fixed=absolute
        ov.className='sp-loading-glass sp-loading-glass-fixed';
        ov.id='sp-panel-glass-overlay';
        const panel=document.getElementById('sp-panel');
        if(panel){
            const r=panel.getBoundingClientRect();
            ov.style.top=r.top+'px';
            ov.style.left=r.left+'px';
            ov.style.width=r.width+'px';
            ov.style.height=r.height+'px';
        }
        ov.innerHTML=`<div class="sp-regen-overlay"><div class="sp-regen-spinner"><span class="sp-ring-3"></span></div><div class="sp-regen-text">${esc(label)}</div>${sub?`<div class="sp-regen-sub">${esc(sub)}<span class="sp-ellipsis"></span></div>`:''}<div id="sp-regen-elapsed" class="sp-regen-elapsed"></div></div>`;
        document.body.appendChild(ov);
        log('Overlay [fixed]: "'+label+'"');
    }
}
export function clearLoadingOverlay(container){
    if(container)container.querySelectorAll('.sp-loading-glass').forEach(ov=>ov.remove());
    const fixed=document.getElementById('sp-panel-glass-overlay');
    if(fixed){fixed.remove();log('Overlay [fixed]: cleared')}
}
export function showThoughtLoading(label,sub){
    clearThoughtLoading();
    const mode=spDetectMode();if(mode==='mobile')return; // No thought panel on mobile
    // Full glass overlay on thought panel -- manual regen only
    const tp=document.getElementById('sp-thought-panel');
    if(!tp)return;
    tp.classList.add('sp-tp-visible');
    tp.classList.add('sp-tp-loading-active'); // Block close during loading
    const tpb=document.getElementById('sp-tp-body');
    if(!tpb)return;
    tpb.style.position='relative';
    // Set explicit height so overlay fills the space and centers properly
    // Use panel height minus header, or fallback to 200px
    const hdrH=tp.querySelector('.sp-tp-header')?.offsetHeight||36;
    const available=tp.offsetHeight?tp.offsetHeight-hdrH:200;
    tpb.style.height=Math.max(120,available)+'px';
    const ov=document.createElement('div');
    ov.className='sp-loading-glass sp-loading-glass-tp';
    ov.innerHTML=`<div class="sp-tp-loading">
        <div class="sp-tp-spinner"><span class="sp-ring-3"></span></div>
        <div class="sp-tp-loading-text">${esc(label)}<span class="sp-ellipsis"></span></div>
        ${sub?`<div class="sp-tp-loading-sub">${esc(sub)}<span class="sp-ellipsis"></span></div>`:''}
        <div class="sp-tp-loading-elapsed" id="sp-tp-elapsed"></div>
    </div>`;
    tpb.appendChild(ov);
    // Start elapsed timer — stored in module state to prevent leak on innerHTML teardown
    if(_tpLoadingTimerId)clearInterval(_tpLoadingTimerId);
    const start=Date.now();
    set_tpLoadingTimerId(setInterval(()=>{
        const el=document.getElementById('sp-tp-elapsed');
        if(el)el.textContent=((Date.now()-start)/1000|0)+'s';
    },1000));
    log('Overlay [thought]: "'+label+'"');
}
// ── Thought Banner -- slim banner at top of Inner Thoughts panel during together-mode auto-gen ──
export function showChatBanner(label){
    hideChatBanner();
    const bannerStart=Date.now();
    // Banner in thought panel only
    const tp=document.getElementById('sp-thought-panel');
    if(tp){
        const body=document.getElementById('sp-tp-body');
        if(body){
            const tpBanner=document.createElement('div');
            tpBanner.className='sp-chat-banner sp-inline-wait';
            tpBanner.innerHTML=`<div class="sp-inline-wait-spinner"></div><span>${t('Updating scene data')}<span class="sp-ellipsis"></span></span><span class="sp-banner-timer" id="sp-banner-timer-tp">0s</span>`;
            tp.insertBefore(tpBanner,body);
            tp.classList.add('sp-tp-visible');
            if(_tpBannerTimerId)clearInterval(_tpBannerTimerId);
            set_tpBannerTimerId(setInterval(()=>{
                const el=document.getElementById('sp-banner-timer-tp');
                if(el)el.textContent=((Date.now()-bannerStart)/1000|0)+'s';
            },1000));
        }
    }
}
export function hideChatBanner(){
    if(_tpBannerTimerId){clearInterval(_tpBannerTimerId);set_tpBannerTimerId(null)}
    document.querySelectorAll('.sp-chat-banner').forEach(b=>b.remove());
}
export function clearThoughtLoading(){
    const tp=document.getElementById('sp-thought-panel');
    if(tp)tp.classList.remove('sp-tp-loading-active');
    const tpb=document.getElementById('sp-tp-body');
    if(tpb){
        const ov=tpb.querySelector('.sp-loading-glass');
        if(ov){
            if(_tpLoadingTimerId){clearInterval(_tpLoadingTimerId);set_tpLoadingTimerId(null)}
            ov.remove();log('Overlay [thought]: cleared');
        }
        tpb.style.height='';
    }
    hideChatBanner();
}
