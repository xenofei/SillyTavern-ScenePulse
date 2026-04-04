// src/ui/section.js — Collapsible section builder for the panel
import { log } from '../logger.js';
import { esc } from '../utils.js';
import { getSettings, saveSettings } from '../settings.js';
import { generating, setLastGenSource } from '../state.js';
import { generateTracker } from '../generation/engine.js';
import { showLoadingOverlay, clearLoadingOverlay, showStopButton, hideStopButton } from './loading.js';

export function mkSection(key,title,badge,fn,s){
    const sec=document.createElement('div');sec.className='sp-section'+((s.openSections?.[key])?' sp-open':'');sec.dataset.key=key;
    const h=document.createElement('div');h.className='sp-section-header';
    h.innerHTML=`<span class="sp-section-chevron">\u25B6</span><span class="sp-section-title">${esc(title)}</span>${badge!=null?`<span class="sp-section-badge">${esc(String(badge))}</span>`:''}<span class="sp-section-spacer"></span><button class="sp-section-refresh" title="Refresh ${title}"><svg viewBox="0 0 16 16" width="12" height="12" fill="none"><path d="M13.5 8a5.5 5.5 0 1 1-1.3-3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M13.5 3v2h-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
    const chevronArea=h.querySelector('.sp-section-chevron');
    // Click anywhere on header toggles, except refresh button (debounced)
    let _secDebounce=false;
    h.addEventListener('click',(e)=>{
        if(e.target.closest('.sp-section-refresh'))return;
        if(_secDebounce)return;_secDebounce=true;setTimeout(()=>_secDebounce=false,200);
        e.stopPropagation();sec.classList.toggle('sp-open');
        const st=getSettings();if(!st.openSections)st.openSections={};
        st.openSections[key]=sec.classList.contains('sp-open');saveSettings();
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
