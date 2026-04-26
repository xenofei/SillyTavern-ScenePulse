// ── extraction.js — Inline/Together Mode: Extract tracker JSON from AI response ──

import { log, warn, err } from '../logger.js';
import { ensureChatSaved, getSettings, shouldUseDelta } from '../settings.js';
import { jsonrepair } from '../vendor/jsonrepair.mjs';

export const SP_MARKER_START='<!--SP_TRACKER_START-->';
export const SP_MARKER_END='<!--SP_TRACKER_END-->';

// Extract V8/Chromium "position N" AND Firefox "line N column N" from a JSON parse error.
// Both report 1-based positions; we normalize to a 0-based offset into the original string.
function _parseErrorOffset(msg,src){
    const pmPos=msg.match(/position (\d+)/);
    if(pmPos)return Number(pmPos[1]);
    const pmCol=msg.match(/line\s+(\d+)\s+column\s+(\d+)/i);
    if(!pmCol)return 0;
    const line=Number(pmCol[1]),col=Number(pmCol[2]);
    if(line===1)return col-1;
    const lines=src.split('\n');let acc=0;
    for(let i=0;i<line-1&&i<lines.length;i++)acc+=lines[i].length+1;
    return acc+col-1;
}

// String-aware forward walk that returns the byte offset of the closing brace
// matching the opening brace at `from`. Tracks quote state so braces inside
// string literals don't count toward depth. Returns -1 if the object is
// unbalanced (missing close brace) — caller treats that as a parse error.
function _findBalancedEnd(s,from){
    let depth=0,inString=false,escape=false;
    for(let i=from;i<s.length;i++){
        const ch=s[i];
        if(escape){escape=false;continue}
        if(inString){
            if(ch==='\\')escape=true;
            else if(ch==='"')inString=false;
            continue;
        }
        if(ch==='"'){inString=true;continue}
        if(ch==='{')depth++;
        else if(ch==='}'){depth--;if(depth===0)return i}
    }
    return -1;
}

export function cleanJson(raw){
    let c=raw.trim().replace(/^```(?:json)?\s*\n?/i,'').replace(/\n?```\s*$/i,'');
    const fb=c.indexOf('{');
    if(fb===-1){err('cleanJson: no JSON object found. First 200:',c.substring(0,200));throw new Error('No JSON object in response')}
    // Walk forward from the first `{` tracking brace depth (string-aware), stop at
    // the first balanced close. Discards any trailing junk after the first complete
    // JSON object — e.g. MemoryBooks' {"@schema":"1.1"} version tag echoed by the
    // model inside the SP markers. Fall back to lastIndexOf('}') only if the walk
    // can't find a balanced close, so we still get a best-effort shot at jsonrepair.
    const balancedEnd=_findBalancedEnd(c,fb);
    if(balancedEnd!==-1){
        c=c.substring(fb,balancedEnd+1);
    }else{
        const lb=c.lastIndexOf('}');
        if(lb===-1){err('cleanJson: no closing brace found. First 200:',c.substring(0,200));throw new Error('No JSON object in response')}
        log('cleanJson: unbalanced braces from first `{`, falling back to lastIndexOf(`}`) for repair attempt');
        c=c.substring(fb,lb+1);
    }
    try{return JSON.parse(c)}catch(e1){
        // Strict parse failed — delegate to jsonrepair (tokenizer-based, handles unescaped quotes,
        // missing commas, single quotes, comments, trailing commas, Python-style True/False/None, etc.)
        log('cleanJson: strict parse failed, attempting jsonrepair...');
        let repaired;
        try{repaired=jsonrepair(c)}catch(eRepair){
            const pos=_parseErrorOffset(e1.message,c);
            err('cleanJson: parse error at pos',pos,'context: \u2026'+c.substring(Math.max(0,pos-40),pos+40)+'\u2026');
            err('cleanJson: jsonrepair failed:',eRepair?.message||String(eRepair));
            throw e1;
        }
        try{const result=JSON.parse(repaired);log('cleanJson: jsonrepair succeeded ('+c.length+'\u2192'+repaired.length+' chars)');return result}catch(e2){
            const pos=_parseErrorOffset(e1.message,c);
            err('cleanJson: parse error at pos',pos,'context: \u2026'+c.substring(Math.max(0,pos-40),pos+40)+'\u2026');
            err('cleanJson: jsonrepair output still unparseable:',e2.message);
            throw e1;
        }
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
        // Look for SP markers in combined text (including mangled variants)
        let startIdx=combined.indexOf(SP_MARKER_START);
        let endIdx=combined.indexOf(SP_MARKER_END);
        // Check for mangled marker variants: {{//SP_TRACKER_START}}, {{SP_TRACKER_START}}, etc.
        let _mStartLen=SP_MARKER_START.length;
        if(startIdx===-1){
            const altMarkers=[['{{//SP_TRACKER_START}}','{{//SP_TRACKER_END}}'],['{{SP_TRACKER_START}}','{{SP_TRACKER_END}}'],['[SP_TRACKER_START]','[SP_TRACKER_END]'],['**SP_TRACKER_START**','**SP_TRACKER_END**']];
            for(const[s,e]of altMarkers){const si=combined.indexOf(s);const ei=combined.indexOf(e);if(si!==-1&&ei>si){startIdx=si;endIdx=ei;_mStartLen=s.length;log('extractInlineTracker: found mangled marker variant:',s);break}}
        }
        let jsonStr=null;let extractMethod='none';let foundInReasoning=false;
        if(startIdx!==-1&&endIdx>startIdx){
            jsonStr=combined.substring(startIdx+_mStartLen,endIdx).trim();
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
                    if(openIdx!==-1&&(lastBrace-openIdx)>200){
                        jsonStr=raw.substring(openIdx,lastBrace+1);
                        extractMethod='RAW_JSON_SCAN';
                    }
                }
                // Fallback 3: look for raw JSON with "time" key anywhere in message
                if(!jsonStr){
                    const timeMatch=raw.match(/\{"time"\s*:\s*"[^"]+"/);
                    if(timeMatch){
                        const jsonStart=timeMatch.index;
                        const remaining=raw.substring(jsonStart);
                        // Find matching closing brace
                        let d2=0;let endIdx=-1;
                        for(let i=0;i<remaining.length;i++){
                            if(remaining[i]==='{')d2++;
                            if(remaining[i]==='}')d2--;
                            if(d2===0){endIdx=i;break}
                        }
                        if(endIdx>100){
                            jsonStr=remaining.substring(0,endIdx+1);
                            extractMethod='RAW_TIME_KEY_SCAN';
                        }
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
        const _isDelta=shouldUseDelta();
        const _minKeys=_isDelta?3:5; // Delta mode: 3+ keys (time + date + at least one changed field)
        if(keys.length<_minKeys){
            warn('extractInlineTracker: parsed object too small after stripping ('+keys.length+' keys:',keys.join(',')+') min='+_minKeys);
            return null;
        }
        // Validate it looks like tracker data — must have at least one known tracker key
        const KNOWN_KEYS=['time','location','weather','sceneTopic','sceneMood','sceneTension','characters','relationships','plotBranches','mainQuests','sideQuests'];
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
        // Strip echoed instruction headers that LLMs sometimes parrot back
        cleanedMsg=cleanedMsg.replace(/\[SCENE TRACKER[^\]]*\]\s*/g,'');
        cleanedMsg=cleanedMsg.replace(/MANDATORY APPENDIX[^\n]*\n?/g,'');
        cleanedMsg=cleanedMsg.replace(/<!--SP_TRACKER_(?:START|END)-->/g,'');
        // Also strip any orphaned think tags that might remain
        cleanedMsg=cleanedMsg.replace(/<think>\s*<\/think>/g,'');
        cleanedMsg=cleanedMsg.replace(/\n{3,}$/,'\n\n').trimEnd();
        // Update the message in memory
        if(cleanedMsg!==raw){
            msg.mes=cleanedMsg;
            // Update DOM — find the message element and replace its content
            const mesEl=document.querySelector(`.mes[mesid="${mesIdx}"] .mes_text`);
            if(mesEl){
                // Clear streaming hider safety flag
                delete mesEl.dataset.spHasTracker;
                // Use ST's messageFormatting if available; otherwise fall back
                // to textContent. v6.27.13: previously fell back to innerHTML
                // which would render LLM-emitted HTML directly. Defense-in-
                // depth (per security review): unsanitized cleanedMsg may
                // carry attacker-controlled `<img onerror>` from prompt-
                // injected character cards. textContent neutralizes that.
                try{
                    const{messageFormatting}=SillyTavern.getContext();
                    if(typeof messageFormatting==='function'){
                        mesEl.innerHTML=messageFormatting(cleanedMsg,msg.name,msg.is_system,msg.is_user,mesIdx);
                    }else{
                        mesEl.textContent=cleanedMsg;
                    }
                }catch{mesEl.textContent=cleanedMsg}
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
                        else el.textContent=_cleanTxt;  // v6.27.13: defense-in-depth — see comment in primary write site above
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
