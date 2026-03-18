// ScenePulse v4.9.81 — Side Panel Architecture
const MODULE_NAME='scenepulse';const LOG='[ScenePulse]';const SP_LS_KEY='scenepulse_config';

const MASCOT_SVG=`<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.2" opacity="0.25" class="sp-mascot-pulse"/><circle cx="12" cy="12" r="6.5" stroke="currentColor" stroke-width="1" opacity="0.4" class="sp-mascot-pulse"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="0.8" opacity="0.6"/><circle cx="12" cy="12" r="1.4" fill="currentColor" opacity="0.9"/><line x1="12" y1="2" x2="12" y2="5.5" stroke="currentColor" stroke-width="0.8" opacity="0.3"/><line x1="12" y1="18.5" x2="12" y2="22" stroke="currentColor" stroke-width="0.8" opacity="0.3"/><line x1="2" y1="12" x2="5.5" y2="12" stroke="currentColor" stroke-width="0.8" opacity="0.3"/><line x1="18.5" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width="0.8" opacity="0.3"/><path d="M12 5.5 L14 10 L12 8.5 L10 10 Z" fill="currentColor" opacity="0.5"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="8s" repeatCount="indefinite"/></path></svg>`;
const MES_ICON_SVG=`<svg viewBox="0 0 18 18" fill="none" width="16" height="16" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="9" r="7" stroke="currentColor" stroke-width="1" opacity="0.3"/><circle cx="9" cy="9" r="4" stroke="currentColor" stroke-width="0.8" opacity="0.5"/><circle cx="9" cy="9" r="1.2" fill="currentColor"/><path d="M9 2 L10.2 7 L9 5.8 L7.8 7 Z" fill="currentColor" opacity="0.6"/></svg>`;

const DEFAULTS=Object.freeze({enabled:true,autoGenerate:true,maxRetries:2,contextMessages:8,promptMode:'json',embedSnapshots:1,embedRole:'system',injectionMethod:'inline',connectionProfile:'',chatPreset:'',fallbackProfile:'',fallbackPreset:'',fallbackEnabled:true,setupDismissed:false,lorebookMode:'character_attached',lorebookAllowlist:[],openSections:{scene:true,quests:true,relationships:true,characters:true,branches:false},schema:null,systemPrompt:null,showThoughts:true,thoughtPos:{x:10,y:80},devButtons:false,sceneTransitions:true,panels:{dashboard:true,scene:true,quests:true,relationships:true,characters:true,storyIdeas:true},dashCards:{date:true,time:true,weather:true,temperature:true,location:true},fieldToggles:{},customPanels:[]});

// ── Mobile/Tablet detection ──
const SP_MOBILE_MAX=600;  // phones: width ≤ 600
const SP_TABLET_MAX=1024; // tablets: 601–1024
function spDetectMode(){
    const w=window.innerWidth;
    if(w<=SP_MOBILE_MAX)return'mobile';
    if(w<=SP_TABLET_MAX)return'tablet';
    return'desktop';
}
function spApplyMode(){
    const p=document.getElementById('sp-panel');if(!p)return;
    const mode=spDetectMode();
    p.classList.remove('sp-mode-mobile','sp-mode-tablet');
    if(mode==='mobile')p.classList.add('sp-mode-mobile');
    else if(mode==='tablet')p.classList.add('sp-mode-tablet');
    // Show/hide the minimize button
    const minBtn=document.getElementById('sp-tb-minimize');
    if(minBtn)minBtn.style.display=(mode==='mobile'||mode==='tablet')?'inline-flex':'none';
    // Mobile: force-clear weather/tint effects (they cause glow bleed)
    if(mode==='mobile'||mode==='tablet'){
        clearWeatherOverlay();clearTimeTint();
    }
    // Mobile: inject SP branding into ST's top bar, hide ST extensions bar when panel is open
    spInjectTopBar(mode);
    // Show/hide FAB based on panel visibility
    spUpdateFab();
    return mode;
}
function spInjectTopBar(mode){
    const stTop=document.getElementById('top-bar')||document.getElementById('top-settings-holder');
    if(!stTop)return;
    let spTop=document.getElementById('sp-mobile-topbar');
    if(mode==='mobile'||mode==='tablet'){
        const p=document.getElementById('sp-panel');
        const panelVis=p?.classList.contains('sp-visible');
        // Hide ST's top bar when SP panel is fullscreen
        if(panelVis){
            stTop.style.display='none';
            if(!spTop){
                spTop=document.createElement('div');spTop.id='sp-mobile-topbar';spTop.className='sp-mobile-topbar';
                spTop.innerHTML=`<div class="sp-mt-brand">${MASCOT_SVG}<span>Scene<span style="color:#4db8a4">Pulse</span></span></div><button class="sp-mt-minimize" id="sp-mt-minimize" title="Hide panel"><svg viewBox="0 0 16 16" width="22" height="22" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><line x1="2" y1="13" x2="14" y2="13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity="0.4"/></svg></button>`;
                document.body.insertBefore(spTop,document.body.firstChild);
                spTop.querySelector('#sp-mt-minimize').addEventListener('click',spMinimizePanel);
            }
            spTop.style.display='flex';spTop.classList.add('sp-mt-visible');
        } else {
            stTop.style.display='';
            if(spTop){spTop.style.display='none';spTop.classList.remove('sp-mt-visible')}
        }
    } else {
        stTop.style.display='';
        if(spTop)spTop.style.display='none';
    }
}
function spUpdateFab(){
    const mode=spDetectMode();
    const p=document.getElementById('sp-panel');
    const panelVis=p?p.classList.contains('sp-visible'):false;
    const shouldShow=(mode==='mobile'||mode==='tablet')&&!panelVis;
    // Inject into ST's UI if not already there
    let btn=document.getElementById('sp-st-restore');
    if(!btn){
        // Try multiple ST anchor points
        const anchor=document.getElementById('rightSendForm')
            ||document.getElementById('send_form')
            ||document.querySelector('#form_sheld .justifyLeft')
            ||document.querySelector('#form_sheld');
        if(anchor){
            btn=document.createElement('div');btn.id='sp-st-restore';btn.title='Open ScenePulse';
            btn.className='sp-st-restore';
            btn.innerHTML=MASCOT_SVG;
            btn.addEventListener('click',(e)=>{e.preventDefault();e.stopPropagation();spRestorePanel()});
            anchor.appendChild(btn);
            console.log(LOG,'FAB: injected into ST UI, anchor='+anchor.id);
        }else{
            console.log(LOG,'FAB: no ST anchor found');
        }
    }
    if(btn){
        btn.style.display=shouldShow?'flex':'none';
        console.log(LOG,'FAB:','mode='+mode,'panelVis='+panelVis,'show='+shouldShow,'btnDisplay='+btn.style.display);
    }
    // Also update the floating FAB as fallback
    const fab=document.getElementById('sp-mobile-fab');
    if(fab){
        if(shouldShow)fab.classList.add('sp-fab-visible');
        else fab.classList.remove('sp-fab-visible');
    }
}
function spMinimizePanel(){
    const p=document.getElementById('sp-panel');if(!p)return;
    _spMobileMinimized=true;
    // Animate slide-out
    p.style.transition='transform 0.25s ease-in, opacity 0.25s ease-in';
    p.style.transform='translateY(100%)';p.style.opacity='0';
    const spTop=document.getElementById('sp-mobile-topbar');
    if(spTop){spTop.style.transition='transform 0.2s ease-in, opacity 0.2s ease-in';spTop.style.transform='translateY(-100%)';spTop.style.opacity='0'}
    setTimeout(()=>{
        p.style.transition='';p.style.transform='';p.style.opacity='';
        if(spTop){spTop.style.transition='';spTop.style.transform='';spTop.style.opacity=''}
        hidePanel();
        spUpdateFab();
        log('Mobile: panel minimized');
    },260);
}
function spRestorePanel(){
    _spMobileMinimized=false;
    showPanel();
    spUpdateFab();
    log('Mobile: panel restored');
}
let _spMobileMinimized=false;
// Guard: on mobile/tablet, only show panel if user explicitly requested it
function spAutoShow(){
    const mode=spDetectMode();
    if(mode==='mobile'||mode==='tablet'){
        if(!_spMobileMinimized)_spMobileMinimized=true; // first auto-show on mobile → suppress, show FAB instead
        spUpdateFab();
        return;
    }
    showPanel();
}
function spSetGenerating(active){
    const btn=document.getElementById('sp-st-restore');
    if(btn){if(active)btn.classList.add('sp-st-generating');else btn.classList.remove('sp-st-generating')}
    const fab=document.getElementById('sp-mobile-fab');
    if(fab){if(active)fab.classList.add('sp-st-generating');else fab.classList.remove('sp-st-generating')}
}
// After generation: show panel on desktop, show banner on mobile
function spPostGenShow(){
    const mode=spDetectMode();
    if((mode==='mobile'||mode==='tablet')&&_spMobileMinimized){
        spShowBanner('Scene updated');
        spUpdateFab();
        return;
    }
    showPanel();
}
function spShowBanner(text){
    let b=document.getElementById('sp-mobile-banner');
    if(b)b.remove();
    b=document.createElement('div');b.id='sp-mobile-banner';b.className='sp-mobile-banner';
    b.innerHTML=`<span class="sp-banner-icon">${MASCOT_SVG}</span><span class="sp-banner-text">${text}</span>`;
    b.addEventListener('click',()=>{b.remove();spRestorePanel()});
    document.body.appendChild(b);
    // Auto-dismiss
    setTimeout(()=>{if(b.parentNode){b.classList.add('sp-banner-out');setTimeout(()=>b.remove(),400)}},4000);
    log('Banner shown:',text);
}
// Delete snapshot and refresh timeline when a message is deleted
function spOnMessageDeleted(mesIdx){
    const data=getTrackerData();
    const key=String(mesIdx);
    if(data.snapshots[key]){
        delete data.snapshots[key];
        log('Snapshot deleted for mesIdx=',mesIdx);
        // Re-render timeline
        const sorted=Object.keys(data.snapshots).map(Number).sort((a,b)=>a-b);
        if(sorted.length){
            const latestKey=sorted[sorted.length-1];
            currentSnapshotMesIdx=latestKey;
            const norm=normalizeTracker(data.snapshots[String(latestKey)]);
            updatePanel(norm);
        }
        renderTimeline();
        spSetGenerating(false); // Clear any stale pulse
        try{ensureChatSaved()}catch(e){warn('snapshot delete save:',e)}
    }
}

// Built-in panel → schema field mapping (used for dynamic schema + prompt generation)
const BUILTIN_PANELS={
    dashboard:{
        name:'Dashboard',
        desc:'Time, date, location, weather, temperature',
        fields:[
            {key:'time',type:'string',desc:'HH:MM:SS only.',dashCard:'time',label:'Time'},
            {key:'date',type:'string',desc:'MM/DD/YYYY (DayName)',dashCard:'date',label:'Date'},
            {key:'location',type:'string',desc:'Immediate location > Parent area. Only 2 levels. Example: Kitchen > Windbloom Apartment',dashCard:'location',label:'Location'},
            {key:'weather',type:'string',desc:'Sky/precipitation only.',dashCard:'weather',label:'Weather'},
            {key:'temperature',type:'string',desc:'Felt or exact.',dashCard:'temperature',label:'Temperature'}
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
            {key:'char_thoughts',label:'Thoughts'},{key:'char_goals',label:'Goals'},
            {key:'char_appearance',label:'Appearance'},{key:'char_hair',label:'Hair/Face'},
            {key:'char_outfit',label:'Outfit/Dress'},{key:'char_posture',label:'Posture/Proximity'},
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
const BUILTIN_PRESET={
    name:'ScenePulse-GLM5',
    temperature:0.6,    // Lower than default 1.0 — structured JSON needs consistency
    top_p:0.95,         // GLM-5 default
    max_tokens:4096,    // Scene tracker JSON rarely exceeds 3k tokens
    frequency_penalty:0.15, // Mild dedup to avoid repetitive field values
    presence_penalty:0,  // Don't penalize covering all required fields
    // Note: These are applied when using 'separate' injection with no custom preset selected.
    // For 'inline' injection, the user's default preset is used.
};

const BUILTIN_SCHEMA={name:'ScenePulse',description:'Scene tracker.',strict:false,
value:{"$schema":"http://json-schema.org/draft-07/schema#","type":"object","properties":{"time":{"type":"string","description":"HH:MM:SS only."},"date":{"type":"string","description":"MM/DD/YYYY (DayName)"},"elapsed":{"type":"string","description":"Time elapsed since last action. Format: duration (context). Example: 30s (dialogue), 2m (walking)"},"location":{"type":"string","description":"Immediate location > Parent area. Only 2 levels. Example: Kitchen > Windbloom Apartment, Bridge > USS Enterprise, Alley > Chinatown"},"weather":{"type":"string","description":"Sky/precipitation only."},"temperature":{"type":"string","description":"Felt or exact."},"soundEnvironment":{"type":"string","description":"Audible sounds right now."},"witnesses":{"type":"array","items":{"type":"string"},"description":"[] if none."},"sceneTopic":{"type":"string"},"sceneMood":{"type":"string"},"sceneInteraction":{"type":"string"},"sceneTension":{"type":"string","enum":["calm","low","moderate","high","critical"]},"sceneSummary":{"type":"string"},
"northStar":{"type":"string","description":"{{user}}'s ONE driving dream or life purpose — the deepest motivation behind everything they do. What would they sacrifice everything for? If not yet established in the story, use: Not yet revealed. This is ALWAYS about {{user}}, never other characters."},
"mainQuests":{"type":"array","description":"{{user}}'s PRIMARY storyline objectives — the critical-path goals that drive the narrative forward. These are the big, important things {{user}} MUST eventually resolve. Think of these as the main quest chain in an RPG. They persist across scenes and evolve over time. Each entry is about {{user}}'s journey, never a character's. WRONG: [Character] needs therapy. RIGHT: Support [character]'s recovery. WRONG: Stay quiet during encounter. RIGHT: Resolve the ongoing investigation.","items":{"type":"object","properties":{"name":{"type":"string"},"urgency":{"type":"string","enum":["critical","high","moderate","low"]},"detail":{"type":"string","description":"1-3 short factual sentences describing this quest. No emotions. Just what happened, what needs to happen, and current status."}},"required":["name","urgency","detail"]}},
"sideQuests":{"type":"array","description":"Optional but enriching paths {{user}} could pursue — things that aren't required but would deepen the story or improve {{user}}'s life. Like side quests in an RPG: skippable but rewarding. WRONG: Order food. RIGHT: Reconnect with estranged family. RIGHT: Explore career alternatives.","items":{"type":"object","properties":{"name":{"type":"string"},"urgency":{"type":"string","enum":["critical","high","moderate","low"]},"detail":{"type":"string","description":"1-3 short factual sentences describing this quest. No emotions. Just what happened, what needs to happen, and current status."}},"required":["name","urgency","detail"]}},
"activeTasks":{"type":"array","description":"Immediate, concrete things {{user}} needs to handle soon — the current to-do list. These are actionable items, not vague goals. They may resolve quickly or escalate into main/side quests. WRONG: Be a good person. RIGHT: Get documents signed before the deadline. RIGHT: Prepare ally for tomorrow's hearing.","items":{"type":"object","properties":{"name":{"type":"string"},"urgency":{"type":"string","enum":["critical","high","moderate","low"]},"detail":{"type":"string","description":"1-3 short factual sentences describing this quest. No emotions. Just what happened, what needs to happen, and current status."}},"required":["name","urgency","detail"]}},
"plotBranches":{"type":"array","description":"Exactly 5 story directions — one per category. Each must be SPECIFIC to what's happening NOW, not generic. Root every suggestion in established characters, locations, and tensions.","items":{"type":"object","properties":{"type":{"type":"string","enum":["dramatic","intense","comedic","twist","exploratory"],"description":"dramatic=emotional vulnerability, relationship stakes, hard truths. intense=conflict escalation, danger, urgency, forced action. comedic=tonal relief, absurdity, irony, humor that reveals character. twist=subversion, revelation that recontextualizes what came before. exploratory=world expansion, new locations/factions/characters entering the sandbox."},"name":{"type":"string","description":"Short punchy title, 2-5 words"},"hook":{"type":"string","description":"1-2 sentences. What happens and WHY it matters. Be specific — name characters, reference established details."}},"required":["type","name","hook"]}},
"relationships":{"type":"array","description":"How characters perceive {{user}}. THEIR view of {{user}}. Do NOT include {{user}}.","items":{"type":"object","properties":{"name":{"type":"string"},"relType":{"type":"string"},"relPhase":{"type":"string"},"timeTogether":{"type":"string"},"milestone":{"type":"string","description":"The single most recent PERSONAL achievement or significant moment for this character. Brief. Example: Accepted the proposal, Passed the interview, Got promoted"},"affection":{"type":"integer"},"affectionLabel":{"type":"string"},"trust":{"type":"integer"},"trustLabel":{"type":"string"},"desire":{"type":"integer","description":"Sexual desire/attraction toward {{user}} (0-100). Default 0 for anyone without established sexual interest — including family, strangers, minors. Can increase if seduction/attraction develops in the story. 0 means no current sexual desire, not that it's impossible."},"desireLabel":{"type":"string"},"stress":{"type":"integer"},"stressLabel":{"type":"string"},"compatibility":{"type":"integer"},"compatibilityLabel":{"type":"string"}},"required":["name","relType","relPhase","timeTogether","milestone","affection","affectionLabel","trust","trustLabel","desire","desireLabel","stress","stressLabel","compatibility","compatibilityLabel"]}},
"charactersPresent":{"type":"array","items":{"type":"string"}},
"characters":{"type":"array","description":"All EXCEPT {{user}}. Include their current immediate goal.","items":{"type":"object","properties":{"name":{"type":"string"},"role":{"type":"string","description":"WHO this character is in the world — their identity/title/relationship to {{user}}. NOT feelings or emotions. Just their role. Examples: Partner and co-parent | 13-year-old daughter | Bartender at the tavern | 2nd Lieutenant, US Army | Stranger on the street"},"innerThought":{"type":"string","description":"ONLY the characters literal inner voice — the exact words running through their head RIGHT NOW. 1-3 sentences max. Write ONLY what they would think in quotation marks. NEVER include emotion labels, descriptions of feelings, narration, or state descriptions. WRONG: Overwhelmed desperate euphoric, oh god I cant. RIGHT: Oh god I cant. Please dont stop. If she hears us I dont even care anymore."},"immediateNeed":{"type":"string","description":"What this character needs RIGHT NOW in this moment. Urgent, present-tense."},"shortTermGoal":{"type":"string","description":"What this character wants to accomplish in the near future (hours/days)."},"longTermGoal":{"type":"string","description":"This characters overarching life goal or driving motivation."},"hair":{"type":"string"},"face":{"type":"string"},"outfit":{"type":"string"},"stateOfDress":{"type":"string","enum":["pristine","neat","casual","slightly disheveled","disheveled","partially undressed","undressed"]},"posture":{"type":"string"},"proximity":{"type":"string"},"physicalState":{"type":"string"},"inventory":{"type":"array","items":{"type":"string"},"description":"Items the character is carrying or has nearby — NOT clothing, armor, or shoes. Only objects like phones, keys, weapons, bags, documents, etc."},"fertStatus":{"type":"string","enum":["active","N/A"]},"fertReason":{"type":"string"},"fertCyclePhase":{"type":"string","enum":["menstrual","follicular","ovulation","luteal"]},"fertCycleDay":{"type":"integer"},"fertWindow":{"type":"string","enum":["infertile","low","moderate","high","peak","N/A"]},"fertPregnancy":{"type":"string","enum":["not pregnant","possibly conceived","confirmed pregnant","unknown","N/A"]},"fertPregWeek":{"type":"integer"},"fertNotes":{"type":"string"}},"required":["name","role","innerThought","immediateNeed","shortTermGoal","longTermGoal","hair","face","outfit","stateOfDress","posture","proximity","physicalState","inventory","fertStatus","fertReason","fertCyclePhase","fertCycleDay","fertWindow","fertPregnancy","fertPregWeek","fertNotes"]}}},"required":["time","date","elapsed","location","weather","temperature","soundEnvironment","witnesses","sceneTopic","sceneMood","sceneInteraction","sceneTension","sceneSummary","northStar","mainQuests","sideQuests","activeTasks","plotBranches","relationships","charactersPresent","characters"]}
};

const BUILTIN_PROMPT=`# SCENE TRACKER — JSON OUTPUT ONLY

You are a precise scene analysis engine. Read the story context and output a single JSON object conforming exactly to the provided schema. Output raw JSON only — no prose, no markdown fences, no commentary.

## CRITICAL RULES
1. Populate EVERY field in EVERY response. Infer from prior context if not explicitly stated. Never leave fields empty — use best available inference.
2. Output must be valid parseable JSON. No trailing commas, no comments.

## FIELD SPECIFICATIONS

### Environment
- time: HH:MM:SS (24h format)
- date: MM/DD/YYYY (DayName) — e.g. "03/17/2025 (Monday)"
- elapsed: duration + context — e.g. "30s (dialogue continues)" or "2h (time skip to evening)"
- location: Immediate > Parent — only 2 levels — e.g. "Kitchen > Windbloom Apartment" or "Bridge > USS Enterprise"
- weather: Sky/precipitation only. temperature: Separate field. soundEnvironment: What is audible.

### Scene Analysis (REQUIRED — do not skip these)
- sceneTopic: What is happening in this scene in 1-5 words. E.g. "Intimate encounter in bedroom"
- sceneMood: The emotional atmosphere. E.g. "Desperate, passionate, fearful of discovery"
- sceneInteraction: How the characters are engaging. E.g. "{{user}} confronting the antagonist while allies watch"
- sceneTension: One of: calm, low, moderate, high, critical. Reflects stakes and urgency.
- sceneSummary: 2-3 sentence factual summary of what is currently happening.
- witnesses: Array of names of anyone who can see/hear the scene. Empty array [] if none.
- charactersPresent: Array of ALL character names in the current location or nearby.

### Characters (all EXCEPT {{user}})
- role: WHO this person IS — their identity/title/relationship. NOT feelings. Examples: "{{user}}'s partner and co-parent" | "13-year-old daughter" | "2nd Lieutenant, US Army" | "Stranger on the street"
- innerThought: The character's LITERAL inner voice — exact words running through their head. 1-3 sentences. Write as if reading their mind. NEVER include emotion labels or narration. WRONG: "Overwhelmed, desperate, euphoric." RIGHT: "Oh god. Please don't stop. If she hears us... I don't care anymore."
- immediateNeed: What they urgently need RIGHT NOW
- shortTermGoal: What they want in the coming hours/days
- longTermGoal: Their overarching life motivation
- Appearance fields: Be detailed and specific. Outfits include all layers including underwear.
- Fertility: Use "N/A" + reason when not applicable. fertCycleDay=0 when N/A.

### Relationships (how each character perceives {{user}})
- Write from THEIR perspective about {{user}}. Do NOT include {{user}} as an entry.
- 5 meters (0-100): affection, trust, desire, stress (high=overwhelmed), compatibility
- DESIRE DEFAULTS TO 0 for strangers, enemies, family, children, anyone without established sexual attraction. Do NOT use 50 as neutral — 50 means moderate desire. Only increase above 0 when genuine sexual tension develops in the story.
- Labels: 1-4 word descriptor for each meter value
- milestone: Single most recent PERSONAL achievement. Brief. Example: "Passed the interview" or "Got promoted"

### Quest Journal ({{user}}'s LIFE journey — NOT current scene)
This is {{user}}'s personal quest journal. It tracks storylines that persist across scenes — like a quest log in Skyrim or The Witcher. NEVER include current scene actions (sex, eating, conversation). Every entry must be about {{user}}'s life, from {{user}}'s perspective.

- northStar: {{user}}'s ONE driving life purpose — their deepest dream. Use "Not yet revealed" if unknown.
- mainQuests: PRIMARY storyline objectives — the critical path. Big, important things {{user}} must resolve. These evolve but persist. Examples: "Investigate the conspiracy threatening our family", "Resolve the conflict with the rival faction", "Rebuild trust after the betrayal"
- sideQuests: Optional enriching paths — skippable but rewarding. Examples: "Reconnect with estranged family member", "Explore a new career path"
- activeTasks: Immediate, concrete to-do items. Actionable and specific. Examples: "Sign the documents before the deadline", "Prepare ally for the upcoming trial"
- Each entry needs: name (brief title), urgency (critical/high/moderate/low), detail (1 sentence of context)
- CARRY FORWARD: Never drop quests between updates unless they are explicitly resolved in the story. Quests persist until completed.

### Story Ideas (plotBranches)
- Generate EXACTLY 5 entries, one per category: dramatic, intense, comedic, twist, exploratory.
- dramatic: Emotional weight. Vulnerability, relationship stakes, hard truths surfacing. Someone says something they can't take back, or a long-buried truth surfaces. Deepens bonds and forces the reader to feel.
- intense: Conflict escalation. Danger, urgency, confrontation, ticking clocks. Stakes go up, safety goes down, someone is forced to act under pressure. Drives momentum and raises tension.
- comedic: Tonal relief. Absurdity, irony, warmth, situational humor. Humor that reveals character or defuses tension strategically — NOT random slapstick. Contrast that makes the heavy stuff land harder.
- twist: Subversion and revelation. Something recontextualizes what the reader thought they knew. Not random shock — earned surprise rooted in what's already established. Rewards attention.
- exploratory: World expansion. New locations, factions, lore, or characters entering the sandbox. Prevents the story from feeling claustrophobic and gives the reader new toys to play with.
- EVERY suggestion must be SPECIFIC to the current scene, characters, and established tensions. Never generic. Name characters. Reference details.

## CARRY FORWARD
Maintain all unchanged details from previous snapshots. Only update what has actually changed.

## REMINDER
1. The Quest Journal tracks {{user}}'s LIFE, not the current scene. Quest entries should read like a save-game journal — storylines that persist across multiple scenes. NEVER write entries about what's happening RIGHT NOW.
2. ALL entries from {{user}}'s perspective. "Character needs therapy" is WRONG. "Support character's therapy commitment" is RIGHT.
3. NEVER drop quests. If a quest existed in the previous state and hasn't been resolved in the story, it MUST appear in the new output. Quests can only be removed when the story explicitly resolves them.
4. Use urgency tags: critical / high / moderate / low. Never use "status", "deadline", "pending", or other fields.

Output valid JSON now.`;

// ── Utilities ──
const debugLog=[];const MAX_LOG=500;
// Console interceptor — captures browser console output for easy copying
const consoleBuf=[];const MAX_CONSOLE=500;
const _origConsoleLog=console.log,_origConsoleWarn=console.warn,_origConsoleErr=console.error;
function captureConsole(level,args){
    const ts=new Date().toLocaleTimeString();
    const parts=args.map(a=>{try{return typeof a==='object'?JSON.stringify(a).substring(0,500):String(a)}catch{return String(a)}});
    consoleBuf.push(`[${level} ${ts}] ${parts.join(' ')}`);
    if(consoleBuf.length>MAX_CONSOLE)consoleBuf.shift();
}
console.log=function(...a){_origConsoleLog.apply(console,a);captureConsole('LOG',a)};
console.warn=function(...a){_origConsoleWarn.apply(console,a);captureConsole('WARN',a)};
console.error=function(...a){_origConsoleErr.apply(console,a);captureConsole('ERR',a)};
function _fmt(x){if(x instanceof Error)return`${x.message} | ${x.stack?.split('\n').slice(0,3).join(' → ')}`;if(x==null)return'null';if(typeof x==='object')try{const s=JSON.stringify(x);return s.length>300?s.substring(0,297)+'…':s}catch{return String(x)}return String(x)}
function _push(tag,a){if(debugLog.length>=MAX_LOG)debugLog.splice(0,50);debugLog.push(`[${tag} ${new Date().toLocaleTimeString()}] ${a.map(_fmt).join(' ')}`)}
function log(...a){console.log(LOG,...a);_push('',a)}
function warn(...a){console.warn(LOG,...a);_push('WARN',a)}
function err(...a){console.error(LOG,...a);_push('ERROR',a)}
// Field audit: logs which expected fields are present/missing/empty
function auditFields(label,obj,expected){
    const present=[],empty=[],missing=[];
    for(const k of expected){
        if(obj[k]===undefined||obj[k]===null)missing.push(k);
        else if(obj[k]===''||(Array.isArray(obj[k])&&obj[k].length===0))empty.push(k);
        else present.push(k);
    }
    log(`AUDIT [${label}]: ✓ ${present.length} present, ○ ${empty.length} empty, ✗ ${missing.length} missing`);
    if(empty.length)log(`  empty: ${empty.join(', ')}`);
    if(missing.length)warn(`  missing: ${missing.join(', ')}`);
}
function esc(s){if(s==null)return'';if(typeof s==='object')return esc(str(s));return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function str(v){if(v==null)return'';if(typeof v==='string')return v;if(typeof v==='number'||typeof v==='boolean')return String(v);if(Array.isArray(v))return v.map(str).filter(Boolean).join(', ');if(typeof v==='object'){for(const val of Object.values(v)){if(typeof val==='string')return val}return''}return String(v)}
function clamp(v,lo,hi){return Math.max(lo,Math.min(hi,Number(v)||0))}
function spConfirm(title,message){
    return new Promise(resolve=>{
        const overlay=document.createElement('div');overlay.className='sp-confirm-overlay';
        overlay.innerHTML=`<div class="sp-confirm-dialog"><div class="sp-confirm-title">${esc(title)}</div><div class="sp-confirm-msg">${esc(message)}</div><div class="sp-confirm-actions"><button class="sp-confirm-btn sp-confirm-cancel">Cancel</button><button class="sp-confirm-btn sp-confirm-ok">Confirm</button></div></div>`;
        const close=(result)=>{overlay.classList.add('sp-confirm-closing');setTimeout(()=>overlay.remove(),200);resolve(result)};
        overlay.querySelector('.sp-confirm-cancel').addEventListener('click',()=>close(false));
        overlay.querySelector('.sp-confirm-ok').addEventListener('click',()=>close(true));
        overlay.addEventListener('click',e=>{if(e.target===overlay)close(false)});
        document.body.appendChild(overlay);
        requestAnimationFrame(()=>overlay.classList.add('sp-confirm-visible'));
        overlay.querySelector('.sp-confirm-ok').focus();
    });
}

function getSettings(){const{extensionSettings}=SillyTavern.getContext();if(!extensionSettings[MODULE_NAME])extensionSettings[MODULE_NAME]=structuredClone(DEFAULTS);const s=extensionSettings[MODULE_NAME];for(const k of Object.keys(DEFAULTS))if(!Object.hasOwn(s,k))s[k]=DEFAULTS[k];if(s.customPanels?.length){s.customPanels=s.customPanels.filter(cp=>cp.name?.trim()||cp.fields?.some(f=>f.key?.trim()))}
// Overlay localStorage profile selections (these bypass ST's save pipeline)
try{const ls=JSON.parse(localStorage.getItem('sp_profiles')||'{}');
if(ls.connectionProfile!==undefined)s.connectionProfile=ls.connectionProfile;
if(ls.chatPreset!==undefined)s.chatPreset=ls.chatPreset;
if(ls.fallbackProfile!==undefined)s.fallbackProfile=ls.fallbackProfile;
if(ls.fallbackPreset!==undefined)s.fallbackPreset=ls.fallbackPreset;
}catch(e){}
return s}
function saveSettings(){SillyTavern.getContext().saveSettingsDebounced()}
function anyPanelsActive(){const s=getSettings();const p=s.panels||DEFAULTS.panels;return Object.values(p).some(v=>v!==false)||(s.customPanels||[]).some(cp=>cp.fields?.length>0)}
function getTrackerData(){const m=SillyTavern.getContext().chatMetadata;if(!m)return{snapshots:{}};if(!m.scenepulse)m.scenepulse={snapshots:{}};return m.scenepulse}
function getLatestSnapshot(){const d=getTrackerData();const k=Object.keys(d.snapshots).sort((a,b)=>Number(b)-Number(a));return k.length?d.snapshots[k[0]]:null}
function saveSnapshot(id,j){
    const data=getTrackerData();
    data.snapshots[String(id)]=j;
    // Prune: keep max 30 snapshots in storage — cull oldest
    const keys=Object.keys(data.snapshots).map(Number).sort((a,b)=>a-b);
    const MAX_STORED=30;
    if(keys.length>MAX_STORED){
        const toRemove=keys.slice(0,keys.length-MAX_STORED);
        for(const k of toRemove)delete data.snapshots[String(k)];
        log('Pruned',toRemove.length,'old snapshots, keeping',MAX_STORED);
    }
    SillyTavern.getContext().saveMetadata();
}
function getSnapshotFor(id){return getTrackerData().snapshots?.[String(id)]??null}
function getPrevSnapshot(id){const sorted=Object.keys(getTrackerData().snapshots).map(Number).sort((a,b)=>a-b);const p=sorted.filter(k=>k<id).pop();return p!=null?getTrackerData().snapshots[String(p)]:null}
function getActiveSchema(){
    const s=getSettings();
    // If user has a fully custom schema override, use it
    if(s.schema){try{return{name:'Custom',description:'',strict:false,value:JSON.parse(s.schema)}}catch{}}
    // Otherwise build dynamically from enabled panels + custom panels
    return{name:'ScenePulse',description:'Scene tracker.',strict:false,value:buildDynamicSchema(s)};
}
function getActivePrompt(){
    const s=getSettings();
    if(s.systemPrompt)return s.systemPrompt;
    return buildDynamicPrompt(s);
}

// ── Dynamic Schema Builder ──
// Constructs JSON schema from enabled built-in panels + custom panels
function buildDynamicSchema(s){
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
function buildDynamicPrompt(s){
    const panels=s.panels||DEFAULTS.panels;
    let prompt=`# SCENE TRACKER — JSON OUTPUT ONLY

You are a precise scene analysis engine. Read the story context and output a single JSON object conforming exactly to the provided schema. Output raw JSON only — no prose, no markdown fences, no commentary.

## CRITICAL RULES
1. Populate EVERY field in EVERY response. Infer from prior context if not explicitly stated. Never leave fields empty — use best available inference.
2. Output must be valid parseable JSON. No trailing commas, no comments.

## FIELD SPECIFICATIONS
`;
    // Dashboard
    if(panels.dashboard){
        const dc=s.dashCards||DEFAULTS.dashCards;
        let envFields=[];
        if(dc.time!==false)envFields.push('- time: HH:MM:SS (24h format)');
        if(dc.date!==false)envFields.push('- date: MM/DD/YYYY (DayName) — e.g. "03/17/2025 (Monday)"');
        if(dc.location!==false)envFields.push('- location: Immediate > Parent — only 2 levels — e.g. "Kitchen > Windbloom Apartment"');
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
- role: WHO this person IS — their identity/title/relationship. NOT feelings. Examples: "{{user}}'s partner" | "13-year-old daughter" | "Stranger on the street"
- innerThought: The character's LITERAL inner voice — exact words running through their head. 1-3 sentences. Write as if reading their mind. NEVER include emotion labels or narration.
- immediateNeed: What they urgently need RIGHT NOW
- shortTermGoal: What they want in the coming hours/days
- longTermGoal: Their overarching life motivation
- Appearance fields: Be detailed and specific. Outfits include all layers.
- stateOfDress: One of: pristine, neat, casual, slightly disheveled, disheveled, partially undressed, undressed
- inventory: ONLY objects (phone, keys, weapons, bags) — NOT clothing
- Fertility: fertStatus=active only if biologically relevant, otherwise N/A all fertility fields
`;
    // Quests
    if(panels.quests){
        const ft=s.fieldToggles||{};
        let qFields=[];
        if(ft.northStar!==false)qFields.push("- northStar: {{user}}'s ONE driving dream or life purpose. \"Not yet revealed\" if unknown.");
        if(ft.mainQuests!==false)qFields.push('- mainQuests: PRIMARY storyline objectives. The big goals that drive the narrative.');
        if(ft.sideQuests!==false)qFields.push('- sideQuests: Optional enriching paths. Skippable but rewarding.');
        if(ft.activeTasks!==false)qFields.push('- activeTasks: Immediate concrete to-do items. May resolve quickly or escalate.');
        if(qFields.length){
            prompt+='\n### Quest Journal (from {{user}}\'s perspective)\n'+qFields.join('\n');
            if(ft.mainQuests!==false||ft.sideQuests!==false||ft.activeTasks!==false)prompt+='\n- All quests: name + urgency (critical/high/moderate/low) + detail.\n- NEVER drop unresolved quests. Carry them forward.\n';
        }
    }
    // Relationships
    if(panels.relationships) prompt+=`
### Relationships (how characters perceive {{user}})
- relType: Their social role/dynamic with {{user}}
- relPhase: Current stage of their relationship
- timeTogether: How long they've known each other
- milestone: Most recent significant moment
- Meters (0-100): affection, trust, desire, stress, compatibility — each with a descriptive label
- desire: 0 for anyone without established sexual interest (family, strangers, minors)
`;
    // Story Ideas
    if(panels.storyIdeas) prompt+=`
### Plot Branches (EXACTLY 5 suggestions)
One per category: dramatic, intense, comedic, twist, exploratory. Each must be SPECIFIC to the current scene — name characters, reference established details. Each needs type, name (2-5 words), hook (1-2 sentences explaining what happens and why it matters).
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

// ── Inline/Together Mode: Extract tracker JSON from AI response ──
const SP_MARKER_START='<!--SP_TRACKER_START-->';
const SP_MARKER_END='<!--SP_TRACKER_END-->';

// Character color palette — muted, dark-theme-friendly hues
const CHAR_COLORS=[
    {bg:'rgba(77,184,164,0.08)', border:'rgba(77,184,164,0.25)', accent:'#4db8a4'},  // teal
    {bg:'rgba(164,120,200,0.08)', border:'rgba(164,120,200,0.25)', accent:'#a478c8'},  // lavender
    {bg:'rgba(200,140,90,0.08)', border:'rgba(200,140,90,0.25)', accent:'#c88c5a'},   // amber
    {bg:'rgba(100,160,220,0.08)', border:'rgba(100,160,220,0.25)', accent:'#64a0dc'},  // sky blue
    {bg:'rgba(200,100,120,0.08)', border:'rgba(200,100,120,0.25)', accent:'#c86478'},  // rose
    {bg:'rgba(140,190,100,0.08)', border:'rgba(140,190,100,0.25)', accent:'#8cbe64'},  // sage
    {bg:'rgba(220,180,100,0.08)', border:'rgba(220,180,100,0.25)', accent:'#dcb464'},  // gold
    {bg:'rgba(130,140,200,0.08)', border:'rgba(130,140,200,0.25)', accent:'#828cc8'},  // periwinkle
    {bg:'rgba(200,130,180,0.08)', border:'rgba(200,130,180,0.25)', accent:'#c882b4'},  // mauve
    {bg:'rgba(100,200,180,0.08)', border:'rgba(100,200,180,0.25)', accent:'#64c8b4'},  // mint
];
const _charColorMap=new Map(); // name → color index, guarantees uniqueness per session
let _charColorNext=0;
const UNRESOLVED_COLOR={bg:'rgba(150,150,160,0.06)', border:'rgba(150,150,160,0.15)', accent:'#969698'}; // neutral gray for unresolved characters
function charColor(name){
    if(!name||name==='?')return UNRESOLVED_COLOR;
    const key=name.toLowerCase().trim();
    if(key==='?'||key==='unknown')return UNRESOLVED_COLOR;
    if(_charColorMap.has(key))return CHAR_COLORS[_charColorMap.get(key)%CHAR_COLORS.length];
    // Check for fuzzy match to existing entry (first name match, contains match)
    for(const[existingKey,idx]of _charColorMap){
        // "yuzuki" matches "yuzuki tamura" and vice versa
        if(existingKey.startsWith(key+' ')||key.startsWith(existingKey+' ')){
            _charColorMap.set(key,idx); // Register alias so future lookups are O(1)
            return CHAR_COLORS[idx%CHAR_COLORS.length];
        }
        // First-name match: "yuzuki" === "yuzuki"
        const existFirst=existingKey.split(/\s/)[0];const keyFirst=key.split(/\s/)[0];
        if(existFirst===keyFirst&&existFirst.length>2){
            _charColorMap.set(key,idx);
            return CHAR_COLORS[idx%CHAR_COLORS.length];
        }
    }
    // Assign next unused color
    const idx=_charColorNext++;
    _charColorMap.set(key,idx);
    return CHAR_COLORS[idx%CHAR_COLORS.length];
}

function extractInlineTracker(mesIdx){
    try{
        const ctx=SillyTavern.getContext();
        const msg=ctx.chat[mesIdx];
        if(!msg||msg.is_user)return null;
        let raw=msg.mes||'';
        // Also check ST's reasoning field (think block content)
        const reasoning=msg.extra?.reasoning||'';
        const combined=raw+(reasoning?'\n'+reasoning:'');
        // Look for SP markers in combined text
        const startIdx=combined.indexOf(SP_MARKER_START);
        const endIdx=combined.indexOf(SP_MARKER_END);
        let jsonStr=null;let extractMethod='none';let foundInReasoning=false;
        if(startIdx!==-1&&endIdx>startIdx){
            jsonStr=combined.substring(startIdx+SP_MARKER_START.length,endIdx).trim();
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
                    if(openIdx!==-1&&(lastBrace-openIdx)>500){
                        jsonStr=raw.substring(openIdx,lastBrace+1);
                        extractMethod='RAW_JSON_SCAN';
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
        if(keys.length<5){
            warn('extractInlineTracker: parsed object too small after stripping ('+keys.length+' keys:',keys.join(',')+')');
            return null;
        }
        // Validate it looks like tracker data — must have at least one known tracker key
        const KNOWN_KEYS=['time','location','weather','sceneTopic','sceneMood','characters','relationships','plotBranches'];
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
        // Also strip any orphaned think tags that might remain
        cleanedMsg=cleanedMsg.replace(/<think>\s*<\/think>/g,'');
        cleanedMsg=cleanedMsg.replace(/\n{3,}$/,'\n\n').trimEnd();
        // Update the message in memory
        if(cleanedMsg!==raw){
            msg.mes=cleanedMsg;
            // Update DOM — find the message element and replace its content
            const mesEl=document.querySelector(`.mes[mesid="${mesIdx}"] .mes_text`);
            if(mesEl){
                // Use ST's messageFormatting if available, otherwise set innerHTML
                try{
                    const{messageFormatting}=SillyTavern.getContext();
                    if(typeof messageFormatting==='function'){
                        mesEl.innerHTML=messageFormatting(cleanedMsg,msg.name,msg.is_system,msg.is_user,mesIdx);
                    }else{
                        mesEl.innerHTML=cleanedMsg;
                    }
                }catch{mesEl.innerHTML=cleanedMsg}
            }
            log('extractInlineTracker: stripped tracker block from message ('+raw.length+'→'+cleanedMsg.length+' chars)');
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
                        else el.innerHTML=_cleanTxt;
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

// ── External Access ──
function getConnectionProfiles(){try{const o=document.querySelectorAll('#connection_profiles option, #connection_profile option');if(o.length)return Array.from(o).filter(x=>x.value).map(x=>({id:x.value,name:x.textContent.trim()}))}catch(e){warn('Profiles:',e)}return[]}
function getChatPresets(){try{for(const sel of['#settings_preset_openai','#preset_openai_select','#settings_preset_chat']){const o=document.querySelectorAll(`${sel} option`);if(o.length>1)return Array.from(o).filter(x=>x.value).map(x=>({id:x.value,name:x.textContent.trim()}))}}catch(e){warn('Presets:',e)}return[]}
function getLorebooks(){try{const o=document.querySelectorAll('#world_info option');if(o.length)return Array.from(o).filter(x=>x.value).map(x=>({id:x.value,name:x.textContent.trim()}))}catch(e){warn('Lore:',e)}return[]}

function getActiveLorebookInfo(){
    const info={global:[],char:[],attached:[]};
    try{
        // Global world info: currently selected in #world_info
        const globalSel=document.querySelector('#world_info');
        if(globalSel){
            const selected=Array.from(globalSel.selectedOptions||[]).filter(o=>o.value);
            info.global=selected.map(o=>o.textContent.trim());
        }
        // Character lorebooks: #world_info_character_list or similar
        const charWi=document.querySelectorAll('#world_info_character_list .tag, [id*="character_world"] option:checked, #character_world option:checked');
        charWi.forEach(el=>{const t=el.textContent?.trim()||el.value;if(t)info.char.push(t)});
        // Also check for world info entries that are active via checkmarks
        const activeEntries=document.querySelectorAll('.world_entry:not(.disabled)');
        info.entryCount=activeEntries.length;
        // Try to get all attached books via ST context
        try{
            const ctx=SillyTavern.getContext();
            if(ctx.worldInfo){info.attached.push(...(Array.isArray(ctx.worldInfo)?ctx.worldInfo:[ctx.worldInfo]).map(w=>w?.name||w).filter(Boolean))}
            if(ctx.chatMetadata?.world_info){info.attached.push(ctx.chatMetadata.world_info)}
            if(ctx.characters?.[ctx.characterId]?.data?.extensions?.world){info.char.push(ctx.characters[ctx.characterId].data.extensions.world)}
        }catch{}
    }catch(e){warn('getActiveLorebookInfo:',e)}
    // Deduplicate
    info.global=[...new Set(info.global)];
    info.char=[...new Set(info.char)];
    info.attached=[...new Set(info.attached)];
    return info;
}

function refreshLorebookDisplay(){
    const el=document.getElementById('sp-lore-display');
    if(!el)return;
    const info=getActiveLorebookInfo();
    const s=getSettings();
    const mode=s.lorebookMode||'character_attached';
    let html='';
    const allBooks=[...info.global,...info.char,...info.attached].filter((v,i,a)=>a.indexOf(v)===i).filter(b=>b&&b!=='--- None ---');
    if(!allBooks.length){
        html='<div class="sp-lore-none">No lorebooks detected</div>';
    } else {
        const filtered=mode==='exclude_all'?[]:
            mode==='character_only'?allBooks.filter(b=>info.char.includes(b)):
            mode==='allowlist'?(s.lorebookAllowlist||[]).filter(b=>allBooks.includes(b)):
            allBooks.filter(b=>info.char.includes(b)||info.global.includes(b)||info.attached.includes(b)); // character_attached (default)
        for(const b of allBooks){
            const included=filtered.includes(b);
            const isChar=info.char.includes(b);
            const isGlobal=info.global.includes(b);
            const src=isChar?'char':isGlobal?'global':'chat';
            html+=`<div class="sp-lore-item ${included?'sp-lore-included':'sp-lore-excluded'}"><span class="sp-lore-dot"></span><span class="sp-lore-name">${esc(b)}</span><span class="sp-lore-src">${src}</span></div>`;
        }
    }
    el.innerHTML=html;
    log('Lorebook display: mode='+mode+', books='+allBooks.join(', '));
}

function updateLorebookRec(){
    const el=document.getElementById('sp-lore-rec');
    if(!el)return;
    const s=getSettings();
    const method=s.injectionMethod||'inline';
    const current=s.lorebookMode||'character_attached';
    let rec,reason;
    if(method==='separate'){
        rec='character_attached';
        reason='Separate generation runs an isolated API call — it needs lorebook context injected since ST won\'t provide it automatically.';
    } else {
        rec='exclude_all';
        reason='Together mode uses the normal generation — ST already injects lorebooks into context, so including them here would be redundant.';
    }
    const recLabel={'character_attached':'Attached','character_only':'Character only','exclude_all':'Disabled','allowlist':'Allowlist'}[rec]||rec;
    if(current===rec){
        el.innerHTML=`<span class="sp-lore-rec-ok">✓ Using recommended: <strong>${esc(recLabel)}</strong></span><span class="sp-lore-rec-why">${reason}</span>`;
    } else {
        el.innerHTML=`<span class="sp-lore-rec-suggest">Recommended: <strong>${esc(recLabel)}</strong> <a href="#" id="sp-lore-apply-rec">Apply</a></span><span class="sp-lore-rec-why">${reason}</span>`;
        document.getElementById('sp-lore-apply-rec')?.addEventListener('click',(e)=>{
            e.preventDefault();
            s.lorebookMode=rec;saveSettings();
            $('#sp-lore-mode').val(rec);
            $('#sp-lore-section').toggle(rec==='allowlist');
            refreshLorebookDisplay();
            updateLorebookRec();
        });
    }
}

// Save chat to disk — prevents message loss when profile switches trigger CHAT_CHANGED reload
async function ensureChatSaved(){
    try{
        const ctx=SillyTavern.getContext();
        // Strategy 1: Direct save via context API (preferred — synchronous write)
        if(typeof ctx.saveChat==='function'){await ctx.saveChat();return}
        if(typeof ctx.saveChatConditional==='function'){await ctx.saveChatConditional();return}
        // Strategy 2: Import and call the non-debounced save directly
        try{
            const chatModule=await import('/scripts/chat.js');
            if(chatModule.saveChat){await chatModule.saveChat();return}
            if(chatModule.saveChatConditional){await chatModule.saveChatConditional();return}
            // Last resort: debounced (may not flush immediately)
            if(chatModule.saveChatDebounced){chatModule.saveChatDebounced()}
        }catch{}
    }catch(e){warn('ensureChatSaved:',e?.message)}
}

// Apply built-in preset values by temporarily adjusting ST's sampler sliders
let _savedSamplerValues=null;
function applyBuiltinPreset(){
    _savedSamplerValues={};
    const mappings=[
        {key:'temperature',selectors:['#temp_openai','#temperature_slider','#temp'],val:BUILTIN_PRESET.temperature},
        {key:'top_p',selectors:['#top_p_openai','#top_p_slider','#top_p'],val:BUILTIN_PRESET.top_p},
        {key:'frequency_penalty',selectors:['#freq_pen_openai','#frequency_penalty_slider','#freq_pen'],val:BUILTIN_PRESET.frequency_penalty},
        {key:'presence_penalty',selectors:['#pres_pen_openai','#presence_penalty_slider','#pres_pen'],val:BUILTIN_PRESET.presence_penalty},
        {key:'max_tokens',selectors:['#openai_max_tokens','#max_tokens_slider','#max_tokens'],val:BUILTIN_PRESET.max_tokens},
    ];
    for(const m of mappings){
        for(const sel of m.selectors){
            const el=document.querySelector(sel);
            if(el&&(el.type==='range'||el.type==='number'||el.tagName==='INPUT')){
                _savedSamplerValues[sel]=el.value;
                el.value=m.val;
                el.dispatchEvent(new Event('input',{bubbles:true}));
                log('Built-in preset: set',sel,'=',m.val,'(was',_savedSamplerValues[sel]+')');
                break; // Only set first matching selector
            }
        }
    }
}
function restorePresetValues(){
    if(!_savedSamplerValues)return;
    for(const[sel,val]of Object.entries(_savedSamplerValues)){
        const el=document.querySelector(sel);
        if(el){el.value=val;el.dispatchEvent(new Event('input',{bubbles:true}))}
    }
    log('Built-in preset: restored',Object.keys(_savedSamplerValues).length,'sampler values');
    _savedSamplerValues=null;
}

async function withProfileAndPreset(pid,pre,fn){
    const ctx=SillyTavern.getContext();let pp=null,pr=null;let usedBuiltin=false;
    // Save chat BEFORE switching profile — prevents message loss if switch triggers CHAT_CHANGED
    if(pid||pre)await ensureChatSaved();
    if(pid){try{pp=document.querySelector('#connection_profiles, #connection_profile')?.value;if(typeof ctx.setConnectionProfile==='function')await ctx.setConnectionProfile(pid);else{const s=document.querySelector('#connection_profiles, #connection_profile');if(s){s.value=pid;s.dispatchEvent(new Event('change'));await new Promise(r=>setTimeout(r,300))}}}catch(e){warn('Profile:',e)}}
    if(pre){try{for(const sel of['#settings_preset_openai','#settings_preset_chat']){const el=document.querySelector(sel);if(el){const has=Array.from(el.options).some(o=>o.value===pre);if(has){pr=el.value;el.value=pre;el.dispatchEvent(new Event('change'));await new Promise(r=>setTimeout(r,200));break}}}}catch(e){warn('Preset:',e)}}
    else{
        // No custom preset selected — apply built-in GLM-5 sampler values
        applyBuiltinPreset();usedBuiltin=true;
    }
    try{return await fn()}finally{
        // Restore built-in preset values if we applied them
        if(usedBuiltin)restorePresetValues();
        // Save chat BEFORE restoring profile — the generation may have saved new data
        await ensureChatSaved();
        // Longer delay: profile restore triggers connection_profile_loaded → other extensions → CHAT_CHANGED
        await new Promise(r=>setTimeout(r,2000));
        if(pr){try{for(const sel of['#settings_preset_openai','#settings_preset_chat']){const el=document.querySelector(sel);if(el){el.value=pr;el.dispatchEvent(new Event('change'));break}}}catch{}}
        if(pp){try{if(typeof ctx.setConnectionProfile==='function')await ctx.setConnectionProfile(pp);else{const s=document.querySelector('#connection_profiles, #connection_profile');if(s){s.value=pp;s.dispatchEvent(new Event('change'))}}}catch{}}
    }
}

// ── Normalization ──
function normalizeTracker(d){
    if(!d||typeof d!=='object')return d;
    
    // ── GLM-5 Unwrapper: flatten nested object structures ──
    // GLM-5 often wraps fields in parent objects: {environment:{time,date...}, characters:{CharA:{...}}, questJournal:{mainQuests:[...]}}
    // Unwrap these to the flat structure the rest of the normalizer expects
    if(d.environment&&typeof d.environment==='object'&&!Array.isArray(d.environment)){
        log('Unwrap: environment object → top-level fields');
        for(const[k,v]of Object.entries(d.environment)){if(!d[k])d[k]=v}
    }
    // Scene fields may be nested under scene/sceneDetails
    for(const sk of['scene','sceneDetails','sceneInfo']){
        if(d[sk]&&typeof d[sk]==='object'&&!Array.isArray(d[sk])){
            log('Unwrap:',sk,'object → top-level fields');
            for(const[k,v]of Object.entries(d[sk])){if(!d[k])d[k]=v}
        }
    }
    if(d.questJournal&&typeof d.questJournal==='object'&&!Array.isArray(d.questJournal)){
        log('Unwrap: questJournal object → top-level fields');
        for(const[k,v]of Object.entries(d.questJournal)){if(!d[k])d[k]=v}
    }
    // Characters: convert object-of-objects to array  {CharA:{...}, CharB:{...}} → [{name:"CharA",...}, {name:"CharB",...}]
    if(d.characters&&typeof d.characters==='object'&&!Array.isArray(d.characters)){
        const vals=Object.entries(d.characters);
        if(vals.length>0&&typeof vals[0][1]==='object'&&vals[0][1]!==null){
            log('Unwrap: characters object → array, keys:',vals.map(v=>v[0]).join(', '));
            d.characters=vals.map(([k,v])=>{if(!v.name)v.name=k.replace(/_/g,' ');v._spKey=k.replace(/_/g,' ');return v});
        }
    }
    // Relationships: convert object-of-objects or named-key objects to array
    if(d.relationships&&typeof d.relationships==='object'&&!Array.isArray(d.relationships)){
        const vals=Object.entries(d.relationships);
        if(vals.length>0&&typeof vals[0][1]==='object'&&vals[0][1]!==null){
            log('Unwrap: relationships object → array, keys:',vals.map(v=>v[0]).join(', '));
            d.relationships=vals.map(([k,v])=>{
                if(!v.name){
                    // Handle verbose keys like "CharA's view of {{user}}" or "CharA_toward_User"
                    let clean=k.replace(/[''\u2018\u2019]s\s+(view|perspective|opinion|feelings?|perception|relationship)\s+(of|on|toward|towards|about|with)\s+.*/i,'')
                              .replace(/\s+(to|toward|towards|about|on|view of)\s+.*/i,'')
                              .replace(/_to_.*|_toward_.*|_towards_.*/i,'');
                    clean=clean.replace(/_/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2').trim();
                    v.name=clean||k;
                }
                return v;
            });
        }
    }
    // plotBranches: unwrap various formats → {type,name,hook}
    // Object keyed by type: {dramatic:{name,hook}, intense:{name,hook}} → array
    if(d.plotBranches&&typeof d.plotBranches==='object'&&!Array.isArray(d.plotBranches)){
        const entries=Object.entries(d.plotBranches);
        if(entries.length>0&&typeof entries[0][1]==='object'&&entries[0][1]!==null){
            log('Unwrap: plotBranches object → array, keys:',entries.map(v=>v[0]).join(', '));
            d.plotBranches=entries.map(([k,v])=>{
                if(typeof v==='string')return{type:k,name:'',hook:v};
                return{type:v.type||k,name:v.name||v.title||'',hook:v.hook||v.description||v.suggestion||''};
            });
        }
    }
    if(Array.isArray(d.plotBranches)&&d.plotBranches[0]?.branch){
        d.plotBranches=d.plotBranches.map(b=>({type:b.type||'exploratory',name:b.branch||b.name||'',hook:b.description||b.hook||''}));
    }
    
    log('Raw keys:',Object.entries(d).map(([k,v])=>`${k}(${Array.isArray(v)?'arr':typeof v})`).join(', '));
    const flat={};
    function collect(obj,depth){if(!obj||typeof obj!=='object'||depth>5)return;for(const[k,v]of Object.entries(obj)){const lk=k.toLowerCase();if(typeof v==='string'&&v.length>0){if(!flat[lk])flat[lk]=v}else if(typeof v==='number'){if(flat[lk]==null)flat[lk]=v}else if(Array.isArray(v)){if(!flat[lk])flat[lk]=v}else if(typeof v==='object'&&v!==null){if(!flat[lk]){const sv=Object.values(v).filter(x=>typeof x==='string'&&x.length>0);if(sv.length)flat[lk]=sv.join('; ')}if(!['characters','relationships'].includes(k))collect(v,depth+1)}}}
    collect(d,0);
    const g=keys=>{for(const k of keys){const v=flat[k];if(typeof v==='string'&&v.length>0)return v;if(typeof v==='number')return String(v)}return''};
    const o={};
    o.time=g(['time','currenttime','clock']);
    o.date=g(['date','currentdate','day']);
    o.elapsed=g(['elapsed','timesincelast','sincelast','timedelta']);
    o.location=g(['location','place','setting']);
    o.weather=g(['weather','sky','conditions']);
    o.temperature=g(['temperature','temp','feelslike']);
    o.soundEnvironment=g(['soundenvironment','sounds','sound','audio','noise']);
    o.sceneTopic=g(['scenetopic','topic','primarytopic','maintopic','focus']);
    o.sceneMood=g(['scenemood','mood','emotionaltone','atmosphere','tone','emotion']);
    o.sceneInteraction=g(['sceneinteraction','interaction','interactiontheme','dynamic','interactiontype']);
    o.sceneTension=g(['scenetension','tension','tensionlevel','intensity','stakes']);
    o.sceneSummary=g(['scenesummary','summary','description','currentsummary','overview']);
    const wit=flat['witnesses'];o.witnesses=Array.isArray(wit)?wit:[];
    const cp=flat['characterspresent']||flat['present'];o.charactersPresent=Array.isArray(cp)?cp:[];

    const vu=['critical','high','moderate','low'];
    function normPlot(arr){if(!Array.isArray(arr))return[];return arr.map(p=>{if(!p||typeof p!=='object')return{name:String(p||''),urgency:'moderate',detail:''};
        let urg=(p.urgency||p.priority||'moderate').toLowerCase();
        // Map non-standard values
        if(p.status&&!p.urgency&&!p.priority){const sm={'pending':'high','active':'high','in-progress':'high','emerging':'moderate','urgent':'critical','resolved':'low','unknown':'high'};urg=sm[p.status.toLowerCase()]||'moderate'}
        if(urg==='medium')urg='moderate';
        if(!vu.includes(urg))urg='moderate';
        return{name:p.name||p.title||'',urgency:urg,detail:p.detail||p.notes||p.description||''}})}
    o.mainQuests=normPlot(d.mainQuests||flat['mainquests']||d.criticalPriorities||d.primaryObjectives||[]);
    o.sideQuests=normPlot(d.sideQuests||flat['sidequests']||d.sideVentures||[]);
    o.activeTasks=normPlot(d.activeTasks||flat['activetasks']||d.nearTermGrowth||d.immediateGoals||[]);
    const rb=d.plotBranches||flat['plotbranches']||[];
    const validTypes=['dramatic','intense','comedic','twist','exploratory'];
    o.plotBranches=Array.isArray(rb)?rb.map(b=>{
        let t=(b?.type||b?.category||'').toLowerCase();
        if(!validTypes.includes(t))t='exploratory';
        // GLM-5 often returns {category,suggestion} instead of {type,name,hook}
        const rawHook=b?.hook||b?.description||b?.suggestion||'';
        let rawName=b?.name||b?.title||'';
        // If no name but we have a hook/suggestion, extract a short name from it
        if(!rawName&&rawHook){
            // Take first sentence or first 60 chars as name
            const firstSent=rawHook.split(/[.!?]/)[0]?.trim()||rawHook;
            rawName=firstSent.length>60?firstSent.substring(0,57)+'…':firstSent;
        }
        return{type:t,name:rawName,hook:rawHook}
    }).filter(b=>b.name||b.hook):[];
    // Carry forward: if model returned empty plotBranches, preserve previous snapshot's ideas
    if(!o.plotBranches.length){
        try{const prev=getLatestSnapshot();
            if(prev?.plotBranches?.length){
                log('plotBranches empty — carrying forward',prev.plotBranches.length,'ideas from previous snapshot');
                o.plotBranches=prev.plotBranches;
            }
        }catch{}
    }
    // Carry forward: if model returned empty quests, preserve previous snapshot's quests
    {try{const prev=getLatestSnapshot();if(prev){
        if(!o.mainQuests.length&&prev.mainQuests?.length){log('mainQuests empty — carrying forward',prev.mainQuests.length,'from previous');o.mainQuests=prev.mainQuests}
        if(!o.sideQuests.length&&prev.sideQuests?.length){log('sideQuests empty — carrying forward',prev.sideQuests.length,'from previous');o.sideQuests=prev.sideQuests}
        if(!o.activeTasks.length&&prev.activeTasks?.length){log('activeTasks empty — carrying forward',prev.activeTasks.length,'from previous');o.activeTasks=prev.activeTasks}
        if(!o.northStar&&prev.northStar)o.northStar=prev.northStar;
    }}catch{}}
    // northStar from current data (only set if model actually returned one, otherwise keep carry-forward)
    const ns=g(['northstar','north_star','lifeobjective','life_objective','dream','purpose','drivingpurpose'])||d.northStar||d.lifeObjective||'';
    if(ns)o.northStar=ns;

    // Relationships
    const rels=d.relationships||[];
    o.relationships=Array.isArray(rels)?rels.map(r=>{
        if(!r||typeof r!=='object')return null;
        let rn=r.name||r.character||'';
        // Clean verbose names like "CharA's view of {{user}}"
        rn=rn.replace(/[''\u2018\u2019]s\s+(view|perspective|opinion|feelings?|perception|relationship)\s+(of|on|toward|towards|about|with)\s+.*/i,'')
             .replace(/\s+(to|toward|towards|about|on|view of)\s+.*/i,'').trim();
        const nr={name:rn};
        nr.relType=r.relType||r.type||'';nr.relPhase=r.relPhase||r.phase||'';
        nr.timeTogether=r.timeTogether||r.duration||r.known||'';
        nr.milestone=r.milestone||r.nextMilestone||'';
        for(const k of['affection','trust','desire','stress','compatibility']){
            const raw=r[k];let val=0,label='';
            if(raw==null||raw==='N/A'||raw==='n/a'){val=-1;label='N/A'}
            else if(typeof raw==='object'&&raw!==null){val=Number(raw.value||raw.score)||0;label=String(raw.label||raw.feeling||'')}
            else if(typeof raw==='string'){const m=raw.match(/^(\d+)/);val=m?Number(m[1]):0;const lp=raw.replace(/^\d+\s*[-–:]\s*/,'');if(lp!==raw)label=lp}
            else{val=Number(raw)||0}
            if(!label)label=String(r[k+'Label']||r[k+'label']||'');
            nr[k]=val;nr[k+'Label']=label;
        }
        return nr;
    }).filter(Boolean):[];
    // Relationship name fallback: if any relationship is missing a name, try to fill from charactersPresent
    if(o.relationships.length&&o.charactersPresent.length){
        for(let i=0;i<o.relationships.length;i++){if(!o.relationships[i].name&&i<o.charactersPresent.length)o.relationships[i].name=o.charactersPresent[i]}
    }
    // Value estimation from labels — only when model returned 0 and we have a label to infer from
    const lvm={no:0,none:0,cold:5,distant:10,slight:20,mild:25,cautious:35,growing:45,moderate:50,genuine:55,solid:65,strong:70,deep:75,intense:80,high:85,overwhelming:90,desperate:92,absolute:95,consumed:95,complete:98,rebuilding:40,fragile:30,natural:70,excellent:90};
    // Labels that indicate zero desire/attraction — override numeric value to 0
    const ZERO_DESIRE_PATTERNS=['no attraction','not attracted','no desire','no interest','no sexual','none yet','not yet','zero','absent','platonic','purely professional','familial','asexual','repulsed','disgusted','not applicable','n/a','no lust','indifferent','cold','nonexistent','non-existent','doesn\'t exist','wary','stranger','dangerous','neutral','default','unknown','hostile','enemy','cautious','suspicious','uninterested','no feelings'];
    for(const rel of o.relationships){
        // ── Desire label override: if label says "no attraction", force value to 0 regardless of model's number ──
        const desLbl=(rel.desireLabel||'').toLowerCase();
        if(desLbl&&ZERO_DESIRE_PATTERNS.some(p=>desLbl.includes(p))){
            if(rel.desire>0)log('Desire override:',rel.name,'label="'+rel.desireLabel+'" value',rel.desire,'→ 0');
            rel.desire=0;
        }
        // ── Model default detection: desire=50 with empty/generic label is model using 50 as midpoint ──
        // The schema says 0=no desire (default), but models often use 50 as "neutral"
        if(rel.desire===50&&(!desLbl||desLbl==='neutral'||desLbl==='moderate'||desLbl==='default'||desLbl==='unknown'||desLbl==='n/a')){
            log('Desire 50-default override:',rel.name,'label="'+(rel.desireLabel||'(empty)')+'", likely model default → 0');
            rel.desire=0;rel.desireLabel=rel.desireLabel||'No attraction yet';
        }
        // Same for other meters with clearly contradictory labels
        for(const k of['affection','trust','stress','compatibility']){
            const lb=(rel[k+'Label']||'').toLowerCase();
            if(lb&&(lb.includes('none')||lb.includes('zero')||lb.includes('absent')||lb.includes('no '))&&rel[k]>10){
                log('Label override:',rel.name,k,'label="'+rel[k+'Label']+'" value',rel[k],'→ 0');
                rel[k]=0;
            }
        }
        // ── Value estimation from labels when model returned 0 ──
        for(const k of['affection','trust','desire','stress','compatibility']){
            if(rel[k]===0&&rel[k+'Label']){
                const lb=rel[k+'Label'].toLowerCase();
                // Skip if label indicates N/A or explicit zero
                if(lb.includes('n/a')||lb.includes('not applicable')||lb.includes('unknown')||lb.includes('unclear')||lb.includes('unreadable')||lb.includes('not yet')||lb.includes('???')||lb.includes('familial')||lb.includes('daughter')||lb.includes('minor')||lb.includes('child')||lb.includes('cat')||lb.includes('animal')||lb.includes('pet')||lb.includes('father')||lb.includes('no ')||lb.includes('none')||lb.includes('zero')||lb.includes('absent')||lb.includes('platonic')||lb.includes('wary')||lb.includes('stranger')||lb.includes('hostile')||lb.includes('enemy')||lb.includes('dangerous')||lb.includes('cautious')||lb.includes('suspicious')||lb.includes('neutral')||lb.includes('default'))continue;
                const w=lb.split(/[\s,]+/);for(const x of w){if(lvm[x]!=null){rel[k]=lvm[x];break}}
                // If still 0 after label scan, leave at 0 — model explicitly chose 0
                // The model's numeric value takes priority over label guessing
            }
        }
        // ── Auto-generate labels when model provided no label ──
        const _autoLabel=(v,k)=>{
            if(v<=0){
                // Meter-specific zero labels
                if(k==='desire')return 'none';
                if(k==='stress')return 'calm';
                if(k==='compatibility')return 'not established';
                if(k==='affection')return 'none';
                if(k==='trust')return 'none';
                return '';
            }
            if(v<=10)return 'minimal';if(v<=25)return 'low';
            if(v<=40)return 'moderate';if(v<=55)return 'growing';if(v<=70)return 'strong';
            if(v<=85)return 'very high';if(v<=95)return 'intense';return 'overwhelming';
        };
        for(const k of['affection','trust','desire','stress','compatibility']){
            if(typeof rel[k]==='number'&&!rel[k+'Label']){
                rel[k+'Label']=_autoLabel(rel[k],k);
            }
        }
    }
    if(o.relationships.length)log('Rel[0]:',JSON.stringify(o.relationships[0]).substring(0,300));
    // Carry forward: fill empty relationship fields from previous snapshot's matching relationship
    try{const prev=getLatestSnapshot();if(prev?.relationships?.length){
        for(const rel of o.relationships){
            const prevRel=prev.relationships.find(pr=>pr.name===rel.name);
            if(!prevRel)continue;
            for(const fk of['relType','relPhase','timeTogether']){
                if(!rel[fk]&&prevRel[fk]){rel[fk]=prevRel[fk];log('Rel carry-forward:',rel.name,fk,'←',prevRel[fk])}
            }
        }
    }}catch{}

    // Characters — with comprehensive debugging
    const rawChars=d.characters;
    log('Char debug: d.characters=',Array.isArray(rawChars)?'array('+rawChars.length+')':typeof rawChars,
        'flat[characters]=',flat['characters']?'array('+flat['characters'].length+')':'missing',
        'd.Characters=',d.Characters?'exists':'missing');
    const chars=rawChars||flat['characters']||d.Characters||d.character||flat['character']||[];
    if(Array.isArray(chars)&&chars.length>0){
        log('Char debug: first char keys=',Object.keys(chars[0]).join(','),'name=',chars[0].name);
        o.characters=chars.map(normalizeChar);
        log('Char debug: after normalize=',o.characters.length,'first name=',o.characters[0]?.name);
        // Failsafe: if normalizeChar lost names that existed in raw data, use raw mapping
        const _normLostName=o.characters[0]?.name==='?'&&chars[0]?.name&&chars[0].name!=='?';
        if(!o.characters.length||_normLostName){
            warn('normalizeChar returned empty, using raw characters');
            o.characters=chars.map(ch=>({
                name:ch.name||'?',role:ch.role||'',innerThought:ch.innerThought||ch.inner_thought||'',
                immediateNeed:ch.immediateNeed||'',shortTermGoal:ch.shortTermGoal||'',longTermGoal:ch.longTermGoal||'',
                hair:ch.hair||'',face:ch.face||'',outfit:ch.outfit||'',stateOfDress:ch.stateOfDress||'',
                posture:ch.posture||'',proximity:ch.proximity||'',physicalState:ch.physicalState||'',
                inventory:Array.isArray(ch.inventory)?ch.inventory:[],
                fertStatus:ch.fertStatus||'',fertReason:ch.fertReason||'',fertCyclePhase:ch.fertCyclePhase||'',
                fertCycleDay:ch.fertCycleDay||0,fertWindow:ch.fertWindow||'',fertPregnancy:ch.fertPregnancy||'',
                fertPregWeek:ch.fertPregWeek||0,fertNotes:ch.fertNotes||''
            }));
        }
    }else{
        o.characters=[];
        if(rawChars){warn('Characters key exists but empty/invalid, type:',typeof rawChars,Array.isArray(rawChars)?'len='+rawChars.length:'not-array')}
        // Scan for characters under alternate keys
        for(const k of Object.keys(d)){
            const v=d[k];
            if(Array.isArray(v)&&v.length>0&&v[0]?.name&&(v[0]?.role||v[0]?.innerThought||v[0]?.hair)&&k!=='relationships'&&k!=='plotBranches'){
                log('Found characters under alternate key:',k);
                o.characters=v.map(normalizeChar);break;
            }
        }
    }
    // Post-normalization: resolve '?' character names from other sources
    // CONFIDENCE RULES — only resolve when we can be certain:
    //   HIGH: 1 unknown char + 1 unmatched relationship = unambiguous
    //   HIGH: charactersPresent has exactly N names matching N characters by position
    //   HIGH: {{char}} name matches exactly 1 unknown character (the primary bot)
    //   MEDIUM: unknown char's role text cross-references a relationship's relType
    //   LOW:  2+ unknown chars + insufficient clues = leave as '?'
    if(o.characters?.length){
        const cpNames=(o.charactersPresent||[]).filter(n=>n&&n!=='{{user}}');
        const relNames=(o.relationships||[]).map(r=>r.name).filter(Boolean);
        const knownCharNames=new Set(o.characters.filter(c=>c.name&&c.name!=='?').map(c=>c.name.toLowerCase()));
        const unknowns=o.characters.filter(c=>c.name==='?');
        const unmatchedRels=relNames.filter(n=>!knownCharNames.has(n.toLowerCase()));

        // HIGH: 1:1 unknown↔relationship
        if(unknowns.length===1&&unmatchedRels.length===1){
            unknowns[0].name=unmatchedRels[0];
            log('Char name resolved (1:1 match):',unmatchedRels[0]);
        }
        // HIGH: positional match from charactersPresent
        else if(unknowns.length>0&&cpNames.length===o.characters.length){
            for(let i=0;i<o.characters.length;i++){
                if(o.characters[i].name==='?'&&cpNames[i]){
                    o.characters[i].name=cpNames[i];
                    log('Char name resolved (positional):',cpNames[i]);
                }
            }
        }
        // Additional heuristics for remaining unknowns
        else if(unknowns.length>0){
            // HIGH: {{char}} name identifies the primary bot character
            try{
                const charName=SillyTavern.getContext().name2||'';
                if(charName&&!knownCharNames.has(charName.toLowerCase())){
                    const stillUnk=o.characters.filter(c=>c.name==='?');
                    if(stillUnk.length===1){
                        stillUnk[0].name=charName;
                        log('Char name resolved ({{char}}, sole unknown):',charName);
                    } else if(stillUnk.length>1){
                        // Check if one's role/thought references {{char}}
                        const charLow=charName.toLowerCase();
                        const match=stillUnk.find(c=>(c.role||'').toLowerCase().includes(charLow)||(c.innerThought||'').toLowerCase().includes(charLow));
                        if(match){match.name=charName;log('Char name resolved ({{char}} in role/thought):',charName)}
                    }
                }
            }catch(e){}
            // MEDIUM: cross-reference role text ↔ relationship relType
            const stillUnknown=o.characters.filter(c=>c.name==='?');
            const stillKnown=new Set(o.characters.filter(c=>c.name!=='?').map(c=>c.name.toLowerCase()));
            const stillUnmatched=relNames.filter(n=>!stillKnown.has(n.toLowerCase()));
            for(const unk of stillUnknown){
                if(unk.name!=='?')continue;
                const role=(unk.role||'').toLowerCase().split(/[,\-–]/)[0].trim();
                if(!role)continue;
                for(const relName of stillUnmatched){
                    const rel=o.relationships.find(r=>r.name===relName);
                    if(!rel)continue;
                    const relType=(rel.relType||'').toLowerCase();
                    if(relType&&(role.includes(relType)||relType.includes(role))){
                        unk.name=relName;
                        log('Char name resolved (role↔relType):',relName);
                        break;
                    }
                }
            }
        }
        // Last-resort pass: if exactly 1 unknown remains after all heuristics
        const finalUnknowns=o.characters.filter(c=>c.name==='?');
        if(finalUnknowns.length===1){
            const finalKnown=new Set(o.characters.filter(c=>c.name!=='?').map(c=>c.name.toLowerCase()));
            const finalUnmRels=relNames.filter(n=>!finalKnown.has(n.toLowerCase()));
            const finalUnmCp=cpNames.filter(n=>!finalKnown.has(n.toLowerCase()));
            if(finalUnmRels.length===1){finalUnknowns[0].name=finalUnmRels[0];log('Char name resolved (last-resort rel):',finalUnmRels[0])}
            else if(finalUnmCp.length===1){finalUnknowns[0].name=finalUnmCp[0];log('Char name resolved (last-resort cp):',finalUnmCp[0])}
        } else if(finalUnknowns.length>=2){
            log('Char names unresolved:',finalUnknowns.length,'unknowns — ambiguous, neutral styling');
        }
    }
    // Post-normalization: infer missing scene fields from available context
    if(!o.charactersPresent||!o.charactersPresent.length){
        // Infer from characters array
        if(o.characters?.length)o.charactersPresent=o.characters.map(c=>c.name).filter(Boolean);
    }
    if(!o.witnesses||!o.witnesses.length)o.witnesses=[];
    // Scene fields: try to extract from environment sub-objects or sceneSummary
    if(!o.sceneTension){
        // Infer from sound/elapsed/context clues
        const ctx=(o.soundEnvironment||'')+(o.elapsed||'')+(o.sceneSummary||'');
        if(/critical|emergency|scream|weapon|blood|dying/i.test(ctx))o.sceneTension='critical';
        else if(/intense|desperate|pound|orgasm|confrontation|crying/i.test(ctx))o.sceneTension='high';
        else if(/sex|kiss|argue|tense|nervous/i.test(ctx))o.sceneTension='moderate';
        else if(/quiet|calm|relax|sleep|eat/i.test(ctx))o.sceneTension='low';
        else o.sceneTension='moderate';
        if(o.sceneTension)log('Inferred sceneTension:',o.sceneTension);
    }
    // Pass through custom panel fields (any key on d not already in o)
    const knownKeys=new Set(Object.keys(o));
    knownKeys.add('_spMeta');knownKeys.add('environment');knownKeys.add('scene');knownKeys.add('sceneDetails');knownKeys.add('sceneInfo');knownKeys.add('questJournal');
    for(const k of Object.keys(d)){
        if(!knownKeys.has(k))o[k]=d[k];
    }
    auditFields('normalizeTracker',o,['time','date','elapsed','location','weather','temperature','soundEnvironment','sceneTopic','sceneMood','sceneInteraction','sceneTension','sceneSummary','witnesses','charactersPresent','mainQuests','sideQuests','activeTasks','plotBranches','northStar','relationships','characters']);
    if(d._spMeta)o._spMeta=d._spMeta;
    return o;
}

function normalizeChar(ch){
    if(!ch||typeof ch!=='object'){warn('normalizeChar: invalid input',typeof ch);return ch}
    const flat={};
    function collect(obj,d){if(!obj||typeof obj!=='object'||d>5)return;for(const[k,v]of Object.entries(obj)){if(k==='name')continue;const lk=k.toLowerCase();if(typeof v==='string'&&v.length>0){if(!flat[lk])flat[lk]=v}else if(typeof v==='number'){if(flat[lk]==null)flat[lk]=v}else if(Array.isArray(v)){if(!flat[lk])flat[lk]=v}else if(typeof v==='object'&&v!==null){if(!flat[lk]){const sv=Object.values(v).filter(x=>typeof x==='string');if(sv.length)flat[lk]=sv.join('; ')}collect(v,d+1)}}}
    collect(ch,0);
    const g=keys=>{for(const k of keys){const v=flat[k];if(v!=null&&v!=='')return typeof v==='string'?v:String(v)}return''};
    // Name resolution: try direct name, then alternate keys, then _spKey (set by object unwrapper)
    let name=ch.name||g(['charactername','character_name','charname','fullname','full_name'])||ch._spKey||'';
    // If still no name, check if role text starts with a proper name pattern (e.g. "Yuzuki's co-worker")
    if(!name){
        const role=g(['role','identity','who','title']);
        const nameFromRole=role.match(/^([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)'s\b/);
        if(nameFromRole)name=nameFromRole[1];
    }
    if(!name)name='?';
    log('normalizeChar flat keys for',name,':',Object.keys(flat).join(', '));
    const o={name};
    o.role=g(['role','identity','who','emotion','title']);
    o.innerThought=g(['innerthought','inner_thought','thought','thinking','monologue']);
    o.immediateNeed=g(['immediateneed','immediate_need','need','doing','trying','urgentaction']);
    o.shortTermGoal=g(['shorttermgoal','short_term_goal','shortterm','neargoal']);
    o.longTermGoal=g(['longtermgoal','long_term_goal','longterm','lifemotivation','overarchinggoal']);
    o.hair=g(['hair']);o.face=g(['face','makeup','expression']);o.outfit=g(['outfit','clothing']);
    o.stateOfDress=g(['stateofdress','dress']);o.posture=g(['posture','stance']);
    o.proximity=g(['proximity','position']);o.physicalState=g(['physicalstate','physical','condition']);
    const inv=flat['inventory']||flat['items'];o.inventory=Array.isArray(inv)?inv:(typeof inv==='string'&&inv?[inv]:[]);
    o.fertStatus=g(['fertstatus','status'])||'';o.fertReason=g(['fertreason','statusreason'])||'';
    o.fertCyclePhase=g(['fertcyclephase','cyclephase'])||'';o.fertCycleDay=Number(flat['fertcycleday']||flat['cycleday'])||0;
    o.fertWindow=g(['fertwindow','fertilitywindow'])||'';o.fertPregnancy=g(['fertpregnancy','pregnancystatus'])||'';
    o.fertPregWeek=Number(flat['fertpregweek']||flat['pregnancyweek'])||0;o.fertNotes=g(['fertnotes','notes'])||'';
    if(!o.fertStatus){const ft=ch.fertilityTracker||ch.fertility||{};if(ft.status)o.fertStatus=ft.status;if(ft.statusReason&&!o.fertReason)o.fertReason=ft.statusReason}
    return o;
}

// ── Generation ──
let generating=false;
let cancelRequested=false;
let genNonce=0; // increments on start AND cancel; stale results silently discarded
let genMeta={promptTokens:0,completionTokens:0,elapsed:0};
let inlineGenStartMs=0; // Track generation start for together mode timing
let currentSnapshotMesIdx=-1; // Which message index the current panel data came from
let lastGenSource=''; // What triggered the last generation: 'auto', 'toolbar', 'section:X', 'mesBtn', 'settings', 'thoughts', 'inline'
let lastRawResponse=''; // stored for debug copy
let pendingInlineIdx=-1; // Message index awaiting inline extraction (set by interceptor, cleared on success)
let inlineExtractionDone=false; // Whether onCharMsg successfully extracted for the current generation

// Cancel: synchronous, instant. Restores UI immediately AND aborts ST's in-flight HTTP request.
function cancelGeneration(){
    if(!generating)return;
    const oldNonce=genNonce;
    genNonce++; // invalidate in-flight generation
    cancelRequested=true;
    generating=false;spSetGenerating(false); // unlock for next generation
    log('CANCEL: nonce',oldNonce,'→',genNonce,'— generation unlocked');
    
    // Abort SillyTavern's in-flight HTTP request — try every known method
    try{
        const ctx=SillyTavern.getContext();
        let aborted=false;
        
        // Method 1: ST's abortController on context
        if(ctx.abortController&&typeof ctx.abortController.abort==='function'){
            log('CANCEL: aborting via ctx.abortController');
            ctx.abortController.abort();aborted=true;
        }
        
        // Method 2: ST's global abortController
        if(!aborted&&window.abortController&&typeof window.abortController.abort==='function'){
            log('CANCEL: aborting via window.abortController');
            window.abortController.abort();aborted=true;
        }
        
        // Method 3: Try clicking ST's stop button with multiple known selectors
        const stopSelectors=['#mes_stop','.mes_stop','#stop_button','.stop_button','#form_sheld .stop_button','[id*="stop"]'];
        for(const sel of stopSelectors){
            try{
                const el=document.querySelector(sel);
                if(el){
                    log('CANCEL: found ST stop element:',sel,'visible=',el.offsetParent!==null,'display=',getComputedStyle(el).display);
                    if(el.offsetParent!==null||getComputedStyle(el).display!=='none'){
                        el.click();
                        log('CANCEL: clicked ST stop button via',sel);
                        aborted=true;break;
                    }
                }
            }catch(e2){}
        }
        
        // Method 4: Try jQuery click on common stop IDs
        if(!aborted){
            try{
                if(typeof $==='function'){
                    const $stop=$('#mes_stop, .mes_stop, .stop_button').filter(':visible');
                    if($stop.length){
                        $stop.first().trigger('click');
                        log('CANCEL: jQuery-clicked ST stop button');
                        aborted=true;
                    }
                }
            }catch(e3){}
        }
        
        if(!aborted)log('CANCEL: could not find ST abort mechanism — API call will complete in background');
    }catch(e){warn('CANCEL: ST abort attempt failed:',e?.message)}
    
    cleanupGenUI();
    // Restore panel from latest snapshot
    const snap=getLatestSnapshot();
    const body=document.getElementById('sp-panel-body');
    if(snap){
        const norm=normalizeTracker(snap);
        updatePanel(norm);
    }else if(body){
        body.innerHTML='<div class="sp-empty-state"><div class="sp-empty-icon">📡</div><div class="sp-empty-title">No scene data yet</div><div class="sp-empty-sub">Generation was cancelled. Click <strong>⟳</strong> to try again.</div></div>';
    }
}
// ── Streaming Tracker Hider ──
// During together mode, hide the SP_TRACKER JSON as it streams into the message.
// Uses an injected <style> rule instead of inline styles — CSS rules survive DOM recreation
// when other extensions or other extensions trigger profile switches that reload the chat.
let _streamHiderInterval=null;
let _streamHiderStart=0;
let _streamHiderStyleEl=null;
let _streamHiderObserver=null;
function startStreamingHider(){
    stopStreamingHider();
    _streamHiderStart=Date.now();
    _streamHiderStyleEl=document.createElement('style');
    _streamHiderStyleEl.id='sp-stream-hider-style';
    document.head.appendChild(_streamHiderStyleEl);
    let _safeH=0;let _locked=false;let _observer=null;let _mesId=null;let _lastMes=null;
    log('StreamHider: started');

    const _hasJson=(txt)=>{
        if(txt.includes('SP_TRACKER_START'))return true;
        if(txt.includes('```json'))return true;
        if(txt.length>200&&txt.includes('"time"')&&(txt.includes('"sceneTopic"')||txt.includes('"sceneMood"')||txt.includes('"location"')))return true;
        const lo=txt.lastIndexOf('{');
        if(lo>100&&txt.indexOf('"time"',lo)!==-1&&txt.indexOf('"time"',lo)-lo<40)return true;
        return false;
    };

    const _sel=()=>_mesId?`.mes[mesid="${_mesId}"] .mes_text`:`.mes:last-child .mes_text`;

    // PROACTIVE: Always cap at safe height + buffer. The message can never show more than we've measured as "clean".
    const _updateCap=()=>{
        if(!_lastMes||!_streamHiderStyleEl)return;
        const txt=_lastMes.textContent||'';
        if(_locked)return; // Already frozen
        if(_hasJson(txt)){
            // JSON detected — freeze at current safe height
            _locked=true;
            const capPx=Math.max(40,Math.ceil(_safeH));
            _streamHiderStyleEl.textContent=`${_sel()}{max-height:${capPx}px!important;overflow:hidden!important}`;
            log('StreamHider: LOCKED at',capPx+'px mesid='+_mesId);
            return;
        }
        // No JSON yet — update safe height and apply rolling cap with buffer
        const h=_lastMes.getBoundingClientRect().height;
        if(h>_safeH)_safeH=h;
        // Cap at current height + 30px buffer (allows next line to render, but not a 10KB JSON block)
        const capPx=Math.ceil(_safeH+30);
        _streamHiderStyleEl.textContent=`${_sel()}{max-height:${capPx}px!important;overflow:hidden!important}`;
    };

    // MutationObserver: fires on every DOM change to last message
    const _setupObserver=()=>{
        if(_observer)return;
        const mesTexts=document.querySelectorAll('.mes_text');
        if(!mesTexts.length)return;
        _lastMes=mesTexts[mesTexts.length-1];
        _mesId=_lastMes.closest('.mes')?.getAttribute('mesid');
        _observer=new MutationObserver(_updateCap);
        _streamHiderObserver=_observer; // Store at module level for cleanup
        _observer.observe(_lastMes,{childList:true,subtree:true,characterData:true});
    };

    // Polling fallback at 80ms
    _streamHiderInterval=setInterval(()=>{
        try{
            if(Date.now()-_streamHiderStart>180000){log('StreamHider: safety timeout (180s)');stopStreamingHider();return}
            _setupObserver();
            _updateCap();
        }catch(e){}
    },80);
}
function stopStreamingHider(){
    if(_streamHiderInterval){
        const elapsed=_streamHiderStart?Math.round((Date.now()-_streamHiderStart)/1000):0;
        log('StreamHider: stopped after',elapsed+'s');
        clearInterval(_streamHiderInterval);_streamHiderInterval=null;
    }
    // Disconnect MutationObserver
    if(_streamHiderObserver){try{_streamHiderObserver.disconnect()}catch(e){}_streamHiderObserver=null}
    // Remove the CSS rule after a delay — gives extraction time to clean the DOM
    setTimeout(()=>{if(_streamHiderStyleEl){_streamHiderStyleEl.remove();_streamHiderStyleEl=null}},600);
}

function showStopButton(){
    let btn=document.getElementById('sp-stop-btn');
    if(!btn){
        btn=document.createElement('button');btn.id='sp-stop-btn';btn.className='sp-stop-btn';
        btn.addEventListener('click',cancelGeneration);
        document.body.appendChild(btn);
    }
    // Position to match panel bottom edge
    const panel=document.getElementById('sp-panel');
    if(panel){
        const r=panel.getBoundingClientRect();
        btn.style.left=r.left+'px';
        btn.style.width=r.width+'px';
        btn.style.bottom='0px';
    }
    btn.textContent='■ Stop Generation';btn.disabled=false;btn.style.display='flex';
}
function hideStopButton(){const btn=document.getElementById('sp-stop-btn');if(btn)btn.style.display='none'}
let elapsedInterval=null;
function startElapsedTimer(){
    stopElapsedTimer();
    const start=Date.now();
    const el=document.getElementById('sp-regen-elapsed');
    if(el)el.textContent='0s';
    elapsedInterval=setInterval(()=>{
        const el=document.getElementById('sp-regen-elapsed');
        if(el)el.textContent=((Date.now()-start)/1000|0)+'s';
    },1000);
}
function stopElapsedTimer(){if(elapsedInterval){clearInterval(elapsedInterval);elapsedInterval=null}}
function cleanupGenUI(){
    hideStopButton();stopElapsedTimer();
    // Clear all loading overlays — panel, fixed, and thought
    clearLoadingOverlay(document.getElementById('sp-panel-body'));
    clearThoughtLoading();
}
function cleanJson(raw){
    let c=raw.trim().replace(/^```(?:json)?\s*\n?/i,'').replace(/\n?```\s*$/i,'');
    const fb=c.indexOf('{'),lb=c.lastIndexOf('}');
    if(fb===-1||lb===-1){err('cleanJson: no JSON object found. First 200:',c.substring(0,200));throw new Error('No JSON object in response')}
    c=c.substring(fb,lb+1);
    try{return JSON.parse(c)}catch(e){
        const m=e.message.match(/position (\d+)/);const pos=m?Number(m[1]):0;
        err('cleanJson: parse error at pos',pos,'context: …'+c.substring(Math.max(0,pos-40),pos+40)+'…');
        throw e;
    }
}

// ── Loading overlay helpers — transparent overlays that sit on top of existing content ──
function loadingHTML(label,sub,inline=false){
    const cls=inline?'sp-regen-overlay sp-regen-inline':'sp-regen-overlay';
    return `<div class="${cls}"><div class="sp-regen-spinner"><span class="sp-ring-3"></span></div><div class="sp-regen-text">${esc(label)}</div>${sub?`<div class="sp-regen-sub">${esc(sub)}<span class="sp-ellipsis"></span></div>`:''}</div>`;
}
function showLoadingOverlay(container,label,sub,inline=false){
    if(!container)return;
    clearLoadingOverlay(container);
    const ov=document.createElement('div');
    if(inline){
        // Section-level: absolute within section content
        container.style.position='relative';
        ov.className='sp-loading-glass sp-loading-glass-inline';
        ov.innerHTML=`<div class="sp-regen-overlay sp-regen-inline"><div class="sp-regen-spinner"><span class="sp-ring-3"></span></div><div class="sp-regen-text">${esc(label)}</div>${sub?`<div class="sp-regen-sub">${esc(sub)}<span class="sp-ellipsis"></span></div>`:''}</div>`;
        container.appendChild(ov);
        log('Overlay [inline]: "'+label+'"');
    } else {
        // Full panel: fixed to VIEWPORT on document.body, z-index above panel (1000)
        // Cannot be inside #sp-panel because overflow:auto + transform makes fixed=absolute
        ov.className='sp-loading-glass sp-loading-glass-fixed';
        ov.id='sp-panel-glass-overlay';
        const panel=document.getElementById('sp-panel');
        if(panel){
            const r=panel.getBoundingClientRect();
            ov.style.top=r.top+'px';
            ov.style.left=r.left+'px';
            ov.style.width=r.width+'px';
            ov.style.height=r.height+'px';
        }
        ov.innerHTML=`<div class="sp-regen-overlay"><div class="sp-regen-spinner"><span class="sp-ring-3"></span></div><div class="sp-regen-text">${esc(label)}</div>${sub?`<div class="sp-regen-sub">${esc(sub)}<span class="sp-ellipsis"></span></div>`:''}<div id="sp-regen-elapsed" class="sp-regen-elapsed"></div></div>`;
        document.body.appendChild(ov);
        log('Overlay [fixed]: "'+label+'"');
    }
}
function clearLoadingOverlay(container){
    if(container)container.querySelectorAll('.sp-loading-glass').forEach(ov=>ov.remove());
    const fixed=document.getElementById('sp-panel-glass-overlay');
    if(fixed){fixed.remove();log('Overlay [fixed]: cleared')}
}
function showThoughtLoading(label,sub){
    clearThoughtLoading();
    const mode=spDetectMode();if(mode==='mobile')return; // No thought panel on mobile
    // Full glass overlay on thought panel — manual regen only
    const tp=document.getElementById('sp-thought-panel');
    if(!tp)return;
    tp.classList.add('sp-tp-visible');
    tp.classList.add('sp-tp-loading-active'); // Block close during loading
    const tpb=document.getElementById('sp-tp-body');
    if(!tpb)return;
    tpb.style.position='relative';
    // Set explicit height so overlay fills the space and centers properly
    // Use panel height minus header, or fallback to 200px
    const hdrH=tp.querySelector('.sp-tp-header')?.offsetHeight||36;
    const available=tp.offsetHeight?tp.offsetHeight-hdrH:200;
    tpb.style.height=Math.max(120,available)+'px';
    const ov=document.createElement('div');
    ov.className='sp-loading-glass sp-loading-glass-tp';
    ov.innerHTML=`<div class="sp-tp-loading">
        <div class="sp-tp-spinner"><span class="sp-ring-3"></span></div>
        <div class="sp-tp-loading-text">${esc(label)}<span class="sp-ellipsis"></span></div>
        ${sub?`<div class="sp-tp-loading-sub">${esc(sub)}<span class="sp-ellipsis"></span></div>`:''}
        <div class="sp-tp-loading-elapsed" id="sp-tp-elapsed"></div>
    </div>`;
    tpb.appendChild(ov);
    // Start elapsed timer
    const start=Date.now();
    ov._tpTimer=setInterval(()=>{
        const el=document.getElementById('sp-tp-elapsed');
        if(el)el.textContent=((Date.now()-start)/1000|0)+'s';
    },1000);
    log('Overlay [thought]: "'+label+'"');
}
// ── Thought Banner — slim banner at top of Inner Thoughts panel during together-mode auto-gen ──
function showChatBanner(label){
    hideChatBanner();
    const bannerStart=Date.now();
    // Banner in thought panel only
    const tp=document.getElementById('sp-thought-panel');
    if(tp){
        const body=document.getElementById('sp-tp-body');
        if(body){
            const tpBanner=document.createElement('div');
            tpBanner.className='sp-chat-banner sp-inline-wait';
            tpBanner.innerHTML=`<div class="sp-inline-wait-spinner"></div><span>Updating scene data<span class="sp-ellipsis"></span></span><span class="sp-banner-timer" id="sp-banner-timer-tp">0s</span>`;
            tp.insertBefore(tpBanner,body);
            tp.classList.add('sp-tp-visible');
            tpBanner._timerInterval=setInterval(()=>{
                const el=document.getElementById('sp-banner-timer-tp');
                if(el)el.textContent=((Date.now()-bannerStart)/1000|0)+'s';
            },1000);
        }
    }
}
function hideChatBanner(){
    document.querySelectorAll('.sp-chat-banner').forEach(b=>{if(b._timerInterval)clearInterval(b._timerInterval);b.remove()});
}
function clearThoughtLoading(){
    const tp=document.getElementById('sp-thought-panel');
    if(tp)tp.classList.remove('sp-tp-loading-active');
    const tpb=document.getElementById('sp-tp-body');
    if(tpb){
        const ov=tpb.querySelector('.sp-loading-glass');
        if(ov){
            if(ov._tpTimer)clearInterval(ov._tpTimer);
            ov.remove();log('Overlay [thought]: cleared');
        }
        tpb.style.height='';
    }
    hideChatBanner();
}

async function generateTracker(mesIdx,partKey,opts){
    if(!getSettings().enabled){log('generateTracker: extension disabled, skipping');return null}
    if(generating){warn('Busy, nonce=',genNonce);return null}
    generating=true;cancelRequested=false;spSetGenerating(true);
    const myNonce=++genNonce;
    const genStartMs=Date.now();
    const settings=getSettings();const schema=getActiveSchema();const sysPr=getActivePrompt();
    let profileOverride=opts?.profile||settings.connectionProfile;
    let presetOverride=opts?.preset||settings.chatPreset;
    log('=== GENERATION START === mesIdx=',mesIdx,'partKey=',partKey||'(full)','nonce=',myNonce,'source=',lastGenSource||'unknown','profile=',profileOverride||'(current)');
    log('Settings: ctx=',settings.contextMessages,'retries=',settings.maxRetries,'mode=',settings.promptMode,'profile=',settings.connectionProfile||'(default)','preset=',settings.chatPreset||'(default)');
    // Resolve profile/preset name → UUID if needed (handles legacy name-based values)
    const _genProfiles=getConnectionProfiles();
    if(profileOverride&&!_genProfiles.some(p=>p.id===profileOverride)){
        const norm=profileOverride.trim().toLowerCase();
        let match=_genProfiles.find(p=>p.name.trim().toLowerCase()===norm);
        if(!match)match=_genProfiles.find(p=>p.name.toLowerCase().includes(norm)||norm.includes(p.name.toLowerCase()));
        if(match){log('Generation: resolved profile:',profileOverride,'→',match.id);profileOverride=match.id}
    }
    const _genPresets=getChatPresets();
    if(presetOverride&&!_genPresets.some(p=>p.id===presetOverride)){
        const norm=presetOverride.trim().toLowerCase();
        let match=_genPresets.find(p=>p.name.trim().toLowerCase()===norm);
        if(!match)match=_genPresets.find(p=>p.name.toLowerCase().includes(norm)||norm.includes(p.name.toLowerCase()));
        if(match){log('Generation: resolved preset:',presetOverride,'→',match.id);presetOverride=match.id}
    }
    const doGen=async()=>{
        const{chat,generateQuietPrompt,generateRaw}=SillyTavern.getContext();
        log('Chat length:',chat.length,'API funcs:','quietPrompt=',!!generateQuietPrompt,'raw=',!!generateRaw);
        const recent=chat.slice(Math.max(0,chat.length-settings.contextMessages));
        const ctxText=recent.map(m=>`${m.is_user?'{{user}}':(m.name||'{{char}}')}: ${m.mes}`).join('\n\n');
        const lastSnap=getLatestSnapshot();
        let snapCtx='';
        if(lastSnap){
            const allSnaps=getTrackerData().snapshots;
            const sorted=Object.keys(allSnaps).map(Number).sort((a,b)=>b-a);
            const snapCount=Math.min(settings.embedSnapshots||1, sorted.length);
            const snapsToEmbed=sorted.slice(0,snapCount).reverse();
            const hasEmptyChars=!lastSnap.characters||!lastSnap.characters.length;
            if(snapCount<=1){
                snapCtx=`\n\nPREVIOUS STATE (for reference — update as needed):\n${JSON.stringify(lastSnap,null,2)}`;
            }else{
                snapCtx='\n\nPREVIOUS STATES (most recent last, for tracking changes over time):';
                for(const k of snapsToEmbed){
                    snapCtx+=`\n--- Snapshot from message #${k} ---\n${JSON.stringify(allSnaps[String(k)],null,2)}`;
                }
            }
            snapCtx+=settings.panels?.quests!==false?`\n\nIMPORTANT: The Quest Journal (northStar, mainQuests, sideQuests, activeTasks) must be written from {{user}}'s perspective. NEVER drop quests that existed in the previous state unless the story resolved them. Carry ALL unresolved quests forward. Rewrite any character-perspective entries to {{user}}'s perspective.`:`\n\nIMPORTANT: Carry forward unchanged details. Only update what changed in the story.`;
            if(hasEmptyChars){
                snapCtx+=`\n\nWARNING: The previous state has EMPTY characters. This is a bug — you MUST generate full character details for ALL characters present in the scene.`;
                log('Previous state has empty characters — added generation warning');
            }
        }
        log('Gen context: msgs=',recent.length,'snapshots=',settings.embedSnapshots||1,'snapCtxLen~',snapCtx.length);
        let prompt=`${sysPr}\n\nRECENT:\n${ctxText}${snapCtx}\n\nGenerate updated JSON.`;
        if(partKey&&lastSnap)prompt+=`\n\nFOCUS: Only update fields related to "${partKey}". You MUST still return the complete JSON schema, but ONLY change the ${partKey}-related fields. Copy all other fields exactly as-is from the previous state.`;
        const promptLen=prompt.length;
        log('Prompt length:',promptLen,'chars (~',Math.round(promptLen/4),'tokens)');
        for(let a=0;a<=settings.maxRetries;a++){
            // Nonce check at every opportunity — if cancelled, bail immediately
            if(myNonce!==genNonce){log('STALE nonce',myNonce,'(current',genNonce+') — discarding silently');return null}
            try{if(a>0){log(`Retry ${a}/${settings.maxRetries}`);await new Promise(r=>setTimeout(r,1000*a))}
                let raw;
                log('Attempt',a+1,': calling generateQuietPrompt... nonce=',myNonce);
                try{
                    raw=await generateQuietPrompt({quietPrompt:prompt,jsonSchema:settings.promptMode==='native'?schema:undefined});
                }
                catch(e){
                    if(myNonce!==genNonce){log('STALE after quiet error, nonce',myNonce);return null}
                    const msg=e?.message||String(e);
                    warn('API error:',msg);
                    // ── Fatal API errors: stop immediately, no retry ──
                    const FATAL_PATTERNS=['401','403','404','authentication','unauthorized','forbidden','model not found','invalid api key','api key','billing','quota','insufficient','deactivated','account','permission','not allowed','blocked','banned'];
                    const msgLow=msg.toLowerCase();
                    const isFatal=FATAL_PATTERNS.some(p=>msgLow.includes(p));
                    if(isFatal){
                        err('FATAL API ERROR — stopping generation:',msg);
                        lastRawResponse='FATAL API ERROR: '+msg;
                        toastr.error('API Error: '+msg.substring(0,100),'Generation stopped');
                        return null;
                    }
                    // ── Rate limit: stop, don't waste retries ──
                    if(msgLow.includes('429')||msgLow.includes('rate limit')||msgLow.includes('too many requests')){
                        err('RATE LIMITED — stopping generation:',msg);
                        lastRawResponse='RATE LIMITED: '+msg;
                        toastr.error('Rate limited — try again in a moment','Generation stopped');
                        return null;
                    }
                    // ── Network errors: retry with delay ──
                    if(msg.includes('ECONNRESET')||msg.includes('socket')||msg.includes('500')||msg.includes('502')||msg.includes('503')||msg.includes('timeout')){
                        log('Network error, waiting 2s before fallback...');
                        await new Promise(r=>setTimeout(r,2000));
                    }
                    log('Trying generateRaw fallback...');
                    try{raw=await generateRaw({systemPrompt:sysPr,prompt:`RECENT:\n${ctxText}${snapCtx}\n\nOutput ONLY valid JSON.`})}
                    catch(e2){
                        const msg2=e2?.message||String(e2);
                        err('Fallback also failed:',msg2);
                        // Check if fallback hit a fatal error too
                        const msg2Low=msg2.toLowerCase();
                        if(FATAL_PATTERNS.some(p=>msg2Low.includes(p))||msg2Low.includes('429')||msg2Low.includes('rate limit')){
                            err('FATAL on fallback — stopping:',msg2);
                            lastRawResponse='FATAL API ERROR (fallback): '+msg2;
                            toastr.error('API Error: '+msg2.substring(0,100),'Generation stopped');
                            return null;
                        }
                        continue;
                    }
                }
                // Check nonce AFTER API returns — this is the critical discard point
                if(myNonce!==genNonce){log('STALE after API return, nonce',myNonce,'(current',genNonce+') — discarding response');return null}
                if(!raw||raw==='{}'){warn('Empty response on attempt',a+1);continue}
                const rawStr=String(raw);
                const rawLen=rawStr.length;
                lastRawResponse=rawStr; // store for debug copy
                // ── Check if response body IS an error message ──
                const rawLow=rawStr.substring(0,500).toLowerCase();
                if(rawLow.includes('"error"')||rawLow.includes('rate limit')||rawLow.includes('unauthorized')||rawLow.includes('forbidden')){
                    try{
                        const errObj=JSON.parse(rawStr);
                        if(errObj.error){
                            const errMsg=typeof errObj.error==='string'?errObj.error:(errObj.error.message||JSON.stringify(errObj.error));
                            err('API returned error object:',errMsg);
                            toastr.error('API Error: '+errMsg.substring(0,100),'Generation stopped');
                            return null;
                        }
                    }catch{}// Not JSON error, continue normally
                }
                log('Got response, length:',rawLen,'chars, nonce=',myNonce);
                log('Response preview:',String(raw).substring(0,200)+'…');
                genMeta.promptTokens=Math.round(promptLen/4);
                genMeta.completionTokens=Math.round(rawLen/4);
                genMeta.elapsed=((Date.now()-genStartMs)/1000);
                const parsed=cleanJson(raw);
                log('Parsed JSON keys:',Object.keys(parsed).join(', '));
                for(const[pk,pv]of Object.entries(parsed)){
                    if(pv&&typeof pv==='object'&&!Array.isArray(pv)){log('  nested object:',pk,'→ keys:',Object.keys(pv).join(', '))}
                    else if(Array.isArray(pv)){log('  array:',pk,'→ length:',pv.length,pv[0]?'first-keys:'+Object.keys(pv[0]).join(','):'(empty)')}
                }
                return parsed;
            }catch(e){err(`Parse fail (${a+1}):`,e?.message||String(e))}
        }
        warn('All',settings.maxRetries+1,'attempts exhausted, returning null');
        toastr.error('All retry attempts failed — check SP Log for details','Generation failed');
        return null;
    };
    let result;
    try{result=await withProfileAndPreset(profileOverride,presetOverride,doGen)}
    catch(e){err('Gen:',e)}
    // Only the CURRENT generation is allowed to touch state
    if(myNonce!==genNonce){
        log('POST-GEN: stale nonce',myNonce,'(current',genNonce+') — result discarded, state untouched');
        return null; // Don't reset generating — the newer cancel/gen already did
    }
    generating=false;spSetGenerating(false);cancelRequested=false;cleanupGenUI();
    if(result){
        log('Raw output keys:',Object.keys(result).join(', '));
        log('Raw characters?',Array.isArray(result.characters)?'array('+result.characters.length+')':typeof result.characters);
        log('Raw relationships?',Array.isArray(result.relationships)?'array('+result.relationships.length+')':typeof result.relationships);
        result=normalizeTracker(result);
        // ── SECTION MERGE: Only accept fields belonging to the requested section ──
        if(partKey){
            const SECTION_FIELDS={
                dashboard:['time','date','location','weather','temperature'],
                scene:['sceneTopic','sceneMood','sceneInteraction','sceneTension','sceneSummary','soundEnvironment','charactersPresent'],
                quests:['northStar','mainQuests','sideQuests','activeTasks'],
                relationships:['relationships'],
                characters:['characters'],
                branches:['plotBranches']
            };
            const allowedFields=SECTION_FIELDS[partKey];
            if(allowedFields||partKey.startsWith('custom_')){
                const existingSnap=getSnapshotFor(mesIdx)||getLatestSnapshot();
                if(existingSnap){
                    const merged=normalizeTracker(existingSnap);
                    if(allowedFields){
                        for(const f of allowedFields){if(result[f]!==undefined)merged[f]=result[f]}
                        log('Section merge: partKey=',partKey,'accepted fields:',allowedFields.join(','),'preserved',Object.keys(merged).length-allowedFields.length,'existing fields');
                    } else {
                        // Custom panel — accept only its field keys
                        const s=getSettings();
                        const cp=(s.customPanels||[]).find(c=>'custom_'+c.name.replace(/\s+/g,'_').toLowerCase()===partKey);
                        if(cp?.fields){
                            const cpFields=cp.fields.map(f=>f.key);
                            for(const f of cpFields){if(result[f]!==undefined)merged[f]=result[f]}
                            log('Section merge (custom): partKey=',partKey,'accepted fields:',cpFields.join(','));
                        }
                    }
                    result=merged;
                }
            }
        }
        log('=== POST-NORMALIZE SUMMARY === source=',lastGenSource);
        log('  chars:',result.characters?.length||0,'rels:',result.relationships?.length||0);
        log('  quests: main=',result.mainQuests?.length||0,'side=',result.sideQuests?.length||0,'tasks=',result.activeTasks?.length||0);
        log('  northStar:',result.northStar?'"'+result.northStar.substring(0,60)+'"':'(empty)');
        log('  scene:',result.sceneTopic?'topic=✓':'topic=✗',result.sceneMood?'mood=✓':'mood=✗',result.sceneTension?'tension=✓':'tension=✗');
        if(result.characters?.length){for(const ch of result.characters)log('  char:',ch.name,'role=',ch.role?'✓':'✗','thought=',ch.innerThought?'✓':'✗','hair=',ch.hair?'✓':'✗')}
        if(result.relationships?.length){for(const r of result.relationships)log('  rel:',r.name,'aff=',r.affection,'trust=',r.trust,'desire=',r.desire,'compat=',r.compatibility)}
        currentSnapshotMesIdx=mesIdx;
        // Embed generation metadata into snapshot for persistence
        result._spMeta={promptTokens:genMeta.promptTokens,completionTokens:genMeta.completionTokens,elapsed:genMeta.elapsed,source:lastGenSource,injectionMethod:getSettings().injectionMethod||'inline'};
        saveSnapshot(mesIdx,result);log('Snapshot saved for mesIdx=',mesIdx,'keys=',Object.keys(result).length,'elapsed=',genMeta.elapsed.toFixed(1)+'s','~tokens:',genMeta.promptTokens+genMeta.completionTokens);
        updatePanel(result);
        spPostGenShow(); // mobile: banner instead of panel popup
    }else{
        // Show error in panel instead of stuck spinner
        const body=document.getElementById('sp-panel-body');
        if(body)body.innerHTML='<div class="sp-error"><div style="font-weight:700;margin-bottom:4px">Generation Failed</div><div style="font-size:10px">Network timeout or API issue. Try ⟳ Regen or check debug log.</div></div>';
        warn('Generation returned null for',mesIdx);
    }
    return result;
}

// ── Side Panel Rendering ──
function showPanel(){
    const p=document.getElementById('sp-panel');if(!p)return;
    if(!getSettings().enabled){p.classList.remove('sp-visible');return}
    const mode=spApplyMode();
    // Measure ST's top bar for all modes
    const topBar=document.getElementById('top-bar')||document.getElementById('top-settings-holder')||document.querySelector('.header,.nav-bar,header');
    const tbH=topBar?topBar.getBoundingClientRect().bottom:0;
    if(mode==='mobile'){
        const spTopH=44; // SP mobile top bar height
        p.style.top=spTopH+'px';p.style.height=`calc(100vh - ${spTopH}px)`;p.style.width='100vw';p.style.right='0';
    }else if(mode==='tablet'){
        const tbW=Math.min(Math.round(window.innerWidth*0.7),600);
        p.style.top=tbH+'px';p.style.height=`calc(100vh - ${tbH}px)`;p.style.width=tbW+'px';p.style.right='0';
    }else{
        p.style.top=tbH+'px';
        p.style.height=`calc(100vh - ${tbH}px)`;
        if(!p.classList.contains('sp-compact')){
            const sheld=document.getElementById('sheld');
            if(sheld){
                const rect=sheld.getBoundingClientRect();
                const panelW=Math.max(300,window.innerWidth-rect.right);
                p.style.width=panelW+'px';
            }
        }else{
            const compactW=Math.max(240,Math.min(Math.round(window.innerWidth*0.22),280));
            p.style.width=compactW+'px';
        }
    }
    p.classList.add('sp-visible');
    // Must call AFTER sp-visible is set so spInjectTopBar sees panel as visible
    spInjectTopBar(mode);
    syncThoughts();
    spUpdateFab();
    log('Panel shown, width:',p.style.width,'top:',p.style.top,'mode:',mode);
}
function hidePanel(){
    const p=document.getElementById('sp-panel');if(!p)return;
    p.classList.remove('sp-visible');
    const tp=document.getElementById('sp-thought-panel');
    if(tp)tp.classList.remove('sp-tp-visible');
    clearWeatherOverlay();
    clearTimeTint();
    spInjectTopBar(spDetectMode()); // Restore ST top bar on mobile
    spUpdateFab();
    log('Panel hidden');
}
function syncThoughts(){
    const tp=document.getElementById('sp-thought-panel');if(!tp)return;
    const mode=spDetectMode();
    // No thought panel on mobile
    if(mode==='mobile'){tp.classList.remove('sp-tp-visible');return}
    const mainVisible=document.getElementById('sp-panel')?.classList.contains('sp-visible');
    const s=getSettings();
    if(mainVisible&&s.showThoughts!==false){
        const body=document.getElementById('sp-tp-body');
        if(body&&body.children.length>0)tp.classList.add('sp-tp-visible');
    }else{
        tp.classList.remove('sp-tp-visible');
    }
}

function createPanel(){
    if(document.getElementById('sp-panel'))return;
    const panel=document.createElement('div');panel.id='sp-panel';
    panel.innerHTML=`
    <div class="sp-toolbar">
        <div class="sp-brand-icon" id="sp-brand-icon" title="ScenePulse v4.9.81">${MASCOT_SVG}</div>
        <div class="sp-brand-title">Scene<span class="sp-brand-accent">Pulse</span></div>
        <span class="sp-toolbar-spacer"></span>
        <button class="sp-toolbar-btn" id="sp-tb-regen" title="Regenerate all"><svg viewBox="0 0 16 16" width="15" height="15" fill="none"><path d="M13.5 8a5.5 5.5 0 1 1-1.3-3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M13.5 3v2.5h-2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <span class="sp-toolbar-sep"></span>
        <button class="sp-toolbar-btn" id="sp-tb-panels" title="Panel Manager"><svg viewBox="0 0 16 16" width="15" height="15" fill="none"><rect x="1" y="2" width="6" height="4" rx="1" stroke="currentColor" stroke-width="1.1" opacity="0.6"/><rect x="9" y="2" width="6" height="4" rx="1" stroke="currentColor" stroke-width="1.1" opacity="0.6"/><rect x="1" y="8" width="6" height="4" rx="1" stroke="currentColor" stroke-width="1.1" fill="currentColor" opacity="0.15"/><rect x="9" y="8" width="6" height="4" rx="1" stroke="currentColor" stroke-width="1.1"/><line x1="3" y1="14" x2="13" y2="14" stroke="currentColor" stroke-width="1" opacity="0.25" stroke-linecap="round"/></svg></button>
        <button class="sp-toolbar-btn" id="sp-tb-toggle" title="Expand/Collapse sections"><svg viewBox="0 0 16 16" width="15" height="15" fill="none"><rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/><rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/><rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/><rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/></svg></button>
        <button class="sp-toolbar-btn" id="sp-tb-compact" title="Condense view"><svg viewBox="0 0 16 16" width="15" height="15" fill="none"><rect x="2" y="2" width="12" height="2.5" rx="1" fill="currentColor" opacity="0.3"/><rect x="2" y="6" width="9" height="2" rx="0.8" fill="currentColor" opacity="0.2"/><rect x="2" y="9.5" width="11" height="2" rx="0.8" fill="currentColor" opacity="0.15"/><rect x="2" y="13" width="7" height="1.5" rx="0.7" fill="currentColor" opacity="0.1"/><path d="M14 5.5L14 12" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.3"/><path d="M12.5 7l1.5-1.5L15.5 7" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round" opacity="0.4"/><path d="M12.5 10.5l1.5 1.5 1.5-1.5" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round" opacity="0.4"/></svg></button>
        <span class="sp-toolbar-sep"></span>
        <button class="sp-toolbar-btn sp-tb-active" id="sp-tb-thoughts" title="Toggle thoughts"><svg viewBox="0 0 16 16" width="15" height="15" fill="none"><path d="M2 9.5c0 1.5 1.5 3 4 3l2 2v-2c2.5 0 4-1.5 4-3V6c0-1.5-1.5-3-4-3H6C3.5 3 2 4.5 2 6v3.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" fill="currentColor" opacity="0.15"/><circle cx="5.5" cy="7.2" r="0.8" fill="currentColor" opacity="0.6"/><circle cx="8" cy="7.2" r="0.8" fill="currentColor" opacity="0.6"/><circle cx="10.5" cy="7.2" r="0.8" fill="currentColor" opacity="0.6"/></svg></button>
        <button class="sp-toolbar-btn sp-tb-active" id="sp-tb-weather" title="Toggle weather overlay"><svg viewBox="0 0 16 16" width="15" height="15" fill="none"><path d="M4.5 11.5c-2 0-3.5-1.2-3.5-3 0-1.4 1-2.6 2.4-3C4 2.8 6.2 1 9 1c2.6 0 4.8 1.8 5 4 1.5.3 2.5 1.4 2.5 2.8 0 1.7-1.5 3-3.2 3H4.5z" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><line x1="5" y1="13" x2="4" y2="15.5" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.4"/><line x1="8.5" y1="13" x2="7.5" y2="15.5" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.4"/><line x1="12" y1="13" x2="11" y2="15.5" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.4"/></svg></button>
        <button class="sp-toolbar-btn sp-tb-active" id="sp-tb-timeTint" title="Toggle time-of-day ambience"><svg viewBox="0 0 16 16" width="15" height="15" fill="none"><circle cx="8" cy="8" r="3" fill="currentColor" opacity="0.25" stroke="currentColor" stroke-width="1.2"/><line x1="8" y1="1.5" x2="8" y2="3.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/><line x1="8" y1="12.5" x2="8" y2="14.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/><line x1="1.5" y1="8" x2="3.5" y2="8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/><line x1="12.5" y1="8" x2="14.5" y2="8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/><line x1="3.4" y1="3.4" x2="4.8" y2="4.8" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.35"/><line x1="11.2" y1="11.2" x2="12.6" y2="12.6" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.35"/><line x1="3.4" y1="12.6" x2="4.8" y2="11.2" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.35"/><line x1="11.2" y1="4.8" x2="12.6" y2="3.4" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.35"/></svg></button>
        <button class="sp-toolbar-btn sp-tb-active" id="sp-tb-sceneTrans" title="Toggle location change popups"><svg viewBox="0 0 16 16" width="15" height="15" fill="none"><path d="M2 12V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z" stroke="currentColor" stroke-width="1.1" fill="currentColor" opacity="0.08"/><path d="M5 8h6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/><path d="M9.5 5.5L12 8l-2.5 2.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <span class="sp-toolbar-sep"></span>
        <button class="sp-toolbar-btn" id="sp-tb-edit" title="Toggle edit mode"><svg viewBox="0 0 16 16" width="15" height="15" fill="none"><path d="M11.5 1.5l3 3-8.5 8.5H3v-3l8.5-8.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><line x1="9.5" y1="3.5" x2="12.5" y2="6.5" stroke="currentColor" stroke-width="0.8" opacity="0.4"/><line x1="3" y1="14.5" x2="13" y2="14.5" stroke="currentColor" stroke-width="1" opacity="0.3" stroke-linecap="round"/></svg></button>
        <div class="sp-dev-wrap" id="sp-dev-wx-wrap" style="display:none"><button class="sp-toolbar-btn sp-tb-dev" id="sp-tb-dev-wx" title="DEV: Weather overlays"><svg viewBox="0 0 16 16" width="15" height="15" fill="none"><path d="M4 12c-1.8 0-3-1-3-2.5S2 7.5 3.5 7C4 4.5 6 3 8.5 3c2.2 0 4 1.5 4.2 3.5C14 6.8 15 8 15 9.5S13.5 12 12 12z" stroke="currentColor" stroke-width="1.1" fill="currentColor" opacity="0.15"/><path d="M6 8l2-3 2 3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/><line x1="8" y1="8" x2="8" y2="13" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.6"/></svg></button><div class="sp-dev-dropdown" id="sp-dev-wx-menu"></div></div>
        <div class="sp-dev-wrap" id="sp-dev-time-wrap" style="display:none"><button class="sp-toolbar-btn sp-tb-dev" id="sp-tb-dev-time" title="DEV: Time-of-day tints"><svg viewBox="0 0 16 16" width="15" height="15" fill="none"><circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1.2"/><line x1="8" y1="8" x2="8" y2="4.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="8" y1="8" x2="11" y2="9.5" stroke="currentColor" stroke-width="1" stroke-linecap="round"/><circle cx="8" cy="8" r="0.8" fill="currentColor"/></svg></button><div class="sp-dev-dropdown" id="sp-dev-time-menu"></div></div>
        <button class="sp-toolbar-btn" id="sp-tb-minimize" title="Hide panel" style="display:none"><svg viewBox="0 0 16 16" width="15" height="15" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><line x1="2" y1="13" x2="14" y2="13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity="0.4"/></svg></button>
    </div>
    <div id="sp-panel-body"><div class="sp-empty-state"><div class="sp-empty-icon">📡</div><div class="sp-empty-title">No scene data yet</div><div class="sp-empty-sub">Send a message or click <strong>⟳</strong> to generate.</div></div></div>`;
    document.body.appendChild(panel);
    log('Panel appended to body');

    // ── Mobile FAB (floating action button to restore panel) ──
    if(!document.getElementById('sp-mobile-fab')){
        const fab=document.createElement('button');fab.id='sp-mobile-fab';fab.className='sp-mobile-fab';
        fab.title='Show ScenePulse';fab.innerHTML=MASCOT_SVG;
        fab.addEventListener('click',spRestorePanel);
        document.body.appendChild(fab);
    }
    // ── Minimize button handler ──
    document.getElementById('sp-tb-minimize').addEventListener('click',spMinimizePanel);
    // Initial mode detection — shows FAB on mobile/tablet if panel isn't visible yet
    setTimeout(()=>spApplyMode(),100);
    // Recalculate panel width on resize + apply mode
    window.addEventListener('resize',()=>{const p=document.getElementById('sp-panel');if(p?.classList.contains('sp-visible'))showPanel();spApplyMode()});

    // Easter egg: click the icon for a surprise spin
    let eggClicks=0;
    document.getElementById('sp-brand-icon').addEventListener('click',()=>{
        eggClicks++;
        const icon=document.getElementById('sp-brand-icon');
        icon.classList.add('sp-egg-spin');
        setTimeout(()=>icon.classList.remove('sp-egg-spin'),800);
        if(eggClicks>=5){eggClicks=0;icon.classList.add('sp-egg-rainbow');setTimeout(()=>icon.classList.remove('sp-egg-rainbow'),3000)}
    });
    document.getElementById('sp-tb-regen').addEventListener('click',async()=>{
        if(generating){toastr.warning('Generation already in progress');return}
        const{chat}=SillyTavern.getContext();if(!chat.length)return;
        const body=document.getElementById('sp-panel-body');
        showLoadingOverlay(body,'Regenerating Scene','Analyzing context and building tracker');
        lastGenSource='manual:full';
        showStopButton();startElapsedTimer();
        // Manual regen always shows thought panel
        const tp=document.getElementById('sp-thought-panel');
        const st=getSettings();
        st.showThoughts=true;saveSettings();
        // Sync UI
        const tbBtn=document.getElementById('sp-tb-thoughts');if(tbBtn)tbBtn.classList.add('sp-tb-active');
        const cb=document.getElementById('sp-show-thoughts');if(cb)cb.checked=true;
        if(tp){
            tp.classList.add('sp-tp-visible');
            showThoughtLoading('Updating thoughts','Analyzing context');
        }
        const preNonce=genNonce;
        const result=await generateTracker(chat.length-1);
        // If nonce changed beyond our generation, cancel already handled UI — bail
        if(genNonce>preNonce+1){log('Toolbar regen: stale caller, cancel handled UI');return}
        hideStopButton();stopElapsedTimer();
        clearLoadingOverlay(body);clearThoughtLoading();
        if(!result){
            const snap=getLatestSnapshot();
            if(snap){const norm=normalizeTracker(snap);updatePanel(norm)}
            else body.innerHTML='<div class="sp-empty-state"><div class="sp-empty-icon">⟳</div><div class="sp-empty-title">No scene data yet</div><div class="sp-empty-sub">Send a message or click <strong>⟳</strong> to generate.</div></div>';
        }
    });
    document.getElementById('sp-tb-toggle').addEventListener('click',()=>{
        const secs=document.querySelectorAll('#sp-panel-body .sp-section');
        const anyOpen=Array.from(secs).some(s=>s.classList.contains('sp-open'));
        const st=getSettings();if(!st.openSections)st.openSections={};
        secs.forEach(s=>{
            if(anyOpen)s.classList.remove('sp-open');else s.classList.add('sp-open');
            const k=s.dataset.key;if(k)st.openSections[k]=!anyOpen;
        });
        saveSettings();
    });
    // Thoughts toggle
    document.getElementById('sp-tb-thoughts').addEventListener('click',()=>{
        const s=getSettings();s.showThoughts=!s.showThoughts;saveSettings();
        const btn=document.getElementById('sp-tb-thoughts');
        btn.classList.toggle('sp-tb-active',s.showThoughts);
        syncThoughts();
        // Also update settings checkbox if it exists
        const cb=document.getElementById('sp-show-thoughts');if(cb)cb.checked=s.showThoughts;
    });
    // Compact view toggle — shrinks panel to right
    // Edit mode toggle
    document.getElementById('sp-tb-edit').addEventListener('click',()=>{
        const p=document.getElementById('sp-panel');if(!p)return;
        const isEdit=p.classList.toggle('sp-edit-mode');
        document.getElementById('sp-tb-edit').classList.toggle('sp-tb-active',isEdit);
        if(isEdit)toastr.info('Click any highlighted field to edit','Edit Mode On');
        else toastr.info('Edit mode off','Edit Mode Off');
        log('Edit mode:',isEdit);
    });
    // Compact/Focus toggle
    document.getElementById('sp-tb-compact').addEventListener('click',()=>{
        const p=document.getElementById('sp-panel');if(!p)return;
        const isCompact=p.classList.toggle('sp-compact');
        const btn=document.getElementById('sp-tb-compact');
        btn.classList.toggle('sp-tb-active',isCompact);
        // Recalculate width — compact uses less space
        if(isCompact){
            const compactW=Math.max(240,Math.min(Math.round(window.innerWidth*0.22),280));
            p.style.width=compactW+'px';
        }else{
            // Restore full width
            const sheld=document.getElementById('sheld');
            if(sheld){const rect=sheld.getBoundingClientRect();p.style.width=Math.max(300,window.innerWidth-rect.right)+'px'}
        }
        log('Compact:',isCompact);
    });
    // Panel Manager toggle
    document.getElementById('sp-tb-panels').addEventListener('click',()=>{
        const body=document.getElementById('sp-panel-body');if(!body)return;
        const btn=document.getElementById('sp-tb-panels');
        let mgr=document.getElementById('sp-panel-mgr');
        const closeMgr=()=>{
            if(!mgr)return;
            mgr.classList.add('sp-mgr-closing');
            setTimeout(()=>{if(mgr?.parentNode)mgr.remove()},350);
            btn.classList.remove('sp-tb-active');
        };
        if(mgr){closeMgr();return}
        btn.classList.add('sp-tb-active');
        mgr=document.createElement('div');mgr.id='sp-panel-mgr';mgr.className='sp-panel-mgr sp-mgr-closing';
        const s=getSettings();
        mgr.innerHTML=`<div class="sp-mgr-header"><span class="sp-mgr-title">Panel Manager</span><button class="sp-mgr-close" title="Close">\u2715</button></div><div class="sp-mgr-hint">Toggle panels on/off. Disabled panels are excluded from the LLM prompt.</div>`;
        mgr.querySelector('.sp-mgr-close').addEventListener('click',closeMgr);
        // Built-in panel toggles — collapsible
        const builtinWrap=document.createElement('div');builtinWrap.className='sp-mgr-collapsible';
        const builtinHeader=document.createElement('div');builtinHeader.className='sp-mgr-collapse-header';
        builtinHeader.innerHTML=`<span class="sp-mgr-collapse-arrow">\u25b8</span><span class="sp-mgr-collapse-label">Built-in Panels</span><span class="sp-mgr-collapse-count">${Object.values(s.panels||DEFAULTS.panels).filter(v=>v!==false).length}/${Object.keys(BUILTIN_PANELS).length}</span>`;
        const togglesDiv=document.createElement('div');togglesDiv.className='sp-mgr-toggles sp-mgr-collapsed';
        builtinHeader.addEventListener('click',()=>{
            const collapsed=togglesDiv.classList.toggle('sp-mgr-collapsed');
            builtinHeader.querySelector('.sp-mgr-collapse-arrow').textContent=collapsed?'\u25b8':'\u25be';
        });
        for(const[id,def] of Object.entries(BUILTIN_PANELS)){
            const panels=s.panels||{...DEFAULTS.panels};
            const row=document.createElement('label');row.className='sp-mgr-toggle';
            row.innerHTML=`<input type="checkbox" data-panel="${esc(id)}" ${panels[id]!==false?'checked':''}><span class="sp-mgr-toggle-name">${esc(def.name)}</span>`;
            const cb=row.querySelector('input');
            cb.addEventListener('change',()=>{
                if(!s.panels)s.panels={...DEFAULTS.panels};
                s.panels[cb.dataset.panel]=cb.checked;
                saveSettings();
                const sectionMap={dashboard:'.sp-env-permanent',scene:'[data-key="scene"]',quests:'[data-key="quests"]',relationships:'[data-key="relationships"]',characters:'[data-key="characters"]',storyIdeas:'[data-key="branches"]'};
                const sel=sectionMap[cb.dataset.panel];
                if(sel){const el=body.querySelector(sel);if(el){if(cb.checked)el.classList.remove('sp-panel-hidden');else el.classList.add('sp-panel-hidden')}}
                const count=Object.values(s.panels).filter(v=>v!==false).length;
                builtinHeader.querySelector('.sp-mgr-collapse-count').textContent=count+'/'+Object.keys(BUILTIN_PANELS).length;
                // Grey out sub-toggles when panel disabled; re-enable all sub-fields when panel enabled
                const nextSub=row.nextElementSibling;
                if(nextSub?.classList.contains('sp-mgr-sub-toggles')){
                    nextSub.classList.toggle('sp-mgr-sub-disabled',!cb.checked);
                    if(cb.checked){
                        // Re-enable all sub-fields for this panel
                        const panelDef=BUILTIN_PANELS[cb.dataset.panel];
                        if(panelDef){
                            if(!s.fieldToggles)s.fieldToggles={};
                            for(const f of panelDef.fields)if(!f.noToggle){s.fieldToggles[f.key]=true}
                            for(const sf of(panelDef.subFields||[]))s.fieldToggles[sf.key]=true;
                            if(cb.dataset.panel==='dashboard'){
                                if(!s.dashCards)s.dashCards={...DEFAULTS.dashCards};
                                for(const k of Object.keys(DEFAULTS.dashCards))s.dashCards[k]=true;
                            }
                        }
                        nextSub.querySelectorAll('input').forEach(i=>{i.disabled=false;i.checked=true});
                        // Apply visibility
                        body.querySelectorAll('[data-ft]').forEach(el=>{
                            const k=el.dataset.ft;
                            if(s.fieldToggles[k]!==false)el.style.display='';
                        });
                        saveSettings();
                    } else {
                        nextSub.querySelectorAll('input').forEach(i=>{i.disabled=true});
                    }
                }
                const schemaEl=document.getElementById('sp-schema');
                if(schemaEl&&!s.schema)schemaEl.value=JSON.stringify(buildDynamicSchema(s),null,2);
                // Sync toolbar icons: hide/dim when panel disabled
                if(cb.dataset.panel==='dashboard'){
                    const wxBtn=document.getElementById('sp-tb-weather');
                    const ttBtn=document.getElementById('sp-tb-timeTint');
                    if(wxBtn)wxBtn.style.opacity=cb.checked?'':'0.25';
                    if(ttBtn)ttBtn.style.opacity=cb.checked?'':'0.25';
                }
                log('Panel toggled:',cb.dataset.panel,'→',cb.checked);
            });
            togglesDiv.appendChild(row);
            // Sub-toggles for fields + subFields in this panel
            const allSubs=[...def.fields.filter(f=>!f.noToggle).map(f=>({...f,isDashCard:!!f.dashCard,isSub:false})),...(def.subFields||[]).map(sf=>({...sf,isDashCard:false,isSub:true}))];
            if(allSubs.length>=1){
                const subWrap=document.createElement('div');subWrap.className='sp-mgr-sub-toggles';
                const dc=s.dashCards||{...DEFAULTS.dashCards};
                const ft=s.fieldToggles||{};
                for(const f of allSubs){
                    const fKey=f.key;const fLabel=f.label||f.key;
                    const isOn=f.isDashCard?(dc[f.dashCard]!==false):(ft[fKey]!==false);
                    const sub=document.createElement('label');sub.className='sp-mgr-sub-toggle';
                    sub.innerHTML=`<input type="checkbox" ${isOn?'checked':''}><span>${esc(fLabel)}</span>`;
                    const scb=sub.querySelector('input');
                    scb.addEventListener('change',()=>{
                        if(f.isDashCard){
                            if(!s.dashCards)s.dashCards={...DEFAULTS.dashCards};
                            s.dashCards[f.dashCard]=scb.checked;
                            const card=body.querySelector(`[data-card="${f.dashCard}"]`);
                            if(card)card.style.display=scb.checked?'':'none';
                            // Sync toolbar buttons
                            if(f.dashCard==='weather'){
                                const wxBtn=document.getElementById('sp-tb-weather');
                                if(wxBtn){wxBtn.style.opacity=scb.checked?'':'0.25';wxBtn.style.pointerEvents=scb.checked?'':'none'}
                                if(scb.checked&&s.weatherOverlay===false){
                                    s.weatherOverlay=true;if(wxBtn)wxBtn.classList.add('sp-tb-active');
                                    const snap=getLatestSnapshot();if(snap)updateWeatherOverlay(normalizeTracker(snap).weather);
                                }
                                if(!scb.checked){s.weatherOverlay=false;clearWeatherOverlay();if(wxBtn)wxBtn.classList.remove('sp-tb-active')}
                            }
                            if(f.dashCard==='time'){
                                const ttBtn=document.getElementById('sp-tb-timeTint');
                                if(ttBtn){ttBtn.style.opacity=scb.checked?'':'0.25';ttBtn.style.pointerEvents=scb.checked?'':'none'}
                                if(scb.checked&&!s.timeTint){
                                    s.timeTint=true;if(ttBtn)ttBtn.classList.add('sp-tb-active');
                                    const snap=getLatestSnapshot();if(snap)updateTimeTint(normalizeTracker(snap).time);
                                }
                                if(!scb.checked){s.timeTint=false;clearTimeTint();if(ttBtn)ttBtn.classList.remove('sp-tb-active')}
                            }
                        } else {
                            if(!s.fieldToggles)s.fieldToggles={};
                            s.fieldToggles[fKey]=scb.checked;
                            // CSS-only toggle — zero rebuilds
                            body.querySelectorAll(`[data-ft="${fKey}"]`).forEach(el=>{el.style.display=scb.checked?'':'none'});
                            // char_thoughts controls the floating thoughts panel
                            if(fKey==='char_thoughts'){
                                s.showThoughts=scb.checked;
                                const tp=document.getElementById('sp-thought-panel');
                                const thBtn=document.getElementById('sp-tb-thoughts');
                                if(!scb.checked){
                                    if(tp)tp.classList.remove('sp-tp-visible');
                                    if(thBtn){thBtn.classList.remove('sp-tb-active');thBtn.style.opacity='0.25';thBtn.style.pointerEvents='none'}
                                } else {
                                    if(thBtn){thBtn.classList.add('sp-tb-active');thBtn.style.opacity='';thBtn.style.pointerEvents=''}
                                    const snap=getLatestSnapshot();if(snap)updateThoughts(normalizeTracker(snap));
                                    if(tp)tp.classList.add('sp-tp-visible');
                                }
                                const settingsCb=document.getElementById('sp-show-thoughts');
                                if(settingsCb)settingsCb.checked=scb.checked;
                            }
                        }
                        saveSettings();
                        const schemaEl=document.getElementById('sp-schema');
                        if(schemaEl&&!s.schema)schemaEl.value=JSON.stringify(buildDynamicSchema(s),null,2);
                        log((f.isDashCard?'DashCard':f.isSub?'SubField':'Field')+' toggled:',fKey,'→',scb.checked);
                    });
                    subWrap.appendChild(sub);
                    if(f.dashCard==='weather'){
                        const wxHint=document.createElement('div');wxHint.className='sp-mgr-hint-tip';
                        wxHint.dataset.hintTarget='sp-tb-weather';
                        wxHint.textContent='\u2139 Weather overlay is off \u2014 enable it in the toolbar for visual effects.';
                        const wxOn=()=>dc.weather!==false&&s.weatherOverlay===false;
                        wxHint.style.display=wxOn()?'':'none';
                        wxHint.addEventListener('mouseenter',()=>{const t=document.getElementById(wxHint.dataset.hintTarget);if(t)t.classList.add('sp-tb-glow')});
                        wxHint.addEventListener('mouseleave',()=>{const t=document.getElementById(wxHint.dataset.hintTarget);if(t)t.classList.remove('sp-tb-glow')});
                        subWrap.appendChild(wxHint);
                        // Update hint on toggle
                        scb.addEventListener('change',()=>{wxHint.style.display=wxOn()?'':'none'});
                    }
                }
                togglesDiv.appendChild(subWrap);
                if(panels[id]===false){
                    subWrap.classList.add('sp-mgr-sub-disabled');
                    subWrap.querySelectorAll('input').forEach(i=>{i.disabled=true});
                }
            }
        }
        builtinWrap.appendChild(builtinHeader);builtinWrap.appendChild(togglesDiv);
        // Enable/Disable All buttons + performance warning
        const enableAllRow=document.createElement('div');enableAllRow.className='sp-mgr-enable-all';
        const btnRow=document.createElement('div');btnRow.className='sp-mgr-btn-row';
        const enableAllBtn=document.createElement('button');enableAllBtn.className='sp-mgr-enable-btn sp-mgr-btn-enable';enableAllBtn.textContent='Enable All';
        const disableAllBtn=document.createElement('button');disableAllBtn.className='sp-mgr-enable-btn sp-mgr-btn-disable';disableAllBtn.textContent='Disable All';
        // State check helpers
        function checkAllState(){
            const p=s.panels||DEFAULTS.panels;const dc=s.dashCards||DEFAULTS.dashCards;const ft=s.fieldToggles||{};
            let allOn=true,allOff=true;
            for(const pid of Object.keys(BUILTIN_PANELS)){if(p[pid]===false)allOn=false;else allOff=false}
            for(const k of Object.keys(DEFAULTS.dashCards)){if(dc[k]===false)allOn=false;else allOff=false}
            for(const[,def] of Object.entries(BUILTIN_PANELS)){
                for(const f of def.fields)if(!f.noToggle){if(ft[f.key]===false)allOn=false;else allOff=false}
                for(const sf of(def.subFields||[])){if(ft[sf.key]===false)allOn=false;else allOff=false}
            }
            enableAllBtn.disabled=allOn;enableAllBtn.classList.toggle('sp-mgr-btn-dimmed',allOn);
            disableAllBtn.disabled=allOff;disableAllBtn.classList.toggle('sp-mgr-btn-dimmed',allOff);
        }
        enableAllBtn.addEventListener('click',()=>{
            if(!s.panels)s.panels={...DEFAULTS.panels};
            for(const pid of Object.keys(BUILTIN_PANELS))s.panels[pid]=true;
            if(!s.fieldToggles)s.fieldToggles={};
            for(const[,def] of Object.entries(BUILTIN_PANELS)){
                for(const f of def.fields)if(!f.noToggle)s.fieldToggles[f.key]=true;
                for(const sf of(def.subFields||[]))s.fieldToggles[sf.key]=true;
            }
            if(!s.dashCards)s.dashCards={...DEFAULTS.dashCards};
            for(const k of Object.keys(DEFAULTS.dashCards))s.dashCards[k]=true;
            s.showThoughts=true;
            saveSettings();
            togglesDiv.querySelectorAll('input[data-panel]').forEach(cb=>{cb.checked=true});
            togglesDiv.querySelectorAll('.sp-mgr-sub-toggle input').forEach(cb=>{cb.checked=true;cb.disabled=false});
            togglesDiv.querySelectorAll('.sp-mgr-sub-toggles').forEach(sw=>{sw.classList.remove('sp-mgr-sub-disabled')});
            body.querySelectorAll('.sp-panel-hidden').forEach(el=>el.classList.remove('sp-panel-hidden'));
            body.querySelectorAll('[data-ft]').forEach(el=>{el.style.display=''});
            body.querySelectorAll('[data-card]').forEach(el=>{el.style.display=''});
            for(const bid of['sp-tb-weather','sp-tb-timeTint','sp-tb-thoughts']){
                const b=document.getElementById(bid);if(b){b.style.opacity='';b.style.pointerEvents='';b.classList.add('sp-tb-active')}
            }
            s.weatherOverlay=true;s.timeTint=true;
            const snap=getLatestSnapshot();
            if(snap){const n=normalizeTracker(snap);updateWeatherOverlay(n.weather);updateTimeTint(n.time);updateThoughts(n);const tp=document.getElementById('sp-thought-panel');if(tp)tp.classList.add('sp-tp-visible')}
            builtinHeader.querySelector('.sp-mgr-collapse-count').textContent=Object.keys(BUILTIN_PANELS).length+'/'+Object.keys(BUILTIN_PANELS).length;
            const schemaEl=document.getElementById('sp-schema');
            if(schemaEl&&!s.schema)schemaEl.value=JSON.stringify(buildDynamicSchema(s),null,2);
            checkAllState();
            toastr.info('All panels and fields enabled','ScenePulse');
            log('Enable All: all panels + fields activated');
        });
        disableAllBtn.addEventListener('click',()=>{
            if(!s.panels)s.panels={...DEFAULTS.panels};
            for(const pid of Object.keys(BUILTIN_PANELS))s.panels[pid]=false;
            if(!s.fieldToggles)s.fieldToggles={};
            for(const[,def] of Object.entries(BUILTIN_PANELS)){
                for(const f of def.fields)if(!f.noToggle)s.fieldToggles[f.key]=false;
                for(const sf of(def.subFields||[]))s.fieldToggles[sf.key]=false;
            }
            if(!s.dashCards)s.dashCards={...DEFAULTS.dashCards};
            for(const k of Object.keys(DEFAULTS.dashCards))s.dashCards[k]=false;
            s.showThoughts=false;s.weatherOverlay=false;s.timeTint=false;
            saveSettings();
            togglesDiv.querySelectorAll('input[data-panel]').forEach(cb=>{cb.checked=false});
            togglesDiv.querySelectorAll('.sp-mgr-sub-toggle input').forEach(cb=>{cb.checked=false;cb.disabled=true});
            togglesDiv.querySelectorAll('.sp-mgr-sub-toggles').forEach(sw=>{sw.classList.add('sp-mgr-sub-disabled')});
            // Hide all panel sections
            const sectionMap={dashboard:'.sp-env-permanent',scene:'[data-key="scene"]',quests:'[data-key="quests"]',relationships:'[data-key="relationships"]',characters:'[data-key="characters"]',storyIdeas:'[data-key="branches"]'};
            for(const sel of Object.values(sectionMap)){const el=body.querySelector(sel);if(el)el.classList.add('sp-panel-hidden')}
            body.querySelectorAll('[data-ft]').forEach(el=>{el.style.display='none'});
            body.querySelectorAll('[data-card]').forEach(el=>{el.style.display='none'});
            // Disable overlays + toolbar buttons
            clearWeatherOverlay();clearTimeTint();
            const tp=document.getElementById('sp-thought-panel');if(tp)tp.classList.remove('sp-tp-visible');
            for(const bid of['sp-tb-weather','sp-tb-timeTint','sp-tb-thoughts']){
                const b=document.getElementById(bid);if(b){b.style.opacity='0.25';b.style.pointerEvents='none';b.classList.remove('sp-tb-active')}
            }
            builtinHeader.querySelector('.sp-mgr-collapse-count').textContent='0/'+Object.keys(BUILTIN_PANELS).length;
            const schemaEl=document.getElementById('sp-schema');
            if(schemaEl&&!s.schema)schemaEl.value=JSON.stringify(buildDynamicSchema(s),null,2);
            checkAllState();
            toastr.info('All panels disabled','ScenePulse');
            log('Disable All: all panels + fields deactivated');
        });
        btnRow.appendChild(enableAllBtn);btnRow.appendChild(disableAllBtn);
        enableAllRow.appendChild(btnRow);
        const enableWarn=document.createElement('div');enableWarn.className='sp-mgr-perf-warn';
        enableWarn.textContent='\u26a0 All panels enabled will add ~1,500\u20132,500 tokens to every generation. Expect up to 3 minutes per response depending on your model and provider.';
        enableAllRow.appendChild(enableWarn);
        builtinWrap.appendChild(enableAllRow);
        // Wire every toggle to refresh button state
        togglesDiv.addEventListener('change',()=>setTimeout(checkAllState,10));
        checkAllState();
        mgr.appendChild(builtinWrap);
        // Custom panels section
        const cpHeader=document.createElement('div');cpHeader.className='sp-mgr-subheader';cpHeader.textContent='Custom Panels';
        mgr.appendChild(cpHeader);
        const cpList=document.createElement('div');cpList.id='sp-panel-mgr-custom';
        mgr.appendChild(cpList);
        renderCustomPanelsMgr(s,cpList,body);
        const addBtn=document.createElement('button');addBtn.className='sp-btn sp-mgr-add-panel';addBtn.textContent='+ Add Custom Panel';
        addBtn.addEventListener('click',()=>{
            if(!s.customPanels)s.customPanels=[];
            const newPanel={name:'',fields:[{key:'',label:'',type:'text',desc:''}]};
            s.customPanels.push(newPanel);
            saveSettings();renderCustomPanelsMgr(s,cpList,body);
            // Insert just the new section — no full rebuild
            const d=_cachedNormData||{};
            const cpKey='custom_'+(newPanel.name||'untitled').replace(/\s+/g,'_').toLowerCase();
            const newSec=mkSection(cpKey,newPanel.name||'Untitled',null,()=>{
                const frag=document.createDocumentFragment();
                for(const f of newPanel.fields){
                    const r=document.createElement('div');r.className='sp-row';
                    r.innerHTML=`<div class="sp-row-label">${esc(f.label||f.key)}</div>`;
                    const val=document.createElement('div');val.className='sp-row-value';val.textContent=str(d[f.key])||'\u2014';
                    r.appendChild(val);frag.appendChild(r);
                }
                return frag;
            },s);
            // Insert before timeline or at end of body
            const tl=document.getElementById('sp-timeline');
            if(tl)body.insertBefore(newSec,tl);
            else{const footer=body.querySelector('.sp-gen-footer');if(footer)body.insertBefore(newSec,footer);else body.appendChild(newSec)}
            newSec.classList.add('sp-panel-hidden');
            requestAnimationFrame(()=>newSec.classList.remove('sp-panel-hidden'));
            toastr.success('Panel created');
        });
        mgr.appendChild(addBtn);
        body.insertBefore(mgr,body.firstChild);
        // Sync toolbar buttons with current dashCard/thoughts state
        const _dc=s.dashCards||DEFAULTS.dashCards;
        const wxBtn=document.getElementById('sp-tb-weather');
        if(wxBtn&&_dc.weather===false){wxBtn.style.opacity='0.25';wxBtn.style.pointerEvents='none'}
        const ttBtn=document.getElementById('sp-tb-timeTint');
        if(ttBtn&&_dc.time===false){ttBtn.style.opacity='0.25';ttBtn.style.pointerEvents='none'}
        const thBtn=document.getElementById('sp-tb-thoughts');
        const _ft=s.fieldToggles||{};
        if(thBtn&&(_ft.char_thoughts===false||s.showThoughts===false)){thBtn.style.opacity='0.25';thBtn.style.pointerEvents='none'}
        // Trigger open transition: start from closing state, remove in next frame
        requestAnimationFrame(()=>requestAnimationFrame(()=>mgr.classList.remove('sp-mgr-closing')));
    });
    // Weather overlay toggle
    document.getElementById('sp-tb-weather').addEventListener('click',()=>{
        const s=getSettings();s.weatherOverlay=s.weatherOverlay===false?true:false;saveSettings();
        const btn=document.getElementById('sp-tb-weather');
        btn.classList.toggle('sp-tb-active',s.weatherOverlay!==false);
        if(s.weatherOverlay===false){clearWeatherOverlay()}
        else{const snap=getLatestSnapshot();if(snap){const n=normalizeTracker(snap);updateWeatherOverlay(n.weather)}}
        const cb=document.getElementById('sp-show-weather');if(cb)cb.checked=s.weatherOverlay!==false;
    });
    // Time-of-day tint toggle
    document.getElementById('sp-tb-timeTint').addEventListener('click',()=>{
        const s=getSettings();s.timeTint=s.timeTint===false?true:false;saveSettings();
        const btn=document.getElementById('sp-tb-timeTint');
        btn.classList.toggle('sp-tb-active',s.timeTint!==false);
        if(s.timeTint===false){clearTimeTint()}
        else{const snap=getLatestSnapshot();if(snap){const n=normalizeTracker(snap);updateTimeTint(n.time)}}
        const cb=document.getElementById('sp-show-timetint');if(cb)cb.checked=s.timeTint!==false;
    });
    // Scene transition popup toggle
    {const _stBtn=document.getElementById('sp-tb-sceneTrans');
    const _stInit=getSettings();_stBtn.classList.toggle('sp-tb-active',_stInit.sceneTransitions!==false);
    _stBtn.addEventListener('click',()=>{
        const s=getSettings();s.sceneTransitions=s.sceneTransitions===false?true:false;saveSettings();
        _stBtn.classList.toggle('sp-tb-active',s.sceneTransitions!==false);
    });}

    // ── DEV: Weather overlay dropdown ──
    const _devWxTypes=[
        {id:'rain',label:'Rain'},{id:'snow',label:'Snow'},{id:'hail',label:'Hail'},
        {id:'storm',label:'Storm'},{id:'fog',label:'Fog / Mist'},{id:'sandstorm',label:'Sandstorm'},
        {id:'ash',label:'Ash / Volcanic'},{id:'wind',label:'Wind'},{id:'aurora',label:'Aurora'},
        {id:'off',label:'⏹ Clear overlay'}
    ];
    const _devWxMenu=document.getElementById('sp-dev-wx-menu');
    _devWxTypes.forEach(t=>{
        const item=document.createElement('div');item.className='sp-dev-dropdown-item';item.dataset.id=t.id;item.textContent=t.label;
        item.addEventListener('click',()=>{
            if(t.id==='off'){currentWeatherType='';clearWeatherOverlay();log('[DEV] Weather cleared');_devWxMenu.classList.remove('sp-dev-open');_devWxMenu.querySelectorAll('.sp-dev-dropdown-item').forEach(i=>i.classList.remove('sp-dev-active'));item.classList.add('sp-dev-active');return}
            const s=getSettings();s.weatherOverlay=true;saveSettings();
            const btn=document.getElementById('sp-tb-weather');if(btn)btn.classList.add('sp-tb-active');
            currentWeatherType='';
            const fakeWx={rain:'rain',snow:'snow',hail:'hail storm',storm:'thunderstorm',fog:'fog',sandstorm:'sandstorm',ash:'volcanic ash',wind:'wind',aurora:'aurora'}[t.id]||t.id;
            updateWeatherOverlay(fakeWx);
            _devWxMenu.querySelectorAll('.sp-dev-dropdown-item').forEach(i=>i.classList.remove('sp-dev-active'));item.classList.add('sp-dev-active');
            log('[DEV] Weather →',t.id);
        });
        _devWxMenu.appendChild(item);
    });
    document.getElementById('sp-tb-dev-wx').addEventListener('click',e=>{
        e.stopPropagation();
        document.getElementById('sp-dev-time-menu').classList.remove('sp-dev-open');
        _devWxMenu.classList.toggle('sp-dev-open');
    });

    // ── DEV: Time-of-day dropdown ──
    const _devTimePeriods=[
        {id:'dawn',label:'Dawn (5–7 AM)',time:'5:30'},{id:'morning',label:'Morning (7–11 AM)',time:'9:00'},
        {id:'day',label:'Day (11 AM–2 PM)',time:'12:00'},{id:'afternoon',label:'Afternoon (2–5 PM)',time:'15:00'},
        {id:'dusk',label:'Dusk (5–8 PM)',time:'18:30'},{id:'evening',label:'Evening (8–10 PM)',time:'21:00'},
        {id:'night',label:'Night (10 PM–5 AM)',time:'23:00'},{id:'off',label:'⏹ Clear tint'}
    ];
    const _devTimeMenu=document.getElementById('sp-dev-time-menu');
    _devTimePeriods.forEach(t=>{
        const item=document.createElement('div');item.className='sp-dev-dropdown-item';item.dataset.id=t.id;item.textContent=t.label;
        item.addEventListener('click',()=>{
            if(t.id==='off'){currentTimePeriod='';clearTimeTint();log('[DEV] Time tint cleared');_devTimeMenu.classList.remove('sp-dev-open');_devTimeMenu.querySelectorAll('.sp-dev-dropdown-item').forEach(i=>i.classList.remove('sp-dev-active'));item.classList.add('sp-dev-active');return}
            const s=getSettings();s.timeTint=true;saveSettings();
            const btn=document.getElementById('sp-tb-timeTint');if(btn)btn.classList.add('sp-tb-active');
            currentTimePeriod='';
            updateTimeTint(t.time);
            _devTimeMenu.querySelectorAll('.sp-dev-dropdown-item').forEach(i=>i.classList.remove('sp-dev-active'));item.classList.add('sp-dev-active');
            log('[DEV] Time tint →',t.id);
        });
        _devTimeMenu.appendChild(item);
    });
    document.getElementById('sp-tb-dev-time').addEventListener('click',e=>{
        e.stopPropagation();
        _devWxMenu.classList.remove('sp-dev-open');
        _devTimeMenu.classList.toggle('sp-dev-open');
    });

    // Close dropdowns on outside click
    document.addEventListener('click',()=>{_devWxMenu.classList.remove('sp-dev-open');_devTimeMenu.classList.remove('sp-dev-open')});
    _devWxMenu.addEventListener('click',e=>e.stopPropagation());
    _devTimeMenu.addEventListener('click',e=>e.stopPropagation());

    const snap=getLatestSnapshot();
    if(snap){updatePanel(normalizeTracker(snap));showPanel()}
    // Initialize toolbar button states
    const s=getSettings();
    const tbThoughts=document.getElementById('sp-tb-thoughts');
    if(tbThoughts)tbThoughts.classList.toggle('sp-tb-active',s.showThoughts!==false);
    const tbWeather=document.getElementById('sp-tb-weather');
    if(tbWeather)tbWeather.classList.toggle('sp-tb-active',s.weatherOverlay!==false);
    const tbTimeTint=document.getElementById('sp-tb-timeTint');
    if(tbTimeTint)tbTimeTint.classList.toggle('sp-tb-active',s.timeTint!==false);
    // Dev buttons visibility
    const devVis=s.devButtons?'':'none';
    const dw=document.getElementById('sp-dev-wx-wrap');if(dw)dw.style.display=devVis;
    const dt=document.getElementById('sp-dev-time-wrap');if(dt)dt.style.display=devVis;
}

// ── Weather Overlay System ──
let currentWeatherType='';
function updateWeatherOverlay(weatherStr){
    const s=getSettings();
    if(s.weatherOverlay===false)return;
    const mode=spDetectMode();if(mode==='mobile'||mode==='tablet'){clearWeatherOverlay();return}
    const wxLow=(weatherStr||'').toLowerCase();
    // Determine weather types — multiple can be active simultaneously
    let wxTypes=[];
    if(wxLow.includes('snow')||wxLow.includes('blizzard')||wxLow.includes('sleet')||wxLow.includes('ice')||wxLow.includes('frost'))wxTypes.push('snow');
    if(wxLow.includes('hail')||wxLow.includes('ice storm')||wxLow.includes('ice pellet'))wxTypes.push('hail');
    if(wxLow.includes('sand')||wxLow.includes('dust'))wxTypes.push('sandstorm');
    if(wxLow.includes('ash')||wxLow.includes('volcanic')||wxLow.includes('eruption')||wxLow.includes('cinder')||wxLow.includes('soot'))wxTypes.push('ash');
    if(wxLow.includes('thunder')||wxLow.includes('lightning'))wxTypes.push('storm');
    else if(wxLow.includes('storm')&&!wxLow.includes('sand')&&!wxLow.includes('ice storm'))wxTypes.push('storm');
    if(wxLow.includes('rain')||wxLow.includes('drizzle')||wxLow.includes('shower')||wxLow.includes('downpour'))wxTypes.push('rain');
    if(wxLow.includes('fog')||wxLow.includes('mist')||wxLow.includes('haze'))wxTypes.push('fog');
    if(wxLow.includes('wind')||wxLow.includes('breez')||wxLow.includes('gust'))wxTypes.push('wind');
    if(wxLow.includes('aurora')||wxLow.includes('northern light'))wxTypes.push('aurora');
    // Primary type for SVG icon selection
    const wxType=wxTypes.length?wxTypes[0]:'clear';
    const wxKey=wxTypes.sort().join('+');
    // Skip rebuild if same combination
    if(wxKey===currentWeatherType)return;
    currentWeatherType=wxKey;
    // Get or create overlay
    let ov=document.getElementById('sp-weather-overlay');
    if(!ov){
        ov=document.createElement('div');ov.id='sp-weather-overlay';
        // Insert at start of body so it's behind everything
        document.body.insertBefore(ov,document.body.firstChild);
    }
    ov.innerHTML='';ov.className='sp-wx-ov '+wxTypes.map(t=>'sp-wx-ov-'+t).join(' ');
    // Build particles based on type
    const frag=document.createDocumentFragment();
    const rnd=(min,max)=>Math.random()*(max-min)+min;
    const mkDiv=(cls,styles)=>{const d=document.createElement('div');d.className=cls;Object.assign(d.style,styles);return d};

    // Generate particles for ALL active weather types
    for(const _wt of wxTypes){
    if(_wt==='rain'){
        // Dense rain with varied thickness + mist layer
        for(let i=0;i<90;i++){
            const heavy=i<20;
            const d=mkDiv(heavy?'sp-wx-drop sp-wx-drop-heavy':'sp-wx-drop',{
                left:rnd(0,100)+'%',
                animationDuration:rnd(heavy?0.3:0.4, heavy?0.6:0.9)+'s',
                animationDelay:rnd(0,3)+'s',
                opacity:String(rnd(heavy?0.25:0.1, heavy?0.55:0.4)),
                height:rnd(heavy?18:10, heavy?35:26)+'px',
                '--wx-drift':rnd(-8,8)+'px'
            });
            frag.appendChild(d);
        }
        // Ground mist from splashes
        for(let i=0;i<4;i++){
            const d=mkDiv('sp-wx-rain-mist',{
                left:rnd(-10,80)+'%',
                animationDuration:rnd(12,20)+'s',
                animationDelay:rnd(0,8)+'s',
                opacity:String(rnd(0.03,0.08))
            });
            frag.appendChild(d);
        }
    } else if(_wt==='snow'){
        // Dense snowfall with varied sizes + ground glow
        for(let i=0;i<80;i++){
            const sz=rnd(1.5,7);
            const bright=sz>4.5;
            const d=mkDiv('sp-wx-flake'+(bright?' sp-wx-flake-bright':''),{
                left:rnd(0,100)+'%',
                width:sz+'px',height:sz+'px',
                animationDuration:rnd(4,16)+'s',
                animationDelay:rnd(0,10)+'s',
                opacity:String(rnd(0.15,bright?0.85:0.6)),
                '--wx-drift':rnd(-100,100)+'px',
                '--wx-drift2':rnd(-60,60)+'px'
            });
            frag.appendChild(d);
        }
        // Ground snow glow
        const glow=mkDiv('sp-wx-snow-glow',{});frag.appendChild(glow);
    } else if(_wt==='hail'){
        // Rain + bouncing ice chunks
        for(let i=0;i<50;i++){
            const d=mkDiv('sp-wx-drop',{
                left:rnd(0,100)+'%',
                animationDuration:rnd(0.35,0.7)+'s',
                animationDelay:rnd(0,2)+'s',
                opacity:String(rnd(0.12,0.35)),
                height:rnd(10,22)+'px',
                '--wx-drift':rnd(-6,6)+'px'
            });
            frag.appendChild(d);
        }
        for(let i=0;i<30;i++){
            const sz=rnd(5,11);
            const d=mkDiv('sp-wx-hail',{
                left:rnd(0,100)+'%',
                width:sz+'px',height:sz+'px',
                animationDuration:rnd(0.5,0.9)+'s',
                animationDelay:rnd(0,3)+'s',
                opacity:String(rnd(0.45,0.85))
            });
            frag.appendChild(d);
        }
    } else if(_wt==='storm'){
        // Very heavy rain + wind-driven angle
        for(let i=0;i<100;i++){
            const d=mkDiv('sp-wx-drop sp-wx-drop-heavy',{
                left:rnd(-5,105)+'%',
                animationDuration:rnd(0.2,0.55)+'s',
                animationDelay:rnd(0,2)+'s',
                opacity:String(rnd(0.2,0.55)),
                height:rnd(18,40)+'px',
                '--wx-drift':rnd(-15,15)+'px'
            });
            frag.appendChild(d);
        }
        // Lightning flash layers — more frequent
        for(let i=0;i<5;i++){
            const d=mkDiv('sp-wx-lightning',{
                animationDelay:rnd(1,6)+'s',
                animationDuration:rnd(4,9)+'s'
            });
            frag.appendChild(d);
        }
        // Wind streaks during storm
        for(let i=0;i<15;i++){
            const d=mkDiv('sp-wx-wind-streak',{
                top:rnd(0,100)+'%',
                animationDuration:rnd(0.4,1.2)+'s',
                animationDelay:rnd(0,3)+'s',
                opacity:String(rnd(0.06,0.14)),
                width:rnd(60,160)+'px'
            });
            frag.appendChild(d);
        }
        // Dark rumble overlay
        const rumble=mkDiv('sp-wx-rumble',{});frag.appendChild(rumble);
    } else if(_wt==='fog'){
        // Dense multi-layer fog
        for(let i=0;i<10;i++){
            const d=mkDiv('sp-wx-fog-layer',{
                top:rnd(0,90)+'%',
                animationDuration:rnd(15,35)+'s',
                animationDelay:rnd(0,12)+'s',
                opacity:String(rnd(0.06,0.2)),
                height:rnd(18,40)+'%'
            });
            frag.appendChild(d);
        }
        // Ground fog — thick at bottom
        for(let i=0;i<3;i++){
            const d=mkDiv('sp-wx-fog-ground',{
                animationDuration:rnd(25,45)+'s',
                animationDelay:rnd(0,10)+'s',
                opacity:String(rnd(0.08,0.18))
            });
            frag.appendChild(d);
        }
        // Ambient haze tint
        const haze=mkDiv('sp-wx-fog-haze',{});frag.appendChild(haze);
    } else if(_wt==='sandstorm'){
        // Sweeping dust cloud bands
        for(let i=0;i<8;i++){
            const d=mkDiv('sp-wx-dust-cloud',{
                top:rnd(0,80)+'%',
                animationDuration:rnd(10,25)+'s',
                animationDelay:rnd(0,10)+'s',
                opacity:String(rnd(0.08,0.2)),
                height:rnd(15,35)+'%'
            });
            frag.appendChild(d);
        }
        // Flying sand grains — angled flight
        for(let i=0;i<80;i++){
            const sz=rnd(1,4);
            const d=mkDiv('sp-wx-dust-particle',{
                top:rnd(0,100)+'%',
                width:sz+'px',height:sz+'px',
                animationDuration:rnd(0.6,2)+'s',
                animationDelay:rnd(0,6)+'s',
                opacity:String(rnd(0.15,0.5)),
                '--wx-sand-drift':rnd(-50,50)+'px'
            });
            frag.appendChild(d);
        }
        // Warm haze overlay
        const haze=mkDiv('sp-wx-sand-haze',{});frag.appendChild(haze);
    } else if(_wt==='wind'){
        // Dense streaks at varied angles
        for(let i=0;i<55;i++){
            const d=mkDiv('sp-wx-wind-streak',{
                top:rnd(0,100)+'%',
                animationDuration:rnd(0.4,1.6)+'s',
                animationDelay:rnd(0,5)+'s',
                opacity:String(rnd(0.06,0.22)),
                width:rnd(50,180)+'px'
            });
            frag.appendChild(d);
        }
        // Dust motes
        for(let i=0;i<25;i++){
            const sz=rnd(1,3);
            const d=mkDiv('sp-wx-wind-dust',{
                top:rnd(0,100)+'%',
                width:sz+'px',height:sz+'px',
                animationDuration:rnd(1,3)+'s',
                animationDelay:rnd(0,4)+'s',
                opacity:String(rnd(0.1,0.35))
            });
            frag.appendChild(d);
        }
        // Ambient sway
        const sway=mkDiv('sp-wx-wind-sway',{});frag.appendChild(sway);
    } else if(_wt==='aurora'){
        // Bright vivid ribbons
        for(let i=0;i<10;i++){
            const hue=rnd(100,300);
            const d=mkDiv('sp-wx-aurora-ribbon',{
                top:rnd(0,35)+'%',
                animationDuration:rnd(6,14)+'s',
                animationDelay:rnd(0,8)+'s',
                '--wx-hue1':hue,
                '--wx-hue2':hue+rnd(40,100),
                opacity:String(rnd(0.12,0.3)),
                height:rnd(10,25)+'%'
            });
            frag.appendChild(d);
        }
        // Shimmer curtain
        const curtain=mkDiv('sp-wx-aurora-curtain',{});frag.appendChild(curtain);
        // Stars
        for(let i=0;i<35;i++){
            const d=mkDiv('sp-wx-star',{
                left:rnd(0,100)+'%',top:rnd(0,60)+'%',
                animationDuration:rnd(1.5,4)+'s',
                animationDelay:rnd(0,5)+'s',
                width:rnd(1,3)+'px',height:rnd(1,3)+'px'
            });
            frag.appendChild(d);
        }
        // Ground glow
        const aglow=mkDiv('sp-wx-aurora-glow',{});frag.appendChild(aglow);
    } else if(_wt==='ash'){
        // Falling ash flakes — gray, drifting
        for(let i=0;i<95;i++){
            const sz=rnd(2,7);
            const d=mkDiv('sp-wx-ash-flake',{
                left:rnd(0,100)+'%',
                width:sz+'px',height:sz+'px',
                animationDuration:rnd(3,10)+'s',
                animationDelay:rnd(0,8)+'s',
                opacity:String(rnd(0.2,0.65)),
                '--wx-drift':rnd(-70,70)+'px',
                '--wx-drift2':rnd(-35,35)+'px'
            });
            frag.appendChild(d);
        }
        // Ember particles — orange glow rising from bottom
        for(let i=0;i<25;i++){
            const sz=rnd(1.5,4);
            const d=mkDiv('sp-wx-ember',{
                left:rnd(0,100)+'%',
                width:sz+'px',height:sz+'px',
                animationDuration:rnd(3,7)+'s',
                animationDelay:rnd(0,6)+'s',
                opacity:String(rnd(0.35,0.8))
            });
            frag.appendChild(d);
        }
        // Smoky haze
        const smoke=mkDiv('sp-wx-ash-haze',{});frag.appendChild(smoke);
    }
    } // end for(wxTypes)
    ov.appendChild(frag);
    log('Weather overlay:',wxKey,'types:',wxTypes.length,'particles:',ov.children.length);
}
function clearWeatherOverlay(){
    const ov=document.getElementById('sp-weather-overlay');
    if(ov){ov.remove();currentWeatherType=''}
}

// ── Time-of-Day Ambient Tint ──
let currentTimePeriod='';
function updateTimeTint(timeStr){
    const s=getSettings();
    if(s.timeTint===false)return;
    const mode=spDetectMode();if(mode==='mobile'||mode==='tablet'){clearTimeTint();return}
    const h=parseInt((timeStr||'').match(/(\d+):/)?.[1]||'12');
    let period='day';
    if(h>=5&&h<7)period='dawn';
    else if(h>=7&&h<11)period='morning';
    else if(h>=11&&h<14)period='day';
    else if(h>=14&&h<17)period='afternoon';
    else if(h>=17&&h<20)period='dusk';
    else if(h>=20&&h<22)period='evening';
    else period='night';
    if(period===currentTimePeriod)return;
    currentTimePeriod=period;
    let ov=document.getElementById('sp-time-tint');
    if(!ov){ov=document.createElement('div');ov.id='sp-time-tint';document.body.insertBefore(ov,document.body.firstChild)}
    ov.className='sp-time-tint sp-time-'+period;
}
function clearTimeTint(){
    const ov=document.getElementById('sp-time-tint');if(ov)ov.remove();currentTimePeriod='';
}

// ── Scene Transition Animation ──
let prevLocation='',prevTimePeriod='',_isTimelineScrub=false;
function checkSceneTransition(d){
    const loc=d.location||'';const timeStr=d.time||'';
    const h=parseInt(timeStr.match(/(\d+):/)?.[1]||'-1');
    let period='';
    if(h>=5&&h<12)period='morning';else if(h>=12&&h<17)period='afternoon';else if(h>=17&&h<21)period='evening';else if(h>=0)period='night';
    // Determine if major location change (different first segment)
    const locFirst=loc.split('>')[0].trim().toLowerCase();
    const prevFirst=prevLocation.split('>')[0].trim().toLowerCase();
    const majorLocChange=prevLocation&&locFirst&&prevFirst&&locFirst!==prevFirst;
    // Determine if major time-of-day change
    const majorTimeChange=prevTimePeriod&&period&&prevTimePeriod!==period;
    prevLocation=loc;prevTimePeriod=period;
    if(!majorLocChange&&!majorTimeChange)return;
    // Check if scene transitions are enabled
    if(getSettings().sceneTransitions===false||_isTimelineScrub)return;
    // Build transition card
    const lines=[];
    if(majorLocChange){
        const parts=loc.split('>').map(s=>s.trim()).filter(Boolean).reverse();
        for(const p of parts)lines.push(p);
    }
    if(majorTimeChange){
        const labels={morning:'Morning',afternoon:'Afternoon',evening:'Evening',night:'Night'};
        lines.push(labels[period]||period);
    }
    if(!lines.length)return;
    let card=document.getElementById('sp-scene-transition');
    if(!card){card=document.createElement('div');card.id='sp-scene-transition';document.body.appendChild(card)}
    card.innerHTML=`<div class="sp-st-rule"></div>${lines.map(l=>`<span><b>${esc(l)}</b></span>`).join('<span class="sp-st-sep">\u203A</span>')}<div class="sp-st-rule"></div>`;
    card.classList.remove('sp-st-show');
    void card.offsetWidth; // force reflow
    card.classList.add('sp-st-show');
    setTimeout(()=>card.classList.remove('sp-st-show'),4500);
    log('Scene transition:',lines.join(' — '));
}

// ── Timeline Scrubber ──
function renderTimeline(){
    const _tlStart=performance.now();
    const body=document.getElementById('sp-panel-body');if(!body)return;
    let tl=document.getElementById('sp-timeline');
    if(tl)tl.remove();
    const all=getTrackerData();const sorted=Object.keys(all.snapshots).map(Number).sort((a,b)=>a-b);
    if(sorted.length<2)return;
    const latest=sorted[sorted.length-1];
    let selectedKey=currentSnapshotMesIdx>=0?currentSnapshotMesIdx:latest;
    // Cap displayed nodes — always include first + last, sample middle evenly
    const MAX_DISPLAY=8;
    let displayKeys=sorted;
    if(sorted.length>MAX_DISPLAY){
        displayKeys=[sorted[0]];
        const middle=sorted.slice(1,-1);
        const step=middle.length/(MAX_DISPLAY-2);
        for(let i=0;i<MAX_DISPLAY-2;i++){
            displayKeys.push(middle[Math.min(Math.round(i*step),middle.length-1)]);
        }
        displayKeys.push(sorted[sorted.length-1]);
        // Deduplicate and sort
        displayKeys=[...new Set(displayKeys)].sort((a,b)=>a-b);
    }
    // Ensure selectedKey is in displayKeys
    if(selectedKey>=0&&!displayKeys.includes(selectedKey)){
        // Replace the nearest sampled node with the selected one
        let nearest=0,minDist=Infinity;
        for(let i=1;i<displayKeys.length-1;i++){
            const d=Math.abs(displayKeys[i]-selectedKey);
            if(d<minDist){minDist=d;nearest=i}
        }
        if(nearest>0)displayKeys[nearest]=selectedKey;
        displayKeys.sort((a,b)=>a-b);
    }
    tl=document.createElement('div');tl.id='sp-timeline';tl.className='sp-timeline';
    const bar=document.createElement('div');bar.className='sp-tl-bar';
    for(let i=0;i<displayKeys.length;i++){
        const k=displayKeys[i];
        const pct=displayKeys.length>1?8+((i/(displayKeys.length-1))*84):50;
        const wrap=document.createElement('div');wrap.className='sp-tl-node';
        wrap.style.left=pct+'%';
        const isSelected=k===selectedKey;
        const isLatest=k===latest;
        const dot=document.createElement('div');
        dot.className='sp-tl-dot'+(isLatest?' sp-tl-dot-latest':'')+(isSelected?' sp-tl-dot-selected':'');
        dot.style.position='relative';
        // Ring INSIDE dot — inset centers it perfectly regardless of dot size
        if(isSelected){
            const ring=document.createElement('div');ring.className='sp-tl-ring';
            dot.appendChild(ring);
        }
        wrap.appendChild(dot);
        // Extract snapshot data
        const snap=all.snapshots[String(k)];
        let dateLabel='',tooltipParts=[];
        tooltipParts.push('Msg #'+k);
        if(snap){
            // Lightweight extraction — skip full normalizeTracker for performance
            const _loc=snap.location||snap.Location||'';
            if(_loc)tooltipParts.push(_loc.split('>')[0].trim());
            const rawDate=snap.date||snap.Date||'';
            const rawTime=snap.time||snap.Time||'';
            // Attempt standard date parse (MM/DD/YYYY, DD/MM/YYYY, etc)
            const mo=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const dm=rawDate.match(/(\d{1,2})\D+(\d{1,2})/);
            const tm=rawTime.match(/(\d{1,2}):(\d{2})/);
            // Year: match any number ≥2 digits that could be a year (handles 2024, 3247, 42, etc)
            const ym=rawDate.match(/\b(\d{2,})\b/g);
            // Pick the longest number as year (avoid picking day/month)
            let year='';
            if(ym){
                const candidates=ym.filter(n=>n.length>=4||parseInt(n)>31);
                if(candidates.length)year=candidates[candidates.length-1];
            }
            let datePart='';
            if(dm){
                const mIdx=parseInt(dm[1])-1;
                const monthStr=(mIdx>=0&&mIdx<12)?mo[mIdx]:dm[1];
                datePart=monthStr+' '+dm[2];
                tooltipParts.push(datePart+(year?', '+year:''));
            } else if(rawDate.trim()){
                // Sci-fi / fictional date — use raw text, trimmed
                datePart=rawDate.trim().substring(0,30);
                tooltipParts.push(datePart);
            }
            let timePart='';
            if(tm){
                const h=parseInt(tm[1]);const m=tm[2];
                timePart=String(h).padStart(2,'0')+':'+m;
                tooltipParts.push((h%12||12)+':'+m+' '+(h>=12?'PM':'AM'));
            }
            // Label format: "Dec 18, 2024 · 23:48"
            if(datePart||timePart){
                const lp=[];
                if(datePart)lp.push(datePart+(year?', '+year:''));
                if(timePart)lp.push(timePart);
                dateLabel=lp.join(' · ');
            }
            if(!dateLabel)dateLabel='#'+k;
        } else {
            dateLabel='#'+k;
        }
        dot.title=tooltipParts.join(' · ');
        const lbl=document.createElement('div');lbl.className='sp-tl-label'+(isSelected?' sp-tl-label-active':'');
        lbl.textContent='#'+k;
        wrap.appendChild(lbl);
        let _tlDebounce=null;
        wrap.addEventListener('click',()=>{
            const snap=all.snapshots[String(k)];if(!snap)return;
            _isTimelineScrub=true;
            if(_tlDebounce)clearTimeout(_tlDebounce);
            currentSnapshotMesIdx=k;
            // Visually update selected node without full timeline rebuild
            tl.querySelectorAll('.sp-tl-dot').forEach(d=>{d.classList.remove('sp-tl-dot-selected');d.querySelector('.sp-tl-ring')?.remove()});
            const myDot=wrap.querySelector('.sp-tl-dot');
            if(myDot){myDot.classList.add('sp-tl-dot-selected');const ring=document.createElement('div');ring.className='sp-tl-ring';myDot.appendChild(ring)}
            const norm=normalizeTracker(snap);
            updatePanel(norm);
            if(!document.getElementById('sp-panel')?.classList.contains('sp-visible'))showPanel();
            _tlDebounce=setTimeout(()=>{_isTimelineScrub=false;renderTimeline()},600);
        });
        bar.appendChild(wrap);
    }
    tl.appendChild(bar);
    if(selectedKey!==latest){
        const disc=document.createElement('div');disc.className='sp-tl-disclaimer';
        disc.innerHTML=`<span class="sp-tl-disc-icon">⚠</span> Viewing scene from an older message (msg #${selectedKey}) — not the current scene. <button class="sp-tl-disc-btn">Jump to latest</button>`;
        disc.querySelector('.sp-tl-disc-btn').addEventListener('click',()=>{
            const latestSnap=all.snapshots[String(latest)];if(!latestSnap)return;
            _isTimelineScrub=true;
            currentSnapshotMesIdx=latest;
            const _norm=normalizeTracker(latestSnap);
            updatePanel(_norm);
            if(!document.getElementById('sp-panel')?.classList.contains('sp-visible'))showPanel();
            setTimeout(()=>{_isTimelineScrub=false;renderTimeline()},400);
        });
        tl.appendChild(disc);
    }
    body.appendChild(tl);
    log('⏱ renderTimeline:',((performance.now()-_tlStart)|0)+'ms','nodes:',displayKeys.length);
}

// ── Story Idea Injection ──
function injectStoryIdea(idea,cat){
    if(!getSettings().enabled){log('injectStoryIdea: extension disabled');return}
    const typeLabel=(cat?.label||idea.type||'Story').toUpperCase();
    // Build the OOC direction message
    const direction=`[OOC: Take the story in a ${idea.type} direction — "${idea.name}". ${idea.hook}]`;
    log('Injecting story idea:',idea.type,idea.name);
    // Method 1: Use ST's textarea + send
    const textarea=document.getElementById('send_textarea');
    const sendBtn=document.getElementById('send_but');
    if(textarea&&sendBtn){
        // Save any existing user input
        const prevText=textarea.value;
        textarea.value=direction;
        // Trigger input event so ST recognizes the change
        textarea.dispatchEvent(new Event('input',{bubbles:true}));
        // Small delay then click send
        setTimeout(()=>{
            sendBtn.dispatchEvent(new Event('click',{bubbles:true}));
            // If click didn't work, try the form submit
            if(!sendBtn.click){const form=textarea.closest('form');if(form)form.dispatchEvent(new Event('submit',{bubbles:true}))}
            else sendBtn.click();
            log('Story idea sent via textarea');
            // Flash the card to confirm
            toastr?.success?.(`${cat?.label}: ${idea.name}`,'Story direction sent');
        },100);
    } else {
        // Fallback: try context API
        try{
            const ctx=SillyTavern.getContext();
            if(typeof ctx.sendMessage==='function'){
                ctx.sendMessage(direction);
                log('Story idea sent via context API');
                toastr?.success?.(`${cat?.label}: ${idea.name}`,'Story direction sent');
            } else {
                // Last resort: copy to clipboard
                navigator.clipboard.writeText(direction).then(()=>{
                    toastr?.info?.('Story idea copied — paste it in the chat input','Copied');
                });
            }
        }catch(e){warn('injectStoryIdea fallback:',e)}
    }
}

let _lastPanelUpdate=0;
let _cachedNormData=null;
function updatePanel(d,_force=false){
    // Debounce: skip if called within 150ms of last update (unless forced)
    const _now=performance.now();
    if(!_force&&_now-_lastPanelUpdate<150){return}
    _lastPanelUpdate=_now;
    const _perfStart=_now;
    _cachedNormData=d; // Cache for panel manager toggles
    // Restore generation metadata from persisted snapshot data
    if(d?._spMeta){
        const m=d._spMeta;
        if(m.completionTokens>0||m.elapsed>0)genMeta={promptTokens:m.promptTokens||0,completionTokens:m.completionTokens||0,elapsed:m.elapsed||0};
        if(m.source)lastGenSource=m.source;
    }
    log('updatePanel: chars=',d?.characters?.length||0,'rels=',d?.relationships?.length||0,
        'quests=',((d?.mainQuests?.length||0)+(d?.sideQuests?.length||0)+(d?.activeTasks?.length||0)),
        'scene=',d?.sceneTopic?'✓':'✗','time=',d?.time||'?');
    updateThoughts(d);
    const body=document.getElementById('sp-panel-body');
    if(!body)return;
    // Preserve panel manager during rebuild
    const mgrNode=document.getElementById('sp-panel-mgr');
    if(mgrNode)mgrNode.remove();
    body.innerHTML='';
    if(mgrNode)body.appendChild(mgrNode);
    const s=getSettings();
    const ft=s.fieldToggles||{};

    // Editable helper: makes an element click-to-edit when edit mode is on
    function mkEditable(el,getValue,setValue){
        el.classList.add('sp-editable');
        el.addEventListener('click',(e)=>{
            e.stopPropagation();
            const panel=document.getElementById('sp-panel');
            if(!panel?.classList.contains('sp-edit-mode'))return;
            if(el.contentEditable==='true')return;
            el.contentEditable='true';
            el.classList.add('sp-editing');
            el.focus();
            const range=document.createRange();range.selectNodeContents(el);
            const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);
        });
        function save(){
            if(el.contentEditable!=='true')return;
            el.contentEditable='false';
            el.classList.remove('sp-editing');
            const newVal=el.textContent.trim();
            if(newVal!==getValue()){
                setValue(newVal);
                const snap=getLatestSnapshot();
                if(snap){SillyTavern.getContext().saveMetadata();log('Field edited:',newVal.substring(0,40))}
            }
        }
        el.addEventListener('blur',save);
        el.addEventListener('keydown',(e)=>{if(e.key==='Enter'){e.preventDefault();save()}});
    }

    // Environment — always visible, NOT collapsible
    const envDiv=document.createElement('div');envDiv.className='sp-env-permanent';
    const dash=document.createElement('div');dash.className='sp-dashboard';
    const dc=s.dashCards||{...DEFAULTS.dashCards};
    const dateStr=d.date||'';
    const dateParts=dateStr.match(/(\d+)\/(\d+)\/(\d+)/);
    const dayName=dateStr.match(/\((\w+)\)/)?.[1]||'';
    const months=['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const mon=dateParts?months[parseInt(dateParts[1])]||dateParts[1]:'';
    const dayNum=dateParts?parseInt(dateParts[2]):0;
    const year=dateParts?dateParts[3]:'';
    // ── Maya Calendar SVG overlay ──
    const calSvg=`<svg class="sp-cal-bg" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg"><g transform="translate(0 -452.36)"><g transform="matrix(.83055 .47952 -.47952 .83055 485.36 -30.162)" stroke="currentColor" fill="none"><path style="stroke-width:7.924" d="m692.67 297.43c0 159.51-134.35 288.82-300.07 288.82-165.73 0-300.07-129.31-300.07-288.82s134.35-288.82 300.07-288.82c165.73 0 300.07 129.31 300.07 288.82z" transform="matrix(.99807 0 0 1.0212 -60.941 447.39)"/><path style="stroke-width:5.685" d="m692.67 297.43c0 159.51-134.35 288.82-300.07 288.82-165.73 0-300.07-129.31-300.07-288.82s134.35-288.82 300.07-288.82c165.73 0 300.07 129.31 300.07 288.82z" transform="matrix(.86695 0 0 .89224 -10.424 484.48)"/><path d="m201.69 525.76 72.22 475.74 266.54-401.41-469.38 125.31 434.34 213.45-181.59-448.14-159.3 459.83 423.72-236.82-477.87-103.01 287.78 386.55 47.79-476.81-354.69 326.01 484.25-9.55z" style="stroke-linejoin:round;stroke-width:2.89"/><path style="stroke-linejoin:round;stroke-width:5.0852" d="m545.84 280.88c0 64.808-59.194 117.35-132.21 117.35-73.019 0-132.21-52.537-132.21-117.35 0-64.808 59.194-117.35 132.21-117.35 73.019 0 132.21 52.537 132.21 117.35z" transform="matrix(.93531 0 0 1.0336 -57.71 460.79)"/><path d="m269.66 643.63 94.51 226.2-35.04-243.19-24.43 244.25 82.83-229.38-135.93 200.71 179.47-161.42-216.1 115.75 236.81-63.71-245.31 4.24 239.47 53.63-220.35-108.85 188.49 159.29z" style="stroke-linejoin:round;stroke-width:2.89"/><path d="m324.52 494.96 6.3717 256.17 255.22-36.349" style="stroke-linejoin:round;stroke-width:2.89"/><path d="m538.33 600.09-207.43 151.04 112.92-227.5" style="stroke-linejoin:round;stroke-width:2.89"/><path d="m202.75 526.82 128.15 224.31-218.41-140.42" style="stroke-linejoin:round;stroke-width:2.89"/><path d="m70.011 725.4 259.12 23.37-236.82 98.76" style="stroke-linejoin:round;stroke-width:2.89"/><path d="m166.65 947.35 164.25-196.22-58.06 250.37" style="stroke-linejoin:round;stroke-width:2.89"/><path d="m330.9 751.13 68.319 248.25" style="stroke-linejoin:round;stroke-width:2.89"/><path d="m329.66 746.11 174.69 191.68" style="stroke-linejoin:round;stroke-width:2.89"/><path d="m330.9 751.13 245.66 85.775" style="stroke-linejoin:round;stroke-width:2.89"/></g><g transform="matrix(.83055 .47952 -.47952 .83055 485.36 -30.162)" fill="currentColor" stroke="currentColor"><circle transform="matrix(.2879 0 0 .2879 247.38 482.98)" cx="-186.9" cy="103" r="14.87" style="stroke-width:5"/><circle transform="matrix(.2879 0 0 .2879 161.88 562.98)" cx="-186.9" cy="103" r="14.87" style="stroke-width:5"/><circle transform="matrix(.2879 0 0 .2879 152.88 575.98)" cx="-186.9" cy="103" r="14.87" style="stroke-width:5"/><circle transform="matrix(.2879 0 0 .2879 111.88 678.98)" cx="-186.9" cy="103" r="14.87" style="stroke-width:5"/><circle transform="matrix(.2879 0 0 .2879 108.88 694.48)" cx="-186.9" cy="103" r="14.87" style="stroke-width:5"/><circle transform="matrix(.2879 0 0 .2879 107.88 709.98)" cx="-186.9" cy="103" r="14.87" style="stroke-width:5"/></g><g transform="matrix(.83055 .47952 -.47952 .83055 485.36 -30.162)" fill="currentColor" stroke="currentColor"><rect transform="matrix(.90911 .41655 -.41655 .90911 0 0)" rx="2.69" ry="2.69" height="4.3" width="38.77" y="276.14" x="603.09" style="stroke-width:2.69"/><rect rx="2.69" ry="2.69" transform="rotate(25.284)" height="4.3" width="38.77" y="260.45" x="606.69" style="stroke-width:2.69"/><rect rx="2.69" ry="2.69" transform="rotate(-1.3905)" height="4.3" width="38.77" y="490.62" x="292.61" style="stroke-width:2.69"/><rect rx="2.69" ry="2.69" transform="rotate(-.72378)" height="4.3" width="38.77" y="478.54" x="298.73" style="stroke-width:2.69"/></g><g transform="matrix(.83055 .47952 -.47952 .83055 485.36 -30.162)" fill="currentColor" stroke="currentColor"><circle transform="matrix(.045621 -.28426 .28426 .045621 430.92 434.84)" cx="-186.9" cy="103" r="14.87" style="stroke-width:5"/><circle transform="matrix(.045621 -.28426 .28426 .045621 442.67 439.84)" cx="-186.9" cy="103" r="14.87" style="stroke-width:5"/><circle transform="matrix(-.083645 -.27548 .27548 -.083645 266.78 423.81)" cx="-186.9" cy="103" r="14.87" style="stroke-width:5"/><circle transform="matrix(-.083645 -.27548 .27548 -.083645 279.54 423.15)" cx="-186.9" cy="103" r="14.87" style="stroke-width:5"/><circle transform="matrix(-.083645 -.27548 .27548 -.083645 291.54 423.15)" cx="-186.9" cy="103" r="14.87" style="stroke-width:5"/></g></g></svg>`;
    dash.innerHTML+=`<div class="sp-dash-card sp-dash-card-date" data-card="date">${calSvg}<div class="sp-cal-shimmer-overlay"></div><div class="sp-cal-particles"><div class="sp-cal-particle"></div><div class="sp-cal-particle"></div><div class="sp-cal-particle"></div><div class="sp-cal-particle"></div><div class="sp-cal-particle"></div><div class="sp-cal-particle"></div></div><div class="sp-dash-sub">${esc(mon)} ${esc(String(dayNum||''))}</div><div class="sp-dash-day">${esc(dayName)}</div><div class="sp-dash-sub">${esc(String(year))}</div></div>`;
    const wx=d.weather||'\u2014';
    const wxLow=wx.toLowerCase();
    // Update full-screen weather overlay
    updateWeatherOverlay(wx);
    // Update time-of-day ambient tint
    updateTimeTint(d.time);
    // Check for major scene transitions
    checkSceneTransition(d);
    // ── HIGH-QUALITY WEATHER SVGs (with gradients and depth) ──
    // Use currentWeatherType from overlay detection for consistent matching
    // currentWeatherType is now a combo key; extract primary type
    const _wxT=currentWeatherType.split('+')[0]||'clear';
    let wxSvg='';
    if(_wxT==='snow'){
        wxSvg=`<svg class="sp-wx-svg" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <defs><linearGradient id="wSnow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8c8e0" stop-opacity="0.7"/><stop offset="1" stop-color="#8aa0c0" stop-opacity="0.5"/></linearGradient></defs>
            <path d="M12 26c-4.5 0-8-2.8-8-6 0-3 2.2-5.5 5.5-6.5C11 8.5 16 5 22 5c6 0 10.5 4 11.2 8.5C37 14 40.5 17 40.5 21c0 3.5-3.5 5-7.5 5z" fill="url(#wSnow)" stroke="rgba(180,200,230,0.35)" stroke-width="0.7"/>
            <circle cx="15" cy="32" r="2" fill="rgba(220,235,255,0.8)"/><circle cx="24" cy="34" r="2.2" fill="rgba(220,235,255,0.7)"/><circle cx="33" cy="31" r="1.8" fill="rgba(220,235,255,0.6)"/>
            <circle cx="19" cy="38" r="1.5" fill="rgba(220,235,255,0.5)"/><circle cx="29" cy="39" r="1.7" fill="rgba(220,235,255,0.45)"/>
            <path d="M24 28 L24 42 M19 31 L29 39 M29 31 L19 39" stroke="rgba(200,220,245,0.2)" stroke-width="0.5"/>
        </svg>`;
    } else if(_wxT==='storm'){
        wxSvg=`<svg class="sp-wx-svg" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <defs><linearGradient id="wStorm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a7a95" stop-opacity="0.8"/><stop offset="1" stop-color="#4a5a75" stop-opacity="0.6"/></linearGradient></defs>
            <path d="M11 24c-4.5 0-8-2.8-8-6 0-3 2.2-5.5 5.5-6.5C10 6.5 15 3 21.5 3c6 0 10.5 4 11.2 8.5C36.5 12 40 15 40 18.5c0 3.5-3.5 5.5-7.5 5.5z" fill="url(#wStorm)" stroke="rgba(120,140,170,0.35)" stroke-width="0.7"/>
            <polygon points="26,22 20,32 24,32 18,44 30,30 25,30 31,22" fill="rgba(255,220,80,0.85)" stroke="rgba(255,180,40,0.5)" stroke-width="0.5" stroke-linejoin="round"/>
            <line x1="12" y1="28" x2="10" y2="36" stroke="rgba(91,140,196,0.5)" stroke-width="1.2" stroke-linecap="round"/>
            <line x1="36" y1="26" x2="34" y2="34" stroke="rgba(91,140,196,0.4)" stroke-width="1.2" stroke-linecap="round"/>
        </svg>`;
    } else if(_wxT==='rain'){
        wxSvg=`<svg class="sp-wx-svg" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <defs><linearGradient id="wRain" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a9ab5" stop-opacity="0.7"/><stop offset="1" stop-color="#6a7a95" stop-opacity="0.5"/></linearGradient></defs>
            <path d="M12 24c-4 0-7-2.5-7-5.5 0-2.8 2-5 4.5-6C11 8 15.5 5 21.5 5c5.5 0 10 3.5 10.5 8C36 13.5 39 16.5 39 20c0 2.8-3 4-6 4z" fill="url(#wRain)" stroke="rgba(150,170,200,0.3)" stroke-width="0.7"/>
            <line x1="14" y1="28" x2="11" y2="38" stroke="rgba(100,160,220,0.65)" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="21" y1="27" x2="18" y2="37" stroke="rgba(100,160,220,0.55)" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="28" y1="28" x2="25" y2="38" stroke="rgba(100,160,220,0.6)" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="35" y1="27" x2="32" y2="35" stroke="rgba(100,160,220,0.4)" stroke-width="1.3" stroke-linecap="round"/>
            <line x1="17" y1="40" x2="15" y2="44" stroke="rgba(100,160,220,0.3)" stroke-width="1" stroke-linecap="round"/>
        </svg>`;
    } else if(_wxT==='cloudy'){
        wxSvg=`<svg class="sp-wx-svg" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <defs><linearGradient id="wCloud" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a0b0c8" stop-opacity="0.6"/><stop offset="1" stop-color="#7a8aa5" stop-opacity="0.4"/></linearGradient></defs>
            <path d="M13 34c-5 0-9-3-9-7s2.5-6.5 6-7.5C11.5 13 17 9 23.5 9c6.5 0 11 4 11.5 9.5C39 19 42 22.5 42 27c0 4-3.5 7-8 7z" fill="url(#wCloud)" stroke="rgba(170,185,210,0.3)" stroke-width="0.7"/>
            <path d="M18 34c-3.5 0-6-2-6-5 0-2.5 1.8-4.5 4.2-5.2C17.5 19 21 16.5 25.5 16.5c4 0 7.5 2.8 8 6.5C36 23.5 38 25.5 38 28.5c0 3-2.5 5.5-6 5.5z" fill="rgba(160,175,200,0.2)"/>
        </svg>`;
    } else if(_wxT==='hail'){
        wxSvg=`<svg class="sp-wx-svg" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <defs><linearGradient id="wHail" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a9ab5" stop-opacity="0.7"/><stop offset="1" stop-color="#6a7a95" stop-opacity="0.5"/></linearGradient></defs>
            <path d="M12 22c-4 0-7-2.5-7-5.5 0-2.8 2-5 4.5-6C11 6 15.5 3 21.5 3c5.5 0 10 3.5 10.5 8C36 11.5 39 14.5 39 18c0 2.8-3 4-6 4z" fill="url(#wHail)" stroke="rgba(150,170,200,0.3)" stroke-width="0.7"/>
            <circle cx="14" cy="30" r="3" fill="rgba(200,220,245,0.7)" stroke="rgba(160,190,230,0.5)" stroke-width="0.8"/>
            <circle cx="25" cy="33" r="3.5" fill="rgba(200,220,245,0.6)" stroke="rgba(160,190,230,0.4)" stroke-width="0.8"/>
            <circle cx="35" cy="29" r="2.5" fill="rgba(200,220,245,0.65)" stroke="rgba(160,190,230,0.45)" stroke-width="0.8"/>
            <circle cx="19" cy="40" r="2" fill="rgba(200,220,245,0.5)" stroke="rgba(160,190,230,0.35)" stroke-width="0.6"/>
            <line x1="30" y1="24" x2="28" y2="32" stroke="rgba(100,160,220,0.4)" stroke-width="1" stroke-linecap="round"/>
        </svg>`;
    } else if(_wxT==='sandstorm'){
        wxSvg=`<svg class="sp-wx-svg" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <defs><linearGradient id="wSand" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c8a060" stop-opacity="0"/><stop offset="0.3" stop-color="#c8a060" stop-opacity="0.6"/><stop offset="0.7" stop-color="#c8a060" stop-opacity="0.6"/><stop offset="1" stop-color="#c8a060" stop-opacity="0"/></linearGradient></defs>
            <rect x="2" y="10" width="44" height="8" rx="4" fill="url(#wSand)" opacity="0.7"/>
            <rect x="6" y="22" width="36" height="6" rx="3" fill="url(#wSand)" opacity="0.5"/>
            <rect x="2" y="32" width="44" height="7" rx="3.5" fill="url(#wSand)" opacity="0.35"/>
            <circle cx="12" cy="18" r="1.5" fill="rgba(200,160,80,0.5)"/><circle cx="28" cy="28" r="1" fill="rgba(200,160,80,0.4)"/>
            <circle cx="38" cy="16" r="1.2" fill="rgba(200,160,80,0.45)"/><circle cx="20" cy="38" r="0.8" fill="rgba(200,160,80,0.3)"/>
        </svg>`;
    } else if(_wxT==='clear'){
        wxSvg=`<svg class="sp-wx-svg" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <defs><radialGradient id="wSun"><stop offset="0" stop-color="#ffe066" stop-opacity="0.9"/><stop offset="0.6" stop-color="#ffcc33" stop-opacity="0.7"/><stop offset="1" stop-color="#ffaa00" stop-opacity="0"/></radialGradient></defs>
            <circle cx="24" cy="24" r="14" fill="url(#wSun)"/>
            <circle cx="24" cy="24" r="7.5" fill="rgba(255,215,70,0.85)" stroke="rgba(255,180,40,0.3)" stroke-width="0.8"/>
            <circle cx="22" cy="22" r="3" fill="rgba(255,240,150,0.35)"/>
            ${[0,45,90,135,180,225,270,315].map(a=>{const r=a*Math.PI/180;return`<line x1="${24+Math.cos(r)*11}" y1="${24+Math.sin(r)*11}" x2="${24+Math.cos(r)*17}" y2="${24+Math.sin(r)*17}" stroke="rgba(255,200,50,0.65)" stroke-width="2" stroke-linecap="round"/>`}).join('')}
        </svg>`;
    } else if(_wxT==='fog'){
        wxSvg=`<svg class="sp-wx-svg" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <defs><linearGradient id="wFog" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a0b0c8" stop-opacity="0"/><stop offset="0.3" stop-color="#a0b0c8" stop-opacity="0.5"/><stop offset="0.7" stop-color="#a0b0c8" stop-opacity="0.5"/><stop offset="1" stop-color="#a0b0c8" stop-opacity="0"/></linearGradient></defs>
            <rect x="4" y="11" width="40" height="4" rx="2" fill="url(#wFog)" opacity="0.7"/>
            <rect x="8" y="19" width="32" height="4" rx="2" fill="url(#wFog)" opacity="0.55"/>
            <rect x="4" y="27" width="40" height="4" rx="2" fill="url(#wFog)" opacity="0.4"/>
            <rect x="10" y="35" width="28" height="3" rx="1.5" fill="url(#wFog)" opacity="0.25"/>
        </svg>`;
    } else if(_wxT==='wind'){
        wxSvg=`<svg class="sp-wx-svg" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 16 Q16 16 24 13 Q30 10 34 13 Q37 15 34 17" fill="none" stroke="rgba(140,175,220,0.7)" stroke-width="2.2" stroke-linecap="round"/>
            <path d="M4 26 Q14 26 22 23 Q28 20 32 23" fill="none" stroke="rgba(140,175,220,0.5)" stroke-width="2" stroke-linecap="round"/>
            <path d="M8 36 Q18 36 26 33 Q32 30 36 33 Q40 35 37 37" fill="none" stroke="rgba(140,175,220,0.35)" stroke-width="1.8" stroke-linecap="round"/>
        </svg>`;
    } else if(_wxT==='ash'){
        wxSvg=`<svg class="sp-wx-svg" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <defs><linearGradient id="wAsh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a8580" stop-opacity="0.6"/><stop offset="1" stop-color="#605a55" stop-opacity="0.4"/></linearGradient></defs>
            <path d="M10 20c-3 0-5.5-1.8-5.5-4 0-2 1.5-3.8 3.8-4.5C9.5 7.5 13 5 18 5c4.5 0 8 3 8.5 6.5C29.5 12 32 14 32 17c0 2.2-2.5 3-5 3z" fill="url(#wAsh)" stroke="rgba(140,135,130,0.3)" stroke-width="0.6"/>
            <circle cx="10" cy="28" r="1.5" fill="rgba(130,125,120,0.5)"/><circle cx="18" cy="32" r="2" fill="rgba(120,115,110,0.45)"/>
            <circle cx="26" cy="27" r="1.8" fill="rgba(130,125,120,0.4)"/><circle cx="35" cy="31" r="1.5" fill="rgba(120,115,110,0.35)"/>
            <circle cx="14" cy="38" r="1.2" fill="rgba(110,105,100,0.3)"/><circle cx="30" cy="40" r="1" fill="rgba(110,105,100,0.25)"/>
            <circle cx="38" cy="22" r="2" fill="rgba(255,130,40,0.5)"/><circle cx="39" cy="21" r="1" fill="rgba(255,180,60,0.6)"/>
        </svg>`;
    } else if(_wxT==='aurora'){
        wxSvg=`<svg class="sp-wx-svg" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <defs><linearGradient id="wAur1" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#4db8a4" stop-opacity="0"/><stop offset="1" stop-color="#4db8a4" stop-opacity="0.8"/></linearGradient>
            <linearGradient id="wAur2" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#9b5de5" stop-opacity="0"/><stop offset="1" stop-color="#9b5de5" stop-opacity="0.6"/></linearGradient>
            <linearGradient id="wAur3" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#5b8cc4" stop-opacity="0"/><stop offset="1" stop-color="#5b8cc4" stop-opacity="0.5"/></linearGradient></defs>
            <path d="M2 44 Q8 6 20 18 Q32 30 46 2" fill="none" stroke="url(#wAur1)" stroke-width="5" stroke-linecap="round"/>
            <path d="M6 44 Q14 12 24 22 Q34 32 42 8" fill="none" stroke="url(#wAur2)" stroke-width="4" stroke-linecap="round"/>
            <path d="M10 44 Q18 18 28 26 Q38 34 44 14" fill="none" stroke="url(#wAur3)" stroke-width="3" stroke-linecap="round"/>
            <circle cx="10" cy="6" r="1" fill="rgba(255,255,255,0.5)"/><circle cx="36" cy="4" r="0.8" fill="rgba(255,255,255,0.4)"/><circle cx="44" cy="12" r="0.6" fill="rgba(255,255,255,0.3)"/>
        </svg>`;
    } else {
        // Fallback — cloud icon
        wxSvg=`<svg class="sp-wx-svg" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <defs><linearGradient id="wDef" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a0b0c8" stop-opacity="0.5"/><stop offset="1" stop-color="#7a8aa5" stop-opacity="0.3"/></linearGradient></defs>
            <path d="M13 34c-5 0-9-3-9-7s2.5-6.5 6-7.5C11.5 13 17 9 23.5 9c6.5 0 11 4 11.5 9.5C39 19 42 22.5 42 27c0 4-3.5 7-8 7z" fill="url(#wDef)" stroke="rgba(170,185,210,0.25)" stroke-width="0.6"/>
        </svg>`;
    }
    // Determine weather card background classes — multiple can apply
    let wxCardClasses=[];
    const _wxTypes=currentWeatherType.split('+').filter(Boolean);
    const wxToCard={snow:'sp-wxc-snow',hail:'sp-wxc-hail',sandstorm:'sp-wxc-sand',ash:'sp-wxc-ash',storm:'sp-wxc-storm',rain:'sp-wxc-rain',fog:'sp-wxc-fog',wind:'sp-wxc-wind',aurora:'sp-wxc-aurora'};
    for(const t of _wxTypes){if(wxToCard[t])wxCardClasses.push(wxToCard[t])}
    // Always determine time-of-day class
    const _h=parseInt((d.time||'').match(/(\d+):/)?.[1]||'12');
    let todClass='sp-wxc-day';
    if(_h>=5&&_h<7)todClass='sp-wxc-dawn';
    else if(_h>=7&&_h<11)todClass='sp-wxc-morning';
    else if(_h>=11&&_h<14)todClass='sp-wxc-day';
    else if(_h>=14&&_h<17)todClass='sp-wxc-afternoon';
    else if(_h>=17&&_h<20)todClass='sp-wxc-dusk';
    else if(_h>=20&&_h<22)todClass='sp-wxc-evening';
    else todClass='sp-wxc-night';
    // Always include time-of-day as base, weather classes layer on top
    const allCardClasses=[todClass,...wxCardClasses].join(' ');
    // Moon SVG for night/evening
    const _needsMoon=todClass==='sp-wxc-night'||todClass==='sp-wxc-evening';
    const moonSvg=_needsMoon?`<svg class="sp-wxc-moon-svg" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="spWxcMoon"><stop offset="0%" stop-color="rgba(240,235,210,0.9)"/><stop offset="100%" stop-color="rgba(220,215,190,0.3)"/></radialGradient></defs><circle cx="18" cy="18" r="9" fill="url(#spWxcMoon)"/><circle cx="13" cy="15" r="9" fill="var(--sp-bg-solid)"/><circle cx="30" cy="8" r="0.8" fill="rgba(255,255,255,0.5)"/><circle cx="35" cy="16" r="0.5" fill="rgba(255,255,255,0.35)"/><circle cx="28" cy="28" r="0.6" fill="rgba(255,255,255,0.3)"/><circle cx="8" cy="32" r="0.4" fill="rgba(255,255,255,0.2)"/><circle cx="34" cy="34" r="0.5" fill="rgba(255,255,255,0.25)"/></svg>`:'';
    dash.innerHTML+=`<div class="sp-dash-card sp-dash-card-weather ${allCardClasses}" data-card="weather">${moonSvg}${wxSvg}<div class="sp-dash-value" style="font-size:10.5px">${esc(wx)}</div></div>`;
    // Temperature: horizontal color bar with chevron — human-centric range
    // Range: -10°F to 120°F (130° span). Green center at 68°F = ~60% position
    const tempRaw=d.temperature||'\u2014';
    const tempNum=tempRaw.match(/-?\d+\.?\d*\s*[°º]\s*[FCfc]?/);
    let tempDisplay=tempRaw;
    const hasExactTemp=!!tempNum;
    let tempPct=60;
    let degF=null,degC=null;
    if(hasExactTemp){
        const val=parseFloat(tempNum[0]);
        const unitMatch=tempNum[0].match(/[°º]\s*([FCfc])/);
        const unit=unitMatch?unitMatch[1].toLowerCase():'f';
        if(unit==='c'){degC=val;degF=val*9/5+32}
        else{degF=val;degC=(val-32)*5/9}
        tempPct=clamp((degF+10)/130*100,2,98);
        // Format: "32°F / 0°C"
        tempDisplay=Math.round(degF)+'°F / '+Math.round(degC)+'°C';
    } else {
        // Descriptive — show original text, infer position
        tempDisplay=tempRaw;
        const tl=tempRaw.toLowerCase();
        if(tl.includes('freez')||tl.includes('frigid')||tl.includes('arctic')||tl.includes('bitter'))tempPct=10;
        else if(tl.includes('cold')||tl.includes('ice')||tl.includes('frost'))tempPct=22;
        else if(tl.includes('chill')||tl.includes('cool')||tl.includes('crisp'))tempPct=38;
        else if(tl.includes('mild')||tl.includes('temperate')||tl.includes('pleasant'))tempPct=55;
        else if(tl.includes('room')||tl.includes('comfort')||tl.includes('indoor'))tempPct=60;
        else if(tl.includes('warm'))tempPct=68;
        else if(tl.includes('hot')||tl.includes('heat')||tl.includes('swelter'))tempPct=82;
        else if(tl.includes('scorch')||tl.includes('blister')||tl.includes('inferno'))tempPct=93;
    }
    const barL=4,barR=196,barW=barR-barL;
    const chevX=barL+(barW*tempPct/100);
    // Interpolate gradient color at tempPct for card background tint
    const TEMP_STOPS=[[0,'4a3fa0'],[12,'3060c8'],[24,'2898d8'],[38,'28b8b0'],[50,'38c878'],[60,'4dbd5c'],[70,'a0c830'],[80,'e8b020'],[88,'e07828'],[96,'c83030'],[100,'901818']];
    function lerpTempColor(pct){
        let lo=TEMP_STOPS[0],hi=TEMP_STOPS[TEMP_STOPS.length-1];
        for(let i=0;i<TEMP_STOPS.length-1;i++){if(pct>=TEMP_STOPS[i][0]&&pct<=TEMP_STOPS[i+1][0]){lo=TEMP_STOPS[i];hi=TEMP_STOPS[i+1];break}}
        const t=hi[0]===lo[0]?0:(pct-lo[0])/(hi[0]-lo[0]);
        const p=s=>parseInt(s,16);
        const r=Math.round(p(lo[1].slice(0,2))+(p(hi[1].slice(0,2))-p(lo[1].slice(0,2)))*t);
        const g=Math.round(p(lo[1].slice(2,4))+(p(hi[1].slice(2,4))-p(lo[1].slice(2,4)))*t);
        const b=Math.round(p(lo[1].slice(4,6))+(p(hi[1].slice(4,6))-p(lo[1].slice(4,6)))*t);
        return{r,g,b,hex:`#${[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('')}`};
    }
    const tc=lerpTempColor(tempPct);
    // Gradient: deep blue → blue → cyan → green (68°F center) → yellow → orange → red
    const tempBar=`<div class="sp-temp-bar-wrap">
        <svg class="sp-temp-bar-svg" viewBox="0 0 200 22" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <defs>
                <linearGradient id="spTempGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stop-color="#4a3fa0"/>
                    <stop offset="12%" stop-color="#3060c8"/>
                    <stop offset="24%" stop-color="#2898d8"/>
                    <stop offset="38%" stop-color="#28b8b0"/>
                    <stop offset="50%" stop-color="#38c878"/>
                    <stop offset="60%" stop-color="#4dbd5c"/>
                    <stop offset="70%" stop-color="#a0c830"/>
                    <stop offset="80%" stop-color="#e8b020"/>
                    <stop offset="88%" stop-color="#e07828"/>
                    <stop offset="96%" stop-color="#c83030"/>
                    <stop offset="100%" stop-color="#901818"/>
                </linearGradient>
            </defs>
            <rect x="${barL}" y="6" width="${barW}" height="6" rx="3" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.06)" stroke-width="0.4"/>
            <rect x="${barL}" y="6" width="${barW}" height="6" rx="3" fill="url(#spTempGrad)" opacity="0.85"/>
            <polygon points="${chevX-4},1.5 ${chevX+4},1.5 ${chevX},6" fill="var(--sp-text-bright)" opacity="0.85"/>
            <line x1="${chevX}" y1="6" x2="${chevX}" y2="12" stroke="var(--sp-text-bright)" stroke-width="0.8" opacity="0.5"/>
        </svg>
        <div class="sp-temp-bar-label">${esc(tempDisplay)}</div>
    </div>`;
    dash.innerHTML+=`<div class="sp-dash-card sp-dash-card-temp" data-card="temperature" style="background:linear-gradient(135deg,rgba(${tc.r},${tc.g},${tc.b},0.28) 0%,rgba(${tc.r},${tc.g},${tc.b},0.08) 100%);border-color:rgba(${tc.r},${tc.g},${tc.b},0.30);--temp-r:${tc.r};--temp-g:${tc.g};--temp-b:${tc.b}">${tempBar}</div>`;
    const timeStr=d.time||'';
    const timeMatch=timeStr.match(/(\d+):(\d+)/);
    const rawHour=timeMatch?parseInt(timeMatch[1]):0;
    const min=timeMatch?parseInt(timeMatch[2]):0;
    const hour12=rawHour%12||12;
    const ampm=rawHour>=12?'PM':'AM';
    const timeDisplay=`${hour12}:${String(min).padStart(2,'0')} ${ampm}`;
    // SVG analog clock
    const hAngle=(rawHour%12+min/60)*30-90;
    const mAngle=min*6-90;
    const hRad=hAngle*Math.PI/180;
    const mRad=mAngle*Math.PI/180;
    const hx=18+Math.cos(hRad)*8, hy=18+Math.sin(hRad)*8;
    const mx=18+Math.cos(mRad)*12, my=18+Math.sin(mRad)*12;
    const clockSvg=`<svg viewBox="0 0 40 40" width="60" height="60" xmlns="http://www.w3.org/2000/svg">
        <defs><radialGradient id="spClkBg" cx="50%" cy="40%"><stop offset="0%" stop-color="rgba(77,184,164,0.08)"/><stop offset="100%" stop-color="rgba(0,0,0,0)"/></radialGradient></defs>
        <circle cx="20" cy="20" r="18" fill="rgba(6,9,18,0.85)"/>
        <circle cx="20" cy="20" r="17" fill="url(#spClkBg)" stroke="var(--sp-text-dim)" stroke-width="0.5" opacity="0.4"/>
        <circle cx="20" cy="20" r="17" fill="none" stroke="var(--sp-accent)" stroke-width="0.6" opacity="0.3"/>
        ${[0,1,2,3,4,5,6,7,8,9,10,11].map(i=>{const a=(i*30-90)*Math.PI/180;const major=i%3===0;const r1=major?13:14.5;const r2=16;const x1=20+Math.cos(a)*r1,y1=20+Math.sin(a)*r1;const x2=20+Math.cos(a)*r2,y2=20+Math.sin(a)*r2;return`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="var(--sp-text-dim)" stroke-width="${major?'1.8':'0.7'}" stroke-linecap="round" opacity="${major?'0.8':'0.35'}"/>`}).join('')}
        <line x1="20" y1="20" x2="${20+Math.cos(hRad)*9}" y2="${20+Math.sin(hRad)*9}" stroke="var(--sp-text-bright)" stroke-width="2" stroke-linecap="round"/>
        <line x1="20" y1="20" x2="${20+Math.cos(mRad)*13}" y2="${20+Math.sin(mRad)*13}" stroke="var(--sp-accent)" stroke-width="1.2" stroke-linecap="round"/>
        <circle cx="20" cy="20" r="2" fill="var(--sp-accent)" opacity="0.6"/>
        <circle cx="20" cy="20" r="1" fill="var(--sp-text-bright)"/>
    </svg>`;
    const _wdmId='sp-wdm-'+Date.now();
    dash.innerHTML+=`<div class="sp-dash-card sp-dash-card-time" data-card="time"><canvas id="${_wdmId}" class="sp-wdm-canvas"></canvas><div class="sp-clock-shimmer"></div><div class="sp-clock-particles"><div class="sp-clock-particle"></div><div class="sp-clock-particle"></div><div class="sp-clock-particle"></div><div class="sp-clock-particle"></div><div class="sp-clock-particle"></div></div><div class="sp-clock-backing"></div><div class="sp-dash-clock">${clockSvg}</div><div class="sp-dash-value sp-time-value">${esc(timeDisplay)}</div></div>`;
    // ── WDM canvas animation (spectrum wave lines) ──
    requestAnimationFrame(()=>{
        const _cv=document.getElementById(_wdmId);if(!_cv)return;
        const _W=500,_H=500;_cv.width=_W;_cv.height=_H;
        const _ctx=_cv.getContext('2d');if(!_ctx)return;
        const _cxW=_W/2,_cyW=_H/2;
        const _spec=['#201636','#132262','#332327','#A3306C','#D5BC35','#056215','#27FBFF','#00006A','#A21C2F','#7A0F0F','#F9D648','#E257F9','#813EDD','#202FBE','#2A5867','#264C0A','#5B5C14','#96621C','#EA8536','#FFF94C','#E55322','#316BFA','#2C5D58','#325B11'];
        function _drawWave(a,spread,cnt,rMin,rMax,ph){
            for(let w=0;w<cnt;w++){
                const f=w/cnt;const ang=a+spread*(f-0.5);
                _ctx.beginPath();_ctx.strokeStyle=_spec[Math.floor(f*_spec.length)%_spec.length];
                _ctx.lineWidth=0.6;_ctx.globalAlpha=0.5+Math.sin(ph+w*0.3)*0.2;
                for(let i=0;i<=80;i++){
                    const t=i/80;const r=rMin+t*(rMax-rMin);
                    const amp=3+t*12;const frq=4+f*3;
                    const wob=Math.sin(t*frq*Math.PI+ph+w*0.7)*amp;
                    const ca=ang+wob*0.003;
                    const x=_cxW+Math.cos(ca)*r+Math.sin(t*frq*Math.PI+ph)*wob*Math.cos(a+Math.PI/2);
                    const y=_cyW+Math.sin(ca)*r+Math.sin(t*frq*Math.PI+ph)*wob*Math.sin(a+Math.PI/2);
                    if(i===0)_ctx.moveTo(x,y);else _ctx.lineTo(x,y);
                }
                _ctx.stroke();
            }
        }
        let _ph=0;let _wdmRaf;
        function _wdmDraw(){
            _ph+=0.008;_ctx.clearRect(0,0,_W,_H);
            for(let b=0;b<12;b++){const a=b*Math.PI/6+_ph*0.05;_drawWave(a,0.4,18,20,280,_ph+b*2)}
            _ctx.globalAlpha=0.15;
            const g=_ctx.createRadialGradient(_cxW,_cyW,0,_cxW,_cyW,60);
            g.addColorStop(0,'rgba(120,200,180,0.3)');g.addColorStop(1,'rgba(0,0,0,0)');
            _ctx.fillStyle=g;_ctx.fillRect(0,0,_W,_H);_ctx.globalAlpha=1;
            _wdmRaf=requestAnimationFrame(_wdmDraw);
        }
        _wdmDraw();
        // Cleanup on panel hide
        const _obs=new MutationObserver(()=>{const p=document.getElementById('sp-panel');if(!p||p.style.display==='none'){cancelAnimationFrame(_wdmRaf);_obs.disconnect()}});
        _obs.observe(document.body,{childList:true,subtree:true,attributes:true});
    });
    // ── Dashboard overlay: procedural decorative SVG ──
    const ov=document.createElement('div');ov.className='sp-dash-overlay';
    // ── Generative dashboard overlay: topographic mesh + bokeh + noise ──
    const seed=((rawHour*60+min)+tempPct*7)%1000;
    const rng=(i)=>((seed*131+i*97)%256)/256;
    // Derive scene-adaptive accent color from time of day
    const hrVal=rawHour+(min/60);
    const sceneHue=hrVal<6?230:hrVal<8?260:hrVal<12?200:hrVal<16?180:hrVal<18?30:hrVal<20?280:240;
    const sceneA='hsla('+sceneHue+',40%,70%,';
    // Build SVG layers
    let svgInner='';
    // Layer 1: Noise texture via feTurbulence
    svgInner+=`<defs>
      <filter id="spOvNoise" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" seed="${seed}" stitchTiles="stitch" result="noise"/>
        <feColorMatrix type="saturate" values="0" in="noise" result="mono"/>
        <feComponentTransfer in="mono"><feFuncA type="linear" slope="0.06" intercept="0"/></feComponentTransfer>
      </filter>
      <filter id="spOvBlur"><feGaussianBlur stdDeviation="3"/></filter>
      <radialGradient id="spOvVig">
        <stop offset="0%" stop-color="white" stop-opacity="0"/>
        <stop offset="65%" stop-color="white" stop-opacity="0"/>
        <stop offset="100%" stop-color="black" stop-opacity="0.12"/>
      </radialGradient>
    </defs>`;
    // Noise fill
    svgInner+=`<rect width="100" height="100" filter="url(#spOvNoise)" opacity="0.5"/>`;
    // Layer 2: Flowing contour curves
    for(let i=0;i<5;i++){
        const y0=10+rng(i*4)*80, y1=10+rng(i*4+1)*80;
        const cp1x=20+rng(i*4+2)*30, cp2x=50+rng(i*4+3)*30;
        const op=0.025+rng(i*7)*0.025;
        svgInner+=`<path d="M0,${y0} C${cp1x},${y0+rng(i*5)*20-10} ${cp2x},${y1+rng(i*6)*20-10} 100,${y1}" fill="none" stroke="${sceneA}0.08)" stroke-width="0.4"/>`;
    }
    // Layer 3: Bokeh circles — soft, varied sizes
    for(let i=0;i<8;i++){
        const x=5+rng(i*6)*90, y=5+rng(i*6+1)*90;
        const r=1.5+rng(i*6+2)*4;
        const op=0.02+rng(i*6+3)*0.04;
        const hueShift=sceneHue+rng(i*6+4)*40-20;
        svgInner+=`<circle cx="${x}" cy="${y}" r="${r}" fill="hsla(${Math.round(hueShift)},50%,75%,${op.toFixed(3)})" filter="url(#spOvBlur)"/>`;
    }
    // Layer 4: Fine grid crosshairs at card centers
    const centers=[[25,25],[75,25],[25,75],[75,75]];
    for(const[cx,cy]of centers){
        svgInner+=`<line x1="${cx-4}" y1="${cy}" x2="${cx+4}" y2="${cy}" stroke="white" stroke-width="0.15" opacity="0.06"/>`;
        svgInner+=`<line x1="${cx}" y1="${cy-4}" x2="${cx}" y2="${cy+4}" stroke="white" stroke-width="0.15" opacity="0.06"/>`;
        svgInner+=`<circle cx="${cx}" cy="${cy}" r="6" fill="none" stroke="white" stroke-width="0.15" opacity="0.03" stroke-dasharray="1.5 3"/>`;
    }
    // Layer 5: Corner filigree
    const corners=[[0,0,1,1],[100,0,-1,1],[0,100,1,-1],[100,100,-1,-1]];
    for(const[cx,cy,dx,dy]of corners){
        svgInner+=`<path d="M${cx},${cy+dy*8} L${cx},${cy} L${cx+dx*8},${cy}" fill="none" stroke="${sceneA}0.07)" stroke-width="0.3"/>`;
        svgInner+=`<path d="M${cx+dx*2},${cy+dy*12} L${cx+dx*2},${cy+dy*2} L${cx+dx*12},${cy+dy*2}" fill="none" stroke="${sceneA}0.04)" stroke-width="0.2"/>`;
    }
    // Layer 6: Vignette
    svgInner+=`<rect width="100" height="100" fill="url(#spOvVig)"/>`;
    ov.innerHTML=`<svg viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none">${svgInner}</svg>`;
    dash.appendChild(ov);
    envDiv.appendChild(dash);
    // Make dashboard values editable in edit mode
    const _wxVal=dash.querySelector('.sp-dash-card-weather .sp-dash-value');
    if(_wxVal)mkEditable(_wxVal,()=>d.weather||'',v=>{d.weather=v;const snap=getLatestSnapshot();if(snap)snap.weather=v});
    const _timeVal=dash.querySelector('.sp-time-value');
    if(_timeVal)mkEditable(_timeVal,()=>d.time||'',v=>{d.time=v;const snap=getLatestSnapshot();if(snap)snap.time=v});
    const _dateDay=dash.querySelector('.sp-dash-day');
    if(_dateDay)mkEditable(_dateDay,()=>d.date||'',v=>{d.date=v;const snap=getLatestSnapshot();if(snap)snap.date=v});
    const _tempVal=dash.querySelector('.sp-temp-bar-label');
    if(_tempVal)mkEditable(_tempVal,()=>d.temperature||'',v=>{d.temperature=v;const snap=getLatestSnapshot();if(snap)snap.temperature=v});
    if(d.location){
        const locLow=(d.location||'').toLowerCase();
        // Determine location type for icon
        let locIcon='';
        if(locLow.includes('tavern')||locLow.includes('inn')||locLow.includes('bar')||locLow.includes('pub')){
            locIcon=`<svg viewBox="0 0 24 24" fill="none"><path d="M4 20h16M5 20V10l7-6 7 6v10" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><rect x="9" y="14" width="6" height="6" rx="0.5" stroke="currentColor" stroke-width="1" opacity="0.6"/><path d="M8 4h8M12 4v3" stroke="currentColor" stroke-width="0.8" opacity="0.4"/><circle cx="12" cy="2.5" r="1.5" fill="currentColor" opacity="0.3"/></svg>`;
        } else if(locLow.includes('forest')||locLow.includes('wood')||locLow.includes('grove')||locLow.includes('jungle')){
            locIcon=`<svg viewBox="0 0 24 24" fill="none"><path d="M12 3L6 12h3l-3 5h12l-3-5h3L12 3z" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/><line x1="12" y1="17" x2="12" y2="22" stroke="currentColor" stroke-width="1.2"/><path d="M5 22h14" stroke="currentColor" stroke-width="0.8" opacity="0.3"/></svg>`;
        } else if(locLow.includes('castle')||locLow.includes('tower')||locLow.includes('fortress')||locLow.includes('keep')||locLow.includes('citadel')){
            locIcon=`<svg viewBox="0 0 24 24" fill="none"><path d="M3 22V14l3-2V8h2V5h2V2h4v3h2v3h2v4l3 2v8" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/><rect x="10" y="16" width="4" height="6" rx="2" stroke="currentColor" stroke-width="0.8" opacity="0.5"/><rect x="4" y="6" width="2" height="2" fill="currentColor" opacity="0.2"/><rect x="18" y="6" width="2" height="2" fill="currentColor" opacity="0.2"/></svg>`;
        } else if(locLow.includes('cave')||locLow.includes('cavern')||locLow.includes('mine')||locLow.includes('dungeon')||locLow.includes('underground')){
            locIcon=`<svg viewBox="0 0 24 24" fill="none"><path d="M2 20Q4 8 12 6Q20 8 22 20z" fill="currentColor" opacity="0.1" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/><path d="M8 20v-4Q10 13 12 13Q14 13 16 16v4" stroke="currentColor" stroke-width="0.8" opacity="0.5"/><circle cx="9" cy="10" r="0.8" fill="currentColor" opacity="0.3"/><circle cx="15" cy="11" r="0.6" fill="currentColor" opacity="0.25"/></svg>`;
        } else if(locLow.includes('ship')||locLow.includes('boat')||locLow.includes('harbor')||locLow.includes('dock')||locLow.includes('port')||locLow.includes('coast')||locLow.includes('sea')||locLow.includes('ocean')||locLow.includes('beach')){
            locIcon=`<svg viewBox="0 0 24 24" fill="none"><path d="M2 17Q6 14 12 14Q18 14 22 17" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M2 20Q6 17 12 17Q18 17 22 20" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" opacity="0.3"/><path d="M12 4v10M8 8l4-4 4 4" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/><path d="M8 8h8v6H8z" fill="currentColor" opacity="0.1" stroke="currentColor" stroke-width="0.8"/></svg>`;
        } else if(locLow.includes('mountain')||locLow.includes('peak')||locLow.includes('summit')||locLow.includes('cliff')||locLow.includes('glacial')){
            locIcon=`<svg viewBox="0 0 24 24" fill="none"><path d="M2 20L9 6l4 7 3-4 6 11z" fill="currentColor" opacity="0.1" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/><path d="M7.5 11l1.5-2 1.5 2" stroke="currentColor" stroke-width="0.6" opacity="0.4"/><circle cx="18" cy="5" r="2" stroke="currentColor" stroke-width="0.8" opacity="0.3"/></svg>`;
        } else if(locLow.includes('temple')||locLow.includes('shrine')||locLow.includes('church')||locLow.includes('cathedral')||locLow.includes('chapel')){
            locIcon=`<svg viewBox="0 0 24 24" fill="none"><path d="M12 2v4M4 22V12l8-4 8 4v10" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/><circle cx="12" cy="2" r="1.5" stroke="currentColor" stroke-width="0.8" opacity="0.4"/><path d="M10 22v-5a2 2 0 0 1 4 0v5" stroke="currentColor" stroke-width="0.8" opacity="0.5"/><path d="M6 13h12" stroke="currentColor" stroke-width="0.6" opacity="0.2"/></svg>`;
        } else if(locLow.includes('space')||locLow.includes('station')||locLow.includes('starship')||locLow.includes('orbit')||locLow.includes('galactic')){
            locIcon=`<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.1"/><ellipse cx="12" cy="12" rx="10" ry="4" stroke="currentColor" stroke-width="0.8" opacity="0.4" transform="rotate(-20 12 12)"/><circle cx="12" cy="12" r="1.5" fill="currentColor" opacity="0.3"/><circle cx="4" cy="6" r="0.8" fill="currentColor" opacity="0.2"/><circle cx="20" cy="16" r="0.6" fill="currentColor" opacity="0.15"/></svg>`;
        } else if(locLow.includes('market')||locLow.includes('shop')||locLow.includes('bazaar')||locLow.includes('store')||locLow.includes('square')||locLow.includes('plaza')){
            locIcon=`<svg viewBox="0 0 24 24" fill="none"><path d="M2 9l2-5h16l2 5" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/><path d="M2 9v13h20V9" stroke="currentColor" stroke-width="1"/><path d="M2 9Q6 12 8 9Q10 12 12 9Q14 12 16 9Q18 12 22 9" stroke="currentColor" stroke-width="0.8" opacity="0.4"/><rect x="9" y="15" width="6" height="7" stroke="currentColor" stroke-width="0.8" opacity="0.5"/></svg>`;
        } else if(locLow.includes('room')||locLow.includes('chamber')||locLow.includes('hall')||locLow.includes('bedroom')||locLow.includes('kitchen')||locLow.includes('cabin')){
            locIcon=`<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="14" rx="1" stroke="currentColor" stroke-width="1.1"/><path d="M3 10h18" stroke="currentColor" stroke-width="0.6" opacity="0.3"/><rect x="7" y="12" width="4" height="4" rx="0.5" stroke="currentColor" stroke-width="0.8" opacity="0.5"/><path d="M14 16h4M14 14h3" stroke="currentColor" stroke-width="0.7" opacity="0.35"/></svg>`;
        } else if(locLow.includes('road')||locLow.includes('path')||locLow.includes('trail')||locLow.includes('street')||locLow.includes('alley')||locLow.includes('corridor')){
            locIcon=`<svg viewBox="0 0 24 24" fill="none"><path d="M8 2Q10 12 8 22M16 2Q14 12 16 22" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/><line x1="11" y1="5" x2="13" y2="5" stroke="currentColor" stroke-width="1.5" opacity="0.3" stroke-dasharray="2 3"/><line x1="11" y1="11" x2="13" y2="11" stroke="currentColor" stroke-width="1.5" opacity="0.3"/><line x1="11" y1="17" x2="13" y2="17" stroke="currentColor" stroke-width="1.5" opacity="0.3"/></svg>`;
        } else if(locLow.includes('bridge')||locLow.includes('crossing')||locLow.includes('gateway')||locLow.includes('gate')){
            locIcon=`<svg viewBox="0 0 24 24" fill="none"><path d="M2 16Q7 8 12 8Q17 8 22 16" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><line x1="6" y1="12" x2="6" y2="20" stroke="currentColor" stroke-width="1" opacity="0.5"/><line x1="12" y1="8" x2="12" y2="20" stroke="currentColor" stroke-width="1" opacity="0.5"/><line x1="18" y1="12" x2="18" y2="20" stroke="currentColor" stroke-width="1" opacity="0.5"/><line x1="2" y1="20" x2="22" y2="20" stroke="currentColor" stroke-width="0.8" opacity="0.3"/></svg>`;
        } else if(locLow.includes('river')||locLow.includes('lake')||locLow.includes('waterfall')||locLow.includes('pond')||locLow.includes('stream')||locLow.includes('spring')){
            locIcon=`<svg viewBox="0 0 24 24" fill="none"><path d="M3 8Q8 5 12 8Q16 11 21 8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M3 13Q8 10 12 13Q16 16 21 13" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.6"/><path d="M3 18Q8 15 12 18Q16 21 21 18" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" opacity="0.35"/></svg>`;
        } else if(locLow.includes('garden')||locLow.includes('park')||locLow.includes('meadow')||locLow.includes('field')||locLow.includes('clearing')){
            locIcon=`<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" fill="currentColor" opacity="0.12" stroke="currentColor" stroke-width="1"/><circle cx="8" cy="12" r="3" fill="currentColor" opacity="0.08" stroke="currentColor" stroke-width="0.8" opacity="0.6"/><circle cx="16" cy="11" r="3.5" fill="currentColor" opacity="0.08" stroke="currentColor" stroke-width="0.8" opacity="0.6"/><line x1="12" y1="12" x2="12" y2="22" stroke="currentColor" stroke-width="1.2"/><path d="M4 22h16" stroke="currentColor" stroke-width="0.6" opacity="0.3"/></svg>`;
        } else if(locLow.includes('desert')||locLow.includes('sand')||locLow.includes('wasteland')||locLow.includes('dune')||locLow.includes('badland')){
            locIcon=`<svg viewBox="0 0 24 24" fill="none"><path d="M1 18Q5 12 9 15Q13 18 17 13Q21 8 23 12" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/><path d="M1 22Q6 17 11 19Q16 21 23 18" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" opacity="0.4"/><circle cx="18" cy="5" r="2.5" stroke="currentColor" stroke-width="1" opacity="0.5"/><path d="M13 6l1-4 1 4" stroke="currentColor" stroke-width="0.7" opacity="0.35" stroke-linecap="round"/></svg>`;
        } else if(locLow.includes('library')||locLow.includes('school')||locLow.includes('academy')||locLow.includes('study')||locLow.includes('archive')){
            locIcon=`<svg viewBox="0 0 24 24" fill="none"><path d="M4 19V5l8 3 8-3v14l-8-2-8 2z" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/><line x1="12" y1="8" x2="12" y2="17" stroke="currentColor" stroke-width="0.8" opacity="0.4"/><path d="M7 7v10M17 7v10" stroke="currentColor" stroke-width="0.5" opacity="0.2"/></svg>`;
        } else if(locLow.includes('prison')||locLow.includes('jail')||locLow.includes('cell')||locLow.includes('dungeon')){
            locIcon=`<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="1" stroke="currentColor" stroke-width="1.1"/><line x1="8" y1="3" x2="8" y2="21" stroke="currentColor" stroke-width="1.2" opacity="0.6"/><line x1="12" y1="3" x2="12" y2="21" stroke="currentColor" stroke-width="1.2" opacity="0.6"/><line x1="16" y1="3" x2="16" y2="21" stroke="currentColor" stroke-width="1.2" opacity="0.6"/><rect x="3" y="9" width="18" height="2" fill="currentColor" opacity="0.1"/></svg>`;
        } else if(locLow.includes('grave')||locLow.includes('cemeter')||locLow.includes('crypt')||locLow.includes('tomb')||locLow.includes('mausoleum')){
            locIcon=`<svg viewBox="0 0 24 24" fill="none"><path d="M8 22V10Q8 6 12 4Q16 6 16 10v12" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/><line x1="10" y1="10" x2="14" y2="10" stroke="currentColor" stroke-width="0.8" opacity="0.4"/><line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" stroke-width="0.8" opacity="0.4"/><line x1="4" y1="22" x2="20" y2="22" stroke="currentColor" stroke-width="0.8" opacity="0.3"/></svg>`;
        } else if(locLow.includes('arena')||locLow.includes('colosseum')||locLow.includes('ring')||locLow.includes('stadium')||locLow.includes('pit')){
            locIcon=`<svg viewBox="0 0 24 24" fill="none"><ellipse cx="12" cy="14" rx="10" ry="6" stroke="currentColor" stroke-width="1.1"/><ellipse cx="12" cy="14" rx="6" ry="3.5" stroke="currentColor" stroke-width="0.8" opacity="0.4"/><path d="M2 14V8Q2 4 12 4Q22 4 22 8v6" stroke="currentColor" stroke-width="1" opacity="0.5"/></svg>`;
        } else if(locLow.includes('camp')||locLow.includes('tent')||locLow.includes('campfire')||locLow.includes('bivouac')){
            locIcon=`<svg viewBox="0 0 24 24" fill="none"><path d="M4 20L12 5l8 15z" fill="currentColor" opacity="0.1" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/><path d="M9 20l3-6 3 6" stroke="currentColor" stroke-width="0.8" opacity="0.5"/><path d="M12 22Q11 20 12 18Q13 20 12 22z" fill="currentColor" opacity="0.3"/></svg>`;
        } else if(locLow.includes('village')||locLow.includes('town')||locLow.includes('city')||locLow.includes('district')||locLow.includes('ward')){
            locIcon=`<svg viewBox="0 0 24 24" fill="none"><rect x="2" y="12" width="6" height="10" rx="0.5" stroke="currentColor" stroke-width="1"/><rect x="9" y="6" width="6" height="16" rx="0.5" stroke="currentColor" stroke-width="1"/><rect x="16" y="9" width="6" height="13" rx="0.5" stroke="currentColor" stroke-width="1"/><rect x="3.5" y="14" width="1.5" height="1.5" fill="currentColor" opacity="0.3"/><rect x="10.5" y="9" width="1.5" height="1.5" fill="currentColor" opacity="0.3"/><rect x="12.5" y="9" width="1.5" height="1.5" fill="currentColor" opacity="0.3"/><rect x="17.5" y="12" width="1.5" height="1.5" fill="currentColor" opacity="0.3"/></svg>`;
        } else if(locLow.includes('lab')||locLow.includes('workshop')||locLow.includes('forge')||locLow.includes('smithy')||locLow.includes('factory')){
            locIcon=`<svg viewBox="0 0 24 24" fill="none"><path d="M9 2v7l-5 8v3h16v-3l-5-8V2" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/><line x1="8" y1="2" x2="16" y2="2" stroke="currentColor" stroke-width="1" opacity="0.5"/><circle cx="10" cy="15" r="1.2" fill="currentColor" opacity="0.3"/><circle cx="14" cy="14" r="0.8" fill="currentColor" opacity="0.25"/><path d="M4 17h16" stroke="currentColor" stroke-width="0.6" opacity="0.2"/></svg>`;
        } else if(locLow.includes('throne')||locLow.includes('court')||locLow.includes('palace')||locLow.includes('royal')||locLow.includes('manor')){
            locIcon=`<svg viewBox="0 0 24 24" fill="none"><path d="M6 20V10l-2-4h16l-2 4v10" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/><path d="M6 20h12" stroke="currentColor" stroke-width="1"/><path d="M10 10v10M14 10v10" stroke="currentColor" stroke-width="0.6" opacity="0.25"/><path d="M9 4l3-2 3 2" stroke="currentColor" stroke-width="0.8" opacity="0.5" stroke-linejoin="round"/><circle cx="12" cy="7" r="1" fill="currentColor" opacity="0.3"/></svg>`;
        } else {
            // Default: compass waypoint
            locIcon=`<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1" opacity="0.3"/><circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="0.8" opacity="0.5"/><polygon points="12,4 13.5,10 12,8.5 10.5,10" fill="currentColor" opacity="0.6"/><polygon points="12,20 10.5,14 12,15.5 13.5,14" fill="currentColor" opacity="0.3"/><polygon points="4,12 10,10.5 8.5,12 10,13.5" fill="currentColor" opacity="0.3"/><polygon points="20,12 14,13.5 15.5,12 14,10.5" fill="currentColor" opacity="0.3"/><circle cx="12" cy="12" r="1.5" fill="currentColor" opacity="0.4"/></svg>`;
        }
        const loc=document.createElement('div');loc.className='sp-dash-location';loc.dataset.card='location';
        const locParts=(d.location||'').split(/\s*>\s*/);
        const locDisplay=locParts.length>1?[...locParts].reverse().join(' \u2190 '):d.location;
        loc.innerHTML=`<span class="sp-dash-loc-icon">${locIcon}</span><span class="sp-dash-loc-text">${esc(locDisplay)}</span>`;
        // Click icon to trigger location popup
        const locIconEl=loc.querySelector('.sp-dash-loc-icon');
        if(locIconEl)locIconEl.addEventListener('click',()=>{
            const parts=(d.location||'').split('>').map(s=>s.trim()).filter(Boolean).reverse();
            if(!parts.length)return;
            let card=document.getElementById('sp-scene-transition');
            if(!card){card=document.createElement('div');card.id='sp-scene-transition';document.body.appendChild(card)}
            card.innerHTML=`<div class="sp-st-rule"></div>${parts.map(l=>`<span><b>${esc(l)}</b></span>`).join('<span class="sp-st-sep">\u203A</span>')}<div class="sp-st-rule"></div>`;
            card.classList.remove('sp-st-show');void card.offsetWidth;card.classList.add('sp-st-show');
            setTimeout(()=>card.classList.remove('sp-st-show'),4500);
        });
        // Editable location text
        const locTextEl=loc.querySelector('.sp-dash-loc-text');
        if(locTextEl)mkEditable(locTextEl,()=>d.location||'',v=>{d.location=v;const snap=getLatestSnapshot();if(snap)snap.location=v});
        envDiv.appendChild(loc);
    }
    // Hide disabled dashboard cards via CSS class
    for(const[cid,on] of Object.entries(dc)){
        if(on===false){
            const el=envDiv.querySelector(`[data-card="${cid}"]`);
            if(el)el.style.display='none';
        }
    }
    if(s.panels?.dashboard===false)envDiv.classList.add('sp-panel-hidden');
    body.appendChild(envDiv);

    const sceneBadge=(d.sceneMood||'').split(/[,;]/)[0].trim().substring(0,20)||null;
    {const _sec=mkSection('scene','Scene Details',sceneBadge,()=>{
        const f=document.createDocumentFragment();
        const sceneFields=[['Tension','sceneTension'],['Topic','sceneTopic'],['Mood','sceneMood'],['Interaction','sceneInteraction'],['Sounds','soundEnvironment']];
        for(const[l,key]of sceneFields){
            const r=document.createElement('div');r.className='sp-row';r.dataset.ft=key;
            r.innerHTML=`<div class="sp-row-label">${esc(l)}</div>`;
            let displayVal=d[key]||'\u2014';
            if(key==='sceneTension'&&d[key])displayVal=d[key].toUpperCase();
            const val=document.createElement('div');val.className='sp-row-value';val.textContent=displayVal;
            mkEditable(val,()=>d[key]||'',v=>{d[key]=v;const snap=getLatestSnapshot();if(snap)snap[key]=v});
            r.appendChild(val);f.appendChild(r);
        }
        // Present (not editable — derived from characters array)
        {
        const pr=document.createElement('div');pr.className='sp-row';pr.dataset.ft='charactersPresent';pr.innerHTML=`<div class="sp-row-label">${esc('Present')}</div><div class="sp-row-value">${esc((d.charactersPresent||[]).join(', ')||'\u2014')}</div>`;
        f.appendChild(pr);
        }
        return f;
    },s);if(s.panels?.scene===false)_sec.classList.add('sp-panel-hidden');body.appendChild(_sec)}

    const pc=[d.mainQuests,d.sideQuests,d.activeTasks].reduce((n,a)=>n+(Array.isArray(a)?a.length:0),0)+(d.northStar?1:0);
    {const _sec=mkSection('quests','Quest Journal',pc,()=>{
        const f=document.createDocumentFragment();
        // North Star
        {
        const ns=d.northStar||'';
        const nsDiv=document.createElement('div');nsDiv.className='sp-plot-tier sp-tier-star sp-tier-open';nsDiv.dataset.ft='northStar';
        const nsTitle=document.createElement('div');nsTitle.className='sp-plot-tier-title';nsTitle.innerHTML=`<span class="sp-tier-chevron">▶</span><svg class="sp-tier-icon" viewBox="0 0 16 16" fill="none"><polygon points="8,1 9.8,5.8 15,6.2 11,9.6 12.2,15 8,12 3.8,15 5,9.6 1,6.2 6.2,5.8" fill="currentColor" opacity="0.3" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/></svg> North Star`;
        nsTitle.addEventListener('click',()=>nsDiv.classList.toggle('sp-tier-open'));
        const nsBody=document.createElement('div');nsBody.className='sp-tier-body';
        const nsText=document.createElement('div');nsText.className='sp-quest-star';nsText.textContent=ns||'Not yet revealed';
        mkEditable(nsText,()=>d.northStar||'',v=>{d.northStar=v;const snap=getLatestSnapshot();if(snap)snap.northStar=v});
        nsBody.appendChild(nsText);
        nsDiv.appendChild(nsTitle);nsDiv.appendChild(nsBody);
        f.appendChild(nsDiv);
        }
        // Quest categories
        const QUEST_ICONS={
            main:'<svg class="sp-tier-icon" viewBox="0 0 16 16" fill="none"><path d="M3 14V3a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v11l-5-2.5L3 14z" fill="currentColor" opacity="0.2" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/><line x1="6" y1="5" x2="10" y2="5" stroke="currentColor" stroke-width="0.9" opacity="0.5" stroke-linecap="round"/><line x1="6" y1="7.5" x2="10" y2="7.5" stroke="currentColor" stroke-width="0.9" opacity="0.5" stroke-linecap="round"/></svg>',
            side:'<svg class="sp-tier-icon" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.1" fill="currentColor" opacity="0.1"/><path d="M8 4v4.5l3 1.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/><circle cx="8" cy="8" r="1" fill="currentColor" opacity="0.4"/></svg>',
            tasks:'<svg class="sp-tier-icon" viewBox="0 0 16 16" fill="none"><path d="M3.5 8.5l2.5 2.5 6.5-6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><rect x="1.5" y="1.5" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1" opacity="0.3"/></svg>'
        };
        for(const t of[
            {t:'Main Quests',icon:QUEST_ICONS.main,i:d.mainQuests,key:'mainQuests',cls:'sp-tier-main',empty:'No active storyline quests'},
            {t:'Side Quests',icon:QUEST_ICONS.side,i:d.sideQuests,key:'sideQuests',cls:'sp-tier-side',empty:'No side quests discovered'},
            {t:'Active Tasks',icon:QUEST_ICONS.tasks,i:d.activeTasks,key:'activeTasks',cls:'sp-tier-tasks',empty:'No immediate tasks'}
        ]){
            const b=document.createElement('div');b.className=`sp-plot-tier ${t.cls||''}`;b.dataset.ft=t.key;
            // Auto-expand if has quests, collapse if empty
            if(t.i?.length)b.classList.add('sp-tier-open');
            const tierTitle=document.createElement('div');tierTitle.className='sp-plot-tier-title';
            const countBadge=t.i?.length?`<span class="sp-section-badge">${t.i.length}</span>`:'';
            tierTitle.innerHTML=`<span class="sp-tier-chevron">▶</span>${t.icon} ${t.t}${countBadge}`;
            tierTitle.addEventListener('click',()=>b.classList.toggle('sp-tier-open'));
            b.appendChild(tierTitle);
            const tierBody=document.createElement('div');tierBody.className='sp-tier-body';
            if(!t.i?.length){
                const emptyDiv=document.createElement('div');emptyDiv.className='sp-plot-empty';
                emptyDiv.innerHTML=`<span class="sp-plot-empty-text">${esc(t.empty)}</span>`;
                emptyDiv.classList.add('sp-editable');
                emptyDiv.addEventListener('click',(e)=>{
                    e.stopPropagation();
                    const panel=document.getElementById('sp-panel');
                    if(!panel?.classList.contains('sp-edit-mode'))return;
                    if(emptyDiv.contentEditable==='true')return;
                    emptyDiv.contentEditable='true';
                    emptyDiv.classList.add('sp-editing');
                    emptyDiv.textContent='';
                    emptyDiv.focus();
                });
                function saveNewQuest(){
                    if(emptyDiv.contentEditable!=='true')return;
                    emptyDiv.contentEditable='false';
                    emptyDiv.classList.remove('sp-editing');
                    const val=emptyDiv.textContent.trim();
                    if(val){
                        const newQuest={name:val,urgency:'moderate',detail:''};
                        if(!d[t.key])d[t.key]=[];
                        d[t.key].push(newQuest);
                        const snap=getLatestSnapshot();
                        if(snap){if(!snap[t.key])snap[t.key]=[];snap[t.key].push(newQuest);SillyTavern.getContext().saveMetadata()}
                        const norm=normalizeTracker(snap||d);
                        updatePanel(norm);
                        toastr.success('Added: '+val,t.t);
                    } else {
                        emptyDiv.innerHTML=`<span class="sp-plot-empty-text">${esc(t.empty)}</span>`;
                    }
                }
                emptyDiv.addEventListener('blur',saveNewQuest);
                emptyDiv.addEventListener('keydown',(e)=>{if(e.key==='Enter'){e.preventDefault();saveNewQuest()}});
                tierBody.appendChild(emptyDiv);
            }
            else{for(let qi=0;qi<t.i.length;qi++){
                const p=t.i[qi];
                const e=document.createElement('div');e.className='sp-plot-entry';
                const nameEl=document.createElement('span');nameEl.className='sp-plot-name';nameEl.textContent=p.name||'';
                const headerDiv=document.createElement('div');headerDiv.className='sp-quest-header';
                headerDiv.innerHTML=`<span class="sp-quest-chevron">▶</span><span class="sp-plot-status sp-urgency-${p.urgency||'moderate'}">${esc(p.urgency||'moderate')}</span>`;
                headerDiv.appendChild(nameEl);
                headerDiv.addEventListener('click',()=>e.classList.toggle('sp-card-open'));
                e.appendChild(headerDiv);
                const detailEl=document.createElement('div');detailEl.className='sp-quest-detail';
                detailEl.textContent=p.detail||'—';
                if(!p.detail){detailEl.classList.add('sp-empty-field');detailEl.dataset.placeholder='Quest details'}
                mkEditable(detailEl,()=>p.detail||'',v=>{p.detail=v;const snap=getLatestSnapshot();if(snap&&snap[t.key]?.[qi])snap[t.key][qi].detail=v});
                e.appendChild(detailEl);
                mkEditable(nameEl,()=>p.name||'',v=>{p.name=v;const snap=getLatestSnapshot();if(snap&&snap[t.key]?.[qi])snap[t.key][qi].name=v});
                tierBody.appendChild(e);
            }}
            b.appendChild(tierBody);
            f.appendChild(b)}
        return f;
    },s);if(s.panels?.quests===false)_sec.classList.add('sp-panel-hidden');body.appendChild(_sec)}

    {const _sec=mkSection('relationships','Relationships',d.relationships?.length||0,()=>{
        const f=document.createDocumentFragment();
        // Sort: {{char}} (main character) first
        const charName=(SillyTavern.getContext().name2||'').toLowerCase();
        const sortedRels=[...(d.relationships||[])].sort((a,b)=>{
            const aMatch=(a.name||'').toLowerCase().startsWith(charName)||charName.startsWith((a.name||'').toLowerCase());
            const bMatch=(b.name||'').toLowerCase().startsWith(charName)||charName.startsWith((b.name||'').toLowerCase());
            if(aMatch&&!bMatch)return -1;if(bMatch&&!aMatch)return 1;return 0;
        });
        // Build previous-values map for delta badges
        const _prevSnap=getPrevSnapshot(currentSnapshotMesIdx);
        const _prevRelMap={};
        if(_prevSnap?.relationships)for(const pr of(Array.isArray(_prevSnap.relationships)?_prevSnap.relationships:[]))_prevRelMap[(pr.name||'').toLowerCase()]=pr;
        for(let _ri=0;_ri<sortedRels.length;_ri++){
            const rel=sortedRels[_ri];
            // Match rel name to full character name for color consistency and display
            let displayName=rel.name;
            const chars=d.characters||[];
            const relLow=(rel.name||'').toLowerCase();
            for(const ch of chars){
                const chLow=(ch.name||'').toLowerCase();
                if(chLow===relLow||chLow.startsWith(relLow+' ')||relLow.startsWith(chLow+' ')){displayName=ch.name;break}
                const chFirst=chLow.split(/\s/)[0];const relFirst=relLow.split(/\s/)[0];
                if(chFirst===relFirst&&chFirst.length>2){displayName=ch.name;break}
            }
            const cc=charColor(displayName);
            const bl=document.createElement('div');bl.className='sp-rel-block';
            // Auto-expand first, collapse rest when >1
            if(sortedRels.length<=1||_ri===0)bl.classList.add('sp-card-open');
            bl.style.setProperty('--char-bg',cc.bg);bl.style.setProperty('--char-border',cc.border);bl.style.setProperty('--char-accent',cc.accent);
            let hh=`<div class="sp-rel-header"><span class="sp-rel-chevron">▶</span><span class="sp-rel-name">${esc(displayName)}</span>`;
            if(rel.relType)hh+=`<span class="sp-rel-type-badge" data-ft="rel_type">${esc(rel.relType)}</span>`;
            if(rel.relPhase)hh+=`<span class="sp-rel-phase-badge" data-ft="rel_phase">${esc(rel.relPhase)}</span>`;
            hh+=`</div>`;bl.innerHTML=hh;
            // Clickable header toggles body
            bl.querySelector('.sp-rel-header').addEventListener('click',()=>bl.classList.toggle('sp-card-open'));
            // Collapsible body: meta + meters
            const _body=document.createElement('div');_body.className='sp-rel-body';
            {const meta=document.createElement('div');meta.className='sp-rel-meta';
                {
                const ttItem=document.createElement('div');ttItem.className='sp-rel-meta-item';ttItem.dataset.ft='rel_timeknown';
                ttItem.innerHTML=`<span class="sp-rel-meta-label">Time Known</span>`;
                const ttVal=document.createElement('span');ttVal.textContent=rel.timeTogether||'\u2014';
                if(!rel.timeTogether){ttItem.classList.add('sp-empty-field');ttVal.dataset.placeholder='Time known'}
                mkEditable(ttVal,()=>rel.timeTogether||'',v=>{rel.timeTogether=v;const snap=getLatestSnapshot();if(snap){const sr=snap.relationships?.find(r=>r.name===rel.name);if(sr)sr.timeTogether=v}});
                ttItem.appendChild(ttVal);meta.appendChild(ttItem);
                }
                {
                const msItem=document.createElement('div');msItem.className='sp-rel-meta-item sp-rel-milestone';msItem.dataset.ft='rel_milestone';
                msItem.innerHTML=`<span class="sp-rel-meta-label">Milestone</span>`;
                const msVal=document.createElement('span');msVal.textContent=rel.milestone||'\u2014';
                if(!rel.milestone){msItem.classList.add('sp-empty-field');msVal.dataset.placeholder='Milestone'}
                mkEditable(msVal,()=>rel.milestone||'',v=>{rel.milestone=v;const snap=getLatestSnapshot();if(snap){const sr=snap.relationships?.find(r=>r.name===rel.name);if(sr)sr.milestone=v}});
                msItem.appendChild(msVal);meta.appendChild(msItem);
                }
                _body.appendChild(meta)}
            // Unique SVG icons per meter type
            const _meterIcons={
                affection:{
                    up:'<svg class="sp-meter-face" viewBox="0 0 16 16" fill="none"><path d="M8 14s-5.5-3.5-5.5-7A3 3 0 0 1 8 5a3 3 0 0 1 5.5 2c0 3.5-5.5 7-5.5 7z" fill="#4ade80" opacity="0.7"/></svg>',
                    down:'<svg class="sp-meter-face" viewBox="0 0 16 16" fill="none"><path d="M8 14s-5.5-3.5-5.5-7A3 3 0 0 1 8 5a3 3 0 0 1 5.5 2c0 3.5-5.5 7-5.5 7z" fill="#f87171" opacity="0.5"/><line x1="5" y1="4" x2="11" y2="13" stroke="#f87171" stroke-width="1.5" stroke-linecap="round" opacity="0.8"/></svg>'
                },
                trust:{
                    up:'<svg class="sp-meter-face" viewBox="0 0 16 16" fill="none"><path d="M8 1L2 4v4c0 3.5 2.5 5.5 6 7 3.5-1.5 6-3.5 6-7V4L8 1z" fill="#4ade80" opacity="0.5" stroke="#4ade80" stroke-width="0.8"/><path d="M5.5 8l2 2 3.5-3.5" stroke="#4ade80" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/></svg>',
                    down:'<svg class="sp-meter-face" viewBox="0 0 16 16" fill="none"><path d="M8 1L2 4v4c0 3.5 2.5 5.5 6 7 3.5-1.5 6-3.5 6-7V4L8 1z" fill="#f87171" opacity="0.3" stroke="#f87171" stroke-width="0.8"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#f87171" stroke-width="1.3" stroke-linecap="round" opacity="0.7"/></svg>'
                },
                desire:{
                    up:'<svg class="sp-meter-face" viewBox="0 0 16 16" fill="none"><path d="M8 2c-1.5 2-4 4-4 7a4 4 0 0 0 8 0c0-3-2.5-5-4-7z" fill="#4ade80" opacity="0.6"/><path d="M8 7c-.8 1-2 2-2 3.5a2 2 0 0 0 4 0c0-1.5-1.2-2.5-2-3.5z" fill="#4ade80" opacity="0.3"/></svg>',
                    down:'<svg class="sp-meter-face" viewBox="0 0 16 16" fill="none"><path d="M8 2c-1.5 2-4 4-4 7a4 4 0 0 0 8 0c0-3-2.5-5-4-7z" fill="#f87171" opacity="0.3" stroke="#f87171" stroke-width="0.7"/><line x1="4" y1="4" x2="12" y2="12" stroke="#f87171" stroke-width="1.3" stroke-linecap="round" opacity="0.6"/></svg>'
                },
                stress:{
                    neutral:'<svg class="sp-meter-face" viewBox="0 0 16 16" fill="none"><path d="M9 1L5 8h4l-2 7 6-8H9l2-6z" fill="#f59e0b" opacity="0.6" stroke="#f59e0b" stroke-width="0.5" stroke-linejoin="round"/></svg>'
                },
                compatibility:{
                    up:'<svg class="sp-meter-face" viewBox="0 0 16 16" fill="none"><circle cx="5.5" cy="8" r="4" stroke="#4ade80" stroke-width="1.2" opacity="0.5"/><circle cx="10.5" cy="8" r="4" stroke="#4ade80" stroke-width="1.2" opacity="0.5"/><path d="M7 5.5v5M9 5.5v5" stroke="#4ade80" stroke-width="0.8" opacity="0.4"/></svg>',
                    down:'<svg class="sp-meter-face" viewBox="0 0 16 16" fill="none"><circle cx="4" cy="8" r="3.5" stroke="#f87171" stroke-width="1.2" opacity="0.5"/><circle cx="12" cy="8" r="3.5" stroke="#f87171" stroke-width="1.2" opacity="0.5"/></svg>'
                }
            };
            for(const m of[{k:'affection',l:'Affection',ft:'rel_affection'},{k:'trust',l:'Trust',ft:'rel_trust'},{k:'desire',l:'Desire',ft:'rel_desire'},{k:'stress',l:'Stress',ft:'rel_stress'},{k:'compatibility',l:'Compat',ft:'rel_compatibility'}]){
                const v=rel[m.k];const label=rel[m.k+'Label']||'';
                const meterWrap=document.createElement('div');meterWrap.dataset.ft=m.ft;
                const row=document.createElement('div');row.className=`sp-meter-row sp-meter-${m.k}`;
                const labelLow=label.toLowerCase();
                // Delta calculation from previous snapshot (pure local comparison)
                const _prevRel=_prevRelMap[(rel.name||'').toLowerCase()];
                const _prevVal=_prevRel?.[m.k];
                const _delta=(typeof v==='number'&&typeof _prevVal==='number'&&v!==_prevVal)?v-_prevVal:null;
                const _deltaHtml=_delta?`<span class="sp-meter-delta ${_delta>0?'sp-meter-delta-up':'sp-meter-delta-down'}"><span class="sp-meter-delta-arrow">${_delta>0?'\u25B2':'\u25BC'}</span>${_delta>0?'+':''}${_delta}</span>`:'';
                // Per-meter icon: stress=neutral always, others=up/down
                const _icons=_meterIcons[m.k];
                let _faceHtml='';
                if(_delta&&_icons){
                    if(m.k==='stress')_faceHtml=_icons.neutral;
                    else _faceHtml=_delta>0?_icons.up:_icons.down;
                }
                // Previous value marker
                const _prevMarker=(typeof _prevVal==='number'&&_prevVal>=0&&_prevVal<=100)?`<div class="sp-meter-bar-prev" style="left:${clamp(_prevVal,0,100)}%"></div>`:'';
                // Tag inside grid row
                const _isUnknown=labelLow.includes('unknown')||labelLow.includes('unclear')||labelLow.includes('???');
                const _hasTag=label&&label!=='N/A'&&!_isUnknown;
                const _tagHtml=_hasTag?`<div class="sp-meter-tag" data-ft="rel_labels">${esc(label)}</div>`:'';
                if(_hasTag||(_isUnknown&&label))row.classList.add('sp-meter-has-tag');
                // Bar: track clips fill, prev+face overlay on wrap
                const _bar=(w)=>`<div class="sp-meter-bar-wrap"><div class="sp-meter-bar-track"><div class="sp-meter-bar-fill" style="width:${w}%"></div></div>${_prevMarker}${_faceHtml}</div>`;
                // Unknown
                if(labelLow.includes('unknown')||labelLow.includes('unclear')||labelLow.includes('unreadable')||labelLow.includes('???')||labelLow.includes('not yet')){
                    const _uTag=label?`<div class="sp-meter-tag" data-ft="rel_labels">${esc(label)}</div>`:'';
                    row.innerHTML=_uTag+`<div class="sp-meter-label">${esc(m.l)}</div>${_bar(0)}<div class="sp-meter-value-na">?</div>`;
                    meterWrap.appendChild(row);
                // Desire: 0
                } else if(m.k==='desire'&&(v===-1||v===0||label==='N/A'||labelLow.includes('n/a'))){
                    row.innerHTML=_tagHtml+`<div class="sp-meter-label">${esc(m.l)}</div>${_bar(0)}<div class="sp-meter-value">0${_deltaHtml}</div>`;
                    meterWrap.appendChild(row);
                } else if(v===-1||label==='N/A'){
                    row.innerHTML=`<div class="sp-meter-label">${esc(m.l)}</div><div class="sp-meter-bar-na"></div><div class="sp-meter-value-na">N/A</div>`;
                    meterWrap.appendChild(row);
                }else{
                    const cv=clamp(v,0,100);
                    row.innerHTML=_tagHtml+`<div class="sp-meter-label">${esc(m.l)}</div>${_bar(cv)}<div class="sp-meter-value">${cv}${_deltaHtml}</div>`;
                    meterWrap.appendChild(row);
                }
                _body.appendChild(meterWrap);
            }
            bl.appendChild(_body);
            f.appendChild(bl)}
        return f;
    },s);if(s.panels?.relationships===false)_sec.classList.add('sp-panel-hidden');body.appendChild(_sec)}

    {const _sec=mkSection('characters','Characters',d.characters?.length||0,()=>{
        const f=document.createDocumentFragment();
        // Truncate role to concise descriptor: first clause only, max 80 chars
        function shortRole(r){
            if(!r)return '';
            // Take up to first comma, semicolon, period, or dash that separates clauses
            let s=r.replace(/[,;.]\s+(?:who|that|and|but|also|wrongly|cursed|first|known|currently|recently|once|now|the|a|an)\b.*/i,'');
            if(s.length>80)s=s.substring(0,77)+'…';
            return s.trim();
        }
        // Sort: {{char}} first
        const _charName2=(SillyTavern.getContext().name2||'').toLowerCase();
        const sortedChars=(d.characters||[]).map((ch,i)=>({ch,ci:i})).sort((a,b)=>{
            const aMatch=(a.ch.name||'').toLowerCase().startsWith(_charName2)||_charName2.startsWith((a.ch.name||'').toLowerCase());
            const bMatch=(b.ch.name||'').toLowerCase().startsWith(_charName2)||_charName2.startsWith((b.ch.name||'').toLowerCase());
            if(aMatch&&!bMatch)return -1;if(bMatch&&!aMatch)return 1;return 0;
        });
        for(let _ci2=0;_ci2<sortedChars.length;_ci2++){
            const{ch,ci}=sortedChars[_ci2];
            const cc=charColor(ch.name);
            const cd=document.createElement('div');cd.className='sp-char-card';
            // Auto-expand first, collapse rest when >1
            if(sortedChars.length<=1||_ci2===0)cd.classList.add('sp-card-open');
            cd.style.setProperty('--char-bg',cc.bg);cd.style.setProperty('--char-border',cc.border);cd.style.setProperty('--char-accent',cc.accent);
            const roleShort=shortRole(ch.role);
            cd.innerHTML=`<div class="sp-char-header"><span class="sp-char-chevron">▶</span><span class="sp-char-name">${esc(ch.name)}</span>${roleShort?`<span class="sp-char-role-badge">${esc(roleShort)}</span>`:''}</div>`;
            // Click header to toggle
            cd.querySelector('.sp-char-header').addEventListener('click',()=>cd.classList.toggle('sp-card-open'));
            // Collapsible body
            const _cbody=document.createElement('div');_cbody.className='sp-char-body';
            // Appearance grid
            {
            const gr=document.createElement('div');gr.className='sp-char-grid';gr.dataset.ft='char_appearance';
            const appearMap={hair:'char_hair',face:'char_hair',outfit:'char_outfit',stateOfDress:'char_outfit',posture:'char_posture',proximity:'char_posture',physicalState:'char_physical'};
            const appearFields=[['Hair','hair'],['Face','face'],['Outfit','outfit'],['Dress','stateOfDress'],['Posture','posture'],['Proximity','proximity'],['Physical','physicalState']];
            for(const[l,key]of appearFields){
                const v=ch[key]||'';
                const fd=document.createElement('div');fd.className='sp-char-field';fd.textContent=l;fd.dataset.ft=appearMap[key];
                const vd=document.createElement('div');vd.className='sp-char-val';vd.textContent=v||'\u2014';vd.dataset.ft=appearMap[key];
                if(!v){fd.classList.add('sp-empty-field');vd.classList.add('sp-empty-field');vd.dataset.placeholder=l}
                mkEditable(vd,()=>ch[key]||'',nv=>{ch[key]=nv;const snap=getLatestSnapshot();if(snap?.characters?.[ci])snap.characters[ci][key]=nv});
                gr.appendChild(fd);gr.appendChild(vd);
            }
            if(Array.isArray(ch.inventory)&&ch.inventory.length){
                const fd=document.createElement('div');fd.className='sp-char-field';fd.textContent='Inventory';fd.dataset.ft='char_inventory';
                const vd=document.createElement('div');vd.className='sp-char-val';vd.textContent=ch.inventory.join(', ');vd.dataset.ft='char_inventory';
                gr.appendChild(fd);gr.appendChild(vd);
            }
            if(gr.children.length)_cbody.appendChild(gr);
            }
            // Goals
            {
            {const gs=document.createElement('div');gs.className='sp-char-goals';gs.dataset.ft='char_goals';
                const gg=document.createElement('div');gg.className='sp-char-grid';
                for(const[l,key]of[['Need','immediateNeed'],['Short-Term','shortTermGoal'],['Long-Term','longTermGoal']]){
                    const v=ch[key]||'';
                    const fd=document.createElement('div');fd.className='sp-char-field';fd.textContent=l;
                    const vd=document.createElement('div');vd.className='sp-char-val';vd.textContent=v||'\u2014';
                    if(!v){fd.classList.add('sp-empty-field');vd.classList.add('sp-empty-field');vd.dataset.placeholder=l}
                    mkEditable(vd,()=>ch[key]||'',nv=>{ch[key]=nv;const snap=getLatestSnapshot();if(snap?.characters?.[ci])snap.characters[ci][key]=nv});
                    gg.appendChild(fd);gg.appendChild(vd);
                }
                gs.appendChild(gg);_cbody.appendChild(gs)}
            }
            {const _isEdit=document.getElementById('sp-panel')?.classList.contains('sp-edit-mode');
            const _showFert=ch.fertStatus&&(ch.fertStatus!=='N/A'||_isEdit);
            if(_showFert||_isEdit){const fertDiv=document.createElement('div');fertDiv.className='sp-fert-section';fertDiv.dataset.ft='char_fertility';
                if(ch.fertStatus==='N/A'&&!_isEdit)fertDiv.innerHTML=`<div class="sp-fert-na">Fertility: N/A \u2014 ${esc(ch.fertReason||'n/a')}</div>`;
                else{const fg=document.createElement('div');fg.className='sp-char-grid';
                    // Group fertility fields: status+reason, cycle+day, window+pregnancy+week, notes
                    const fertFields=[['Status','fertStatus'],['Reason','fertReason'],['Cycle','fertCyclePhase']];
                    // Compact row for day + window on one line
                    const fertInline=[['Day','fertCycleDay'],['Window','fertWindow'],['Pregnancy','fertPregnancy'],['Week','fertPregWeek']];
                    for(const[l,key]of fertFields){
                        const v=String(ch[key]||'');
                        const fd=document.createElement('div');fd.className='sp-char-field';fd.textContent=l;
                        const vd=document.createElement('div');vd.className='sp-char-val';vd.textContent=v||'\u2014';
                        if(!v){vd.classList.add('sp-empty-field');vd.dataset.placeholder=l}
                        mkEditable(vd,()=>String(ch[key]||''),nv=>{ch[key]=nv;const snap=getLatestSnapshot();if(snap?.characters?.[ci])snap.characters[ci][key]=nv});
                        fg.appendChild(fd);fg.appendChild(vd);
                    }
                    // Inline compact row for short fields (Day/Window/Pregnancy/Week)
                    const inlineLabel=document.createElement('div');inlineLabel.className='sp-char-field';inlineLabel.style.cssText='grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap;padding:2px 0';
                    for(const[l,key]of fertInline){
                        const v=String(ch[key]||'');if(!v&&!_isEdit)continue;
                        const span=document.createElement('span');span.className='sp-fert-inline';
                        span.innerHTML=`<span class="sp-fert-inline-label">${esc(l)}</span> <span class="sp-fert-inline-val">${esc(v||'\u2014')}</span>`;
                        mkEditable(span.querySelector('.sp-fert-inline-val'),()=>String(ch[key]||''),nv=>{ch[key]=nv;const snap=getLatestSnapshot();if(snap?.characters?.[ci])snap.characters[ci][key]=nv});
                        inlineLabel.appendChild(span);
                    }
                    if(inlineLabel.children.length)fg.appendChild(inlineLabel);
                    // Notes as full-width row
                    if(ch.fertNotes||_isEdit){
                        const fd=document.createElement('div');fd.className='sp-char-field';fd.textContent='Notes';
                        const vd=document.createElement('div');vd.className='sp-char-val';vd.textContent=ch.fertNotes||'\u2014';
                        if(!ch.fertNotes){vd.classList.add('sp-empty-field');vd.dataset.placeholder='Notes'}
                        mkEditable(vd,()=>String(ch.fertNotes||''),nv=>{ch.fertNotes=nv;const snap=getLatestSnapshot();if(snap?.characters?.[ci])snap.characters[ci].fertNotes=nv});
                        fg.appendChild(fd);fg.appendChild(vd);
                    }
                    fertDiv.appendChild(fg)}
                _cbody.appendChild(fertDiv)}
            }
            cd.appendChild(_cbody);
            f.appendChild(cd)}
        return f;
    },s);if(s.panels?.characters===false)_sec.classList.add('sp-panel-hidden');body.appendChild(_sec)}

    {const _sec=mkSection('branches','Story Ideas',d.plotBranches?.length||0,()=>{
        const f=document.createDocumentFragment();
        if(!d.plotBranches?.length){f.appendChild(Object.assign(document.createElement('div'),{className:'sp-row',innerHTML:'<div class="sp-row-value" style="color:var(--sp-text-dim);font-style:italic">None suggested yet</div>'}));return f}
        // Category metadata: icon SVGs, colors, labels
        const cats={
            dramatic:{label:'Dramatic',color:'#c47a9a',icon:'<svg viewBox="0 0 16 16" fill="none"><path d="M8 2C5 2 3 5 3 8c0 2 1.5 4 3.5 5L8 14.5 9.5 13C11.5 12 13 10 13 8c0-3-2-6-5-6z" fill="currentColor" opacity="0.2" stroke="currentColor" stroke-width="1.1"/><path d="M6.5 7.5Q7 6 8 6Q9 6 9.5 7.5" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" opacity="0.6"/></svg>'},
            intense:{label:'Intense',color:'#d45050',icon:'<svg viewBox="0 0 16 16" fill="none"><polygon points="8,1 10,6 15,6.5 11,10 12.5,15 8,12 3.5,15 5,10 1,6.5 6,6" fill="currentColor" opacity="0.2" stroke="currentColor" stroke-width="1"/></svg>'},
            comedic:{label:'Comedic',color:'#d4a855',icon:'<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1.1"/><circle cx="5.8" cy="6.5" r="0.8" fill="currentColor" opacity="0.5"/><circle cx="10.2" cy="6.5" r="0.8" fill="currentColor" opacity="0.5"/><path d="M5.5 9.5Q8 12.5 10.5 9.5" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" fill="none"/></svg>'},
            twist:{label:'Twist',color:'#9070c0',icon:'<svg viewBox="0 0 16 16" fill="none"><path d="M4 12L8 4l4 8" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><circle cx="8" cy="10" r="1.2" fill="currentColor" opacity="0.4"/><line x1="8" y1="5.5" x2="8" y2="8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.6"/></svg>'},
            exploratory:{label:'Exploratory',color:'#5b9cc4',icon:'<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.1"/><path d="M8 2v2M8 12v2M2 8h2M12 8h2" stroke="currentColor" stroke-width="0.8" opacity="0.4" stroke-linecap="round"/><polygon points="8,5 9.5,7.5 8,7 6.5,7.5" fill="currentColor" opacity="0.5"/><circle cx="8" cy="8" r="1" fill="currentColor" opacity="0.3"/></svg>'}
        };
        for(const b of d.plotBranches){
            const cat=cats[b.type]||cats.exploratory;
            const c=document.createElement('div');c.className=`sp-idea-card sp-idea-${b.type}`;c.dataset.ft='branch_'+b.type;
            c.style.setProperty('--idea-color',cat.color);
            c.innerHTML=`<div class="sp-idea-header"><span class="sp-idea-chevron">▶</span><span class="sp-idea-icon">${cat.icon}</span><span class="sp-idea-type">${cat.label}</span><span class="sp-idea-name">${esc(b.name)}</span><span class="sp-idea-spacer"></span><span class="sp-idea-paste" title="Paste to message box (edit before sending)"><svg viewBox="0 0 16 16" width="12" height="12" fill="none"><rect x="3" y="2" width="10" height="12" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M6 1.5h4a1 1 0 0 1 1 1V3H5v-.5a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="0.8" opacity="0.6"/><line x1="5.5" y1="6" x2="10.5" y2="6" stroke="currentColor" stroke-width="0.8" opacity="0.5"/><line x1="5.5" y1="8.5" x2="10.5" y2="8.5" stroke="currentColor" stroke-width="0.8" opacity="0.5"/><line x1="5.5" y1="11" x2="8.5" y2="11" stroke="currentColor" stroke-width="0.8" opacity="0.5"/></svg></span><span class="sp-idea-inject" title="Send immediately and generate"><svg viewBox="0 0 16 16" width="12" height="12" fill="none"><path d="M3 2.5L13 8L3 13.5V9.5L9 8L3 6.5z" fill="currentColor" opacity="0.7" stroke="currentColor" stroke-width="0.8" stroke-linejoin="round"/></svg></span></div><div class="sp-idea-body"><div class="sp-idea-hook">${esc(b.hook)}</div></div>`;
            // Click header to toggle body
            c.querySelector('.sp-idea-header').addEventListener('click',(e)=>{
                if(e.target.closest('.sp-idea-paste')||e.target.closest('.sp-idea-inject'))return;
                c.classList.toggle('sp-card-open');
            });
            // Paste button: insert into textbox for editing
            c.querySelector('.sp-idea-paste').addEventListener('click',(e)=>{
                e.stopPropagation();
                const direction=`[OOC: Take the story in a ${b.type} direction — "${b.name}". ${b.hook}]`;
                const textarea=document.getElementById('send_textarea');
                if(textarea){
                    textarea.value=direction;
                    textarea.dispatchEvent(new Event('input',{bubbles:true}));
                    textarea.focus();
                    toastr.info(`${cat.label}: ${b.name}`,'Pasted — edit and send when ready');
                }
            });
            // Send button: inject and generate immediately
            c.querySelector('.sp-idea-inject').addEventListener('click',(e)=>{
                e.stopPropagation();
                injectStoryIdea(b,cat);
            });
            f.appendChild(c);
        }
        return f;
    },s);if(s.panels?.storyIdeas===false)_sec.classList.add('sp-panel-hidden');body.appendChild(_sec)}

    // ── Custom Panels ──
    const customPanels=s.customPanels||[];
    for(const cp of customPanels){
        if(!cp.fields?.length)continue;
        const cpKey='custom_'+cp.name.replace(/\s+/g,'_').toLowerCase();
        // Count non-empty fields
        let fieldCount=0;
        for(const f of cp.fields){if(d[f.key]!=null&&d[f.key]!=='')fieldCount++}
        body.appendChild(mkSection(cpKey,cp.name,fieldCount||null,()=>{
            const frag=document.createDocumentFragment();
            for(const f of cp.fields){
                const r=document.createElement('div');r.className='sp-row';
                r.innerHTML=`<div class="sp-row-label">${esc(f.label||f.key)}</div>`;
                const rawVal=d[f.key];
                if(f.type==='meter'){
                    // Render as a mini progress bar
                    const num=parseInt(rawVal)||0;
                    const wrap=document.createElement('div');wrap.className='sp-row-value sp-cp-meter-wrap';
                    wrap.innerHTML=`<div class="sp-cp-meter"><div class="sp-cp-meter-fill" style="width:${clamp(num,0,100)}%"></div></div><span class="sp-cp-meter-val">${num}</span>`;
                    r.appendChild(wrap);
                } else if(f.type==='list'&&Array.isArray(rawVal)){
                    const val=document.createElement('div');val.className='sp-row-value';val.textContent=rawVal.join(', ')||'\u2014';
                    r.appendChild(val);
                } else {
                    const val=document.createElement('div');val.className='sp-row-value';val.textContent=str(rawVal)||'\u2014';
                    mkEditable(val,()=>str(d[f.key])||'',v=>{d[f.key]=v;const snap=getLatestSnapshot();if(snap)snap[f.key]=v});
                    r.appendChild(val);
                }
                frag.appendChild(r);
            }
            return frag;
        },s));
    }

    // Timeline scrubber — shows all snapshot positions (skip during scrub to avoid rebuilding)
    if(!_isTimelineScrub)renderTimeline();

    // ── Generation stats footer (reads from snapshot metadata, persists across refresh) ──
    const _meta=d._spMeta||{};
    const _mTokens=_meta.completionTokens||genMeta.completionTokens||0;
    const _mElapsed=_meta.elapsed||genMeta.elapsed||0;
    const _mSource=_meta.source||lastGenSource||'';
    const _mInject=_meta.injectionMethod||s.injectionMethod||'inline';
    if(_mTokens>0||_mElapsed>0||_mSource){
        const footer=document.createElement('div');footer.className='sp-gen-footer';
        let fhtml='';
        if(currentSnapshotMesIdx>=0)fhtml+=`<span title="Message index"><svg viewBox="0 0 14 14" width="11" height="11" fill="none"><path d="M2 11V3a1 1 0 0 1 1-1h5l4 4v5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z" stroke="currentColor" stroke-width="1.1"/><path d="M7 2v4h4" stroke="currentColor" stroke-width="0.9" opacity="0.5"/></svg> #${currentSnapshotMesIdx}</span>`;
        if(_mTokens>0)fhtml+=`<span title="Estimated tokens"><svg viewBox="0 0 14 14" width="11" height="11" fill="none"><rect x="1" y="3" width="12" height="8" rx="1" stroke="currentColor" stroke-width="1.1"/><line x1="4" y1="6" x2="4" y2="9" stroke="currentColor" stroke-width="1.2" opacity="0.6"/><line x1="7" y1="5" x2="7" y2="9" stroke="currentColor" stroke-width="1.2" opacity="0.5"/><line x1="10" y1="7" x2="10" y2="9" stroke="currentColor" stroke-width="1.2" opacity="0.4"/></svg> ~${_mTokens.toLocaleString()}</span>`;
        if(_mElapsed>0)fhtml+=`<span title="Generation time"><svg viewBox="0 0 14 14" width="11" height="11" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.1"/><path d="M7 4v3.5l2.5 1.5" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg> ${_mElapsed.toFixed(1)}s</span>`;
        if(_mInject==='inline')fhtml+=`<span title="Together mode" class="sp-gen-badge-mode"><svg viewBox="0 0 14 14" width="11" height="11" fill="none"><path d="M2 7h4l1.5-3 2 6 1.5-3h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg> Together</span>`;
        else fhtml+=`<span title="Separate mode" class="sp-gen-badge-mode"><svg viewBox="0 0 14 14" width="11" height="11" fill="none"><circle cx="4.5" cy="7" r="3" stroke="currentColor" stroke-width="1"/><circle cx="9.5" cy="7" r="3" stroke="currentColor" stroke-width="1"/></svg> Separate</span>`;
        if(_mSource){
            const srcMap={'auto:together':'Auto','auto:together:backup':'Backup','auto:together:fallback':'Fallback','auto:separate':'Auto','manual:full':'Full regen','manual:settings':'Settings','manual:message':'Msg regen','manual:thoughts':'Thoughts'};
            let srcLabel=srcMap[_mSource]||'';
            if(!srcLabel&&_mSource.startsWith('manual:section:'))srcLabel=_mSource.replace('manual:section:','');
            const isFallback=_mSource.includes('fallback');
            const isBackup=_mSource.includes('backup');
            const cls=isFallback?'sp-gen-src sp-gen-src-warn':isBackup?'sp-gen-src sp-gen-src-warn':'sp-gen-src';
            if(srcLabel)fhtml+=`<span title="Source: ${esc(_mSource)}" class="${cls}"><svg viewBox="0 0 14 14" width="11" height="11" fill="none"><circle cx="7" cy="7" r="2" fill="currentColor" opacity="0.4"/><circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1" opacity="0.4"/></svg> ${esc(srcLabel)}</span>`;
        }
        footer.innerHTML=fhtml;
        body.appendChild(footer);
    }
    // Apply field toggle visibility — CSS-only, no rebuilds
    const _ft=s.fieldToggles||{};
    const _dc=s.dashCards||DEFAULTS.dashCards;
    body.querySelectorAll('[data-ft]').forEach(el=>{
        const k=el.dataset.ft;
        const on=_dc[k]!==undefined?_dc[k]!==false:_ft[k]!==false;
        el.style.display=on?'':'none';
    });
    log('⏱ updatePanel:',((performance.now()-_perfStart)|0)+'ms');
}

function mkSection(key,title,badge,fn,s){
    const sec=document.createElement('div');sec.className='sp-section'+((s.openSections?.[key])?' sp-open':'');sec.dataset.key=key;
    const h=document.createElement('div');h.className='sp-section-header';
    h.innerHTML=`<span class="sp-section-chevron">▶</span><span class="sp-section-title">${esc(title)}</span>${badge!=null?`<span class="sp-section-badge">${esc(String(badge))}</span>`:''}<span class="sp-section-spacer"></span><button class="sp-section-refresh" title="Refresh ${title}"><svg viewBox="0 0 16 16" width="12" height="12" fill="none"><path d="M13.5 8a5.5 5.5 0 1 1-1.3-3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M13.5 3v2h-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
    const chevronArea=h.querySelector('.sp-section-chevron');
    // Click anywhere on header toggles, except refresh button (debounced)
    let _secDebounce=false;
    h.addEventListener('click',(e)=>{
        if(e.target.closest('.sp-section-refresh'))return;
        if(_secDebounce)return;_secDebounce=true;setTimeout(()=>_secDebounce=false,200);
        e.stopPropagation();sec.classList.toggle('sp-open');
        const st=getSettings();if(!st.openSections)st.openSections={};
        st.openSections[key]=sec.classList.contains('sp-open');saveSettings();
    });
    // Refresh button regenerates just this section
    h.querySelector('.sp-section-refresh').addEventListener('click',async(e)=>{
        e.stopPropagation();
        if(generating){toastr.warning('Generation already in progress');return}
        const{chat}=SillyTavern.getContext();if(!chat.length)return;
        const btn=e.target.closest('.sp-section-refresh');btn.classList.add('sp-spinning');
        // Show loading overlay on section content — existing content visible behind
        const content=sec.querySelector('.sp-section-content');
        showLoadingOverlay(content,'Refreshing '+title,'',true);
        // Ensure section is open so user sees the loading
        if(!sec.classList.contains('sp-open'))sec.classList.add('sp-open');
        lastGenSource='manual:section:'+key;
        showStopButton();
        await generateTracker(chat.length-1,key);
        hideStopButton();
        btn.classList.remove('sp-spinning');
        clearLoadingOverlay(content);
    });
    const bd=document.createElement('div');bd.className='sp-section-body';
    const ct=document.createElement('div');ct.className='sp-section-content';
    ct.appendChild(fn());bd.appendChild(ct);sec.appendChild(h);sec.appendChild(bd);return sec;
}

// ── Thought Panel (draggable, shows internal dialogue + goals) ──
function createThoughtPanel(){
    if(document.getElementById('sp-thought-panel'))return;
    const tp=document.createElement('div');tp.id='sp-thought-panel';
    const s=getSettings();
    const pos=s.thoughtPos||{x:10,y:80};
    tp.style.left=pos.x+'px';tp.style.top=pos.y+'px';
    tp.innerHTML=`<div class="sp-tp-header" id="sp-tp-drag">
        <svg class="sp-tp-drag-grip" width="16" height="4" viewBox="0 0 16 4" style="opacity:0.15"><rect y="0" width="16" height="1.5" rx="0.75" fill="currentColor"/><rect y="2.5" width="16" height="1.5" rx="0.75" fill="currentColor"/></svg>
        <span class="sp-tp-title">Inner Thoughts</span>
        <span class="sp-tp-header-spacer"></span>
        <button class="sp-tp-snapleft${s.thoughtSnapLeft!==false?' sp-tb-active':''}" title="Snap to left of chat"><svg viewBox="0 0 16 16" width="15" height="15" fill="none"><rect x="1" y="2" width="6" height="12" rx="1" stroke="currentColor" stroke-width="1.2" opacity="0.8"/><rect x="9" y="2" width="6" height="12" rx="1" stroke="currentColor" stroke-width="1.2" opacity="0.35"/><path d="M4.5 6.5L2.5 8l2 1.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <button class="sp-tp-ghost${s.thoughtGhost!==false?' sp-tb-active':''}" title="Ghost mode — hide panel frame"><svg viewBox="0 0 20 20" width="15" height="15" fill="none"><path d="M10 2C6.5 2 4 4.8 4 7.5v7c0 .4.2.7.5.5l1.5-1.2 1.5 1.2c.3.2.7.2 1 0L10 13.8l1.5 1.2c.3.2.7.2 1 0l1.5-1.2 1.5 1.2c.3.2.5-.1.5-.5v-7C16 4.8 13.5 2 10 2z" fill="currentColor" opacity="0.12" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/><ellipse cx="7.8" cy="8" rx="1.3" ry="1.6" fill="currentColor" opacity="0.7"/><ellipse cx="12.2" cy="8" rx="1.3" ry="1.6" fill="currentColor" opacity="0.7"/><circle cx="7.8" cy="7.6" r="0.5" fill="var(--sp-bg, #161820)"/><circle cx="12.2" cy="7.6" r="0.5" fill="var(--sp-bg, #161820)"/><ellipse cx="10" cy="11" rx="1.5" ry="1" fill="currentColor" opacity="0.2"/></svg></button>
        <button class="sp-tp-regen" title="Regenerate thoughts"><svg viewBox="0 0 16 16" width="15" height="15" fill="none"><path d="M13.5 8a5.5 5.5 0 1 1-1.3-3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M13.5 3v2.5h-2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <button class="sp-tp-close" title="Hide thoughts"><svg viewBox="0 0 12 12" width="13" height="13" fill="none"><line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>
    </div><div id="sp-tp-body"></div>
    <div class="sp-tp-resize" title="Resize"><svg viewBox="0 0 16 16" fill="none"><line x1="14" y1="2" x2="2" y2="14" stroke="currentColor" stroke-width="1" opacity="0.4"/><line x1="14" y1="6" x2="6" y2="14" stroke="currentColor" stroke-width="1" opacity="0.4"/><line x1="14" y1="10" x2="10" y2="14" stroke="currentColor" stroke-width="1" opacity="0.4"/></svg></div>`;
    document.body.appendChild(tp);

    // Snap-left toggle button
    tp.querySelector('.sp-tp-snapleft').addEventListener('click',(e)=>{
        e.stopPropagation();
        const st=getSettings();
        st.thoughtSnapLeft=st.thoughtSnapLeft!==false?false:true;
        saveSettings();
        const btn=e.currentTarget;
        btn.classList.toggle('sp-tb-active',st.thoughtSnapLeft!==false);
        if(st.thoughtSnapLeft!==false){
            snapThoughtToLeft();
            toastr.info('Snapped to left of chat');
        } else {
            toastr.info('Free positioning enabled');
        }
    });
    // Apply snap-left on creation if enabled
    if(s.thoughtSnapLeft!==false)setTimeout(()=>snapThoughtToLeft(),50);

    // Ghost mode toggle — hides panel chrome, leaves thought cards floating
    tp.querySelector('.sp-tp-ghost').addEventListener('click',(e)=>{
        e.stopPropagation();
        const st=getSettings();
        st.thoughtGhost=st.thoughtGhost!==false?false:true;
        saveSettings();
        const btn=e.currentTarget;
        btn.classList.toggle('sp-tb-active',st.thoughtGhost!==false);
        tp.classList.toggle('sp-tp-ghost-mode',st.thoughtGhost!==false);
    });
    // Apply ghost on creation if enabled
    if(s.thoughtGhost!==false)tp.classList.add('sp-tp-ghost-mode');

    // Regen button
    tp.querySelector('.sp-tp-regen').addEventListener('click',async(e)=>{
        e.stopPropagation();
        if(generating){toastr.warning('Generation already in progress');return}
        const s=getSettings();if(!s.enabled){toastr.warning('ScenePulse is disabled');return}
        const btn=e.currentTarget;
        if(btn.classList.contains('sp-spinning'))return;
        btn.classList.add('sp-spinning');
        const{chat}=SillyTavern.getContext();
        if(!chat.length){btn.classList.remove('sp-spinning');return}
        // Show loading overlay inside thought body — existing content visible behind
        showThoughtLoading('Regenerating thoughts','Analyzing context');
        showStopButton();
        log('Thought regen: starting...');
        lastGenSource='manual:thoughts';
        const result=await generateTracker(chat.length-1);
        btn.classList.remove('sp-spinning');
        hideStopButton();
        clearThoughtLoading();
        if(result){
            const norm=normalizeTracker(result);
            updatePanel(norm);
            toastr.success('Regenerated');
        } else {
            toastr.error('Regeneration failed');
        }
    });

    // Close button — blocked during loading to prevent showThoughts=false persisting
    tp.querySelector('.sp-tp-close').addEventListener('click',()=>{
        if(tp.classList.contains('sp-tp-loading-active')){log('Close blocked: loading active');return}
        tp.classList.remove('sp-tp-visible');
        const st=getSettings();st.showThoughts=false;saveSettings();
        // Sync toolbar button
        const btn=document.getElementById('sp-tb-thoughts');if(btn)btn.classList.remove('sp-tb-active');
        // Sync settings checkbox
        const cb=document.getElementById('sp-show-thoughts');if(cb)cb.checked=false;
    });

    // Drag support (mouse + touch)
    const drag=tp.querySelector('#sp-tp-drag');
    let dragging=false,dx=0,dy=0;
    function dragStart(cx,cy,e){
        if(e.target.closest('.sp-tp-close')||e.target.closest('.sp-tp-regen')||e.target.closest('.sp-tp-snapleft')||e.target.closest('.sp-tp-ghost'))return;
        dragging=true;dx=cx-tp.offsetLeft;dy=cy-tp.offsetTop;
        e.preventDefault();
    }
    function dragMove(cx,cy){if(!dragging)return;tp.style.left=Math.max(0,cx-dx)+'px';tp.style.top=Math.max(0,cy-dy)+'px'}
    function dragEnd(){
        if(!dragging)return;dragging=false;
        const st=getSettings();st.thoughtPos={x:tp.offsetLeft,y:tp.offsetTop};
        if(st.thoughtSnapLeft){st.thoughtSnapLeft=false;const slBtn=tp.querySelector('.sp-tp-snapleft');if(slBtn)slBtn.classList.remove('sp-tb-active')}
        saveSettings();
    }
    drag.addEventListener('mousedown',(e)=>dragStart(e.clientX,e.clientY,e));
    document.addEventListener('mousemove',(e)=>dragMove(e.clientX,e.clientY));
    document.addEventListener('mouseup',dragEnd);
    drag.addEventListener('touchstart',(e)=>{const t=e.touches[0];dragStart(t.clientX,t.clientY,e)},{passive:false});
    document.addEventListener('touchmove',(e)=>{if(!dragging)return;const t=e.touches[0];dragMove(t.clientX,t.clientY)},{passive:true});
    document.addEventListener('touchend',dragEnd);

    // Resize handle (mouse + touch)
    const resizeHandle=tp.querySelector('.sp-tp-resize');
    let resizing=false,rStartX=0,rStartY=0,rStartW=0,rStartH=0;
    function resizeStart(cx,cy,e){resizing=true;rStartX=cx;rStartY=cy;rStartW=tp.offsetWidth;rStartH=tp.offsetHeight;e.preventDefault();e.stopPropagation()}
    function resizeMove(cx,cy){if(!resizing)return;tp.style.width=Math.max(180,rStartW+(cx-rStartX))+'px';tp.style.height=Math.max(100,rStartH+(cy-rStartY))+'px'}
    function resizeEnd(){if(!resizing)return;resizing=false;const st=getSettings();st.thoughtSize={w:tp.offsetWidth,h:tp.offsetHeight};saveSettings()}
    resizeHandle.addEventListener('mousedown',(e)=>resizeStart(e.clientX,e.clientY,e));
    document.addEventListener('mousemove',(e)=>resizeMove(e.clientX,e.clientY));
    document.addEventListener('mouseup',resizeEnd);
    resizeHandle.addEventListener('touchstart',(e)=>{const t=e.touches[0];resizeStart(t.clientX,t.clientY,e)},{passive:false});
    document.addEventListener('touchmove',(e)=>{if(!resizing)return;const t=e.touches[0];resizeMove(t.clientX,t.clientY)},{passive:true});
    document.addEventListener('touchend',resizeEnd);
    log('Thought panel created');
}

function updateThoughts(d){
    createThoughtPanel();
    const panel=document.getElementById('sp-thought-panel');if(!panel){warn('Thought panel not found');return}
    const body=document.getElementById('sp-tp-body');if(!body){warn('Thought body not found');return}body.innerHTML='';
    const s=getSettings();
    log('updateThoughts: chars=',d?.characters?.length||0,'showThoughts=',s.showThoughts,'loadingActive=',panel.classList.contains('sp-tp-loading-active'));
    if(!d?.characters?.length||s.showThoughts===false){
        if(s.showThoughts===false)log('updateThoughts: hidden (showThoughts=false)');
        panel.classList.remove('sp-tp-visible');return;
    }
    // Sort: {{char}} first
    const _tpCharName=(SillyTavern.getContext().name2||'').toLowerCase();
    const sortedTpChars=[...d.characters].sort((a,b)=>{
        const aMatch=(a.name||'').toLowerCase().startsWith(_tpCharName)||_tpCharName.startsWith((a.name||'').toLowerCase());
        const bMatch=(b.name||'').toLowerCase().startsWith(_tpCharName)||_tpCharName.startsWith((b.name||'').toLowerCase());
        if(aMatch&&!bMatch)return -1;if(bMatch&&!aMatch)return 1;return 0;
    });
    for(const ch of sortedTpChars){
        const cc=charColor(ch.name);
        const card=document.createElement('div');card.className='sp-tp-card';
        card.style.setProperty('--char-bg',cc.bg);card.style.setProperty('--char-border',cc.border);card.style.setProperty('--char-accent',cc.accent);
        // SVG thought bubble icon
        const thoughtIcon=`<svg class="sp-tp-name-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="12" cy="9.5" rx="9" ry="7" fill="currentColor" opacity="0.12" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/><circle cx="6.5" cy="18.5" r="2" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="0.8"/><circle cx="4" cy="21.5" r="1.2" fill="currentColor" opacity="0.1" stroke="currentColor" stroke-width="0.6"/><circle cx="9" cy="9.5" r="0.9" fill="currentColor" opacity="0.35"/><circle cx="12" cy="9.5" r="0.9" fill="currentColor" opacity="0.35"/><circle cx="15" cy="9.5" r="0.9" fill="currentColor" opacity="0.35"/></svg>`;
        let html=`<div class="sp-tp-name">${thoughtIcon}${esc(ch.name)}</div>`;
        // Inner dialogue — pure first-person thought, limited to 1-3 sentences
        const thought=ch.innerThought||'';
        if(thought){
            const sentences=thought.match(/[^.!?]+[.!?]+/g)||[thought];
            let th=0;for(let i=0;i<thought.length;i++)th=((th<<5)-th+thought.charCodeAt(i))|0;
            const sentenceLimit=(Math.abs(th)%3)+1;
            const limited=sentences.slice(0,sentenceLimit).join(' ').trim();
            html+=`<div class="sp-tp-monologue">${esc(limited)}</div>`;
        } else {
            html+=`<div class="sp-tp-monologue sp-tp-monologue-empty">\u2026</div>`;
        }
        card.innerHTML=html;
        body.appendChild(card);
    }
    // Sync visibility with main panel
    syncThoughts();
    // Auto-fit panel to content — defer to next frame so layout has completed
    requestAnimationFrame(()=>requestAnimationFrame(()=>autoFitThoughtPanel()));
}
// ── Auto-fit thought panel to its content height ──
function autoFitThoughtPanel(){
    const tp=document.getElementById('sp-thought-panel');
    if(!tp||!tp.classList.contains('sp-tp-visible'))return;
    // Step 1: Remove constraints so panel can grow to natural content size
    tp.style.height='auto';
    tp.style.maxHeight='none';
    // Step 2: After layout settles, read actual height and cap at 85vh
    setTimeout(()=>{
        if(!tp.classList.contains('sp-tp-visible'))return;
        const natural=tp.scrollHeight;
        const maxH=window.innerHeight*0.85;
        tp.style.maxHeight='85vh';
        tp.style.height=Math.min(natural,maxH)+'px';
        snapThoughtToLeft();
    },50);
}
// ── Snap thought panel to left of browser, width to message area ──
function snapThoughtToLeft(){
    const s=getSettings();
    if(s.thoughtSnapLeft===false)return;
    const tp=document.getElementById('sp-thought-panel');
    if(!tp||!tp.classList.contains('sp-tp-visible'))return;
    // Find ST chat container
    const chat=document.getElementById('chat');
    const chatParent=chat?.parentElement;
    if(!chatParent)return;
    const chatRect=chatParent.getBoundingClientRect();
    const gap=6;
    // Snap to left edge of browser
    tp.style.left='0px';
    tp.style.top=Math.max(34,chatRect.top)+'px';
    // Width: from browser left to message panel left edge
    const targetW=Math.max(200,chatRect.left-gap);
    tp.style.width=targetW+'px';
    // Cap height
    const maxH=Math.min(chatRect.height,window.innerHeight*0.85);
    if(tp.offsetHeight>maxH)tp.style.height=maxH+'px';
}

// ── Message Integration ──
function addMesButton(el){
    if(el.querySelector('.sp-mes-btn'))return;
    const btns=el.querySelector('.mes_buttons .extraMesButtons')||el.querySelector('.extraMesButtons')||el.querySelector('.mes_buttons');
    if(!btns){log('No button container for mesid',el.getAttribute('mesid'));return}
    const btn=document.createElement('div');btn.className='sp-mes-btn mes_button';btn.title='ScenePulse: Regenerate scene from this message';
    btn.innerHTML=`<span>${MES_ICON_SVG}</span>`;
    btn.addEventListener('click',async function(e){
        e.stopPropagation();e.preventDefault();
        const mes=this.closest('.mes');if(!mes){warn('No .mes parent found');return}
        const id=Number(mes.getAttribute('mesid'));
        log('Mes button clicked for id:',id);
        lastGenSource='manual:message';
        
        if(this.classList.contains('sp-generating')){log('Already generating');return}
        this.classList.add('sp-generating');
        const panel=document.getElementById('sp-panel');
        if(panel){spAutoShow();const body=document.getElementById('sp-panel-body');showLoadingOverlay(body,'Generating Scene','Reading context and analyzing characters');showStopButton();startElapsedTimer()}
        showThoughtLoading('Updating thoughts','Analyzing context');
        const preNonce=genNonce;
        try{
            const r=await generateTracker(id);
            if(genNonce>preNonce+1){log('Mes-btn: stale caller');this.classList.remove('sp-generating');return}
            hideStopButton();stopElapsedTimer();
            clearLoadingOverlay(document.getElementById('sp-panel-body'));clearThoughtLoading();
            this.classList.remove('sp-generating');
            if(!r){const snap=getLatestSnapshot();const body=document.getElementById('sp-panel-body');if(snap){const norm=normalizeTracker(snap);updatePanel(norm)}else if(body)body.innerHTML='<div class="sp-error"><div style="font-weight:700;margin-bottom:4px">Generation Failed</div><div style="font-size:10px">Network timeout or API issue. Try ⟳ Regen or check debug log.</div></div>'}
        }catch(ex){
            err('Mes button gen error:',ex);
            hideStopButton();clearLoadingOverlay(document.getElementById('sp-panel-body'));clearThoughtLoading();
            this.classList.remove('sp-generating');
        }
    });
    btns.appendChild(btn);
}

async function onCharMsg(idx){
    const s=getSettings();if(!s.enabled)return;
    if(!anyPanelsActive()){return}  // Nothing to extract/generate for
    const{chat}=SillyTavern.getContext();if(!chat[idx]||chat[idx].is_user)return;
    log('onCharMsg: idx=',idx,'method=',s.injectionMethod,'generating=',generating,'inlineExtDone=',inlineExtractionDone,'pendingIdx=',pendingInlineIdx);
    const el=document.querySelector(`.mes[mesid="${idx}"]`);if(!el)return;
    addMesButton(el);
    // Don't auto-generate on empty/greeting-only chats — need at least one user message
    const hasUserMsg=chat.some(m=>m.is_user);
    if(!hasUserMsg){log('onCharMsg: no user messages yet, skipping auto-gen');return}
    
    // ── INLINE/TOGETHER MODE: Extract tracker from AI response ──
    if(s.injectionMethod==='inline'){
        // If GENERATION_ENDED already extracted successfully, skip
        if(inlineExtractionDone){
            log('onCharMsg [inline]: extraction already complete (via GENERATION_ENDED), skipping');
            return;
        }
        // FALLBACK: GENERATION_ENDED didn't extract (empty msg, timing issue)
        // Remove waiting indicators
        try{const w=document.getElementById('sp-inline-wait');if(w){if(w._timerInterval)clearInterval(w._timerInterval);w.remove()}}catch{}
        clearThoughtLoading();
        pendingInlineIdx=idx;
        log('onCharMsg [inline]: GENERATION_ENDED missed, retrying as fallback');
        // Streaming may not have finished — retry extraction with delay if message is empty
        let extracted=extractInlineTracker(idx);
        if(!extracted){
            const msgLen=(chat[idx]?.mes||'').length;
            if(msgLen<100){
                log('onCharMsg [inline]: message too short ('+msgLen+' chars), waiting 2s for streaming...');
                await new Promise(r=>setTimeout(r,2000));
                // Re-read chat in case it updated
                const{chat:freshChat}=SillyTavern.getContext();
                if(freshChat[idx])extracted=extractInlineTracker(idx);
                if(!extracted){
                    log('onCharMsg [inline]: retry after 2s, still no tracker, waiting 4s more...');
                    await new Promise(r=>setTimeout(r,4000));
                    const{chat:freshChat2}=SillyTavern.getContext();
                    if(freshChat2[idx])extracted=extractInlineTracker(idx);
                }
            }
        }
        if(extracted){
            // Estimate tokens from together mode — use full message length (narrative + tracker)
            const fullMsgLen=(chat[idx]?.mes||'').length+JSON.stringify(extracted).length; // mes already stripped, add tracker back
            const trackerJson=JSON.stringify(extracted);
            genMeta.promptTokens=0; // Not separately measurable in together mode
            genMeta.completionTokens=Math.round(fullMsgLen/4);
            genMeta.elapsed=inlineGenStartMs>0?((Date.now()-inlineGenStartMs)/1000):0;
            inlineGenStartMs=0;
            log('onCharMsg [inline]: extracted tracker from message',idx,'keys=',Object.keys(extracted).length,'~tracker_tokens:',genMeta.completionTokens);
            inlineExtractionDone=true;pendingInlineIdx=-1;
            stopStreamingHider();
            log('onCharMsg [inline]: extraction complete, hider stopped');
            lastGenSource='auto:together';
            lastRawResponse=JSON.stringify(extracted,null,2); // store for debug copy
            const norm=normalizeTracker(extracted);
            // Debug summary
            log('=== TOGETHER MODE SUMMARY === source=',lastGenSource);
            log('  chars:',norm.characters?.length||0,'rels:',norm.relationships?.length||0);
            log('  quests: main=',norm.mainQuests?.length||0,'side=',norm.sideQuests?.length||0,'tasks=',norm.activeTasks?.length||0);
            log('  ideas:',norm.plotBranches?.length||0,'northStar:',JSON.stringify(norm.northStar||'').substring(0,50));
            log('  scene: topic='+(norm.sceneTopic?'✓':'✗'),'mood='+(norm.sceneMood?'✓':'✗'),'tension='+(norm.sceneTension?'✓':'✗'));
            if(norm.characters?.length)for(const c of norm.characters)log('  char:',c.name,'role=',c.role?'✓':'✗','thought=',c.innerThought?'✓':'✗');
            if(norm.relationships?.length)for(const r of norm.relationships)log('  rel:',r.name,'aff=',r.affection,'trust=',r.trust,'desire=',r.desire,'compat=',r.compatibility);
            currentSnapshotMesIdx=idx;
            extracted._spMeta={promptTokens:genMeta.promptTokens,completionTokens:genMeta.completionTokens,elapsed:genMeta.elapsed,source:lastGenSource,injectionMethod:'inline'};
            saveSnapshot(idx,extracted);
            await ensureChatSaved(); // Flush to disk before profile cascade can trigger CHAT_CHANGED
            updatePanel(norm);spPostGenShow();
            spSetGenerating(false); // Pulse off — onCharMsg extraction succeeded
        } else {
            const msgLen=(chat[idx]?.mes||'').length;
            log('onCharMsg [inline]: no tracker found in message',idx,'('+msgLen+' chars)');
            // If the AI wrote content but omitted the tracker, fall back to separate generation
            if(msgLen>100&&s.autoGenerate&&!generating&&s.fallbackEnabled!==false){
                const fbProfile=s.fallbackProfile||s.connectionProfile||'';
                const fbPreset=s.fallbackPreset||s.chatPreset||'';
                if(!fbProfile&&!fbPreset){
                    // No fallback profile configured — show toast nudge, don't silently fail
                    stopStreamingHider();
                    warn('Together mode: AI omitted tracker ('+msgLen+' chars). No fallback profile configured.');
                    toastr.warning('AI omitted tracker data. Set up a fallback profile in ScenePulse settings for automatic recovery.','ScenePulse',{timeOut:8000});
                } else {
                    warn('Together mode: AI omitted tracker payload ('+msgLen+' chars narrative, no SP markers). Falling back to separate generation.');
                    stopStreamingHider(); // Stop the hider since we're switching to separate mode
                    lastGenSource='auto:together:fallback';
                    const panel=document.getElementById('sp-panel');
                    if(panel){spAutoShow();showLoadingOverlay(document.getElementById('sp-panel-body'),'Generating Scene','Together mode missed — running separate');showStopButton();startElapsedTimer()}
                    showChatBanner('Generating tracker');
                    const result=await generateTracker(idx,null,{profile:fbProfile,preset:fbPreset});
                    hideStopButton();stopElapsedTimer();
                    clearLoadingOverlay(document.getElementById('sp-panel-body'));clearThoughtLoading();
                    if(result){
                        const norm=normalizeTracker(result);
                        updatePanel(norm);spPostGenShow();
                        log('Together fallback: separate generation succeeded via profile=',fbProfile||'(current)');
                    } else {
                        warn('Together fallback: separate generation also failed');
                        const prev=getLatestSnapshot();
                        if(prev){const norm=normalizeTracker(prev);updatePanel(norm);spPostGenShow()}
                    }
                }
            } else if(msgLen>100&&!s.fallbackEnabled){
                log('Together mode: AI omitted tracker, fallback disabled by user');
                stopStreamingHider();
            }
            // Always show existing data if we didn't successfully generate new data
            const prev=getLatestSnapshot();
            if(prev){const norm=normalizeTracker(prev);updatePanel(norm);spPostGenShow()}
        }
        spSetGenerating(false); // Pulse off — inline path complete
        return; // Don't do separate generation in inline mode
    }
    
    // ── SEPARATE MODE: Auto-generate via separate API call ──
    let snap=getSnapshotFor(idx);
    if(!snap&&s.autoGenerate){
        // CRITICAL: Save the chat to disk FIRST, then wait for ST to finish all post-save hooks.
        // withProfileAndPreset triggers connection_profile_loaded → CHAT_CHANGED → chat reload.
        // If the message isn't saved to disk yet, it gets lost in the reload.
        log('onCharMsg: saving chat and waiting 4s before auto-gen...');
        lastGenSource='auto:separate';
        await ensureChatSaved();
        await new Promise(r=>setTimeout(r,4000));
        // Re-check after delay — chat may have changed, or user may have cancelled
        const{chat:freshChat}=SillyTavern.getContext();
        if(!freshChat[idx]){log('onCharMsg: message gone after delay, aborting');return}
        if(generating){log('onCharMsg: already generating after delay, skipping');return}
        const panel=document.getElementById('sp-panel');
        if(panel){spAutoShow();showLoadingOverlay(document.getElementById('sp-panel-body'),'Generating Scene','Reading context and analyzing characters');showStopButton();startElapsedTimer()}
        showChatBanner('Updating thoughts');
        const preNonce=genNonce;
        snap=await generateTracker(idx);
        if(genNonce>preNonce+1){log('Auto-gen: stale caller, cancel handled UI');return}
        hideStopButton();stopElapsedTimer();
        clearLoadingOverlay(document.getElementById('sp-panel-body'));clearThoughtLoading();
        if(snap)updateThoughts(snap);
        else{
            // Cancelled or failed — restore previous or show empty
            const prev=getLatestSnapshot();const body=document.getElementById('sp-panel-body');
            if(prev){const norm=normalizeTracker(prev);updatePanel(norm)}
            else if(body)body.innerHTML='<div class="sp-empty-state"><div class="sp-empty-icon">⟳</div><div class="sp-empty-title">No scene data yet</div><div class="sp-empty-sub">Send a message or click <strong>⟳</strong> to generate.</div></div>';
        }
    }else if(snap){
        const norm=normalizeTracker(snap);updatePanel(norm);
    }
}

async function renderExisting(){
    if(!getSettings().enabled){hidePanel();return}
    // If a generation is active, don't touch the panel — the overlay is showing
    if(generating){log('renderExisting: generation active, skipping panel update');return}
    try{
    createPanel(); // Ensure panel exists
    const all=getTrackerData();const sorted=Object.keys(all.snapshots).map(Number).sort((a,b)=>a-b);
    log('renderExisting:',sorted.length,'snapshots');
    let latestRaw=null;let latestKey=null;
    for(const k of sorted){
        const el=document.querySelector(`.mes[mesid="${k}"]`);
        if(el){try{addMesButton(el)}catch(e){warn('addMesButton:',e)}}
        latestRaw=all.snapshots[String(k)];latestKey=k;currentSnapshotMesIdx=k;
    }
    let latest=null;
    if(latestRaw){
        try{
            log('renderExisting: normalizing latest snapshot',latestKey,'raw keys=',Object.keys(latestRaw||{}).join(','));
            latest=normalizeTracker(latestRaw);
        }catch(e){warn('normalize snapshot',latestKey,':',e)}
    }
    // RECOVERY: If no snapshots found, check if any AI messages contain unextracted inline tracker data
    if(!latest&&getSettings().injectionMethod==='inline'){
        try{
            const{chat}=SillyTavern.getContext();
            for(let i=chat.length-1;i>=0;i--){
                if(chat[i]?.is_user)continue;
                const raw=chat[i]?.mes||'';
                if(raw.includes(SP_MARKER_START)||raw.match(/```json\s*\n?[\s\S]{500,}```\s*$/)){
                    log('renderExisting: found unextracted inline tracker in message',i);
                    const extracted=extractInlineTracker(i);
                    if(extracted){
                        // CRITICAL: Save snapshot so it survives subsequent CHAT_CHANGED reloads
                        currentSnapshotMesIdx=i;
                        saveSnapshot(i,extracted);
                        await ensureChatSaved();
                        log('renderExisting: saved recovered snapshot for message',i);
                        latest=normalizeTracker(extracted);
                        break;
                    }
                }
            }
        }catch(e){warn('renderExisting inline recovery:',e)}
    }
    if(latest){
        log('renderExisting: latest snapshot has chars=',latest.characters?.length||0,'rels=',latest.relationships?.length||0);
        try{updatePanel(latest,true);log('renderExisting: panel updated')}catch(e){err('updatePanel:',e)}
        spAutoShow(); // Show panel BEFORE thoughts so syncThoughts sees it as visible
        try{updateThoughts(latest);log('renderExisting: thoughts updated')}catch(e){err('updateThoughts:',e)}
    } else {
        // No data yet — show empty panel with centered waiting message
        spAutoShow();
        const body=document.getElementById('sp-panel-body');
        if(body)body.innerHTML='<div class="sp-empty-state"><div class="sp-empty-icon">⟳</div><div class="sp-empty-title">No scene data yet</div><div class="sp-empty-sub">Send a message or click <strong>⟳</strong> to generate.</div></div>';
        log('renderExisting: no snapshots, showing empty panel');
    }
    try{document.querySelectorAll('.mes:not([is_user="true"])').forEach(el=>addMesButton(el))}catch(e){warn('addButtons:',e)}
    }catch(e){err('renderExisting:',e)}
}

// ── Interceptor ──
// Build compact inline prompt for "together" mode — tells the AI to append tracker JSON
function buildInlineTrackerPrompt(){
    const s=getSettings();
    const sysPr=getActivePrompt();
    const snap=getLatestSnapshot();
    const prevState=snap?`\nPREVIOUS STATE (carry forward unchanged details, update only what changed):\n${JSON.stringify(snap,null,2)}\n\nIMPORTANT: Carry forward ALL unresolved quests. NEVER drop quests unless the story resolves them.`:'';
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
    if(panels.quests!==false)mandatoryHints+='\n- mainQuests/sideQuests/activeTasks: From story context. Each needs name, urgency, detail.';
    if(panels.characters!==false)mandatoryHints+='\n- characters: Full details for EVERY non-user character present including appearance.';
    if(panels.relationships!==false)mandatoryHints+='\n- relationships: All characters\' views of {{user}} with numeric meters (0-100) and labels. desire=0 for strangers/family.';
    // Custom panel hints
    const customPanels=s.customPanels||[];
    for(const cp of customPanels){
        if(!cp.fields?.length)continue;
        mandatoryHints+=`\n- ${cp.fields.map(f=>f.key).join(', ')}: ${cp.name} fields — populate from story context.`;
    }
    return `[SCENE TRACKER — MANDATORY APPENDIX]
After your COMPLETE narrative response, append a JSON tracker block. This block is automatically hidden by the UI — you MUST include it every time.

The JSON must contain these keys: ${fieldList}
${mandatoryHints?'\nMANDATORY FIELDS:'+mandatoryHints:''}

Do NOT include schema metadata. Output only actual tracker data as a flat JSON object.

${fieldSpecs}
${prevState}

REQUIRED OUTPUT FORMAT — append this AFTER your narrative:

<!--SP_TRACKER_START-->
{"time":"...","date":"...","location":"...", ...all fields...}
<!--SP_TRACKER_END-->

This is NOT optional. Every single response MUST end with this block. The markers are parsed by software and stripped from the display. If you omit the block, scene tracking breaks completely.`;
}

globalThis.scenePulseInterceptor=async function(chat,cs,abort,type){
    const s=getSettings();
    if(!s.enabled||type==='quiet')return;
    if(generating){log('Interceptor: skipped — manual/partial generation in progress');return}
    if(!anyPanelsActive()){log('Interceptor: skipped — all panels disabled, no custom panels');return}
    
    if(s.injectionMethod==='inline'){
        // TOGETHER MODE: Inject full tracker prompt into the generation context
        // This tells the AI to append JSON after its normal response
        inlineGenStartMs=Date.now();
        inlineExtractionDone=false; // Reset — will be set true when extraction succeeds
        pendingInlineIdx=-1; // Will be set by onCharMsg when the message arrives
        spSetGenerating(true); // Pulse the mobile restore icon
        const prompt=buildInlineTrackerPrompt();
        chat.splice(Math.max(0,chat.length-1),0,{
            is_user:false,is_system:true,name:'System',
            mes:prompt,
            extra:{isSmallSys:true}
        });
        log('Interceptor [inline/together]: injected tracker prompt (~'+Math.round(prompt.length/4)+' tokens)',
            'state: extDone=',inlineExtractionDone,'pendingIdx=',pendingInlineIdx,'generating=',generating);
        // STREAMING HIDER: Hide tracker JSON as it appears during streaming
        // Uses a periodic check on the last .mes_text to hide SP marker content
        startStreamingHider();
        // Show waiting animation on panel
        try{
            const body=document.getElementById('sp-panel-body');
            if(body){
                let wait=document.getElementById('sp-inline-wait');
                if(!wait){
                    wait=document.createElement('div');wait.id='sp-inline-wait';wait.className='sp-inline-wait';
                    wait.innerHTML='<div class="sp-inline-wait-spinner"></div><span>Updating scene data<span class="sp-ellipsis"></span></span><span class="sp-banner-timer" id="sp-inline-wait-timer">0s</span>';
                    body.insertBefore(wait,body.firstChild);
                    const _iwStart=Date.now();
                    wait._timerInterval=setInterval(()=>{const el=document.getElementById('sp-inline-wait-timer');if(el)el.textContent=((Date.now()-_iwStart)/1000|0)+'s'},1000);
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

// ── Setup Guide Tutorial ──
function showSetupGuide(){
    // Remove any existing guide
    document.getElementById('sp-setup-overlay')?.remove();
    const s=getSettings();
    const profiles=getConnectionProfiles();
    const presets=getChatPresets();
    const hasProfiles=profiles.length>0;
    const hasFallbackProfile=!!s.fallbackProfile;

    const _setupMobile=spDetectMode()==='mobile';
    const ov=document.createElement('div');ov.id='sp-setup-overlay';ov.className='sp-setup-overlay';
    ov.innerHTML=`
    <div class="sp-setup-dialog">
        <div class="sp-setup-header">
            <div class="sp-setup-icon">${MASCOT_SVG}</div>
            <div class="sp-setup-title">Scene<span style="color:var(--sp-accent)">Pulse</span> Setup</div>
            <button class="sp-setup-close" title="Close">✕</button>
        </div>
        <div class="sp-setup-body" id="sp-setup-body">
            <div class="sp-setup-step sp-setup-active" data-step="1">
                <div class="sp-setup-step-num">1</div>
                <div class="sp-setup-step-content">
                    <div class="sp-setup-step-title">How ScenePulse Works</div>
                    <p>ScenePulse uses <strong>Together mode</strong> by default — it instructs the AI to append scene tracking data (JSON) at the end of every response. This is fast, cheap, and accurate.</p>
                    <p>However, some models occasionally skip the tracker payload. When this happens, ScenePulse can <strong>automatically fall back</strong> to a separate API call to generate the tracker data.</p>
                    ${_setupMobile?'<p style="color:var(--sp-text-dim);font-size:12px"><em>Note: On mobile, some desktop features (weather overlay, time-of-day tint, inner thoughts panel, condense view) are hidden to optimize the experience. They\'ll be available when you switch to desktop.</em></p>':''}
                    <p>This guide helps you configure the fallback so you never lose scene data.</p>
                    <div class="sp-setup-nav"><button class="sp-setup-btn sp-setup-btn-primary" data-goto="2">Next →</button><button class="sp-setup-btn sp-setup-btn-skip" data-dismiss="true">Skip setup</button></div>
                </div>
            </div>
            <div class="sp-setup-step" data-step="2">
                <div class="sp-setup-step-num">2</div>
                <div class="sp-setup-step-content">
                    <div class="sp-setup-step-title">Create a Connection Profile</div>
                    <p>The fallback uses a <strong>Connection Profile</strong> in SillyTavern to make a dedicated API call. If you already have profiles set up, you can use one of those.</p>
                    <p>To create a new one:</p>
                    <div class="sp-setup-instructions">
                        <div class="sp-setup-inst">1. Open SillyTavern's <strong>API Connections</strong> panel (top-left plug icon)</div>
                        <div class="sp-setup-inst">2. Configure your API provider and model</div>
                        <div class="sp-setup-inst">3. Click the <strong>connection profile</strong> dropdown → <strong>Create New</strong></div>
                        <div class="sp-setup-inst">4. Name it something like <em>"ScenePulse Tracker"</em></div>
                        <div class="sp-setup-inst">5. Save the profile</div>
                    </div>
                    ${hasProfiles?'<p style="color:var(--sp-green)">✓ You have <strong>'+profiles.length+'</strong> connection profile'+(profiles.length>1?'s':'')+'  available.</p>':'<p style="color:var(--sp-amber)">⚠ No connection profiles found. Create one in SillyTavern first, then click Refresh below.</p>'}
                    <div class="sp-setup-nav"><button class="sp-setup-btn" data-goto="1">← Back</button><button class="sp-setup-btn sp-setup-btn-primary" data-goto="3">Next →</button></div>
                </div>
            </div>
            <div class="sp-setup-step" data-step="3">
                <div class="sp-setup-step-num">3</div>
                <div class="sp-setup-step-content">
                    <div class="sp-setup-step-title">Select Your Fallback Profile</div>
                    <p>Choose which connection profile ScenePulse should use when the AI omits tracker data:</p>
                    <div class="sp-setup-select-wrap">
                        <select id="sp-setup-fb-profile" class="sp-setup-select">
                            <option value="">(Same as current — no dedicated profile)</option>
                            ${profiles.map(p=>`<option value="${esc(p.id)}"${p.id===s.fallbackProfile?' selected':''}>${esc(p.name)}</option>`).join('')}
                        </select>
                    </div>
                    <p>Optionally, choose a preset optimized for JSON output:</p>
                    <div class="sp-setup-select-wrap">
                        <select id="sp-setup-fb-preset" class="sp-setup-select">
                            <option value="">(Built-in: ScenePulse GLM-5)</option>
                            ${presets.map(p=>`<option value="${esc(p.id)}"${p.id===s.fallbackPreset?' selected':''}>${esc(p.name)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="sp-setup-note">The built-in preset uses temp=0.6, top_p=0.95, freq_pen=0.15 — optimized for structured output.</div>
                    <div class="sp-setup-nav"><button class="sp-setup-btn" data-goto="2">← Back</button><button class="sp-setup-btn sp-setup-btn-primary" data-goto="4">Next →</button></div>
                </div>
            </div>
            <div class="sp-setup-step" data-step="4">
                <div class="sp-setup-step-num">4</div>
                <div class="sp-setup-step-content">
                    <div class="sp-setup-step-title">Fallback Preference</div>
                    <p>When the AI skips the tracker, should ScenePulse automatically run a separate API call?</p>
                    <label class="sp-setup-radio"><input type="radio" name="sp-setup-fb-enable" value="yes" ${s.fallbackEnabled!==false?'checked':''}> <strong>Yes</strong> — automatically recover missing tracker data <span style="color:var(--sp-text-dim)">(recommended)</span></label>
                    <label class="sp-setup-radio"><input type="radio" name="sp-setup-fb-enable" value="no" ${s.fallbackEnabled===false?'checked':''}> <strong>No</strong> — skip it, I'll regenerate manually if needed</label>
                    <div class="sp-setup-note" id="sp-setup-no-warn" style="display:${s.fallbackEnabled===false?'block':'none'};color:var(--sp-amber)">With fallback disabled, you may occasionally see empty scene data when the AI omits the tracker. Use the ⟳ button in the panel to regenerate manually.</div>
                    <div class="sp-setup-nav"><button class="sp-setup-btn" data-goto="3">← Back</button><button class="sp-setup-btn sp-setup-btn-primary sp-setup-btn-finish" data-finish="true">✓ Finish Setup</button></div>
                    <div style="text-align:center;margin-top:8px"><button class="sp-setup-btn sp-setup-btn-tour" data-tour="true">✦ Take a Guided Tour</button></div>
                </div>
            </div>
        </div>
        <div class="sp-setup-progress">
            <div class="sp-setup-dots"><span class="sp-setup-dot sp-dot-active" data-dot="1"></span><span class="sp-setup-dot" data-dot="2"></span><span class="sp-setup-dot" data-dot="3"></span><span class="sp-setup-dot" data-dot="4"></span></div>
        </div>
    </div>`;
    document.body.appendChild(ov);

    // Navigation
    let currentStep=1;
    function goToStep(n){
        currentStep=n;
        ov.querySelectorAll('.sp-setup-step').forEach(s=>{s.classList.toggle('sp-setup-active',+s.dataset.step===n)});
        ov.querySelectorAll('.sp-setup-dot').forEach(d=>{d.classList.toggle('sp-dot-active',+d.dataset.dot===n)});
    }
    ov.addEventListener('click',(e)=>{
        const btn=e.target.closest('[data-goto]');
        if(btn)goToStep(+btn.dataset.goto);
        if(e.target.closest('.sp-setup-close')||e.target.closest('[data-dismiss]')){
            s.setupDismissed=true;saveSettings();ov.remove();
        }
        if(e.target.closest('[data-finish]')){
            // Save selections
            const prof=ov.querySelector('#sp-setup-fb-profile')?.value||'';
            const pre=ov.querySelector('#sp-setup-fb-preset')?.value||'';
            const enabled=ov.querySelector('input[name="sp-setup-fb-enable"]:checked')?.value!=='no';
            s.fallbackProfile=prof;s.fallbackPreset=pre;s.fallbackEnabled=enabled;s.setupDismissed=true;
            saveSettings();_spSaveLS();loadUI();
            ov.remove();
            if(enabled&&prof)toastr.success('Fallback configured with profile: '+prof,'ScenePulse Setup');
            else if(enabled)toastr.info('Fallback enabled (using current profile)','ScenePulse Setup');
            else toastr.info('Fallback disabled — use ⟳ for manual recovery','ScenePulse Setup');
        }
        const dot=e.target.closest('.sp-setup-dot');
        if(dot)goToStep(+dot.dataset.dot);
        if(e.target.closest('[data-tour]')){
            const prof=ov.querySelector('#sp-setup-fb-profile')?.value||'';
            const pre=ov.querySelector('#sp-setup-fb-preset')?.value||'';
            const enabled=ov.querySelector('input[name="sp-setup-fb-enable"]:checked')?.value!=='no';
            s.fallbackProfile=prof;s.fallbackPreset=pre;s.fallbackEnabled=enabled;s.setupDismissed=true;
            saveSettings();_spSaveLS();loadUI();ov.remove();
            startGuidedTour();
        }
    });
    // Radio toggle for warning
    ov.querySelectorAll('input[name="sp-setup-fb-enable"]').forEach(r=>r.addEventListener('change',()=>{
        ov.querySelector('#sp-setup-no-warn').style.display=r.value==='no'?'block':'none';
    }));
}

// ── Guided Tour with Example Data ──
const TOUR_EXAMPLE_DATA={
    time:'14:32:00',date:'03/17/2025 (Monday)',location:'Main Floor > Cafe Lune',weather:'Overcast, light rain',temperature:'14°C / 57°F — cool, damp',
    sceneTopic:'Tense customer interaction during afternoon rush',sceneMood:'Anxious, simmering conflict',sceneInteraction:'Strained professionalism breaking down',sceneTension:'high',
    sceneSummary:'Three customers entered during the afternoon lull. The lead customer is agitated about a previous order mistake, and the barista is struggling to maintain composure after an exhausting morning shift.',
    soundEnvironment:'Espresso machine hissing, rain against windows, distant traffic, phone buzzing on counter',
    charactersPresent:['Elena Vasquez','Marcus Chen','Yuki Tanaka'],
    northStar:'Build a life worth staying in',
    mainQuests:[{name:'Keep the cafe from going under',urgency:'high',detail:'Monthly revenue is 15% below break-even. Need to boost foot traffic or cut costs within 60 days or the lease is gone.'},{name:'Repair the relationship with Mom',urgency:'moderate',detail:'Haven\'t spoken in three weeks after the argument about the inheritance. She left a voicemail yesterday but it hasn\'t been played yet.'}],
    sideQuests:[{name:'Learn to cook something other than instant ramen',urgency:'low',detail:'Elena offered to teach a few recipes. Haven\'t taken her up on it yet.'}],
    activeTasks:[{name:'Handle the angry customer without losing it',urgency:'critical',detail:'Marcus Chen is escalating. De-escalate before it turns into a scene.'},{name:'Fix the espresso machine\'s temperature gauge',urgency:'moderate',detail:'It\'s been running 8 degrees hot since Tuesday. Customers have noticed.'}],
    relationships:[
        {name:'Elena Vasquez',relType:'Co-worker/Friend',relPhase:'Growing closer, testing boundaries',timeTogether:'3 months',milestone:'Elena covered a shift when no one else would — first real act of trust',affection:62,affectionLabel:'Warm',trust:55,trustLabel:'Building',desire:20,desireLabel:'',stress:30,stressLabel:'Manageable',compatibility:68,compatibilityLabel:'Natural fit'},
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
        {type:'comedic',name:'The espresso machine finally gives out',hook:'Mid-confrontation, the overheating machine lets out a dramatic hiss and sprays steam. Everyone freezes. The tension breaks — or doubles.'},
        {type:'twist',name:'Yuki recognizes Marcus',hook:'She realizes Marcus is the same person who rejected her photography proposal at his firm last month. She hasn\'t decided if she should say anything.'},
        {type:'exploratory',name:'Elena\'s notebook secret',hook:'While reaching for a cup, Elena\'s notebook falls open. The pages aren\'t drink recipes — they\'re detailed sketches of the cafe\'s customers.'},
        {type:'intense',name:'The voicemail plays on speaker',hook:'Phone buzzes on the counter — Mom\'s voicemail starts playing through the speakers. Everyone in the cafe hears the first few words.'}
    ]
};

function startGuidedTour(){
    const _s=(svg)=>`<svg viewBox="0 0 16 16" width="13" height="13" fill="none" style="vertical-align:-2px;display:inline">${svg}</svg>`;
    const _i={
        regen:_s('<path d="M13.5 8a5.5 5.5 0 1 1-1.3-3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M13.5 3v2.5h-2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>'),
        panels:_s('<rect x="1" y="2" width="6" height="4" rx="1" stroke="currentColor" stroke-width="1.1" opacity="0.6"/><rect x="9" y="2" width="6" height="4" rx="1" stroke="currentColor" stroke-width="1.1" opacity="0.6"/><rect x="1" y="8" width="6" height="4" rx="1" stroke="currentColor" stroke-width="1.1" fill="currentColor" opacity="0.15"/><rect x="9" y="8" width="6" height="4" rx="1" stroke="currentColor" stroke-width="1.1"/>'),
        toggle:_s('<rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/><rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/><rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/><rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/>'),
        condense:_s('<rect x="2" y="2" width="12" height="2.5" rx="1" fill="currentColor" opacity="0.3"/><rect x="2" y="6" width="9" height="2" rx="0.8" fill="currentColor" opacity="0.2"/><rect x="2" y="9.5" width="11" height="2" rx="0.8" fill="currentColor" opacity="0.15"/><path d="M14 5.5L14 12" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.3"/>'),
        thoughts:_s('<path d="M2 9.5c0 1.5 1.5 3 4 3l2 2v-2c2.5 0 4-1.5 4-3V6c0-1.5-1.5-3-4-3H6C3.5 3 2 4.5 2 6v3.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" fill="currentColor" opacity="0.15"/><circle cx="5.5" cy="7.2" r="0.8" fill="currentColor" opacity="0.6"/><circle cx="8" cy="7.2" r="0.8" fill="currentColor" opacity="0.6"/><circle cx="10.5" cy="7.2" r="0.8" fill="currentColor" opacity="0.6"/>'),
        weather:_s('<path d="M4.5 11.5c-2 0-3.5-1.2-3.5-3 0-1.4 1-2.6 2.4-3C4 2.8 6.2 1 9 1c2.6 0 4.8 1.8 5 4 1.5.3 2.5 1.4 2.5 2.8 0 1.7-1.5 3-3.2 3H4.5z" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>'),
        time:_s('<circle cx="8" cy="8" r="3" fill="currentColor" opacity="0.25" stroke="currentColor" stroke-width="1.2"/><line x1="8" y1="1.5" x2="8" y2="3.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/><line x1="8" y1="12.5" x2="8" y2="14.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/><line x1="1.5" y1="8" x2="3.5" y2="8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/><line x1="12.5" y1="8" x2="14.5" y2="8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/>'),
        transition:_s('<path d="M2 12V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z" stroke="currentColor" stroke-width="1.1" fill="currentColor" opacity="0.08"/><path d="M5 8h6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/><path d="M9.5 5.5L12 8l-2.5 2.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>'),
        edit:_s('<path d="M11.5 1.5l3 3-8.5 8.5H3v-3l8.5-8.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><line x1="9.5" y1="3.5" x2="12.5" y2="6.5" stroke="currentColor" stroke-width="0.8" opacity="0.4"/>'),
        star:_s('<polygon points="8,1 9.8,5.8 15,6.2 11,9.6 12.2,15 8,12 3.8,15 5,9.6 1,6.2 6.2,5.8" fill="currentColor" opacity="0.3" stroke="currentColor" stroke-width="1"/>'),
        main:_s('<path d="M3 14V3a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v11l-5-2.5L3 14z" fill="currentColor" opacity="0.2" stroke="currentColor" stroke-width="1.1"/>'),
        side:_s('<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.1"/><path d="M8 4v4.5l3 1.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'),
        tasks:_s('<path d="M3.5 8.5l2.5 2.5 6.5-6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><rect x="1.5" y="1.5" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1" opacity="0.3"/>'),
        heart:_s('<path d="M8 14s-5.5-3.5-5.5-7A3 3 0 0 1 8 5a3 3 0 0 1 5.5 2c0 3.5-5.5 7-5.5 7z" fill="#d46a7e" opacity="0.6"/>'),
        shield:_s('<path d="M8 1L2 4v4c0 3.5 2.5 5.5 6 7 3.5-1.5 6-3.5 6-7V4L8 1z" fill="#d4a55e" opacity="0.4" stroke="#d4a55e" stroke-width="0.8"/>'),
        flame:_s('<path d="M8 2c-1.5 2-4 4-4 7a4 4 0 0 0 8 0c0-3-2.5-5-4-7z" fill="#c44080" opacity="0.5"/>'),
        bolt:_s('<path d="M9 1L5 8h4l-2 7 6-8H9l2-6z" fill="#f59e0b" opacity="0.6"/>'),
        compat:_s('<circle cx="6" cy="8" r="4" stroke="#40a0c4" stroke-width="1" opacity="0.6"/><circle cx="10" cy="8" r="4" stroke="#40a0c4" stroke-width="1" opacity="0.6"/>'),
        snap:_s('<rect x="1" y="2" width="6" height="12" rx="1" stroke="currentColor" stroke-width="1.2" opacity="0.8"/><rect x="9" y="2" width="6" height="12" rx="1" stroke="currentColor" stroke-width="1.2" opacity="0.35"/><path d="M4.5 6.5L2.5 8l2 1.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>'),
        ghost:_s('<path d="M10 2C6.5 2 4 4.8 4 7.5v7c0 .4.2.7.5.5l1.5-1.2 1.5 1.2c.3.2.7.2 1 0L10 13.8l1.5 1.2c.3.2.7.2 1 0l1.5-1.2 1.5 1.2c.3.2.5-.1.5-.5v-7C16 4.8 13.5 2 10 2z" fill="currentColor" opacity="0.12" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/><ellipse cx="7.8" cy="8" rx="1.3" ry="1.6" fill="currentColor" opacity="0.7"/><ellipse cx="12.2" cy="8" rx="1.3" ry="1.6" fill="currentColor" opacity="0.7"/>')
    };
    const _savedData=_cachedNormData?structuredClone(_cachedNormData):null;
    const _savedMesIdx=currentSnapshotMesIdx;
    const exData=normalizeTracker(structuredClone(TOUR_EXAMPLE_DATA));
    updatePanel(exData);showPanel();
    // Fake timeline
    const tl=document.getElementById('sp-timeline');
    if(tl){const bar=tl.querySelector('.sp-timeline-bar')||tl;bar.innerHTML='';for(let i=0;i<12;i++){const w=document.createElement('div');w.className='sp-tl-node-wrap';const d=document.createElement('div');d.className='sp-tl-dot'+(i===11?' sp-tl-dot-active':'');w.appendChild(d);if(i===11){const l=document.createElement('div');l.className='sp-tl-label';l.textContent='#26';w.appendChild(l)}bar.appendChild(w)}}
    function collapseAll(){document.querySelectorAll('#sp-panel-body .sp-section.sp-open').forEach(s=>s.classList.remove('sp-open'))}
    function openSection(key){
        const sec=document.querySelector(`[data-key="${key}"]`);
        if(!sec)return;sec.classList.add('sp-open');
        setTimeout(()=>{
            if(key==='relationships'||key==='characters')sec.querySelectorAll('.sp-rel-block,.sp-char-card').forEach(c=>c.classList.add('sp-card-open'));
            if(key==='quests'){sec.querySelectorAll('.sp-plot-tier').forEach(t=>t.classList.add('sp-tier-open'));sec.querySelectorAll('.sp-plot-entry').forEach(e=>e.classList.add('sp-card-open'))}
            if(key==='branches')sec.querySelectorAll('.sp-idea-card').forEach(c=>c.classList.add('sp-card-open'));
        },30);
    }
    function openPanelMgr(){
        let mgr=document.getElementById('sp-panel-mgr');
        if(!mgr){document.getElementById('sp-tb-panels')?.click();mgr=document.getElementById('sp-panel-mgr')}
        return mgr;
    }
    function closePanelMgr(){
        const mgr=document.getElementById('sp-panel-mgr');
        if(mgr)mgr.remove();
    }
    // Create a temp custom panel for the tour
    let _tourPanelCreated=false;
    function createTourPanel(){
        const s=getSettings();
        if(!s.customPanels)s.customPanels=[];
        s.customPanels.push({name:'RPG Stats (Tour Example)',fields:[
            {key:'health',label:'Health',type:'meter',desc:"{{user}}'s health 0-100"},
            {key:'mana',label:'Mana',type:'meter',desc:"Mana remaining after spellcasting"},
            {key:'reputation',label:'Reputation',type:'text',desc:"Standing with the local guild"}
        ]});
        _tourPanelCreated=true;
        saveSettings();
        // Re-render the custom panels section in the manager
        const cpList=document.getElementById('sp-panel-mgr-custom');
        const body=document.getElementById('sp-panel-body');
        if(cpList&&body)renderCustomPanelsMgr(s,cpList,body);
    }
    function removeTourPanel(){
        if(!_tourPanelCreated)return;
        const s=getSettings();
        const idx=(s.customPanels||[]).findIndex(p=>p.name==='RPG Stats (Tour Example)');
        if(idx>=0){s.customPanels.splice(idx,1);saveSettings()}
        _tourPanelCreated=false;
    }
    let _ghostWasOn=false;
    const _isMobile=spDetectMode()==='mobile';
    let steps=[
        {title:'Welcome to ScenePulse',desc:'ScenePulse is your AI-powered <strong>scene intelligence dashboard</strong>. It tracks characters, relationships, quests, and story state \u2014 all extracted automatically from AI responses.<br><br>This tour loads <strong>example data</strong> so you can see every feature.',sel:'.sp-toolbar',pos:'below'},
        {title:'The Dashboard',desc:'Environment data \u2014 time, date, location, weather, temperature. Updates every message.<br><br>Toggle '+_i.edit+' edit mode to click and modify values manually.',sel:'.sp-env-permanent',pos:'below'},
        {title:'Toolbar Controls',desc:_isMobile
            ?'Left to right:<br><br>'+_i.regen+' <strong>Refresh</strong> \u2014 regenerate tracker<br>'+_i.panels+' <strong>Manager</strong> \u2014 toggle panels & fields<br>'+_i.toggle+' <strong>Expand/Collapse</strong> \u2014 all sections<br>'+_i.transition+' <strong>Transitions</strong> \u2014 scene change alerts<br>'+_i.edit+' <strong>Edit</strong> \u2014 manual value editing'
            :'Left to right:<br><br>'+_i.regen+' <strong>Refresh</strong> \u2014 regenerate tracker<br>'+_i.panels+' <strong>Manager</strong> \u2014 toggle panels & fields<br>'+_i.toggle+' <strong>Expand/Collapse</strong> \u2014 all sections<br>'+_i.condense+' <strong>Condense</strong> \u2014 compact layout<br>'+_i.thoughts+' <strong>Thoughts</strong> \u2014 inner thoughts panel<br>'+_i.weather+' <strong>Weather</strong> \u2014 rain/snow overlay<br>'+_i.time+' <strong>Ambience</strong> \u2014 time-of-day tint<br>'+_i.transition+' <strong>Transitions</strong> \u2014 scene change alerts<br>'+_i.edit+' <strong>Edit</strong> \u2014 manual value editing',sel:'.sp-toolbar',pos:'below'},
        {title:'Scene Details',desc:'Tracks <strong>mood, tension, topic, interaction, and sounds</strong>. Tension is uppercase (CALM \u2192 CRITICAL). Header badge = current mood.',sel:'[data-key="scene"]',pos:'below',open:'scene'},
        {title:'Quest Journal',desc:_i.star+' <strong>North Star</strong> \u2014 life purpose<br>'+_i.main+' <strong>Main Quests</strong> \u2014 critical goals<br>'+_i.side+' <strong>Side Quests</strong> \u2014 optional enrichment<br>'+_i.tasks+' <strong>Active Tasks</strong> \u2014 immediate to-dos<br><br>Tiers and quests collapse independently.',sel:'[data-key="quests"]',pos:_isMobile?'below':'left',open:'quests'},
        {title:'Relationships',desc:_i.heart+' <strong>Affection</strong><br>'+_i.shield+' <strong>Trust</strong><br>'+_i.flame+' <strong>Desire</strong><br>'+_i.bolt+' <strong>Stress</strong> (neutral)<br>'+_i.compat+' <strong>Compatibility</strong><br><br>Deltas (\u25B2/\u25BC) with unique icons. White bar marker = previous value.',sel:'[data-key="relationships"]',pos:_isMobile?'below':'left',open:'relationships'},
        {title:'Characters',desc:'Profiles: <strong>appearance, outfit, inventory, goals</strong>. Role badges match relationship style. First expanded, others collapse.',sel:'[data-key="characters"]',pos:_isMobile?'below':'left',open:'characters'},
        {title:'Story Ideas',desc:'5 AI-generated plot directions per update. Click to expand. <strong>\uD83D\uDCCB Paste</strong> to edit, <strong>\u25B6 Inject</strong> to send immediately.',sel:'[data-key="branches"]',pos:_isMobile?'below':'left',open:'branches'},
    ];
    // Desktop-only steps
    if(!_isMobile){
        steps.push(
            {title:'Inner Thoughts',desc:'Floating panel with each character\u2019s <strong>literal inner monologue</strong>. Drag to reposition. Resize from the corner.',sel:'#sp-thought-panel',pos:'right',
                before:()=>{const tp=document.getElementById('sp-thought-panel');if(tp){_ghostWasOn=tp.classList.contains('sp-tp-ghost');tp.classList.remove('sp-tp-ghost')}}},
            {title:'Thoughts Controls',desc:_i.snap+' <strong>Snap Left</strong> \u2014 dock to chat edge<br>'+_i.ghost+' <strong>Ghost Mode</strong> \u2014 transparent frame<br>'+_i.regen+' <strong>Regenerate</strong> \u2014 refresh thoughts<br><strong>\u2715 Close</strong> \u2014 hide panel<br><br>All toggleable \u2014 click to switch on/off.',sel:'#sp-thought-panel .sp-tp-header',pos:'below',
                after:()=>{if(_ghostWasOn){const tp=document.getElementById('sp-thought-panel');if(tp)tp.classList.add('sp-tp-ghost')}}}
        );
    }
    steps.push(
        {title:'Timeline Scrubber',desc:'Every AI message creates a <strong>snapshot</strong>. The timeline bar at the bottom shows all snapshots as dots. Click any dot to load that moment. The green dot marks the current message.<br><br>Scrub through history and compare how relationships, quests, and characters evolved.',center:true},
        {title:'Panel Manager',desc:'Toggle <strong>built-in panels</strong> on/off with checkboxes. Disabled panels are excluded from the AI prompt \u2014 saving tokens.<br><br>Sub-fields within each panel can also be toggled individually.',sel:'#sp-panel-mgr',pos:_isMobile?'below':'left',
            before:()=>{openPanelMgr()},after:()=>{closePanelMgr()}},
        {title:'Custom Panels',desc:'Create panels to track <strong>anything</strong> \u2014 health, mana, reputation, faction standings.<br><br>Each field gets a <strong>key</strong>, <strong>label</strong>, <strong>type</strong> (text/number/meter/list/enum), and an <strong>LLM hint</strong> telling the AI what to output.',sel:'#sp-panel-mgr-custom',pos:_isMobile?'below':'left',
            before:()=>{
                openPanelMgr();
                createTourPanel();
                setTimeout(()=>{const el=document.getElementById('sp-panel-mgr-custom');if(el)el.scrollIntoView({behavior:'smooth',block:'nearest'})},150);
            },
            after:()=>{removeTourPanel();closePanelMgr()}},
        {title:'\u26A0 Performance Tip',desc:'More panels = more tokens = <strong>longer generation times</strong>.<br><br>If responses feel slow, try:<br>\u2022 Disable panels you don\u2019t need (Characters, Story Ideas are heaviest)<br>\u2022 Reduce custom panel fields<br>\u2022 Lower context messages in Separate mode',sel:'#sp-panel-mgr',pos:_isMobile?'below':'left',warn:true,
            before:()=>{openPanelMgr()},after:()=>{closePanelMgr()}},
        {title:'Feedback & Issues',desc:'Found a bug? Have a suggestion?<br><br>Visit the GitHub page to report issues or share ideas:<br><br><a href="https://github.com/xenofei" target="_blank" rel="noopener" style="color:var(--sp-accent);text-decoration:underline;font-weight:600">github.com/xenofei</a><br><br>Your feedback helps make ScenePulse better for everyone.',center:true},
        {title:'Thank You!',desc:'<div style="text-align:center"><span class="sp-tour-finale-pulse">'+MASCOT_SVG+'</span></div><div class="sp-tour-finale-glow">Every scene has a pulse. Now you can feel it.</div><br>Thank you for trying <strong>ScenePulse</strong>. I built this to make every moment in your story feel alive \u2014 tracked, remembered, meaningful.<br><br>Your story matters. Go make it unforgettable.',center:true}
    );
    let step=0;let _prevAfter=null;
    const spotlight=document.createElement('div');spotlight.className='sp-tour-spotlight';
    const card=document.createElement('div');card.className='sp-tour-card';
    document.body.appendChild(spotlight);document.body.appendChild(card);
    function renderStep(){
        if(_prevAfter){_prevAfter();_prevAfter=null}
        const s=steps[step];
        if(s.before)s.before();
        if(s.after)_prevAfter=s.after;
        collapseAll();
        if(s.open)openSection(s.open);
        card.className='sp-tour-card'+(s.warn?' sp-tour-warn':'');
        const isLast=step===steps.length-1;const isFirst=step===0;
        let pips='';for(let i=0;i<steps.length;i++)pips+=`<span class="sp-tour-pip${i===step?' sp-active':''}"></span>`;
        card.innerHTML=`<div class="sp-tour-step-label">Step ${step+1} of ${steps.length}</div><div class="sp-tour-title">${s.title}</div><div class="sp-tour-desc">${s.desc}</div><div class="sp-tour-nav">${isFirst?'':'<button class="sp-tour-btn" data-prev>\u2190 Back</button>'}<button class="sp-tour-btn sp-tour-btn-end" data-end>Skip</button><div class="sp-tour-progress">${pips}</div>${isLast?'<button class="sp-tour-btn sp-tour-btn-next" data-done>\u2713 Finish</button>':'<button class="sp-tour-btn sp-tour-btn-next" data-next>Next \u2192</button>'}</div>`;
        // Delay positioning to allow DOM updates (panel mgr open, scroll, etc.)
        if(s.center){
            // No spotlight, center card on screen
            spotlight.style.display='none';
            setTimeout(()=>{
                const cw=_isMobile?Math.min(340,window.innerWidth-16):340;
                const ch=card.offsetHeight||250;
                card.style.left=Math.max(8,(window.innerWidth-cw)/2)+'px';
                card.style.top=Math.max(8,(window.innerHeight-ch)/2)+'px';
                if(_isMobile)card.style.width=cw+'px';
            },100);
        } else {
        setTimeout(()=>{
            const el=s.sel?document.querySelector(s.sel):null;
            if(el){
                el.scrollIntoView({behavior:'smooth',block:'nearest'});
                setTimeout(()=>{
                    const r=el.getBoundingClientRect();const pad=8;
                    spotlight.style.left=(r.left-pad)+'px';spotlight.style.top=(r.top-pad)+'px';
                    spotlight.style.width=(r.width+pad*2)+'px';spotlight.style.height=(r.height+pad*2)+'px';
                    spotlight.style.display='block';
                    const cw=_isMobile?Math.min(320,window.innerWidth-16):340;
                    const ch=card.offsetHeight||250;
                    if(_isMobile){
                        // Mobile: card always below spotlight, centered
                        const cy=Math.min(r.bottom+12,window.innerHeight-ch-8);
                        card.style.left=Math.max(8,(window.innerWidth-cw)/2)+'px';
                        card.style.top=Math.max(8,cy)+'px';
                        card.style.width=cw+'px';
                    } else {
                    const spB=window.innerHeight-r.bottom,spA=r.top,spR=window.innerWidth-r.right,spL=r.left;
                    let cx,cy;
                    if(s.pos==='left'&&spL>cw+20){cx=r.left-cw-14;cy=Math.max(8,r.top)}
                    else if(s.pos==='right'&&spR>cw+20){cx=r.right+14;cy=Math.max(8,r.top)}
                    else if(s.pos==='above'&&spA>ch+20){cx=Math.max(8,Math.min(r.left,window.innerWidth-cw-8));cy=r.top-ch-14}
                    else if(spB>ch+20){cx=Math.max(8,Math.min(r.left,window.innerWidth-cw-8));cy=r.bottom+14}
                    else if(spA>ch+20){cx=Math.max(8,Math.min(r.left,window.innerWidth-cw-8));cy=r.top-ch-14}
                    else if(spL>cw+20){cx=r.left-cw-14;cy=Math.max(8,r.top)}
                    else if(spR>cw+20){cx=r.right+14;cy=Math.max(8,r.top)}
                    else{cx=Math.max(8,window.innerWidth-cw-8);cy=8}
                    if(cy+ch>window.innerHeight-8)cy=window.innerHeight-ch-8;
                    if(cy<8)cy=8;if(cx<8)cx=8;
                    card.style.left=cx+'px';card.style.top=cy+'px';
                    }
                },250);
            } else spotlight.style.display='none';
        },200);
        }
    }
    function cleanup(){
        if(_prevAfter){_prevAfter();_prevAfter=null}
        removeTourPanel();closePanelMgr();spotlight.remove();card.remove();collapseAll();
        if(_savedData){currentSnapshotMesIdx=_savedMesIdx;updatePanel(_savedData)} else {
            const body=document.getElementById('sp-panel-body');
            if(body)body.innerHTML='<div class="sp-empty-state"><div class="sp-empty-icon">\u2726</div><div class="sp-empty-title">Ready to Go</div><div class="sp-empty-text">Send your first message to start tracking.</div></div>';
        }
        renderTimeline();
    }
    card.addEventListener('click',(e)=>{
        if(e.target.closest('[data-next]')){step++;renderStep()}
        else if(e.target.closest('[data-prev]')){step--;renderStep()}
        else if(e.target.closest('[data-done]')||e.target.closest('[data-end]'))cleanup();
    });
    renderStep();
}

// ── Settings ──
function createSettings(){
    if(document.getElementById('scenepulse-settings'))return;
    try{
    let po='',pre='',lo='';
    try{po=getConnectionProfiles().map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}catch{}
    try{pre=getChatPresets().map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}catch{}
    try{lo=getLorebooks().map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}catch{}
    const html=`<div id="scenepulse-settings" class="extension_settings"><div class="inline-drawer"><div class="inline-drawer-toggle inline-drawer-header"><div class="sp-drawer-header-content"><span class="sp-drawer-icon-wrap">${MASCOT_SVG}</span><div class="sp-drawer-title-block"><span class="sp-drawer-title">Scene<span style="color:var(--sp-accent)">Pulse</span></span><span class="sp-drawer-version">v4.9.81 — Scene Intelligence</span></div><span class="sp-drawer-badge sp-on" id="sp-badge"><span class="sp-drawer-badge-dot"></span>Active</span></div><div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div></div><div class="inline-drawer-content">
<div class="sp-sh">General</div><label class="sp-ck"><input type="checkbox" id="sp-enabled"> Enable ScenePulse</label><label class="sp-ck"><input type="checkbox" id="sp-auto-gen"> Auto-generate on AI messages</label><label class="sp-ck"><input type="checkbox" id="sp-show-thoughts"> Show thought bubbles</label><label class="sp-ck"><input type="checkbox" id="sp-show-weather"> Weather overlay effects</label><label class="sp-ck"><input type="checkbox" id="sp-show-timetint"> Time-of-day ambience</label><label class="sp-ck"><input type="checkbox" id="sp-show-devbtns"> Show developer tools</label><div style="margin-top:6px;display:flex;gap:6px"><button class="sp-btn" id="sp-btn-setup">📋 Setup Guide</button><button class="sp-btn" id="sp-btn-tour">✦ Guided Tour</button></div><div id="sp-separate-settings"><div class="sp-fi"><label>Context msgs</label><input type="number" id="sp-ctx" min="1" max="30"></div><div class="sp-hint sp-ctx-hint">How many recent messages to include when generating tracker updates. <em>Separate mode only — Together mode uses ST's full context automatically.</em><br><span class="sp-ctx-range"><strong>3–4</strong> · Fastest. Good for simple 1-on-1 scenes (~5K token prompt)</span><br><span class="sp-ctx-range"><strong>5–8</strong> · Balanced. Recommended for most scenes (~8–12K tokens)</span><br><span class="sp-ctx-range"><strong>8–15</strong> · Better continuity for complex multi-character scenes (~12–20K tokens)</span><br><span class="sp-ctx-range"><strong>15+</strong> · Maximum context but significantly slower and more expensive</span><br><span class="sp-ctx-note">⚠ This is the biggest factor in Separate mode speed. At 8 msgs your tracker prompt is ~10K tokens — doubling roughly doubles generation time. Lower values (3–4) can cut tracker time by 40–60%.</span></div><div class="sp-fi"><label>Max retries</label><input type="number" id="sp-retries" min="0" max="5"></div><div class="sp-hint sp-ctx-hint"><em>Separate mode only.</em> How many times to retry if the tracker API call returns invalid JSON.</div></div>
<div class="sp-sh">Injection Method</div><div class="sp-fs"><label>Mode</label><select id="sp-injection-method"><option value="inline">Together (AI appends tracker to its response)</option><option value="separate">Separate (dedicated API call after AI response)</option></select></div>
<div id="sp-method-inline"><div class="sp-hint">The AI writes its normal response, then appends tracker JSON at the end. ScenePulse automatically extracts and hides the JSON. <strong>Recommended for most setups.</strong></div><div class="sp-hint sp-pros-cons"><span class="sp-pro">✓ Single API call — typically ~100–120s total</span><br><span class="sp-pro">✓ No profile switching — eliminates message deletion risk</span><br><span class="sp-pro">✓ AI has full narrative context for accurate tracking</span><br><span class="sp-pro">✓ 2–3× faster than Separate mode in practice</span><br><span class="sp-con">✗ Uses tokens from the main response budget (~1,700 tokens for tracker)</span><br><span class="sp-con">✗ May slightly reduce narrative length on token-limited models</span></div>
<div class="sp-sh" style="margin-top:8px">Fallback Recovery</div><div class="sp-hint">If the AI omits the tracker payload, ScenePulse can automatically run a separate API call to recover. Requires a connection profile to be configured.</div><label class="sp-ck"><input type="checkbox" id="sp-fallback-enabled"> Enable automatic fallback</label><div id="sp-fallback-settings"><div class="sp-fs"><label>Fallback Profile</label><select id="sp-fallback-profile"><option value="">(Same as current)</option>${po}</select></div><div class="sp-fs"><label>Fallback Preset</label><select id="sp-fallback-preset"><option value="">(Built-in: ScenePulse GLM-5)</option>${pre}</select></div></div><button class="sp-btn" id="sp-btn-refresh-fb">↻ Refresh Profiles</button></div>
<div id="sp-method-separate" style="display:none"><div class="sp-hint">After the AI responds, a separate quiet API call generates the tracker JSON independently. Expect ~250–300s total per message (narrative + wait + tracker).</div><div class="sp-hint sp-pros-cons"><span class="sp-pro">✓ Clean responses — narrative never token-competes with tracker</span><br><span class="sp-pro">✓ Dedicated token budget for tracker output</span><br><span class="sp-pro">✓ Can use a different connection profile/preset</span><br><span class="sp-con">✗ Two API calls per message — 2–3× slower than Together mode</span><br><span class="sp-con">✗ ~12s dead time between calls (chat save + preset switching)</span><br><span class="sp-con">✗ Tracker prompt is ~10K+ tokens at 8 context msgs — reduce to 3–4 for speed</span><br><span class="sp-con">✗ Profile switching can cause message deletion (race condition with other extensions)</span><br><span class="sp-con">✗ Embeds previous snapshot into narrative call (~1.9K tokens) unless Embed snapshots = 0</span></div><div class="sp-fs"><label>Connection Profile</label><select id="sp-profile"><option value="">(Current)</option>${po}</select></div><div class="sp-fs"><label>Chat Completion Preset</label><select id="sp-preset"><option value="">(Built-in: ScenePulse GLM-5)</option>${pre}</select></div><div class="sp-hint sp-preset-info" id="sp-preset-info">Built-in preset: temp=0.6, top_p=0.95, freq_pen=0.15, max_tokens=4096. Optimized for structured JSON output on GLM-5.</div><div class="sp-fs"><label>Prompt Mode</label><select id="sp-mode"><option value="native">Native API</option><option value="json">JSON</option><option value="xml">XML</option></select></div><button class="sp-btn" id="sp-btn-refresh">↻ Refresh Profiles</button></div>
<div id="sp-embed-section"><div class="sp-sh">Context Embedding</div><div class="sp-hint">Embed recent scene snapshots into the <strong>narrative</strong> conversation context so the AI can reference tracker state while writing. Only applies in Separate mode. The tracker's own API call always receives the previous snapshot regardless of this setting.</div><div class="sp-fi"><label>Embed snapshots</label><input type="number" id="sp-embed-n" min="0" max="5"></div><div class="sp-hint sp-ctx-note">⚠ Each embedded snapshot adds ~1.9K tokens to your narrative prompt. Set to <strong>0</strong> to eliminate this overhead — the tracker API call still receives previous state independently. Set to <strong>1</strong> for narrative continuity (AI remembers scene details). Values above 1 are rarely beneficial.</div><div class="sp-fs"><label>Embed as role</label><select id="sp-embed-role"><option value="system">System (recommended)</option><option value="user">User</option><option value="assistant">Assistant</option></select></div><div class="sp-hint"><strong>System</strong>: Injected as invisible context — AI treats it as authoritative background info. Best for continuity without polluting the conversation. <strong>User</strong>: Appears as if the user said it — some models respond more attentively. <strong>Assistant</strong>: Appears as previous AI output — can reinforce the AI's own memory but may confuse some models.</div></div>
<div class="sp-sh">Lorebooks</div><div id="sp-lore-display" class="sp-lore-display"></div><div class="sp-fs"><label>Filter Mode</label><select id="sp-lore-mode"><option value="character_attached">Attached (character, chat &amp; global)</option><option value="character_only">Character lorebook only</option><option value="exclude_all">Disabled — don't inject lorebooks</option><option value="allowlist">Custom allowlist</option></select></div><div class="sp-lore-rec" id="sp-lore-rec"></div><div id="sp-lore-section" style="display:none;padding:4px 0"><div class="sp-fi"><select id="sp-lore-sel" style="flex:1;background:var(--sp-surface);border:1px solid var(--sp-border-strong);color:var(--sp-text);border-radius:var(--sp-radius);padding:4px 6px;font-size:11px"><option value="">(Select)</option>${lo}</select><button class="sp-btn" id="sp-lore-add">+</button></div><div class="sp-lore-tags" id="sp-lore-tags"></div></div><button class="sp-btn" id="sp-btn-refresh-lore">↻ Refresh Lorebooks</button>
<div class="sp-sh">System Prompt</div><div class="sp-hint">The instruction sent to the model. Defines how the tracker generates data.</div><div class="sp-prompt-actions"><button class="sp-btn sp-btn-sm" id="sp-sysprompt-default">↺ Reset to Default</button><button class="sp-btn sp-btn-sm" id="sp-sysprompt-copy">📋 Copy</button></div><textarea id="sp-sysprompt" rows="10" placeholder="(built-in)"></textarea>
<div class="sp-sh">JSON Schema</div><div class="sp-hint">The JSON schema defining the output structure. Must be valid JSON.</div><div class="sp-prompt-actions"><button class="sp-btn sp-btn-sm" id="sp-schema-default">↺ Reset to Default</button><button class="sp-btn sp-btn-sm" id="sp-schema-copy">📋 Copy</button></div><textarea id="sp-schema" rows="10" placeholder="(built-in)"></textarea>
<div class="sp-sh">Actions</div><div class="sp-fi" style="gap:4px"><button class="sp-btn sp-btn-primary" id="sp-btn-gen" style="flex:1">⟳ Generate</button><button class="sp-btn" id="sp-btn-clear" style="flex:1">🗑 Clear Data</button><button class="sp-btn" id="sp-btn-reset" style="flex:1">↺ Reset Settings</button></div><div class="sp-hint"><strong>Clear Data</strong> — Removes all tracker snapshots from this chat. Settings preserved.<br><strong>Reset Settings</strong> — Resets injection method, profiles, lorebook mode, etc. to defaults. Tracker data preserved.</div><div class="sp-sh">Debug</div><div class="sp-fi" style="gap:4px"><button class="sp-btn" id="sp-btn-debug" style="flex:1">📋 SP Log</button><button class="sp-btn" id="sp-btn-debug-view" style="flex:1">🔍 View Log</button></div><div class="sp-fi" style="gap:4px"><button class="sp-btn" id="sp-btn-copy-console" style="flex:1">📋 Console</button><button class="sp-btn" id="sp-btn-copy-response" style="flex:1">📋 Last Response</button></div><div class="sp-hint"><strong>SP Log</strong> — ScenePulse internal debug log (normalizer, extraction, generation).<br><strong>Console</strong> — Full browser console output including SillyTavern and other extensions.<br><strong>Last Response</strong> — Raw tracker JSON from the most recent generation. In <em>Separate</em> mode, this is the full API response. In <em>Together</em> mode, this is the extracted JSON block that was stripped from the AI's narrative response.</div><div id="sp-debug-viewer" style="display:none"><div class="sp-debug-header"><span style="font-weight:700;font-size:10px">Debug Log</span><span id="sp-debug-count" style="color:var(--sp-text-dim);font-size:9px"></span><span style="flex:1"></span><button class="sp-btn" id="sp-debug-copy-inline" style="padding:1px 6px;font-size:9px">📋</button><button class="sp-btn" id="sp-debug-close" style="padding:1px 6px;font-size:9px">✕</button></div><div id="sp-debug-body" class="sp-debug-body"></div></div>
</div></div></div>`;
    const $t=$('#extensions_settings2').length?$('#extensions_settings2'):$('#extensions_settings');
    if(!$t.length){warn('No settings container');return}
    $t.append(html);loadUI();bindUI();log('Settings created');
    }catch(e){err('createSettings:',e)}
}

function refreshCustomSection(cp,panelBody){
    if(!panelBody||!cp?.name)return;
    const cpKey='custom_'+cp.name.replace(/\s+/g,'_').toLowerCase();
    const existing=panelBody.querySelector(`.sp-section[data-key="${cpKey}"]`);
    if(!existing)return;
    // Re-render just the content inside the section body
    const content=existing.querySelector('.sp-section-content');
    if(!content)return;
    const d=_cachedNormData||{};
    content.innerHTML='';
    for(const f of(cp.fields||[])){
        const r=document.createElement('div');r.className='sp-row';
        r.innerHTML=`<div class="sp-row-label">${esc(f.label||f.key)}</div>`;
        if(f.type==='meter'){
            const num=parseInt(d[f.key])||0;
            const wrap=document.createElement('div');wrap.className='sp-row-value sp-cp-meter-wrap';
            wrap.innerHTML=`<div class="sp-cp-meter"><div class="sp-cp-meter-fill" style="width:${clamp(num,0,100)}%"></div></div><span class="sp-cp-meter-val">${num}</span>`;
            r.appendChild(wrap);
        } else if(f.type==='list'&&Array.isArray(d[f.key])){
            const val=document.createElement('div');val.className='sp-row-value';val.textContent=d[f.key].join(', ')||'\u2014';
            r.appendChild(val);
        } else {
            const val=document.createElement('div');val.className='sp-row-value';val.textContent=str(d[f.key])||'\u2014';
            r.appendChild(val);
        }
        content.appendChild(r);
    }
}

function renderCustomPanelsMgr(s,container,panelBody){
    const panels=s.customPanels||[];
    
    const _openState={};container.querySelectorAll('.sp-custom-panel-card').forEach((c,i)=>{_openState[i]=c.classList.contains('sp-cp-open')});
    container.innerHTML='';
    // Info button + popup
    const infoRow=document.createElement('div');infoRow.style.cssText='display:flex;align-items:center;gap:6px;margin-bottom:6px';
    const infoBtn=document.createElement('button');infoBtn.className='sp-cp-info-btn';infoBtn.textContent='?';infoBtn.title='How custom panels work';
    const infoPopup=document.createElement('div');infoPopup.className='sp-cp-info-popup';
    infoPopup.innerHTML=`<b>Custom Panels</b> let you track anything the AI should monitor.<br><br><b>Keys</b> must be <code>lowercase_snake_case</code> (auto-enforced). Examples: <code>health</code>, <code>mana_pool</code>, <code>street_rep</code><br><br><b>LLM Hint</b> tells the AI what to output. Be specific:<br>\u2022 <code>{{user}}'s current health 0-100, reduced by damage</code><br>\u2022 <code>Mana remaining after spellcasting, starts at 100</code><br>\u2022 <code>Reputation with the merchant guild</code><br><br><b>Types:</b> <code>text</code> = free string, <code>number</code> = integer, <code>meter</code> = 0-100 bar, <code>list</code> = array, <code>enum</code> = pick from options<br><br><b>Drag</b> the ⠿ handle to reorder fields within or between panels.`;
    infoBtn.addEventListener('click',()=>infoPopup.classList.toggle('sp-visible'));
    infoRow.appendChild(infoBtn);
    const infoLabel=document.createElement('span');infoLabel.style.cssText='font-size:9px;color:var(--sp-text-dim);opacity:0.6';infoLabel.textContent='How custom panels work';
    infoRow.appendChild(infoLabel);
    container.appendChild(infoRow);container.appendChild(infoPopup);
    if(!panels.length){
        container.appendChild(Object.assign(document.createElement('div'),{className:'sp-cp-empty',textContent:'No custom panels yet. Create one to track custom data.'}));
        return;
    }
    panels.forEach((cp,cpIdx)=>{
        const card=document.createElement('div');card.className='sp-custom-panel-card';if(_openState[cpIdx]!==undefined?_openState[cpIdx]:true)card.classList.add('sp-cp-open');
        const liveRefresh=()=>{refreshCustomSection(cp,panelBody);
            // Auto-refresh schema/prompt when custom panel changes
            const schemaEl=document.getElementById('sp-schema');
            const promptEl=document.getElementById('sp-sysprompt');
            if(schemaEl&&!s.schema)schemaEl.value=JSON.stringify(buildDynamicSchema(s),null,2);
            if(promptEl&&!s.systemPrompt)promptEl.value=buildDynamicPrompt(s);
        };
        // Header: chevron + name + delete
        const header=document.createElement('div');header.className='sp-cp-header';
        const chevron=document.createElement('span');chevron.className='sp-cp-chevron';chevron.textContent='\u25B6';
        const nameInput=document.createElement('input');nameInput.className='sp-cp-name';nameInput.type='text';nameInput.value=cp.name||'';nameInput.placeholder='Panel name';nameInput.spellcheck=false;
        nameInput.addEventListener('click',e=>e.stopPropagation());
        nameInput.addEventListener('change',()=>{
            const oldKey='custom_'+cp.name.replace(/\s+/g,'_').toLowerCase();
            cp.name=nameInput.value.trim()||'Untitled';saveSettings();
            const sec=panelBody?.querySelector(`.sp-section[data-key="${oldKey}"]`);
            if(sec){
                const newKey='custom_'+cp.name.replace(/\s+/g,'_').toLowerCase();
                sec.dataset.key=newKey;
                const titleEl=sec.querySelector('.sp-section-title');if(titleEl)titleEl.textContent=cp.name;
            }
        });
        const delBtn=document.createElement('button');delBtn.className='sp-btn sp-btn-sm sp-cp-del';delBtn.textContent='\u2715';delBtn.title='Delete panel';
        delBtn.addEventListener('click',async(e)=>{
            e.stopPropagation();
            if(!await spConfirm('Delete Panel',`Remove "${cp.name||'Untitled'}" and all its fields? This cannot be undone.`))return;
            s.customPanels.splice(cpIdx,1);saveSettings();
            renderCustomPanelsMgr(s,container,panelBody);
            const cpKey='custom_'+cp.name.replace(/\s+/g,'_').toLowerCase();
            const sec=panelBody?.querySelector(`.sp-section[data-key="${cpKey}"]`);
            if(sec){sec.classList.add('sp-panel-hidden');setTimeout(()=>sec.remove(),350)}
            toastr.info('Panel deleted');
        });
        header.appendChild(chevron);header.appendChild(nameInput);header.appendChild(delBtn);
        header.addEventListener('click',(e)=>{if(e.target===nameInput)return;card.classList.toggle('sp-cp-open')});
        card.appendChild(header);
        // Collapsible body
        const body=document.createElement('div');body.className='sp-cp-body';
        // Column headers
        if(cp.fields?.length){
            const labels=document.createElement('div');labels.className='sp-cp-field-labels';
            labels.innerHTML='<span></span><span>Key</span><span>Label</span><span>Type</span><span>LLM Hint</span><span></span>';
            body.appendChild(labels);
        }
        // Fields with drag/drop
        const fieldsList=document.createElement('div');fieldsList.className='sp-cp-fields';
        let _dragSrcIdx=null,_dragSrcCpIdx=null;
        (cp.fields||[]).forEach((f,fIdx)=>{
            const row=document.createElement('div');row.className='sp-cp-field-row';
            row.dataset.fidx=fIdx;row.dataset.cpidx=cpIdx;
            // Drag handle
            const handle=document.createElement('span');handle.className='sp-cp-drag-handle';handle.draggable=true;handle.textContent='\u2807';handle.title='Drag to reorder';
            // Drag events
            handle.addEventListener('dragstart',(e)=>{e.stopPropagation();_dragSrcIdx=fIdx;_dragSrcCpIdx=cpIdx;row.classList.add('sp-dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',cpIdx+':'+fIdx)});
            handle.addEventListener('dragend',()=>{row.classList.remove('sp-dragging');container.querySelectorAll('.sp-drag-over').forEach(r=>r.classList.remove('sp-drag-over'))});
            row.addEventListener('dragover',(e)=>{e.preventDefault();e.dataTransfer.dropEffect='move';row.classList.add('sp-drag-over')});
            row.addEventListener('dragleave',()=>row.classList.remove('sp-drag-over'));
            row.addEventListener('drop',(e)=>{
                e.preventDefault();row.classList.remove('sp-drag-over');
                const data=e.dataTransfer.getData('text/plain').split(':');
                const srcCp=parseInt(data[0]),srcF=parseInt(data[1]);
                const dstCp=cpIdx,dstF=fIdx;
                if(srcCp===dstCp&&srcF===dstF)return;
                const srcPanel=s.customPanels[srcCp];const dstPanel=s.customPanels[dstCp];
                if(!srcPanel||!dstPanel)return;
                const [moved]=srcPanel.fields.splice(srcF,1);
                dstPanel.fields.splice(dstF,0,moved);
                saveSettings();renderCustomPanelsMgr(s,container,panelBody);liveRefresh();
            });
            // Key: enforce lowercase_snake_case
            const keyIn=document.createElement('input');keyIn.className='sp-cp-field-key';keyIn.placeholder='key';keyIn.value=f.key||'';keyIn.spellcheck=false;keyIn.title='JSON key \u2014 lowercase_snake_case only.\nExamples: health, mana_pool, reputation';
            keyIn.addEventListener('change',()=>{f.key=keyIn.value.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'').replace(/^[0-9]/,'_$&').replace(/_+/g,'_');keyIn.value=f.key;saveSettings();liveRefresh()});
            const labelIn=document.createElement('input');labelIn.className='sp-cp-field-label';labelIn.placeholder='Label';labelIn.value=f.label||'';
            labelIn.title='Display name shown in the panel.\nExamples: Health, Mana Pool, Street Rep';
            labelIn.addEventListener('change',()=>{f.label=labelIn.value;saveSettings();liveRefresh()});
            const typeSel=document.createElement('select');typeSel.className='sp-cp-field-type';
            typeSel.title='Field type:\n\u2022 text \u2014 free-form string\n\u2022 number \u2014 integer\n\u2022 meter \u2014 0-100 bar\n\u2022 list \u2014 array of strings\n\u2022 enum \u2014 pick from options';
            for(const t of['text','number','meter','list','enum']){const o=document.createElement('option');o.value=t;o.textContent=t;o.selected=f.type===t;typeSel.appendChild(o)}
            typeSel.addEventListener('change',()=>{f.type=typeSel.value;saveSettings();renderCustomPanelsMgr(s,container,panelBody);liveRefresh()});
            const descIn=document.createElement('input');descIn.className='sp-cp-field-desc';descIn.placeholder='Describe for AI...';descIn.value=f.desc||'';
            descIn.title='Instructions for the LLM.\n\u2022 "{{user}}\'s health 0-100, reduced by damage"\n\u2022 "Mana remaining after spellcasting"\n\u2022 "Items the character carries"';
            descIn.addEventListener('change',()=>{f.desc=descIn.value;saveSettings()});
            const rmBtn=document.createElement('button');rmBtn.className='sp-btn sp-btn-sm sp-cp-field-rm';rmBtn.textContent='\u2212';rmBtn.title='Remove this field';
            rmBtn.addEventListener('click',()=>{cp.fields.splice(fIdx,1);saveSettings();renderCustomPanelsMgr(s,container,panelBody);liveRefresh()});
            row.appendChild(handle);row.appendChild(keyIn);row.appendChild(labelIn);row.appendChild(typeSel);row.appendChild(descIn);row.appendChild(rmBtn);
            if(f.type==='enum'){
                const optRow=document.createElement('div');optRow.className='sp-cp-field-opt-row';
                const optIn=document.createElement('input');optIn.placeholder='Enum options (comma-separated)';optIn.value=(f.options||[]).join(', ');optIn.spellcheck=false;
                optIn.title='Comma-separated list of allowed values.\nExamples: low, medium, high, critical';
                optIn.addEventListener('change',()=>{f.options=optIn.value.split(',').map(s=>s.trim()).filter(Boolean);saveSettings()});
                optRow.appendChild(optIn);
                const wrapper=document.createElement('div');wrapper.appendChild(row);wrapper.appendChild(optRow);
                fieldsList.appendChild(wrapper);
            } else fieldsList.appendChild(row);
        });
        body.appendChild(fieldsList);
        // Validation warning for incomplete fields
        const hasIncomplete=(cp.fields||[]).some(f=>!f.key||!f.desc);
        if(hasIncomplete&&cp.fields?.length){
            const warn=document.createElement('div');warn.className='sp-cp-warn';
            warn.innerHTML='<svg viewBox="0 0 16 16" width="11" height="11" fill="none" style="flex-shrink:0"><path d="M8 1L1 14h14L8 1z" stroke="#f59e0b" stroke-width="1.2" fill="none"/><line x1="8" y1="6" x2="8" y2="9.5" stroke="#f59e0b" stroke-width="1.4" stroke-linecap="round"/><circle cx="8" cy="11.5" r="0.8" fill="#f59e0b"/></svg><span>Fill in keys and LLM hints so the AI knows what to track.</span>';
            body.appendChild(warn);
        }
        const addFieldBtn=document.createElement('button');addFieldBtn.className='sp-btn sp-btn-sm sp-cp-add-field';addFieldBtn.textContent='+ Add Field';
        addFieldBtn.addEventListener('click',()=>{
            if(!cp.fields)cp.fields=[];
            cp.fields.push({key:'',label:'',type:'text',desc:''});
            saveSettings();renderCustomPanelsMgr(s,container,panelBody);liveRefresh();
        });
        body.appendChild(addFieldBtn);card.appendChild(body);container.appendChild(card);
    });
}

function updateBadge(){const on=getSettings().enabled;const b=document.getElementById('sp-badge');if(b){b.className='sp-drawer-badge '+(on?'sp-on':'sp-off');b.innerHTML=`<span class="sp-drawer-badge-dot"></span>${on?'Active':'Off'}`}}
function loadUI(){const s=getSettings();$('#sp-enabled').prop('checked',s.enabled);$('#sp-auto-gen').prop('checked',s.autoGenerate);$('#sp-show-thoughts').prop('checked',s.showThoughts!==false);$('#sp-show-weather').prop('checked',s.weatherOverlay!==false);$('#sp-show-timetint').prop('checked',s.timeTint!==false);$('#sp-show-devbtns').prop('checked',s.devButtons===true);$('#sp-ctx').val(s.contextMessages);$('#sp-retries').val(s.maxRetries);$('#sp-mode').val(s.promptMode||'json');$('#sp-embed-n').val(s.embedSnapshots);$('#sp-embed-role').val(s.embedRole);$('#sp-lore-mode').val(s.lorebookMode||'character_attached');
    // Rebuild profile/preset dropdowns from current DOM (ST may load them late)
    const profiles=getConnectionProfiles();const presets=getChatPresets();
    // ── localStorage is the source of truth for config persistence ──
    // ST's extensionSettings save pipeline has race conditions with CHAT_CHANGED during init.
    // localStorage is synchronous and completely independent.
    const _lsLoad=()=>{
        try{
            let raw=localStorage.getItem(SP_LS_KEY);
            // Migrate from old key name
            if(!raw){raw=localStorage.getItem('scenepulse_profiles');if(raw)localStorage.removeItem('scenepulse_profiles')}
            return raw?JSON.parse(raw):{}
        }catch{return{}}
    };
    const ls=_lsLoad();
    // On first run or upgrade, seed from extensionSettings if localStorage is empty
    const _seed=(key)=>{if(ls[key]===undefined&&s[key]!==undefined&&s[key]!=='')ls[key]=s[key]};
    _seed('connectionProfile');_seed('chatPreset');_seed('fallbackProfile');_seed('fallbackPreset');
    _seed('fallbackEnabled');_seed('injectionMethod');_seed('lorebookMode');
    _seed('contextMessages');_seed('maxRetries');_seed('promptMode');
    _seed('embedSnapshots');_seed('embedRole');_seed('showThoughts');
    _seed('weatherOverlay');_seed('timeTint');
    // Apply localStorage values back to settings (overrides whatever ST loaded from disk)
    if(ls.connectionProfile!==undefined)s.connectionProfile=ls.connectionProfile;
    if(ls.chatPreset!==undefined)s.chatPreset=ls.chatPreset;
    if(ls.fallbackProfile!==undefined)s.fallbackProfile=ls.fallbackProfile;
    if(ls.fallbackPreset!==undefined)s.fallbackPreset=ls.fallbackPreset;
    if(ls.fallbackEnabled!==undefined)s.fallbackEnabled=ls.fallbackEnabled;
    if(ls.injectionMethod!==undefined)s.injectionMethod=ls.injectionMethod;
    if(ls.lorebookMode!==undefined)s.lorebookMode=ls.lorebookMode;
    if(ls.contextMessages!==undefined)s.contextMessages=ls.contextMessages;
    if(ls.maxRetries!==undefined)s.maxRetries=ls.maxRetries;
    if(ls.promptMode!==undefined)s.promptMode=ls.promptMode;
    if(ls.embedSnapshots!==undefined)s.embedSnapshots=ls.embedSnapshots;
    if(ls.embedRole!==undefined)s.embedRole=ls.embedRole;
    if(ls.showThoughts!==undefined)s.showThoughts=ls.showThoughts;
    if(ls.weatherOverlay!==undefined)s.weatherOverlay=ls.weatherOverlay;
    if(ls.timeTint!==undefined)s.timeTint=ls.timeTint;
    // Re-apply form values after localStorage override
    $('#sp-show-thoughts').prop('checked',s.showThoughts!==false);
    $('#sp-show-weather').prop('checked',s.weatherOverlay!==false);
    $('#sp-show-timetint').prop('checked',s.timeTint!==false);
    $('#sp-ctx').val(s.contextMessages);$('#sp-retries').val(s.maxRetries);
    $('#sp-mode').val(s.promptMode||'json');$('#sp-embed-n').val(s.embedSnapshots);$('#sp-embed-role').val(s.embedRole);
    $('#sp-lore-mode').val(s.lorebookMode||'character_attached');
    // Smart val: resolve saved value (may be UUID or legacy name) to an option value
    const _smartVal=(sel,val,list,label)=>{
        const $el=$(sel);
        if(!val){$el.val('');return ''}
        // 1. Direct match (UUID matches option value)
        $el.val(val);
        if($el.val()===val)return val;
        // 2. Exact name match (case-insensitive)
        const norm=val.trim().toLowerCase();
        let match=list.find(p=>p.name.trim().toLowerCase()===norm);
        // 3. Partial/contains match
        if(!match)match=list.find(p=>p.name.toLowerCase().includes(norm)||norm.includes(p.name.toLowerCase()));
        if(match){
            $el.val(match.id);
            log('Profile resolved ['+label+']:',val,'→',match.id,'('+match.name+')');
            return match.id;
        }
        // 4. Failed — profile was deleted
        warn('Profile unresolved ['+label+']: "'+val+'" not found. Available:',list.map(p=>p.name).join(', '));
        $el.val('');
        return '';
    };
    let ph='<option value="">(Current)</option>';for(const p of profiles)ph+=`<option value="${esc(p.id)}">${esc(p.name)}</option>`;
    $('#sp-profile').html(ph);s.connectionProfile=_smartVal('#sp-profile',s.connectionProfile,profiles,'connectionProfile');
    let prh='<option value="">(Built-in: ScenePulse GLM-5)</option>';for(const p of presets)prh+=`<option value="${esc(p.id)}">${esc(p.name)}</option>`;
    $('#sp-preset').html(prh);s.chatPreset=_smartVal('#sp-preset',s.chatPreset,presets,'chatPreset');
    // Fallback settings — rebuild options from DOM
    let fph='<option value="">(Same as current)</option>';for(const p of profiles)fph+=`<option value="${esc(p.id)}">${esc(p.name)}</option>`;
    $('#sp-fallback-profile').html(fph);s.fallbackProfile=_smartVal('#sp-fallback-profile',s.fallbackProfile,profiles,'fallbackProfile');
    let fpre='<option value="">(Built-in: ScenePulse GLM-5)</option>';for(const p of presets)fpre+=`<option value="${esc(p.id)}">${esc(p.name)}</option>`;
    $('#sp-fallback-preset').html(fpre);s.fallbackPreset=_smartVal('#sp-fallback-preset',s.fallbackPreset,presets,'fallbackPreset');
    $('#sp-fallback-enabled').prop('checked',s.fallbackEnabled!==false);
    $('#sp-fallback-settings').toggle(s.fallbackEnabled!==false);
    
    // Show/hide built-in preset info based on selection
    const presetVal=s.chatPreset||'';
    $('#sp-preset-info').toggle(!presetVal);
    // Injection method toggle
    $('#sp-injection-method').val(s.injectionMethod||'inline');
    $('#sp-method-inline').toggle(s.injectionMethod==='inline');
    $('#sp-method-separate').toggle(s.injectionMethod!=='inline');
    $('#sp-embed-section').toggle(s.injectionMethod!=='inline');
    $('#sp-separate-settings').toggle(s.injectionMethod!=='inline');
    // Display active lorebooks
    refreshLorebookDisplay();
    updateLorebookRec();
    // Show active prompt (custom or built-in)
    $('#sp-sysprompt').val(s.systemPrompt||buildDynamicPrompt(s));
    // Show active schema (custom or dynamically built)
    const schemaStr=s.schema||JSON.stringify(buildDynamicSchema(s),null,2);
    $('#sp-schema').val(schemaStr);
    updateBadge();$('#sp-lore-section').toggle(s.lorebookMode==='allowlist');$('#scenepulse-settings .inline-drawer-content').toggleClass('sp-disabled',!s.enabled);
    // Save resolved UUIDs back to localStorage (synchronous, immune to ST race conditions)
    _spSaveLS();
}
// ── localStorage helper for config persistence ──
// ST's extensionSettings save has race conditions with CHAT_CHANGED. localStorage is synchronous + reliable.
function _spSaveLS(){
    const s=getSettings();
    try{localStorage.setItem(SP_LS_KEY,JSON.stringify({
        connectionProfile:s.connectionProfile||'',chatPreset:s.chatPreset||'',
        fallbackProfile:s.fallbackProfile||'',fallbackPreset:s.fallbackPreset||'',
        fallbackEnabled:s.fallbackEnabled!==false,
        injectionMethod:s.injectionMethod||'inline',
        lorebookMode:s.lorebookMode||'character_attached',
        contextMessages:s.contextMessages||8,maxRetries:s.maxRetries??2,
        promptMode:s.promptMode||'json',
        embedSnapshots:s.embedSnapshots??1,embedRole:s.embedRole||'system',
        showThoughts:s.showThoughts!==false,
        weatherOverlay:s.weatherOverlay!==false,timeTint:s.timeTint!==false
    }))}catch(e){warn('localStorage save:',e)}
}
function bindUI(){const s=getSettings();
    $('#sp-enabled').on('change',function(){s.enabled=this.checked;saveSettings();updateBadge();$('#scenepulse-settings .inline-drawer-content').toggleClass('sp-disabled',!this.checked);if(!this.checked){hidePanel();const tp=document.getElementById('sp-thought-panel');if(tp)tp.classList.remove('sp-tp-visible')}else{renderExisting()}});
    $('#sp-auto-gen').on('change',function(){s.autoGenerate=this.checked;saveSettings()});
    $('#sp-injection-method').on('change',function(){s.injectionMethod=this.value;saveSettings();_spSaveLS();$('#sp-method-inline').toggle(this.value==='inline');$('#sp-method-separate').toggle(this.value!=='inline');$('#sp-embed-section').toggle(this.value!=='inline');$('#sp-separate-settings').toggle(this.value!=='inline');updateLorebookRec()});
    $('#sp-show-thoughts').on('change',function(){s.showThoughts=this.checked;saveSettings();_spSaveLS();const tp=document.getElementById('sp-thought-panel');if(tp){if(this.checked){const snap=getLatestSnapshot();if(snap)updateThoughts(normalizeTracker(snap))}else tp.classList.remove('sp-tp-visible')}});
    $('#sp-show-weather').on('change',function(){s.weatherOverlay=this.checked;saveSettings();_spSaveLS();const btn=document.getElementById('sp-tb-weather');if(btn)btn.classList.toggle('sp-tb-active',this.checked);if(!this.checked)clearWeatherOverlay();else{const snap=getLatestSnapshot();if(snap){const n=normalizeTracker(snap);updateWeatherOverlay(n.weather)}}});
    $('#sp-show-timetint').on('change',function(){s.timeTint=this.checked;saveSettings();_spSaveLS();const btn=document.getElementById('sp-tb-timeTint');if(btn)btn.classList.toggle('sp-tb-active',this.checked);if(!this.checked)clearTimeTint();else{const snap=getLatestSnapshot();if(snap){const n=normalizeTracker(snap);updateTimeTint(n.time)}}});
    $('#sp-show-devbtns').on('change',function(){s.devButtons=this.checked;saveSettings();const dv=this.checked?'':'none';const dw=document.getElementById('sp-dev-wx-wrap');if(dw)dw.style.display=dv;const dt=document.getElementById('sp-dev-time-wrap');if(dt)dt.style.display=dv});
    $('#sp-ctx').on('change',function(){s.contextMessages=clamp(+this.value,1,30);saveSettings();_spSaveLS()});
    $('#sp-retries').on('change',function(){s.maxRetries=clamp(+this.value,0,5);saveSettings();_spSaveLS()});
    $('#sp-profile').on('change',function(){s.connectionProfile=this.value;saveSettings();_spSaveLS()});
    $('#sp-preset').on('change',function(){s.chatPreset=this.value;saveSettings();_spSaveLS();$('#sp-preset-info').toggle(!this.value)});
    $('#sp-mode').on('change',function(){s.promptMode=this.value;saveSettings();_spSaveLS()});
    // Fallback settings
    $('#sp-fallback-enabled').on('change',function(){s.fallbackEnabled=this.checked;saveSettings();_spSaveLS();$('#sp-fallback-settings').toggle(this.checked);});
    $('#sp-fallback-profile').on('change',function(){s.fallbackProfile=this.value;saveSettings();_spSaveLS();});
    $('#sp-fallback-preset').on('change',function(){s.fallbackPreset=this.value;saveSettings();_spSaveLS()});
    $('#sp-btn-setup').on('click',()=>showSetupGuide());
    $('#sp-btn-tour').on('click',()=>startGuidedTour());
    $('#sp-embed-n').on('change',function(){s.embedSnapshots=clamp(+this.value,0,5);saveSettings();_spSaveLS()});
    $('#sp-embed-role').on('change',function(){s.embedRole=this.value;saveSettings();_spSaveLS()});
    $('#sp-lore-mode').on('change',function(){s.lorebookMode=this.value;saveSettings();_spSaveLS();$('#sp-lore-section').toggle(this.value==='allowlist');refreshLorebookDisplay();updateLorebookRec()});
    $('#sp-sysprompt').on('change',function(){const v=this.value.trim();const dynamicPrompt=buildDynamicPrompt(s).trim();s.systemPrompt=(v===dynamicPrompt)?null:v||null;saveSettings()});
    $('#sp-schema').on('change',function(){const v=this.value.trim();const dynamicStr=JSON.stringify(buildDynamicSchema(s),null,2);if(v===dynamicStr){s.schema=null;saveSettings();return}if(v){try{JSON.parse(v);s.schema=v}catch{toastr.error('Invalid JSON');return}}else s.schema=null;saveSettings()});
    // Default and Copy buttons
    $('#sp-sysprompt-default').on('click',()=>{s.systemPrompt=null;saveSettings();$('#sp-sysprompt').val(buildDynamicPrompt(s));toastr.info('System prompt reset to default')});
    $('#sp-sysprompt-copy').on('click',()=>{navigator.clipboard.writeText($('#sp-sysprompt').val());toastr.success('Prompt copied')});
    $('#sp-schema-default').on('click',()=>{s.schema=null;saveSettings();$('#sp-schema').val(JSON.stringify(buildDynamicSchema(s),null,2));toastr.info('Schema reset to default')});
    $('#sp-schema-copy').on('click',()=>{navigator.clipboard.writeText($('#sp-schema').val());toastr.success('Schema copied')});
    $('#sp-btn-refresh').on('click',()=>{
        const _rp=getConnectionProfiles(),_rpr=getChatPresets();
        let h='<option value="">(Current)</option>';for(const p of _rp)h+=`<option value="${esc(p.id)}">${esc(p.name)}</option>`;$('#sp-profile').html(h).val(s.connectionProfile||'');
        let pr='<option value="">(Built-in: ScenePulse GLM-5)</option>';for(const p of _rpr)pr+=`<option value="${esc(p.id)}">${esc(p.name)}</option>`;$('#sp-preset').html(pr).val(s.chatPreset||'');
        toastr.info('Profiles refreshed');
    });
    $('#sp-btn-refresh-fb').on('click',()=>{
        const _rp=getConnectionProfiles(),_rpr=getChatPresets();
        let fh='<option value="">(Same as current)</option>';for(const p of _rp)fh+=`<option value="${esc(p.id)}">${esc(p.name)}</option>`;$('#sp-fallback-profile').html(fh).val(s.fallbackProfile||'');
        let fp='<option value="">(Built-in: ScenePulse GLM-5)</option>';for(const p of _rpr)fp+=`<option value="${esc(p.id)}">${esc(p.name)}</option>`;$('#sp-fallback-preset').html(fp).val(s.fallbackPreset||'');
        toastr.info('Fallback profiles refreshed');
    });
    $('#sp-btn-refresh-lore').on('click',()=>{
        let lo='<option value="">(Select)</option>';for(const p of getLorebooks())lo+=`<option value="${esc(p.id)}">${esc(p.name)}</option>`;$('#sp-lore-sel').html(lo);
        refreshLorebookDisplay();updateLorebookRec();
        toastr.info('Lorebooks refreshed');
    });
    $('#sp-lore-add').on('click',()=>{const sel=document.getElementById('sp-lore-sel');if(!sel?.value)return;const name=sel.selectedOptions[0]?.textContent?.trim();if(!name)return;if(!s.lorebookAllowlist)s.lorebookAllowlist=[];if(!s.lorebookAllowlist.includes(name)){s.lorebookAllowlist.push(name);saveSettings();renderLoreTags()}sel.value=''});
    $('#sp-btn-gen').on('click',async()=>{const{chat}=SillyTavern.getContext();if(!chat.length)return;toastr.info('Generating…');
        const body=document.getElementById('sp-panel-body');
        showLoadingOverlay(body,'Generating Scene','From settings');
        lastGenSource='manual:settings';
        spAutoShow();showStopButton();startElapsedTimer();
        showThoughtLoading('Updating thoughts','Analyzing context');
        const preNonce=genNonce;
        const r=await generateTracker(chat.length-1);
        if(genNonce>preNonce+1){log('Settings gen: stale caller');return}
        hideStopButton();stopElapsedTimer();
        clearLoadingOverlay(body);clearThoughtLoading();
        if(r)toastr.success('Done');
        else{toastr.error('Failed');const snap=getLatestSnapshot();if(snap){const norm=normalizeTracker(snap);updatePanel(norm)}}});
    $('#sp-btn-clear').on('click',async()=>{
        if(!await spConfirm('Clear Data','Remove all tracker snapshots from this chat? Your settings are preserved.'))return;
        getTrackerData().snapshots={};SillyTavern.getContext().saveMetadata();document.querySelectorAll('.sp-thoughts').forEach(e=>e.remove());const tp=document.getElementById('sp-thought-panel');if(tp)tp.classList.remove('sp-tp-visible');const body=document.getElementById('sp-panel-body');if(body)body.innerHTML='<div class="sp-empty-state"><div class="sp-empty-icon">📡</div><div class="sp-empty-title">Data cleared</div><div class="sp-empty-sub">Send a message or click <strong>⟳</strong> to generate.</div></div>';genMeta={promptTokens:0,completionTokens:0,elapsed:0};toastr.info('Cleared');
    });
    $('#sp-btn-reset').on('click',async()=>{
        if(!await spConfirm('Reset Settings','Reset all ScenePulse settings to defaults? Tracker data is preserved.'))return;
        SillyTavern.getContext().extensionSettings[MODULE_NAME]=structuredClone(DEFAULTS);saveSettings();try{localStorage.removeItem(SP_LS_KEY)}catch(e){}loadUI();toastr.info('Settings reset to defaults');
    });
    $('#sp-btn-debug').on('click',()=>{const t='ScenePulse Debug ('+new Date().toISOString()+')\n'+debugLog.join('\n');navigator.clipboard.writeText(t).then(()=>toastr.success('SP Log copied ('+debugLog.length+' entries)')).catch(()=>{const ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);toastr.success('Copied')})});
    $('#sp-btn-copy-console').on('click',()=>{
        const t='Browser Console Capture ('+new Date().toISOString()+')\nEntries: '+consoleBuf.length+'\n\n'+consoleBuf.join('\n');
        navigator.clipboard.writeText(t).then(()=>toastr.success('Console copied ('+consoleBuf.length+' entries)')).catch(()=>toastr.error('Copy failed'));
    });
    $('#sp-btn-copy-response').on('click',()=>{
        if(!lastRawResponse){toastr.warning('No API response captured yet');return}
        const t='ScenePulse Last API Response ('+new Date().toISOString()+')\nLength: '+lastRawResponse.length+' chars\n\n'+lastRawResponse;
        navigator.clipboard.writeText(t).then(()=>toastr.success('Last response copied ('+lastRawResponse.length+' chars)')).catch(()=>toastr.error('Copy failed'));
    });
    let debugRefreshInterval=null;
    function refreshDebugViewer(){
        const body=document.getElementById('sp-debug-body');
        const count=document.getElementById('sp-debug-count');
        if(!body)return;
        const errs=debugLog.filter(e=>e.includes('[ERROR')).length;
        const warns=debugLog.filter(e=>e.includes('[WARN')).length;
        const audits=debugLog.filter(e=>e.includes('AUDIT')).length;
        if(count)count.textContent=`(${debugLog.length} entries · ${errs} errors · ${warns} warnings · ${audits} audits)`;
        // Only full rebuild if count changed
        if(body.children.length!==debugLog.length){
            body.innerHTML='';
            for(const entry of debugLog){
                const line=document.createElement('div');
                line.className='sp-debug-line';
                if(entry.includes('[ERROR'))line.classList.add('sp-debug-error');
                else if(entry.includes('[WARN'))line.classList.add('sp-debug-warn');
                else if(entry.includes('AUDIT'))line.classList.add('sp-debug-audit');
                else if(entry.includes('==='))line.classList.add('sp-debug-section');
                else if(entry.includes('Unwrap:'))line.classList.add('sp-debug-unwrap');
                line.textContent=entry;
                body.appendChild(line);
            }
            body.scrollTop=body.scrollHeight;
        }
    }
    $('#sp-btn-debug-view').on('click',()=>{
        const viewer=document.getElementById('sp-debug-viewer');if(!viewer)return;
        const isVisible=viewer.style.display!=='none';
        viewer.style.display=isVisible?'none':'block';
        if(!isVisible){
            refreshDebugViewer();
            debugRefreshInterval=setInterval(refreshDebugViewer,1500);
        }else{
            if(debugRefreshInterval){clearInterval(debugRefreshInterval);debugRefreshInterval=null}
        }
    });
    $('#sp-debug-close').on('click',()=>{const v=document.getElementById('sp-debug-viewer');if(v)v.style.display='none';if(debugRefreshInterval){clearInterval(debugRefreshInterval);debugRefreshInterval=null}});
    $('#sp-debug-copy-inline').on('click',()=>{const t='ScenePulse Debug ('+new Date().toISOString()+')\n'+debugLog.join('\n');navigator.clipboard.writeText(t).then(()=>toastr.success('Debug log copied')).catch(()=>toastr.error('Copy failed'))});
}
function renderLoreTags(){const s=getSettings();const c=document.getElementById('sp-lore-tags');if(!c)return;c.innerHTML='';for(const n of(s.lorebookAllowlist||[])){const t=document.createElement('span');t.className='sp-lore-tag';t.innerHTML=`${esc(n)} <span class="sp-lore-tag-x" data-n="${esc(n)}">✕</span>`;t.querySelector('.sp-lore-tag-x').addEventListener('click',function(){s.lorebookAllowlist=s.lorebookAllowlist.filter(x=>x!==this.dataset.n);saveSettings();renderLoreTags()});c.appendChild(t)}}

// ── Init ──
const{eventSource,event_types}=SillyTavern.getContext();

// Create panel immediately — DOM is ready when ST loads extensions
try{createPanel();log('Panel created at load')}catch(e){warn('Early panel:',e)}

eventSource.on(event_types.APP_READY,()=>{try{
    log('APP_READY: start');
    createPanel();log('APP_READY: panel ok');
    createSettings();log('APP_READY: settings ok');
    // Delayed retry: ST may populate profile dropdowns after our init
    setTimeout(()=>{try{loadUI();log('APP_READY: delayed profile refresh')}catch(e){}},2000);
    renderExisting();log('APP_READY: render ok');
    // First-run: show setup guide if not dismissed
    const _s=getSettings();
    if(!_s.setupDismissed){
        setTimeout(()=>showSetupGuide(),2000);
    }
    log('v4.9.81 ready');
    // One-time migration: reset stale sub-field toggles from old Disable All
    if(_s.fieldToggles){
        const _ft=_s.fieldToggles;const _p=_s.panels||DEFAULTS.panels;
        for(const[pid,def] of Object.entries(BUILTIN_PANELS)){
            if(_p[pid]!==false){
                for(const sf of(def.subFields||[])){if(_ft[sf.key]===false){delete _ft[sf.key];log('Migration: reset stale sub-field',sf.key)}}
            }
        }
        saveSettings();
    }
}catch(e){err('APP_READY:',e)}});
eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED,idx=>onCharMsg(idx));
// CRITICAL: Save chat the INSTANT generation ends, BEFORE other extensions (other extensions etc.)
// can trigger profile switches that cause CHAT_CHANGED → chat reload → message loss.
// This must be registered as early as possible to fire before other listeners.
eventSource.on(event_types.GENERATION_ENDED,async()=>{
    try{const w=document.getElementById('sp-inline-wait');if(w){if(w._timerInterval)clearInterval(w._timerInterval);w.remove()}}catch{}
    clearThoughtLoading();
    // NOTE: Do NOT call spSetGenerating(false) here — pulse must stay active through
    // extraction and potential fallback generation. Each exit path clears it individually.
    // ── PRIMARY EXTRACTION for Together/Inline mode ──
    // Extract tracker HERE, immediately when the stream finishes — BEFORE other extensions
    // or other extensions trigger preset-switching cascades that delay
    // character_message_rendered by 8-15 seconds.
    const s=getSettings();
    if(s.enabled&&s.injectionMethod==='inline'&&!inlineExtractionDone&&anyPanelsActive()){
        const{chat}=SillyTavern.getContext();
        let targetIdx=-1;
        for(let i=chat.length-1;i>=0;i--){
            if(!chat[i].is_user){targetIdx=i;break}
        }
        if(targetIdx>=0){
            log('GENERATION_ENDED: primary extraction attempt for message',targetIdx);
            const fullMsgLen=(chat[targetIdx]?.mes||'').length; // Capture BEFORE extraction strips tracker
            const extracted=extractInlineTracker(targetIdx);
            if(extracted){
                log('GENERATION_ENDED: primary extraction SUCCESS for message',targetIdx);
                inlineExtractionDone=true;pendingInlineIdx=-1;
                const trackerJson=JSON.stringify(extracted);
                genMeta.promptTokens=0;
                genMeta.completionTokens=Math.round(fullMsgLen/4); // Full response (narrative + tracker)
                genMeta.elapsed=inlineGenStartMs>0?((Date.now()-inlineGenStartMs)/1000):0;
                inlineGenStartMs=0;
                lastGenSource='auto:together';
                lastRawResponse=JSON.stringify(extracted,null,2);
                const norm=normalizeTracker(extracted);
                currentSnapshotMesIdx=targetIdx;
                log('=== TOGETHER MODE SUMMARY === source=',lastGenSource);
                log('  chars:',norm.characters?.length||0,'rels:',norm.relationships?.length||0);
                log('  quests: main=',norm.mainQuests?.length||0,'side=',norm.sideQuests?.length||0,'tasks=',norm.activeTasks?.length||0);
                log('  ideas:',norm.plotBranches?.length||0,'northStar:',JSON.stringify(norm.northStar||'').substring(0,50));
                log('  scene: topic='+(norm.sceneTopic?'✓':'✗'),'mood='+(norm.sceneMood?'✓':'✗'),'tension='+(norm.sceneTension?'✓':'✗'));
                if(norm.characters?.length)for(const c of norm.characters)log('  char:',c.name,'role=',c.role?'✓':'✗','thought=',c.innerThought?'✓':'✗');
                if(norm.relationships?.length)for(const r of norm.relationships)log('  rel:',r.name,'aff=',r.affection,'trust=',r.trust,'desire=',r.desire,'compat=',r.compatibility);
                extracted._spMeta={promptTokens:0,completionTokens:genMeta.completionTokens,elapsed:genMeta.elapsed,source:'auto:together',injectionMethod:'inline'};
                saveSnapshot(targetIdx,extracted);
                updatePanel(norm);spPostGenShow();
                spSetGenerating(false); // Pulse off — extraction succeeded
                stopStreamingHider();
                log('GENERATION_ENDED: panel updated — extraction complete before cascade');
                const el=document.querySelector(`.mes[mesid="${targetIdx}"]`);
                if(el)addMesButton(el);
                try{await ensureChatSaved();log('GENERATION_ENDED: chat saved')}
                catch(e){warn('GENERATION_ENDED save failed:',e)}
                return;
            } else {
                const msgLen=(chat[targetIdx]?.mes||'').length;
                log('GENERATION_ENDED: primary extraction failed for message',targetIdx,'('+msgLen+' chars), deferring to onCharMsg');
                pendingInlineIdx=targetIdx;
            }
        } else {
            log('GENERATION_ENDED: no assistant message found, deferring to onCharMsg');
        }
    } else {
        spSetGenerating(false); // Not inline mode or already done — pulse off
        stopStreamingHider();
    }
    try{await ensureChatSaved();log('GENERATION_ENDED: chat saved preemptively')}
    catch(e){warn('GENERATION_ENDED save failed:',e)}
});
// If user clicks ST's own stop button, cancel our generation too
eventSource.on(event_types.GENERATION_STOPPED,()=>{
    if(generating){
        log('ST generation_stopped event — cancelling ScenePulse generation');
        const oldNonce=genNonce;
        genNonce++;
        cancelRequested=true;
        generating=false;spSetGenerating(false);
        log('CANCEL (ST stop): nonce',oldNonce,'→',genNonce);
        cleanupGenUI();
        const snap=getLatestSnapshot();
        const body=document.getElementById('sp-panel-body');
        if(snap){const norm=normalizeTracker(snap);updatePanel(norm)}
        else if(body)body.innerHTML='<div class="sp-empty-state"><div class="sp-empty-icon">📡</div><div class="sp-empty-title">No scene data yet</div><div class="sp-empty-sub">Generation was stopped. Click <strong>⟳</strong> to try again.</div></div>';
    }
});
eventSource.on(event_types.CHAT_CHANGED,async()=>{
    // SAFETY: Save chat before reloading — catches messages that might be lost
    // when other extensions trigger profile switches
    try{await ensureChatSaved()}catch(e){warn('CHAT_CHANGED save:',e)}
    // Cancel any in-flight generation from previous chat
    if(generating)cancelGeneration();
    // Hide thought panel — it belongs to the previous character
    const tp=document.getElementById('sp-thought-panel');
    if(tp){tp.classList.remove('sp-tp-visible');const tpb=document.getElementById('sp-tp-body');if(tpb)tpb.innerHTML=''}
    // Clear weather overlay — new chat may have different weather
    clearWeatherOverlay();
    clearTimeTint();
    prevLocation='';prevTimePeriod='';
    // Short delay for DOM to settle, then render. Retry if messages not loaded yet.
    setTimeout(()=>{
        renderExisting();
        const msgs=document.querySelectorAll('.mes');
        if(msgs.length===0)setTimeout(renderExisting,500);
    },200);
});
// Message deleted — remove associated snapshot and refresh timeline
if(event_types.MESSAGE_DELETED){
    eventSource.on(event_types.MESSAGE_DELETED,(idx)=>{
        log('MESSAGE_DELETED event, idx=',idx);
        spOnMessageDeleted(Number(idx));
    });
}
// Also catch swipe/edit which may renumber messages
if(event_types.MESSAGE_UPDATED){
    eventSource.on(event_types.MESSAGE_UPDATED,()=>{setTimeout(renderExisting,300)});
}
// ST generation started — handled internally via generateTracker's generating=true flag
log('v4.9.81 init');
