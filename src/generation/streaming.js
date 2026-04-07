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
        if(txt.includes('SP_TRACKER'))return true;    // Any part of SP_TRACKER_START or _END
        if(txt.includes('<!--SP_'))return true;       // Earliest partial marker (just 7 chars)
        if(txt.includes('[SCENE TRACKER'))return true; // Echoed instruction header
        if(txt.includes('MANDATORY APPENDIX'))return true; // Echoed instruction fragment
        if(txt.includes('SP_TRACKER_START'))return true; // Instruction text echoed verbatim
        if(txt.includes('```json'))return true;
        // Catch raw JSON — detect as early as possible
        if(txt.includes('"time":')&&txt.includes('"elapsed":'))return true;
        if(txt.includes('"time":')&&txt.includes('"date":'))return true;
        if(txt.includes('"time":')&&txt.includes('"location":'))return true;
        if(txt.includes('"sceneTopic"'))return true;  // Unique to SP schema
        if(txt.includes('"sceneMood"'))return true;
        if(txt.includes('"sceneTension"'))return true;
        // Detect opening brace followed by "time" key near the end of message
        const lo=txt.lastIndexOf('{');
        if(lo>50&&txt.indexOf('"time"',lo)!==-1&&txt.indexOf('"time"',lo)-lo<80)return true;
        return false;
    };

    const _sel=()=>_mesId?`.mes[mesid="${_mesId}"] .mes_text`:`.mes:last-child .mes_text`;

    // STRATEGY: Always apply a rolling max-height cap during streaming.
    // When JSON is detected, the cap freezes — JSON is behind overflow:hidden.
    // To measure true content height while a cap is active, we temporarily
    // remove the cap, read scrollHeight, then reapply.
    const _updateCap=()=>{
        const currentStyleEl=_streamHiderStyleEl;
        if(!_lastMes||!currentStyleEl)return;
        if(_locked)return;
        const txt=_lastMes.textContent||'';
        if(_hasJson(txt)){
            // JSON detected — freeze at last safe height
            _locked=true;
            const capPx=Math.max(40,Math.ceil(_safeH));
            currentStyleEl.textContent=`${_sel()}{max-height:${capPx}px!important;overflow:hidden!important}`;
            if(_lastMes)_lastMes.dataset.spHasTracker='true';
            log('StreamHider: LOCKED at',capPx+'px mesid='+_mesId);
            return;
        }
        // No JSON — measure true content height by briefly removing cap
        currentStyleEl.textContent=''; // Remove cap temporarily
        const trueH=_lastMes.scrollHeight; // Measure full content height
        if(trueH>_safeH)_safeH=trueH;
        // Reapply cap at measured height + small buffer (1 line)
        const capPx=Math.ceil(_safeH+22);
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

    // Polling fallback at 20ms (aggressive detection)
    const interval=setInterval(()=>{  // 20ms polling
        try{
            if(Date.now()-_streamHiderStart>180000){log('StreamHider: safety timeout (180s)');stopStreamingHider();return}
            _setupObserver();
            if(_observer){
                // Observer is active — stop polling, let MutationObserver handle updates
                clearInterval(interval);set_streamHiderInterval(null);
            }
            _updateCap();
        }catch(e){}
    },20);
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
