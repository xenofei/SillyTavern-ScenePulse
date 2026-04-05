// src/ui/mobile.js — Mobile/Tablet detection & responsive UI
import { SP_MOBILE_MAX, SP_TABLET_MAX, MASCOT_SVG, LOG } from '../constants.js';
import { t } from '../i18n.js';
import { log } from '../logger.js';
import { _spMobileMinimized, set_spMobileMinimized } from '../state.js';
import { hidePanel, showPanel } from './panel.js';
import { clearWeatherOverlay } from './weather.js';
import { clearTimeTint } from './time-tint.js';

export function spDetectMode(){
    const w=window.innerWidth;
    if(w<=SP_MOBILE_MAX)return'mobile';
    if(w<=SP_TABLET_MAX)return'tablet';
    return'desktop';
}
export function spApplyMode(){
    const p=document.getElementById('sp-panel');if(!p)return;
    const mode=spDetectMode();
    p.classList.remove('sp-mode-mobile','sp-mode-tablet');
    if(mode==='mobile')p.classList.add('sp-mode-mobile');
    else if(mode==='tablet')p.classList.add('sp-mode-tablet');
    // Show/hide the minimize button
    const minBtn=document.getElementById('sp-tb-minimize');
    if(minBtn)minBtn.style.display=(mode==='mobile'||mode==='tablet')?'inline-flex':'none';
    // Mobile: force-clear weather/tint effects (they cause glow bleed)
    if(mode==='mobile'||mode==='tablet'){
        clearWeatherOverlay();clearTimeTint();
    }
    // Mobile: inject SP branding into ST's top bar, hide ST extensions bar when panel is open
    spInjectTopBar(mode);
    // Show/hide FAB based on panel visibility
    spUpdateFab();
    return mode;
}
export function spInjectTopBar(mode){
    const stTop=document.getElementById('top-bar')||document.getElementById('top-settings-holder');
    if(!stTop)return;
    let spTop=document.getElementById('sp-mobile-topbar');
    if(mode==='mobile'||mode==='tablet'){
        const p=document.getElementById('sp-panel');
        const panelVis=p?.classList.contains('sp-visible');
        // Hide ST's top bar when SP panel is fullscreen
        if(panelVis){
            stTop.style.display='none';
            if(!spTop){
                spTop=document.createElement('div');spTop.id='sp-mobile-topbar';spTop.className='sp-mobile-topbar';
                spTop.innerHTML=`<div class="sp-mt-brand">${MASCOT_SVG}<span>Scene<span style="color:#4db8a4">Pulse</span></span></div><button class="sp-mt-minimize" id="sp-mt-minimize" title="Hide panel"><svg viewBox="0 0 16 16" width="22" height="22" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><line x1="2" y1="13" x2="14" y2="13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity="0.4"/></svg></button>`;
                document.body.insertBefore(spTop,document.body.firstChild);
                spTop.querySelector('#sp-mt-minimize').addEventListener('click',spMinimizePanel);
            }
            spTop.style.display='flex';spTop.classList.add('sp-mt-visible');
        } else {
            stTop.style.display='';
            if(spTop){spTop.style.display='none';spTop.classList.remove('sp-mt-visible')}
        }
    } else {
        stTop.style.display='';
        if(spTop)spTop.style.display='none';
    }
}
export function spUpdateFab(){
    const mode=spDetectMode();
    const p=document.getElementById('sp-panel');
    const panelVis=p?p.classList.contains('sp-visible'):false;
    const shouldShow=(mode==='mobile'||mode==='tablet')&&!panelVis;
    // Inject into ST's UI if not already there
    let btn=document.getElementById('sp-st-restore');
    if(!btn){
        // Try multiple ST anchor points
        const anchor=document.getElementById('rightSendForm')
            ||document.getElementById('send_form')
            ||document.querySelector('#form_sheld .justifyLeft')
            ||document.querySelector('#form_sheld');
        if(anchor){
            btn=document.createElement('div');btn.id='sp-st-restore';btn.title=t('Open ScenePulse');
            btn.className='sp-st-restore';
            btn.innerHTML=MASCOT_SVG;
            btn.addEventListener('click',(e)=>{e.preventDefault();e.stopPropagation();spRestorePanel()});
            anchor.appendChild(btn);
            console.log(LOG,'FAB: injected into ST UI, anchor='+anchor.id);
        }else{
            console.log(LOG,'FAB: no ST anchor found');
        }
    }
    if(btn){
        btn.style.display=shouldShow?'flex':'none';
        console.log(LOG,'FAB:','mode='+mode,'panelVis='+panelVis,'show='+shouldShow,'btnDisplay='+btn.style.display);
    }
    // Also update the floating FAB as fallback
    const fab=document.getElementById('sp-mobile-fab');
    if(fab){
        if(shouldShow)fab.classList.add('sp-fab-visible');
        else fab.classList.remove('sp-fab-visible');
    }
}
export function spMinimizePanel(){
    const p=document.getElementById('sp-panel');if(!p)return;
    set_spMobileMinimized(true);
    // Animate slide-out
    p.style.transition='transform 0.25s ease-in, opacity 0.25s ease-in';
    p.style.transform='translateY(100%)';p.style.opacity='0';
    const spTop=document.getElementById('sp-mobile-topbar');
    if(spTop){spTop.style.transition='transform 0.2s ease-in, opacity 0.2s ease-in';spTop.style.transform='translateY(-100%)';spTop.style.opacity='0'}
    setTimeout(()=>{
        p.style.transition='';p.style.transform='';p.style.opacity='';
        if(spTop){spTop.style.transition='';spTop.style.transform='';spTop.style.opacity=''}
        hidePanel();
        spUpdateFab();
        log('Mobile: panel minimized');
    },260);
}
export function spRestorePanel(){
    set_spMobileMinimized(false);
    showPanel();
    spUpdateFab();
    log('Mobile: panel restored');
}
// Guard: on mobile/tablet, only show panel if user explicitly requested it
export function spAutoShow(){
    const mode=spDetectMode();
    if(mode==='mobile'||mode==='tablet'){
        if(!_spMobileMinimized)set_spMobileMinimized(true); // first auto-show on mobile -> suppress, show FAB instead
        spUpdateFab();
        return;
    }
    showPanel();
}
export function spSetGenerating(active){
    const btn=document.getElementById('sp-st-restore');
    if(btn){if(active)btn.classList.add('sp-st-generating');else btn.classList.remove('sp-st-generating')}
    const fab=document.getElementById('sp-mobile-fab');
    if(fab){if(active)fab.classList.add('sp-st-generating');else fab.classList.remove('sp-st-generating')}
}
// After generation: show panel on desktop, show banner on mobile
export function spPostGenShow(){
    const mode=spDetectMode();
    if((mode==='mobile'||mode==='tablet')&&_spMobileMinimized){
        spShowBanner(t('Scene updated'));
        spUpdateFab();
        return;
    }
    showPanel();
}
export function spShowBanner(text){
    let b=document.getElementById('sp-mobile-banner');
    if(b)b.remove();
    b=document.createElement('div');b.id='sp-mobile-banner';b.className='sp-mobile-banner';
    b.innerHTML=`<span class="sp-banner-icon">${MASCOT_SVG}</span><span class="sp-banner-text">${text}</span>`;
    b.addEventListener('click',()=>{b.remove();spRestorePanel()});
    document.body.appendChild(b);
    // Auto-dismiss
    setTimeout(()=>{if(b.parentNode){b.classList.add('sp-banner-out');setTimeout(()=>b.remove(),400)}},4000);
    log('Banner shown:',text);
}
