// src/ui/section.js — Collapsible section builder for the panel
import { log } from '../logger.js';
import { esc } from '../utils.js';
import { getSettings, saveSettings } from '../settings.js';
import { generating, setLastGenSource } from '../state.js';
import { generateTracker } from '../generation/engine.js';
import { showLoadingOverlay, clearLoadingOverlay, showStopButton, hideStopButton } from './loading.js';

// Set each open section-content's height to its exact scrollHeight.
// Uses double-rAF to ensure card expand/collapse has fully reflowed
// before measuring. This handles the case where a card inside a
// section is toggled — the content height changes and we need to
// remeasure AFTER the new content has laid out.
export function resizeSectionContent(){
    const panel=document.getElementById('sp-panel');
    if(!panel)return;
    // Double rAF: first frame applies DOM changes, second frame measures
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
        panel.querySelectorAll('.sp-section-content').forEach(ct=>{
            const sec=ct.closest('.sp-section');
            if(!sec)return;
            if(sec.classList.contains('sp-open')){
                ct.style.height='auto';
                void ct.offsetHeight;
                ct.style.height=ct.scrollHeight+'px';
            }else{
                ct.style.height='';
            }
        });
    }));
}

// Section icons keyed by section key — compact SVGs for visual scanability
const SECTION_ICONS={
    scene:'<svg viewBox="0 0 16 16" width="14" height="14" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.1" opacity="0.5"/><path d="M8 2.5v5.5l4 2" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" opacity="0.7"/><circle cx="8" cy="8" r="1.2" fill="currentColor" opacity="0.4"/></svg>',
    quests:'<svg viewBox="0 0 16 16" width="14" height="14" fill="none"><path d="M3 14V3a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v11l-5-2.5L3 14z" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round" fill="currentColor" opacity="0.15"/><line x1="6" y1="5" x2="10" y2="5" stroke="currentColor" stroke-width="0.8" opacity="0.5" stroke-linecap="round"/><line x1="6" y1="7.5" x2="9" y2="7.5" stroke="currentColor" stroke-width="0.8" opacity="0.5" stroke-linecap="round"/></svg>',
    relationships:'<svg viewBox="0 0 16 16" width="14" height="14" fill="none"><circle cx="5" cy="6" r="2.5" stroke="currentColor" stroke-width="1.1" opacity="0.5"/><circle cx="11" cy="6" r="2.5" stroke="currentColor" stroke-width="1.1" opacity="0.5"/><path d="M3 13c0-2 1.5-3.5 4-3.5h2c2.5 0 4 1.5 4 3.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" opacity="0.4"/></svg>',
    characters:'<svg viewBox="0 0 16 16" width="14" height="14" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" stroke-width="1.1" opacity="0.5"/><path d="M3 14c0-2.5 2-4.5 5-4.5s5 2 5 4.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" opacity="0.4"/></svg>',
    branches:'<svg viewBox="0 0 16 16" width="14" height="14" fill="none"><path d="M8 2v4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.6"/><circle cx="8" cy="7.5" r="2.5" stroke="currentColor" stroke-width="1.1" fill="currentColor" opacity="0.12"/><path d="M5.5 7.5L3 11M10.5 7.5L13 11M8 10v3" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.4"/></svg>',
};

export function mkSection(key,title,badge,fn,s){
    const sec=document.createElement('div');sec.className='sp-section'+((s.openSections?.[key])?' sp-open':'');sec.dataset.key=key;
    const h=document.createElement('div');h.className='sp-section-header';
    const _icon=SECTION_ICONS[key]?`<span class="sp-section-icon">${SECTION_ICONS[key]}</span>`:'';
    h.innerHTML=`<span class="sp-section-chevron">\u25B8</span>${_icon}<span class="sp-section-title">${esc(title)}</span>${badge!=null?`<span class="sp-section-badge">${esc(String(badge))}</span>`:''}<span class="sp-section-spacer"></span><button class="sp-section-refresh" title="Refresh ${title}"><svg viewBox="0 0 16 16" width="12" height="12" fill="none"><path d="M13.5 8a5.5 5.5 0 1 1-1.3-3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M13.5 3v2h-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
    const chevronArea=h.querySelector('.sp-section-chevron');
    // Click anywhere on header toggles, except refresh button (debounced)
    let _secDebounce=false;
    h.addEventListener('click',(e)=>{
        if(e.target.closest('.sp-section-refresh'))return;
        if(_secDebounce)return;_secDebounce=true;setTimeout(()=>_secDebounce=false,200);
        e.stopPropagation();sec.classList.toggle('sp-open');
        const st=getSettings();if(!st.openSections)st.openSections={};
        st.openSections[key]=sec.classList.contains('sp-open');saveSettings();
        requestAnimationFrame(()=>resizeSectionContent());
    });
    // Refresh button regenerates just this section
    h.querySelector('.sp-section-refresh').addEventListener('click',async(e)=>{
        e.stopPropagation();
        if(generating){toastr.warning('Generation already in progress');return}
        const{chat}=SillyTavern.getContext();if(!chat.length)return;
        const btn=e.target.closest('.sp-section-refresh');btn.classList.add('sp-spinning');
        // Show loading overlay on section content -- existing content visible behind
        const content=sec.querySelector('.sp-section-content');
        showLoadingOverlay(content,'Refreshing '+title,'',true);
        // Ensure section is open so user sees the loading
        if(!sec.classList.contains('sp-open'))sec.classList.add('sp-open');
        setLastGenSource('manual:section:'+key);
        showStopButton();
        await generateTracker(chat.length-1,key);
        hideStopButton();
        btn.classList.remove('sp-spinning');
        clearLoadingOverlay(content);
    });
    const bd=document.createElement('div');bd.className='sp-section-body';
    const ct=document.createElement('div');ct.className='sp-section-content';
    ct.appendChild(fn());bd.appendChild(ct);sec.appendChild(h);sec.appendChild(bd);return sec;
}
