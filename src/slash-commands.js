// src/slash-commands.js — ScenePulse Slash Command Registration
// Registers /sp command with subcommands: status, regen, clear, toggle, export, debug

import { log, warn } from './logger.js';
import { t } from './i18n.js';
import { spConfirm } from './utils.js';
import { getSettings, saveSettings, getLatestSnapshot, getTrackerData, anyPanelsActive } from './settings.js';
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

    log('Slash commands registered: /sp, /sp-regen, /sp-status, /sp-clear, /sp-toggle, /sp-export, /sp-debug, /sp-help');
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
        case 'clear': return _spClear();
        case 'toggle': return _spToggle(args, rest);
        case 'export': return _spExport();
        case 'debug': return _spDebug();
        case '':
        case 'help':
            return _spHelp();
        default:
            return `Unknown subcommand: ${sub}. Use: status, regen, clear, toggle, export, debug`;
    }
}

// ── /sp help ──
function _spHelp() {
    return [
        `ScenePulse v${VERSION} — Slash Commands:`,
        '  /sp status — Show tracker state summary',
        '  /sp regen [section] — Regenerate tracker (optional: dashboard, scene, quests, relationships, characters, branches)',
        '  /sp clear — Clear all tracker data for this chat',
        '  /sp toggle <panel> — Toggle panel on/off',
        '  /sp export — Export tracker history as JSON',
        '  /sp debug — Show diagnostics',
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
        return [
            `ScenePulse v${VERSION}`,
            `Enabled: ${s.enabled ? 'Yes' : 'No'}`,
            `Mode: ${s.injectionMethod || 'inline'}${s.deltaMode ? ' (delta)' : ''}`,
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
    const tasks = norm.activeTasks?.filter(q => q.urgency !== 'resolved').length || 0;
    const meta = snap._spMeta || {};

    return [
        `ScenePulse v${VERSION} — Status`,
        `Mode: ${s.injectionMethod || 'inline'}${s.deltaMode ? ' (delta)' : ''} | Language: ${s.language || 'English'}`,
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
        `Quests: ${mainQ} main, ${sideQ} side, ${tasks} tasks`,
        `North Star: ${norm.northStar || 'Not revealed'}`,
        '',
        meta.elapsed ? `Last gen: ${meta.elapsed.toFixed(1)}s | ~${(meta.promptTokens || 0) + (meta.completionTokens || 0)} tokens | Source: ${meta.source || '?'}` : '',
    ].filter(Boolean).join('\n');
}

// ── /sp regen ──
async function _spRegen(args, value) {
    const section = (Array.isArray(value) ? value[0] : value || '').toString().trim().toLowerCase();

    if (!getSettings().enabled) return 'ScenePulse is disabled.';
    if (generating) return 'Generation already in progress.';
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
function _spToggle(args, value) {
    const rawPanel = (Array.isArray(value) ? value[0] : value || '').toString().trim();
    const panelLow = rawPanel.toLowerCase();
    const s = getSettings();

    if (!panelLow) {
        const status = Object.entries(s.panels || {}).map(([k, v]) => `  ${k}: ${v !== false ? 'ON' : 'OFF'}`).join('\n');
        return `ScenePulse panels:\n${status}\n\nUsage: /sp-toggle <panel>`;
    }

    // Case-insensitive match against BUILTIN_PANELS keys
    const validPanels = Object.keys(BUILTIN_PANELS);
    const panel = validPanels.find(k => k.toLowerCase() === panelLow);
    if (!panel) {
        return `Unknown panel: ${rawPanel}. Valid: ${validPanels.join(', ')}`;
    }

    if (!s.panels) s.panels = {};
    s.panels[panel] = s.panels[panel] === false ? true : false;
    saveSettings();

    // Refresh panel if we have data
    try {
        const snap = getLatestSnapshot();
        if (snap) {
            const norm = normalizeTracker(snap);
            import('./ui/update-panel.js').then(m => m.updatePanel?.(norm, true)).catch(() => {});
        }
    } catch {}

    log('Slash command: /sp toggle', panel, '→', s.panels[panel] ? 'ON' : 'OFF');
    return `${BUILTIN_PANELS[panel]?.name || panel}: ${s.panels[panel] ? 'ON' : 'OFF'}`;
}

// ── /sp export ──
function _spExport() {
    const data = getTrackerData();
    const snapshots = data.snapshots || {};
    const count = Object.keys(snapshots).length;
    if (!count) return 'No tracker data to export.';

    const s = getSettings();
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
        },
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
        `Snapshots: ${snapCount} / 30 max`,
        `Active panels: ${Object.entries(s.panels || {}).filter(([, v]) => v !== false).map(([k]) => k).join(', ')}`,
        `Custom panels: ${(s.customPanels || []).length}`,
        `Field toggles: ${Object.entries(s.fieldToggles || {}).filter(([, v]) => v === false).length} disabled`,
        '',
        snap ? `Latest snapshot keys: ${Object.keys(snap).filter(k => k !== '_spMeta').join(', ')}` : 'No snapshot data',
        snap?.characters ? `Characters: ${snap.characters.map(c => c.name).join(', ')}` : '',
        snap?.relationships ? `Relationships: ${snap.relationships.map(r => r.name).join(', ')}` : '',
        '',
        meta.source ? `Last gen: source=${meta.source} elapsed=${meta.elapsed?.toFixed(1)}s tokens=~${(meta.promptTokens || 0) + (meta.completionTokens || 0)}` : 'No generation metadata',
        `Schema: ${s.schema ? 'custom override' : 'dynamic (auto)'}`,
        `Prompt: ${s.systemPrompt ? 'custom override' : 'dynamic (auto)'}`,
        `Lorebook mode: ${s.lorebookMode || 'character_attached'}`,
    ].filter(l => l !== undefined).join('\n');
}
