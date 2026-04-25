// src/ui/message.js — Message Integration (per-message buttons, onCharMsg, renderExisting)
import { log, warn, err } from '../logger.js';
import { t } from '../i18n.js';
import { MES_ICON_SVG } from '../constants.js';
import { SP_MARKER_START } from '../generation/extraction.js';
import { getSettings } from '../settings.js';
import { getTrackerData, getLatestSnapshot, getSnapshotFor, saveSnapshot } from '../settings.js';
import { normalizeTracker } from '../normalize.js';
import { esc } from '../utils.js';
import {
    generating, genNonce, setLastGenSource,
    genMeta, setGenMeta,
    currentSnapshotMesIdx, setCurrentSnapshotMesIdx,
    inlineExtractionDone, setInlineExtractionDone,
    inlineGenStartMs, setInlineGenStartMs,
    pendingInlineIdx, setPendingInlineIdx,
    _inlineWaitTimerId, set_inlineWaitTimerId,
    cancelRequested
} from '../state.js';
import { generateTracker, continuationReprompt } from '../generation/engine.js';
import { extractInlineTracker } from '../generation/extraction.js';
import { stopStreamingHider } from '../generation/streaming.js';
import { processExtraction } from '../generation/pipeline.js';
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
        if(panel){spAutoShow();const body=document.getElementById('sp-panel-body');showLoadingOverlay(body,t('Generating Scene'),t('Analyzing context'));showStopButton();startElapsedTimer()}
        showThoughtLoading(t('Generating Scene'),t('Analyzing context'));
        const preNonce=genNonce;
        try{
            const r=await generateTracker(id);
            if(genNonce>preNonce+1){log('Mes-btn: stale caller');this.classList.remove('sp-generating');return}
            hideStopButton();stopElapsedTimer();
            clearLoadingOverlay(document.getElementById('sp-panel-body'));clearThoughtLoading();
            this.classList.remove('sp-generating');
            if(!r){const snap=getLatestSnapshot();const body=document.getElementById('sp-panel-body');if(snap){const norm=normalizeTracker(snap);updatePanel(norm)}else if(body)body.innerHTML='<div class="sp-error"><div style="font-weight:700;margin-bottom:4px">'+t('Generation Failed')+'</div><div style="font-size:10px">'+t('Network timeout or API issue. Try \u27F3 Regen or check debug log.')+'</div></div>'}
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
        // Guard: only extract when ScenePulse actually injected a prompt.
        // Other extensions (e.g. MemoryBooks) may render messages from their own generations.
        if(inlineGenStartMs<=0){
            log('onCharMsg [inline]: skipping — ScenePulse did not inject into this generation cycle (inlineGenStartMs=0)');
            return;
        }
        // FALLBACK: GENERATION_ENDED didn't extract (empty msg, timing issue)
        // Remove waiting indicators
        try{if(_inlineWaitTimerId){clearInterval(_inlineWaitTimerId);set_inlineWaitTimerId(null)}const w=document.getElementById('sp-inline-wait');if(w)w.remove()}catch{}
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
            const fullMsgLen=(chat[idx]?.mes||'').length+JSON.stringify(extracted).length;
            const _compTokens=Math.round(fullMsgLen/4);
            const _elapsed=inlineGenStartMs>0?((Date.now()-inlineGenStartMs)/1000):0;
            setGenMeta({...genMeta, promptTokens:0, completionTokens:_compTokens, elapsed:_elapsed});
            setInlineGenStartMs(0);
            log('onCharMsg [inline]: extracted tracker from message',idx,'keys=',Object.keys(extracted).length,'~tokens:',_compTokens);
            setInlineExtractionDone(true);setPendingInlineIdx(-1);
            stopStreamingHider();
            await processExtraction(idx, extracted, 'auto:together', {
                promptTokens:0, completionTokens:_compTokens, elapsed:_elapsed,
                stopHider:false, unlockGen:true
            });
            log('onCharMsg [inline]: pipeline complete');
        } else {
            const msgText=chat[idx]?.mes||'';
            const msgReasoning=chat[idx]?.extra?.reasoning||'';
            const msgLen=msgText.length;
            // Distinguish failure modes: markers absent (prompt-following failure) vs markers present
            // but JSON parse failed (sampling/formatting failure). Different root causes, different fixes.
            const _markersPresent=(msgText+msgReasoning).indexOf(SP_MARKER_START)!==-1;
            const _failureKind=_markersPresent?'markers found, JSON unparseable':'no SP markers';
            log('onCharMsg [inline]: no tracker found in message',idx,'('+msgLen+' chars,',_failureKind+')');
            // If the AI wrote content but omitted the tracker, recover.
            if(msgLen>100&&s.autoGenerate&&!generating&&s.fallbackEnabled!==false){
                const fbProfile=s.fallbackProfile||s.connectionProfile||'';
                const fbPreset=s.fallbackPreset||s.chatPreset||'';
                if(!fbProfile&&!fbPreset){
                    // No fallback profile configured -- show recovery card in panel
                    stopStreamingHider();
                    warn('Together mode: tracker extraction failed ('+msgLen+' chars, '+_failureKind+'). No fallback profile configured.');
                    _showRecoveryCard(idx);
                } else {
                    stopStreamingHider(); // Stop the hider since we're switching to recovery
                    const panel=document.getElementById('sp-panel');
                    if(panel){spAutoShow();showLoadingOverlay(document.getElementById('sp-panel-body'),t('Generating Scene'),t('Analyzing context'));showStopButton();startElapsedTimer()}
                    showChatBanner('Generating tracker');

                    // ── Tier 1: cheap continuation re-prompt ──
                    // Only attempt for the "no SP markers" failure mode where the model wrote
                    // a normal narrative but forgot the appendix. This is much cheaper than a
                    // full separate generation: ~600-2500 prompt tokens vs ~6000, ~10-15s vs
                    // ~40s, and the tracker is generated from the *exact* narrative the user
                    // is reading rather than re-derived from message context.
                    //
                    // We skip this tier if markers were present (JSON parse failure) — re-asking
                    // the model wouldn't change the underlying sampling/formatting glitch, so
                    // jump straight to the full separate generation in that case.
                    let result=null;
                    if(!_markersPresent && msgLen>=500 && msgLen<=2500){
                        warn('Together mode: tracker extraction failed ('+msgLen+' chars, '+_failureKind+'). Attempting continuation re-prompt...');
                        setLastGenSource('auto:together:continuation');
                        try{
                            const cont=await continuationReprompt(msgText,{profile:fbProfile,preset:fbPreset});
                            if(cont){
                                // Forward through the normal pipeline so save/normalize/update
                                // are identical to every other extraction path.
                                const meta=cont._spContinuationMeta||{};
                                delete cont._spContinuationMeta;
                                await processExtraction(idx, cont, 'auto:together:continuation', {
                                    promptTokens:meta.promptTokens||0,
                                    completionTokens:meta.completionTokens||0,
                                    elapsed:meta.elapsed||0,
                                    stopHider:false, unlockGen:false  // unlockGen handled by continuationReprompt
                                });
                                result=cont; // signal success to skip the full fallback
                                log('Together continuation: succeeded in',(meta.elapsed||0).toFixed(1)+'s — skipped full separate generation');
                            } else {
                                log('Together continuation: failed, escalating to full separate generation');
                            }
                        }catch(e){
                            warn('Together continuation: exception, escalating to full separate generation:',e?.message||String(e));
                        }
                    }

                    // ── Tier 2: full separate generation (if continuation skipped or failed) ──
                    // v6.23.7: skip Tier 2 if the user cancelled during Tier 1.
                    // Pre-v6.23.7 the cancel flag was only consulted by individual
                    // generation functions, so cancelling continuation immediately
                    // kicked off a fresh full-context separate-generation call —
                    // and that one ALSO did the visible preset switch via
                    // withProfileAndPreset, which the user reasonably read as "I
                    // cancelled but it kept going AND swapped my preset." Treat
                    // a manual cancel as a hard stop on the whole recovery chain.
                    if(!result && cancelRequested){
                        log('Together fallback: Tier 2 skipped — user cancelled during Tier 1');
                        result=null;
                    } else if(!result){
                        warn('Together mode: falling back to full separate generation ('+msgLen+' chars, '+_failureKind+')');
                        setLastGenSource('auto:together:fallback');
                        result=await generateTracker(idx,null,{profile:fbProfile,preset:fbPreset});
                        if(result){
                            const norm=normalizeTracker(result);
                            updatePanel(norm);spPostGenShow();
                            log('Together fallback: separate generation succeeded via profile=',fbProfile||'(current)');
                        } else {
                            warn('Together fallback: separate generation also failed');
                            _showRecoveryCard(idx);
                            const prev=getLatestSnapshot();
                            if(prev){const norm=normalizeTracker(prev);updatePanel(norm);spPostGenShow()}
                        }
                    }

                    hideStopButton();stopElapsedTimer();
                    clearLoadingOverlay(document.getElementById('sp-panel-body'));clearThoughtLoading();
                }
            } else if(msgLen>100&&!s.fallbackEnabled){
                log('Together mode: AI omitted tracker, fallback disabled by user');
                stopStreamingHider();
            }
            // Always show existing data if we didn't successfully generate new data
            const prev=getLatestSnapshot();
            if(prev){const norm=normalizeTracker(prev);updatePanel(norm);spPostGenShow()}
            // Defensive: clear inline generation ownership state on ALL recovery exit
            // paths — continuation success, continuation→tier2 success, tier2 failure,
            // recovery card shown, and fallback-disabled. The success path above
            // already resets these, but the failure branch previously leaked
            // inlineGenStartMs>0, which could misroute a subsequent message from
            // another extension (e.g. MemoryBooks) into ScenePulse's extraction path.
            setInlineGenStartMs(0);setInlineExtractionDone(false);setPendingInlineIdx(-1);
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
        if(panel){spAutoShow();showLoadingOverlay(document.getElementById('sp-panel-body'),t('Generating Scene'),t('Analyzing context'));showStopButton();startElapsedTimer()}
        showChatBanner(t('Generating Scene'));
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
            else if(body)body.innerHTML='<div class="sp-empty-state"><div class="sp-empty-icon">\u27F3</div><div class="sp-empty-title">'+t('No scene data yet')+'</div><div class="sp-empty-sub">'+t('Send a message or click ⟳ to generate.')+'</div></div>';
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
    // RECOVERY: If no snapshots found, walk every AI message that contains
    // an inline tracker block, extract each, and replay them through delta-
    // merge so the wiki / character-history have a complete record. Without
    // this, starting ScenePulse on an existing N-message chat would only
    // recover ONE snapshot (the last) — every character introduced in
    // earlier messages would be missing from history. (Issue #11)
    if(!latest&&getSettings().injectionMethod==='inline'){
        try{
            const{chat}=SillyTavern.getContext();
            const{mergeDelta:_md}=await import('../generation/delta-merge.js');
            let recovered=0;
            let mergedSoFar=null;
            for(let i=0;i<chat.length;i++){
                if(chat[i]?.is_user)continue;
                const raw=chat[i]?.mes||'';
                if(!(raw.includes(SP_MARKER_START)||raw.match(/```json\s*\n?[\s\S]{500,}```\s*$/)))continue;
                const extracted=extractInlineTracker(i);
                if(!extracted)continue;
                // Replay each extracted block through delta-merge against
                // the running merged state so off-scene characters persist
                // across the recovered timeline. Idempotent: identical
                // raw payloads always produce identical merged output.
                const merged=mergedSoFar?_md(mergedSoFar,extracted):extracted;
                const norm=normalizeTracker(merged);
                setCurrentSnapshotMesIdx(i);
                saveSnapshot(i,norm);
                mergedSoFar=norm;
                latest=norm;
                latestKey=i;
                recovered++;
            }
            if(recovered>0){
                await ensureChatSaved();
                log('renderExisting: backfilled',recovered,'snapshots from chat history');
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
        if(body)body.innerHTML='<div class="sp-empty-state"><div class="sp-empty-icon">\u27F3</div><div class="sp-empty-title">'+t('No scene data yet')+'</div><div class="sp-empty-sub">'+t('Send a message or click ⟳ to generate.')+'</div></div>';
        log('renderExisting: no snapshots, showing empty panel');
    }
    try{document.querySelectorAll('.mes:not([is_user="true"])').forEach(el=>addMesButton(el))}catch(e){warn('addButtons:',e)}
    }catch(e){err('renderExisting:',e)}
}

// ── Recovery card: shown when extraction fails and no fallback is configured ──
function _showRecoveryCard(mesIdx) {
    const body = document.getElementById('sp-panel-body');
    if (!body) return;
    // Don't duplicate if already showing
    if (body.querySelector('.sp-recovery-card')) return;
    const card = document.createElement('div');
    card.className = 'sp-recovery-card';
    card.innerHTML = `<div class="sp-recovery-icon">⚠</div>
        <div class="sp-recovery-title">${t('Extraction Failed')}</div>
        <div class="sp-recovery-sub">${t('AI did not include tracker data in message')} #${mesIdx}.</div>
        <div class="sp-recovery-actions">
            <button class="sp-btn sp-recovery-retry">${t('Retry')}</button>
            <button class="sp-btn sp-recovery-dismiss">${t('Dismiss')}</button>
        </div>`;
    card.querySelector('.sp-recovery-retry').addEventListener('click', async () => {
        card.remove();
        setLastGenSource('manual:recovery');
        const result = await generateTracker(mesIdx);
        if (result) {
            const norm = normalizeTracker(result);
            updatePanel(norm);
            spPostGenShow();
        }
    });
    card.querySelector('.sp-recovery-dismiss').addEventListener('click', () => card.remove());
    // Insert at top of panel body
    body.insertBefore(card, body.firstChild);
}
