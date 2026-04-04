// ── engine.js — Generation engine: preset management, profile switching, tracker generation ──

import { BUILTIN_PRESET } from '../constants.js';
import { log, warn, err } from '../logger.js';
import {
    generating, cancelRequested, genNonce, genMeta, inlineGenStartMs,
    currentSnapshotMesIdx, lastGenSource, lastRawResponse,
    _savedSamplerValues,
    setGenerating, setCancelRequested, setGenNonce, setGenMeta,
    setCurrentSnapshotMesIdx, setLastGenSource, setLastRawResponse,
    set_savedSamplerValues
} from '../state.js';
import {
    getSettings, getActiveSchema, getActivePrompt, getTrackerData,
    getLatestSnapshot, saveSnapshot, getSnapshotFor, ensureChatSaved,
    getConnectionProfiles, getChatPresets
} from '../settings.js';
import { normalizeTracker } from '../normalize.js';
import { cleanJson } from './extraction.js';
import { spSetGenerating, spPostGenShow } from '../ui/mobile.js';
import { updatePanel } from '../ui/update-panel.js';
import { cleanupGenUI } from '../ui/loading.js';

// Apply built-in preset values by temporarily adjusting ST's sampler sliders
export function applyBuiltinPreset(){
    set_savedSamplerValues({});
    const mappings=[
        {key:'temperature',selectors:['#temp_openai','#temperature_slider','#temp'],val:BUILTIN_PRESET.temperature},
        {key:'top_p',selectors:['#top_p_openai','#top_p_slider','#top_p'],val:BUILTIN_PRESET.top_p},
        {key:'frequency_penalty',selectors:['#freq_pen_openai','#frequency_penalty_slider','#freq_pen'],val:BUILTIN_PRESET.frequency_penalty},
        {key:'presence_penalty',selectors:['#pres_pen_openai','#presence_penalty_slider','#pres_pen'],val:BUILTIN_PRESET.presence_penalty},
        {key:'max_tokens',selectors:['#openai_max_tokens','#max_tokens_slider','#max_tokens'],val:BUILTIN_PRESET.max_tokens},
    ];
    for(const m of mappings){
        for(const sel of m.selectors){
            const el=document.querySelector(sel);
            if(el&&(el.type==='range'||el.type==='number'||el.tagName==='INPUT')){
                const current=_savedSamplerValues;
                current[sel]=el.value;
                set_savedSamplerValues(current);
                el.value=m.val;
                el.dispatchEvent(new Event('input',{bubbles:true}));
                log('Built-in preset: set',sel,'=',m.val,'(was',current[sel]+')');
                break; // Only set first matching selector
            }
        }
    }
}
export function restorePresetValues(){
    if(!_savedSamplerValues)return;
    for(const[sel,val]of Object.entries(_savedSamplerValues)){
        const el=document.querySelector(sel);
        if(el){el.value=val;el.dispatchEvent(new Event('input',{bubbles:true}))}
    }
    log('Built-in preset: restored',Object.keys(_savedSamplerValues).length,'sampler values');
    set_savedSamplerValues(null);
}

export async function withProfileAndPreset(pid,pre,fn){
    const ctx=SillyTavern.getContext();let pp=null,pr=null;let usedBuiltin=false;
    // Save chat BEFORE switching profile — prevents message loss if switch triggers CHAT_CHANGED
    if(pid||pre)await ensureChatSaved();
    if(pid){try{pp=document.querySelector('#connection_profiles, #connection_profile')?.value;if(typeof ctx.setConnectionProfile==='function')await ctx.setConnectionProfile(pid);else{const s=document.querySelector('#connection_profiles, #connection_profile');if(s){s.value=pid;s.dispatchEvent(new Event('change'));await new Promise(r=>setTimeout(r,300))}}}catch(e){warn('Profile:',e)}}
    if(pre){try{for(const sel of['#settings_preset_openai','#settings_preset_chat']){const el=document.querySelector(sel);if(el){const has=Array.from(el.options).some(o=>o.value===pre);if(has){pr=el.value;el.value=pre;el.dispatchEvent(new Event('change'));await new Promise(r=>setTimeout(r,200));break}}}}catch(e){warn('Preset:',e)}}
    else{
        // No custom preset selected — apply built-in GLM-5 sampler values
        applyBuiltinPreset();usedBuiltin=true;
    }
    try{return await fn()}finally{
        // Restore built-in preset values if we applied them
        if(usedBuiltin)restorePresetValues();
        // Save chat BEFORE restoring profile — the generation may have saved new data
        await ensureChatSaved();
        // Longer delay: profile restore triggers connection_profile_loaded → other extensions → CHAT_CHANGED
        await new Promise(r=>setTimeout(r,2000));
        if(pr){try{for(const sel of['#settings_preset_openai','#settings_preset_chat']){const el=document.querySelector(sel);if(el){el.value=pr;el.dispatchEvent(new Event('change'));break}}}catch{}}
        if(pp){try{if(typeof ctx.setConnectionProfile==='function')await ctx.setConnectionProfile(pp);else{const s=document.querySelector('#connection_profiles, #connection_profile');if(s){s.value=pp;s.dispatchEvent(new Event('change'))}}}catch{}}
    }
}

// Cancel: synchronous, instant. Restores UI immediately AND aborts ST's in-flight HTTP request.
export function cancelGeneration(){
    if(!generating)return;
    const oldNonce=genNonce;
    setGenNonce(genNonce+1); // invalidate in-flight generation
    setCancelRequested(true);
    setGenerating(false);spSetGenerating(false); // unlock for next generation
    log('CANCEL: nonce',oldNonce,'\u2192',genNonce,'— generation unlocked');

    // Abort SillyTavern's in-flight HTTP request — try every known method
    try{
        const ctx=SillyTavern.getContext();
        let aborted=false;

        // Method 1: ST's abortController on context
        if(ctx.abortController&&typeof ctx.abortController.abort==='function'){
            log('CANCEL: aborting via ctx.abortController');
            ctx.abortController.abort();aborted=true;
        }

        // Method 2: ST's global abortController
        if(!aborted&&window.abortController&&typeof window.abortController.abort==='function'){
            log('CANCEL: aborting via window.abortController');
            window.abortController.abort();aborted=true;
        }

        // Method 3: Try clicking ST's stop button with multiple known selectors
        const stopSelectors=['#mes_stop','.mes_stop','#stop_button','.stop_button','#form_sheld .stop_button','[id*="stop"]'];
        for(const sel of stopSelectors){
            try{
                const el=document.querySelector(sel);
                if(el){
                    log('CANCEL: found ST stop element:',sel,'visible=',el.offsetParent!==null,'display=',getComputedStyle(el).display);
                    if(el.offsetParent!==null||getComputedStyle(el).display!=='none'){
                        el.click();
                        log('CANCEL: clicked ST stop button via',sel);
                        aborted=true;break;
                    }
                }
            }catch(e2){}
        }

        // Method 4: Try jQuery click on common stop IDs
        if(!aborted){
            try{
                if(typeof $==='function'){
                    const $stop=$('#mes_stop, .mes_stop, .stop_button').filter(':visible');
                    if($stop.length){
                        $stop.first().trigger('click');
                        log('CANCEL: jQuery-clicked ST stop button');
                        aborted=true;
                    }
                }
            }catch(e3){}
        }

        if(!aborted)log('CANCEL: could not find ST abort mechanism — API call will complete in background');
    }catch(e){warn('CANCEL: ST abort attempt failed:',e?.message)}

    cleanupGenUI();
    // Restore panel from latest snapshot
    const snap=getLatestSnapshot();
    const body=document.getElementById('sp-panel-body');
    if(snap){
        const norm=normalizeTracker(snap);
        updatePanel(norm);
    }else if(body){
        body.innerHTML='<div class="sp-empty-state"><div class="sp-empty-icon">\ud83d\udce1</div><div class="sp-empty-title">No scene data yet</div><div class="sp-empty-sub">Generation was cancelled. Click <strong>\u27f3</strong> to try again.</div></div>';
    }
}

export async function generateTracker(mesIdx,partKey,opts){
    if(!getSettings().enabled){log('generateTracker: extension disabled, skipping');return null}
    if(generating){warn('Busy, nonce=',genNonce);return null}
    setGenerating(true);setCancelRequested(false);spSetGenerating(true);
    const myNonce=genNonce+1;setGenNonce(myNonce);
    const genStartMs=Date.now();
    const settings=getSettings();const schema=getActiveSchema();const sysPr=getActivePrompt();
    let profileOverride=opts?.profile||settings.connectionProfile;
    let presetOverride=opts?.preset||settings.chatPreset;
    log('=== GENERATION START === mesIdx=',mesIdx,'partKey=',partKey||'(full)','nonce=',myNonce,'source=',lastGenSource||'unknown','profile=',profileOverride||'(current)');
    log('Settings: ctx=',settings.contextMessages,'retries=',settings.maxRetries,'mode=',settings.promptMode,'profile=',settings.connectionProfile||'(default)','preset=',settings.chatPreset||'(default)');
    // Resolve profile/preset name → UUID if needed (handles legacy name-based values)
    const _genProfiles=getConnectionProfiles();
    if(profileOverride&&!_genProfiles.some(p=>p.id===profileOverride)){
        const norm=profileOverride.trim().toLowerCase();
        let match=_genProfiles.find(p=>p.name.trim().toLowerCase()===norm);
        if(!match)match=_genProfiles.find(p=>p.name.toLowerCase().includes(norm)||norm.includes(p.name.toLowerCase()));
        if(match){log('Generation: resolved profile:',profileOverride,'\u2192',match.id);profileOverride=match.id}
    }
    const _genPresets=getChatPresets();
    if(presetOverride&&!_genPresets.some(p=>p.id===presetOverride)){
        const norm=presetOverride.trim().toLowerCase();
        let match=_genPresets.find(p=>p.name.trim().toLowerCase()===norm);
        if(!match)match=_genPresets.find(p=>p.name.toLowerCase().includes(norm)||norm.includes(p.name.toLowerCase()));
        if(match){log('Generation: resolved preset:',presetOverride,'\u2192',match.id);presetOverride=match.id}
    }
    const doGen=async()=>{
        const{chat,generateQuietPrompt,generateRaw}=SillyTavern.getContext();
        log('Chat length:',chat.length,'API funcs:','quietPrompt=',!!generateQuietPrompt,'raw=',!!generateRaw);
        const recent=chat.slice(Math.max(0,chat.length-settings.contextMessages));
        const ctxText=recent.map(m=>`${m.is_user?'{{user}}':(m.name||'{{char}}')}: ${m.mes}`).join('\n\n');
        const lastSnap=getLatestSnapshot();
        let snapCtx='';
        if(lastSnap){
            const allSnaps=getTrackerData().snapshots;
            const sorted=Object.keys(allSnaps).map(Number).sort((a,b)=>b-a);
            const snapCount=Math.min(settings.embedSnapshots||1, sorted.length);
            const snapsToEmbed=sorted.slice(0,snapCount).reverse();
            const hasEmptyChars=!lastSnap.characters||!lastSnap.characters.length;
            if(snapCount<=1){
                snapCtx=`\n\nPREVIOUS STATE (for reference \u2014 update as needed):\n${JSON.stringify(lastSnap,null,2)}`;
            }else{
                snapCtx='\n\nPREVIOUS STATES (most recent last, for tracking changes over time):';
                for(const k of snapsToEmbed){
                    snapCtx+=`\n--- Snapshot from message #${k} ---\n${JSON.stringify(allSnaps[String(k)],null,2)}`;
                }
            }
            snapCtx+=settings.panels?.quests!==false?`\n\nIMPORTANT: Quest Journal must be from {{user}}'s perspective. If {{char}} is hostile, {{user}}'s quests OPPOSE {{char}}'s goals. If {{char}} is an ally, {{user}}'s quests SUPPORT them \u2014 but framed as {{user}}'s action. NEVER write what {{char}} is doing \u2014 write what {{user}} is doing about it. NEVER drop unresolved quests.`:`\n\nIMPORTANT: Carry forward unchanged details. Only update what changed in the story.`;
            if(hasEmptyChars){
                snapCtx+=`\n\nWARNING: The previous state has EMPTY characters. This is a bug \u2014 you MUST generate full character details for ALL characters present in the scene.`;
                log('Previous state has empty characters \u2014 added generation warning');
            }
        }
        log('Gen context: msgs=',recent.length,'snapshots=',settings.embedSnapshots||1,'snapCtxLen~',snapCtx.length);
        let prompt=`${sysPr}\n\nRECENT:\n${ctxText}${snapCtx}\n\nGenerate updated JSON.`;
        if(partKey&&lastSnap)prompt+=`\n\nFOCUS: Only update fields related to "${partKey}". You MUST still return the complete JSON schema, but ONLY change the ${partKey}-related fields. Copy all other fields exactly as-is from the previous state.`;
        const promptLen=prompt.length;
        log('Prompt length:',promptLen,'chars (~',Math.round(promptLen/4),'tokens)');
        for(let a=0;a<=settings.maxRetries;a++){
            // Nonce check at every opportunity — if cancelled, bail immediately
            if(myNonce!==genNonce){log('STALE nonce',myNonce,'(current',genNonce+') \u2014 discarding silently');return null}
            try{if(a>0){log(`Retry ${a}/${settings.maxRetries}`);await new Promise(r=>setTimeout(r,1000*a))}
                let raw;
                log('Attempt',a+1,': calling generateQuietPrompt... nonce=',myNonce);
                try{
                    raw=await generateQuietPrompt({quietPrompt:prompt,jsonSchema:settings.promptMode==='native'?schema:undefined});
                }
                catch(e){
                    if(myNonce!==genNonce){log('STALE after quiet error, nonce',myNonce);return null}
                    const msg=e?.message||String(e);
                    warn('API error:',msg);
                    // ── Fatal API errors: stop immediately, no retry ──
                    const FATAL_PATTERNS=['401','403','404','authentication','unauthorized','forbidden','model not found','invalid api key','api key','billing','quota','insufficient','deactivated','account','permission','not allowed','blocked','banned'];
                    const msgLow=msg.toLowerCase();
                    const isFatal=FATAL_PATTERNS.some(p=>msgLow.includes(p));
                    if(isFatal){
                        err('FATAL API ERROR \u2014 stopping generation:',msg);
                        setLastRawResponse('FATAL API ERROR: '+msg);
                        toastr.error('API Error: '+msg.substring(0,100),'Generation stopped');
                        return null;
                    }
                    // ── Rate limit: stop, don't waste retries ──
                    if(msgLow.includes('429')||msgLow.includes('rate limit')||msgLow.includes('too many requests')){
                        err('RATE LIMITED \u2014 stopping generation:',msg);
                        setLastRawResponse('RATE LIMITED: '+msg);
                        toastr.error('Rate limited \u2014 try again in a moment','Generation stopped');
                        return null;
                    }
                    // ── Network errors: retry with delay ──
                    if(msg.includes('ECONNRESET')||msg.includes('socket')||msg.includes('500')||msg.includes('502')||msg.includes('503')||msg.includes('timeout')){
                        log('Network error, waiting 2s before fallback...');
                        await new Promise(r=>setTimeout(r,2000));
                    }
                    log('Trying generateRaw fallback...');
                    try{raw=await generateRaw({systemPrompt:sysPr,prompt:`RECENT:\n${ctxText}${snapCtx}\n\nOutput ONLY valid JSON.`})}
                    catch(e2){
                        const msg2=e2?.message||String(e2);
                        err('Fallback also failed:',msg2);
                        // Check if fallback hit a fatal error too
                        const msg2Low=msg2.toLowerCase();
                        if(FATAL_PATTERNS.some(p=>msg2Low.includes(p))||msg2Low.includes('429')||msg2Low.includes('rate limit')){
                            err('FATAL on fallback \u2014 stopping:',msg2);
                            setLastRawResponse('FATAL API ERROR (fallback): '+msg2);
                            toastr.error('API Error: '+msg2.substring(0,100),'Generation stopped');
                            return null;
                        }
                        continue;
                    }
                }
                // Check nonce AFTER API returns — this is the critical discard point
                if(myNonce!==genNonce){log('STALE after API return, nonce',myNonce,'(current',genNonce+') \u2014 discarding response');return null}
                if(!raw||raw==='{}'){warn('Empty response on attempt',a+1);continue}
                const rawStr=String(raw);
                const rawLen=rawStr.length;
                setLastRawResponse(rawStr); // store for debug copy
                // ── Check if response body IS an error message ──
                const rawLow=rawStr.substring(0,500).toLowerCase();
                if(rawLow.includes('"error"')||rawLow.includes('rate limit')||rawLow.includes('unauthorized')||rawLow.includes('forbidden')){
                    try{
                        const errObj=JSON.parse(rawStr);
                        if(errObj.error){
                            const errMsg=typeof errObj.error==='string'?errObj.error:(errObj.error.message||JSON.stringify(errObj.error));
                            err('API returned error object:',errMsg);
                            toastr.error('API Error: '+errMsg.substring(0,100),'Generation stopped');
                            return null;
                        }
                    }catch{}// Not JSON error, continue normally
                }
                log('Got response, length:',rawLen,'chars, nonce=',myNonce);
                log('Response preview:',String(raw).substring(0,200)+'\u2026');
                const meta=genMeta;
                meta.promptTokens=Math.round(promptLen/4);
                meta.completionTokens=Math.round(rawLen/4);
                meta.elapsed=((Date.now()-genStartMs)/1000);
                setGenMeta(meta);
                const parsed=cleanJson(raw);
                log('Parsed JSON keys:',Object.keys(parsed).join(', '));
                for(const[pk,pv]of Object.entries(parsed)){
                    if(pv&&typeof pv==='object'&&!Array.isArray(pv)){log('  nested object:',pk,'\u2192 keys:',Object.keys(pv).join(', '))}
                    else if(Array.isArray(pv)){log('  array:',pk,'\u2192 length:',pv.length,pv[0]?'first-keys:'+Object.keys(pv[0]).join(','):'(empty)')}
                }
                return parsed;
            }catch(e){err(`Parse fail (${a+1}):`,e?.message||String(e))}
        }
        warn('All',settings.maxRetries+1,'attempts exhausted, returning null');
        toastr.error('All retry attempts failed \u2014 check SP Log for details','Generation failed');
        return null;
    };
    let result;
    try{result=await withProfileAndPreset(profileOverride,presetOverride,doGen)}
    catch(e){err('Gen:',e)}
    // Only the CURRENT generation is allowed to touch state
    if(myNonce!==genNonce){
        log('POST-GEN: stale nonce',myNonce,'(current',genNonce+') \u2014 result discarded, state untouched');
        return null; // Don't reset generating — the newer cancel/gen already did
    }
    setGenerating(false);spSetGenerating(false);setCancelRequested(false);cleanupGenUI();
    if(result){
        log('Raw output keys:',Object.keys(result).join(', '));
        log('Raw characters?',Array.isArray(result.characters)?'array('+result.characters.length+')':typeof result.characters);
        log('Raw relationships?',Array.isArray(result.relationships)?'array('+result.relationships.length+')':typeof result.relationships);
        result=normalizeTracker(result);
        // ── SECTION MERGE: Only accept fields belonging to the requested section ──
        if(partKey){
            const SECTION_FIELDS={
                dashboard:['time','date','location','weather','temperature'],
                scene:['sceneTopic','sceneMood','sceneInteraction','sceneTension','sceneSummary','soundEnvironment','charactersPresent'],
                quests:['northStar','mainQuests','sideQuests','activeTasks'],
                relationships:['relationships'],
                characters:['characters'],
                branches:['plotBranches']
            };
            const allowedFields=SECTION_FIELDS[partKey];
            if(allowedFields||partKey.startsWith('custom_')){
                const existingSnap=getSnapshotFor(mesIdx)||getLatestSnapshot();
                if(existingSnap){
                    const merged=normalizeTracker(existingSnap);
                    if(allowedFields){
                        for(const f of allowedFields){if(result[f]!==undefined)merged[f]=result[f]}
                        log('Section merge: partKey=',partKey,'accepted fields:',allowedFields.join(','),'preserved',Object.keys(merged).length-allowedFields.length,'existing fields');
                    } else {
                        // Custom panel — accept only its field keys
                        const s=getSettings();
                        const cp=(s.customPanels||[]).find(c=>'custom_'+c.name.replace(/\s+/g,'_').toLowerCase()===partKey);
                        if(cp?.fields){
                            const cpFields=cp.fields.map(f=>f.key);
                            for(const f of cpFields){if(result[f]!==undefined)merged[f]=result[f]}
                            log('Section merge (custom): partKey=',partKey,'accepted fields:',cpFields.join(','));
                        }
                    }
                    result=merged;
                }
            }
        }
        log('=== POST-NORMALIZE SUMMARY === source=',lastGenSource);
        log('  chars:',result.characters?.length||0,'rels:',result.relationships?.length||0);
        log('  quests: main=',result.mainQuests?.length||0,'side=',result.sideQuests?.length||0,'tasks=',result.activeTasks?.length||0);
        log('  northStar:',result.northStar?'"'+result.northStar.substring(0,60)+'"':'(empty)');
        log('  scene:',result.sceneTopic?'topic=\u2713':'topic=\u2717',result.sceneMood?'mood=\u2713':'mood=\u2717',result.sceneTension?'tension=\u2713':'tension=\u2717');
        if(result.characters?.length){for(const ch of result.characters)log('  char:',ch.name,'role=',ch.role?'\u2713':'\u2717','thought=',ch.innerThought?'\u2713':'\u2717','hair=',ch.hair?'\u2713':'\u2717')}
        if(result.relationships?.length){for(const r of result.relationships)log('  rel:',r.name,'aff=',r.affection,'trust=',r.trust,'desire=',r.desire,'compat=',r.compatibility)}
        setCurrentSnapshotMesIdx(mesIdx);
        // Embed generation metadata into snapshot for persistence
        result._spMeta={promptTokens:genMeta.promptTokens,completionTokens:genMeta.completionTokens,elapsed:genMeta.elapsed,source:lastGenSource,injectionMethod:getSettings().injectionMethod||'inline'};
        saveSnapshot(mesIdx,result);log('Snapshot saved for mesIdx=',mesIdx,'keys=',Object.keys(result).length,'elapsed=',genMeta.elapsed.toFixed(1)+'s','~tokens:',genMeta.promptTokens+genMeta.completionTokens);
        updatePanel(result);
        spPostGenShow(); // mobile: banner instead of panel popup
    }else{
        // Show error in panel instead of stuck spinner
        const body=document.getElementById('sp-panel-body');
        if(body)body.innerHTML='<div class="sp-error"><div style="font-weight:700;margin-bottom:4px">Generation Failed</div><div style="font-size:10px">Network timeout or API issue. Try \u27f3 Regen or check debug log.</div></div>';
        warn('Generation returned null for',mesIdx);
    }
    return result;
}
