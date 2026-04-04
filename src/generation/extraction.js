// ── extraction.js — Inline/Together Mode: Extract tracker JSON from AI response ──

import { log, warn, err } from '../logger.js';
import { ensureChatSaved } from '../settings.js';

export const SP_MARKER_START='<!--SP_TRACKER_START-->';
export const SP_MARKER_END='<!--SP_TRACKER_END-->';

export function cleanJson(raw){
    let c=raw.trim().replace(/^```(?:json)?\s*\n?/i,'').replace(/\n?```\s*$/i,'');
    const fb=c.indexOf('{'),lb=c.lastIndexOf('}');
    if(fb===-1||lb===-1){err('cleanJson: no JSON object found. First 200:',c.substring(0,200));throw new Error('No JSON object in response')}
    c=c.substring(fb,lb+1);
    try{return JSON.parse(c)}catch(e){
        const m=e.message.match(/position (\d+)/);const pos=m?Number(m[1]):0;
        err('cleanJson: parse error at pos',pos,'context: \u2026'+c.substring(Math.max(0,pos-40),pos+40)+'\u2026');
        throw e;
    }
}

export function extractInlineTracker(mesIdx){
    try{
        const ctx=SillyTavern.getContext();
        const msg=ctx.chat[mesIdx];
        if(!msg||msg.is_user)return null;
        let raw=msg.mes||'';
        // Also check ST's reasoning field (think block content)
        const reasoning=msg.extra?.reasoning||'';
        const combined=raw+(reasoning?'\n'+reasoning:'');
        // Look for SP markers in combined text
        const startIdx=combined.indexOf(SP_MARKER_START);
        const endIdx=combined.indexOf(SP_MARKER_END);
        let jsonStr=null;let extractMethod='none';let foundInReasoning=false;
        if(startIdx!==-1&&endIdx>startIdx){
            jsonStr=combined.substring(startIdx+SP_MARKER_START.length,endIdx).trim();
            extractMethod='SP_MARKERS';
            foundInReasoning=startIdx>=raw.length; // Was it in the reasoning part?
        } else {
            // Fallback: look for ```json blocks at the end of the message
            const jsonBlockMatch=raw.match(/```json\s*\n?([\s\S]*?)```\s*$/);
            if(jsonBlockMatch){jsonStr=jsonBlockMatch[1].trim();extractMethod='JSON_FENCE'}
            else{
                // Fallback 2: look for a raw JSON object at the end
                const lastBrace=raw.lastIndexOf('}');
                if(lastBrace!==-1){
                    let depth=0;let openIdx=-1;
                    for(let i=lastBrace;i>=0;i--){
                        if(raw[i]==='}')depth++;
                        if(raw[i]==='{')depth--;
                        if(depth===0){openIdx=i;break}
                    }
                    if(openIdx!==-1&&(lastBrace-openIdx)>500){
                        jsonStr=raw.substring(openIdx,lastBrace+1);
                        extractMethod='RAW_JSON_SCAN';
                    }
                }
            }
        }
        if(!jsonStr){log('extractInlineTracker: no tracker JSON found in message',mesIdx,'(len:',raw.length+')');return null}
        log('extractInlineTracker: found via',extractMethod,'(json:',jsonStr.length,'chars)');
        // Parse the JSON
        let parsed;
        try{parsed=cleanJson(jsonStr)}catch(e){warn('extractInlineTracker: cleanJson failed:',e?.message);return null}
        if(!parsed||typeof parsed!=='object'){warn('extractInlineTracker: not an object');return null}
        // Strip schema metadata keys that models sometimes echo back
        const SCHEMA_META=['$schema','$id','type','properties','required','additionalProperties','definitions','$defs','description'];
        let strippedCount=0;
        for(const k of SCHEMA_META){if(k in parsed&&typeof parsed[k]!=='string'){delete parsed[k];strippedCount++}
            // Keep 'type' if it's a string value (could be a tracker field), strip if it's an object/array
            else if(k==='type'&&typeof parsed[k]==='string'&&parsed[k]==='object'){delete parsed[k];strippedCount++}
        }
        if(strippedCount)log('extractInlineTracker: stripped',strippedCount,'schema metadata keys');
        const keys=Object.keys(parsed);
        if(keys.length<5){
            warn('extractInlineTracker: parsed object too small after stripping ('+keys.length+' keys:',keys.join(',')+')');
            return null;
        }
        // Validate it looks like tracker data — must have at least one known tracker key
        const KNOWN_KEYS=['time','location','weather','sceneTopic','sceneMood','characters','relationships','plotBranches'];
        const hasKnown=KNOWN_KEYS.some(k=>k in parsed);
        if(!hasKnown){warn('extractInlineTracker: no known tracker keys found in',keys.slice(0,8).join(','));return null}
        // Strip the tracker block from the message
        let cleanedMsg=raw;
        if(foundInReasoning){
            // Tracker was in think/reasoning — clear reasoning, don't touch narrative
            if(msg.extra)msg.extra.reasoning='';
            log('extractInlineTracker: cleared reasoning field (tracker was in think block)');
        } else if(startIdx!==-1&&endIdx>startIdx){
            // Strip markers AND surrounding think tags if present
            let stripStart=startIdx;let stripEnd=endIdx+SP_MARKER_END.length;
            // Check for <think> wrapper before the markers
            const beforeMarker=raw.substring(Math.max(0,stripStart-30),stripStart);
            const thinkOpen=beforeMarker.lastIndexOf('<think>');
            if(thinkOpen!==-1)stripStart=stripStart-30+Math.max(0,thinkOpen); // Adjust to before <think>
            // Check for </think> after the markers
            const afterMarker=raw.substring(stripEnd,stripEnd+30);
            const thinkClose=afterMarker.indexOf('</think>');
            if(thinkClose!==-1)stripEnd=stripEnd+thinkClose+'</think>'.length;
            cleanedMsg=raw.substring(0,stripStart)+raw.substring(stripEnd);
        } else if(raw.match(/```json\s*\n?[\s\S]*?```\s*$/)){
            cleanedMsg=raw.replace(/```json\s*\n?[\s\S]*?```\s*$/,'');
        } else if(jsonStr){
            cleanedMsg=raw.substring(0,raw.indexOf(jsonStr));
        }
        // Also strip any orphaned think tags that might remain
        cleanedMsg=cleanedMsg.replace(/<think>\s*<\/think>/g,'');
        cleanedMsg=cleanedMsg.replace(/\n{3,}$/,'\n\n').trimEnd();
        // Update the message in memory
        if(cleanedMsg!==raw){
            msg.mes=cleanedMsg;
            // Update DOM — find the message element and replace its content
            const mesEl=document.querySelector(`.mes[mesid="${mesIdx}"] .mes_text`);
            if(mesEl){
                // Use ST's messageFormatting if available, otherwise set innerHTML
                try{
                    const{messageFormatting}=SillyTavern.getContext();
                    if(typeof messageFormatting==='function'){
                        mesEl.innerHTML=messageFormatting(cleanedMsg,msg.name,msg.is_system,msg.is_user,mesIdx);
                    }else{
                        mesEl.innerHTML=cleanedMsg;
                    }
                }catch{mesEl.innerHTML=cleanedMsg}
            }
            log('extractInlineTracker: stripped tracker block from message ('+raw.length+'\u2192'+cleanedMsg.length+' chars)');
            // Save cleaned message to disk
            ensureChatSaved();
            // Safety re-check: other extensions may re-render the message with stale text
            const _stripIdx=mesIdx;const _cleanTxt=cleanedMsg;
            const _safetyRestrip=()=>{
                try{
                    const el=document.querySelector(`.mes[mesid="${_stripIdx}"] .mes_text`);
                    if(!el)return;
                    const txt=el.textContent||'';
                    if(txt.includes('SP_TRACKER_START')||txt.includes('"sceneTopic"')||txt.includes('"relationships"')){
                        log('extractInlineTracker: safety re-strip for message',_stripIdx);
                        const{messageFormatting}=SillyTavern.getContext();
                        if(typeof messageFormatting==='function')el.innerHTML=messageFormatting(_cleanTxt,'',false,false,_stripIdx);
                        else el.innerHTML=_cleanTxt;
                    }
                    // Also hide any visible think blocks that contain tracker remnants
                    el.querySelectorAll('details.thinking_block, .mes_reasoning').forEach(tb=>{
                        if(tb.textContent.includes('SP_TRACKER_START')||tb.textContent.includes('"sceneTopic"'))tb.style.display='none';
                    });
                }catch{}
            };
            setTimeout(_safetyRestrip,500);
            setTimeout(_safetyRestrip,1500);
            setTimeout(_safetyRestrip,3000);
        }
        return parsed;
    }catch(e){
        warn('extractInlineTracker:',e?.message||String(e));
        return null;
    }
}
