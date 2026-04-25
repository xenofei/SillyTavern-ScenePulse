// ScenePulse — Dynamic Schema & Prompt Builder Module
//
// v6.18.0: the prompt-building logic was extracted into src/prompts/assembler.js
// so users can override individual prompt slots per profile. This file now
// only owns the SCHEMA builder; `buildDynamicPrompt` is preserved as a thin
// wrapper for backward compatibility (settings UI preview, slash commands,
// the doctor's schema round-trip check).

import { DEFAULTS, BUILTIN_PANELS, BUILTIN_SCHEMA } from './constants.js';
import { getActivePanels } from './settings.js';
import { assemblePrompt } from './prompts/assembler.js';

// ── Sub-field toggle → schema property mappings ──
// v6.8.15: schema trim dropped 6 fertility sub-fields (reason/phase/day/window/
// pregnancy/pregWeek), stateOfDress (merged into outfit), and physicalState
// (merged into posture). Added notableDetails as a single optional free-text
// field for distinguishing features that don't fit the structured slots.
const CHAR_SUBFIELD_MAP={
    char_archetype:['archetype'],
    char_innerThought:['innerThought'],
    char_immediateNeed:['immediateNeed'],
    char_shortTermGoal:['shortTermGoal'],
    char_longTermGoal:['longTermGoal'],
    char_hair:['hair'],
    char_face:['face'],
    char_outfit:['outfit'],
    char_posture:['posture'],
    char_proximity:['proximity'],
    char_notableDetails:['notableDetails'],
    char_inventory:['inventory'],
    char_fertility:['fertStatus','fertNotes']
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
                    clone.description=`Exactly ${enabledTypes.length} story directions in this order: ${enabledTypes.map((t,i)=>`[${i}]=${t}`).join(', ')}. One per category, never duplicate.`;
                    clone.minItems=enabledTypes.length;clone.maxItems=enabledTypes.length;
                }
                props[f.key]=clone;
            }
            required.push(f.key);
        }
    }
    // Custom panels: add their fields (v6.9.14: per-chat definitions)
    const customPanels=getActivePanels(s);
    for(const cp of customPanels){
        if(!cp.fields?.length||cp.enabled===false)continue;
        for(const f of cp.fields){
            if(f.enabled===false)continue; // v6.9.13: per-field toggle
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

// ── Dynamic Prompt Builder (v6.18.0 wrapper) ──
//
// Delegates to src/prompts/assembler.js. The legacy implementation lived
// inline here as ~220 lines; it now lives slot-by-slot in src/prompts/.
// Callers that pass only settings (settings UI preview, slash command
// preview, doctor schema round-trip) get default-text behavior because we
// pass profile=null. `getActivePrompt` in settings.js bypasses this wrapper
// and calls `assemblePrompt(s, profile, opts)` directly so it can apply
// per-slot overrides from the active profile.
export function buildDynamicPrompt(s, opts = {}) {
    return assemblePrompt(s, null, opts);
}
