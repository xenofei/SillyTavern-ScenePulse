// ScenePulse — Dynamic Schema & Prompt Builder Module

import { DEFAULTS, BUILTIN_PANELS, BUILTIN_SCHEMA } from './constants.js';
import { getLanguage } from './settings.js';

// ── Sub-field toggle → schema property mappings ──
const CHAR_SUBFIELD_MAP={
    char_innerThought:['innerThought'],
    char_immediateNeed:['immediateNeed'],
    char_shortTermGoal:['shortTermGoal'],
    char_longTermGoal:['longTermGoal'],
    char_hair:['hair'],
    char_face:['face'],
    char_outfit:['outfit','stateOfDress'],
    char_posture:['posture'],
    char_proximity:['proximity'],
    char_physical:['physicalState'],
    char_inventory:['inventory'],
    char_fertility:['fertStatus','fertReason','fertCyclePhase','fertCycleDay','fertWindow','fertPregnancy','fertPregWeek','fertNotes']
};
const REL_SUBFIELD_MAP={
    rel_type:['relType'],
    rel_phase:['relPhase'],
    rel_timeknown:['timeTogether'],
    rel_milestone:['milestone'],
    rel_affection:['affection','affectionLabel'],
    rel_trust:['trust','trustLabel'],
    rel_desire:['desire','desireLabel'],
    rel_stress:['stress','stressLabel'],
    rel_compatibility:['compatibility','compatibilityLabel']
};
const BRANCH_TYPES=['dramatic','intense','comedic','twist','exploratory'];

// Deep-clone a schema object and strip disabled sub-field properties
function filterArraySchema(baseSchema,subFieldMap,ft){
    const clone=JSON.parse(JSON.stringify(baseSchema));
    const itemProps=clone.items?.properties;
    const itemReq=clone.items?.required;
    if(!itemProps)return clone;
    for(const[toggleKey,schemaKeys]of Object.entries(subFieldMap)){
        if(ft[toggleKey]===false){
            for(const sk of schemaKeys){
                delete itemProps[sk];
                if(itemReq){const idx=itemReq.indexOf(sk);if(idx!==-1)itemReq.splice(idx,1)}
            }
        }
    }
    return clone;
}

// ── Dynamic Schema Builder ──
// Constructs JSON schema from enabled built-in panels + custom panels
export function buildDynamicSchema(s){
    const props={};const required=[];
    const panels=s.panels||DEFAULTS.panels;
    const ft=s.fieldToggles||{};
    // Built-in panels: add their fields to the schema
    for(const[panelId,panelDef] of Object.entries(BUILTIN_PANELS)){
        if(!panels[panelId])continue;
        const dc=s.dashCards||DEFAULTS.dashCards;
        for(const f of panelDef.fields){
            // Skip disabled dashboard cards or field toggles
            if(f.dashCard&&dc[f.dashCard]===false)continue;
            if(ft[f.key]===false)continue;
            if(f.type==='string'){
                props[f.key]={type:'string',description:f.desc};
            } else if(f.type==='enum'){
                props[f.key]={type:'string',enum:f.options,description:f.desc};
            } else if(f.type==='array'){
                props[f.key]={type:'array',items:{type:f.itemType||'string'},description:f.desc};
            } else if(f.type==='questArray'){
                props[f.key]={type:'array',description:f.desc,items:{type:'object',properties:{name:{type:'string'},urgency:{type:'string',enum:['critical','high','moderate','low','resolved']},detail:{type:'string'}},required:['name','urgency','detail']}};
            } else if(f.type==='relationshipArray'){
                props[f.key]=filterArraySchema(BUILTIN_SCHEMA.value.properties.relationships,REL_SUBFIELD_MAP,ft);
            } else if(f.type==='characterArray'){
                props[f.key]=filterArraySchema(BUILTIN_SCHEMA.value.properties.characters,CHAR_SUBFIELD_MAP,ft);
            } else if(f.type==='plotArray'){
                // Filter enabled branch types
                const enabledTypes=BRANCH_TYPES.filter(t=>ft['branch_'+t]!==false);
                const clone=JSON.parse(JSON.stringify(BUILTIN_SCHEMA.value.properties.plotBranches));
                if(enabledTypes.length<BRANCH_TYPES.length&&clone.items?.properties?.type){
                    clone.items.properties.type.enum=enabledTypes;
                    clone.description=`Exactly ${enabledTypes.length} story directions — one per category.`;
                }
                props[f.key]=clone;
            }
            required.push(f.key);
        }
    }
    // Custom panels: add their fields
    const customPanels=s.customPanels||[];
    for(const cp of customPanels){
        if(!cp.fields?.length)continue;
        for(const f of cp.fields){
            const k=f.key;
            if(f.type==='text'){
                props[k]={type:'string',description:f.desc||f.label};
            } else if(f.type==='number'){
                props[k]={type:'integer',description:f.desc||f.label};
            } else if(f.type==='meter'){
                props[k]={type:'integer',minimum:0,maximum:100,description:(f.desc||f.label)+' (0-100 scale)'};
            } else if(f.type==='list'){
                props[k]={type:'array',items:{type:'string'},description:f.desc||f.label};
            } else if(f.type==='enum'){
                props[k]={type:'string',enum:f.options||[],description:f.desc||f.label};
            }
            required.push(k);
        }
    }
    return{"$schema":"http://json-schema.org/draft-07/schema#",type:"object",properties:props,required};
}

// ── Dynamic Prompt Builder ──
// Constructs field specifications from enabled panels + custom panels
export function buildDynamicPrompt(s, opts = {}){
    const panels=s.panels||DEFAULTS.panels;
    let prompt=`# SCENE TRACKER \u2014 JSON OUTPUT ONLY

You are a precise scene analysis engine. Read the story context and output a single JSON object conforming exactly to the provided schema. Output raw JSON only \u2014 no prose, no markdown fences, no commentary.

## CRITICAL RULES
1. EVERY field in the schema MUST contain meaningful data. NEVER return empty string "", empty array [], or null for ANY field. If not explicitly stated in the story, INFER from context, character descriptions, genre conventions, or the previous state. A best-guess answer is ALWAYS better than an empty field.
2. Output must be valid parseable JSON. No trailing commas, no comments.
3. If the previous state provided a value and you have no new information, carry that value forward UNCHANGED. Emptying a previously-populated field is a critical error.

## FIELD SPECIFICATIONS
`;
    // Language instruction
    const _lang=getLanguage();
    if(_lang)prompt+=`\n## LANGUAGE\nAll narrative string values MUST be in ${_lang}. This includes: sceneMood, sceneTopic, sceneSummary, sceneInteraction, soundEnvironment, character innerThought, goals, appearance descriptions, quest names and details, northStar, relationship labels and milestones, plotBranch names and hooks, custom field values.\nJSON keys, enum values (critical/high/moderate/low/resolved, calm/low/moderate/high/critical, pristine/neat/casual/etc.), and time/date formats remain in English.\n`;
    // Dashboard
    if(panels.dashboard){
        const dc=s.dashCards||DEFAULTS.dashCards;
        let envFields=[];
        if(dc.time!==false)envFields.push('- time: HH:MM:SS (24h format)');
        if(dc.date!==false)envFields.push('- date: MM/DD/YYYY (DayName) \u2014 e.g. "03/17/2025 (Monday)"');
        if(dc.location!==false)envFields.push('- location: Immediate > Parent \u2014 only 2 levels \u2014 e.g. "Kitchen > Windbloom Apartment"');
        if(dc.weather!==false)envFields.push('- weather: Sky/precipitation only.');
        if(dc.temperature!==false)envFields.push('- temperature: Include both number AND description. Example: "72°F — warm and humid" or "3°C — biting cold". Never just a number alone.');
        if(envFields.length)prompt+='\n### Environment\n'+envFields.join('\n')+'\n';
    }
    // Scene
    if(panels.scene){
        const ft=s.fieldToggles||{};
        let sceneFields=[];
        if(ft.sceneTopic!==false)sceneFields.push('- sceneTopic: What is happening in this scene in 1-5 words.');
        if(ft.sceneMood!==false)sceneFields.push('- sceneMood: The emotional atmosphere.');
        if(ft.sceneInteraction!==false)sceneFields.push('- sceneInteraction: How the characters are engaging.');
        if(ft.sceneTension!==false)sceneFields.push('- sceneTension: One of: calm, low, moderate, high, critical. Reflects stakes and urgency.');
        if(ft.sceneSummary!==false)sceneFields.push('- sceneSummary: 2-3 sentence factual summary of what is currently happening.');
        if(ft.soundEnvironment!==false)sceneFields.push('- soundEnvironment: What is audible right now.');
        if(ft.charactersPresent!==false)sceneFields.push('- charactersPresent: Array of ALL character names in the current location or nearby.');
        if(sceneFields.length)prompt+='\n### Scene Analysis (REQUIRED)\n'+sceneFields.join('\n')+'\n';
    }
    // Characters
    if(panels.characters){
        const ft=s.fieldToggles||{};
        let charFields=['- name: Character name','- role: WHO this person IS \u2014 their identity/title/relationship. NOT feelings.'];
        if(ft.char_innerThought!==false)charFields.push("- innerThought: The character's LITERAL inner voice \u2014 exact words. 1-3 sentences. NEVER emotion labels or narration.");
        if(ft.char_immediateNeed!==false)charFields.push('- immediateNeed: What they urgently need RIGHT NOW');
        if(ft.char_shortTermGoal!==false)charFields.push('- shortTermGoal: What they want in the coming hours/days');
        if(ft.char_longTermGoal!==false)charFields.push('- longTermGoal: Their overarching life motivation');
        if(ft.char_hair!==false)charFields.push('- hair: Hair style, color, length.');
        if(ft.char_face!==false)charFields.push('- face: Facial features, expression, makeup.');
        if(ft.char_outfit!==false){charFields.push('- outfit: Include all layers.');charFields.push('- stateOfDress: One of: pristine, neat, casual, slightly disheveled, disheveled, partially undressed, undressed')}
        if(ft.char_posture!==false)charFields.push('- posture: Body language and stance.');
        if(ft.char_proximity!==false)charFields.push('- proximity: Distance and position relative to others.');
        if(ft.char_physical!==false)charFields.push('- physicalState: Current physical condition.');
        if(ft.char_inventory!==false)charFields.push('- inventory: ONLY objects (phone, keys, weapons, bags) \u2014 NOT clothing');
        if(ft.char_fertility!==false){charFields.push('- fertStatus: "active" if biologically relevant, "N/A" otherwise');charFields.push('- fertReason: Why fertility is active or N/A');charFields.push('- fertCyclePhase: menstrual, follicular, ovulation, or luteal');charFields.push('- fertCycleDay: Day number in cycle (integer, 0 if N/A)');charFields.push('- fertWindow: infertile, low, moderate, high, peak, or N/A');charFields.push('- fertPregnancy: not pregnant, possibly conceived, confirmed pregnant, unknown, or N/A');charFields.push('- fertPregWeek: Pregnancy week (integer, 0 if N/A)');charFields.push('- fertNotes: Additional fertility notes')}
        prompt+='\n### Characters (all EXCEPT {{user}})\n'+charFields.join('\n')+'\n';
    }
    // Quests
    if(panels.quests){
        const ft=s.fieldToggles||{};
        let qFields=[];
        if(ft.northStar!==false)qFields.push("- northStar: {{user}}'s ONE driving dream or life purpose. \"Not yet revealed\" if unknown.");
        if(ft.mainQuests!==false)qFields.push('- mainQuests: PRIMARY storyline objectives. What {{user}} is trying to accomplish.');
        if(ft.sideQuests!==false)qFields.push('- sideQuests: Optional enriching paths {{user}} could pursue.');
        if(ft.activeTasks!==false)qFields.push('- activeTasks: Immediate concrete things {{user}} needs to do right now.');
        if(qFields.length){
            prompt+='\n### Quest Journal (from {{user}}\'s perspective)\n'+qFields.join('\n');
            if(ft.mainQuests!==false||ft.sideQuests!==false||ft.activeTasks!==false)prompt+='\n- All quests: name + urgency (critical/high/moderate/low/resolved) + detail.\n- ALWAYS from {{user}}\'s perspective. If hostile: oppose their goal. If ally: support them as {{user}}\'s action.\n- NEVER drop unresolved quests. Carry them forward. When a quest is completed in the story, set its urgency to "resolved" instead of removing it.\n';
        }
    }
    // Relationships
    if(panels.relationships){
        const ft=s.fieldToggles||{};
        let relFields=['- name: Character name'];
        if(ft.rel_type!==false)relFields.push('- relType: Their social role/dynamic with {{user}}');
        if(ft.rel_phase!==false)relFields.push('- relPhase: Current stage of their relationship');
        if(ft.rel_timeknown!==false)relFields.push('- timeTogether: How long they\'ve known each other');
        if(ft.rel_milestone!==false)relFields.push('- milestone: Most recent significant moment');
        const meters=[];
        if(ft.rel_affection!==false)meters.push('affection');
        if(ft.rel_trust!==false)meters.push('trust');
        if(ft.rel_desire!==false)meters.push('desire');
        if(ft.rel_stress!==false)meters.push('stress');
        if(ft.rel_compatibility!==false)meters.push('compatibility');
        if(meters.length)relFields.push('- Meters (0-100): '+meters.join(', ')+' \u2014 each with a descriptive label');
        if(ft.rel_desire!==false)relFields.push('- desire: 0 for anyone without established sexual interest (family, strangers, minors)');
        prompt+='\n### Relationships (how characters perceive {{user}})\n'+relFields.join('\n')+'\n';
    }
    // Story Ideas
    if(panels.storyIdeas){
        const ft=s.fieldToggles||{};
        const enabledTypes=BRANCH_TYPES.filter(t=>ft['branch_'+t]!==false);
        if(enabledTypes.length)prompt+=`\n### Plot Branches (EXACTLY ${enabledTypes.length} suggestions)\nOne per category: ${enabledTypes.join(', ')}. Each must be SPECIFIC to the current scene \u2014 name characters, reference established details. Each needs type, name (2-5 words), hook (1-2 sentences explaining what happens and why it matters).\n`;
    }
    // Custom panels
    const customPanels=s.customPanels||[];
    if(customPanels.length){
        prompt+=`\n### Custom Tracked Fields\n`;
        for(const cp of customPanels){
            if(!cp.fields?.length)continue;
            prompt+=`\n#### ${cp.name}\n`;
            for(const f of cp.fields){
                const typeHint=f.type==='meter'?'(integer 0-100)':f.type==='number'?'(integer)':f.type==='list'?'(array of strings)':f.type==='enum'?`(one of: ${(f.options||[]).join(', ')})`:('(string)');
                prompt+=`- ${f.key}: ${f.desc||f.label} ${typeHint}\n`;
            }
        }
    }
    // Delta mode instructions (only when previous state exists)
    if(s.deltaMode && opts.hasPrevState){
        prompt+=`

## DELTA MODE — RETURN ONLY CHANGES
You are in DELTA mode. The previous state is provided for reference.
1. ONLY return fields whose values CHANGED since the previous state.
2. OMIT any field whose value is identical to the previous state.
3. ALWAYS include: time, date, elapsed (these change every turn).
4. For characters/relationships: include ONLY entities with changes. Include the FULL entity object (all fields) if ANY field changed.
5. For quests: include the FULL array if ANY quest was added/removed/modified. Omit entirely if unchanged.
6. plotBranches: ALWAYS include (fresh suggestions every time).
7. Do NOT echo unchanged data. Omitting a field means "unchanged."
`;
    }
    return prompt;
}
