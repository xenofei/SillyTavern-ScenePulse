// ── interceptor.js — Chat interceptor for inline/together and separate injection modes ──

import { log } from '../logger.js';
import { DEFAULTS } from '../constants.js';
import { getSettings, getActiveSchema, getActivePrompt, getLatestSnapshot, getLanguage } from '../settings.js';
import { anyPanelsActive } from '../settings.js';
import { getGroupMemberNames } from '../normalize.js';
import {
    generating, inlineGenStartMs, inlineExtractionDone, pendingInlineIdx,
    setGenerating, setInlineGenStartMs, setInlineExtractionDone, setPendingInlineIdx,
    _inlineWaitTimerId, set_inlineWaitTimerId
} from '../state.js';
import { spSetGenerating } from '../ui/mobile.js';
import { startStreamingHider } from './streaming.js';
import { showChatBanner } from '../ui/loading.js';

// Build compact inline prompt for "together" mode — tells the AI to append tracker JSON
export function buildInlineTrackerPrompt(){
    const s=getSettings();
    const sysPr=getActivePrompt();
    const snap=getLatestSnapshot();
    // Filter resolved quests + legacy activeTasks from embedded snapshot before
    // sending the previous state back to the LLM. Completed quests don't need
    // to re-enter the model's context, and activeTasks is a removed tier —
    // leaking old values of it would re-teach the model to produce them.
    function _cleanSnap(s){if(!s)return null;const c={...s};for(const k of['mainQuests','sideQuests']){if(Array.isArray(c[k]))c[k]=c[k].filter(q=>q.urgency!=='resolved')}delete c.activeTasks;delete c._spMeta;return c}
    const cleanedSnap=_cleanSnap(snap);
    const prevState=cleanedSnap?`\nPREVIOUS STATE (carry forward unchanged details, update only what changed):\n${JSON.stringify(cleanedSnap,null,2)}\n\nCRITICAL \u2014 {{user}} IS NOT A CHARACTER:\n{{user}} is the player \u2014 the human reader \u2014 not an NPC. NEVER create a character entry for {{user}} (by any name \u2014 not the persona name, not "User", not "You", not the literal "{{user}}" token). {{user}} has no innerThought, no role, no appearance fields, no fertility fields. The characters array is exclusively for NPCs. NEVER create a self-relationship entry for {{user}} \u2014 relationships always express how OTHERS perceive {{user}}, never {{user}}'s view of themselves. NEVER include {{user}} in charactersPresent \u2014 that array lists NPCs in the scene alongside {{user}}, not {{user}} themselves.\n\nQUEST STATE RULES (all REQUIRED):\n1. Carry forward active quests from the previous state \u2014 don't silently drop them.\n2. When a quest's goal is achieved in the story, when the situation it was about becomes moot, when {{user}} abandons it, or when a later quest has superseded it, you MUST set urgency="resolved" on that quest this turn. Do not leave completed quests active. Do not silently delete them \u2014 transition through "resolved" first. The resolved quest stays visible for one more turn so the user sees the completion.\n3. NO COSMETIC QUEST EDITS. Do NOT modify an existing quest's name, detail, or urgency unless ONE of these specifically happened in the turn you are writing: (a) the story actually shifted its urgency, (b) you have concrete new information to record that did not exist last turn (cite the scene beat), or (c) you are marking it resolved. If none of those apply, emit the quest UNCHANGED \u2014 same name, same detail, same urgency \u2014 or omit it from the delta entirely. Rephrasing, synonym swaps, or "refreshing" a detail for its own sake is forbidden. A quest that did not meaningfully advance must look byte-identical to last turn.\n4. Consolidate duplicates or near-duplicates into a single clearer entry. Prefer consolidation over duplication.\n5. Never list the same quest in both mainQuests and sideQuests. A quest belongs in ONE tier.\n6. All quests from {{user}}'s perspective \u2014 if hostile, oppose their goal; if ally, support them as {{user}}'s action.`:'';
    // Strip the "JSON OUTPUT ONLY" header from the prompt
    let fieldSpecs=sysPr;
    const headerEnd=sysPr.indexOf('## FIELD SPECIFICATIONS');
    if(headerEnd>0)fieldSpecs=sysPr.substring(headerEnd);
    else fieldSpecs=sysPr.replace(/^#.*?JSON OUTPUT ONLY.*?\n(.*?\n)*?(?=##|\n##)/,'');
    // Build field list from dynamic schema
    const schemaObj=getActiveSchema().value;
    const topKeys=schemaObj?.properties?Object.keys(schemaObj.properties):Object.keys(schemaObj||{});
    const fieldList=topKeys.join(', ');
    // Build mandatory fields list from enabled panels
    const panels=s.panels||DEFAULTS.panels;
    let mandatoryHints='';
    if(panels.storyIdeas!==false)mandatoryHints+='\n- plotBranches: EXACTLY 5 story suggestions (dramatic, intense, comedic, twist, exploratory). Each needs type, name, hook.';
    if(panels.quests!==false)mandatoryHints+='\n- mainQuests (MAX 3) / sideQuests (MAX 4): Persistent life arcs spanning multiple scenes, NOT scene-level actions. Introduce AT MOST 1 new quest per turn. Each needs name, urgency, detail.';
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
    // Custom panel hints
    const customPanels=s.customPanels||[];
    for(const cp of customPanels){
        if(!cp.fields?.length)continue;
        mandatoryHints+=`\n- ${cp.fields.map(f=>f.key).join(', ')}: ${cp.name} fields \u2014 populate from story context.`;
    }
    const isDelta = s.deltaMode && snap;
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
        // Safety: if generating has been stuck for >60s, it's stale — reset it
        if(inlineGenStartMs>0&&(Date.now()-inlineGenStartMs)>60000){
            log('Interceptor: generating flag stuck >60s — force resetting');
            setGenerating(false);setInlineExtractionDone(false);setPendingInlineIdx(-1);
        } else {
            log('Interceptor: skipped \u2014 manual/partial generation in progress');return;
        }
    }
    if(!anyPanelsActive()){log('Interceptor: skipped \u2014 all panels disabled, no custom panels');return}

    if(s.injectionMethod==='inline'){
        setInlineGenStartMs(Date.now());
        setInlineExtractionDone(false);
        setPendingInlineIdx(-1);
        spSetGenerating(true);

        // ── TOGETHER MODE: Inject inline tracker prompt ──
        {
        const prompt=buildInlineTrackerPrompt();
        // Head anchor — short planning reminder at the START of the context.
        // Counters lost-in-the-middle behavior on long prompts: as the injected schema spec
        // grows past ~3k tokens, the appendix instruction at the end loses attention weight.
        // A 30-token reminder near the start primes the model's planning phase to know
        // structured output is required *before* it begins narrative generation.
        chat.unshift({
            is_user:false,is_system:true,name:'System',
            mes:'IMPORTANT: This turn requires structured output. After your narrative response, you MUST append a tracker JSON block wrapped in <!--SP_TRACKER_START--> and <!--SP_TRACKER_END--> markers. Full schema is provided later in the context. This is non-negotiable — the response is incomplete without it.',
            extra:{isSmallSys:true}
        });
        chat.splice(Math.max(0,chat.length-1),0,{
            is_user:false,is_system:true,name:'System',
            mes:prompt,
            extra:{isSmallSys:true}
        });
        chat.push({
            is_user:false,is_system:true,name:'System',
            mes:'Your response must end with <!--SP_TRACKER_START-->{ tracker JSON }<!--SP_TRACKER_END--> after the narrative. Do not repeat these instructions in your output.',
            extra:{isSmallSys:true}
        });
        log('Interceptor [inline/together]: injected tracker prompt (~'+Math.round(prompt.length/4)+' tokens) + head/tail anchors',
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
