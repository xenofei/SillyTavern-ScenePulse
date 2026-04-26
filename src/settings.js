// ScenePulse — Settings & Data Access Module
// Extracted from index.js lines 413-453, 786-895

import { MODULE_NAME, DEFAULTS } from './constants.js';
import { log, warn } from './logger.js';
import { esc } from './utils.js';
import { buildDynamicSchema, buildDynamicPrompt } from './schema.js';
import { assemblePrompt } from './prompts/assembler.js';
import { t } from './i18n.js';
import { consolidateQuests } from './generation/delta-merge.js';
import { getActiveProfile, migrateLegacySettingsToProfile, migrateOrphanRootData } from './profiles.js';

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
const{extensionSettings}=SillyTavern.getContext();if(!extensionSettings[MODULE_NAME])extensionSettings[MODULE_NAME]=structuredClone(DEFAULTS);const s=extensionSettings[MODULE_NAME];for(const k of Object.keys(DEFAULTS))if(!Object.hasOwn(s,k))s[k]=DEFAULTS[k];// v6.9.10: relaxed custom panel filter. Previously stripped panels
// where both name AND all keys were empty, which deleted panels mid-
// edit when the user changed a field type before filling in the key.
// Now only strips panels with zero fields (truly abandoned stubs).
if(s.customPanels?.length){s.customPanels=s.customPanels.filter(cp=>cp.fields?.length>0||cp.name?.trim());
// v6.9.13: assign stable IDs to panels missing them (migration for
// pre-v6.9.13 panels + defensive fallback for future creation bugs)
for(const cp of s.customPanels){if(!cp.id)cp.id='cp_'+Date.now()+'_'+Math.random().toString(36).slice(2,6)}
}
// Overlay localStorage profile selections (these bypass ST's save pipeline)
try{const ls=JSON.parse(localStorage.getItem('sp_profiles')||'{}');
if(ls.connectionProfile!==undefined)s.connectionProfile=ls.connectionProfile;
if(ls.chatPreset!==undefined)s.chatPreset=ls.chatPreset;
if(ls.fallbackProfile!==undefined)s.fallbackProfile=ls.fallbackProfile;
if(ls.fallbackPreset!==undefined)s.fallbackPreset=ls.fallbackPreset;
}catch(e){}
// v6.23.8: one-shot migration to clear stale "0" preset values. These were
// an artifact of pre-v6.23.7 versions where the dropdown's empty-option
// sentinel was sometimes initialized as the literal string "0". On modern
// ST setups "0" silently matches the first preset (typically "Default" —
// 4k context, different model), so SP's fallback path was visibly switching
// the user's preset and triggering "Mandatory prompt exceeds context size"
// toasts. v6.23.7 renamed the dropdown label to "(Same as current)" but
// users still had to manually re-pick to clear the stale stored value.
// Auto-migrate by clearing "0" everywhere it might be persisted.
if(!s._fallbackPresetMigrationDone){
    let migrated=false;
    if(s.fallbackPreset==='0'){s.fallbackPreset='';migrated=true;log('Migrated legacy fallbackPreset="0" → "" (Same as current)')}
    if(s.chatPreset==='0'){s.chatPreset='';migrated=true;log('Migrated legacy chatPreset="0" → "" (Same as current)')}
    if(migrated){
        for(const lsKey of ['sp_profiles','scenepulse_config']){
            try{
                const lsObj=JSON.parse(localStorage.getItem(lsKey)||'{}');
                let dirty=false;
                if(lsObj.fallbackPreset==='0'){lsObj.fallbackPreset='';dirty=true}
                if(lsObj.chatPreset==='0'){lsObj.chatPreset='';dirty=true}
                if(dirty)localStorage.setItem(lsKey,JSON.stringify(lsObj));
            }catch{}
        }
    }
    s._fallbackPresetMigrationDone=true;
    try{SillyTavern.getContext().saveSettingsDebounced()}catch{}
}
_settingsCache = s;
return s}

export function saveSettings(){_settingsCache=null;SillyTavern.getContext().saveSettingsDebounced()}

export function invalidateSettingsCache(){_settingsCache=null;}

/**
 * v6.9.14: get the active custom panels for the CURRENT chat.
 *
 * Each chat owns its own copy of panel definitions in
 * chatMetadata.scenepulse.chatPanels[]. This is the per-chat
 * editing surface — adding/removing/toggling fields here only
 * affects this chat.
 *
 * Fallback: if chatPanels doesn't exist (new chat, legacy chat),
 * returns the global s.customPanels as a read-only fallback.
 * Any edit triggers a migration: deep-clone global into chatPanels.
 *
 * @param {object} [s] - settings object (optional, auto-fetched if omitted)
 * @returns {Array} the active panel array for this chat
 */
export function getActivePanels(s) {
    if (!s) s = getSettings();
    try {
        const cp = SillyTavern.getContext().chatMetadata?.scenepulse?.chatPanels;
        // v6.13.1: if chatPanels exists at all (even as empty []), it
        // is authoritative — empty means the user deleted everything in
        // this chat and that intent must stick across reloads. The prior
        // `cp.length > 0` check incorrectly fell back to profile panels
        // when the user emptied chatPanels, causing deleted panels to
        // resurface on every reload.
        if (Array.isArray(cp)) return cp;
    } catch {}
    // chatPanels truly never set on this chat — seed from active profile.
    // Used by brand-new chats so profile-defined panels appear without
    // requiring an initial edit. Once any edit happens, ensureChatPanels
    // materializes chatPanels and the branch above takes over.
    try {
        const profile = getActiveProfile(s);
        if (profile && Array.isArray(profile.customPanels) && profile.customPanels.length > 0) {
            return profile.customPanels;
        }
    } catch {}
    return [];
}

/**
 * Ensure the current chat has its own chatPanels copy.
 * If chatPanels doesn't exist, deep-clone from global customPanels.
 * Returns the chat-local array (safe to mutate).
 */
export function ensureChatPanels() {
    const s = getSettings();
    // v6.13.0 (issue #15): when materializing chatPanels for the first
    // time (because the user is about to edit a panel), seed them from
    // the active profile's customPanels. This means a "fresh" edit on
    // a chat that previously read panels through the profile fallback
    // will start with the same set the chat was already showing — no
    // surprise panel disappearance.
    const profile = getActiveProfile(s);
    const seed = (profile && Array.isArray(profile.customPanels)) ? profile.customPanels : (s.customPanels || []);
    try {
        const ctx = SillyTavern.getContext();
        if (!ctx || !ctx.chatMetadata) return seed;
        if (!ctx.chatMetadata.scenepulse) ctx.chatMetadata.scenepulse = { snapshots: {} };
        if (!Array.isArray(ctx.chatMetadata.scenepulse.chatPanels)) {
            ctx.chatMetadata.scenepulse.chatPanels = JSON.parse(JSON.stringify(seed));
            try { ctx.saveMetadata(); } catch {}
        }
        return ctx.chatMetadata.scenepulse.chatPanels;
    } catch { return seed; }
}

/** Save per-chat panel changes to metadata. No-op if no chat is active. */
export function saveChatPanels() {
    try {
        const ctx = SillyTavern.getContext();
        if (ctx && ctx.chatMetadata) ctx.saveMetadata();
    } catch {}
}

// v6.23.4 BUGFIX: was reading `s.panels` (root) which the v6.16.2+ orphan
// migration drains — so post-migration this returned false even when the
// active profile had panels. v6.22.1's one-shot guard then PERSISTED the
// drained root to disk, breaking interceptor + function-tool + slash
// commands on every load (Together-mode generation silently skipped).
// Fix: read from the profile-projected view, matching getActivePrompt /
// getActiveSchema's pattern. Profile is the source of truth; root is
// post-migration empty.
export function anyPanelsActive(){
    const s=getSettings();
    let p, panels;
    try {
        const profile = getActiveProfile(s);
        const sView = buildProfileView(s, profile);
        p = sView.panels || DEFAULTS.panels;
        panels = getActivePanels(sView);
    } catch {
        p = s.panels || DEFAULTS.panels;
        panels = getActivePanels(s);
    }
    return Object.values(p).some(v=>v!==false) || panels.some(cp=>cp.enabled!==false && cp.fields?.length>0);
}

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
    // ── v6.22.1 migration: backfill the wiki archive ─────────────────────
    // Build the persistent character/relationship archive from existing
    // snapshots if the chat predates v6.22.1. Idempotent: _backfillWikiArchive
    // skips if archive is already populated. Runs once per chat load (the
    // first non-empty result fingerprint will then short-circuit).
    if(!m.scenepulse._spWikiArchiveBackfilled){
        try { _backfillWikiArchive(m.scenepulse); } catch(e) { warn('Wiki archive backfill:', e?.message); }
        m.scenepulse._spWikiArchiveBackfilled = true;
        try{SillyTavern.getContext().saveMetadata()}catch(e){warn('Backfill save failed:',e?.message)}
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
    // ── v6.8.30 migration: canonicalize paren-aliased name references ──
    // Heals chats where the LLM emitted inconsistent name references across
    // arrays, e.g. characters[] has `{name: "Officer Jane", aliases: ["The
    // Entity", "Lilith"]}` but relationships[] has `{name: "Officer Jane
    // (The Entity)"}` and charactersPresent has `"Officer Jane (The Entity/
    // Lilith)"`. The mismatched references caused filterForView to drop the
    // real character and build an empty stub from the relationship entry.
    //
    // For every snapshot: strip paren-aliases from character name fields
    // (folding them into aliases), build an alias → canonical map, then
    // rewrite relationships[].name and charactersPresent through the map.
    // Deduplicates relationships that collapse to the same canonical name.
    if(!m.scenepulse._spNameCanonMigrated){
        let touched=0;
        const snaps=m.scenepulse.snapshots||{};
        // Inline helper: strip a trailing parenthetical from a name when it
        // looks alias-like (short, no sentence punctuation, capitalized
        // parts). Returns { base, aliases } where base is the canonical
        // name and aliases is the split list (empty if no strip happened).
        function _splitParenAliases(rawName){
            if(typeof rawName!=='string')return{base:rawName,aliases:[]};
            const mm=rawName.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
            if(!mm)return{base:rawName,aliases:[]};
            const base=mm[1].trim();
            const inside=mm[2].trim();
            if(!base||inside.length>60||/[.!?]/.test(inside)||/'s\s/.test(inside)||/\bof the\b/i.test(inside)){
                return{base:rawName,aliases:[]};
            }
            const parts=inside.split(/[\/,;]/).map(s=>s.trim()).filter(Boolean);
            if(parts.length===0)return{base:rawName,aliases:[]};
            const looksLikeNames=parts.every(p=>/^[A-Z]/.test(p)||p.length<=15);
            if(!looksLikeNames)return{base:rawName,aliases:[]};
            return{base,aliases:parts};
        }
        for(const k of Object.keys(snaps)){
            const snap=snaps[k];
            if(!snap)continue;
            let changed=false;
            // Step 1: strip paren-aliases from character names
            if(Array.isArray(snap.characters)){
                for(const ch of snap.characters){
                    if(!ch||typeof ch!=='object')continue;
                    const{base,aliases:parenAliases}=_splitParenAliases(ch.name);
                    if(parenAliases.length>0&&base!==ch.name){
                        ch.name=base;
                        if(!Array.isArray(ch.aliases))ch.aliases=[];
                        const seen=new Set(ch.aliases.map(a=>(a||'').toString().toLowerCase().trim()));
                        const canonLow=base.toLowerCase().trim();
                        for(const a of parenAliases){
                            const al=a.toLowerCase();
                            if(al===canonLow)continue;
                            if(seen.has(al))continue;
                            seen.add(al);
                            ch.aliases.push(a);
                        }
                        changed=true;
                    }
                }
            }
            // Step 2: build alias → canonical map from the cleaned characters
            const aliasMap=new Map();
            if(Array.isArray(snap.characters)){
                for(const ch of snap.characters){
                    const canon=(ch?.name||'').trim();
                    const canonLow=canon.toLowerCase();
                    if(!canonLow)continue;
                    aliasMap.set(canonLow,canon);
                    if(Array.isArray(ch.aliases)){
                        for(const a of ch.aliases){
                            const al=(a||'').toString().toLowerCase().trim();
                            if(al&&al!==canonLow&&!aliasMap.has(al))aliasMap.set(al,canon);
                        }
                    }
                }
            }
            // Step 3: canonicalize a raw name against the alias map
            function _canonicalizeName(raw){
                if(!raw||typeof raw!=='string')return raw;
                const low=raw.toLowerCase().trim();
                if(!low)return raw;
                if(aliasMap.has(low))return aliasMap.get(low);
                const mm=raw.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
                if(mm){
                    const base=mm[1].trim();
                    if(base&&aliasMap.has(base.toLowerCase()))return aliasMap.get(base.toLowerCase());
                    const parts=mm[2].split(/[\/,;]/).map(s=>s.trim()).filter(Boolean);
                    for(const p of parts){
                        const pl=p.toLowerCase();
                        if(aliasMap.has(pl))return aliasMap.get(pl);
                    }
                }
                return raw;
            }
            // Step 4: rewrite relationships[] and dedup
            if(Array.isArray(snap.relationships)){
                const byCanon=new Map();
                const out=[];
                let rewrote=0;
                for(const rel of snap.relationships){
                    if(!rel||typeof rel!=='object'){out.push(rel);continue}
                    const orig=rel.name;
                    const canon=_canonicalizeName(orig);
                    if(canon!==orig){rel.name=canon;rewrote++}
                    const key=(canon||'').toLowerCase().trim();
                    if(key&&byCanon.has(key)){
                        const existing=out[byCanon.get(key)];
                        for(const[fk,fv]of Object.entries(rel)){
                            if(fk==='name')continue;
                            if(typeof fv==='number'){
                                if(fv!==0&&(existing[fk]==null||existing[fk]===0))existing[fk]=fv;
                            }else if(fv!==undefined&&fv!==null&&fv!==''){
                                if(!existing[fk])existing[fk]=fv;
                            }
                        }
                    }else{
                        byCanon.set(key,out.length);
                        out.push(rel);
                    }
                }
                if(rewrote>0||out.length!==snap.relationships.length){
                    snap.relationships=out;
                    changed=true;
                }
            }
            // Step 5: rewrite charactersPresent + dedup
            if(Array.isArray(snap.charactersPresent)){
                const seen=new Set();
                const out=[];
                let rewrote=0;
                for(const n of snap.charactersPresent){
                    const canon=_canonicalizeName(n);
                    if(canon!==n)rewrote++;
                    const k=(canon||'').toLowerCase().trim();
                    if(!k||seen.has(k))continue;
                    seen.add(k);
                    out.push(canon);
                }
                if(rewrote>0||out.length!==snap.charactersPresent.length){
                    snap.charactersPresent=out;
                    changed=true;
                }
            }
            if(changed)touched++;
        }
        m.scenepulse._spNameCanonMigrated=true;
        if(touched>0){
            log('Migration v6.8.30: canonicalized paren-aliased name references in',touched,'snapshot(s) in this chat');
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

/**
 * v6.8.50: determine whether THIS turn should use delta mode or force
 * a full-state refresh. Called by both the interceptor (prompt building)
 * and the engine/pipeline (delta merge gating) to ensure they agree.
 *
 * Returns `true` for delta, `false` for forced-full. The decision is:
 *   1. deltaMode must be enabled in settings.
 *   2. A previous snapshot must exist (first turn is always full).
 *   3. The counter `_spMeta.deltaTurnsSinceFull` must be BELOW the
 *      configured `deltaRefreshInterval`. If >= threshold, this turn
 *      is forced-full to re-establish ground truth.
 *   4. If `deltaRefreshInterval` is 0, periodic refresh is disabled
 *      and delta mode is always used (no forced full).
 *
 * The counter is NOT incremented here — it's incremented when the
 * snapshot is saved (in engine.js / pipeline.js), so repeated calls
 * within the same turn return the same answer.
 */
let _forceFullNextTurn = false;

export function shouldUseDelta() {
    const s = getSettings();
    if (!s.deltaMode) return false;
    if (_forceFullNextTurn) return false;
    const snap = getLatestSnapshot();
    if (!snap) return false;
    const interval = typeof s.deltaRefreshInterval === 'number' ? s.deltaRefreshInterval : 15;
    if (interval <= 0) return true; // periodic refresh disabled
    const turnsSinceFull = (snap._spMeta?.deltaTurnsSinceFull ?? 0);
    return turnsSinceFull < interval;
}

/**
 * v6.8.50: force the next generation to use full-state mode regardless
 * of the delta mode setting. Called by /sp-refresh and the "Refresh
 * Full State" UI button. The flag auto-clears after one generation
 * cycle because shouldUseDelta() returns false, the snapshot gets
 * deltaTurnsSinceFull=0, and subsequent turns resume delta mode
 * normally.
 */
export function forceFullStateRefresh() {
    _forceFullNextTurn = true;
}

/**
 * Clear the force-full flag. Called after the generation completes
 * (success or failure) so the flag doesn't persist across user actions.
 */
export function clearForceFullState() {
    _forceFullNextTurn = false;
}

// v6.22.1: Wiki Permanence Archive — guarantees the Character Wiki shows
// EVERY character ever observed in this chat, even if their snapshot got
// pruned out of the rolling buffer (maxSnapshots > 0) or if the model
// stopped emitting them in characters[]. Lives at data._spArchive,
// mirroring the same shape as a single snapshot's character/relationship
// records but keyed by lowercase canonical name. Latest write per name
// wins; entries are NEVER deleted.
//
// The wiki module reads this as a third-tier fallback after _findLatest
// (snapshots) misses. See src/ui/character-wiki.js.
function _ensureArchive(data){
    if(!data._spArchive || typeof data._spArchive !== 'object'){
        data._spArchive = { characters: {}, relationships: {}, builtAt: new Date().toISOString() };
    }
    if(!data._spArchive.characters || typeof data._spArchive.characters !== 'object') data._spArchive.characters = {};
    if(!data._spArchive.relationships || typeof data._spArchive.relationships !== 'object') data._spArchive.relationships = {};
    return data._spArchive;
}
function _updateWikiArchive(data, snap){
    if(!snap || typeof snap !== 'object') return;
    const arc = _ensureArchive(data);
    if(Array.isArray(snap.characters)){
        for(const ch of snap.characters){
            const nm = (ch?.name || '').toLowerCase().trim();
            if(!nm || nm === '?') continue;
            // Latest write wins. Stash a deep copy so future delta merges
            // mutating the original snapshot don't bleed into the archive.
            arc.characters[nm] = { ...ch, _spArchivedAt: new Date().toISOString() };
            // Index by aliases too so the wiki can look up by old placeholder.
            // Always reassign — if the model reveals "Karen had alias Stranger",
            // the alias key should resolve to the Karen entry, not whatever
            // earlier record happened to be saved under "stranger".
            if(Array.isArray(ch.aliases)){
                for(const a of ch.aliases){
                    const al = String(a||'').toLowerCase().trim();
                    if(al) arc.characters[al] = arc.characters[nm];
                }
            }
        }
    }
    if(Array.isArray(snap.relationships)){
        for(const rel of snap.relationships){
            const nm = (rel?.name || '').toLowerCase().trim();
            if(!nm) continue;
            arc.relationships[nm] = { ...rel, _spArchivedAt: new Date().toISOString() };
        }
    }
}

/**
 * Backfill the wiki archive from existing snapshots if missing. Runs once
 * per chat metadata load (idempotent — does nothing if archive already
 * present and non-empty). Called from getTrackerData().
 */
function _backfillWikiArchive(data){
    if(!data || typeof data !== 'object') return;
    if(data._spArchive && data._spArchive.characters &&
       Object.keys(data._spArchive.characters).length > 0) return;
    if(!data.snapshots || typeof data.snapshots !== 'object') return;
    const keys = Object.keys(data.snapshots).map(Number).sort((a,b)=>a-b);
    if(!keys.length) return;
    _ensureArchive(data);
    for(const k of keys) _updateWikiArchive(data, data.snapshots[String(k)]);
    log('Wiki archive backfilled from', keys.length, 'snapshots,',
        Object.keys(data._spArchive.characters).length, 'characters');
}

/**
 * Read the wiki archive for the current chat. Used by character-wiki.js
 * as a fallback when a character is no longer present in any snapshot's
 * characters[] array (pruned, dropped by model, etc.).
 *
 * @returns {{characters: Object<string, object>, relationships: Object<string, object>}}
 */
export function getWikiArchive(){
    const data = getTrackerData();
    return _ensureArchive(data);
}

export function saveSnapshot(id,j){
    const data=getTrackerData();
    // v6.16.2: stamp savedAt on every snapshot at write time so the inspector's
    // sparkline can correlate crash-log timestamps to turn IDs (Panel B
    // backfill). Live under _spMeta to avoid colliding with model-emitted
    // top-level fields.
    if(j && typeof j === 'object'){
        if(!j._spMeta || typeof j._spMeta !== 'object') j._spMeta = {};
        j._spMeta.savedAt = new Date().toISOString();
    }
    data.snapshots[String(id)]=j;
    // v6.22.1: update the wiki archive BEFORE pruning, so even if this
    // save triggers a prune of the oldest snapshot, every character it
    // contained is still in the archive forever.
    try { _updateWikiArchive(data, j); } catch(e) { warn('Wiki archive update failed:', e?.message); }
    // Prune: user-configurable max snapshots (0 = unlimited)
    const keys=Object.keys(data.snapshots).map(Number).sort((a,b)=>a-b);
    const s=getSettings();
    const MAX_STORED=s.maxSnapshots||0;
    if(MAX_STORED>0&&keys.length>MAX_STORED){
        const toRemove=keys.slice(0,keys.length-MAX_STORED);
        for(const k of toRemove)delete data.snapshots[String(k)];
        log('Pruned',toRemove.length,'old snapshots, keeping',MAX_STORED,
            '(wiki archive preserves all characters)');
    }
    SillyTavern.getContext().saveMetadata();
}

export function getSnapshotFor(id){return getTrackerData().snapshots?.[String(id)]??null}

export function getPrevSnapshot(id){const sorted=Object.keys(getTrackerData().snapshots).map(Number).sort((a,b)=>a-b);const p=sorted.filter(k=>k<id).pop();return p!=null?getTrackerData().snapshots[String(p)]:null}

// v6.13.0 (issue #15): schema/prompt now resolved through the active
// profile rather than directly off `s`. Existing legacy settings were
// migrated into a "Default" profile on first load, so behavior is
// preserved for users with custom schema/prompt overrides.

export function getActiveSchema(){
    const s=getSettings();
    if(migrateLegacySettingsToProfile(s)) saveSettings();
    // v6.16.2: also clean up shadowed root data (Panel C). Auto-runs once
    // post-upgrade; idempotent so re-entry is harmless.
    if(migrateOrphanRootData(s) > 0) saveSettings();
    const profile = getActiveProfile(s);
    // Build a "view" object that mirrors the legacy settings shape but
    // sources panels/fieldToggles/dashCards/customPanels from the profile.
    const sView = buildProfileView(s, profile);
    if (profile.schema) {
        try { return { name: profile.name || 'Custom', description: profile.description || '', strict: false, value: JSON.parse(profile.schema) }; }
        catch { /* fall through to dynamic build */ }
    }
    return { name: 'ScenePulse', description: 'Scene tracker.', strict: false, value: buildDynamicSchema(sView) };
}

export function getActivePrompt(opts){
    const s=getSettings();
    if(migrateLegacySettingsToProfile(s)) saveSettings();
    if(migrateOrphanRootData(s) > 0) saveSettings();
    const profile = getActiveProfile(s);
    // v6.18.0: route through the slot-aware assembler so per-slot overrides
    // in profile.promptOverrides take effect. Legacy profile.systemPrompt
    // (full-text override) still wins inside the assembler. Settings UI
    // preview and slash-command preview keep using buildDynamicPrompt(s)
    // (no profile) so they always render the slot defaults.
    const sView = buildProfileView(s, profile);
    return assemblePrompt(sView, profile, opts);
}

// Construct a settings-shaped view where panels/fieldToggles/dashCards
// come from the active profile but everything else comes from `s`. The
// dynamic builders read these fields by name; the cleanest path is to
// shadow them rather than refactor every call site in schema.js.
//
// customPanels in this view comes from the profile too — but the
// per-chat chatPanels override (chatMetadata.scenepulse.chatPanels)
// still wins via getActivePanels(). That preserves the "this chat's
// edits are local" semantics that have shipped since v6.9.14.
//
// v6.25.1: exported (was `_buildProfileView`) so the prompt editor's
// "Preview the assembled prompt" can construct a profile-projected view
// for in-progress draft slot edits. Pre-v6.25.1 the preview called
// assemblePrompt with raw root settings — post-v6.22.1 root.panels is
// permanently empty, so all panel-driven field-spec sections were
// silently dropped from the preview, leaving "## FIELD SPECIFICATIONS"
// with nothing under it. Same v6.23.4-class read-from-wrong-source bug.
export function buildProfileView(s, profile) {
    if (!profile) return s;
    return {
        ...s,
        panels: profile.panels && Object.keys(profile.panels).length ? profile.panels : s.panels,
        fieldToggles: profile.fieldToggles && Object.keys(profile.fieldToggles).length ? profile.fieldToggles : s.fieldToggles,
        dashCards: profile.dashCards && Object.keys(profile.dashCards).length ? profile.dashCards : s.dashCards,
        customPanels: Array.isArray(profile.customPanels) && profile.customPanels.length ? profile.customPanels : s.customPanels,
    };
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
