// ScenePulse — Settings & Data Access Module
// Extracted from index.js lines 413-453, 786-895

import { MODULE_NAME, DEFAULTS } from './constants.js';
import { log, warn } from './logger.js';
import { esc } from './utils.js';
import { buildDynamicSchema, buildDynamicPrompt } from './schema.js';
import { t } from './i18n.js';
import { consolidateQuests } from './generation/delta-merge.js';

// Minimal inline user-name check for the one-shot migration below.
// Duplicates the logic in normalize.isUserName to avoid a circular import
// (normalize.js already imports getLatestSnapshot from this file). The
// migration runs once per chat at boot; duplication is acceptable for a
// one-liner that happens at module-boundary rather than in a hot path.
function _isUserName(name) {
    if (!name || typeof name !== 'string') return false;
    const norm = name.toLowerCase().trim();
    if (!norm) return false;
    if (norm === '{{user}}' || norm === 'user' || norm === 'you' || norm === 'player' || norm === 'me') return true;
    try {
        const n1 = (SillyTavern.getContext()?.name1 || '').toLowerCase().trim();
        if (n1 && norm === n1) return true;
    } catch {}
    return false;
}

let _settingsCache = null;

export function getSettings(){
if(_settingsCache) return _settingsCache;
const{extensionSettings}=SillyTavern.getContext();if(!extensionSettings[MODULE_NAME])extensionSettings[MODULE_NAME]=structuredClone(DEFAULTS);const s=extensionSettings[MODULE_NAME];for(const k of Object.keys(DEFAULTS))if(!Object.hasOwn(s,k))s[k]=DEFAULTS[k];if(s.customPanels?.length){s.customPanels=s.customPanels.filter(cp=>cp.name?.trim()||cp.fields?.some(f=>f.key?.trim()))}
// Overlay localStorage profile selections (these bypass ST's save pipeline)
try{const ls=JSON.parse(localStorage.getItem('sp_profiles')||'{}');
if(ls.connectionProfile!==undefined)s.connectionProfile=ls.connectionProfile;
if(ls.chatPreset!==undefined)s.chatPreset=ls.chatPreset;
if(ls.fallbackProfile!==undefined)s.fallbackProfile=ls.fallbackProfile;
if(ls.fallbackPreset!==undefined)s.fallbackPreset=ls.fallbackPreset;
}catch(e){}
_settingsCache = s;
return s}

export function saveSettings(){_settingsCache=null;SillyTavern.getContext().saveSettingsDebounced()}

export function invalidateSettingsCache(){_settingsCache=null;}

export function anyPanelsActive(){const s=getSettings();const p=s.panels||DEFAULTS.panels;return Object.values(p).some(v=>v!==false)||(s.customPanels||[]).some(cp=>cp.fields?.length>0)}

export function getTrackerData(){
    const m=SillyTavern.getContext().chatMetadata;if(!m)return{snapshots:{}};
    if(!m.scenepulse)m.scenepulse={snapshots:{}};
    // ── v6.8.9 migration: strip legacy activeTasks tier from all snapshots ──
    // The activeTasks quest tier was removed in v6.8.9. Old chats may still
    // have the field persisted in their saved metadata. This migration runs
    // lazily on first read of a chat's tracker data: if any snapshot still
    // contains activeTasks, strip it from every snapshot in the chat and
    // persist the cleaned metadata back to disk. Idempotent — guarded by
    // a per-chat flag so the scan only runs once.
    if(!m.scenepulse._spActiveTasksMigrated){
        let stripped=0;
        const snaps=m.scenepulse.snapshots||{};
        for(const k of Object.keys(snaps)){
            if(snaps[k]&&'activeTasks' in snaps[k]){
                delete snaps[k].activeTasks;
                stripped++;
            }
        }
        m.scenepulse._spActiveTasksMigrated=true;
        if(stripped>0){
            log('Migration v6.8.9: stripped activeTasks from',stripped,'snapshot(s) in this chat');
            try{SillyTavern.getContext().saveMetadata()}catch(e){warn('Migration save failed:',e?.message)}
        }
    }
    // ── v6.8.11 migration: run consolidateQuests over every snapshot ──────
    // Heals existing chats that accumulated quest duplicates before v6.8.11's
    // improved cross-tier dedup landed. Runs in-tier fuzzy dedup AND cross-tier
    // (mainQuests wins over sideQuests) across every snapshot in the chat,
    // then persists the cleaned metadata back to disk. Guarded by a per-chat
    // flag so the scan only runs once even though getTrackerData is hot.
    if(!m.scenepulse._spQuestDedupMigrated){
        let touched=0;
        const snaps=m.scenepulse.snapshots||{};
        for(const k of Object.keys(snaps)){
            const snap=snaps[k];
            if(!snap)continue;
            const beforeMain=Array.isArray(snap.mainQuests)?snap.mainQuests.length:0;
            const beforeSide=Array.isArray(snap.sideQuests)?snap.sideQuests.length:0;
            consolidateQuests(snap);
            const afterMain=Array.isArray(snap.mainQuests)?snap.mainQuests.length:0;
            const afterSide=Array.isArray(snap.sideQuests)?snap.sideQuests.length:0;
            if(afterMain!==beforeMain||afterSide!==beforeSide)touched++;
        }
        m.scenepulse._spQuestDedupMigrated=true;
        if(touched>0){
            log('Migration v6.8.11: consolidated quest duplicates in',touched,'snapshot(s) in this chat');
            try{SillyTavern.getContext().saveMetadata()}catch(e){warn('Migration save failed:',e?.message)}
        }
    }
    // ── v6.8.14 migration: strip {{user}} from characters/relationships/charactersPresent ──
    // Heals chats where the model emitted the user as a character entry
    // before v6.8.14's normalize/filterForView guards landed. Walks every
    // stored snapshot once, drops any matching entry from all three arrays,
    // and persists the cleaned metadata. Guarded by a per-chat flag so the
    // scan only runs once even though getTrackerData is hot.
    if(!m.scenepulse._spUserStripMigrated){
        let touched=0;
        const snaps=m.scenepulse.snapshots||{};
        for(const k of Object.keys(snaps)){
            const snap=snaps[k];
            if(!snap)continue;
            let changed=false;
            if(Array.isArray(snap.characters)){
                const before=snap.characters.length;
                snap.characters=snap.characters.filter(c=>!_isUserName(c?.name));
                if(snap.characters.length!==before)changed=true;
            }
            if(Array.isArray(snap.relationships)){
                const before=snap.relationships.length;
                snap.relationships=snap.relationships.filter(r=>!_isUserName(r?.name));
                if(snap.relationships.length!==before)changed=true;
            }
            if(Array.isArray(snap.charactersPresent)){
                const before=snap.charactersPresent.length;
                snap.charactersPresent=snap.charactersPresent.filter(n=>!_isUserName(n));
                if(snap.charactersPresent.length!==before)changed=true;
            }
            if(changed)touched++;
        }
        m.scenepulse._spUserStripMigrated=true;
        if(touched>0){
            log('Migration v6.8.14: stripped {{user}} entries from',touched,'snapshot(s) in this chat');
            try{SillyTavern.getContext().saveMetadata()}catch(e){warn('Migration save failed:',e?.message)}
        }
    }
    // ── v6.8.15 migration: fold deleted character fields into surviving ones ──
    // Schema trim dropped stateOfDress, physicalState, and 6 fertility sub-
    // fields. Walk every stored character entry once: fold stateOfDress into
    // outfit (with separator), fold physicalState into posture, fold the
    // structured fertility fields into fertNotes as free-text. Delete the old
    // keys after folding so storage stops carrying the stale shape forward.
    // Guarded by a per-chat flag.
    if(!m.scenepulse._spCharTrimMigrated){
        let touched=0;
        const snaps=m.scenepulse.snapshots||{};
        for(const k of Object.keys(snaps)){
            const snap=snaps[k];
            if(!snap||!Array.isArray(snap.characters))continue;
            let changed=false;
            for(const ch of snap.characters){
                if(!ch||typeof ch!=='object')continue;
                // stateOfDress → outfit
                if(ch.stateOfDress){
                    const dress=String(ch.stateOfDress);
                    const outfit=String(ch.outfit||'');
                    if(!outfit.toLowerCase().includes(dress.toLowerCase())){
                        ch.outfit=outfit?`${outfit} (${dress})`:dress;
                    }
                    delete ch.stateOfDress;
                    changed=true;
                }
                // physicalState → posture
                if(ch.physicalState){
                    const phys=String(ch.physicalState);
                    const posture=String(ch.posture||'');
                    if(!posture.toLowerCase().includes(phys.toLowerCase())){
                        ch.posture=posture?`${posture}; ${phys}`:phys;
                    }
                    delete ch.physicalState;
                    changed=true;
                }
                // Fold structured fertility into fertNotes as free text
                const legacyBits=[];
                if(ch.fertReason){legacyBits.push(String(ch.fertReason));delete ch.fertReason;changed=true}
                if(ch.fertCyclePhase){legacyBits.push('phase: '+ch.fertCyclePhase);delete ch.fertCyclePhase;changed=true}
                if(Number(ch.fertCycleDay)>0){legacyBits.push('day '+ch.fertCycleDay);delete ch.fertCycleDay;changed=true}
                else if('fertCycleDay' in ch){delete ch.fertCycleDay;changed=true}
                if(ch.fertWindow&&ch.fertWindow!=='N/A'){legacyBits.push('window: '+ch.fertWindow);delete ch.fertWindow;changed=true}
                else if('fertWindow' in ch){delete ch.fertWindow;changed=true}
                if(ch.fertPregnancy&&ch.fertPregnancy!=='N/A'&&ch.fertPregnancy!=='not pregnant'){legacyBits.push(String(ch.fertPregnancy));delete ch.fertPregnancy;changed=true}
                else if('fertPregnancy' in ch){delete ch.fertPregnancy;changed=true}
                if(Number(ch.fertPregWeek)>0){legacyBits.push('week '+ch.fertPregWeek);delete ch.fertPregWeek;changed=true}
                else if('fertPregWeek' in ch){delete ch.fertPregWeek;changed=true}
                if(legacyBits.length){
                    const existing=String(ch.fertNotes||'');
                    const fold=legacyBits.join(', ');
                    ch.fertNotes=existing?`${existing}; ${fold}`:fold;
                }
                // Ensure the new notableDetails field exists (empty by default)
                if(!('notableDetails' in ch)){ch.notableDetails='';changed=true}
            }
            if(changed)touched++;
        }
        m.scenepulse._spCharTrimMigrated=true;
        if(touched>0){
            log('Migration v6.8.15: trimmed character schema in',touched,'snapshot(s) in this chat');
            try{SillyTavern.getContext().saveMetadata()}catch(e){warn('Migration save failed:',e?.message)}
        }
    }
    // ── v6.8.18 migration: initialize aliases=[] on every stored character ──
    // The aliases field is new in v6.8.18. Existing chats need an empty array
    // written in so the merge path can rely on its presence and the UI can
    // render it without defensive null checks at every access. Also strips
    // the canonical name from any aliases list that accidentally contains
    // it (defense for future edge cases). Guarded by a per-chat flag.
    if(!m.scenepulse._spAliasesInitMigrated){
        let touched=0;
        const snaps=m.scenepulse.snapshots||{};
        for(const k of Object.keys(snaps)){
            const snap=snaps[k];
            if(!snap||!Array.isArray(snap.characters))continue;
            let changed=false;
            for(const ch of snap.characters){
                if(!ch||typeof ch!=='object')continue;
                if(!Array.isArray(ch.aliases)){ch.aliases=[];changed=true;continue}
                const canonLow=(ch.name||'').toLowerCase().trim();
                const seen=new Set();
                const cleaned=[];
                for(const a of ch.aliases){
                    const s=String(a||'').trim();
                    if(!s)continue;
                    const sl=s.toLowerCase();
                    if(sl===canonLow){changed=true;continue}
                    if(seen.has(sl)){changed=true;continue}
                    seen.add(sl);
                    cleaned.push(s);
                }
                if(cleaned.length!==ch.aliases.length){ch.aliases=cleaned;changed=true}
            }
            if(changed)touched++;
        }
        m.scenepulse._spAliasesInitMigrated=true;
        if(touched>0){
            log('Migration v6.8.18: initialized character aliases in',touched,'snapshot(s) in this chat');
            try{SillyTavern.getContext().saveMetadata()}catch(e){warn('Migration save failed:',e?.message)}
        }
    }
    return m.scenepulse;
}

// ── v6.8.18: manual character merge across all snapshots ───────────────────
// Walks every stored snapshot in the current chat and merges `srcName` into
// `tgtName`: renames the source character entry, unions aliases, preserves
// target fields (target wins on defined values), same for relationships, and
// rewrites charactersPresent. Saves metadata once at the end.
//
// The walk is in-place on the stored data — this is a destructive operation
// intended to be triggered by a confirmed user action in the UI. Returns a
// summary object with counts of what was touched.
export function mergeCharactersAcrossSnapshots(srcName, tgtName) {
    if (!srcName || !tgtName) return { ok: false, reason: 'missing names' };
    const srcLow = srcName.toLowerCase().trim();
    const tgtLow = tgtName.toLowerCase().trim();
    if (!srcLow || !tgtLow) return { ok: false, reason: 'empty names' };
    if (srcLow === tgtLow) return { ok: false, reason: 'same name' };

    const data = getTrackerData();
    const snaps = data.snapshots || {};
    let snapsTouched = 0, charsMerged = 0, relsMerged = 0, presentFixed = 0;

    for (const k of Object.keys(snaps)) {
        const snap = snaps[k];
        if (!snap) continue;
        let changed = false;

        // ── Characters ──
        if (Array.isArray(snap.characters)) {
            const srcIdx = snap.characters.findIndex(c => (c?.name || '').toLowerCase().trim() === srcLow);
            const tgtIdx = snap.characters.findIndex(c => (c?.name || '').toLowerCase().trim() === tgtLow);
            if (srcIdx !== -1 && tgtIdx !== -1) {
                // Merge src into tgt: target fields win on defined, src fields fill
                // in gaps. Aliases union + push the source name into the target
                // alias list.
                const src = snap.characters[srcIdx];
                const tgt = snap.characters[tgtIdx];
                const merged = { ...src, ...tgt };
                const aliasSet = new Set();
                const aliasOut = [];
                const add = (v) => {
                    const s = String(v || '').trim();
                    if (!s) return;
                    const sl = s.toLowerCase();
                    if (sl === tgtLow) return;
                    if (aliasSet.has(sl)) return;
                    aliasSet.add(sl);
                    aliasOut.push(s);
                };
                if (Array.isArray(tgt.aliases)) tgt.aliases.forEach(add);
                if (Array.isArray(src.aliases)) src.aliases.forEach(add);
                add(src.name);
                merged.aliases = aliasOut;
                snap.characters[tgtIdx] = merged;
                snap.characters.splice(srcIdx, 1);
                charsMerged++;
                changed = true;
            } else if (srcIdx !== -1) {
                // Target doesn't exist in this snapshot — rename the source entry
                const src = snap.characters[srcIdx];
                src.name = tgtName;
                if (!Array.isArray(src.aliases)) src.aliases = [];
                const aliasSet = new Set(src.aliases.map(a => (a || '').toLowerCase().trim()));
                const srcLow2 = srcName.toLowerCase().trim();
                if (srcLow2 && !aliasSet.has(srcLow2)) {
                    src.aliases.push(srcName);
                }
                changed = true;
            }
        }

        // ── Relationships ──
        if (Array.isArray(snap.relationships)) {
            const srcIdx = snap.relationships.findIndex(r => (r?.name || '').toLowerCase().trim() === srcLow);
            const tgtIdx = snap.relationships.findIndex(r => (r?.name || '').toLowerCase().trim() === tgtLow);
            if (srcIdx !== -1 && tgtIdx !== -1) {
                // Merge src into tgt: prefer non-zero numeric, non-empty string
                const src = snap.relationships[srcIdx];
                const tgt = snap.relationships[tgtIdx];
                const merged = { ...tgt };
                for (const [fk, fv] of Object.entries(src)) {
                    if (fk === 'name') continue;
                    if (typeof fv === 'number') {
                        if (fv !== 0 && (merged[fk] == null || merged[fk] === 0)) merged[fk] = fv;
                    } else if (fv !== undefined && fv !== null && fv !== '') {
                        if (!merged[fk]) merged[fk] = fv;
                    }
                }
                snap.relationships[tgtIdx] = merged;
                snap.relationships.splice(srcIdx, 1);
                relsMerged++;
                changed = true;
            } else if (srcIdx !== -1) {
                snap.relationships[srcIdx].name = tgtName;
                changed = true;
            }
        }

        // ── charactersPresent ──
        if (Array.isArray(snap.charactersPresent)) {
            const before = snap.charactersPresent.length;
            const seen = new Set();
            const out = [];
            for (const n of snap.charactersPresent) {
                const low = (n || '').toLowerCase().trim();
                const final = low === srcLow ? tgtName : n;
                const finalLow = (final || '').toLowerCase().trim();
                if (!finalLow || seen.has(finalLow)) continue;
                seen.add(finalLow);
                out.push(final);
            }
            if (out.length !== before || !out.every((v, i) => v === snap.charactersPresent[i])) {
                snap.charactersPresent = out;
                presentFixed++;
                changed = true;
            }
        }

        if (changed) snapsTouched++;
    }

    if (snapsTouched > 0) {
        try { SillyTavern.getContext().saveMetadata(); } catch (e) { warn('Manual merge save failed:', e?.message); }
    }
    log('Manual merge:', srcName, '→', tgtName,
        '| snaps touched=', snapsTouched,
        'chars merged=', charsMerged,
        'rels merged=', relsMerged,
        'present fixed=', presentFixed);
    return { ok: true, snapsTouched, charsMerged, relsMerged, presentFixed };
}

export function getLatestSnapshot(){const d=getTrackerData();const k=Object.keys(d.snapshots).sort((a,b)=>Number(b)-Number(a));return k.length?d.snapshots[k[0]]:null}

export function saveSnapshot(id,j){
    const data=getTrackerData();
    data.snapshots[String(id)]=j;
    // Prune: user-configurable max snapshots (0 = unlimited)
    const keys=Object.keys(data.snapshots).map(Number).sort((a,b)=>a-b);
    const s=getSettings();
    const MAX_STORED=s.maxSnapshots||0;
    if(MAX_STORED>0&&keys.length>MAX_STORED){
        const toRemove=keys.slice(0,keys.length-MAX_STORED);
        for(const k of toRemove)delete data.snapshots[String(k)];
        log('Pruned',toRemove.length,'old snapshots, keeping',MAX_STORED);
    }
    SillyTavern.getContext().saveMetadata();
}

export function getSnapshotFor(id){return getTrackerData().snapshots?.[String(id)]??null}

export function getPrevSnapshot(id){const sorted=Object.keys(getTrackerData().snapshots).map(Number).sort((a,b)=>a-b);const p=sorted.filter(k=>k<id).pop();return p!=null?getTrackerData().snapshots[String(p)]:null}

export function getActiveSchema(){
    const s=getSettings();
    // If user has a fully custom schema override, use it
    if(s.schema){try{return{name:'Custom',description:'',strict:false,value:JSON.parse(s.schema)}}catch{}}
    // Otherwise build dynamically from enabled panels + custom panels
    return{name:'ScenePulse',description:'Scene tracker.',strict:false,value:buildDynamicSchema(s)};
}

export function getActivePrompt(opts){
    const s=getSettings();
    if(s.systemPrompt)return s.systemPrompt;
    return buildDynamicPrompt(s, opts);
}

// ── Language ──
const _LOCALE_MAP={ru:'Russian',ja:'Japanese',ko:'Korean','zh-cn':'Chinese (Simplified)','zh-tw':'Chinese (Traditional)',es:'Spanish','pt-br':'Portuguese',fr:'French',de:'German',it:'Italian',ar:'Arabic',tr:'Turkish',th:'Thai',vi:'Vietnamese',pl:'Polish',uk:'Ukrainian',id:'Indonesian',nl:'Dutch',cs:'Czech',ro:'Romanian',hu:'Hungarian',sv:'Swedish',fi:'Finnish',da:'Danish',no:'Norwegian',el:'Greek',he:'Hebrew',hi:'Hindi',ms:'Malay'};
export function getLanguage(){
    const s=getSettings();
    if(s.language)return s.language==='English'?'':s.language;
    try{const lsLang=localStorage.getItem('language');if(lsLang)return _LOCALE_MAP[lsLang]||''}catch{}
    return'';
}

// ── External Access ──
export function getConnectionProfiles(){try{const o=document.querySelectorAll('#connection_profiles option, #connection_profile option');if(o.length)return Array.from(o).filter(x=>x.value).map(x=>({id:x.value,name:x.textContent.trim()}))}catch(e){warn('Profiles:',e)}return[]}

export function getChatPresets(){try{for(const sel of['#settings_preset_openai','#preset_openai_select','#settings_preset_chat']){const o=document.querySelectorAll(`${sel} option`);if(o.length>1)return Array.from(o).filter(x=>x.value).map(x=>({id:x.value,name:x.textContent.trim()}))}}catch(e){warn('Presets:',e)}return[]}

export function getLorebooks(){try{const o=document.querySelectorAll('#world_info option');if(o.length)return Array.from(o).filter(x=>x.value).map(x=>({id:x.value,name:x.textContent.trim()}))}catch(e){warn('Lore:',e)}return[]}

export function getActiveLorebookInfo(){
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

export function refreshLorebookDisplay(){
    const el=document.getElementById('sp-lore-display');
    if(!el)return;
    const info=getActiveLorebookInfo();
    const s=getSettings();
    const mode=s.lorebookMode||'character_attached';
    let html='';
    const allBooks=[...info.global,...info.char,...info.attached].filter((v,i,a)=>a.indexOf(v)===i).filter(b=>b&&b!=='--- None ---');
    if(!allBooks.length){
        html='<div class="sp-lore-none">'+t('No lorebooks detected')+'</div>';
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

export function updateLorebookRec(){
    const el=document.getElementById('sp-lore-rec');
    if(!el)return;
    const s=getSettings();
    const method=s.injectionMethod||'inline';
    const current=s.lorebookMode||'character_attached';
    let rec,reason;
    if(method==='separate'){
        rec='character_attached';
        reason=t('Separate generation runs an isolated API call — it needs lorebook context injected since ST won\'t provide it automatically.');
    } else {
        rec='exclude_all';
        reason=t('Together mode uses the normal generation — ST already injects lorebooks into context, so including them here would be redundant.');
    }
    const recLabel={'character_attached':'Attached','character_only':'Character only','exclude_all':'Disabled','allowlist':'Allowlist'}[rec]||rec;
    if(current===rec){
        el.innerHTML=`<span class="sp-lore-rec-ok">\u2713 ${t('Using recommended:')} <strong>${esc(recLabel)}</strong></span><span class="sp-lore-rec-why">${reason}</span>`;
    } else {
        el.innerHTML=`<span class="sp-lore-rec-suggest">${t('Recommended:')} <strong>${esc(recLabel)}</strong> <a href="#" id="sp-lore-apply-rec">${t('Apply')}</a></span><span class="sp-lore-rec-why">${reason}</span>`;
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

// Save chat to disk -- prevents message loss when profile switches trigger CHAT_CHANGED reload.
// Coalescing: if called rapidly (e.g. by extraction + GENERATION_ENDED + other extensions like
// MemoryBooks all saving metadata concurrently), concurrent callers share a single save promise.
let _savePending=null;
export async function ensureChatSaved(){
    if(_savePending)return _savePending;
    _savePending=(async()=>{
        try{
            const ctx=SillyTavern.getContext();
            if(typeof ctx.saveChat==='function'){await ctx.saveChat();return}
            if(typeof ctx.saveChatConditional==='function'){await ctx.saveChatConditional();return}
            try{
                const chatModule=await import('/scripts/chat.js');
                if(chatModule.saveChat){await chatModule.saveChat();return}
                if(chatModule.saveChatConditional){await chatModule.saveChatConditional();return}
                if(chatModule.saveChatDebounced){chatModule.saveChatDebounced()}
            }catch{}
        }catch(e){warn('ensureChatSaved:',e?.message)}
        finally{_savePending=null}
    })();
    return _savePending;
}
