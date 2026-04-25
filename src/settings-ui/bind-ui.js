// ScenePulse — Bind UI Module
// Extracted from index.js lines 5132-5368

import { MODULE_NAME, DEFAULTS, SP_LS_KEY } from '../constants.js';
import { log, warn, debugLog } from '../logger.js';
import { esc, clamp, spConfirm } from '../utils.js';
import { buildDynamicSchema, buildDynamicPrompt } from '../schema.js';
import { normalizeTracker } from '../normalize.js';
import {
    getSettings, saveSettings,
    getConnectionProfiles, getChatPresets, getLorebooks,
    getLatestSnapshot, getTrackerData,
    refreshLorebookDisplay, updateLorebookRec
} from '../settings.js';
import { genNonce, genMeta, setLastGenSource } from '../state.js';
import { getActiveProfile, updateActiveProfile, createProfile, duplicateProfile, renameProfile, deleteProfile, setActiveProfile, validateImportedProfile, importProfile, exportProfile, makeProfile, migrateLegacySettingsToProfile } from '../profiles.js';
import { updatePanel } from '../ui/update-panel.js';
import { hidePanel, _applyFontScale as _applyFontScaleFromUI, updateFeatBadge } from '../ui/panel.js';
import { updateThoughts } from '../ui/thoughts.js';
import { updateWeatherOverlay, clearWeatherOverlay } from '../ui/weather.js';
import { updateTimeTint, clearTimeTint } from '../ui/time-tint.js';
import { spAutoShow } from '../ui/mobile.js';
import { renderExisting } from '../ui/message.js';
import {
    showLoadingOverlay, clearLoadingOverlay,
    showThoughtLoading, clearThoughtLoading,
    showStopButton, hideStopButton,
    startElapsedTimer, stopElapsedTimer
} from '../ui/loading.js';
import { generateTracker } from '../generation/engine.js';
import { showSetupGuide } from './setup-guide.js';
import { startGuidedTour } from './guided-tour.js';
import { t, resetI18nCache, initI18n } from '../i18n.js';
import { createSettings } from './create-settings.js';

export function updateBadge(){const on=getSettings().enabled;const b=document.getElementById('sp-badge');if(b){b.className='sp-drawer-badge '+(on?'sp-on':'sp-off');b.innerHTML=`<span class="sp-drawer-badge-dot"></span>${on?t('Active'):t('Off')}`}}

function _syncFeatBadge(){try{updateFeatBadge()}catch(_){}}
export function loadUI(){const s=getSettings();$('#sp-enabled').prop('checked',s.enabled);$('#sp-auto-gen').prop('checked',s.autoGenerate);$('#sp-show-thoughts').prop('checked',s.showThoughts!==false);$('#sp-show-weather').prop('checked',s.weatherOverlay!==false);$('#sp-show-timetint').prop('checked',s.timeTint!==false);$('#sp-show-devbtns').prop('checked',s.devButtons===true);$('#sp-reduce-effects').prop('checked',s.reduceVisualEffects===true);if(s.reduceVisualEffects===true)document.body.classList.add('sp-reduce-effects');else document.body.classList.remove('sp-reduce-effects');$('#sp-function-tool').prop('checked',s.functionToolEnabled===true);$('#sp-font-scale').val(s.fontScale||1);$('#sp-font-scale-val').text((s.fontScale||1).toFixed(1)+'x');$('#sp-language').val(s.language||'');$('#sp-ctx').val(s.contextMessages);$('#sp-retries').val(s.maxRetries);$('#sp-mode').val(s.promptMode||'json');$('#sp-embed-n').val(s.embedSnapshots);$('#sp-embed-role').val(s.embedRole);$('#sp-lore-mode').val(s.lorebookMode||'character_attached');$('#sp-max-snapshots').val(s.maxSnapshots||0);
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
    $('#sp-thought-truncate').prop('checked',s.thoughtPanelTruncate===true);
    $('#sp-thought-fit').prop('checked',s.thoughtPanelFit===true);
    $('#sp-npc-graph').prop('checked',s.npcRelationshipGraph===true);
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
            log('Profile resolved ['+label+']:',val,'\u2192',match.id,'('+match.name+')');
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
    // v6.13.0 (issue #15): editor reads/writes go through the active
    // profile, not s.schema / s.systemPrompt directly.
    // v6.22.0: legacy #sp-sysprompt textarea was removed from the UI.
    // The prompt editor + preset browser are now the only paths. The
    // jQuery selector below is a safe no-op if the element is gone.
    const _activeProfile=getActiveProfile(s);
    const schemaStr=_activeProfile.schema||JSON.stringify(buildDynamicSchema(s),null,2);
    $('#sp-schema').val(schemaStr);
    updateBadge();$('#sp-lore-section').toggle(s.lorebookMode==='allowlist');$('#scenepulse-settings .inline-drawer-content').toggleClass('sp-disabled',!s.enabled);
    // Save resolved UUIDs back to localStorage (synchronous, immune to ST race conditions)
    _spSaveLS();
}

// ── localStorage helper for config persistence ──
// ST's extensionSettings save has race conditions with CHAT_CHANGED. localStorage is synchronous + reliable.
export function _spSaveLS(){
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

export function bindUI(){const s=getSettings();
    // Settings tab switching
    document.querySelectorAll('.sp-settings-tab').forEach(tab=>{
        tab.addEventListener('click',()=>{
            const target=tab.dataset.tab;if(!target)return;
            document.querySelectorAll('.sp-settings-tab').forEach(t=>t.classList.remove('sp-settings-tab-active'));
            document.querySelectorAll('.sp-tab-panel').forEach(p=>p.classList.remove('sp-tab-active'));
            tab.classList.add('sp-settings-tab-active');
            const panel=document.querySelector(`.sp-tab-panel[data-tab="${target}"]`);
            if(panel)panel.classList.add('sp-tab-active');
        });
    });
    $('#sp-enabled').on('change',function(){s.enabled=this.checked;saveSettings();updateBadge();$('#scenepulse-settings .inline-drawer-content').toggleClass('sp-disabled',!this.checked);if(!this.checked){hidePanel();const tp=document.getElementById('sp-thought-panel');if(tp)tp.classList.remove('sp-tp-visible')}else{renderExisting()}});
    $('#sp-auto-gen').on('change',function(){s.autoGenerate=this.checked;saveSettings()});
    // v6.9.2: delta mode toggle removed from UI — delta is now always
    // on (DEFAULTS.deltaMode: true since v6.9.0). The setting key still
    // exists in the settings object for backward compat (users who
    // explicitly set it to false before v6.9.0 keep their preference),
    // but it's no longer user-facing.
    $('#sp-function-tool').on('change',function(){s.functionToolEnabled=this.checked;saveSettings();log('Function tool:',this.checked);
        import('../generation/function-tool.js').then(m=>m.refreshFunctionTool()).catch(e=>warn('Function tool refresh:',e));
    });
    $('#sp-injection-method').on('change',function(){s.injectionMethod=this.value;saveSettings();_spSaveLS();$('#sp-method-inline').toggle(this.value==='inline');$('#sp-method-separate').toggle(this.value!=='inline');$('#sp-embed-section').toggle(this.value!=='inline');$('#sp-separate-settings').toggle(this.value!=='inline');updateLorebookRec()});
    $('#sp-show-thoughts').on('change',function(){s.showThoughts=this.checked;saveSettings();_spSaveLS();const tp=document.getElementById('sp-thought-panel');if(tp){if(this.checked){const snap=getLatestSnapshot();if(snap)updateThoughts(normalizeTracker(snap))}else tp.classList.remove('sp-tp-visible')}});
    // v6.8.23: toggle thought panel truncation. Off by default (full
    // thought rendered). When on, sentences are sliced to a hash-stable
    // 1-3 count per thought for visual variety in the floating bubble.
    $('#sp-thought-truncate').on('change',function(){s.thoughtPanelTruncate=this.checked;saveSettings();const snap=getLatestSnapshot();if(snap)updateThoughts(normalizeTracker(snap))});
    // v6.8.38: auto-fit thought panel toggle. Off by default. When
    // enabled, autoFitThoughtPanel computes a --sp-tp-fit-scale CSS
    // custom property that shrinks every card dimension proportionally
    // so all characters fit on-screen without scrolling. Disabling
    // resets to the natural scrolling behavior.
    // v6.8.39: also update the header toggle button's active state so
    // the two UI controls stay in sync when toggled from either side.
    $('#sp-thought-fit').on('change',function(){
        s.thoughtPanelFit=this.checked;
        saveSettings();
        const headerBtn=document.querySelector('#sp-thought-panel .sp-tp-fit');
        if(headerBtn)headerBtn.classList.toggle('sp-tb-active',this.checked);
        const snap=getLatestSnapshot();
        if(snap)updateThoughts(normalizeTracker(snap));
    });
    // v6.8.27: toggle NPC↔NPC relationship graph feature. Off by default
    // — when enabled, exposes a "Generate NPC graph" button in the
    // Relationship Web overlay that triggers a separate LLM call to map
    // connections between tracked NPCs. Disabling clears any cached graph.
    $('#sp-npc-graph').on('change',function(){
        s.npcRelationshipGraph=this.checked;
        saveSettings();
        if(!this.checked){
            // Lazy-import to avoid loading the graph module on every UI rebuild
            import('../ui/relationship-graph.js').then(m=>m.clearCache?.()).catch(()=>{});
        }
    });
    $('#sp-show-weather').on('change',function(){s.weatherOverlay=this.checked;saveSettings();_spSaveLS();const cb=document.getElementById('sp-tb-weather');if(cb)cb.checked=this.checked;_syncFeatBadge();if(!this.checked)clearWeatherOverlay();else{const snap=getLatestSnapshot();if(snap){const n=normalizeTracker(snap);updateWeatherOverlay(n.weather)}}});
    $('#sp-show-timetint').on('change',function(){s.timeTint=this.checked;saveSettings();_spSaveLS();const cb=document.getElementById('sp-tb-timeTint');if(cb)cb.checked=this.checked;_syncFeatBadge();if(!this.checked)clearTimeTint();else{const snap=getLatestSnapshot();if(snap){const n=normalizeTracker(snap);updateTimeTint(n.time)}}});
    $('#sp-show-devbtns').on('change',function(){s.devButtons=this.checked;saveSettings();const dv=this.checked?'':'none';const dw=document.getElementById('sp-dev-wx-wrap');if(dw)dw.style.display=dv;const dt=document.getElementById('sp-dev-time-wrap');if(dt)dt.style.display=dv});
    $('#sp-reduce-effects').on('change',function(){
        s.reduceVisualEffects=this.checked;saveSettings();
        document.body.classList.toggle('sp-reduce-effects',this.checked);
        // Force a panel re-render so the WDM canvas init path re-runs and respects the new flag.
        const _snap=getLatestSnapshot();if(_snap)updatePanel(normalizeTracker(_snap));
    });
    $('#sp-font-scale').on('input',function(){const v=+this.value;s.fontScale=v;$('#sp-font-scale-val').text(v.toFixed(1)+'x');_applyFontScaleFromUI(v);saveSettings()});
    $('#sp-font-scale-reset').on('click',function(){s.fontScale=1;$('#sp-font-scale').val(1);$('#sp-font-scale-val').text('1.0x');_applyFontScaleFromUI(1);saveSettings()});
    $('#sp-language').on('change',async function(){s.language=this.value;saveSettings();resetI18nCache();await initI18n();log('Language:',this.value||'auto-detect');
        // Re-render panel with new language
        const snap=getLatestSnapshot();
        if(snap){const norm=normalizeTracker(snap);updatePanel(norm,true);updateThoughts(norm)}
        // Update toolbar tooltips
        const _tips={'sp-tb-regen':t('Regenerate all'),'sp-tb-panels':t('Panel Manager'),'sp-tb-toggle':t('Expand/Collapse sections'),'sp-tb-compact':t('Condense view'),'sp-tb-features':t('Feature toggles'),'sp-tb-edit':t('Toggle edit mode'),'sp-tb-empty':t('Show empty fields'),'sp-tb-minimize':t('Hide panel')};
        for(const[id,tip]of Object.entries(_tips)){const el=document.getElementById(id);if(el)el.title=tip}
        // Re-create settings panel with new language
        const old=document.getElementById('scenepulse-settings');if(old)old.remove();
        createSettings();loadUI();
    });
    // Theme selector
    $('#sp-theme').val(s.theme||'default');
    $('#sp-theme').on('change',function(){
        s.theme=this.value;saveSettings();
        import('../themes.js').then(m=>m.applyTheme(this.value)).catch(e=>warn('Theme apply:',e));
        log('Theme:',this.value);
    });
    $('#sp-ctx').on('change',function(){s.contextMessages=clamp(+this.value,1,30);saveSettings();_spSaveLS()});
    $('#sp-max-snapshots').on('change',function(){s.maxSnapshots=Math.max(0,Math.floor(+this.value||0));saveSettings();log('Max snapshots:',s.maxSnapshots||'unlimited')});
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
    // v6.22.0: #sp-sysprompt textarea + Reset/Copy handlers removed
    // (the legacy "full prompt override" UI was deleted from the prompts
    // tab). The prompt editor and preset browser cover every editable
    // surface now. Existing profile.systemPrompt values continue to work
    // — the assembler short-circuits to them and the prompt editor shows
    // a banner when one is set.
    $('#sp-schema').on('change',function(){
        const v=this.value.trim();const dynamicStr=JSON.stringify(buildDynamicSchema(s),null,2);
        if(v===dynamicStr){updateActiveProfile(s,{schema:null});saveSettings();return}
        if(v){try{JSON.parse(v);updateActiveProfile(s,{schema:v})}catch{toastr.error(t('Invalid JSON'));return}}
        else updateActiveProfile(s,{schema:null});
        saveSettings();
    });
    // Schema edit protection
    $('#sp-schema-unlock').on('click',function(){
        $('#sp-schema-locked').hide();$('#sp-schema-unlocked').show();
        // Pre-populate with current dynamic schema if no custom override exists
        const schemaEl=$('#sp-schema');
        if(!schemaEl.val()||schemaEl.val().trim()===''){
            const dynSchema=buildDynamicSchema(s);
            schemaEl.val(JSON.stringify(dynSchema,null,2));
        }
    });
    $('#sp-schema-lock').on('click',async function(){
        if(!await spConfirm(t('Lock Schema'),t('This will lock the schema editor and reset to the built-in default. Any custom schema changes will be permanently lost.')))return;
        updateActiveProfile(s,{schema:null});saveSettings();
        $('#sp-schema').val('');
        $('#sp-schema-unlocked').hide();$('#sp-schema-locked').show();
        toastr.info(t('Schema locked and reset to default'));
    });
    // v6.22.0: legacy sysprompt Default/Copy handlers removed (textarea gone).
    // v6.19.0: Edit Slots button — lazy-imports the prompt editor module
    // (saves the bundle weight on every settings load).
    $('#sp-sysprompt-edit-slots').on('click', async () => {
        try {
            const mod = await import('../ui/prompt-editor.js');
            mod.openPromptEditor();
        } catch (e) {
            try { toastr.error(t('Failed to open prompt editor: ') + (e?.message || String(e))); } catch {}
        }
    });
    // v6.21.0: Browse Presets button — lazy-imports the preset browser.
    $('#sp-sysprompt-browse-presets').on('click', async () => {
        try {
            const mod = await import('../ui/preset-browser.js');
            mod.openPresetBrowser();
        } catch (e) {
            try { toastr.error(t('Failed to open preset browser: ') + (e?.message || String(e))); } catch {}
        }
    });
    $('#sp-schema-default').on('click',()=>{updateActiveProfile(s,{schema:null});saveSettings();$('#sp-schema').val(JSON.stringify(buildDynamicSchema(s),null,2));toastr.info(t('Schema reset to default'))});
    $('#sp-schema-copy').on('click',()=>{navigator.clipboard.writeText($('#sp-schema').val());toastr.success(t('Schema copied'))});
    $('#sp-btn-refresh').on('click',()=>{
        const _rp=getConnectionProfiles(),_rpr=getChatPresets();
        let h='<option value="">(Current)</option>';for(const p of _rp)h+=`<option value="${esc(p.id)}">${esc(p.name)}</option>`;$('#sp-profile').html(h).val(s.connectionProfile||'');
        let pr='<option value="">(Built-in: ScenePulse GLM-5)</option>';for(const p of _rpr)pr+=`<option value="${esc(p.id)}">${esc(p.name)}</option>`;$('#sp-preset').html(pr).val(s.chatPreset||'');
        toastr.info(t('Profiles refreshed'));
    });
    $('#sp-btn-refresh-fb').on('click',()=>{
        const _rp=getConnectionProfiles(),_rpr=getChatPresets();
        let fh='<option value="">(Same as current)</option>';for(const p of _rp)fh+=`<option value="${esc(p.id)}">${esc(p.name)}</option>`;$('#sp-fallback-profile').html(fh).val(s.fallbackProfile||'');
        let fp='<option value="">(Built-in: ScenePulse GLM-5)</option>';for(const p of _rpr)fp+=`<option value="${esc(p.id)}">${esc(p.name)}</option>`;$('#sp-fallback-preset').html(fp).val(s.fallbackPreset||'');
        toastr.info(t('Fallback profiles refreshed'));
    });
    $('#sp-btn-refresh-lore').on('click',()=>{
        let lo='<option value="">(Select)</option>';for(const p of getLorebooks())lo+=`<option value="${esc(p.id)}">${esc(p.name)}</option>`;$('#sp-lore-sel').html(lo);
        refreshLorebookDisplay();updateLorebookRec();
        toastr.info(t('Lorebooks refreshed'));
    });
    $('#sp-lore-add').on('click',()=>{const sel=document.getElementById('sp-lore-sel');if(!sel?.value)return;const name=sel.selectedOptions[0]?.textContent?.trim();if(!name)return;if(!s.lorebookAllowlist)s.lorebookAllowlist=[];if(!s.lorebookAllowlist.includes(name)){s.lorebookAllowlist.push(name);saveSettings();renderLoreTags()}sel.value=''});
    $('#sp-btn-gen').on('click',async()=>{const{chat}=SillyTavern.getContext();if(!chat.length)return;toastr.info('Generating\u2026');
        const body=document.getElementById('sp-panel-body');
        showLoadingOverlay(body,t('Generating Scene'),t('From settings'));
        setLastGenSource('manual:settings');
        spAutoShow();showStopButton();startElapsedTimer();
        showThoughtLoading(t('Updating thoughts'),t('Analyzing context'));
        const preNonce=genNonce;
        const r=await generateTracker(chat.length-1);
        if(genNonce>preNonce+1){log('Settings gen: stale caller');return}
        hideStopButton();stopElapsedTimer();
        clearLoadingOverlay(body);clearThoughtLoading();
        if(r)toastr.success(t('Done'));
        else{toastr.error(t('Failed'));const snap=getLatestSnapshot();if(snap){const norm=normalizeTracker(snap);updatePanel(norm)}}});
    $('#sp-btn-clear').on('click',async()=>{
        if(!await spConfirm(t('Clear Data'),t('Remove all tracker snapshots from this chat? Your settings are preserved.')))return;
        getTrackerData().snapshots={};SillyTavern.getContext().saveMetadata();document.querySelectorAll('.sp-thoughts').forEach(e=>e.remove());const tp=document.getElementById('sp-thought-panel');if(tp)tp.classList.remove('sp-tp-visible');const body=document.getElementById('sp-panel-body');if(body)body.innerHTML='<div class="sp-empty-state"><div class="sp-empty-icon">\uD83D\uDCE1</div><div class="sp-empty-title">'+t('Data cleared')+'</div><div class="sp-empty-sub">Send a message or click <strong>\u27F3</strong> to generate.</div></div>';genMeta.promptTokens=0;genMeta.completionTokens=0;genMeta.elapsed=0;toastr.info(t('Cleared'));
    });
    $('#sp-btn-reset').on('click',async()=>{
        if(!await spConfirm(t('Reset Settings'),t('Reset all ScenePulse settings to defaults? Tracker data is preserved.')))return;
        SillyTavern.getContext().extensionSettings[MODULE_NAME]=structuredClone(DEFAULTS);saveSettings();try{localStorage.removeItem(SP_LS_KEY)}catch(e){}loadUI();toastr.info(t('Settings reset to defaults'));
    });
    // Config export/import
    $('#sp-btn-export-config').on('click',()=>{
        const s=getSettings();
        // Clean openSections: remove keys for deleted custom panels
        const _validSections=['scene','quests','relationships','characters','branches','env','plots'];
        const _cpNames=(s.customPanels||[]).map(cp=>'custom_'+cp.name?.replace(/\s+/g,'_').toLowerCase()).filter(Boolean);
        const _cleanOpen={};
        for(const[k,v]of Object.entries(s.openSections||{})){if(_validSections.includes(k)||_cpNames.includes(k))_cleanOpen[k]=v}
        const exportData={extension:'ScenePulse',version:'6.0.0',exportedAt:new Date().toISOString(),
            settings:{injectionMethod:s.injectionMethod,deltaMode:s.deltaMode,language:s.language,theme:s.theme,
                fontScale:s.fontScale,contextMessages:s.contextMessages,maxRetries:s.maxRetries,promptMode:s.promptMode,
                embedSnapshots:s.embedSnapshots,embedRole:s.embedRole,lorebookMode:s.lorebookMode,autoGenerate:s.autoGenerate,
                showThoughts:s.showThoughts,showEmptyFields:s.showEmptyFields,sceneTransitions:s.sceneTransitions,
                panels:{...DEFAULTS.panels,...s.panels},dashCards:{...DEFAULTS.dashCards,...s.dashCards},
                fieldToggles:s.fieldToggles,customPanels:s.customPanels||[],
                openSections:_cleanOpen}};
        const json=JSON.stringify(exportData,null,2);
        const blob=new Blob([json],{type:'application/json'});
        const url=URL.createObjectURL(blob);const a=document.createElement('a');
        a.href=url;a.download=`scenepulse-config-${Date.now()}.json`;
        document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
        toastr.success('Config exported');
    });
    $('#sp-btn-import-config').on('click',()=>document.getElementById('sp-import-file')?.click());
    $('#sp-import-file').on('change',async function(){
        const file=this.files?.[0];if(!file)return;this.value='';
        try{
            const text=await file.text();const data=JSON.parse(text);
            if(data.extension!=='ScenePulse'||!data.settings){toastr.error('Invalid ScenePulse config file');return}
            if(!await spConfirm('Import Config','Apply settings from this file? Your current settings will be overwritten.')){return}
            const s=getSettings();const imported=data.settings;
            for(const[k,v]of Object.entries(imported)){if(v!==undefined&&k in DEFAULTS)s[k]=v}
            saveSettings();loadUI();
            // Apply theme if changed
            if(imported.theme)import('../themes.js').then(m=>m.applyTheme(imported.theme)).catch(()=>{});
            toastr.success('Config imported from '+file.name);log('Config imported:',Object.keys(imported).join(', '));
        }catch(e){toastr.error('Failed to import: '+e?.message);warn('Import config:',e)}
    });
    // v6.12.8 (issue #13 follow-up): single Debug Inspector button replaces
    // SP Log / View Log / Last Response / Crash Log. Module is lazy-imported
    // so the viewer code isn't loaded until the user actually opens it.
    $('#sp-btn-debug-inspector').on('click',async()=>{
        try {
            const m = await import('../ui/debug-inspector.js');
            m.openDebugInspector();
        } catch (e) { warn('Debug inspector:', e?.message); }
    });
    // Initial crash count badge on the inspector button + v6.15.4 auto-open
    // signal: subscribe to crash-log changes so the badge updates live, AND
    // briefly flash the inspector button when a NEW error fires. v6.16.1
    // (Panel B audit): persistent dot until inspector opens (no timeout) +
    // tooltip showing unseen count.
    try {
        import('../crash-log.js').then(m => {
            const badge = document.getElementById('sp-crash-log-count');
            const btn = document.getElementById('sp-btn-debug-inspector');
            const _updateBadge = () => {
                const n = m.entryCount();
                if (badge) badge.textContent = n ? `(${n})` : '';
                if (btn) {
                    const unseen = m.unseenCount();
                    if (unseen > 0) {
                        btn.classList.add('sp-di-has-unseen');
                        btn.setAttribute('title', `${unseen} new ${unseen === 1 ? 'issue' : 'issues'} since last opened — click to inspect`);
                    } else {
                        btn.classList.remove('sp-di-has-unseen');
                        btn.removeAttribute('title');
                    }
                }
            };
            _updateBadge();
            m.addChangeListener(({ isNew }) => {
                _updateBadge();
                if (isNew && btn) {
                    btn.classList.remove('sp-di-flash');
                    requestAnimationFrame(() => btn.classList.add('sp-di-flash'));
                }
            });
        });
    } catch {}

    // v6.16.1: Ctrl+Shift+D opens the Debug Inspector from anywhere in ST.
    // Skip when typing in inputs/textareas so the shortcut doesn't hijack
    // text editing. Esc-to-close already works via the inspector's own handler.
    document.addEventListener('keydown', (e) => {
        if (!(e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd'))) return;
        const tgt = e.target;
        if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)) return;
        e.preventDefault();
        import('../ui/debug-inspector.js').then(m => m.openDebugInspector()).catch(() => {});
    });

    // ── v6.13.0 (issue #15): Profile manager UI wiring ──
    bindProfileUI(s);
}

// Render the profile dropdown + meta line. Called on init and after any
// CRUD action so the UI stays in sync with the profile array.
function renderProfileUI(){
    const s=getSettings();
    if(migrateLegacySettingsToProfile(s)) saveSettings();
    const sel=document.getElementById('sp-profile-active');
    const meta=document.getElementById('sp-profile-meta');
    if(!sel||!meta)return;
    const profiles=Array.isArray(s.profiles)?s.profiles:[];
    const active=getActiveProfile(s);
    sel.innerHTML='';
    for(const p of profiles){
        const opt=document.createElement('option');
        opt.value=p.id;opt.textContent=p.name;
        if(active&&p.id===active.id)opt.selected=true;
        sel.appendChild(opt);
    }
    if(active){
        const parts=[];
        if(active.systemPrompt)parts.push(t('custom prompt'));
        if(active.schema)parts.push(t('custom schema'));
        if(Array.isArray(active.customPanels)&&active.customPanels.length)parts.push(`${active.customPanels.length} ${t('custom panels')}`);
        const tag=parts.length?` · ${parts.join(' · ')}`:` · ${t('uses dynamic defaults')}`;
        meta.textContent=`${profiles.length} ${t('profile(s)')}${tag}`;
    } else {
        meta.textContent='';
    }
}

function bindProfileUI(s){
    renderProfileUI();
    $('#sp-profile-active').on('change',function(){
        const id=this.value;if(!setActiveProfile(s,id))return;
        saveSettings();
        // Force-full regen on next turn — delta against a different schema
        // would be nonsensical. The user can immediately re-generate to
        // see the new profile's output.
        try { import('../settings.js').then(m => m.forceFullStateRefresh && m.forceFullStateRefresh()); } catch {}
        // Re-render the schema/prompt textareas to reflect the new active profile
        loadUI();
        try { toastr.success(t('Switched to profile') + ': ' + (getActiveProfile(s).name || '')); } catch {}
    });
    $('#sp-profile-new').on('click',async()=>{
        const { spPrompt } = await import('../utils.js');
        const name = await spPrompt(
            t('Create new profile'),
            t('Give your new profile a name (e.g. "Medieval Fantasy" or "Pokemon"):'),
            { placeholder: t('Profile name'), value: 'New Profile',
              validate: v => v ? null : t('Name cannot be empty.') }
        );
        if (!name) return;
        const p=createProfile(s,{name});
        setActiveProfile(s,p.id);saveSettings();renderProfileUI();loadUI();
        try { toastr.success(t('Profile created') + ': ' + p.name); } catch {}
    });
    $('#sp-profile-duplicate').on('click',()=>{
        const active=getActiveProfile(s);if(!active)return;
        const dup=duplicateProfile(s,active.id);
        if(!dup)return;
        setActiveProfile(s,dup.id);saveSettings();renderProfileUI();loadUI();
        try { toastr.success(t('Profile duplicated') + ': ' + dup.name); } catch {}
    });
    $('#sp-profile-rename').on('click',async()=>{
        const active=getActiveProfile(s);if(!active)return;
        const { spPrompt } = await import('../utils.js');
        const newName = await spPrompt(
            t('Rename profile'),
            t('Enter a new name for') + ` "${active.name}":`,
            { value: active.name, placeholder: t('Profile name'),
              validate: v => v ? null : t('Name cannot be empty.') }
        );
        if (!newName) return;
        if(renameProfile(s,active.id,newName)){
            saveSettings();renderProfileUI();
            try { toastr.success(t('Profile renamed')); } catch {}
        }
    });
    $('#sp-profile-delete').on('click',async()=>{
        const active=getActiveProfile(s);if(!active)return;
        const profiles=Array.isArray(s.profiles)?s.profiles:[];
        if(profiles.length<=1){
            try { toastr.warning(t('Cannot delete the last profile.')); } catch {}
            return;
        }
        if(!await spConfirm(
            t('Delete profile?'),
            `"${active.name}" ` + t('will be permanently removed. This cannot be undone.'),
            { okLabel: t('Delete'), danger: true }
        ))return;
        const newActive=deleteProfile(s,active.id);
        if(newActive){saveSettings();renderProfileUI();loadUI();
            try { toastr.success(t('Profile deleted')); } catch {}
        }
    });
    $('#sp-profile-export').on('click',()=>{
        const active=getActiveProfile(s);if(!active)return;
        const payload=exportProfile(active);
        const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
        const url=URL.createObjectURL(blob);
        const safeName=(active.name||'profile').replace(/[^a-z0-9_-]+/gi,'_').toLowerCase();
        const a=document.createElement('a');a.href=url;a.download=`scenepulse-profile-${safeName}.json`;
        document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
        try { toastr.success(t('Profile exported')); } catch {}
    });
    $('#sp-profile-import').on('click',()=>document.getElementById('sp-profile-import-file')?.click());
    $('#sp-profile-import-file').on('change',async function(){
        const file=this.files?.[0];if(!file)return;this.value='';
        try{
            const text=await file.text();const raw=JSON.parse(text);
            const v=validateImportedProfile(raw);
            if(!v.ok){
                try { toastr.error(t('Invalid profile')+': '+v.errors.join('; ')); } catch {}
                return;
            }
            const imported=importProfile(s,v.profile);
            saveSettings();renderProfileUI();
            try { toastr.success(t('Profile imported')+': '+imported.name); } catch {}
        }catch(e){
            try { toastr.error(t('Failed to import profile')+': '+(e?.message||'')); } catch {}
            warn('Profile import:',e);
        }
    });
    $('#sp-profile-manage').on('click',async()=>{
        // Lazy-import the manager overlay (deeper-edit + bulk operations).
        try {
            const m = await import('./profiles-manager.js');
            m.openProfilesManager(()=>{renderProfileUI();loadUI();});
        } catch(e) { warn('Profile manager:', e?.message); }
    });
}

function renderLoreTags(){const s=getSettings();const c=document.getElementById('sp-lore-tags');if(!c)return;c.innerHTML='';for(const n of(s.lorebookAllowlist||[])){const tag=document.createElement('span');tag.className='sp-lore-tag';tag.innerHTML=`${esc(n)} <span class="sp-lore-tag-x" data-n="${esc(n)}">✕</span>`;tag.querySelector('.sp-lore-tag-x').addEventListener('click',function(){s.lorebookAllowlist=s.lorebookAllowlist.filter(x=>x!==this.dataset.n);saveSettings();renderLoreTags()});c.appendChild(tag)}}
