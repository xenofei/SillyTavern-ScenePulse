// ── streaming.js — Streaming Tracker Hider ──
// During together mode, hide the SP_TRACKER JSON as it streams into the message.
// Uses an injected <style> rule instead of inline styles — CSS rules survive DOM recreation
// when other extensions or other extensions trigger profile switches that reload the chat.

import { log } from '../logger.js';
import {
    _streamHiderInterval, _streamHiderStart, _streamHiderStyleEl, _streamHiderObserver,
    set_streamHiderInterval, set_streamHiderStart, set_streamHiderStyleEl, set_streamHiderObserver
} from '../state.js';

export function startStreamingHider(){
    stopStreamingHider();
    set_streamHiderStart(Date.now());
    const styleEl=document.createElement('style');
    styleEl.id='sp-stream-hider-style';
    document.head.appendChild(styleEl);
    set_streamHiderStyleEl(styleEl);
    let _safeH=0;let _locked=false;let _observer=null;let _mesId=null;let _lastMes=null;
    log('StreamHider: started');

    const _hasJson=(txt)=>{
        if(txt.includes('SP_TRACKER_START'))return true;
        if(txt.includes('<!--SP_T'))return true; // Partial marker detection
        if(txt.includes('```json'))return true;
        // Catch raw JSON with tracker-like keys
        if(txt.includes('"time"')&&(txt.includes('"sceneTopic"')||txt.includes('"sceneMood"')||txt.includes('"sceneTension"')||txt.includes('"location"')))return true;
        if(txt.includes('"time":')&&txt.includes('"date":'))return true;
        const lo=txt.lastIndexOf('{');
        if(lo>50&&txt.indexOf('"time"',lo)!==-1&&txt.indexOf('"time"',lo)-lo<60)return true;
        return false;
    };

    const _sel=()=>_mesId?`.mes[mesid="${_mesId}"] .mes_text`:`.mes:last-child .mes_text`;

    // PROACTIVE: Cap message height on EVERY mutation. When JSON starts, the cap
    // freezes at the last safe height — JSON renders behind overflow:hidden.
    const _updateCap=()=>{
        const currentStyleEl=_streamHiderStyleEl;
        if(!_lastMes||!currentStyleEl)return;
        if(_locked)return;
        const txt=_lastMes.textContent||'';
        if(_hasJson(txt)){
            // JSON detected — freeze at last known safe height (from PREVIOUS update)
            _locked=true;
            const capPx=Math.max(40,Math.ceil(_safeH));
            currentStyleEl.textContent=`${_sel()}{max-height:${capPx}px!important;overflow:hidden!important}`;
            if(_lastMes)_lastMes.dataset.spHasTracker='true';
            log('StreamHider: LOCKED at',capPx+'px mesid='+_mesId);
            return;
        }
        // No JSON yet — update safe height and apply tight rolling cap
        // scrollHeight gives the full content height regardless of max-height constraint
        const sh=_lastMes.scrollHeight;
        if(sh>_safeH)_safeH=sh;
        // Cap at scrollHeight + 1 line (~20px) — only 1 new line can appear before next check
        const capPx=Math.ceil(_safeH+20);
        currentStyleEl.textContent=`${_sel()}{max-height:${capPx}px!important;overflow:hidden!important}`;
    };

    // MutationObserver: fires on every DOM change to last message
    const _setupObserver=()=>{
        if(_observer)return;
        const mesTexts=document.querySelectorAll('.mes_text');
        if(!mesTexts.length)return;
        _lastMes=mesTexts[mesTexts.length-1];
        _mesId=_lastMes.closest('.mes')?.getAttribute('mesid');
        _observer=new MutationObserver(_updateCap);
        set_streamHiderObserver(_observer); // Store at module level for cleanup
        _observer.observe(_lastMes,{childList:true,subtree:true,characterData:true});
    };

    // Polling fallback at 40ms (fast detection)
    const interval=setInterval(()=>{
        try{
            if(Date.now()-_streamHiderStart>180000){log('StreamHider: safety timeout (180s)');stopStreamingHider();return}
            _setupObserver();
            if(_observer){
                // Observer is active — stop polling, let MutationObserver handle updates
                clearInterval(interval);set_streamHiderInterval(null);
            }
            _updateCap();
        }catch(e){}
    },40);
    set_streamHiderInterval(interval);
}
export function stopStreamingHider(){
    if(_streamHiderInterval){
        const elapsed=_streamHiderStart?Math.round((Date.now()-_streamHiderStart)/1000):0;
        log('StreamHider: stopped after',elapsed+'s');
        clearInterval(_streamHiderInterval);set_streamHiderInterval(null);
    }
    // Disconnect MutationObserver
    if(_streamHiderObserver){try{_streamHiderObserver.disconnect()}catch(e){}set_streamHiderObserver(null)}
    // Remove the CSS rule after a delay — gives extraction time to clean the DOM
    const styleElRef=_streamHiderStyleEl;
    setTimeout(()=>{if(styleElRef){styleElRef.remove();set_streamHiderStyleEl(null)}},600);
}
