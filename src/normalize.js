// ScenePulse — Normalization Module
// Extracted from index.js lines 950-1356

import { log, warn } from './logger.js';
import { auditFields } from './utils.js';
import { _isTimelineScrub } from './state.js';
import { getLatestSnapshot } from './settings.js';
import { charColor } from './color.js';

// ── Normalization cache (WeakMap — auto-clears when snapshot objects are GC'd) ──
const _normCache = new WeakMap();
export function clearNormCache() { /* WeakMap auto-clears when objects are GC'd */ }

// ── Group chat detection ────────────────────────────────────────────────
// SillyTavern supports group chats where multiple characters participate
// in the same conversation. In a group chat, context.name2 holds the
// currently-speaking character's name, not the full group roster — so
// code that relies on name2 alone will only ever know about one character.
//
// getGroupMemberNames() returns the full list of character names that
// belong to the active group chat, or an empty array for single-character
// chats. Used by the interceptor (to inject the member list into the
// prompt so the model knows who to track) and by filterForView (to
// preserve group members the model may have omitted from a delta).
//
// SillyTavern's context exposes:
//   - selected_group: ID of the active group, or null for 1-on-1 chats
//   - groups: array of group definitions, each with a `members` array of
//     character file names (e.g. "Alice.png", "Bob.png")
//   - characters: array of all available characters, each with an `avatar`
//     field matching the group member reference
//
// The match path is: group.members[i] → characters[j].avatar → characters[j].name.
// We tolerate the common case where ST's group uses the character's `.name`
// directly (some older versions) by accepting both forms.
export function getGroupMemberNames() {
    try {
        const ctx = SillyTavern.getContext();
        const groupId = ctx?.groupId ?? ctx?.selected_group;
        if (!groupId) return [];
        const groups = ctx?.groups || [];
        const group = groups.find(g => g?.id === groupId);
        if (!group || !Array.isArray(group.members) || !group.members.length) return [];
        const charList = ctx?.characters || [];
        const names = [];
        for (const memberRef of group.members) {
            if (!memberRef) continue;
            // Match by avatar field (file name) or by name directly
            const ch = charList.find(c => c?.avatar === memberRef || c?.name === memberRef);
            if (ch?.name) {
                names.push(ch.name);
            } else if (typeof memberRef === 'string') {
                // Fall back to the raw reference, stripping file extension
                // if present so "Alice.png" becomes "Alice"
                names.push(memberRef.replace(/\.(png|jpe?g|webp)$/i, ''));
            }
        }
        return names.filter(Boolean);
    } catch {
        return [];
    }
}

// ── User-name detection ──────────────────────────────────────────────────
// {{user}} is the player. They must never appear as a character entry,
// relationship entry, or be listed in charactersPresent — they ARE the
// viewpoint, not an NPC in the scene. The prompt tells the model this but
// some models ignore it under long-context pressure, so we filter here as
// a hard guarantee at the view/data boundary.
//
// Matches:
//   - the literal template token "{{user}}" (sometimes echoed back)
//   - SillyTavern's name1 (the user's persona name, case-insensitive)
//   - common aliases: "user", "you", "player", "me"
//   - case-insensitive comparison with trimmed whitespace
//
// Does NOT match {{char}} / name2 — those are the primary bot character
// and absolutely should appear.
export function isUserName(name) {
    if (!name || typeof name !== 'string') return false;
    const norm = name.toLowerCase().trim();
    if (!norm) return false;
    if (norm === '{{user}}' || norm === 'user' || norm === 'you' || norm === 'player' || norm === 'me') return true;
    try {
        const ctx = SillyTavern.getContext();
        const n1 = (ctx?.name1 || '').toLowerCase().trim();
        if (n1 && norm === n1) return true;
        // Guard against the model prefixing the user's name with {{user}}:
        // "Alex ({{user}})" or "{{user}} (Alex)" both match.
        if (n1 && (norm.startsWith(n1 + ' ') || norm.endsWith(' ' + n1))) {
            if (norm.includes('{{user}}') || norm.includes('(you)') || norm.includes('(user)')) return true;
        }
    } catch {}
    return false;
}

// ── Normalization ──
export function normalizeTracker(d){
    if(!d||typeof d!=='object')return d;
    if(_normCache.has(d)) return _normCache.get(d);
    const _verbose=!_isTimelineScrub; // Suppress verbose logging during rapid scrubbing

    // ── GLM-5 Unwrapper: flatten nested object structures ──
    // GLM-5 often wraps fields in parent objects: {environment:{time,date...}, characters:{CharA:{...}}, questJournal:{mainQuests:[...]}}
    // Unwrap these to the flat structure the rest of the normalizer expects
    if(d.environment&&typeof d.environment==='object'&&!Array.isArray(d.environment)){
        log('Unwrap: environment object \u2192 top-level fields');
        for(const[k,v]of Object.entries(d.environment)){if(!d[k])d[k]=v}
    }
    // Scene fields may be nested under scene/sceneDetails
    for(const sk of['scene','sceneDetails','sceneInfo']){
        if(d[sk]&&typeof d[sk]==='object'&&!Array.isArray(d[sk])){
            log('Unwrap:',sk,'object \u2192 top-level fields');
            for(const[k,v]of Object.entries(d[sk])){if(!d[k])d[k]=v}
        }
    }
    if(d.questJournal&&typeof d.questJournal==='object'&&!Array.isArray(d.questJournal)){
        log('Unwrap: questJournal object \u2192 top-level fields');
        for(const[k,v]of Object.entries(d.questJournal)){if(!d[k])d[k]=v}
    }
    // Characters: convert object-of-objects to array  {CharA:{...}, CharB:{...}} -> [{name:"CharA",...}, {name:"CharB",...}]
    if(d.characters&&typeof d.characters==='object'&&!Array.isArray(d.characters)){
        const vals=Object.entries(d.characters);
        if(vals.length>0&&typeof vals[0][1]==='object'&&vals[0][1]!==null){
            log('Unwrap: characters object \u2192 array, keys:',vals.map(v=>v[0]).join(', '));
            d.characters=vals.map(([k,v])=>{if(!v.name)v.name=k.replace(/_/g,' ');v._spKey=k.replace(/_/g,' ');return v});
        }
    }
    // Relationships: convert object-of-objects or named-key objects to array
    if(d.relationships&&typeof d.relationships==='object'&&!Array.isArray(d.relationships)){
        const vals=Object.entries(d.relationships);
        if(vals.length>0&&typeof vals[0][1]==='object'&&vals[0][1]!==null){
            log('Unwrap: relationships object \u2192 array, keys:',vals.map(v=>v[0]).join(', '));
            d.relationships=vals.map(([k,v])=>{
                if(!v.name){
                    // Handle verbose keys like "CharA's view of {{user}}" or "CharA_toward_User"
                    let clean=k.replace(/['\u2018\u2019\u2018\u2019]s\s+(view|perspective|opinion|feelings?|perception|relationship)\s+(of|on|toward|towards|about|with)\s+.*/i,'')
                              .replace(/\s+(to|toward|towards|about|on|view of)\s+.*/i,'')
                              .replace(/_to_.*|_toward_.*|_towards_.*/i,'');
                    clean=clean.replace(/_/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2').trim();
                    v.name=clean||k;
                }
                return v;
            });
        }
    }
    // plotBranches: unwrap various formats -> {type,name,hook}
    // Object keyed by type: {dramatic:{name,hook}, intense:{name,hook}} -> array
    if(d.plotBranches&&typeof d.plotBranches==='object'&&!Array.isArray(d.plotBranches)){
        const entries=Object.entries(d.plotBranches);
        if(entries.length>0&&typeof entries[0][1]==='object'&&entries[0][1]!==null){
            log('Unwrap: plotBranches object \u2192 array, keys:',entries.map(v=>v[0]).join(', '));
            d.plotBranches=entries.map(([k,v])=>{
                if(typeof v==='string')return{type:k,name:'',hook:v};
                return{type:v.type||k,name:v.name||v.title||'',hook:v.hook||v.description||v.suggestion||''};
            });
        }
    }
    if(Array.isArray(d.plotBranches)&&d.plotBranches[0]?.branch){
        d.plotBranches=d.plotBranches.map(b=>({type:b.type||'exploratory',name:b.branch||b.name||'',hook:b.description||b.hook||''}));
    }

    if(_verbose)log('Raw keys:',Object.entries(d).map(([k,v])=>`${k}(${Array.isArray(v)?'arr':typeof v})`).join(', '));
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
    const cp=flat['characterspresent']||flat['present'];
    o.charactersPresent=Array.isArray(cp)?cp.filter(n=>!isUserName(n)):[];

    const vu=['critical','high','moderate','low','resolved'];
    function normPlot(arr){if(!Array.isArray(arr))return[];return arr.map(p=>{if(!p||typeof p!=='object')return{name:String(p||''),urgency:'moderate',detail:''};
        let urg=(p.urgency||p.priority||'moderate').toLowerCase();
        // Map non-standard values
        if(p.status&&!p.urgency&&!p.priority){const sm={'pending':'high','active':'high','in-progress':'high','emerging':'moderate','urgent':'critical','resolved':'resolved','completed':'resolved','done':'resolved','finished':'resolved','unknown':'high'};urg=sm[p.status.toLowerCase()]||'moderate'}
        if(urg==='medium')urg='moderate';
        if(!vu.includes(urg))urg='moderate';
        return{name:p.name||p.title||'',urgency:urg,detail:p.detail||p.notes||p.description||''}})}
    o.mainQuests=normPlot(d.mainQuests||flat['mainquests']||d.criticalPriorities||d.primaryObjectives||[]);
    o.sideQuests=normPlot(d.sideQuests||flat['sidequests']||d.sideVentures||[]);
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
            rawName=firstSent.length>60?firstSent.substring(0,57)+'\u2026':firstSent;
        }
        return{type:t,name:rawName,hook:rawHook}
    }).filter(b=>b.name||b.hook):[];
    // Carry forward: if model returned empty plotBranches, preserve previous snapshot's ideas
    if(!o.plotBranches.length){
        try{const prev=getLatestSnapshot();
            if(prev?.plotBranches?.length){
                log('plotBranches empty \u2014 carrying forward',prev.plotBranches.length,'ideas from previous snapshot');
                o.plotBranches=prev.plotBranches;
            }
        }catch{}
    }
    // Carry forward: smart quest completion detection
    {try{const prev=getLatestSnapshot();if(prev){
        for(const _qk of['mainQuests','sideQuests']){
            const currQuests=o[_qk]||[];
            const prevQuests=prev[_qk]||[];
            if(!currQuests.length&&prevQuests.length){
                // Empty array — carry forward all non-resolved previous quests
                o[_qk]=prevQuests.filter(q=>q.urgency!=='resolved');
                log(_qk,'empty — carrying forward',o[_qk].length,'non-resolved quests from previous');
            } else if(currQuests.length&&prevQuests.length){
                // LLM returned quests — detect missing ones and mark as resolved
                const currNames=new Set(currQuests.map(q=>(q.name||'').toLowerCase().trim()));
                for(const pq of prevQuests){
                    if(pq.urgency==='resolved')continue; // already resolved, don't carry forward again
                    const pn=(pq.name||'').toLowerCase().trim();
                    if(pn&&!currNames.has(pn)){
                        // Quest was in previous but not in current — mark resolved
                        o[_qk].push({name:pq.name,urgency:'resolved',detail:pq.detail||''});
                        log(_qk,'quest completed:',pq.name,'— marked resolved');
                    }
                }
            }
        }
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
        rn=rn.replace(/['\u2018\u2019\u2018\u2019]s\s+(view|perspective|opinion|feelings?|perception|relationship)\s+(of|on|toward|towards|about|with)\s+.*/i,'')
             .replace(/\s+(to|toward|towards|about|on|view of)\s+.*/i,'').trim();
        const nr={name:rn};
        nr.relType=r.relType||r.type||'';nr.relPhase=r.relPhase||r.phase||'';
        nr.timeTogether=r.timeTogether||r.duration||r.known||'';
        nr.milestone=r.milestone||r.nextMilestone||'';
        for(const k of['affection','trust','desire','stress','compatibility']){
            const raw=r[k];let val=0,label='';
            if(raw==null||raw==='N/A'||raw==='n/a'){val=-1;label='N/A'}
            else if(typeof raw==='object'&&raw!==null){val=Number(raw.value||raw.score)||0;label=String(raw.label||raw.feeling||'')}
            else if(typeof raw==='string'){const m=raw.match(/^(\d+)/);val=m?Number(m[1]):0;const lp=raw.replace(/^\d+\s*[-\u2013:]\s*/,'');if(lp!==raw)label=lp}
            else{val=Number(raw)||0}
            if(!label)label=String(r[k+'Label']||r[k+'label']||'');
            nr[k]=val;nr[k+'Label']=label;
        }
        return nr;
    }).filter(Boolean):[];
    // Drop any self-relationship entry ({{user}} as their own target). The
    // relationships array is supposed to express how OTHERS perceive the user,
    // so an entry where the name IS the user is a prompt-rule violation.
    if(o.relationships.length){
        const before=o.relationships.length;
        o.relationships=o.relationships.filter(r=>!isUserName(r?.name));
        if(o.relationships.length<before)log('normalize: stripped',before-o.relationships.length,'user-as-relationship entry');
    }
    // Relationship name fallback: if any relationship is missing a name, try to fill from charactersPresent
    if(o.relationships.length&&o.charactersPresent.length){
        for(let i=0;i<o.relationships.length;i++){if(!o.relationships[i].name&&i<o.charactersPresent.length)o.relationships[i].name=o.charactersPresent[i]}
    }
    // Value estimation from labels -- only when model returned 0 and we have a label to infer from
    const lvm={no:0,none:0,cold:5,distant:10,slight:20,mild:25,cautious:35,growing:45,moderate:50,genuine:55,solid:65,strong:70,deep:75,intense:80,high:85,overwhelming:90,desperate:92,absolute:95,consumed:95,complete:98,rebuilding:40,fragile:30,natural:70,excellent:90};
    // Labels that indicate zero desire/attraction -- override numeric value to 0
    const ZERO_DESIRE_PATTERNS=['no attraction','not attracted','no desire','no interest','no sexual','none yet','not yet','zero','absent','platonic','purely professional','familial','asexual','repulsed','disgusted','not applicable','n/a','no lust','indifferent','cold','nonexistent','non-existent','doesn\'t exist','wary','stranger','dangerous','neutral','default','unknown','hostile','enemy','cautious','suspicious','uninterested','no feelings'];
    for(const rel of o.relationships){
        // ── Desire label override: if label says "no attraction", force value to 0 regardless of model's number ──
        const desLbl=(rel.desireLabel||'').toLowerCase();
        if(desLbl&&ZERO_DESIRE_PATTERNS.some(p=>desLbl.includes(p))){
            if(rel.desire>0)log('Desire override:',rel.name,'label="'+rel.desireLabel+'" value',rel.desire,'\u2192 0');
            rel.desire=0;
        }
        // ── Model default detection: desire=50 with empty/generic label is model using 50 as midpoint ──
        // The schema says 0=no desire (default), but models often use 50 as "neutral"
        if(rel.desire===50&&(!desLbl||desLbl==='neutral'||desLbl==='moderate'||desLbl==='default'||desLbl==='unknown'||desLbl==='n/a')){
            log('Desire 50-default override:',rel.name,'label="'+(rel.desireLabel||'(empty)')+'", likely model default \u2192 0');
            rel.desire=0;rel.desireLabel=rel.desireLabel||'No attraction yet';
        }
        // Same for other meters with clearly contradictory labels
        for(const k of['affection','trust','stress','compatibility']){
            const lb=(rel[k+'Label']||'').toLowerCase();
            if(lb&&(lb.includes('none')||lb.includes('zero')||lb.includes('absent')||lb.includes('no '))&&rel[k]>10){
                log('Label override:',rel.name,k,'label="'+rel[k+'Label']+'" value',rel[k],'\u2192 0');
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
                // If still 0 after label scan, leave at 0 -- model explicitly chose 0
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
    if(_verbose&&o.relationships.length)log('Rel[0]:',JSON.stringify(o.relationships[0]).substring(0,300));
    // Carry forward: fill empty relationship fields from previous snapshot's matching relationship
    try{const prev=getLatestSnapshot();if(prev?.relationships?.length){
        for(const rel of o.relationships){
            const prevRel=prev.relationships.find(pr=>pr.name===rel.name);
            if(!prevRel)continue;
            for(const fk of['relType','relPhase','timeTogether']){
                if(!rel[fk]&&prevRel[fk]){rel[fk]=prevRel[fk];log('Rel carry-forward:',rel.name,fk,'\u2190',prevRel[fk])}
            }
        }
    }}catch{}

    // Characters -- with comprehensive debugging
    const rawChars=d.characters;
    if(_verbose)log('Char debug: d.characters=',Array.isArray(rawChars)?'array('+rawChars.length+')':typeof rawChars,
        'flat[characters]=',flat['characters']?'array('+flat['characters'].length+')':'missing',
        'd.Characters=',d.Characters?'exists':'missing');
    const chars=rawChars||flat['characters']||d.Characters||d.character||flat['character']||[];
    if(Array.isArray(chars)&&chars.length>0){
        if(_verbose)log('Char debug: first char keys=',Object.keys(chars[0]).join(','),'name=',chars[0].name);
        o.characters=chars.map(normalizeChar);
        if(_verbose)log('Char debug: after normalize=',o.characters.length,'first name=',o.characters[0]?.name);
        // Failsafe: if normalizeChar lost names that existed in raw data, use raw mapping
        const _normLostName=o.characters[0]?.name==='?'&&chars[0]?.name&&chars[0].name!=='?';
        if(!o.characters.length||_normLostName){
            warn('normalizeChar returned empty, using raw characters');
            o.characters=chars.map(ch=>{
                // v6.8.15 trimmed schema: outfit absorbs stateOfDress, posture
                // absorbs physicalState, fertility collapsed to status+notes.
                // Fold legacy fields into the surviving ones so this failsafe
                // path preserves data from old snapshots identically to the
                // main normalizeChar path.
                let outfit=ch.outfit||'';
                if(ch.stateOfDress&&!outfit.toLowerCase().includes(String(ch.stateOfDress).toLowerCase())){
                    outfit=outfit?`${outfit} (${ch.stateOfDress})`:ch.stateOfDress;
                }
                let posture=ch.posture||'';
                if(ch.physicalState&&!posture.toLowerCase().includes(String(ch.physicalState).toLowerCase())){
                    posture=posture?`${posture}; ${ch.physicalState}`:ch.physicalState;
                }
                let fertNotes=ch.fertNotes||'';
                const legacyBits=[];
                if(ch.fertReason)legacyBits.push(String(ch.fertReason));
                if(ch.fertCyclePhase)legacyBits.push('phase: '+ch.fertCyclePhase);
                if(Number(ch.fertCycleDay)>0)legacyBits.push('day '+ch.fertCycleDay);
                if(ch.fertWindow&&ch.fertWindow!=='N/A')legacyBits.push('window: '+ch.fertWindow);
                if(ch.fertPregnancy&&ch.fertPregnancy!=='N/A'&&ch.fertPregnancy!=='not pregnant')legacyBits.push(ch.fertPregnancy);
                if(Number(ch.fertPregWeek)>0)legacyBits.push('week '+ch.fertPregWeek);
                if(legacyBits.length){
                    const fold=legacyBits.join(', ');
                    fertNotes=fertNotes?`${fertNotes}; ${fold}`:fold;
                }
                return{
                    name:ch.name||'?',role:ch.role||'',innerThought:ch.innerThought||ch.inner_thought||'',
                    immediateNeed:ch.immediateNeed||'',shortTermGoal:ch.shortTermGoal||'',longTermGoal:ch.longTermGoal||'',
                    hair:ch.hair||'',face:ch.face||'',outfit,posture,
                    proximity:ch.proximity||'',notableDetails:ch.notableDetails||'',
                    inventory:Array.isArray(ch.inventory)?ch.inventory:[],
                    fertStatus:ch.fertStatus||'',fertNotes
                };
            });
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
    // {{user}} is the player, not an NPC. Strip any character entry for the
    // user no matter which population path built o.characters. The prompt
    // forbids this but some models emit it anyway under long-context pressure.
    // Runs after all primary + failsafe + alternate-key paths so one filter
    // call guarantees the user never reaches the view layer.
    if(o.characters?.length){
        const before=o.characters.length;
        o.characters=o.characters.filter(c=>!isUserName(c?.name));
        if(o.characters.length<before)log('normalize: stripped',before-o.characters.length,'user-as-character entry from characters');
    }
    // ── Group chat support (v6.8.15) ──────────────────────────────────────
    // In group chats, the model often only emits character data for the
    // currently-speaking participant, silently dropping the other members.
    // Previous versions of ScenePulse then lost those characters because
    // filterForView's intersection with charactersPresent would strip them.
    //
    // Here we carry forward any missing group-member characters from the
    // previous snapshot so the model's omission doesn't destroy state.
    // The group roster comes from SillyTavern's group context, not from
    // the model's output, so it's authoritative.
    //
    // We also derive _isPrimary per character:
    //   - single-chat: the character matching ctx.name2 (the bot) is primary
    //   - group chat: every group-member character is primary (they all get
    //     the "main" styling in the UI, which uses _isPrimary for sorting
    //     and color emphasis)
    // This replaces the brittle name2-only sort used by update-panel,
    // thoughts, and character-wiki.
    {
        const _groupMembers=getGroupMemberNames();
        const _isGroup=_groupMembers.length>1;
        const _memberSet=new Set(_groupMembers.map(n=>(n||'').toLowerCase().trim()));
        // Carry forward group members missing from the model's output
        if(_isGroup&&Array.isArray(o.characters)){
            try{
                const prev=getLatestSnapshot();
                if(prev?.characters?.length){
                    const currNames=new Set(o.characters.map(c=>(c.name||'').toLowerCase().trim()));
                    for(const memberName of _groupMembers){
                        const memberLow=(memberName||'').toLowerCase().trim();
                        if(!memberLow)continue;
                        if(currNames.has(memberLow))continue;
                        // Look for this member in the previous snapshot
                        const prevCh=prev.characters.find(pc=>(pc.name||'').toLowerCase().trim()===memberLow);
                        if(prevCh){
                            // Deep-clone the prev entry so carry-forward doesn't mutate history
                            o.characters.push(JSON.parse(JSON.stringify(prevCh)));
                            currNames.add(memberLow);
                            if(_verbose)log('Group carry-forward: restored missing group member',memberName);
                        }
                    }
                }
            }catch(e){if(_verbose)log('Group carry-forward failed:',e?.message)}
        }
        // Derive _isPrimary for every character
        const _botName=((typeof SillyTavern!=='undefined'&&SillyTavern.getContext?.().name2)||'').toLowerCase().trim();
        if(Array.isArray(o.characters)){
            for(const ch of o.characters){
                const cn=(ch?.name||'').toLowerCase().trim();
                if(!cn)continue;
                if(_isGroup){
                    // Every group member is "primary" in a group chat
                    ch._isPrimary=_memberSet.has(cn);
                }else{
                    // Single-chat: the bot character is primary
                    ch._isPrimary=!!_botName&&(cn===_botName||cn.startsWith(_botName+' ')||_botName.startsWith(cn+' '));
                }
            }
        }
    }
    // Post-normalization: resolve '?' character names from other sources
    // CONFIDENCE RULES -- only resolve when we can be certain:
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

        // HIGH: 1:1 unknown<->relationship
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
            // MEDIUM: cross-reference role text <-> relationship relType
            const stillUnknown=o.characters.filter(c=>c.name==='?');
            const stillKnown=new Set(o.characters.filter(c=>c.name!=='?').map(c=>c.name.toLowerCase()));
            const stillUnmatched=relNames.filter(n=>!stillKnown.has(n.toLowerCase()));
            for(const unk of stillUnknown){
                if(unk.name!=='?')continue;
                const role=(unk.role||'').toLowerCase().split(/[,\-\u2013]/)[0].trim();
                if(!role)continue;
                for(const relName of stillUnmatched){
                    const rel=o.relationships.find(r=>r.name===relName);
                    if(!rel)continue;
                    const relType=(rel.relType||'').toLowerCase();
                    if(relType&&(role.includes(relType)||relType.includes(role))){
                        unk.name=relName;
                        log('Char name resolved (role\u2194relType):',relName);
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
            log('Char names unresolved:',finalUnknowns.length,'unknowns \u2014 ambiguous, neutral styling');
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
    // ── Comprehensive carry-forward: fill ALL empty fields from previous snapshot ──
    try{const _prev=getLatestSnapshot();if(_prev){
        // Scalar fields: carry forward if current is empty string
        for(const _ck of['time','date','elapsed','location','weather','temperature','soundEnvironment','sceneTopic','sceneMood','sceneInteraction','sceneTension','sceneSummary']){
            if(!o[_ck]&&_prev[_ck]){o[_ck]=_prev[_ck];if(_verbose)log('Carry-forward:',_ck)}
        }
        // charactersPresent: carry forward if empty
        if(!o.charactersPresent?.length&&_prev.charactersPresent?.length){o.charactersPresent=_prev.charactersPresent;if(_verbose)log('Carry-forward: charactersPresent')}
        // Characters: fill empty sub-fields from matching previous character
        if(o.characters?.length&&_prev.characters?.length){
            for(const _ch of o.characters){
                const _pch=_prev.characters.find(pc=>pc.name&&_ch.name&&pc.name.toLowerCase()===_ch.name.toLowerCase());
                if(!_pch)continue;
                for(const _fk of['role','innerThought','immediateNeed','shortTermGoal','longTermGoal','hair','face','outfit','posture','proximity','notableDetails','fertStatus','fertNotes']){
                    if(!_ch[_fk]&&_pch[_fk]){_ch[_fk]=_pch[_fk];if(_verbose)log('Char carry-forward:',_ch.name,_fk)}
                }
                if((!_ch.inventory||!_ch.inventory.length)&&_pch.inventory?.length){_ch.inventory=_pch.inventory;if(_verbose)log('Char carry-forward:',_ch.name,'inventory')}
                // v6.8.15: carry forward _isPrimary so a character that was
                // marked primary in a previous turn doesn't lose the flag if
                // the group roster couldn't be detected this turn.
                if(_ch._isPrimary==null&&_pch._isPrimary!=null)_ch._isPrimary=_pch._isPrimary;
                // v6.8.18: carry forward aliases. If the model omits the
                // aliases list on a turn where nothing changed about the
                // character's identity, we still want the historical alias
                // record to survive so future alias-based matching still
                // works. Union with any aliases the current entry already
                // has and dedupe case-insensitively. Canonical name is
                // excluded so we never self-alias.
                if(Array.isArray(_pch.aliases)&&_pch.aliases.length){
                    const merged=Array.isArray(_ch.aliases)?[..._ch.aliases]:[];
                    const seen=new Set(merged.map(a=>(a||'').toLowerCase().trim()));
                    const canonLow=(_ch.name||'').toLowerCase().trim();
                    for(const a of _pch.aliases){
                        const s=String(a||'').trim();
                        if(!s)continue;
                        const sl=s.toLowerCase();
                        if(sl===canonLow)continue;
                        if(seen.has(sl))continue;
                        seen.add(sl);
                        merged.push(s);
                    }
                    _ch.aliases=merged;
                }
            }
        }
        // Relationship milestone: extend existing carry-forward
        if(o.relationships?.length&&_prev.relationships?.length){
            for(const _rel of o.relationships){
                const _prel=_prev.relationships.find(pr=>pr.name===_rel.name);
                if(_prel&&!_rel.milestone&&_prel.milestone){_rel.milestone=_prel.milestone;if(_verbose)log('Rel carry-forward:',_rel.name,'milestone')}
            }
        }
        // Custom panel fields: carry forward any non-metadata key that is empty in o but populated in prev
        for(const _pk of Object.keys(_prev)){
            if(_pk.startsWith('_sp'))continue;
            if(o[_pk]===''&&_prev[_pk]!==''){o[_pk]=_prev[_pk];if(_verbose)log('Custom carry-forward:',_pk)}
        }
    }}catch(e){/* carry-forward is best-effort */}
    if(_verbose)auditFields('normalizeTracker',o,['time','date','elapsed','location','weather','temperature','soundEnvironment','sceneTopic','sceneMood','sceneInteraction','sceneTension','sceneSummary','witnesses','charactersPresent','mainQuests','sideQuests','plotBranches','northStar','relationships','characters']);
    if(d._spMeta)o._spMeta=d._spMeta;
    _normCache.set(d, o);
    return o;
}

export function normalizeChar(ch){
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
    if(!_isTimelineScrub)log('normalizeChar flat keys for',name,':',Object.keys(flat).join(', '));
    const o={name};
    // v6.8.18: aliases array. Former names (usually descriptive placeholders
    // like "Stranger", "Hooded Figure") the character was previously known by
    // before their real name was revealed. Parsed defensively: tolerates a
    // string (single alias), an array, or missing. Canonical name is stripped
    // from the list so we never list a character as an alias of themselves.
    {
        const rawAliases=flat['aliases']||ch.aliases;
        let arr=[];
        if(Array.isArray(rawAliases))arr=rawAliases;
        else if(typeof rawAliases==='string'&&rawAliases.trim())arr=[rawAliases];
        const seen=new Set();
        const canonLow=(name||'').toLowerCase().trim();
        o.aliases=[];
        for(const a of arr){
            const s=String(a||'').trim();
            if(!s)continue;
            const sl=s.toLowerCase();
            if(sl===canonLow)continue; // never alias yourself
            if(seen.has(sl))continue;
            seen.add(sl);
            o.aliases.push(s);
        }
    }
    o.role=g(['role','identity','who','emotion','title']);
    o.innerThought=g(['innerthought','inner_thought','thought','thinking','monologue']);
    o.immediateNeed=g(['immediateneed','immediate_need','need','doing','trying','urgentaction']);
    o.shortTermGoal=g(['shorttermgoal','short_term_goal','shortterm','neargoal']);
    o.longTermGoal=g(['longtermgoal','long_term_goal','longterm','lifemotivation','overarchinggoal']);
    o.hair=g(['hair']);o.face=g(['face','makeup','expression']);
    // v6.8.15: outfit absorbs stateOfDress. If the model still emits stateOfDress
    // (e.g. from a pre-trim system prompt cached somewhere), fold it into outfit
    // with a separator so the data is preserved on the way through.
    o.outfit=g(['outfit','clothing']);
    const _legacyDress=g(['stateofdress','dress']);
    if(_legacyDress&&!o.outfit.toLowerCase().includes(_legacyDress.toLowerCase())){
        o.outfit=o.outfit?`${o.outfit} (${_legacyDress})`:_legacyDress;
    }
    // v6.8.15: posture absorbs physicalState. Same fold-in logic as outfit.
    o.posture=g(['posture','stance']);
    const _legacyPhysical=g(['physicalstate','physical','condition']);
    if(_legacyPhysical&&!o.posture.toLowerCase().includes(_legacyPhysical.toLowerCase())){
        o.posture=o.posture?`${o.posture}; ${_legacyPhysical}`:_legacyPhysical;
    }
    o.proximity=g(['proximity','position']);
    o.notableDetails=g(['notabledetails','notable_details','details','distinguishing','markings']);
    const inv=flat['inventory']||flat['items'];o.inventory=Array.isArray(inv)?inv:(typeof inv==='string'&&inv?[inv]:[]);
    // v6.8.15: fertility collapsed to 2 fields. If the model still emits the
    // legacy structured fields (phase/day/window/pregnancy/week/reason), fold
    // them into fertNotes as a free-text summary so nothing is lost on the
    // way through. The lookup for each legacy field tolerates case/underscore
    // variants because delta snapshots from old chats may use any form.
    o.fertStatus=g(['fertstatus','status'])||'';
    o.fertNotes=g(['fertnotes','notes'])||'';
    if(!o.fertStatus){const ft=ch.fertilityTracker||ch.fertility||{};if(ft.status)o.fertStatus=ft.status}
    {
        const legacyBits=[];
        const _r=g(['fertreason','statusreason']);if(_r)legacyBits.push(_r);
        const _ph=g(['fertcyclephase','cyclephase']);if(_ph)legacyBits.push('phase: '+_ph);
        const _cd=Number(flat['fertcycleday']||flat['cycleday']);if(_cd>0)legacyBits.push('day '+_cd);
        const _wn=g(['fertwindow','fertilitywindow']);if(_wn&&_wn!=='N/A')legacyBits.push('window: '+_wn);
        const _pg=g(['fertpregnancy','pregnancystatus']);if(_pg&&_pg!=='N/A'&&_pg!=='not pregnant')legacyBits.push(_pg);
        const _pw=Number(flat['fertpregweek']||flat['pregnancyweek']);if(_pw>0)legacyBits.push('week '+_pw);
        if(legacyBits.length){
            const fold=legacyBits.join(', ');
            o.fertNotes=o.fertNotes?`${o.fertNotes}; ${fold}`:fold;
        }
    }
    return o;
}

// ── Quest view caps ──────────────────────────────────────────────────────
// Display-layer limits on quest tier sizes. Storage is never touched — the
// full quest arrays persist in the snapshot for historical browsing (e.g.
// Character Wiki, Payload Inspector). Only the view passed to the main
// quest journal panel is capped.
//
// Caps aligned with the hard caps in the interceptor prompt (main 3, side 4)
// plus a small buffer so one extra from model drift doesn't get dropped from
// the panel without warning. The prompt does the primary throttling; these
// caps are the display safety net.
const _QUEST_VIEW_CAPS = { mainQuests: 5, sideQuests: 6 };

// Urgency ordering — higher = more urgent = higher score when tier is over cap
const _URGENCY_SCORE = { critical: 5, high: 4, moderate: 3, low: 2, resolved: 1 };

// Cap a quest tier to `limit` entries. When the array exceeds the limit,
// sort by a compound score (urgency weight + position bonus for recency)
// and keep the top N. The dropped entries stay in the underlying snapshot —
// they're only hidden from this particular view.
function _capQuestTier(arr, limit) {
    if (!Array.isArray(arr) || arr.length <= limit) return arr;
    // Score each quest: urgency contributes most, index-in-array (recency)
    // breaks ties. Later entries are typically the model's most recent
    // additions so they get a slight boost.
    const scored = arr.map((q, i) => ({
        q,
        score: (_URGENCY_SCORE[q?.urgency] || 3) * 100 + i
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(s => s.q);
}

/**
 * Filter a normalized snapshot to only characters/relationships in charactersPresent.
 * Creates stub entries for any name in one array but not the other (sync guarantee).
 * Also caps each quest tier to a display-friendly size (storage is untouched).
 * Returns a shallow copy — the original snapshot is NOT mutated.
 */
export function filterForView(snap){
    if(!snap||typeof snap!=='object')return snap;
    const out={...snap};

    // ── Drop legacy activeTasks from view (v6.8.9: tier removed) ──
    // Defensive belt-and-braces strip — the normalize/merge paths already
    // discard the field, but any direct-from-storage render path would
    // still leak it without this line.
    delete out.activeTasks;

    // ── Strip any {{user}} entries at the view layer (v6.8.14) ──
    // normalizeTracker already drops the user from characters/relationships/
    // charactersPresent, but this defensive strip catches any render path
    // that feeds filterForView a snapshot straight from storage without
    // re-normalizing (e.g. legacy snapshots saved before v6.8.14, or any
    // future call site that skips normalize).
    if (Array.isArray(out.characters)) {
        out.characters = out.characters.filter(c => !isUserName(c?.name));
    }
    if (Array.isArray(out.relationships)) {
        out.relationships = out.relationships.filter(r => !isUserName(r?.name));
    }
    if (Array.isArray(out.charactersPresent)) {
        out.charactersPresent = out.charactersPresent.filter(n => !isUserName(n));
    }

    // ── Quest tier caps (always applied, regardless of charactersPresent) ──
    // Using a single fresh shallow copy of the snap ensures we never mutate
    // the original arrays even when we clip them.
    for (const [tierKey, limit] of Object.entries(_QUEST_VIEW_CAPS)) {
        if (Array.isArray(snap[tierKey])) {
            out[tierKey] = _capQuestTier(snap[tierKey], limit);
        }
    }

    // ── Character/relationship sync filter ──
    // Read from `out` (not `snap`) so the upstream user-strip above feeds
    // into this pass. If a legacy snapshot had {{user}} in charactersPresent,
    // this ensures the user is excluded from presentSet here too.
    const cp=out.charactersPresent;
    // v6.8.15: group chat awareness — in a group chat, every group-member
    // character should survive even if the model forgot to list them in
    // charactersPresent this turn. Union the member roster into the
    // present-set so filtering never drops them silently.
    const _gmNames=getGroupMemberNames();
    const _isGroupChat=_gmNames.length>1;
    if(!Array.isArray(cp)||!cp.length){
        // No filter data — skip the char/rel sync but still return the
        // shallow copy with capped quest arrays.
        out._spViewFiltered=true;
        return out;
    }
    const presentSet=new Set(cp.map(n=>(n||'').toLowerCase().trim()).filter(Boolean));
    if(_isGroupChat){
        for(const gm of _gmNames){
            const gmLow=(gm||'').toLowerCase().trim();
            if(gmLow)presentSet.add(gmLow);
        }
    }
    // Filter both arrays to only present names. Use the already-stripped
    // out.characters/out.relationships (not the raw snap arrays) so any
    // user entry that slipped in from legacy storage is filtered twice —
    // once by isUserName above, once by the presentSet intersection here.
    out.characters=(out.characters||[]).filter(c=>presentSet.has((c.name||'').toLowerCase().trim()));
    out.relationships=(out.relationships||[]).filter(r=>presentSet.has((r.name||'').toLowerCase().trim()));
    // Sync guarantee: stub any gaps between the two filtered arrays
    const charNames=new Set(out.characters.map(c=>(c.name||'').toLowerCase().trim()));
    const relNames=new Set(out.relationships.map(r=>(r.name||'').toLowerCase().trim()));
    for(const r of out.relationships){
        const rn=(r.name||'').toLowerCase().trim();
        if(rn&&!charNames.has(rn)){
            out.characters.push({name:r.name,role:r.relType||''});
            charNames.add(rn);
        }
    }
    for(const c of out.characters){
        const cn=(c.name||'').toLowerCase().trim();
        if(cn&&cn!=='?'&&!relNames.has(cn)){
            out.relationships.push({name:c.name,relType:'',relPhase:'',timeTogether:'',milestone:'',
                affection:0,affectionLabel:'unknown',trust:0,trustLabel:'unknown',
                desire:0,desireLabel:'unknown',stress:0,stressLabel:'unknown',
                compatibility:0,compatibilityLabel:'unknown'});
            relNames.add(cn);
        }
    }
    out._spViewFiltered=true;
    return out;
}
