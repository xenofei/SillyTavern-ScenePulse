// ── interceptor.js — Chat interceptor for inline/together and separate injection modes ──
//
// IN-FLIGHT GENERATION TUPLE (load-bearing across the codebase):
//   `generating === true  &&  inlineGenStartMs > 0`
// is the canonical "ScenePulse is mid-generation" condition. BOTH flags
// must be cleared atomically on every termination path. Half-clearing
// caused the v6.23.x Together-mode skip regression chain. Termination
// paths that clear the tuple correctly:
//   - GENERATION_ENDED handler (success or extraction-failure deferral)
//   - GENERATION_STOPPED handler (user-initiated abort)
//   - 180s watchdog below (catches network drops where ST never fires
//     a termination event, e.g. ECONNRESET on overloaded providers)
//   - Stuck-detection guard at the top of the interceptor (last-resort
//     recovery on the next generate event)
// See ARCHITECTURE.md → "In-flight generation contract" for the
// cross-cutting picture.

import { log, warn } from '../logger.js';
import { DEFAULTS } from '../constants.js';
import { getSettings, getActiveSchema, getActivePrompt, getLatestSnapshot, getLanguage, shouldUseDelta, getActivePanels } from '../settings.js';
import { anyPanelsActive } from '../settings.js';
import { getGroupMemberNames } from '../normalize.js';
import {
    generating, inlineGenStartMs, inlineExtractionDone, pendingInlineIdx,
    setGenerating, setInlineGenStartMs, setInlineExtractionDone, setPendingInlineIdx,
    _inlineWaitTimerId, set_inlineWaitTimerId
} from '../state.js';
import { spSetGenerating } from '../ui/mobile.js';
import { startStreamingHider, stopStreamingHider } from './streaming.js';
import { showChatBanner, cleanupGenUI } from '../ui/loading.js';
import { startStWatchdog } from './st-watchdog.js';
import { getActiveProfile } from '../profiles.js';
import { getActivePromptRole } from '../prompts/role.js';

// ── Stall watchdog (v6.27.16) ─────────────────────────────────────
//
// Module-scoped because state lives across event handlers in different
// files. The flow:
//   1. interceptor schedules a watchdog when generation starts (90s)
//   2. STREAM_TOKEN_RECEIVED handler (in index.js) calls noteStreamProgress
//      which (a) flips _streamStarted true (b) re-arms with the tighter
//      15s threshold
//   3. GENERATION_ENDED / GENERATION_STOPPED / successful extraction
//      handlers call clearStallWatchdog
//
// Closure-captures the genStart timestamp so a new generation can't be
// reset by a stale watchdog from a prior generation.
const STALL_PRE_STREAM_MS = 90000;
const STALL_POST_STREAM_MS = 15000;
let _stallWatchdogId = null;
let _stallGenStart = 0;
let _streamStarted = false;

function _onStallFire(genStart){
    if (!generating || inlineGenStartMs !== genStart || genStart <= 0) return;
    const elapsed = Math.round((Date.now() - genStart) / 1000);
    warn('Stall watchdog: stream went silent (' + elapsed + 's elapsed, streamStarted=' + _streamStarted + ') — force-resetting');
    setGenerating(false);
    spSetGenerating(false);
    setInlineGenStartMs(0);
    setInlineExtractionDone(false);
    setPendingInlineIdx(-1);
    try { stopStreamingHider(); } catch {}
    try { cleanupGenUI(); } catch {}
    try {
        toastr.warning(
            _streamStarted
                ? 'Stream went silent (network drop?). Tracker UI unlocked after ' + elapsed + 's.'
                : 'No response from server (network drop?). Tracker UI unlocked after ' + elapsed + 's.',
            'ScenePulse'
        );
    } catch {}
}

export function startStallWatchdog(genStart){
    clearStallWatchdog();
    _stallGenStart = genStart;
    _streamStarted = false;
    _stallWatchdogId = setTimeout(() => _onStallFire(genStart), STALL_PRE_STREAM_MS);
}

/** Re-arm with the tighter post-stream threshold. Idempotent. Safe to
 *  call from STREAM_TOKEN_RECEIVED for every token. */
export function noteStreamProgress(){
    if (!_stallGenStart || _stallGenStart !== inlineGenStartMs) return;
    _streamStarted = true;
    if (_stallWatchdogId) clearTimeout(_stallWatchdogId);
    const captured = _stallGenStart;
    _stallWatchdogId = setTimeout(() => _onStallFire(captured), STALL_POST_STREAM_MS);
}

export function clearStallWatchdog(){
    if (_stallWatchdogId) { clearTimeout(_stallWatchdogId); _stallWatchdogId = null; }
    _stallGenStart = 0;
    _streamStarted = false;
}

// Build compact inline prompt for "together" mode — tells the AI to append tracker JSON
export function buildInlineTrackerPrompt(){
    const s=getSettings();
    const sysPr=getActivePrompt();
    const snap=getLatestSnapshot();
    // Filter resolved quests + legacy activeTasks from embedded snapshot before
    // sending the previous state back to the LLM. Completed quests don't need
    // to re-enter the model's context, and activeTasks is a removed tier —
    // leaking old values of it would re-teach the model to produce them.
    function _cleanSnap(s){
        if(!s)return null;
        const c={...s};
        for(const k of['mainQuests','sideQuests']){if(Array.isArray(c[k]))c[k]=c[k].filter(q=>q.urgency!=='resolved')}
        delete c.activeTasks;delete c._spMeta;
        // v6.9.1: prune characters and relationships to only those
        // currently in charactersPresent (or with no presence data).
        // This reduces prompt tokens for long-running chats with 10+
        // historical characters, most of whom aren't in the current
        // scene. The STORED snapshot retains everyone (wiki needs it);
        // this pruning is prompt-only so the LLM sees a focused roster.
        if(Array.isArray(c.charactersPresent)&&c.charactersPresent.length>0){
            const presentSet=new Set(c.charactersPresent.map(n=>(n||'').toLowerCase().trim()));
            // Keep full details for present characters; preserve off-scene
            // characters as name+role stubs so the LLM can reference them
            if(Array.isArray(c.characters)){
                const present=c.characters.filter(ch=>presentSet.has((ch.name||'').toLowerCase().trim()));
                const offScene=c.characters.filter(ch=>!presentSet.has((ch.name||'').toLowerCase().trim())).map(ch=>({name:ch.name,role:ch.role||'',aliases:ch.aliases||[]}));
                c.characters=present;
                if(offScene.length)c._offSceneCharacters=offScene;
            }
            if(Array.isArray(c.relationships))c.relationships=c.relationships.filter(r=>presentSet.has((r.name||'').toLowerCase().trim()));
        }
        return c;
    }
    const cleanedSnap=_cleanSnap(snap);
    // v6.8.48: anti-contamination framing. The previous state JSON is
    // wrapped in <scene_pulse_tracker_state> XML tags with a clear
    // instruction that the character names inside are internal tracker
    // labels, NOT terms the model should use in its narrative prose.
    // Without this, the model treats compound placeholder names like
    // "Ponytail Nurse" as proper nouns and writes them into dialogue
    // and narration, breaking the story flow. The instruction uses
    // positive framing ("refer to characters naturally") rather than
    // prohibition ("NEVER use X") because research shows positive
    // framing outperforms negative constraints for LLM compliance.
    const prevState=cleanedSnap?`
<scene_pulse_tracker_state>
NARRATIVE SEPARATION RULE — read this BEFORE the data below:
The character names in this tracker state (e.g. "Ponytail Nurse", "Buzzcut", "Hooded Figure") are INTERNAL TRACKING LABELS, not prose vocabulary. In your narrative text, refer to characters naturally — by appearance, role, pronoun, title, or whatever the story has established. Compound placeholder labels must never appear as proper nouns in your prose or dialogue. In the tracker JSON you append at the end, use these exact label names as-is for continuity — the separation is between PROSE (natural descriptions) and JSON (tracker labels).

PREVIOUS STATE (carry forward unchanged details, update only what changed):
${JSON.stringify(cleanedSnap,null,2)}
</scene_pulse_tracker_state>

CRITICAL \u2014 {{user}} IS NOT A CHARACTER:
{{user}} is the player \u2014 the human reader \u2014 not an NPC. NEVER create a character entry for {{user}} (by any name \u2014 not the persona name, not "User", not "You", not the literal "{{user}}" token). {{user}} has no innerThought, no role, no appearance fields, no fertility fields. The characters array is exclusively for NPCs. NEVER create a self-relationship entry for {{user}} \u2014 relationships always express how OTHERS perceive {{user}}, never {{user}}'s view of themselves. NEVER include {{user}} in charactersPresent \u2014 that array lists NPCs in the scene alongside {{user}}, not {{user}} themselves.

QUEST STATE RULES (all REQUIRED):
1. Carry forward active quests from the previous state \u2014 don't silently drop them.
2. When a quest's goal is achieved in the story, when the situation it was about becomes moot, when {{user}} abandons it, or when a later quest has superseded it, you MUST set urgency="resolved" on that quest this turn. Do not leave completed quests active. Do not silently delete them \u2014 transition through "resolved" first. The resolved quest stays visible for one more turn so the user sees the completion.
3. NO COSMETIC QUEST EDITS. Do NOT modify an existing quest's name, detail, or urgency unless ONE of these specifically happened in the turn you are writing: (a) the story actually shifted its urgency, (b) you have concrete new information to record that did not exist last turn (cite the scene beat), or (c) you are marking it resolved. If none of those apply, emit the quest UNCHANGED \u2014 same name, same detail, same urgency \u2014 or omit it from the delta entirely. Rephrasing, synonym swaps, or "refreshing" a detail for its own sake is forbidden. A quest that did not meaningfully advance must look byte-identical to last turn.
4. Consolidate duplicates or near-duplicates into a single clearer entry. Prefer consolidation over duplication.
5. Never list the same quest in both mainQuests and sideQuests. A quest belongs in ONE tier.
6. All quests from {{user}}'s perspective \u2014 if hostile, oppose their goal; if ally, support them as {{user}}'s action.`:'';
    // Strip the "JSON OUTPUT ONLY" header from the prompt
    let fieldSpecs=sysPr;
    const headerEnd=sysPr.indexOf('## FIELD SPECIFICATIONS');
    if(headerEnd>0)fieldSpecs=sysPr.substring(headerEnd);
    else fieldSpecs=sysPr.replace(/^#.*?JSON OUTPUT ONLY.*?\n(.*?\n)*?(?=##|\n##)/,'');
    // Build field list from dynamic schema
    const schemaObj=getActiveSchema().value;
    const topKeys=schemaObj?.properties?Object.keys(schemaObj.properties):Object.keys(schemaObj||{});
    const fieldList=topKeys.join(', ');
    // Build mandatory fields list from enabled panels.
    // v6.23.4: read from active profile (the v6.16.2 orphan migration drains
    // s.panels — was silently producing prompts with NO panel-specific
    // hints because empty {} resolved every check to undefined!==false=true,
    // listing fields the user had disabled instead of respecting their toggles).
    let panels;
    try {
        const profile = getActiveProfile(s);
        panels = (profile && profile.panels && Object.keys(profile.panels).length)
            ? profile.panels
            : (s.panels || DEFAULTS.panels);
    } catch {
        panels = s.panels || DEFAULTS.panels;
    }
    let mandatoryHints='';
    if(panels.storyIdeas!==false)mandatoryHints+='\n- plotBranches: EXACTLY 5 story suggestions (dramatic, intense, comedic, twist, exploratory). Each needs type, name, hook.';
    if(panels.quests!==false)mandatoryHints+='\n- mainQuests (MAX 3) / sideQuests (MAX 4): Persistent life arcs spanning multiple scenes, NOT scene-level actions. Introduce AT MOST 1 new quest per turn. Each needs name, urgency, detail. Every quest must be something {{user}} can personally ACT on \u2014 NPC activities and world facts are character notes, not quests. MAX 1 critical quest at a time; urgency = timing, not importance.';
    if(panels.characters!==false){
        mandatoryHints+='\n- characters: Full details for every named, plot-relevant NPC present (MAX 5 entries, background crowd members go in sceneSummary instead). Each entry needs name, role, innerThought, immediateNeed, and appearance fields.';
        mandatoryHints+='\n- UNKNOWN\u2192KNOWN NAMES: If a character\'s name is not yet known, use a consistent descriptive placeholder like "Stranger", "Hooded Figure", "Woman in Red". REUSE the same placeholder each turn until the name is revealed. When the real name IS revealed, emit ONE character entry with the new `name` AND the old placeholder listed in `aliases`. Do NOT create two entries (one under the old placeholder, one under the new name) \u2014 the tracker\'s alias merger will link them automatically, but ONLY if you use the `aliases` field correctly.';
        mandatoryHints+='\n- NAME FIELD INTEGRITY: The `name` field is the character\'s canonical name ONLY. NEVER embed aliases, titles, or parentheticals inside it. WRONG: `"name": "Officer Jane (The Entity/Lilith)"`. RIGHT: `"name": "Officer Jane", "aliases": ["The Entity", "Lilith"]`. This rule applies to EVERY reference across characters[], relationships[], AND charactersPresent[]. All three arrays must use the IDENTICAL canonical name for the same character. If you mix "Name" in one array and "Name (Alias)" in another, the tracker will filter out the real character and replace it with an empty stub \u2014 all the data you wrote will be silently discarded.';
        // Group chat awareness: if ST has a group chat active, inject the
        // explicit member roster so the model knows who must appear in the
        // characters array and in charactersPresent. Without this the model
        // only "sees" the currently-speaking character and silently drops
        // the others, because nothing in the chat-history context tells it
        // "these N characters are also in this conversation."
        const _groupMembers=getGroupMemberNames();
        if(_groupMembers.length>1){
            mandatoryHints+='\n- GROUP CHAT ACTIVE: This is a group chat with '+_groupMembers.length+' participating characters: '+_groupMembers.map(n=>'"'+n+'"').join(', ')+'. ALL of these characters MUST appear in both the `characters` array and `charactersPresent` (unless the narrative has explicitly removed them from the scene, e.g. they left the room). Do NOT focus only on whichever character is speaking this turn \u2014 every group member still present in the scene gets a full character entry every turn. If a character is in the group but absent from THIS specific scene (they stayed home, they\'re in another room), omit them from charactersPresent but keep their previous character data so it carries forward unchanged.';
        }
    }
    if(panels.relationships!==false)mandatoryHints+='\n- relationships: All characters\' views of {{user}} with numeric meters (0-100) and labels. desire=0 for strangers/family.';
    // Custom panel hints (v6.9.14: per-chat definitions)
    const customPanels=getActivePanels(s);
    for(const cp of customPanels){
        if(!cp.fields?.length||cp.enabled===false)continue;
        // v6.9.13: filter out disabled fields from hints
        const _activeFields=cp.fields.filter(f=>f.enabled!==false);
        if(_activeFields.length)mandatoryHints+=`\n- ${_activeFields.map(f=>f.key).join(', ')}: ${cp.name} fields \u2014 populate from story context.`;
    }
    // v6.8.50: use the shared shouldUseDelta() helper instead of
    // checking deltaMode directly. This respects the periodic full-
    // state refresh counter, so every N delta turns we automatically
    // switch back to full-state for one generation to re-establish
    // ground truth and flush stale data.
    const isDelta = shouldUseDelta();
    const _lang=getLanguage();
    const _langBlock=_lang?`\nLANGUAGE: All narrative string values MUST be in ${_lang}. JSON keys and enum values remain in English.\n`:'';

    if(isDelta){
        return `After your complete narrative, append a scene-tracking JSON block wrapped in markers. Include ONLY fields that changed since the previous state.

DELTA RULES:
- Always include these fields: time, date, elapsed, plotBranches.
- Include any other field ONLY if its value changed.
- For characters/relationships: include only entities that changed, with ALL their sub-fields.
- Omit unchanged fields \u2014 omission means "no change."
${mandatoryHints?'\nWHEN INCLUDING:'+mandatoryHints:''}

${fieldSpecs}
${_langBlock}${prevState}

MANDATORY OUTPUT \u2014 append this exact format after your narrative (the markers are machine-parsed, never omit them):

<!--SP_TRACKER_START-->
{"time":"14:30","date":"03/15/2025","elapsed":"120","sceneMood":"tense","plotBranches":[...]}
<!--SP_TRACKER_END-->`;
    }

    return `After your complete narrative, append a scene-tracking JSON block wrapped in markers.

Required keys: ${fieldList}
${mandatoryHints?'\nMANDATORY FIELDS:'+mandatoryHints:''}

No schema metadata. Only actual tracker data as a flat JSON object.
Every field must have a non-empty value. Never return "" or []. Infer from context if unsure.

${fieldSpecs}
${_langBlock}${prevState}

MANDATORY OUTPUT \u2014 append this exact format after your narrative (the markers are machine-parsed, never omit them):

<!--SP_TRACKER_START-->
{"time":"14:30","date":"03/15/2025","location":"Town Square",...all fields...}
<!--SP_TRACKER_END-->`;
}

export const scenePulseInterceptor=async function(chat,cs,abort,type){
    const s=getSettings();
    if(!s.enabled||type==='quiet')return;
    if(generating){
        // v6.27.13: widen stuck-detection. Previously only (startMs > 0
        // AND > 60s old) reset. But `generating === true` with
        // `inlineGenStartMs === 0` (extraction zeroed start time but
        // generating hung — partial-extraction failure / abort without
        // GENERATION_STOPPED) silently dropped every subsequent turn.
        // Now: any `generating` state without a fresh in-flight start
        // time is treated as stale.
        const _stuck = inlineGenStartMs<=0 || (Date.now()-inlineGenStartMs)>60000;
        if(_stuck){
            log('Interceptor: generating flag stuck (startMs='+inlineGenStartMs+') — force resetting');
            setGenerating(false);setInlineExtractionDone(false);setPendingInlineIdx(-1);setInlineGenStartMs(0);
        } else {
            log('Interceptor: skipped \u2014 manual/partial generation in progress');return;
        }
    }
    if(!anyPanelsActive()){log('Interceptor: skipped \u2014 all panels disabled, no custom panels');return}

    if(s.injectionMethod==='inline'){
        const _genStart = Date.now();
        setInlineGenStartMs(_genStart);
        setInlineExtractionDone(false);
        setPendingInlineIdx(-1);
        spSetGenerating(true);

        // v6.27.14 → v6.27.16: stall watchdog. ECONNRESET / ETIMEDOUT / TLS
        // failures from upstream providers (NanoGPT under load with large
        // models was the user-reported case) sometimes leave SillyTavern
        // without firing GENERATION_ENDED or GENERATION_STOPPED at all,
        // so ScenePulse's "generating…" pill hangs.
        //
        // Previous v6.27.14 used a flat 180s blanket. v6.27.16 makes it
        // tighter by tracking stream activity: STREAM_TOKEN_RECEIVED
        // events refresh the watchdog (see index.js handler), so we only
        // fire when the stream has gone silent. Two thresholds:
        //   - 90s before the first token (tolerates pre-stream thinking
        //     time on reasoning models — Claude 4.7 effort=high can pause
        //     this long before streaming begins)
        //   - 15s after the first token (mid-stream stalls are normally
        //     <2s; 15s of dead air = the connection dropped)
        // The closure captures _genStart so a new generation beginning
        // inside the watchdog window doesn't get reset by the prior one.
        startStallWatchdog(_genStart);

        // v6.27.19: ALSO start the DOM-poll watchdog. Faster detection
        // (~6-9s) for the ECONNRESET case where ST hides its stop button
        // but the underlying fetch never rejects up our await chain.
        // Both watchdogs cooperate: stall watchdog handles "tokens
        // stopped streaming"; ST watchdog handles "ST itself stopped."
        startStWatchdog();

        // ── TOGETHER MODE: Inject inline tracker prompt ──
        {
        const prompt=buildInlineTrackerPrompt();
        // v6.27.20 (issue #16 followup): apply the active profile's
        // systemPromptRole to the three injected messages. Pre-v6.27.20
        // these were hardcoded to is_system:true regardless of the
        // user's choice — applyPromptRole() handled separate-mode but
        // never applied to the together-mode injection. Reported by
        // rgwb10 against v6.27.6: "changed setting to User, prompt
        // inspector still shows system."
        const _spRole = getActivePromptRole();
        const _isSys = _spRole === 'system';
        const _isUsr = _spRole === 'user';
        // 'assistant' role: both flags false. ST treats it as an
        // assistant turn — rarely useful, shipped for parity with the
        // separate-mode applyPromptRole() helper.
        const _flags = {
            is_user: _isUsr,
            is_system: _isSys,
            name: _isSys ? 'System' : (_isUsr ? 'ScenePulse' : 'Assistant'),
        };
        const _extra = { isSmallSys: _isSys };

        // Head anchor — short planning reminder at the START of the context.
        // Counters lost-in-the-middle behavior on long prompts: as the injected schema spec
        // grows past ~3k tokens, the appendix instruction at the end loses attention weight.
        // A 30-token reminder near the start primes the model's planning phase to know
        // structured output is required *before* it begins narrative generation.
        chat.unshift({
            ..._flags,
            mes:'IMPORTANT: This turn requires structured output. After your narrative response, you MUST append a tracker JSON block wrapped in <!--SP_TRACKER_START--> and <!--SP_TRACKER_END--> markers. Full schema is provided later in the context. This is non-negotiable — the response is incomplete without it.',
            extra: _extra,
        });
        chat.splice(Math.max(0,chat.length-1),0,{
            ..._flags,
            mes:prompt,
            extra: _extra,
        });
        chat.push({
            ..._flags,
            mes:'Your response must end with <!--SP_TRACKER_START-->{ tracker JSON }<!--SP_TRACKER_END--> after the narrative. Do not repeat these instructions in your output.',
            extra: _extra,
        });
        log('Interceptor [inline/together]: injected tracker prompt (~'+Math.round(prompt.length/4)+' tokens) + head/tail anchors as role='+_spRole,
            'state: extDone=',inlineExtractionDone,'pendingIdx=',pendingInlineIdx,'generating=',generating);
        startStreamingHider();
        }
        // Show waiting animation on panel (both tool calling and inline)
        try{
            const body=document.getElementById('sp-panel-body');
            if(body){
                let wait=document.getElementById('sp-inline-wait');
                if(!wait){
                    wait=document.createElement('div');wait.id='sp-inline-wait';wait.className='sp-inline-wait';
                    wait.innerHTML='<div class="sp-inline-wait-spinner"></div><span>Updating scene data<span class="sp-ellipsis"></span></span><span class="sp-banner-timer" id="sp-inline-wait-timer">0s</span>';
                    body.insertBefore(wait,body.firstChild);
                    if(_inlineWaitTimerId)clearInterval(_inlineWaitTimerId);
                    const _iwStart=Date.now();
                    set_inlineWaitTimerId(setInterval(()=>{const el=document.getElementById('sp-inline-wait-timer');if(el)el.textContent=((Date.now()-_iwStart)/1000|0)+'s'},1000));
                }
            }
            // Also show banner on thought panel (no full overlay — auto-gen)
            showChatBanner('Awaiting scene data');
        }catch(e){}
    } else {
        // SEPARATE MODE: Just embed previous snapshot data for context
        if(!s.embedSnapshots)return;
        const snap=getLatestSnapshot();if(!snap){log('Interceptor: no snapshot to embed');return}
        const snapJson=JSON.stringify(snap,null,2);
        chat.splice(Math.max(0,chat.length-1),0,{
            is_user:s.embedRole==='user',is_system:s.embedRole==='system',
            name:s.embedRole==='system'?'System':'ScenePulse',
            mes:`[ Scene Tracker ]\n${snapJson}`,
            extra:{isSmallSys:s.embedRole==='system'}
        });
        log('Interceptor [separate]: embedded snapshot as',s.embedRole,'role (~'+Math.round(snapJson.length/4)+' tokens)');
    }
};
