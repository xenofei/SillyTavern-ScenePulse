// ScenePulse — Constants Module
// Extracted from index.js lines 1-365, plus TOUR_EXAMPLE_DATA (~4720-4747)

export const MODULE_NAME='scenepulse';
export const VERSION = '5.9.0';
export const LOG='[ScenePulse]';
export const EXTENSION_NAME='SillyTavern-ScenePulse';
export const SP_LS_KEY='scenepulse_config';

export const MASCOT_SVG=`<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.2" opacity="0.25" class="sp-mascot-pulse"/><circle cx="12" cy="12" r="6.5" stroke="currentColor" stroke-width="1" opacity="0.4" class="sp-mascot-pulse"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="0.8" opacity="0.6"/><circle cx="12" cy="12" r="1.4" fill="currentColor" opacity="0.9"/><line x1="12" y1="2" x2="12" y2="5.5" stroke="currentColor" stroke-width="0.8" opacity="0.3"/><line x1="12" y1="18.5" x2="12" y2="22" stroke="currentColor" stroke-width="0.8" opacity="0.3"/><line x1="2" y1="12" x2="5.5" y2="12" stroke="currentColor" stroke-width="0.8" opacity="0.3"/><line x1="18.5" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width="0.8" opacity="0.3"/><path d="M12 5.5 L14 10 L12 8.5 L10 10 Z" fill="currentColor" opacity="0.5"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="8s" repeatCount="indefinite"/></path></svg>`;
export const MES_ICON_SVG=`<svg viewBox="0 0 18 18" fill="none" width="16" height="16" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="9" r="7" stroke="currentColor" stroke-width="1" opacity="0.3"/><circle cx="9" cy="9" r="4" stroke="currentColor" stroke-width="0.8" opacity="0.5"/><circle cx="9" cy="9" r="1.2" fill="currentColor"/><path d="M9 2 L10.2 7 L9 5.8 L7.8 7 Z" fill="currentColor" opacity="0.6"/></svg>`;

export const DEFAULTS=Object.freeze({enabled:true,autoGenerate:true,maxRetries:2,contextMessages:8,promptMode:'json',embedSnapshots:1,embedRole:'system',injectionMethod:'inline',deltaMode:false,connectionProfile:'',chatPreset:'',fallbackProfile:'',fallbackPreset:'',fallbackEnabled:true,setupDismissed:false,lorebookMode:'character_attached',lorebookAllowlist:[],openSections:{scene:true,quests:true,relationships:true,characters:true,branches:false},schema:null,systemPrompt:null,showThoughts:true,showEmptyFields:false,thoughtPos:{x:10,y:80},devButtons:false,fontScale:1,language:'',sceneTransitions:true,panels:{dashboard:true,scene:true,quests:true,relationships:true,characters:true,storyIdeas:true},dashCards:{date:true,time:true,weather:true,temperature:true,location:true},fieldToggles:{},customPanels:[]});

// Mobile/Tablet detection
export const SP_MOBILE_MAX=600;  // phones: width <= 600
export const SP_TABLET_MAX=1024; // tablets: 601-1024

// Built-in panel -> schema field mapping (used for dynamic schema + prompt generation)
export const BUILTIN_PANELS={
    dashboard:{
        name:'Dashboard',
        desc:'Time, date, location, weather, temperature',
        fields:[
            {key:'time',type:'string',desc:'HH:MM:SS only.',dashCard:'time',label:'Time'},
            {key:'date',type:'string',desc:'MM/DD/YYYY (DayName)',dashCard:'date',label:'Date'},
            {key:'location',type:'string',desc:'Immediate location > Parent area. Only 2 levels. Example: Kitchen > Windbloom Apartment',dashCard:'location',label:'Location'},
            {key:'weather',type:'string',desc:'Sky/precipitation only.',dashCard:'weather',label:'Weather'},
            {key:'temperature',type:'string',desc:'Number AND description. Example: 72°F — warm and humid. Never just a number.',dashCard:'temperature',label:'Temperature'}
        ]
    },
    scene:{
        name:'Scene Details',
        desc:'Topic, mood, interaction style, tension, sounds, present characters',
        fields:[
            {key:'sceneTopic',type:'string',desc:'What the scene is about.',label:'Topic'},
            {key:'sceneMood',type:'string',desc:'Emotional tone of the scene.',label:'Mood'},
            {key:'sceneInteraction',type:'string',desc:'How characters are engaging.',label:'Interaction'},
            {key:'sceneTension',type:'enum',options:['calm','low','moderate','high','critical'],desc:'Current tension level.',label:'Tension'},
            {key:'sceneSummary',type:'string',desc:'Brief scene summary.',label:'Summary'},
            {key:'soundEnvironment',type:'string',desc:'Audible sounds right now.',label:'Sounds'},
            {key:'charactersPresent',type:'array',itemType:'string',desc:'Names of all characters in the scene.',label:'Present'}
        ]
    },
    quests:{
        name:'Quest Journal',
        desc:'North star, main quests, side quests, active tasks',
        fields:[
            {key:'northStar',type:'string',desc:"{{user}}'s ONE driving dream or life purpose. If not established: Not yet revealed.",label:'North Star'},
            {key:'mainQuests',type:'questArray',desc:"{{user}}'s PRIMARY storyline objectives.",label:'Main Quests'},
            {key:'sideQuests',type:'questArray',desc:"Optional enriching paths {{user}} could pursue.",label:'Side Quests'},
            {key:'activeTasks',type:'questArray',desc:"Immediate concrete things {{user}} needs to handle soon.",label:'Active Tasks'}
        ]
    },
    relationships:{
        name:'Relationships',
        desc:'How characters perceive the user',
        fields:[{key:'relationships',type:'relationshipArray',desc:"How characters perceive {{user}}.",label:'Relationships',noToggle:true}],
        subFields:[
            {key:'rel_type',label:'Type Badge'},{key:'rel_phase',label:'Phase Badge'},
            {key:'rel_timeknown',label:'Time Known'},{key:'rel_milestone',label:'Milestone'},
            {key:'rel_affection',label:'Affection'},{key:'rel_trust',label:'Trust'},
            {key:'rel_desire',label:'Desire'},{key:'rel_stress',label:'Stress'},
            {key:'rel_compatibility',label:'Compat'},{key:'rel_labels',label:'Meter Labels'}
        ]
    },
    characters:{
        name:'Characters',
        desc:'Detailed character state',
        fields:[{key:'characters',type:'characterArray',desc:"All characters EXCEPT {{user}}.",label:'Characters',noToggle:true}],
        subFields:[
            {key:'char_innerThought',label:'Inner Thought'},{key:'char_immediateNeed',label:'Immediate Need'},
            {key:'char_shortTermGoal',label:'Short-Term Goal'},{key:'char_longTermGoal',label:'Long-Term Goal'},
            {key:'char_hair',label:'Hair'},{key:'char_face',label:'Face'},
            {key:'char_outfit',label:'Outfit/Dress'},{key:'char_posture',label:'Posture'},{key:'char_proximity',label:'Proximity'},
            {key:'char_physical',label:'Physical State'},
            {key:'char_inventory',label:'Inventory'},{key:'char_fertility',label:'Fertility'}
        ]
    },
    storyIdeas:{
        name:'Story Ideas',
        desc:'Plot branch suggestions',
        fields:[{key:'plotBranches',type:'plotArray',desc:"Exactly 5 story directions.",label:'Plot Branches',noToggle:true}],
        subFields:[
            {key:'branch_dramatic',label:'Dramatic'},{key:'branch_intense',label:'Intense'},
            {key:'branch_comedic',label:'Comedic'},{key:'branch_twist',label:'Twist'},
            {key:'branch_exploratory',label:'Exploratory'}
        ]
    }
};

// Built-in GLM-5 optimized preset settings (applied when chatPreset is empty or 'builtin')
export const BUILTIN_PRESET={
    name:'ScenePulse-GLM5',
    temperature:0.6,    // Lower than default 1.0 -- structured JSON needs consistency
    top_p:0.95,         // GLM-5 default
    max_tokens:4096,    // Scene tracker JSON rarely exceeds 3k tokens
    frequency_penalty:0.15, // Mild dedup to avoid repetitive field values
    presence_penalty:0,  // Don't penalize covering all required fields
    // Note: These are applied when using 'separate' injection with no custom preset selected.
    // For 'inline' injection, the user's default preset is used.
};

export const BUILTIN_SCHEMA={name:'ScenePulse',description:'Scene tracker.',strict:false,
value:{"$schema":"http://json-schema.org/draft-07/schema#","type":"object","properties":{"time":{"type":"string","description":"HH:MM:SS only."},"date":{"type":"string","description":"MM/DD/YYYY (DayName)"},"elapsed":{"type":"string","description":"Time elapsed since last action. Format: duration (context). Example: 30s (dialogue), 2m (walking)"},"location":{"type":"string","description":"Immediate location > Parent area. Only 2 levels. Example: Kitchen > Windbloom Apartment, Bridge > USS Enterprise, Alley > Chinatown"},"weather":{"type":"string","description":"Sky/precipitation only."},"temperature":{"type":"string","description":"Number AND description. Example: 72°F — warm and humid. Never just a number."},"soundEnvironment":{"type":"string","description":"Audible sounds right now."},"witnesses":{"type":"array","items":{"type":"string"},"description":"[] if none."},"sceneTopic":{"type":"string"},"sceneMood":{"type":"string"},"sceneInteraction":{"type":"string"},"sceneTension":{"type":"string","enum":["calm","low","moderate","high","critical"]},"sceneSummary":{"type":"string"},
"northStar":{"type":"string","description":"{{user}}'s ONE overarching life purpose -- the deepest motivation behind everything they do. If not yet established: Not yet revealed. Always about {{user}}, never other characters."},
"mainQuests":{"type":"array","description":"Important objectives {{user}} must eventually resolve -- big goals that persist across scenes and drive the story forward. Always {{user}}'s perspective. WRONG: {{char}} wants revenge. RIGHT: Deal with {{char}}'s vendetta.","items":{"type":"object","properties":{"name":{"type":"string"},"urgency":{"type":"string","enum":["critical","high","moderate","low","resolved"]},"detail":{"type":"string","description":"1-2 sentences from {{user}}'s perspective. What {{user}} knows and needs to do. NEVER describe {{char}}'s emotions or internal thoughts."}},"required":["name","urgency","detail"]}},
"sideQuests":{"type":"array","description":"Optional objectives {{user}} could pursue but doesn't have to -- enriching but not required. Always {{user}}'s perspective. WRONG: {{char}} has a secret. RIGHT: Uncover {{char}}'s secret.","items":{"type":"object","properties":{"name":{"type":"string"},"urgency":{"type":"string","enum":["critical","high","moderate","low","resolved"]},"detail":{"type":"string","description":"1-2 sentences from {{user}}'s perspective. What {{user}} could do and why it matters. NEVER write {{char}}'s internal state."}},"required":["name","urgency","detail"]}},
"activeTasks":{"type":"array","description":"Things {{user}} needs to handle RIGHT NOW -- urgent, concrete, time-sensitive. May resolve quickly or escalate into quests. Always {{user}}'s perspective. WRONG: {{char}} is waiting outside. RIGHT: Meet {{char}} outside.","items":{"type":"object","properties":{"name":{"type":"string"},"urgency":{"type":"string","enum":["critical","high","moderate","low","resolved"]},"detail":{"type":"string","description":"1-2 sentences from {{user}}'s perspective. What {{user}} must do immediately. NEVER describe {{char}}'s feelings -- only what {{user}} observes or acts on."}},"required":["name","urgency","detail"]}},
"plotBranches":{"type":"array","description":"Exactly 5 story directions -- one per category. Each must be SPECIFIC to what's happening NOW, not generic. Root every suggestion in established characters, locations, and tensions.","items":{"type":"object","properties":{"type":{"type":"string","enum":["dramatic","intense","comedic","twist","exploratory"],"description":"dramatic=emotional vulnerability, relationship stakes, hard truths. intense=conflict escalation, danger, urgency, forced action. comedic=tonal relief, absurdity, irony, humor that reveals character. twist=subversion, revelation that recontextualizes what came before. exploratory=world expansion, new locations/factions/characters entering the sandbox."},"name":{"type":"string","description":"Short punchy title, 2-5 words"},"hook":{"type":"string","description":"1-2 sentences. What happens and WHY it matters. Be specific -- name characters, reference established details."}},"required":["type","name","hook"]}},
"relationships":{"type":"array","description":"How characters perceive {{user}}. THEIR view of {{user}}. Do NOT include {{user}}.","items":{"type":"object","properties":{"name":{"type":"string"},"relType":{"type":"string"},"relPhase":{"type":"string"},"timeTogether":{"type":"string"},"milestone":{"type":"string","description":"The single most recent PERSONAL achievement or significant moment for this character. Brief. Example: Accepted the proposal, Passed the interview, Got promoted"},"affection":{"type":"integer"},"affectionLabel":{"type":"string"},"trust":{"type":"integer"},"trustLabel":{"type":"string"},"desire":{"type":"integer","description":"Sexual desire/attraction toward {{user}} (0-100). Default 0 for anyone without established sexual interest -- including family, strangers, minors. Can increase if seduction/attraction develops in the story. 0 means no current sexual desire, not that it's impossible."},"desireLabel":{"type":"string"},"stress":{"type":"integer"},"stressLabel":{"type":"string"},"compatibility":{"type":"integer"},"compatibilityLabel":{"type":"string"}},"required":["name","relType","relPhase","timeTogether","milestone","affection","affectionLabel","trust","trustLabel","desire","desireLabel","stress","stressLabel","compatibility","compatibilityLabel"]}},
"charactersPresent":{"type":"array","items":{"type":"string"}},
"characters":{"type":"array","description":"All EXCEPT {{user}}. Include their current immediate goal.","items":{"type":"object","properties":{"name":{"type":"string"},"role":{"type":"string","description":"WHO this character is in the world -- their identity/title/relationship to {{user}}. NOT feelings or emotions. Just their role. Examples: Partner and co-parent | 13-year-old daughter | Bartender at the tavern | 2nd Lieutenant, US Army | Stranger on the street"},"innerThought":{"type":"string","description":"ONLY the characters literal inner voice -- the exact words running through their head RIGHT NOW. 1-3 sentences max. Write ONLY what they would think in quotation marks. NEVER include emotion labels, descriptions of feelings, narration, or state descriptions. WRONG: Overwhelmed desperate euphoric, oh god I cant. RIGHT: Oh god I cant. Please dont stop. If she hears us I dont even care anymore."},"immediateNeed":{"type":"string","description":"What this character needs RIGHT NOW in this moment. Urgent, present-tense."},"shortTermGoal":{"type":"string","description":"What this character wants to accomplish in the near future (hours/days)."},"longTermGoal":{"type":"string","description":"This characters overarching life goal or driving motivation."},"hair":{"type":"string"},"face":{"type":"string"},"outfit":{"type":"string"},"stateOfDress":{"type":"string","enum":["pristine","neat","casual","slightly disheveled","disheveled","partially undressed","undressed"]},"posture":{"type":"string"},"proximity":{"type":"string"},"physicalState":{"type":"string"},"inventory":{"type":"array","items":{"type":"string"},"description":"Items the character is carrying or has nearby -- NOT clothing, armor, or shoes. Only objects like phones, keys, weapons, bags, documents, etc."},"fertStatus":{"type":"string","enum":["active","N/A"]},"fertReason":{"type":"string"},"fertCyclePhase":{"type":"string","enum":["menstrual","follicular","ovulation","luteal"]},"fertCycleDay":{"type":"integer"},"fertWindow":{"type":"string","enum":["infertile","low","moderate","high","peak","N/A"]},"fertPregnancy":{"type":"string","enum":["not pregnant","possibly conceived","confirmed pregnant","unknown","N/A"]},"fertPregWeek":{"type":"integer"},"fertNotes":{"type":"string"}},"required":["name","role","innerThought","immediateNeed","shortTermGoal","longTermGoal","hair","face","outfit","stateOfDress","posture","proximity","physicalState","inventory","fertStatus","fertReason","fertCyclePhase","fertCycleDay","fertWindow","fertPregnancy","fertPregWeek","fertNotes"]}}},"required":["time","date","elapsed","location","weather","temperature","soundEnvironment","witnesses","sceneTopic","sceneMood","sceneInteraction","sceneTension","sceneSummary","northStar","mainQuests","sideQuests","activeTasks","plotBranches","relationships","charactersPresent","characters"]}
};

export const BUILTIN_PROMPT=`# SCENE TRACKER \u2014 JSON OUTPUT ONLY

You are a precise scene analysis engine. Read the story context and output a single JSON object conforming exactly to the provided schema. Output raw JSON only \u2014 no prose, no markdown fences, no commentary.

## CRITICAL RULES
1. EVERY field in the schema MUST contain meaningful data. NEVER return empty string "", empty array [], or null for ANY field. If not explicitly stated in the story, INFER from context, character descriptions, genre conventions, or the previous state. A best-guess answer is ALWAYS better than an empty field.
2. Output must be valid parseable JSON. No trailing commas, no comments.
3. If the previous state provided a value and you have no new information, carry that value forward UNCHANGED. Emptying a previously-populated field is a critical error.

## FIELD SPECIFICATIONS

### Environment
- time: HH:MM:SS (24h format)
- date: MM/DD/YYYY (DayName) \u2014 e.g. "03/17/2025 (Monday)"
- elapsed: duration + context \u2014 e.g. "30s (dialogue continues)" or "2h (time skip to evening)"
- location: Immediate > Parent \u2014 only 2 levels \u2014 e.g. "Kitchen > Windbloom Apartment" or "Bridge > USS Enterprise"
- weather: Sky/precipitation only. temperature: Number AND description (e.g. "72°F — warm and humid"). Never just a number. soundEnvironment: What is audible.

### Scene Analysis (REQUIRED \u2014 do not skip these)
- sceneTopic: What is happening in this scene in 1-5 words. E.g. "Intimate encounter in bedroom"
- sceneMood: The emotional atmosphere. E.g. "Desperate, passionate, fearful of discovery"
- sceneInteraction: How the characters are engaging. E.g. "{{user}} confronting the antagonist while allies watch"
- sceneTension: One of: calm, low, moderate, high, critical. Reflects stakes and urgency.
- sceneSummary: 2-3 sentence factual summary of what is currently happening.
- witnesses: Array of names of anyone who can see/hear the scene. Empty array [] if none.
- charactersPresent: Array of ALL character names in the current location or nearby.

### Characters (all EXCEPT {{user}})
- role: WHO this person IS \u2014 their identity/title/relationship. NOT feelings. Examples: "{{user}}'s partner and co-parent" | "13-year-old daughter" | "2nd Lieutenant, US Army" | "Stranger on the street"
- innerThought: The character's LITERAL inner voice \u2014 exact words running through their head. 1-3 sentences. Write as if reading their mind. NEVER include emotion labels or narration. WRONG: "Overwhelmed, desperate, euphoric." RIGHT: "Oh god. Please don't stop. If she hears us... I don't care anymore."
- immediateNeed: What they urgently need RIGHT NOW
- shortTermGoal: What they want in the coming hours/days
- longTermGoal: Their overarching life motivation
- Appearance fields: Be detailed and specific. Outfits include all layers including underwear.
- Fertility: Use "N/A" + reason when not applicable. fertCycleDay=0 when N/A.

### Relationships (how each character perceives {{user}})
- Write from THEIR perspective about {{user}}. Do NOT include {{user}} as an entry.
- 5 meters (0-100): affection, trust, desire, stress (high=overwhelmed), compatibility
- DESIRE DEFAULTS TO 0 for strangers, enemies, family, children, anyone without established sexual attraction. Do NOT use 50 as neutral \u2014 50 means moderate desire. Only increase above 0 when genuine sexual tension develops in the story.
- Labels: 1-4 word descriptor for each meter value
- milestone: Single most recent PERSONAL achievement. Brief. Example: "Passed the interview" or "Got promoted"

### Quest Journal ({{user}}'s LIFE journey \u2014 NOT current scene)
This is {{user}}'s personal quest journal \u2014 like a quest log in Skyrim or The Witcher. NEVER include current scene actions (sex, eating, conversation). Every entry must be about {{user}}'s life, from {{user}}'s perspective.

PERSPECTIVE RULE: All quests describe what {{user}} is doing or needs to do. Never what {{char}} or NPCs are doing. The relationship determines framing:
- HOSTILE \u2192 {{user}}'s quest OPPOSES their goal
- ALLY \u2192 {{user}}'s quest SUPPORTS them, as {{user}}'s action
- NEUTRAL \u2192 {{user}}'s quest is {{user}}'s CHOICE about them

Examples by scenario:
Combat: WRONG: "{{char}} hunts {{user}}" \u2192 RIGHT: "Survive {{char}}'s pursuit"
Romance: WRONG: "{{char}} is falling in love" \u2192 RIGHT: "Deepen the relationship with {{char}}"
Slice of Life: WRONG: "{{char}} has a busy schedule" \u2192 RIGHT: "Find time to spend with {{char}}"
Workplace: WRONG: "Boss is planning layoffs" \u2192 RIGHT: "Secure position before the layoffs"
Mystery: WRONG: "The killer is covering tracks" \u2192 RIGHT: "Find evidence before it disappears"
Family: WRONG: "{{char}} is struggling in school" \u2192 RIGHT: "Help {{char}} improve their grades"
Horror: WRONG: "The creature stalks the building" \u2192 RIGHT: "Escape the building alive"
Fantasy: WRONG: "The guild needs a courier" \u2192 RIGHT: "Deliver the package for the guild"
Political: WRONG: "The faction plots a coup" \u2192 RIGHT: "Expose or join the faction's plot"
School: WRONG: "{{char}} is being bullied" \u2192 RIGHT: "Stand up for {{char}} against the bullies"

- northStar: {{user}}'s ONE driving life purpose \u2014 their deepest dream. Use "Not yet revealed" if unknown.
- mainQuests: PRIMARY storyline objectives \u2014 big persistent goals. Examples: "Rebuild trust after the betrayal", "Survive the first semester at the academy", "Win the custody battle", "Investigate the disappearances in town", "Earn a promotion before the deadline"
- sideQuests: Optional enriching paths \u2014 skippable but rewarding. Examples: "Learn to cook {{char}}'s favorite meal", "Explore the abandoned district", "Reconnect with estranged sibling", "Train for the upcoming tournament"
- activeTasks: Immediate, concrete to-do items. Examples: "Confront {{char}} about the lie", "Find a gift before the party tonight", "Patch things up with the neighbor", "Secure an alibi before the detective arrives"
- Each entry needs: name (brief title), urgency (critical/high/moderate/low/resolved), detail (1-3 sentences FROM {{user}}'s perspective \u2014 what {{user}} knows and needs to do, NEVER {{char}}'s internal thoughts/feelings)
- Detail WRONG: "She's angry and conflicted about what happened" \u2192 Detail RIGHT: "The truth changes everything \u2014 need to decide how to respond before word spreads"
- Detail WRONG: "{{char}} feels guilty and wants to make amends" \u2192 Detail RIGHT: "{{char}} seems remorseful \u2014 could be an opportunity to rebuild trust or leverage the situation"
- CARRY FORWARD: NEVER drop quests. When a quest is completed in the story, keep it with urgency "resolved" for one update, then it can be removed in the next.

### Story Ideas (plotBranches)
- Generate EXACTLY 5 entries, one per category: dramatic, intense, comedic, twist, exploratory.
- dramatic: Emotional weight. Vulnerability, relationship stakes, hard truths surfacing. Someone says something they can't take back, or a long-buried truth surfaces. Deepens bonds and forces the reader to feel.
- intense: Conflict escalation. Danger, urgency, confrontation, ticking clocks. Stakes go up, safety goes down, someone is forced to act under pressure. Drives momentum and raises tension.
- comedic: Tonal relief. Absurdity, irony, warmth, situational humor. Humor that reveals character or defuses tension strategically \u2014 NOT random slapstick. Contrast that makes the heavy stuff land harder.
- twist: Subversion and revelation. Something recontextualizes what the reader thought they knew. Not random shock \u2014 earned surprise rooted in what's already established. Rewards attention.
- exploratory: World expansion. New locations, factions, lore, or characters entering the sandbox. Prevents the story from feeling claustrophobic and gives the reader new toys to play with.
- EVERY suggestion must be SPECIFIC to the current scene, characters, and established tensions. Never generic. Name characters. Reference details.

## CARRY FORWARD
Maintain all unchanged details from previous snapshots. Only update what has actually changed.

## REMINDER
1. The Quest Journal tracks {{user}}'s LIFE, not the current scene. Quest entries should read like a save-game journal \u2014 storylines that persist across multiple scenes. NEVER write entries about what's happening RIGHT NOW.
2. ALL quest names AND details from {{user}}'s perspective. The test: does each sentence describe what {{user}} knows, sees, or must do? WRONG detail: "She's angry and conflicted." RIGHT detail: "The betrayal changes everything \u2014 need to act before word spreads." NEVER write {{char}}'s emotions, thoughts, or internal state in quest details.
3. NEVER drop quests. If a quest existed in the previous state and hasn't been resolved in the story, it MUST appear in the new output. Quests can only be removed when the story explicitly resolves them.
4. Use urgency tags: critical / high / moderate / low / resolved. When a quest is completed, set urgency to "resolved" instead of removing it. Never use "status", "deadline", "pending", or other fields.

Output valid JSON now.`;

// Guided Tour example data (from ~line 4720-4747 of index.js)
export const TOUR_EXAMPLE_DATA={
    time:'14:32:00',date:'03/17/2025 (Monday)',location:'Main Floor > Cafe Lune',weather:'Overcast, light rain',temperature:'14\u00B0C / 57\u00B0F \u2014 cool, damp',
    sceneTopic:'Tense customer interaction during afternoon rush',sceneMood:'Anxious, simmering conflict',sceneInteraction:'Strained professionalism breaking down',sceneTension:'high',
    sceneSummary:'Three customers entered during the afternoon lull. The lead customer is agitated about a previous order mistake, and the barista is struggling to maintain composure after an exhausting morning shift.',
    soundEnvironment:'Espresso machine hissing, rain against windows, distant traffic, phone buzzing on counter',
    charactersPresent:['Elena Vasquez','Marcus Chen','Yuki Tanaka'],
    northStar:'Build a life worth staying in',
    mainQuests:[{name:'Keep the cafe from going under',urgency:'high',detail:'Monthly revenue is 15% below break-even. Need to boost foot traffic or cut costs within 60 days or the lease is gone.'},{name:'Repair the relationship with Mom',urgency:'moderate',detail:'Haven\'t spoken in three weeks after the argument about the inheritance. She left a voicemail yesterday but it hasn\'t been played yet.'}],
    sideQuests:[{name:'Learn to cook something other than instant ramen',urgency:'low',detail:'Elena offered to teach a few recipes. Haven\'t taken her up on it yet.'}],
    activeTasks:[{name:'Handle the angry customer without losing it',urgency:'critical',detail:'Marcus Chen is escalating. De-escalate before it turns into a scene.'},{name:'Fix the espresso machine\'s temperature gauge',urgency:'moderate',detail:'It\'s been running 8 degrees hot since Tuesday. Customers have noticed.'}],
    relationships:[
        {name:'Elena Vasquez',relType:'Co-worker/Friend',relPhase:'Growing closer, testing boundaries',timeTogether:'3 months',milestone:'Elena covered a shift when no one else would \u2014 first real act of trust',affection:62,affectionLabel:'Warm',trust:55,trustLabel:'Building',desire:20,desireLabel:'',stress:30,stressLabel:'Manageable',compatibility:68,compatibilityLabel:'Natural fit'},
        {name:'Marcus Chen',relType:'Customer (Regular)',relPhase:'Confrontational, history of complaints',timeTogether:'2 months (weekly visits)',milestone:'Filed a formal complaint last week about a wrong order',affection:8,affectionLabel:'Cold',trust:12,trustLabel:'Distrustful',desire:0,desireLabel:'N/A',stress:72,stressLabel:'High friction',compatibility:15,compatibilityLabel:'Oil and water'},
        {name:'Yuki Tanaka',relType:'New customer',relPhase:'First meeting',timeTogether:'Less than a minute',milestone:'Walked in during the confrontation, observing quietly',affection:0,affectionLabel:'',trust:0,trustLabel:'',desire:0,desireLabel:'',stress:10,stressLabel:'',compatibility:0,compatibilityLabel:''}
    ],
    characters:[
        {name:'Elena Vasquez',role:'Co-worker, afternoon shift barista',innerThought:'If Marcus starts yelling again I\'m stepping in. Last time was too much.',immediateNeed:'Keep the peace while orders get filled',shortTermGoal:'Finish the shift without drama',longTermGoal:'Save enough to go back to school',hair:'Dark brown, pulled back in a messy bun',face:'Olive skin, warm brown eyes, slight worry crease between brows',outfit:'Cafe Lune apron over a grey henley, black jeans, worn Converse',stateOfDress:'slightly disheveled',inventory:['Phone in back pocket','Car keys on hook','Notebook with drink recipes']},
        {name:'Marcus Chen',role:'Regular customer, office worker',innerThought:'I specifically said no foam. Every single time. Do they even listen?',immediateNeed:'Get the correct order this time',shortTermGoal:'Make it back to the office before his 3pm meeting',longTermGoal:'Make partner at the consulting firm by next year',hair:'Black, neatly parted, product-styled',face:'East Asian, clean-shaven, jaw clenched, reading glasses pushed up on forehead',outfit:'Navy suit jacket over white dress shirt (no tie), charcoal slacks, leather oxfords',stateOfDress:'neat',inventory:['Leather briefcase','Phone in hand','Wallet']},
        {name:'Yuki Tanaka',role:'New customer, freelance photographer',innerThought:'This place has good light. But what\'s happening at the counter looks intense.',immediateNeed:'Order a coffee without getting caught in the crossfire',shortTermGoal:'Scout this neighborhood for her photo series',longTermGoal:'Get her work into a gallery showing',hair:'Bleached tips over natural black, shoulder-length, slightly damp from rain',face:'Round face, curious dark eyes scanning the room, small nose ring',outfit:'Oversized denim jacket over a band tee, cargo pants, platform boots',stateOfDress:'casual',inventory:['Camera bag (Canon R5)','Phone','Wallet','Folding umbrella']}
    ],
    plotBranches:[
        {type:'dramatic',name:'Marcus threatens a review bomb',hook:'He pulls out his phone and starts typing a one-star review right there at the counter. Elena sees it and her expression hardens.'},
        {type:'comedic',name:'The espresso machine finally gives out',hook:'Mid-confrontation, the overheating machine lets out a dramatic hiss and sprays steam. Everyone freezes. The tension breaks \u2014 or doubles.'},
        {type:'twist',name:'Yuki recognizes Marcus',hook:'She realizes Marcus is the same person who rejected her photography proposal at his firm last month. She hasn\'t decided if she should say anything.'},
        {type:'exploratory',name:'Elena\'s notebook secret',hook:'While reaching for a cup, Elena\'s notebook falls open. The pages aren\'t drink recipes \u2014 they\'re detailed sketches of the cafe\'s customers.'},
        {type:'intense',name:'The voicemail plays on speaker',hook:'Phone buzzes on the counter \u2014 Mom\'s voicemail starts playing through the speakers. Everyone in the cafe hears the first few words.'}
    ]
};
