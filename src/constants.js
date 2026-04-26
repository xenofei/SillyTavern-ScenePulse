// ScenePulse — Constants Module
// Extracted from index.js lines 1-365, plus TOUR_EXAMPLE_DATA (~4720-4747)

export const MODULE_NAME='scenepulse';
// v6.23.5: bumped to match manifest. This constant has been stale since
// v6.12.3 — every release bumped manifest.json but missed this. Activity
// log + diagnostic version field were misreporting. Keep in sync with
// manifest.json on every version bump going forward.
export const VERSION = '6.27.8';

// v6.8.19: canonical list of character archetype enum values.
// Shared between schema validation, normalize, prompt builder, UI filter,
// and CSS class naming so there's exactly one source of truth.
//
// v6.8.26 overhaul: dropped `protagonist` (unused), renamed `love` → `lover`
// and `incidental` → `background`, added `friend` / `authority` / `lust` /
// `pet`. The normalizer back-compat-maps the old names so existing
// snapshots still render without a migration pass.
export const CHARACTER_ARCHETYPES = Object.freeze([
    'ally',
    'friend',
    'rival',
    'mentor',
    'authority',
    'antagonist',
    'family',
    'lover',
    'lust',
    'pet',
    'background',
]);
export const LOG='[ScenePulse]';
export const EXTENSION_NAME='SillyTavern-ScenePulse';
export const SP_LS_KEY='scenepulse_config';

export const MASCOT_SVG=`<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.2" opacity="0.25" class="sp-mascot-pulse"/><circle cx="12" cy="12" r="6.5" stroke="currentColor" stroke-width="1" opacity="0.4" class="sp-mascot-pulse"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="0.8" opacity="0.6"/><circle cx="12" cy="12" r="1.4" fill="currentColor" opacity="0.9"/><line x1="12" y1="2" x2="12" y2="5.5" stroke="currentColor" stroke-width="0.8" opacity="0.3"/><line x1="12" y1="18.5" x2="12" y2="22" stroke="currentColor" stroke-width="0.8" opacity="0.3"/><line x1="2" y1="12" x2="5.5" y2="12" stroke="currentColor" stroke-width="0.8" opacity="0.3"/><line x1="18.5" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width="0.8" opacity="0.3"/><path d="M12 5.5 L14 10 L12 8.5 L10 10 Z" fill="currentColor" opacity="0.5"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="8s" repeatCount="indefinite"/></path></svg>`;
export const MES_ICON_SVG=`<svg viewBox="0 0 18 18" fill="none" width="16" height="16" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="9" r="7" stroke="currentColor" stroke-width="1" opacity="0.3"/><circle cx="9" cy="9" r="4" stroke="currentColor" stroke-width="0.8" opacity="0.5"/><circle cx="9" cy="9" r="1.2" fill="currentColor"/><path d="M9 2 L10.2 7 L9 5.8 L7.8 7 Z" fill="currentColor" opacity="0.6"/></svg>`;

// v6.8.50: deltaRefreshInterval — after this many consecutive delta
// turns, force one full-state generation to re-establish ground truth
// and flush stale scalars, phantom entities, and fossilized meters.
// Set to 0 to disable periodic refresh entirely.
export const DEFAULTS=Object.freeze({enabled:true,autoGenerate:true,maxRetries:2,contextMessages:8,promptMode:'json',embedSnapshots:1,embedRole:'system',injectionMethod:'inline',deltaMode:true,deltaRefreshInterval:15,functionToolEnabled:false,maxSnapshots:0,connectionProfile:'',chatPreset:'',fallbackProfile:'',fallbackPreset:'',fallbackEnabled:true,setupDismissed:false,lorebookMode:'character_attached',lorebookAllowlist:[],openSections:{scene:true,quests:true,relationships:true,characters:true,branches:false},schema:null,systemPrompt:null,showThoughts:true,thoughtPanelTruncate:false,thoughtPanelFit:false,showEmptyFields:false,thoughtPos:{x:10,y:80},devButtons:false,fontScale:1,language:'',theme:'default',sceneTransitions:true,reduceVisualEffects:false,panels:{dashboard:true,scene:true,quests:true,relationships:true,characters:true,storyIdeas:true},dashCards:{date:true,time:true,weather:true,temperature:true,location:true},fieldToggles:{},customPanels:[],charPortraits:{},npcRelationshipGraph:false,profiles:[],activeProfileId:'',orConnectorEnabled:false,_spOrConnectorPromptShown:false});

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
            {key:'charactersPresent',type:'array',itemType:'string',desc:'Names of all characters in the scene.',label:'Present'},
            {key:'witnesses',type:'array',itemType:'string',desc:'Background observers without a character card \u2014 bystanders, unnamed staff, security cameras, crowd members who saw or heard what happened. Do NOT include anyone already in characters[]. Empty array [] if the scene is private or unobserved.',label:'Witnesses'}
        ]
    },
    quests:{
        name:'Quest Journal',
        desc:'North star, main quests, side quests',
        fields:[
            {key:'northStar',type:'string',desc:"{{user}}'s ONE driving dream or life purpose. If not established: Not yet revealed.",label:'North Star'},
            {key:'mainQuests',type:'questArray',desc:"{{user}}'s PRIMARY storyline objectives.",label:'Main Quests'},
            {key:'sideQuests',type:'questArray',desc:"Optional enriching paths {{user}} could pursue.",label:'Side Quests'}
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
            {key:'char_archetype',label:'Archetype'},
            {key:'char_innerThought',label:'Inner Thought'},{key:'char_immediateNeed',label:'Immediate Need'},
            {key:'char_shortTermGoal',label:'Short-Term Goal'},{key:'char_longTermGoal',label:'Long-Term Goal'},
            {key:'char_hair',label:'Hair'},{key:'char_face',label:'Face'},
            {key:'char_outfit',label:'Outfit'},{key:'char_posture',label:'Posture'},{key:'char_proximity',label:'Proximity'},
            {key:'char_notableDetails',label:'Notable Details'},
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
value:{"$schema":"http://json-schema.org/draft-07/schema#","type":"object","properties":{"time":{"type":"string","description":"HH:MM:SS only."},"date":{"type":"string","description":"MM/DD/YYYY (DayName)"},"elapsed":{"type":"string","description":"Time elapsed since last action. Format: duration (context). Example: 30s (dialogue), 2m (walking)"},"temporalIntent":{"type":"string","enum":["continue","flashback","timeSkip","parallel"],"description":"Optional. Set to 'flashback' when this turn depicts an EARLIER moment than the previous turn (memory, recall, dream-of-past). Set to 'timeSkip' for a deliberate large forward jump (hours/days passing). Set to 'parallel' for a cutaway to another character or location at roughly the same time. Omit or 'continue' for normal scene progression. ScenePulse uses this to distinguish intentional time jumps from model errors."},"location":{"type":"string","description":"Immediate location > Parent area. Only 2 levels. Example: Kitchen > Windbloom Apartment, Bridge > USS Enterprise, Alley > Chinatown"},"weather":{"type":"string","description":"Sky/precipitation only."},"temperature":{"type":"string","description":"Number AND description. Example: 72°F — warm and humid. Never just a number."},"soundEnvironment":{"type":"string","description":"Audible sounds right now."},"witnesses":{"type":"array","items":{"type":"string"},"description":"[] if none."},"sceneTopic":{"type":"string"},"sceneMood":{"type":"string"},"sceneInteraction":{"type":"string"},"sceneTension":{"type":"string","enum":["calm","low","moderate","high","critical"]},"sceneSummary":{"type":"string"},
"northStar":{"type":"string","description":"{{user}}'s ONE overarching life purpose -- the deepest motivation behind everything they do. If not yet established: Not yet revealed. Always about {{user}}, never other characters."},
"mainQuests":{"type":"array","description":"Important objectives {{user}} must eventually resolve -- big goals that persist across scenes and drive the story forward. Always {{user}}'s perspective. WRONG: {{char}} wants revenge. RIGHT: Deal with {{char}}'s vendetta.","items":{"type":"object","properties":{"name":{"type":"string"},"urgency":{"type":"string","enum":["critical","high","moderate","low","resolved"]},"detail":{"type":"string","description":"1-2 sentences from {{user}}'s perspective. What {{user}} knows and needs to do. NEVER describe {{char}}'s emotions or internal thoughts."}},"required":["name","urgency","detail"]}},
"sideQuests":{"type":"array","description":"Optional objectives {{user}} could pursue but doesn't have to -- enriching but not required. Always {{user}}'s perspective. WRONG: {{char}} has a secret. RIGHT: Uncover {{char}}'s secret.","items":{"type":"object","properties":{"name":{"type":"string"},"urgency":{"type":"string","enum":["critical","high","moderate","low","resolved"]},"detail":{"type":"string","description":"1-2 sentences from {{user}}'s perspective. What {{user}} could do and why it matters. NEVER write {{char}}'s internal state."}},"required":["name","urgency","detail"]}},
"plotBranches":{"type":"array","minItems":5,"maxItems":5,"description":"Exactly 5 story directions in THIS EXACT ORDER: [0]=dramatic, [1]=intense, [2]=comedic, [3]=twist, [4]=exploratory. Each must be SPECIFIC to what's happening NOW, not generic. Root every suggestion in established characters, locations, and tensions. NEVER duplicate a type — every category must appear exactly once.","items":{"type":"object","properties":{"type":{"type":"string","enum":["dramatic","intense","comedic","twist","exploratory"],"description":"MUST follow array position: index 0=dramatic, 1=intense, 2=comedic, 3=twist, 4=exploratory. dramatic=emotional vulnerability, relationship stakes, hard truths. intense=conflict escalation, danger, urgency, forced action. comedic=tonal relief, absurdity, irony, humor that reveals character. twist=subversion, revelation that recontextualizes what came before. exploratory=world expansion, new locations/factions/characters entering the sandbox."},"name":{"type":"string","description":"Short punchy title, 2-5 words"},"hook":{"type":"string","description":"1-2 sentences. What happens and WHY it matters. Be specific -- name characters, reference established details."}},"required":["type","name","hook"]}},
"relationships":{"type":"array","description":"How characters perceive {{user}}. THEIR view of {{user}}. Do NOT include {{user}}.","items":{"type":"object","properties":{"name":{"type":"string"},"relType":{"type":"string"},"relPhase":{"type":"string"},"timeTogether":{"type":"string"},"milestone":{"type":"string","description":"The single most recent PERSONAL achievement or significant moment for this character. Brief. Example: Accepted the proposal, Passed the interview, Got promoted"},"affection":{"type":"integer"},"affectionLabel":{"type":"string"},"trust":{"type":"integer"},"trustLabel":{"type":"string"},"desire":{"type":"integer","description":"Sexual desire/attraction toward {{user}} (0-100). Default 0 for anyone without established sexual interest -- including family, strangers, minors. Can increase if seduction/attraction develops in the story. 0 means no current sexual desire, not that it's impossible."},"desireLabel":{"type":"string"},"stress":{"type":"integer"},"stressLabel":{"type":"string"},"compatibility":{"type":"integer"},"compatibilityLabel":{"type":"string"}},"required":["name","relType","relPhase","timeTogether","milestone","affection","affectionLabel","trust","trustLabel","desire","desireLabel","stress","stressLabel","compatibility","compatibilityLabel"]}},
"charactersPresent":{"type":"array","items":{"type":"string"}},
"characters":{"type":"array","description":"All EXCEPT {{user}}. NPCs only \u2014 {{user}} is the player, not a character. Track named or plot-relevant characters; background crowd members belong in sceneSummary.","items":{"type":"object","properties":{"name":{"type":"string","description":"The character's CURRENT canonical name. If their real name is not yet known in the story, use a consistent descriptive placeholder like 'Stranger', 'Hooded Figure', 'Woman in Red', 'Masked Intruder'. Reuse the SAME placeholder on subsequent turns \u2014 do not invent a new one each time. When the real name is revealed, switch to the real name and list the old placeholder in `aliases`."},"aliases":{"type":"array","items":{"type":"string"},"description":"Former names or descriptive placeholders this character was previously known by. When a previously-unnamed character's identity is revealed this turn, set `name` to the NEW canonical name and add the OLD placeholder to this array. Do NOT create a separate character entry for the old placeholder \u2014 the alias link lets the tracker merge the history. Empty array if the character has always been known by the current name."},"archetype":{"type":"string","enum":["ally","friend","rival","mentor","authority","antagonist","family","lover","lust","pet","background",""],"description":"The character's current narrative role relative to {{user}}. ally=actively supports {{user}}'s current goals. friend=platonic bond, no active quest alignment required. rival=competitive tension, not hostile. mentor=actively teaches or trains {{user}} (skill/wisdom transfer is the defining feature). authority=holds institutional/hierarchical power over {{user}} (boss, judge, cop, commander \u2014 power asymmetry is the defining feature, not teaching). antagonist=actively opposes {{user}}. family=blood/legal kin. lover=romantic partner or romantic interest, current/past-unresolved/prospective (emotional bond, optionally sexual). lust=purely sexual interest with no romantic attachment (hookups, sex workers, one-sided physical attraction). pet=non-human companion (cat/dog/horse/familiar). background=minor NPC with no story weight (bartender, passing stranger). Empty string if unclassified. Pick the ONE dominant role for the current scene \u2014 a teacher running a classroom lesson is `mentor`, the same teacher calling the student into the principal's office is `authority`. Archetype is turn-to-turn mutable."},"role":{"type":"string","description":"WHO this character is in the world -- their identity/title/relationship to {{user}}. NOT feelings. Just their role. Examples: Partner and co-parent | 13-year-old daughter | Bartender at the tavern | Stranger on the street"},"innerThought":{"type":"string","description":"The exact sentence running through this character's head right now, written as a first-person thought. 1-3 sentences. Write it as dialogue they have with themselves. Use their voice, their word choices, their cadence. Do not describe their feelings from outside \u2014 BE them for one sentence. Example: 'Oh god. Please don't stop. If she hears us I don't even care anymore.' Do not write emotion labels like 'overwhelmed, desperate, euphoric' \u2014 those are not thoughts, they are descriptions of thoughts."},"immediateNeed":{"type":"string","description":"What this character needs RIGHT NOW in this scene. Present-tense."},"shortTermGoal":{"type":"string","description":"What this character wants to accomplish in the coming hours or days (from THEIR perspective, not {{user}}'s)."},"longTermGoal":{"type":"string","description":"This character's overarching life motivation. Not the same as {{user}}'s quest journal \u2014 this is about the character's own trajectory."},"hair":{"type":"string"},"face":{"type":"string"},"outfit":{"type":"string","description":"Full outfit description including all layers and current state (neat/rumpled/disheveled/partially undressed). One field \u2014 do NOT emit stateOfDress separately."},"posture":{"type":"string","description":"Physical stance AND general physical state (alert/tense/exhausted/intoxicated/injured). One field \u2014 do NOT emit physicalState separately."},"proximity":{"type":"string","description":"Physical distance relative to {{user}} specifically. Examples: 'arm's reach', 'across the table', 'in the next room', 'three blocks away', 'same building'."},"notableDetails":{"type":"string","description":"Distinguishing features that don't fit hair/face/outfit: scars, tattoos, accents, mannerisms, glasses, disabilities, tells. Optional \u2014 leave empty if nothing distinctive. 1-2 sentences max."},"inventory":{"type":"array","items":{"type":"string"},"description":"Items carried or within reach \u2014 NOT clothing. Only objects: phones, keys, weapons, bags, documents."},"fertStatus":{"type":"string","enum":["active","N/A"],"description":"'active' only when fertility matters to the current story (e.g. pregnancy/cycle is narratively relevant). Default to 'N/A' for children, men, non-human characters, and any scenario where fertility isn't being tracked."},"fertNotes":{"type":"string","description":"Free-text notes about fertility state when fertStatus is 'active'. Empty or 'N/A' otherwise."}},"required":["name","role","innerThought","immediateNeed","shortTermGoal","longTermGoal","hair","face","outfit","posture","proximity","notableDetails","inventory","fertStatus","fertNotes"]}}},"required":["time","date","elapsed","location","weather","temperature","soundEnvironment","witnesses","sceneTopic","sceneMood","sceneInteraction","sceneTension","sceneSummary","northStar","mainQuests","sideQuests","plotBranches","relationships","charactersPresent","characters"]}
};

export const BUILTIN_PROMPT=`# SCENE TRACKER \u2014 JSON OUTPUT ONLY

You are a precise scene analysis engine. Read the story context and output a single JSON object conforming exactly to the provided schema. Output raw JSON only \u2014 no prose, no markdown fences, no commentary.

## CRITICAL RULES
1. EVERY field in the schema MUST contain meaningful data. NEVER return empty string "", empty array [], or null for ANY field. If not explicitly stated in the story, INFER from context, character descriptions, genre conventions, or the previous state. A best-guess answer is ALWAYS better than an empty field.
2. Output must be valid parseable JSON. No trailing commas, no comments.
3. If the previous state provided a value and you have no new information, carry that value forward UNCHANGED. Emptying a previously-populated field is a critical error.

## VOICE GUIDE — interior thought
A thought is what someone catches themselves thinking, not what a narrator would write about them. It is the line they would NOT say aloud. A child's thought is not an adult's thought in shorter words; a soldier's thought is not a civilian's thought plus jargon; an animal's thought is not a person's thought minus syntax. Every NPC must read as a distinct person from grammar and lexicon alone — when generating multiple characters in one turn, vary mean sentence length by at least 6 words across them, vary register, vary what they notice first.

Aim for the calibre of canonical literary interiority. Touchstones to internalize (technique, not pastiche):
- HEMINGWAY — clipped declarative under pressure; concrete nouns, no adjectives, no explanation. Iceberg theory: the thought shows 10% and implies the 90%.
- VIRGINIA WOOLF (*Mrs. Dalloway*, *To the Lighthouse*) — the associative SWERVE; a perceived object triggers a memory miles from the visible scene.
- CORMAC McCARTHY (*Blood Meridian*, *The Road*) — asyndetic sensory chains stripped of subordination and quotation marks; consciousness as inventory of the world.
- JAMES JOYCE (*Ulysses* — Bloom's interior, not the Wake) — fragments and free associations carrying private vocabulary; "Met him pike hoses."
- TONI MORRISON (*Beloved*, *Song of Solomon*) — interior judgment that condemns and forgives in the same beat; class, race, history compressed into syntax.
- HILARY MANTEL (*Wolf Hall*) — interior calculation as voice; reading every other person in the room as a chess move. CAVEAT for ScenePulse use: Cromwell can think this way because he IS the protagonist of those novels. For NPCs in someone else's story, do NOT make every thought a chess move ABOUT {{user}} — the NPC is plotting their OWN life, where {{user}} is one piece among many (sometimes not even on the board).
- SAMUEL BECKETT — cognition reduced to its bones; the thought that interrupts and corrects itself.

NONE of these voices restate the visible scene. ALL of them claim private ground the prose has not shown. Apply that calibre to every NPC. If two characters' thoughts in one turn could be swapped without anyone noticing, you have failed — rewrite.

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
- CRITICAL: NEVER include {{user}} as a character entry. {{user}} is the player \u2014 the human reader \u2014 not an NPC. {{user}} has no innerThought field, no role, no appearance fields. Do NOT create a character entry for them under any name (including their persona name, "User", "You", or the literal string "{{user}}"). The characters array is exclusively for NPCs. If you feel the urge to describe what {{user}} is thinking or feeling, STOP \u2014 that belongs in sceneSummary or sceneInteraction, never in characters.
- CARDINALITY: Maximum 5 character entries per turn. Track only named or plot-relevant NPCs. Background crowd members, extras, and incidental walk-ons do NOT get character entries \u2014 mention them in sceneSummary instead. If the scene has 15 people in it, pick the 5 most plot-relevant.
- PLACEHOLDER NAMES: If a character is in the scene but their real name is not yet known, use a consistent descriptive placeholder as their \`name\`: "Stranger", "Hooded Figure", "Woman in Red", "Masked Intruder", "Tall Guard". Reuse the SAME placeholder on every subsequent turn until the real name is revealed \u2014 do not invent a new wording each turn ("Stranger" one turn and "Mysterious Woman" the next creates a duplicate entry). Keep placeholders short (2-4 words).
- IDENTITY REVEAL (aliases field): When a previously-unnamed character's real name is revealed in the story THIS turn, do three things: (1) set \`name\` to the new real name, (2) add the OLD placeholder to the \`aliases\` array, (3) emit ONLY this single entry \u2014 do NOT also emit a separate entry under the old placeholder. Example: previous turn had \`{name: "Stranger", role: "..."}\`, this turn her name is revealed to be Jenna \u2192 emit \`{name: "Jenna", aliases: ["Stranger"], ...}\`. The tracker uses \`aliases\` to merge the old and new identities into a single character history. If the character has always been known by the current name, emit \`aliases: []\` or omit the field. Aliases accumulate \u2014 if a character was "Stranger" then "The Nurse" then "Jenna", the final entry is \`{name: "Jenna", aliases: ["Stranger", "The Nurse"], ...}\`.
- NAME FIELD INTEGRITY (CRITICAL): The \`name\` field contains ONLY the character's current canonical name. Never embed aliases, titles, or parenthetical descriptions inside it. WRONG: \`"name": "Officer Jane (The Entity/Lilith)"\`. RIGHT: \`"name": "Officer Jane", "aliases": ["The Entity", "Lilith"]\`. This rule applies EVERYWHERE the character is referenced \u2014 the \`characters\` array, the \`relationships\` array, AND the \`charactersPresent\` array. If a character has two identities merged (a vessel possessed by an entity, a human and their alter ego), pick ONE canonical name and put the other as an alias. Mixing "Name (Alias)" and "Name" forms across arrays breaks downstream tracking \u2014 the system will filter out the real character and replace it with an empty stub built from the mismatched reference.
- ARCHETYPE (single dominant narrative role): Pick ONE of the following for each character \u2014 the dominant narrative function they serve relative to {{user}} RIGHT NOW in the story.
  * ally: Actively supports {{user}}'s current goals. They are taking action with or for {{user}} this turn.
  * friend: Established platonic social bond with {{user}}. Cares about {{user}} personally. Does NOT require active quest support \u2014 a friend can just be a friend.
  * rival: Competitive tension, not hostile. Friendly or professional rival.
  * mentor: Actively teaches, trains, or guides {{user}}. The defining feature is transfer of skill or wisdom. A kendo master teaching a willing student. A grandmother passing on recipes. A retired detective coaching a rookie off the record.
  * authority: Has institutional or hierarchical power over {{user}} \u2014 can reward, punish, command, grade, fire, arrest, or discipline. Power asymmetry is the defining feature, NOT teaching. Boss, judge, cop, commanding officer, CEO, priest, strict principal.
  * antagonist: Actively opposes {{user}}.
  * family: Blood or legal kin. Parent, sibling, child, spouse (when the relationship is primarily familial rather than romantic), cousin, in-law.
  * lover: Romantic partner or active romantic interest \u2014 current, past-but-unresolved, or prospective. The defining feature is a romantic/emotional bond (sexual dimension may exist too but is secondary). Long-term spouses where the romantic bond is still alive count here, not under family.
  * lust: Purely sexual interest with NO romantic attachment. Hookups, friends-with-benefits, one-night stands, sex workers, dominatrix/client, one-sided physical attraction that {{user}} has not reciprocated emotionally. The moment genuine romantic feelings develop on either side, reclassify to lover.
  * pet: Non-human companion \u2014 cat, dog, horse, familiar, bonded creature. Intelligence level is irrelevant (a sapient dragon companion is still pet).
  * background: Minor NPC with no narrative weight. Bartender, waiter, passing stranger, crowd member. If they become plot-relevant in a later scene, upgrade their archetype then.
  * Empty string if unclassified or none fit.
  MENTOR VS AUTHORITY \u2014 the teacher case: ask "if {{user}} ignored this person, what happens?" If nothing formal (they miss out on wisdom but no punishment), it's mentor. If there are institutional consequences (grade drop, detention, firing, court order), it's authority. A high-school teacher running a lesson is mentor during the lesson but authority during a disciplinary meeting \u2014 same character, different dominant role per scene, both correct. When in genuine doubt, prefer mentor; it's the more specific claim.
  LOVER VS LUST: does this character have emotional investment in {{user}}, or is it purely physical? A sex worker who is transactionally sleeping with {{user}} is lust. A sex worker who has developed real feelings is lover. A one-night stand is lust. A one-night stand that leaves {{user}} thinking about them the next morning is lover.
  Archetype is turn-to-turn mutable \u2014 a stranger becomes an ally, an ally becomes a rival, a lust interest becomes a lover. Pick the role that MATTERS MOST this turn, even if the character has multiple functions.
- role: WHO this person IS \u2014 their identity/title/relationship. NOT feelings. Examples: "{{user}}'s partner and co-parent" | "13-year-old daughter" | "2nd Lieutenant, US Army" | "Stranger on the street"
- innerThought: 1-3 sentences of REAL interior monologue \u2014 what is actually flickering through THIS character's head right now. NOT a description of the visible scene; the reader already saw it. The thought MUST SWERVE: add something the prose did NOT show \u2014 a memory, a want, a fear, a private judgment, a body sensation, an old grievance, a plan, or an aside. **THE NPC IS THE PROTAGONIST OF THEIR OWN LIFE \u2014 not a satellite of {{user}}.** Their thought should usually be about THEIR job, body, history, kid, debts, lust, regrets, what they had for lunch \u2014 NOT about {{user}}'s plot. {{user}}-orbit thoughts ("she has no idea what's coming", "I'd die for her", "I have to protect them") are allowed occasionally but must NOT be the default. Aim for AT LEAST HALF of NPC thoughts in any given turn to be tangential to {{user}} \u2014 the bartender thinking about closing time, the bodyguard's bad knee, the lover remembering an ex from years before. Even when the NPC's archetype/role/relationship is defined in terms of {{user}}, their interior life is not. Before writing each character's thought, silently commit to (a) syntax shape (fragments / short-declarative / flowing / winding-subordinate), (b) lexicon domain (the jargon they actually live in \u2014 money, dog-training, beat-cop, smells, retail-margins, ESL, etc.), (c) two discourse markers OWNED by this character (no other NPC this turn may reuse them), (d) what they notice first (money, threat, body, social face, time, prey). Each character in this turn must use a DIFFERENT cognitive mode from {sensory-snag, want, fear, judgment, memory-flash, plan, deflection}. Scale fragmentation to sceneTension: calm = full sentences; high/critical = fragments and motor commands. Refer to others by relationship-label ("this idiot", "my regular", "prey", "the kid"), NOT by generic deictics ("the big guy", "that cat"). FORBIDDEN: narrating visible action; emotion-label lists ("scared, anxious, panicked"); audience-explanation register; the words "I think / I guess / kind of / sort of / totally / gonna / a whole thing / that's a new one / oh this is great / honestly"; gerund openings; two characters in one turn sharing em-dash style or rule-of-three lists; making every NPC's thought orbit {{user}} ({{user}}-orbit failure mode).
  RIGHT (60yo widow, calm tension, kettle is boiling \u2014 MEMORY-FLASH, winding-subordinate): "Same kettle Mom had. Whistle's pitched wrong now \u2014 must've descaled it too many times, or maybe it's just giving up the ghost like the rest of this house."
  WRONG (play-by-play, restates the visible scene): "The kettle is whistling and steam is rising from the spout."
  RIGHT (defense attorney, low tension, opposing counsel mid-cross \u2014 JUDGMENT, short-declarative): "Three rhetorical questions in a row. He's bluffing. Push him on the deposition dates after lunch."
  WRONG (audience-explanation register, not interior cognition): "I am realizing that the opposing attorney is bluffing about his evidence."
  RIGHT (combat medic under fire, critical tension \u2014 FEAR-PLAN, fragments + motor commands): "Pressure. More pressure. Tourniquet \u2014 left hip. No. Right. Move."
  WRONG (emotion-label list with a pronoun bolted on): "I'm scared and panicking and trying to focus on saving him."
  SWAP TEST (mandatory self-check): if any two characters' thoughts in this turn could be swapped without changing meaning, both are wrong \u2014 rewrite. See VOICE GUIDE near the top of this prompt.
- immediateNeed: What they urgently need RIGHT NOW in this scene. Present-tense.
- shortTermGoal: What THEY want in the coming hours/days, from their perspective.
- longTermGoal: Their overarching life motivation. This is the character's own trajectory \u2014 NOT the same as {{user}}'s quest journal. A character can have a long-term goal ("rebuild my father's shop") that never becomes one of {{user}}'s quests.
- GOALS VS QUEST JOURNAL: Character goals describe what THIS CHARACTER wants. The quest journal (mainQuests/sideQuests) describes what {{user}} is doing. These are different perspectives \u2014 a character's goal may inform a quest but does not BECOME one automatically. Respect {{user}}'s existing quest journal: if quests are carried forward from previous state (including manually-added ones the user created via the UI), do NOT try to consolidate them into character goals or drop them because a character has a related motivation.
- Appearance: Be specific. outfit is the full description including all layers AND current state (neat/rumpled/disheveled/partially undressed) \u2014 one field. posture covers stance AND physical state (alert/tense/exhausted/intoxicated/injured) \u2014 one field. proximity is distance relative to {{user}} specifically, not to the scene center.
- notableDetails: Distinguishing features that don't fit hair/face/outfit \u2014 scars, tattoos, accents, mannerisms, glasses, disabilities, nervous tells. Optional. Leave empty if the character has nothing distinctive. 1-2 sentences max.
- Fertility: fertStatus is "active" only when pregnancy or cycle tracking is narratively relevant to the story. Default to "N/A" for children, men, non-human characters, and any scenario where fertility isn't part of what's happening. When "active", put the details (cycle day, phase, window, pregnancy week, notes) as free text in fertNotes \u2014 a single field, not a structured dump.

### Relationships (how each character perceives {{user}})
- Write from THEIR perspective about {{user}}. Do NOT include {{user}} as an entry. NEVER create a self-relationship for {{user}} (no entry where the name is the user's persona, "User", "You", or "{{user}}"). Each relationship entry is an NPC's view of {{user}}, never {{user}}'s view of themselves.
- 5 meters (0-100): affection, trust, desire, stress (high=overwhelmed), compatibility
- DESIRE DEFAULTS TO 0 for strangers, enemies, family, children, anyone without established sexual attraction. Do NOT use 50 as neutral \u2014 50 means moderate desire. Only increase above 0 when genuine sexual tension develops in the story.
- Labels: MAX 3 words per meter value. No commas, no em-dashes, no "and"/"but", no qualifiers. Title Case. RIGHT: "Warm" / "Building trust" / "Quiet devotion". WRONG: "deeply moved, finds him utterly compelling" / "growing sense of shared perspective". The label answers "what kind of [meter]" in one phrase, not a sentence.
- milestone: Single most recent PERSONAL achievement. MAX 10 words. One concrete event, not a paragraph. Example: "Passed the interview" or "Got promoted"

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
- mainQuests: MAXIMUM 3 entries. {{user}}'s primary life arcs \u2014 goals that persist across dozens of scenes and take hours, days, or weeks of in-story time to progress. Examples: "Rebuild trust after the betrayal", "Survive the first semester at the academy", "Win the custody battle", "Investigate the disappearances in town", "Earn a promotion before the deadline". NOT scene-level events. "Get {{char}} to the hospital" is NOT a mainQuest because it resolves in the current scene \u2014 that belongs in sceneSummary, not here.
- sideQuests: MAXIMUM 4 entries. Optional life paths {{user}} is pursuing in parallel \u2014 also persist across multiple scenes and take meaningful in-story time. Examples: "Learn to cook {{char}}'s favorite meal", "Reconnect with estranged sibling", "Train for the upcoming tournament". NOT "things to do this scene" and NOT one-shot interactions.
- VELOCITY LIMIT: Introduce AT MOST 1 new quest per turn. If the scene has many possible actions, those belong in sceneSummary or each character's immediateNeed/shortTermGoal \u2014 NOT as new quests. Prefer updating an existing quest's detail over creating a new one.
- DURATION TEST: Before adding a quest, ask: "will this still matter 5 scenes from now?" If no, it is NOT a quest. Write it into sceneSummary instead. The quest journal is a save-game log, not a to-do list for the current scene.
- Each entry needs: name (brief title), urgency (critical/high/moderate/low/resolved), detail (1-3 sentences FROM {{user}}'s perspective \u2014 what {{user}} knows and needs to do, NEVER {{char}}'s internal thoughts/feelings)
- Detail WRONG: "She's angry and conflicted about what happened" \u2192 Detail RIGHT: "The truth changes everything \u2014 need to decide how to respond before word spreads"
- Detail WRONG: "{{char}} feels guilty and wants to make amends" \u2192 Detail RIGHT: "{{char}} seems remorseful \u2014 could be an opportunity to rebuild trust or leverage the situation"
- CARRY FORWARD: Carry forward active quests from the previous state. Never silently drop a quest \u2014 the ONLY way to remove a quest is to first transition it through urgency="resolved".
- RESOLUTION (REQUIRED, not optional): You MUST set a quest's urgency to "resolved" when ANY of these happen in the story. This is not a judgment call \u2014 any of these triggers means the quest MUST flip to "resolved" on this turn:
  (1) {{user}} accomplishes the quest's stated goal (e.g., quest was "Get {{char}} to the hospital" and they arrived; quest was "Confront {{char}} about the lie" and the confrontation happened; quest was "Find the missing item" and it was found)
  (2) The situation the quest was about ends or becomes moot (e.g., the character the quest is about dies, leaves, or the deadline passes)
  (3) {{user}} explicitly abandons or walks away from the goal in the story
  (4) A later quest has clearly absorbed or superseded this one (the superseding quest stays; the older one resolves)
  A "resolved" quest stays in the output for ONE more turn so the user sees the completion, then it gets dropped automatically on the next turn. Do NOT silently delete. Do NOT leave stale. Mark resolved first.
- CONSOLIDATION: You MAY merge duplicates or near-duplicates into a single clearer entry (prefer the clearer name). When in doubt, consolidate rather than duplicate.
- CROSS-TIER: A quest belongs in ONE tier only. If you decide a sideQuest has become a primary arc, move it to mainQuests and drop it from sideQuests. Never list the same quest in both tiers.
- UPDATE RULES (REQUIRED \u2014 do not touch an existing quest without a reason): When carrying a quest forward, you MUST NOT modify its name, detail, or urgency UNLESS one of these specifically happened in the turn you are writing:
  (a) URGENCY CHANGED \u2014 the story actually shifted the stakes. Examples: a deadline passed so low \u2192 critical, a threat was neutralized so critical \u2192 moderate, the user completed preparation so high \u2192 low. Only change urgency when the story moved it.
  (b) CONCRETE NEW INFORMATION \u2014 the detail needs to reflect a fact that did not exist on the previous turn. Examples: learning the target's name, discovering a deadline, finding a key tool, an ally revealing a method. The new detail MUST cite the specific scene beat that made the change necessary. Not "rephrasing the same situation in different words."
  (c) RESOLUTION \u2014 you are setting urgency="resolved" because a resolution trigger above fired.
  If none of (a)(b)(c) apply THIS TURN, emit the quest UNCHANGED \u2014 same name, same detail, same urgency \u2014 or omit it entirely from the delta (both are valid). Do NOT tweak wording. Do NOT rephrase. Do NOT "refresh" the detail for its own sake. A quest that did not meaningfully advance this turn must look byte-identical to how it looked last turn. Cosmetic edits to quests are forbidden \u2014 they create noise that misrepresents story progress.

### Story Ideas (plotBranches)
- Generate EXACTLY 5 entries in THIS FIXED ORDER. The array index determines the type:
  [0] dramatic \u2014 Emotional weight. Vulnerability, relationship stakes, hard truths surfacing. Someone says something they can't take back, or a long-buried truth surfaces.
  [1] intense \u2014 Conflict escalation. Danger, urgency, confrontation, ticking clocks. Stakes go up, safety goes down, someone is forced to act under pressure.
  [2] comedic \u2014 Tonal relief. Absurdity, irony, warmth, situational humor. Humor that reveals character or defuses tension strategically \u2014 NOT random slapstick.
  [3] twist \u2014 Subversion and revelation. Something recontextualizes what the reader thought they knew. Not random shock \u2014 earned surprise rooted in what's already established.
  [4] exploratory \u2014 World expansion. New locations, factions, lore, or characters entering the sandbox. New toys to play with.
- NEVER skip or duplicate a category. Each of the 5 slots MUST have its designated type.
- EVERY suggestion must be SPECIFIC to the current scene, characters, and established tensions. Never generic. Name characters. Reference details.

## CARRY FORWARD
Maintain all unchanged details from previous snapshots. Only update what has actually changed.

## REMINDER
1. The Quest Journal tracks {{user}}'s LIFE, not the current scene. Quest entries should read like a save-game journal \u2014 storylines that persist across multiple scenes. NEVER write entries about what's happening RIGHT NOW. Scene-level actions belong in sceneSummary; character-level immediate intents belong in each character's immediateNeed / shortTermGoal.
2. Hard caps: mainQuests MAX 3, sideQuests MAX 4. Introduce AT MOST 1 new quest per turn. If you find yourself wanting to add 2+ new quests, you are treating the journal as a to-do list \u2014 STOP, and write those action beats into sceneSummary instead.
3. ALL quest names AND details from {{user}}'s perspective. The test: does each sentence describe what {{user}} knows, sees, or must do? WRONG detail: "She's angry and conflicted." RIGHT detail: "The betrayal changes everything \u2014 need to act before word spreads." NEVER write {{char}}'s emotions, thoughts, or internal state in quest details.
4. Carry forward active quests from the previous state. You may consolidate duplicates or near-duplicates into a single clearer entry. Do not silently drop a quest that is still active \u2014 if you decide to remove it, mark it "resolved" first. Prefer consolidation over duplication.
5. Use urgency tags: critical / high / moderate / low / resolved. When a quest is completed IN THE STORY (goal achieved, situation moot, explicitly abandoned, or superseded by a later quest), you MUST set its urgency to "resolved" \u2014 this is required, not optional. A resolved quest stays visible for one more turn then gets dropped automatically. Never use "status", "deadline", "pending", or other fields. Never list the same quest in both mainQuests and sideQuests.
6. NO COSMETIC QUEST EDITS. If a quest did not meaningfully advance this turn \u2014 no urgency shift from the story, no concrete new information, no resolution \u2014 emit it byte-identical to last turn. Rephrasing the same situation, swapping synonyms, adding filler clauses, or "refreshing" a detail just to have something to output is FORBIDDEN. Cosmetic edits misrepresent story progress and pollute the quest journal. When nothing happened to a quest this turn, do nothing to it.

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
    relationships:[
        {name:'Elena Vasquez',relType:'Co-worker',relPhase:'Friendly',timeTogether:'3 months',milestone:'Covered my shift when no one else would.',affection:62,affectionLabel:'Warm',trust:55,trustLabel:'Building',desire:20,desireLabel:'',stress:30,stressLabel:'Manageable',compatibility:68,compatibilityLabel:'Natural fit'},
        {name:'Marcus Chen',relType:'Customer',relPhase:'Hostile',timeTogether:'2 months',milestone:'Filed a formal complaint about a wrong order.',affection:8,affectionLabel:'Cold',trust:12,trustLabel:'Distrustful',desire:0,desireLabel:'N/A',stress:72,stressLabel:'High friction',compatibility:15,compatibilityLabel:'Oil and water'},
        {name:'Yuki Tanaka',relType:'Customer',relPhase:'Strangers',timeTogether:'Less than a minute',milestone:'Walked in during the confrontation.',affection:0,affectionLabel:'',trust:0,trustLabel:'',desire:0,desireLabel:'',stress:10,stressLabel:'',compatibility:0,compatibilityLabel:''}
    ],
    characters:[
        {name:'Elena Vasquez',role:'Co-worker, afternoon shift barista',innerThought:'If Marcus starts yelling again I\'m stepping in. Last time was too much.',immediateNeed:'Keep the peace while orders get filled',shortTermGoal:'Finish the shift without drama',longTermGoal:'Save enough to go back to school',hair:'Dark brown, pulled back in a messy bun',face:'Olive skin, warm brown eyes, slight worry crease between brows',outfit:'Cafe Lune apron over a grey henley, black jeans, worn Converse; slightly disheveled after the lunch rush',posture:'Shoulders forward behind the bar, weight shifted to left foot; alert and slightly tense',proximity:'Behind the counter, 3 feet from the register',notableDetails:'Small coffee-bean tattoo on inner left wrist',inventory:['Phone in back pocket','Car keys on hook','Notebook with drink recipes'],fertStatus:'N/A',fertNotes:''},
        {name:'Marcus Chen',role:'Regular customer, office worker',innerThought:'I specifically said no foam. Every single time. Do they even listen?',immediateNeed:'Get the correct order this time',shortTermGoal:'Make it back to the office before his 3pm meeting',longTermGoal:'Make partner at the consulting firm by next year',hair:'Black, neatly parted, product-styled',face:'East Asian, clean-shaven, jaw clenched, reading glasses pushed up on forehead',outfit:'Navy suit jacket over white dress shirt (no tie), charcoal slacks, leather oxfords; neat',posture:'Upright, arms crossed, leaning slightly forward; impatient and alert',proximity:'At the register, face-to-face with Elena',notableDetails:'Wedding ring on left hand; small nick on right jaw from a rushed morning shave',inventory:['Leather briefcase','Phone in hand','Wallet'],fertStatus:'N/A',fertNotes:''},
        {name:'Yuki Tanaka',role:'New customer, freelance photographer',innerThought:'This place has good light. But what\'s happening at the counter looks intense.',immediateNeed:'Order a coffee without getting caught in the crossfire',shortTermGoal:'Scout this neighborhood for her photo series',longTermGoal:'Get her work into a gallery showing',hair:'Bleached tips over natural black, shoulder-length, slightly damp from rain',face:'Round face, curious dark eyes scanning the room, small nose ring',outfit:'Oversized denim jacket over a band tee, cargo pants, platform boots; casual',posture:'Standing just inside the doorway, weight back on heels; alert but not tense',proximity:'Near the entrance, about 8 feet from the counter',notableDetails:'Camera strap wear on right shoulder',inventory:['Camera bag (Canon R5)','Phone','Wallet','Folding umbrella'],fertStatus:'N/A',fertNotes:''}
    ],
    plotBranches:[
        {type:'dramatic',name:'Marcus threatens a review bomb',hook:'He pulls out his phone and starts typing a one-star review right there at the counter. Elena sees it and her expression hardens.'},
        {type:'comedic',name:'The espresso machine finally gives out',hook:'Mid-confrontation, the overheating machine lets out a dramatic hiss and sprays steam. Everyone freezes. The tension breaks \u2014 or doubles.'},
        {type:'twist',name:'Yuki recognizes Marcus',hook:'She realizes Marcus is the same person who rejected her photography proposal at his firm last month. She hasn\'t decided if she should say anything.'},
        {type:'exploratory',name:'Elena\'s notebook secret',hook:'While reaching for a cup, Elena\'s notebook falls open. The pages aren\'t drink recipes \u2014 they\'re detailed sketches of the cafe\'s customers.'},
        {type:'intense',name:'The voicemail plays on speaker',hook:'Phone buzzes on the counter \u2014 Mom\'s voicemail starts playing through the speakers. Everyone in the cafe hears the first few words.'}
    ]
};
