// ScenePulse — Settings & Data Access Module
// Extracted from index.js lines 413-453, 786-895

import { MODULE_NAME, DEFAULTS } from './constants.js';
import { log, warn } from './logger.js';
import { esc } from './utils.js';
import { buildDynamicSchema, buildDynamicPrompt } from './schema.js';
import { t } from './i18n.js';

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
    return m.scenepulse;
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
