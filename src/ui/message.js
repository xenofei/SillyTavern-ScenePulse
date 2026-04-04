// src/ui/message.js — Message Integration (per-message buttons, onCharMsg, renderExisting)
import { log, warn, err } from '../logger.js';
import { MES_ICON_SVG } from '../constants.js';
import { SP_MARKER_START } from '../generation/extraction.js';
import { getSettings } from '../settings.js';
import { getTrackerData, getLatestSnapshot, getSnapshotFor, saveSnapshot } from '../settings.js';
import { normalizeTracker } from '../normalize.js';
import { esc } from '../utils.js';
import {
    generating, genNonce, lastGenSource, setLastGenSource,
    genMeta, setGenMeta,
    currentSnapshotMesIdx, setCurrentSnapshotMesIdx,
    inlineExtractionDone, setInlineExtractionDone,
    inlineGenStartMs, setInlineGenStartMs,
    pendingInlineIdx, setPendingInlineIdx,
    lastRawResponse, setLastRawResponse
} from '../state.js';
import { generateTracker } from '../generation/engine.js';
import { extractInlineTracker } from '../generation/extraction.js';
import { stopStreamingHider } from '../generation/streaming.js';
import { ensureChatSaved, anyPanelsActive } from '../settings.js';
import { spAutoShow, spPostGenShow, spSetGenerating } from './mobile.js';
import { showLoadingOverlay, clearLoadingOverlay, showStopButton, hideStopButton, startElapsedTimer, stopElapsedTimer, showThoughtLoading, showChatBanner, clearThoughtLoading } from './loading.js';
import { updatePanel } from './update-panel.js';
import { updateThoughts } from './thoughts.js';
import { createPanel, showPanel, hidePanel } from './panel.js';
import { renderTimeline } from './timeline.js';

// Delete snapshot and refresh timeline when a message is deleted
export function spOnMessageDeleted(mesIdx){
    const data=getTrackerData();
    const key=String(mesIdx);
    if(data.snapshots[key]){
        delete data.snapshots[key];
        log('Snapshot deleted for mesIdx=',mesIdx);
        // Re-render timeline
        const sorted=Object.keys(data.snapshots).map(Number).sort((a,b)=>a-b);
        if(sorted.length){
            const latestKey=sorted[sorted.length-1];
            setCurrentSnapshotMesIdx(latestKey);
            const norm=normalizeTracker(data.snapshots[String(latestKey)]);
            updatePanel(norm);
        }
        renderTimeline();
        spSetGenerating(false); // Clear any stale pulse
        try{ensureChatSaved()}catch(e){warn('snapshot delete save:',e)}
    }
}

export function addMesButton(el){
    if(el.querySelector('.sp-mes-btn'))return;
    const btns=el.querySelector('.mes_buttons .extraMesButtons')||el.querySelector('.extraMesButtons')||el.querySelector('.mes_buttons');
    if(!btns){log('No button container for mesid',el.getAttribute('mesid'));return}
    const btn=document.createElement('div');btn.className='sp-mes-btn mes_button';btn.title='ScenePulse: Regenerate scene from this message';
    btn.innerHTML=`<span>${MES_ICON_SVG}</span>`;
    btn.addEventListener('click',async function(e){
        e.stopPropagation();e.preventDefault();
        const mes=this.closest('.mes');if(!mes){warn('No .mes parent found');return}
        const id=Number(mes.getAttribute('mesid'));
        log('Mes button clicked for id:',id);
        setLastGenSource('manual:message');

        if(this.classList.contains('sp-generating')){log('Already generating');return}
        this.classList.add('sp-generating');
        const panel=document.getElementById('sp-panel');
        if(panel){spAutoShow();const body=document.getElementById('sp-panel-body');showLoadingOverlay(body,'Generating Scene','Reading context and analyzing characters');showStopButton();startElapsedTimer()}
        showThoughtLoading('Updating thoughts','Analyzing context');
        const preNonce=genNonce;
        try{
            const r=await generateTracker(id);
            if(genNonce>preNonce+1){log('Mes-btn: stale caller');this.classList.remove('sp-generating');return}
            hideStopButton();stopElapsedTimer();
            clearLoadingOverlay(document.getElementById('sp-panel-body'));clearThoughtLoading();
            this.classList.remove('sp-generating');
            if(!r){const snap=getLatestSnapshot();const body=document.getElementById('sp-panel-body');if(snap){const norm=normalizeTracker(snap);updatePanel(norm)}else if(body)body.innerHTML='<div class="sp-error"><div style="font-weight:700;margin-bottom:4px">Generation Failed</div><div style="font-size:10px">Network timeout or API issue. Try \u27F3 Regen or check debug log.</div></div>'}
        }catch(ex){
            err('Mes button gen error:',ex);
            hideStopButton();clearLoadingOverlay(document.getElementById('sp-panel-body'));clearThoughtLoading();
            this.classList.remove('sp-generating');
        }
    });
    btns.appendChild(btn);
}

export async function onCharMsg(idx){
    const s=getSettings();if(!s.enabled)return;
    if(!anyPanelsActive()){return}  // Nothing to extract/generate for
    const{chat}=SillyTavern.getContext();if(!chat[idx]||chat[idx].is_user)return;
    log('onCharMsg: idx=',idx,'method=',s.injectionMethod,'generating=',generating,'inlineExtDone=',inlineExtractionDone,'pendingIdx=',pendingInlineIdx);
    const el=document.querySelector(`.mes[mesid="${idx}"]`);if(!el)return;
    addMesButton(el);
    // Don't auto-generate on empty/greeting-only chats -- need at least one user message
    const hasUserMsg=chat.some(m=>m.is_user);
    if(!hasUserMsg){log('onCharMsg: no user messages yet, skipping auto-gen');return}

    // ── INLINE/TOGETHER MODE: Extract tracker from AI response ──
    if(s.injectionMethod==='inline'){
        // If GENERATION_ENDED already extracted successfully, skip
        if(inlineExtractionDone){
            log('onCharMsg [inline]: extraction already complete (via GENERATION_ENDED), skipping');
            return;
        }
        // FALLBACK: GENERATION_ENDED didn't extract (empty msg, timing issue)
        // Remove waiting indicators
        try{const w=document.getElementById('sp-inline-wait');if(w){if(w._timerInterval)clearInterval(w._timerInterval);w.remove()}}catch{}
        clearThoughtLoading();
        setPendingInlineIdx(idx);
        log('onCharMsg [inline]: GENERATION_ENDED missed, retrying as fallback');
        // Streaming may not have finished -- retry extraction with delay if message is empty
        let extracted=extractInlineTracker(idx);
        if(!extracted){
            const msgLen=(chat[idx]?.mes||'').length;
            if(msgLen<100){
                log('onCharMsg [inline]: message too short ('+msgLen+' chars), waiting 2s for streaming...');
                await new Promise(r=>setTimeout(r,2000));
                // Re-read chat in case it updated
                const{chat:freshChat}=SillyTavern.getContext();
                if(freshChat[idx])extracted=extractInlineTracker(idx);
                if(!extracted){
                    log('onCharMsg [inline]: retry after 2s, still no tracker, waiting 4s more...');
                    await new Promise(r=>setTimeout(r,4000));
                    const{chat:freshChat2}=SillyTavern.getContext();
                    if(freshChat2[idx])extracted=extractInlineTracker(idx);
                }
            }
        }
        if(extracted){
            // Estimate tokens from together mode -- use full message length (narrative + tracker)
            const fullMsgLen=(chat[idx]?.mes||'').length+JSON.stringify(extracted).length; // mes already stripped, add tracker back
            const trackerJson=JSON.stringify(extracted);
            setGenMeta({...genMeta, promptTokens:0, completionTokens:Math.round(fullMsgLen/4), elapsed:inlineGenStartMs>0?((Date.now()-inlineGenStartMs)/1000):0});
            setInlineGenStartMs(0);
            log('onCharMsg [inline]: extracted tracker from message',idx,'keys=',Object.keys(extracted).length,'~tracker_tokens:',genMeta.completionTokens);
            setInlineExtractionDone(true);setPendingInlineIdx(-1);
            stopStreamingHider();
            log('onCharMsg [inline]: extraction complete, hider stopped');
            setLastGenSource('auto:together');
            setLastRawResponse(JSON.stringify(extracted,null,2)); // store for debug copy
            const norm=normalizeTracker(extracted);
            // Debug summary
            log('=== TOGETHER MODE SUMMARY === source=',lastGenSource);
            log('  chars:',norm.characters?.length||0,'rels:',norm.relationships?.length||0);
            log('  quests: main=',norm.mainQuests?.length||0,'side=',norm.sideQuests?.length||0,'tasks=',norm.activeTasks?.length||0);
            log('  ideas:',norm.plotBranches?.length||0,'northStar:',JSON.stringify(norm.northStar||'').substring(0,50));
            log('  scene: topic='+(norm.sceneTopic?'\u2713':'\u2717'),'mood='+(norm.sceneMood?'\u2713':'\u2717'),'tension='+(norm.sceneTension?'\u2713':'\u2717'));
            if(norm.characters?.length)for(const c of norm.characters)log('  char:',c.name,'role=',c.role?'\u2713':'\u2717','thought=',c.innerThought?'\u2713':'\u2717');
            if(norm.relationships?.length)for(const r of norm.relationships)log('  rel:',r.name,'aff=',r.affection,'trust=',r.trust,'desire=',r.desire,'compat=',r.compatibility);
            setCurrentSnapshotMesIdx(idx);
            extracted._spMeta={promptTokens:genMeta.promptTokens,completionTokens:genMeta.completionTokens,elapsed:genMeta.elapsed,source:lastGenSource,injectionMethod:'inline'};
            saveSnapshot(idx,extracted);
            await ensureChatSaved(); // Flush to disk before profile cascade can trigger CHAT_CHANGED
            updatePanel(norm);spPostGenShow();
            spSetGenerating(false); // Pulse off -- onCharMsg extraction succeeded
        } else {
            const msgLen=(chat[idx]?.mes||'').length;
            log('onCharMsg [inline]: no tracker found in message',idx,'('+msgLen+' chars)');
            // If the AI wrote content but omitted the tracker, fall back to separate generation
            if(msgLen>100&&s.autoGenerate&&!generating&&s.fallbackEnabled!==false){
                const fbProfile=s.fallbackProfile||s.connectionProfile||'';
                const fbPreset=s.fallbackPreset||s.chatPreset||'';
                if(!fbProfile&&!fbPreset){
                    // No fallback profile configured -- show toast nudge, don't silently fail
                    stopStreamingHider();
                    warn('Together mode: AI omitted tracker ('+msgLen+' chars). No fallback profile configured.');
                    toastr.warning('AI omitted tracker data. Set up a fallback profile in ScenePulse settings for automatic recovery.','ScenePulse',{timeOut:8000});
                } else {
                    warn('Together mode: AI omitted tracker payload ('+msgLen+' chars narrative, no SP markers). Falling back to separate generation.');
                    stopStreamingHider(); // Stop the hider since we're switching to separate mode
                    setLastGenSource('auto:together:fallback');
                    const panel=document.getElementById('sp-panel');
                    if(panel){spAutoShow();showLoadingOverlay(document.getElementById('sp-panel-body'),'Generating Scene','Together mode missed \u2014 running separate');showStopButton();startElapsedTimer()}
                    showChatBanner('Generating tracker');
                    const result=await generateTracker(idx,null,{profile:fbProfile,preset:fbPreset});
                    hideStopButton();stopElapsedTimer();
                    clearLoadingOverlay(document.getElementById('sp-panel-body'));clearThoughtLoading();
                    if(result){
                        const norm=normalizeTracker(result);
                        updatePanel(norm);spPostGenShow();
                        log('Together fallback: separate generation succeeded via profile=',fbProfile||'(current)');
                    } else {
                        warn('Together fallback: separate generation also failed');
                        const prev=getLatestSnapshot();
                        if(prev){const norm=normalizeTracker(prev);updatePanel(norm);spPostGenShow()}
                    }
                }
            } else if(msgLen>100&&!s.fallbackEnabled){
                log('Together mode: AI omitted tracker, fallback disabled by user');
                stopStreamingHider();
            }
            // Always show existing data if we didn't successfully generate new data
            const prev=getLatestSnapshot();
            if(prev){const norm=normalizeTracker(prev);updatePanel(norm);spPostGenShow()}
        }
        spSetGenerating(false); // Pulse off -- inline path complete
        return; // Don't do separate generation in inline mode
    }

    // ── SEPARATE MODE: Auto-generate via separate API call ──
    let snap=getSnapshotFor(idx);
    if(!snap&&s.autoGenerate){
        // CRITICAL: Save the chat to disk FIRST, then wait for ST to finish all post-save hooks.
        // withProfileAndPreset triggers connection_profile_loaded -> CHAT_CHANGED -> chat reload.
        // If the message isn't saved to disk yet, it gets lost in the reload.
        log('onCharMsg: saving chat and waiting 4s before auto-gen...');
        setLastGenSource('auto:separate');
        await ensureChatSaved();
        await new Promise(r=>setTimeout(r,4000));
        // Re-check after delay -- chat may have changed, or user may have cancelled
        const{chat:freshChat}=SillyTavern.getContext();
        if(!freshChat[idx]){log('onCharMsg: message gone after delay, aborting');return}
        if(generating){log('onCharMsg: already generating after delay, skipping');return}
        const panel=document.getElementById('sp-panel');
        if(panel){spAutoShow();showLoadingOverlay(document.getElementById('sp-panel-body'),'Generating Scene','Reading context and analyzing characters');showStopButton();startElapsedTimer()}
        showChatBanner('Updating thoughts');
        const preNonce=genNonce;
        snap=await generateTracker(idx);
        if(genNonce>preNonce+1){log('Auto-gen: stale caller, cancel handled UI');return}
        hideStopButton();stopElapsedTimer();
        clearLoadingOverlay(document.getElementById('sp-panel-body'));clearThoughtLoading();
        if(snap)updateThoughts(snap);
        else{
            // Cancelled or failed -- restore previous or show empty
            const prev=getLatestSnapshot();const body=document.getElementById('sp-panel-body');
            if(prev){const norm=normalizeTracker(prev);updatePanel(norm)}
            else if(body)body.innerHTML='<div class="sp-empty-state"><div class="sp-empty-icon">\u27F3</div><div class="sp-empty-title">No scene data yet</div><div class="sp-empty-sub">Send a message or click <strong>\u27F3</strong> to generate.</div></div>';
        }
    }else if(snap){
        const norm=normalizeTracker(snap);updatePanel(norm);
    }
}

export async function renderExisting(){
    if(!getSettings().enabled){hidePanel();return}
    // If a generation is active, don't touch the panel -- the overlay is showing
    if(generating){log('renderExisting: generation active, skipping panel update');return}
    try{
    createPanel(); // Ensure panel exists
    const all=getTrackerData();const sorted=Object.keys(all.snapshots).map(Number).sort((a,b)=>a-b);
    log('renderExisting:',sorted.length,'snapshots');
    let latestRaw=null;let latestKey=null;
    for(const k of sorted){
        const el=document.querySelector(`.mes[mesid="${k}"]`);
        if(el){try{addMesButton(el)}catch(e){warn('addMesButton:',e)}}
        latestRaw=all.snapshots[String(k)];latestKey=k;setCurrentSnapshotMesIdx(k);
    }
    let latest=null;
    if(latestRaw){
        try{
            log('renderExisting: normalizing latest snapshot',latestKey,'raw keys=',Object.keys(latestRaw||{}).join(','));
            latest=normalizeTracker(latestRaw);
        }catch(e){warn('normalize snapshot',latestKey,':',e)}
    }
    // RECOVERY: If no snapshots found, check if any AI messages contain unextracted inline tracker data
    if(!latest&&getSettings().injectionMethod==='inline'){
        try{
            const{chat}=SillyTavern.getContext();
            for(let i=chat.length-1;i>=0;i--){
                if(chat[i]?.is_user)continue;
                const raw=chat[i]?.mes||'';
                if(raw.includes(SP_MARKER_START)||raw.match(/```json\s*\n?[\s\S]{500,}```\s*$/)){
                    log('renderExisting: found unextracted inline tracker in message',i);
                    const extracted=extractInlineTracker(i);
                    if(extracted){
                        // CRITICAL: Save snapshot so it survives subsequent CHAT_CHANGED reloads
                        setCurrentSnapshotMesIdx(i);
                        saveSnapshot(i,extracted);
                        await ensureChatSaved();
                        log('renderExisting: saved recovered snapshot for message',i);
                        latest=normalizeTracker(extracted);
                        break;
                    }
                }
            }
        }catch(e){warn('renderExisting inline recovery:',e)}
    }
    if(latest){
        log('renderExisting: latest snapshot has chars=',latest.characters?.length||0,'rels=',latest.relationships?.length||0);
        try{updatePanel(latest,true);log('renderExisting: panel updated')}catch(e){err('updatePanel:',e)}
        spAutoShow(); // Show panel BEFORE thoughts so syncThoughts sees it as visible
        try{updateThoughts(latest);log('renderExisting: thoughts updated')}catch(e){err('updateThoughts:',e)}
    } else {
        // No data yet -- show empty panel with centered waiting message
        spAutoShow();
        const body=document.getElementById('sp-panel-body');
        if(body)body.innerHTML='<div class="sp-empty-state"><div class="sp-empty-icon">\u27F3</div><div class="sp-empty-title">No scene data yet</div><div class="sp-empty-sub">Send a message or click <strong>\u27F3</strong> to generate.</div></div>';
        log('renderExisting: no snapshots, showing empty panel');
    }
    try{document.querySelectorAll('.mes:not([is_user="true"])').forEach(el=>addMesButton(el))}catch(e){warn('addButtons:',e)}
    }catch(e){err('renderExisting:',e)}
}
