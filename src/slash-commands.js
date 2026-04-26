// src/slash-commands.js — ScenePulse Slash Command Registration
// Registers /sp command with subcommands: status, regen, clear, toggle, export, debug

import { log, warn } from './logger.js';
import { t } from './i18n.js';
import { spConfirm } from './utils.js';
import { getSettings, saveSettings, getLatestSnapshot, getTrackerData, anyPanelsActive, forceFullStateRefresh, clearForceFullState } from './settings.js';
import { getActiveProfile, setActiveProfile } from './profiles.js';
import { normalizeTracker, clearNormCache } from './normalize.js';
import { generating } from './state.js';
import { BUILTIN_PANELS, VERSION } from './constants.js';

let _registered = false;

export function registerSlashCommands() {
    if (_registered) return;
    const ctx = SillyTavern.getContext();
    const SCP = ctx.SlashCommandParser;
    const SC = ctx.SlashCommand;
    const SA = ctx.SlashCommandArgument;
    const AT = ctx.ARGUMENT_TYPE;
    if (!SCP || !SC || !SA || !AT) {
        warn('SlashCommandParser not available — slash commands disabled');
        return;
    }
    _registered = true;

    // ── /sp — Main entry point with subcommands ──
    SCP.addCommandObject(SC.fromProps({
        name: 'sp',
        callback: _spMain,
        aliases: ['scenepulse'],
        helpString: 'ScenePulse commands. Subcommands: status, regen, clear, toggle, export, debug. Usage: /sp status',
        returns: 'string',
        unnamedArgumentList: [
            new SA('Subcommand: status | regen | clear | toggle | export | debug', [AT.STRING], false),
            new SA('Argument for subcommand (e.g., panel name for toggle, section for regen)', [AT.STRING], false),
        ],
        splitUnnamedArgument: true,
    }));

    // ── /sp-regen — Regenerate tracker (shortcut) ──
    SCP.addCommandObject(SC.fromProps({
        name: 'sp-regen',
        callback: _spRegen,
        helpString: 'Regenerate ScenePulse tracker. Optional: specify section (dashboard, scene, quests, relationships, characters, branches)',
        returns: 'string',
        unnamedArgumentList: [
            new SA('Section to regenerate (optional, omit for full)', [AT.STRING], false),
        ],
    }));

    // ── /sp-status — Show current tracker state ──
    SCP.addCommandObject(SC.fromProps({
        name: 'sp-status',
        callback: () => _spStatus(),
        helpString: 'Show ScenePulse tracker status summary',
        returns: 'string',
    }));

    // ── /sp-clear — Clear all tracker data ──
    SCP.addCommandObject(SC.fromProps({
        name: 'sp-clear',
        callback: () => _spClear(),
        helpString: 'Clear all ScenePulse tracker data for the current chat',
        returns: 'string',
    }));

    // ── /sp-toggle — Toggle panel visibility ──
    SCP.addCommandObject(SC.fromProps({
        name: 'sp-toggle',
        callback: (args, value) => _spToggle(args, value),
        helpString: 'Toggle a ScenePulse panel on/off. Panels: dashboard, scene, quests, relationships, characters, storyIdeas',
        returns: 'string',
        unnamedArgumentList: [
            new SA('Panel name to toggle', [AT.STRING], true),
        ],
    }));

    // ── /sp-export — Export tracker history ──
    SCP.addCommandObject(SC.fromProps({
        name: 'sp-export',
        callback: () => _spExport(),
        helpString: 'Export ScenePulse tracker history as JSON',
        returns: 'string',
    }));

    // ── /sp-debug — Dump debug info ──
    SCP.addCommandObject(SC.fromProps({
        name: 'sp-debug',
        callback: () => _spDebug(),
        helpString: 'Show ScenePulse debug diagnostics',
        returns: 'string',
    }));

    // ── /sp-help — Show help ──
    SCP.addCommandObject(SC.fromProps({
        name: 'sp-help',
        callback: () => _spHelp(),
        helpString: 'Show ScenePulse slash command help',
        returns: 'string',
    }));

    // ── /sp-refresh — Force a full-state regeneration (bypass delta mode) ──
    SCP.addCommandObject(SC.fromProps({
        name: 'sp-refresh',
        callback: _spRefresh,
        helpString: 'Force a full-state tracker regeneration, bypassing delta mode. Use when data seems stale or incorrect after many delta turns.',
        returns: 'string',
    }));

    // ── /sp-profile — List or switch profiles (v6.13.4 / issue #7) ──
    SCP.addCommandObject(SC.fromProps({
        name: 'sp-profile',
        callback: (args, value) => _spProfile(args, value),
        helpString: 'List ScenePulse profiles, or switch to one by name. Usage: /sp-profile (list) | /sp-profile <name>',
        returns: 'string',
        unnamedArgumentList: [
            new SA('Profile name to switch to (omit to list)', [AT.STRING], false),
        ],
    }));

    log('Slash commands registered: /sp, /sp-regen, /sp-status, /sp-clear, /sp-toggle, /sp-export, /sp-debug, /sp-help, /sp-refresh, /sp-profile');
}

// ── Main dispatcher for /sp <subcommand> ──
async function _spMain(args, value) {
    const parts = Array.isArray(value) ? value : (value || '').toString().split(/\s+/);
    const sub = (parts[0] || '').toLowerCase().trim();
    const rest = parts.slice(1).join(' ').trim();

    switch (sub) {
        case 'status': return _spStatus();
        case 'regen':
        case 'regenerate': return _spRegen(args, rest);
        case 'refresh': return _spRefresh();
        case 'clear': return _spClear();
        case 'toggle': return _spToggle(args, rest);
        case 'export': return _spExport();
        case 'debug': return _spDebug();
        case 'profile':
        case 'profiles': return _spProfile(args, rest);
        case '':
        case 'help':
            return _spHelp();
        default:
            return `Unknown subcommand: ${sub}. Use: status, regen, refresh, clear, toggle, export, debug, profile, help`;
    }
}

// ── /sp help ──
function _spHelp() {
    return [
        `ScenePulse v${VERSION} — Slash Commands:`,
        '  /sp status — Show tracker state summary',
        '  /sp regen [section] — Regenerate tracker (optional: dashboard, scene, quests, relationships, characters, branches)',
        '  /sp refresh — Force full-state regeneration (bypass delta mode, reset drift counter)',
        '  /sp clear — Clear all tracker data for this chat',
        '  /sp toggle <panel> — Toggle panel on/off (built-in or custom panel name; omit to list)',
        '  /sp profile [name] — List profiles, or switch to one by name',
        '  /sp export — Export tracker history + profiles as JSON',
        '  /sp debug — Show diagnostics',
        '  /sp help — Show this message',
        '',
        'Standalone shortcuts: /sp-status, /sp-regen, /sp-refresh, /sp-clear, /sp-toggle, /sp-profile, /sp-export, /sp-debug, /sp-help',
        'Aliases: /scenepulse <subcommand>',
    ].join('\n');
}

// ── /sp status ──
function _spStatus() {
    const s = getSettings();
    const snap = getLatestSnapshot();
    const data = getTrackerData();
    const snapCount = Object.keys(data.snapshots || {}).length;
    const enabledPanels = Object.entries(s.panels || {}).filter(([, v]) => v !== false).map(([k]) => k);

    if (!snap) {
        const apEmpty = getActiveProfile(s);
        return [
            `ScenePulse v${VERSION}`,
            `Enabled: ${s.enabled ? 'Yes' : 'No'}`,
            `Mode: ${s.injectionMethod || 'inline'}${s.deltaMode ? ' (delta)' : ''}`,
            `Profile: ${apEmpty?.name || '(none)'}`,
            `Panels: ${enabledPanels.join(', ') || 'none'}`,
            `Snapshots: ${snapCount}`,
            'No tracker data yet — send a message to generate.',
        ].join('\n');
    }

    const norm = normalizeTracker(snap);
    const chars = norm.characters?.map(c => c.name).join(', ') || 'none';
    const rels = norm.relationships?.map(r => `${r.name} (aff:${r.affection})`).join(', ') || 'none';
    const mainQ = norm.mainQuests?.filter(q => q.urgency !== 'resolved').length || 0;
    const sideQ = norm.sideQuests?.filter(q => q.urgency !== 'resolved').length || 0;
    const meta = snap._spMeta || {};

    const ap = getActiveProfile(s);
    return [
        `ScenePulse v${VERSION} — Status`,
        `Mode: ${s.injectionMethod || 'inline'}${s.deltaMode ? ' (delta)' : ''} | Language: ${s.language || 'English'}`,
        `Profile: ${ap?.name || '(none)'}${ap?.systemPrompt || ap?.schema ? ' (custom)' : ''}`,
        `Snapshots: ${snapCount} | Generating: ${generating ? 'Yes' : 'No'}`,
        '',
        `Time: ${norm.time || '?'} | Date: ${norm.date || '?'}`,
        `Location: ${norm.location || '?'}`,
        `Weather: ${norm.weather || '?'} | Temp: ${norm.temperature || '?'}`,
        `Mood: ${norm.sceneMood || '?'} | Tension: ${norm.sceneTension || '?'}`,
        `Topic: ${norm.sceneTopic || '?'}`,
        '',
        `Characters (${norm.characters?.length || 0}): ${chars}`,
        `Relationships (${norm.relationships?.length || 0}): ${rels}`,
        `Quests: ${mainQ} main, ${sideQ} side`,
        `North Star: ${norm.northStar || 'Not revealed'}`,
        '',
        meta.elapsed ? `Last gen: ${meta.elapsed.toFixed(1)}s | ~${(meta.promptTokens || 0) + (meta.completionTokens || 0)} tokens | Source: ${meta.source || '?'}` : '',
    ].filter(Boolean).join('\n');
}

// ── /sp regen ──
async function _spRegen(args, value) {
    const section = (Array.isArray(value) ? value[0] : value || '').toString().trim().toLowerCase();

    if (!getSettings().enabled) return 'ScenePulse is disabled.';
    if (generating) return 'Generation already in progress (likely an auto-fallback after the model omitted the tracker — these can take 30-120s). Click the ⟳ button in the panel to cancel and restart.';
    if (!anyPanelsActive()) return 'No panels are active.';

    // Lazy import to avoid circular dependency
    const { generateTracker } = await import('./generation/engine.js');
    const { addMesButton } = await import('./ui/message.js');
    const { updatePanel } = await import('./ui/update-panel.js');
    const { showPanel } = await import('./ui/panel.js');

    const { chat } = SillyTavern.getContext();
    let mesIdx = -1;
    for (let i = chat.length - 1; i >= 0; i--) {
        if (!chat[i].is_user) { mesIdx = i; break; }
    }
    if (mesIdx < 0) return 'No assistant message found to analyze.';

    const VALID_SECTIONS = { dashboard: 'dashboard', scene: 'scene', quests: 'quests', relationships: 'relationships', characters: 'characters', branches: 'branches', storyideas: 'branches' };
    const partKey = section ? VALID_SECTIONS[section] : null;
    if (section && !partKey) return `Unknown section: ${section}. Valid: ${Object.keys(VALID_SECTIONS).join(', ')}`;

    log('Slash command: /sp regen', partKey || '(full)', 'mesIdx=', mesIdx);
    const { setLastGenSource } = await import('./state.js');
    const { showLoadingOverlay, clearLoadingOverlay, showStopButton, hideStopButton, startElapsedTimer, stopElapsedTimer, showThoughtLoading, clearThoughtLoading } = await import('./ui/loading.js');
    const { spAutoShow } = await import('./ui/mobile.js');
    setLastGenSource('slash:regen');

    // Show loading animations
    const panel = document.getElementById('sp-panel');
    if (panel) { spAutoShow(); showLoadingOverlay(document.getElementById('sp-panel-body'), t('Generating Scene'), t('Analyzing context')); showStopButton(); startElapsedTimer(); }
    showThoughtLoading(t('Generating Scene'), t('Analyzing context'));

    const result = await generateTracker(mesIdx, partKey, {});

    // Cleanup animations
    hideStopButton(); stopElapsedTimer();
    clearLoadingOverlay(document.getElementById('sp-panel-body')); clearThoughtLoading();

    if (result) {
        showPanel();
        const el = document.querySelector(`.mes[mesid="${mesIdx}"]`);
        if (el) addMesButton(el);
        return `Tracker ${partKey ? `(${partKey}) ` : ''}regenerated for message #${mesIdx}.`;
    }
    return 'Generation failed — check SP debug log.';
}

// ── /sp refresh — v6.8.50: force a full-state regeneration ──
async function _spRefresh() {
    if (!getSettings().enabled) return 'ScenePulse is disabled.';
    if (generating) return 'Generation already in progress (likely an auto-fallback). Click the ⟳ button in the panel to cancel and restart.';
    if (!anyPanelsActive()) return 'No panels are active.';

    const s = getSettings();
    if (!s.deltaMode) return 'Delta mode is off — /sp-regen already produces a full-state output.';

    log('Slash command: /sp refresh — forcing full-state regeneration');
    forceFullStateRefresh();
    try {
        // Reuse the regen path — the forceFullState flag makes
        // shouldUseDelta() return false for this one generation
        // cycle, so the interceptor sends a full-state prompt
        // and the engine/pipeline skips the delta merge.
        const { generateTracker } = await import('./generation/engine.js');
        const { addMesButton } = await import('./ui/message.js');
        const { updatePanel } = await import('./ui/update-panel.js');
        const { showPanel } = await import('./ui/panel.js');
        const { setLastGenSource } = await import('./state.js');
        const { showLoadingOverlay, clearLoadingOverlay, showStopButton, hideStopButton, startElapsedTimer, stopElapsedTimer, showThoughtLoading, clearThoughtLoading } = await import('./ui/loading.js');
        const { spAutoShow } = await import('./ui/mobile.js');
        setLastGenSource('slash:refresh');

        const { chat } = SillyTavern.getContext();
        let mesIdx = -1;
        for (let i = chat.length - 1; i >= 0; i--) {
            if (!chat[i].is_user) { mesIdx = i; break; }
        }
        if (mesIdx < 0) { clearForceFullState(); return 'No assistant message found to analyze.'; }

        const panel = document.getElementById('sp-panel');
        if (panel) { spAutoShow(); showLoadingOverlay(document.getElementById('sp-panel-body'), t('Full Refresh'), t('Re-establishing ground truth')); showStopButton(); startElapsedTimer(); }
        showThoughtLoading(t('Full Refresh'), t('Re-establishing ground truth'));

        const result = await generateTracker(mesIdx, null, {});

        hideStopButton(); stopElapsedTimer();
        clearLoadingOverlay(document.getElementById('sp-panel-body')); clearThoughtLoading();

        if (result) {
            showPanel();
            const el = document.querySelector(`.mes[mesid="${mesIdx}"]`);
            if (el) addMesButton(el);
            return `Full-state refresh complete for message #${mesIdx}. Delta counter reset to 0.`;
        }
        return 'Full-state refresh failed — check SP debug log.';
    } finally {
        clearForceFullState();
    }
}

// ── /sp clear ──
async function _spClear() {
    const data = getTrackerData();
    const count = Object.keys(data.snapshots || {}).length;
    if (!count) return 'No tracker data to clear.';
    if (!await spConfirm(t('Clear Data'), t('Remove all tracker snapshots from this chat?') + ` (${count} snapshots)`)) return 'Cancelled.';

    data.snapshots = {};
    clearNormCache();
    try { SillyTavern.getContext().saveMetadata(); } catch (e) { warn('sp-clear save:', e); }

    // Clear panel
    try {
        const body = document.getElementById('sp-panel-body');
        if (body) body.innerHTML = '<div class="sp-empty-state"><div class="sp-empty-icon">📡</div><div class="sp-empty-title">No scene data yet</div><div class="sp-empty-sub">Tracker data cleared. Click <strong>⟳</strong> to regenerate.</div></div>';
        import('./ui/timeline.js').then(m => m.renderTimeline?.()).catch(() => {});
    } catch {}

    // Clear thoughts panel
    try {
        const tp = document.getElementById('sp-thought-panel');
        if (tp) { tp.classList.remove('sp-tp-visible'); const tpb = document.getElementById('sp-tp-body'); if (tpb) tpb.innerHTML = ''; }
        document.querySelectorAll('.sp-thoughts').forEach(el => el.remove());
    } catch {}

    log('Slash command: /sp clear —', count, 'snapshots removed');
    return `Cleared ${count} snapshots from tracker data.`;
}

// ── /sp toggle ──
// v6.13.4 (issue #7): also handles custom panels (per-chat). Built-in
// panels live on s.panels; custom panels live on chatMetadata.scenepulse
// .chatPanels (each with its own enabled flag). The matcher checks both
// lists case-insensitively before reporting Unknown.
function _spToggle(args, value) {
    const rawPanel = (Array.isArray(value) ? value[0] : value || '').toString().trim();
    const panelLow = rawPanel.toLowerCase();
    const s = getSettings();

    if (!panelLow) {
        const builtinStatus = Object.entries(s.panels || {})
            .map(([k, v]) => `  ${k}: ${v !== false ? 'ON' : 'OFF'}`)
            .join('\n');
        let customStatus = '';
        try {
            const cp = SillyTavern.getContext().chatMetadata?.scenepulse?.chatPanels || [];
            if (cp.length) {
                customStatus = '\nCustom panels (this chat):\n' + cp
                    .map(p => `  ${p.name}: ${p.enabled !== false ? 'ON' : 'OFF'}`)
                    .join('\n');
            }
        } catch {}
        return `ScenePulse panels:\n${builtinStatus}${customStatus}\n\nUsage: /sp-toggle <panel>`;
    }

    // 1. Try built-in panels (case-insensitive)
    const validPanels = Object.keys(BUILTIN_PANELS);
    const panel = validPanels.find(k => k.toLowerCase() === panelLow);
    if (panel) {
        if (!s.panels) s.panels = {};
        s.panels[panel] = s.panels[panel] === false ? true : false;
        saveSettings();
        try {
            const snap = getLatestSnapshot();
            if (snap) {
                const norm = normalizeTracker(snap);
                import('./ui/update-panel.js').then(m => m.updatePanel?.(norm, true)).catch(() => {});
            }
        } catch {}
        log('Slash command: /sp toggle (builtin)', panel, '→', s.panels[panel] ? 'ON' : 'OFF');
        return `${BUILTIN_PANELS[panel]?.name || panel}: ${s.panels[panel] ? 'ON' : 'OFF'}`;
    }

    // 2. Try custom panels in current chat (case-insensitive on name)
    try {
        const cm = SillyTavern.getContext().chatMetadata;
        const cp = cm?.scenepulse?.chatPanels || [];
        const target = cp.find(p => (p.name || '').toLowerCase() === panelLow);
        if (target) {
            target.enabled = target.enabled === false ? true : false;
            try { SillyTavern.getContext().saveMetadata(); } catch {}
            try {
                const snap = getLatestSnapshot();
                if (snap) {
                    const norm = normalizeTracker(snap);
                    import('./ui/update-panel.js').then(m => m.updatePanel?.(norm, true)).catch(() => {});
                }
            } catch {}
            log('Slash command: /sp toggle (custom)', target.name, '→', target.enabled ? 'ON' : 'OFF');
            return `${target.name} (custom): ${target.enabled ? 'ON' : 'OFF'}`;
        }
    } catch {}

    // 3. Not found
    let suggestions = validPanels.join(', ');
    try {
        const cp = SillyTavern.getContext().chatMetadata?.scenepulse?.chatPanels || [];
        if (cp.length) suggestions += `, ${cp.map(p => p.name).join(', ')}`;
    } catch {}
    return `Unknown panel: ${rawPanel}. Valid: ${suggestions}`;
}

// ── /sp export ──
function _spExport() {
    const data = getTrackerData();
    const snapshots = data.snapshots || {};
    const count = Object.keys(snapshots).length;
    if (!count) return 'No tracker data to export.';

    const s = getSettings();
    // v6.13.4 (issue #7): export now includes the active profile and the
    // full profile array so a shared export carries the prompt+schema
    // bundle that produced the snapshots. Per-chat panels also included
    // for parity with the in-app Export Config button.
    const ap = getActiveProfile(s);
    const exportData = {
        extension: 'ScenePulse',
        version: VERSION,
        exportedAt: new Date().toISOString(),
        settings: {
            injectionMethod: s.injectionMethod,
            deltaMode: s.deltaMode,
            language: s.language,
            panels: s.panels,
            customPanels: s.customPanels,
            profiles: s.profiles,
            activeProfileId: s.activeProfileId,
        },
        activeProfileName: ap?.name || null,
        chatPanels: (() => {
            try { return SillyTavern.getContext().chatMetadata?.scenepulse?.chatPanels || []; }
            catch { return []; }
        })(),
        snapshotCount: count,
        snapshots,
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scenepulse-export-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    log('Slash command: /sp export —', count, 'snapshots exported');
    return `Exported ${count} snapshots to file.`;
}

// ── /sp profile (v6.13.4 / issue #7) ──
// No arg → list profiles, marking the active one
// With arg → switch active profile by name (case-insensitive)
function _spProfile(args, value) {
    const s = getSettings();
    const profiles = Array.isArray(s.profiles) ? s.profiles : [];
    const ap = getActiveProfile(s);
    const target = (Array.isArray(value) ? value[0] : value || '').toString().trim();

    if (!target) {
        if (!profiles.length) return 'No profiles defined.';
        const lines = profiles.map(p => {
            const tags = [];
            if (p.systemPrompt) tags.push('custom prompt');
            if (p.schema) tags.push('custom schema');
            if (Array.isArray(p.customPanels) && p.customPanels.length) tags.push(`${p.customPanels.length} panels`);
            const tagStr = tags.length ? ` (${tags.join(', ')})` : '';
            const marker = ap && p.id === ap.id ? '* ' : '  ';
            return `${marker}${p.name}${tagStr}`;
        }).join('\n');
        return `ScenePulse profiles:\n${lines}\n\nUsage: /sp-profile <name>  (case-insensitive)`;
    }

    const targetLow = target.toLowerCase();
    const found = profiles.find(p => (p.name || '').toLowerCase() === targetLow);
    if (!found) {
        const available = profiles.map(p => p.name).join(', ');
        return `Unknown profile: "${target}". Available: ${available || '(none)'}`;
    }
    if (ap && found.id === ap.id) return `Already on profile: ${found.name}`;

    if (!setActiveProfile(s, found.id)) return `Failed to switch to ${found.name}.`;
    saveSettings();
    // Force-full regen on next turn — delta against a different schema
    // would be nonsensical. Mirrors the dropdown switcher in bind-ui.js.
    try { forceFullStateRefresh(); } catch {}
    log('Slash command: /sp profile →', found.name);
    return `Switched to profile: ${found.name}. Next generation will be a full refresh.`;
}

// ── /sp debug ──
function _spDebug() {
    const s = getSettings();
    const data = getTrackerData();
    const snap = getLatestSnapshot();
    const snapCount = Object.keys(data.snapshots || {}).length;
    const meta = snap?._spMeta || {};

    return [
        `ScenePulse v${VERSION} — Debug`,
        `Enabled: ${s.enabled} | Generating: ${generating}`,
        `Injection: ${s.injectionMethod || 'inline'} | Delta: ${s.deltaMode}`,
        `Prompt mode: ${s.promptMode || 'json'} | Context msgs: ${s.contextMessages}`,
        `Embed snapshots: ${s.embedSnapshots || 1} | Max retries: ${s.maxRetries}`,
        `Language: ${s.language || '(auto/English)'}`,
        `Font scale: ${s.fontScale || 1} | Show empty: ${s.showEmptyFields}`,
        `Connection profile: ${s.connectionProfile || '(default)'}`,
        `Chat preset: ${s.chatPreset || '(default)'}`,
        `Fallback: ${s.fallbackEnabled ? 'enabled' : 'disabled'} | Profile: ${s.fallbackProfile || '(none)'}`,
        '',
        `Snapshots: ${snapCount} / ${s.maxSnapshots > 0 ? s.maxSnapshots : '∞'}`,
        `Active panels: ${Object.entries(s.panels || {}).filter(([, v]) => v !== false).map(([k]) => k).join(', ')}`,
        `Custom panels: ${(s.customPanels || []).length}`,
        `Field toggles: ${Object.entries(s.fieldToggles || {}).filter(([, v]) => v === false).length} disabled`,
        '',
        snap ? `Latest snapshot keys: ${Object.keys(snap).filter(k => k !== '_spMeta').join(', ')}` : 'No snapshot data',
        snap?.characters ? `Characters: ${snap.characters.map(c => c.name).join(', ')}` : '',
        snap?.relationships ? `Relationships: ${snap.relationships.map(r => r.name).join(', ')}` : '',
        '',
        meta.source ? `Last gen: source=${meta.source} elapsed=${meta.elapsed?.toFixed(1)}s tokens=~${(meta.promptTokens || 0) + (meta.completionTokens || 0)}` : 'No generation metadata',
        `Active profile: ${getActiveProfile(s).name || '(unset)'}`,
        `Schema: ${getActiveProfile(s).schema ? 'custom override' : 'dynamic (auto)'}`,
        `Prompt: ${getActiveProfile(s).systemPrompt ? 'custom override' : 'dynamic (auto)'}`,
        `Lorebook mode: ${s.lorebookMode || 'character_attached'}`,
    ].filter(l => l !== undefined).join('\n');
}
