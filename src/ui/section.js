// src/ui/section.js — Collapsible section builder for the panel
import { log } from '../logger.js';
import { esc } from '../utils.js';
import { getSettings, saveSettings } from '../settings.js';
import { generating, setLastGenSource } from '../state.js';
import { generateTracker } from '../generation/engine.js';
import { showLoadingOverlay, clearLoadingOverlay, showStopButton, hideStopButton } from './loading.js';

// Resize all open section-content elements so their max-height fills
// the available space between section headers. This ensures section
// content stops exactly at the next section header with no bleed.
export function resizeSectionContent(){
    const panel=document.getElementById('sp-panel');
    const body=document.getElementById('sp-panel-body');
    if(!panel||!body)return;
    const panelH=panel.clientHeight;
    // Measure fixed elements
    let fixedH=0;
    const toolbar=panel.querySelector('.sp-toolbar');
    if(toolbar)fixedH+=toolbar.offsetHeight;
    const dash=body.querySelector('.sp-env-permanent');
    if(dash)fixedH+=dash.offsetHeight;
    const footer=body.querySelector('.sp-gen-footer');
    if(footer)fixedH+=footer.offsetHeight;
    const sections=body.querySelectorAll('.sp-section');
    let openCount=0;
    sections.forEach(sec=>{
        const header=sec.querySelector('.sp-section-header');
        if(header)fixedH+=header.offsetHeight;
        if(sec.classList.contains('sp-open'))openCount++;
    });
    // Available height divided among open sections (min 250px each).
    // Using FIXED height (not max-height) — the element is exactly
    // this tall, so it physically cannot extend past the next header.
    // CSS overflow has proven unreliable in ST's 3D transform context,
    // but a fixed height constrains the element's layout box itself.
    // Give each section 70% of the available space (not divided among
    // open sections). Users scroll the panel to reach different sections.
    // This provides a large viewport per section while still constraining
    // content so it can't bleed past the section boundary.
    const availH=Math.max(panelH-fixedH,300);
    const perSection=Math.max(Math.round(availH*0.7),300);
    sections.forEach(sec=>{
        const ct=sec.querySelector('.sp-section-content');
        if(!ct)return;
        if(sec.classList.contains('sp-open')){
            // Only constrain if content is taller than available space
            if(ct.scrollHeight>perSection){
                ct.style.height=perSection+'px';
                ct.style.maxHeight='';
            }else{
                ct.style.height='auto';
                ct.style.maxHeight='';
            }
        }else{
            ct.style.height='';ct.style.maxHeight='';
        }
    });
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
        // Recalculate section heights when toggling
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
