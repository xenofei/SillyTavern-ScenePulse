// src/ui/scene-transition.js — Scene Transition Animation
import { log } from '../logger.js';
import { esc } from '../utils.js';
import { prevLocation, prevTimePeriod, _isTimelineScrub, setPrevLocation, setPrevTimePeriod } from '../state.js';
import { getSettings } from '../settings.js';

export function checkSceneTransition(d){
    const loc=d.location||'';const timeStr=d.time||'';
    const h=parseInt(timeStr.match(/(\d+):/)?.[1]||'-1');
    let period='';
    if(h>=5&&h<12)period='morning';else if(h>=12&&h<17)period='afternoon';else if(h>=17&&h<21)period='evening';else if(h>=0)period='night';
    // Determine if major location change (different first segment)
    const locFirst=loc.split('>')[0].trim().toLowerCase();
    const prevFirst=prevLocation.split('>')[0].trim().toLowerCase();
    const majorLocChange=prevLocation&&locFirst&&prevFirst&&locFirst!==prevFirst;
    // Determine if major time-of-day change
    const majorTimeChange=prevTimePeriod&&period&&prevTimePeriod!==period;
    setPrevLocation(loc);setPrevTimePeriod(period);
    if(!majorLocChange&&!majorTimeChange)return;
    // Check if scene transitions are enabled
    if(getSettings().sceneTransitions===false||_isTimelineScrub)return;
    // Build transition card
    const lines=[];
    if(majorLocChange){
        const parts=loc.split('>').map(s=>s.trim()).filter(Boolean);
        for(const p of parts)lines.push(p);
    }
    if(majorTimeChange){
        const labels={morning:'Morning',afternoon:'Afternoon',evening:'Evening',night:'Night'};
        lines.push(labels[period]||period);
    }
    if(!lines.length)return;
    // Remove any existing transition card before creating a new one
    const old=document.getElementById('sp-scene-transition');
    if(old)old.remove();
    const card=document.createElement('div');
    card.id='sp-scene-transition';
    card.innerHTML=`<div class="sp-st-rule"></div>${lines.map(l=>`<span><b>${esc(l)}</b></span>`).join('<span class="sp-st-sep">\u203A</span>')}<div class="sp-st-rule"></div>`;
    document.body.appendChild(card);
    void card.offsetWidth; // force reflow
    card.classList.add('sp-st-show');
    // Use animationend for reliable cleanup — setTimeout can be
    // throttled in background tabs, leaving the overlay stuck
    const cleanup=()=>{card.remove()};
    card.addEventListener('animationend',cleanup,{once:true});
    // Safety fallback: if animationend doesn't fire (e.g. animation
    // cancelled, display:none), remove after 6s
    setTimeout(()=>{if(card.parentNode)card.remove()},6000);
    log('Scene transition:',lines.join(' \u2014 '));
}
