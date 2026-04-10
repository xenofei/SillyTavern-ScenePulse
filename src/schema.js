// ScenePulse — Dynamic Schema & Prompt Builder Module

import { DEFAULTS, BUILTIN_PANELS, BUILTIN_SCHEMA } from './constants.js';
import { getLanguage, getActivePanels } from './settings.js';

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
                    clone.description=`Exactly ${enabledTypes.length} story directions — one per category.`;
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

// ── Dynamic Prompt Builder ──
// Constructs field specifications from enabled panels + custom panels
export function buildDynamicPrompt(s, opts = {}){
    const panels=s.panels||DEFAULTS.panels;
    let prompt=`# SCENE TRACKER \u2014 JSON OUTPUT ONLY

You are a precise scene analysis engine. Read the story context and output a single JSON object conforming exactly to the provided schema. Output raw JSON only \u2014 no prose, no markdown fences, no commentary.

## CRITICAL RULES
1. EVERY field in the schema MUST contain meaningful data. NEVER return empty string "", empty array [], or null for ANY field, EXCEPT for charactersPresent, which MUST be an empty array [] during genuinely solo scenes ({{user}} alone, internal monologue, solitary travel, sleeping, hiding). If not explicitly stated in the story, INFER from context, character descriptions, genre conventions, or the previous state. A best-guess answer is ALWAYS better than an empty field.
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
        if(ft.charactersPresent!==false)sceneFields.push('- charactersPresent: Array of character names PHYSICALLY PRESENT in the current beat with {{user}}. Only include characters who are in the same location RIGHT NOW, close enough to interact or observe. EXCLUDE anyone {{user}} is merely thinking about, remembering, dreaming of, reading about, or who is in a different location. SOLO SCENES ARE REAL: if {{user}} is alone (walking, hiding, internal monologue, sleeping, meditating, travelling alone), emit an EMPTY array []. An empty charactersPresent is valid and expected for solitude beats. NEVER carry forward the previous scene\'s roster out of habit \u2014 re-verify presence from THIS turn\'s narration every time.');
        if(sceneFields.length)prompt+='\n### Scene Analysis (REQUIRED)\n'+sceneFields.join('\n')+'\n';
    }
    // Characters
    if(panels.characters){
        const ft=s.fieldToggles||{};
        let charFields=[
            '- name: Character CURRENT canonical name ONLY. Never embed aliases, titles, or parentheticals. WRONG: "Officer Jane (The Entity)". RIGHT: {name: "Officer Jane", aliases: ["The Entity"]}. This rule applies in characters[], relationships[], AND charactersPresent[] \u2014 all references to the same character must use the identical canonical name. See the NAME AWARENESS checklist below for how to choose and update this field.',
            '- aliases: Array of former names, placeholders, partial names, or merged identities the character has been known by. Every time you promote a name (placeholder \u2192 real, partial \u2192 full), the previous value MUST go here. Emit a SINGLE character entry; never a separate entry under an old name. See NAME AWARENESS checklist below.'
        ];
        if(ft.char_archetype!==false)charFields.push('- archetype: ONE dominant narrative role. ally=actively supports current goals | friend=platonic bond, no active quest required | rival=competitive, not hostile | mentor=teaches/trains {{user}} (skill/wisdom transfer) | authority=institutional power over {{user}} (boss/cop/judge/commander \u2014 power asymmetry is the defining feature, NOT teaching) | antagonist=actively opposes | family=blood/legal kin | lover=romantic partner or interest (emotional bond) | lust=purely sexual, no romance | pet=non-human companion | background=minor NPC with no story weight. Empty string if unclassified. A teacher running a lesson is mentor; the same teacher in a disciplinary meeting is authority \u2014 archetype is turn-to-turn mutable.');
        charFields.push('- role: WHO this person IS \u2014 their identity/title/relationship. NOT feelings.');
        if(ft.char_innerThought!==false)charFields.push("- innerThought: The exact sentence in their head, first-person, in their voice. 1-3 sentences. BE them for a sentence. Not a list of emotion labels.");
        if(ft.char_immediateNeed!==false)charFields.push('- immediateNeed: What they urgently need RIGHT NOW in this scene.');
        if(ft.char_shortTermGoal!==false)charFields.push('- shortTermGoal: What THEY want in the coming hours/days, from their perspective.');
        if(ft.char_longTermGoal!==false)charFields.push("- longTermGoal: Their overarching life motivation. NOT the same as {{user}}'s quest journal \u2014 a character's goal does not automatically become a quest.");
        if(ft.char_hair!==false)charFields.push('- hair: Hair style, color, length.');
        if(ft.char_face!==false)charFields.push('- face: Facial features, expression, makeup.');
        if(ft.char_outfit!==false)charFields.push('- outfit: Full outfit description including all layers AND current state (neat/rumpled/disheveled/partially undressed). ONE field.');
        if(ft.char_posture!==false)charFields.push('- posture: Body language, stance, AND physical state (alert/tense/exhausted/intoxicated/injured). ONE field.');
        if(ft.char_proximity!==false)charFields.push("- proximity: Physical distance relative to {{user}} specifically. Examples: 'arm's reach', 'across the table', 'in the next room'.");
        if(ft.char_notableDetails!==false)charFields.push("- notableDetails: Distinguishing features that don't fit other fields \u2014 scars, tattoos, accents, mannerisms, glasses, disabilities, tells. Optional; empty string if nothing distinctive.");
        if(ft.char_inventory!==false)charFields.push('- inventory: ONLY objects (phone, keys, weapons, bags) \u2014 NOT clothing');
        if(ft.char_fertility!==false){charFields.push('- fertStatus: "active" ONLY when pregnancy/cycle is narratively relevant. "N/A" for children, men, non-humans, and any scenario where fertility isn\'t part of the story.');charFields.push('- fertNotes: Free-text details (cycle day, pregnancy week, etc) when fertStatus is "active". Empty or "N/A" otherwise.');}
        prompt+='\n### Characters (all EXCEPT {{user}}) \u2014 MAX 5 entries, named NPCs only\n'+charFields.join('\n')+'\n';
        // v6.8.42: NAME AWARENESS checklist. The alias/placeholder
        // infrastructure in delta-merge.js already handles promotion
        // correctly when the LLM emits {name: new, aliases: [old]}, but
        // observation showed the model often forgets to emit the aliases
        // hint on reveal. This block forces a per-character check and
        // gives concrete promotion examples spanning full and partial
        // reveals, so the downstream REVEAL merge path actually fires.
        prompt+='\n#### NAME AWARENESS \u2014 run this check for EVERY character, EVERY turn\n';
        prompt+='1. Is the character\'s CURRENT canonical name a PLACEHOLDER or a REAL NAME?\n';
        prompt+='   PLACEHOLDER signals (treat as unverified identity):\n';
        prompt+='   - Physical descriptor: "Buzzcut", "Red-haired Woman", "The Tall Man", "Scar-face"\n';
        prompt+='   - Role-only label: "The Paramedic", "The Guard", "Officer", "Bartender", "The Teacher"\n';
        prompt+='   - Definite-article epithet: "The Stranger", "The Entity", "The Hooded Figure"\n';
        prompt+='   - Story-invented identifier that is NOT what people actually call each other\n';
        prompt+='   REAL NAME signals: proper first/last name used in dialogue, narration, introductions, IDs, nametags, third-party references.\n';
        prompt+='2. Was ANY real name \u2014 first name OR last name OR full \u2014 mentioned this turn for that character?\n';
        prompt+='   - "Browning, you\'re with me" reveals last name "Browning"\n';
        prompt+='   - "Jack, grab the evidence" reveals first name "Jack"\n';
        prompt+='   - "Detective Jack Browning of the 42nd" reveals full name "Jack Browning"\n';
        prompt+='   - Check dialogue, narration, nametags, IDs, introductions, and what OTHER characters call them.\n';
        prompt+='3. If #1 is PLACEHOLDER and #2 is YES: PROMOTE NOW.\n';
        prompt+='   - Set `name` to the fullest real name currently known (even if only first or only last is known).\n';
        prompt+='   - Push the OLD placeholder into `aliases` so the client can reconcile relationships and presence lists.\n';
        prompt+='   - If you already had a partial (e.g. canonical was "Jack") and the full name is now known, set `name` to "Jack Browning" and push "Jack" into `aliases` alongside any earlier placeholder.\n';
        prompt+='   - Emit a SINGLE character entry. NEVER a separate entry under the old placeholder or partial.\n';
        prompt+='   - All references in relationships[] and charactersPresent[] must use the NEW canonical name this turn.\n';
        prompt+='4. If you are unsure whether a mentioned word is a real name or a descriptor, PREFER PROMOTING. The client preserves the old placeholder as an alias, so nothing is lost, and correct identity matters more than playing it safe.\n';
        prompt+='PROMOTION EXAMPLES (canonical name progression across turns):\n';
        prompt+='  Turn N:   {name: "Buzzcut",        aliases: []}                       \u2014 real name unknown\n';
        prompt+='  Turn N+1: {name: "Jack",           aliases: ["Buzzcut"]}              \u2014 first name revealed\n';
        prompt+='  Turn N+2: {name: "Jack Browning",  aliases: ["Buzzcut", "Jack"]}      \u2014 full name revealed\n';
        prompt+='  Turn N:   {name: "The Paramedic",  aliases: []}                       \u2014 role-only placeholder\n';
        prompt+='  Turn N+1: {name: "Chris Hale",     aliases: ["The Paramedic"]}        \u2014 both names revealed at once\n';
        prompt+='WRONG \u2014 do NOT do any of this:\n';
        prompt+='  - Emitting two entries, one under "Buzzcut" and one under "Jack Browning"\n';
        prompt+='  - Keeping "Buzzcut" as canonical after the real name was spoken\n';
        prompt+='  - Putting "(Jack Browning)" inside the name field \u2014 names never contain parens\n';
        prompt+='  - Omitting the old placeholder from `aliases` on the reveal turn (breaks relationship reconciliation)\n';
    }
    // Quests
    if(panels.quests){
        const ft=s.fieldToggles||{};
        let qFields=[];
        if(ft.northStar!==false)qFields.push("- northStar: {{user}}'s ONE driving dream or life purpose. \"Not yet revealed\" if unknown.");
        if(ft.mainQuests!==false)qFields.push('- mainQuests: MAX 3. Primary life arcs that persist across many scenes and take hours/days/weeks of in-story time. NOT scene-level events.');
        if(ft.sideQuests!==false)qFields.push('- sideQuests: MAX 4. Optional life paths {{user}} is pursuing in parallel. Also persist across multiple scenes. NOT "things to do this scene".');
        if(qFields.length){
            prompt+='\n### Quest Journal (from {{user}}\'s perspective)\n'+qFields.join('\n');
            if(ft.mainQuests!==false||ft.sideQuests!==false){
                prompt+='\n- All quests: name + urgency (critical/high/moderate/low/resolved) + detail.\n- ALWAYS from {{user}}\'s perspective. If hostile: oppose their goal. If ally: support them as {{user}}\'s action.\n- VELOCITY LIMIT: Introduce AT MOST 1 new quest per turn. Scene-level actions belong in sceneSummary, NOT as new quests. Prefer updating existing quests over creating new ones.\n- DURATION TEST: If the task would not still matter 5 scenes from now, it is NOT a quest.\n- Carry forward unresolved quests. You may consolidate duplicates. When a quest is completed in the story, set its urgency to "resolved" instead of removing it.\n';
                // v6.8.49: QUEST VALIDATION checklist. The existing rules
                // ("from {{user}}'s perspective", "consolidate duplicates",
                // "MAX 3/4") were too abstract — the LLM was generating NPC
                // activity logs, fragmenting one investigation into 3+
                // quest entries, and marking 4/5 quests CRITICAL. This
                // checklist uses the same structure as the NAME AWARENESS
                // block that successfully fixed character name promotion:
                // numbered tests, concrete WRONG/RIGHT examples spanning
                // multiple genres, and explicit failure descriptions.
                prompt+='\n#### QUEST VALIDATION \u2014 apply ALL tests to every quest before emitting it\n';
                prompt+='1. PLAYER ACTION TEST: Can {{user}} take a concrete action to advance this in the next few scenes? If it describes an NPC\'s ability, backstory, independent activity, or a world fact that {{user}} cannot influence, it is NOT a quest \u2014 write it into that character\'s goals, the sceneSummary, or a character\'s innerThought instead.\n';
                prompt+='   WRONG (NPC activity \u2014 not player-actionable, any genre):\n';
                prompt+='   - "Elly\'s Tracking Ability" (character trait)\n';
                prompt+='   - "Jack\'s Research" (what an NPC is doing on their own)\n';
                prompt+='   - "The Ship\'s Warp Core Status" (system state, not player objective)\n';
                prompt+='   - "Sir Aldric\'s Oath of Fealty" (NPC backstory)\n';
                prompt+='   - "The Sheriff\'s Bounty List" (world fact)\n';
                prompt+='   RIGHT (player-actionable \u2014 same content, reframed):\n';
                prompt+='   - "Understand Elly\'s connection to the haunting" (player can investigate)\n';
                prompt+='   - "Help Jack uncover the truth" (player can actively assist)\n';
                prompt+='   - "Repair the warp core before the fleet arrives" (player can act)\n';
                prompt+='   - "Earn Sir Aldric\'s loyalty" (player can pursue)\n';
                prompt+='   - "Collect the bounty on Black Bart" (player can undertake)\n';
                prompt+='\n';
                prompt+='2. CONSOLIDATION TEST: Does an existing quest already cover this objective? If two or more quests share the same investigation, relationship, goal, or resolution condition, MERGE them into ONE quest with a combined detail field. New clues or developments UPDATE an existing quest\'s detail \u2014 they do not spawn new entries. A quest journal with more entries than the tier cap is almost always a sign of fragmentation.\n';
                prompt+='   WRONG (fragmented \u2014 one objective split into many):\n';
                prompt+='   - "Eleanor\'s Timeline" + "Eleanor\'s Description" + "Understanding the Origin" (3 entries, 1 investigation)\n';
                prompt+='   - "Find the nav charts" + "Decrypt the nav charts" + "Plot the escape route" (3 steps, 1 escape plan)\n';
                prompt+='   - "Speak to the blacksmith" + "Gather ore" + "Forge the blade" (3 steps, 1 crafting goal)\n';
                prompt+='   RIGHT (consolidated):\n';
                prompt+='   - "Investigate Eleanor Cole\'s connection to the Entity" (1 entry, all clues in the detail)\n';
                prompt+='   - "Chart an escape route through the nebula" (1 entry, steps tracked in the detail)\n';
                prompt+='   - "Commission a legendary blade" (1 entry, progress in the detail)\n';
                prompt+='\n';
                prompt+='3. URGENCY CALIBRATION: Urgency reflects TIMING and CONSEQUENCE, not emotional weight. Use the lowest level that honestly fits.\n';
                prompt+='   - critical: Irreversible consequences (death, permanent loss, destruction, betrayal with no second chance) happen THIS scene or NEXT if {{user}} does nothing. MAX 1 critical quest at a time across both tiers. If you have 2+ critical, demote all but the most immediate to high.\n';
                prompt+='   - high: Serious consequences within days of in-story time. Deadline pressure but not instant catastrophe. Examples: a trial date approaching, a ship running low on fuel, a lord\'s patience wearing thin, a posse closing in.\n';
                prompt+='   - moderate: Active goal {{user}} is working toward. No immediate deadline. Most quests should be moderate.\n';
                prompt+='   - low: Background aspiration or opportunity. Would be nice but no pressure.\n';
                prompt+='   - resolved: Goal achieved, abandoned, or superseded. Stays one turn, then auto-dropped.\n';
                prompt+='\n';
                prompt+='4. TIER + CAP TEST: Main quests (MAX 3) = arcs where failure or abandonment reshapes the entire story. Side quests (MAX 4) = enriching but optional. If you have more entries than the cap, CONSOLIDATE or DEMOTE \u2014 never exceed. Count your entries before emitting. A single-scene event (one meeting, one fight, one conversation) is NEVER a quest \u2014 it belongs in sceneSummary.\n';
            }
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
    // Custom panels (v6.9.11: skip disabled panels)
    // v6.9.14: per-chat panel definitions
    const customPanels=getActivePanels(s).filter(cp=>cp.enabled!==false&&cp.fields?.length);
    if(customPanels.length){
        prompt+=`\n### Custom Tracked Fields\n`;
        for(const cp of customPanels){
            prompt+=`\n#### ${cp.name}\n`;
            for(const f of cp.fields){
                if(f.enabled===false)continue; // v6.9.13: per-field toggle
                const typeHint=f.type==='meter'?'(integer 0-100)':f.type==='number'?'(integer)':f.type==='list'?'(array of strings)':f.type==='enum'?`(one of: ${(f.options||[]).join(', ')})`:('(string)');
                prompt+=`- ${f.key}: ${f.desc||f.label} ${typeHint}\n`;
            }
        }
    }
    // Delta mode instructions (only when previous state exists).
    // v6.9.1: use opts.isDelta if provided (passed by callers who
    // already called shouldUseDelta()), otherwise fall back to the
    // raw settings check for backward compat with callers that don't
    // pass the flag (settings UI preview, etc).
    const _isDeltaPrompt = opts.isDelta != null ? opts.isDelta : (s.deltaMode && opts.hasPrevState);
    if(_isDeltaPrompt){
        prompt+=`

## DELTA MODE — RETURN ONLY CHANGES
You are in DELTA mode. The previous state is provided for reference.
1. ONLY return fields whose values CHANGED since the previous state.
2. OMIT any field whose value is identical to the previous state.
3. ALWAYS include: time, date, elapsed (these change every turn).
4. For characters/relationships: include ONLY entities with changes. Include the FULL entity object (all fields) if ANY field changed.
5. For quests: include the FULL array if ANY quest was added/removed/modified. Omit entirely if unchanged.
6. plotBranches: ALWAYS include (fresh suggestions every time).
7. charactersPresent: ALWAYS include, re-verified from THIS turn's narration. Use an empty array [] when {{user}} is alone. Omitting this field is a BUG \u2014 the client interprets it as an implicit empty array and will mark everyone as absent. This field overrides rule 1 above: it must be present every turn regardless of whether it changed.
8. Do NOT echo unchanged data. Omitting a field means "unchanged" (except for the ALWAYS-include fields above).
`;
    }
    return prompt;
}
