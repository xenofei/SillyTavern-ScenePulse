// ScenePulse — Dynamic Schema & Prompt Builder Module
// Extracted from index.js lines 455-603

import { DEFAULTS, BUILTIN_PANELS, BUILTIN_SCHEMA } from './constants.js';

// ── Dynamic Schema Builder ──
// Constructs JSON schema from enabled built-in panels + custom panels
export function buildDynamicSchema(s){
    const props={};const required=[];
    const panels=s.panels||DEFAULTS.panels;
    // Built-in panels: add their fields to the schema
    for(const[panelId,panelDef] of Object.entries(BUILTIN_PANELS)){
        if(!panels[panelId])continue;
        const dc=s.dashCards||DEFAULTS.dashCards;
        const ft=s.fieldToggles||{};
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
                props[f.key]={type:'array',description:f.desc,items:{type:'object',properties:{name:{type:'string'},urgency:{type:'string',enum:['critical','high','moderate','low']},detail:{type:'string'}},required:['name','urgency','detail']}};
            } else if(f.type==='relationshipArray'){
                props[f.key]=BUILTIN_SCHEMA.value.properties.relationships;
            } else if(f.type==='characterArray'){
                props[f.key]=BUILTIN_SCHEMA.value.properties.characters;
            } else if(f.type==='plotArray'){
                props[f.key]=BUILTIN_SCHEMA.value.properties.plotBranches;
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
export function buildDynamicPrompt(s){
    const panels=s.panels||DEFAULTS.panels;
    let prompt=`# SCENE TRACKER \u2014 JSON OUTPUT ONLY

You are a precise scene analysis engine. Read the story context and output a single JSON object conforming exactly to the provided schema. Output raw JSON only \u2014 no prose, no markdown fences, no commentary.

## CRITICAL RULES
1. Populate EVERY field in EVERY response. Infer from prior context if not explicitly stated. Never leave fields empty \u2014 use best available inference.
2. Output must be valid parseable JSON. No trailing commas, no comments.

## FIELD SPECIFICATIONS
`;
    // Dashboard
    if(panels.dashboard){
        const dc=s.dashCards||DEFAULTS.dashCards;
        let envFields=[];
        if(dc.time!==false)envFields.push('- time: HH:MM:SS (24h format)');
        if(dc.date!==false)envFields.push('- date: MM/DD/YYYY (DayName) \u2014 e.g. "03/17/2025 (Monday)"');
        if(dc.location!==false)envFields.push('- location: Immediate > Parent \u2014 only 2 levels \u2014 e.g. "Kitchen > Windbloom Apartment"');
        if(dc.weather!==false)envFields.push('- weather: Sky/precipitation only.');
        if(dc.temperature!==false)envFields.push('- temperature: Felt or exact.');
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
    if(panels.characters) prompt+=`
### Characters (all EXCEPT {{user}})
- role: WHO this person IS \u2014 their identity/title/relationship. NOT feelings. Examples: "{{user}}'s partner" | "13-year-old daughter" | "Stranger on the street"
- innerThought: The character's LITERAL inner voice \u2014 exact words running through their head. 1-3 sentences. Write as if reading their mind. NEVER include emotion labels or narration.
- immediateNeed: What they urgently need RIGHT NOW
- shortTermGoal: What they want in the coming hours/days
- longTermGoal: Their overarching life motivation
- Appearance fields: Be detailed and specific. Outfits include all layers.
- stateOfDress: One of: pristine, neat, casual, slightly disheveled, disheveled, partially undressed, undressed
- inventory: ONLY objects (phone, keys, weapons, bags) \u2014 NOT clothing
- Fertility: fertStatus=active only if biologically relevant, otherwise N/A all fertility fields
`;
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
            if(ft.mainQuests!==false||ft.sideQuests!==false||ft.activeTasks!==false)prompt+='\n- All quests: name + urgency (critical/high/moderate/low) + detail.\n- ALWAYS from {{user}}\'s perspective. If hostile: oppose their goal. If ally: support them as {{user}}\'s action.\n- NEVER drop unresolved quests. Carry them forward.\n';
        }
    }
    // Relationships
    if(panels.relationships) prompt+=`
### Relationships (how characters perceive {{user}})
- relType: Their social role/dynamic with {{user}}
- relPhase: Current stage of their relationship
- timeTogether: How long they've known each other
- milestone: Most recent significant moment
- Meters (0-100): affection, trust, desire, stress, compatibility \u2014 each with a descriptive label
- desire: 0 for anyone without established sexual interest (family, strangers, minors)
`;
    // Story Ideas
    if(panels.storyIdeas) prompt+=`
### Plot Branches (EXACTLY 5 suggestions)
One per category: dramatic, intense, comedic, twist, exploratory. Each must be SPECIFIC to the current scene \u2014 name characters, reference established details. Each needs type, name (2-5 words), hook (1-2 sentences explaining what happens and why it matters).
`;
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
    return prompt;
}
