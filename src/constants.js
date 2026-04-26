// ScenePulse — Constants Module
// Extracted from index.js lines 1-365, plus TOUR_EXAMPLE_DATA (~4720-4747)

export const MODULE_NAME='scenepulse';
// v6.23.5: bumped to match manifest. This constant has been stale since
// v6.12.3 — every release bumped manifest.json but missed this. Activity
// log + diagnostic version field were misreporting. Keep in sync with
// manifest.json on every version bump going forward.
export const VERSION = '6.27.18';

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


// v6.27.11: BUILTIN_SCHEMA + BUILTIN_PROMPT extracted to src/builtins/.
// Re-exported here for backward compatibility — every existing call site
// continues to import from constants.js.
export { BUILTIN_SCHEMA } from './builtins/schema.js';
export { BUILTIN_PROMPT } from './builtins/prompt.js';

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
