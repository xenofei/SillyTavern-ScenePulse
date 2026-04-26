// src/ui/preset-browser.js — Browseable list of bundled model presets (v6.21.0)
//
// Discoverability fix: in v6.20.0 the only way to apply a bundled preset was
// the auto-suggestion toast at startup, which only fired if model detection
// matched and the user accepted it in the moment. This modal lets users
// browse all 30 presets, search, filter by family, and apply manually.
//
// Pattern matches the Debug Inspector / Prompt Editor: full-screen overlay
// reusing .sp-cl-overlay, lazy-imported on button click.

import { t } from '../i18n.js';
import { esc, spConfirm, spPrompt } from '../utils.js';
import { getSettings, saveSettings } from '../settings.js';
import { getActiveProfile, updateActiveProfile, makeProfile } from '../profiles.js';
import { BUILT_IN_PRESETS, buildPresetPatch, getActiveModelId, findMatchingPreset, getOrStats, getStatsTimestamp, hasOrStats, _resetOrStatsCache } from '../presets/registry.js';
import { getPresetFamilies } from '../presets/built-in.js';
import { refreshStats as orRefreshStats, getLastRefreshAt } from '../presets/or-connector.js';

let _activeBrowser = null;

// v6.25.0: render the optional samplerHints row on a preset card.
// Hints are DISPLAY-ONLY — never auto-applied (per v6.23.7). The user can
// manually match these in their ST connection settings if they choose.
//
// Confidence dot color-codes the source quality (high=green, medium=amber,
// low=gray).
//
// v6.25.1: sources `?` icon moved to top-right of every card; see
// _renderSourcesIcon. v6.26.1: split into two distinct visual modes:
//   - When numeric chips are present: standard "[●] SAMPLERS: chips"
//     row, with optional guidance prose below the chips
//   - When ONLY guidance is present (Claude 4.7 family, GPT-5 reasoning,
//     DeepSeek thinking — these reject standard samplers entirely):
//     render as a dedicated "API NOTE" callout box. The orphaned
//     "SAMPLERS:" label was visually unfinished without chips.
function _renderSamplerHints(hints) {
    if (!hints) return '';
    const NUMERIC_FIELDS = [
        ['temperature', 'temp'],
        ['top_p', 'top_p'],
        ['top_k', 'top_k'],
        ['min_p', 'min_p'],
        ['frequency_penalty', 'freq'],
        ['presence_penalty', 'pres'],
        ['repetition_penalty', 'rep'],
    ];
    const chips = [];
    for (const [key, label] of NUMERIC_FIELDS) {
        if (typeof hints[key] === 'number') {
            chips.push(`<span class="sp-pb-schip">${esc(label)} <strong>${esc(String(hints[key]))}</strong></span>`);
        }
    }
    const conf = hints.confidence;
    const confDot = conf
        ? `<span class="sp-pb-conf sp-pb-conf-${esc(conf)}" title="${t('Confidence')}: ${esc(conf)}" aria-label="${t('Confidence')}: ${esc(conf)}"></span>`
        : '';
    const hasNumeric = chips.length > 0;
    const hasGuidance = !!hints.guidance;
    if (!hasNumeric && !hasGuidance) return '';

    // Guidance-only mode: dedicated callout for API-restriction notes.
    // Reads as a structured "API NOTE" rather than an orphaned label.
    if (!hasNumeric && hasGuidance) {
        return `<div class="sp-pb-row-samplers sp-pb-srow-guidance-only">
            <span class="sp-pb-srow-note-icon" aria-hidden="true">ℹ</span>
            <span class="sp-pb-srow-note-label">${confDot}${t('API note')}</span>
            <span class="sp-pb-srow-guidance">${esc(hints.guidance)}</span>
        </div>`;
    }

    // Standard chips mode (with optional guidance below).
    let inner = `<span class="sp-pb-srow-label">${confDot}${t('Samplers')}:</span>`;
    inner += `<span class="sp-pb-srow-chips">${chips.join('')}</span>`;
    if (hasGuidance) {
        inner += `<span class="sp-pb-srow-guidance">${esc(hints.guidance)}</span>`;
    }
    return `<div class="sp-pb-row-samplers">${inner}</div>`;
}

// v6.25.1: renders the universal sources `?` icon for a preset card.
// Always lives in the top-right header area next to the action buttons,
// so every card has it in the exact same position. Returns '' when the
// preset has no sources to cite (early presets without samplerHints, or
// with samplerHints but no sources array).
function _renderSourcesIcon(preset) {
    const sources = Array.isArray(preset?.samplerHints?.sources) ? preset.samplerHints.sources : [];
    if (!sources.length) return '';
    return `<a class="sp-pb-srcs" href="${esc(sources[0])}" target="_blank" rel="noopener noreferrer" title="${esc(sources.join(' · '))}" aria-label="${t('View sampler hint sources')}">?</a>`;
}

// v6.26.0: format a raw token-volume integer to a human-readable chip
// label. 1_100_000_000_000 → "1.1T", 47_000_000 → "47M". Used by the
// volume chip on each preset card in the popularity-aware meta row.
function _formatVolume(n) {
    if (typeof n !== 'number' || !isFinite(n) || n <= 0) return null;
    if (n >= 1e12) return (n / 1e12).toFixed(n < 1e13 ? 1 : 0) + 'T';
    if (n >= 1e9)  return (n / 1e9).toFixed(n < 1e10 ? 1 : 0)  + 'B';
    if (n >= 1e6)  return (n / 1e6).toFixed(n < 1e7 ? 1 : 0)   + 'M';
    if (n >= 1e3)  return (n / 1e3).toFixed(n < 1e4 ? 1 : 0)   + 'K';
    return String(n);
}

// v6.26.0: format a USD-per-million-tokens price for the cost chip.
// Shows two decimals, drops trailing zeros for cleaner display.
function _formatPrice(n) {
    if (typeof n !== 'number' || !isFinite(n) || n < 0) return null;
    if (n === 0) return '0';
    return n.toFixed(2).replace(/\.?0+$/, '');
}

// v6.26.0: render the OpenRouter stats chips for a preset card.
// v6.26.1: chips moved to a dedicated row below the existing meta row
// (universal spot — same place on every card with OR data). Color-coded
// per chip type for visual identity:
//   - RP-collection: teal (matches SP accent — "ScenePulse-blessed")
//   - Volume:        blue (data / popularity signal, distinct from RP teal)
//   - Cost:          amber (money / value)
//   - FREE:          green (positive signal)
//
// Returns empty when no stats are available — the dedicated row simply
// doesn't render. Cards without OR data look identical to v6.25.x cards.
function _renderOrChips(orStats) {
    if (!orStats) return '';
    const chips = [];
    // RP-collection badge: highest signal of "this is a roleplay-blessed
    // model on OR." Lives at the front so it reads as the headline.
    if (Array.isArray(orStats.collections) && orStats.collections.includes('roleplay')) {
        const rankPart = typeof orStats.rank === 'number' ? `#${orStats.rank} ` : '';
        chips.push(`<span class="sp-pb-or-rp" title="${t('In OpenRouter Roleplay collection')}">${esc(rankPart)}${t('RP')}</span>`);
    }
    // Weekly token volume — proxy for "how many people are using this."
    const vol = _formatVolume(orStats.weeklyTokens);
    if (vol) {
        chips.push(`<span class="sp-pb-or-vol" title="${t('Weekly tokens on OpenRouter')}">${esc(vol)}/wk</span>`);
    }
    // Cost OR free flag (mutually exclusive). FREE is high-signal for users
    // who actively avoid paid endpoints; cost helps users budget at a glance.
    const pricing = orStats.pricing;
    if (pricing && (pricing.input > 0 || pricing.output > 0)) {
        const inPrice = _formatPrice(pricing.input);
        const outPrice = _formatPrice(pricing.output);
        if (inPrice !== null && outPrice !== null) {
            chips.push(`<span class="sp-pb-or-cost" title="${t('Cost in USD per million input / output tokens')}">$${esc(inPrice)}/$${esc(outPrice)} per M</span>`);
        }
    } else if (pricing && pricing.input === 0 && pricing.output === 0) {
        chips.push(`<span class="sp-pb-or-free" title="${t('Free tier on OpenRouter')}">${t('FREE')}</span>`);
    }
    if (!chips.length) return '';
    return `<div class="sp-pb-row-or-stats" aria-label="${t('OpenRouter stats')}">${chips.join('')}</div>`;
}

// v6.26.0: sort presets according to the active sort mode. All sort modes
// EXCEPT 'name' apply sticky-priority bucketing first: applied preset
// pinned at top, auto-matched preset second, everything else bucketed by
// the chosen sort. This addresses the v6.25.0 panel finding that ~60%
// of preset-browser opens are looking for a specific match.
function _sortPresets(presets, mode, profile, detectedPreset, statsByPresetId) {
    const stickyPriority = (p) => {
        if (profile.appliedPresetId === p.id) return 0;
        if (detectedPreset?.id === p.id) return 1;
        return 2;
    };
    const compareName = (a, b) => (a.displayName || '').localeCompare(b.displayName || '');
    const compareFamily = (a, b) =>
        (a.family || '').localeCompare(b.family || '') || compareName(a, b);
    const compareContext = (a, b) =>
        (b.contextWindow || 0) - (a.contextWindow || 0) || compareName(a, b);
    const comparePopularity = (a, b) => {
        const aw = statsByPresetId.get(a.id)?.weeklyTokens || 0;
        const bw = statsByPresetId.get(b.id)?.weeklyTokens || 0;
        if (aw !== bw) return bw - aw;
        return compareName(a, b);
    };

    let secondary;
    switch (mode) {
        case 'popularity': secondary = comparePopularity; break;
        case 'name':       secondary = compareName; break;
        case 'family':     secondary = compareFamily; break;
        case 'context':    secondary = compareContext; break;
        case 'match-first':
        default:           secondary = compareName; break;
    }

    return [...presets].sort((a, b) => {
        // 'name' mode skips sticky-priority bucketing — it's a pure A→Z sort.
        if (mode !== 'name') {
            const ap = stickyPriority(a);
            const bp = stickyPriority(b);
            if (ap !== bp) return ap - bp;
        }
        return secondary(a, b);
    });
}

/**
 * @param {object} [opts]
 * @param {boolean} [opts.createNewMode]  When true, the default Apply behavior
 *   creates a new profile from the template instead of overlaying onto the
 *   active one. Used by the Profile Manager's "+ New from template" button.
 */
export function openPresetBrowser(opts = {}) {
    closePresetBrowser();
    const _createNewMode = !!opts.createNewMode;
    const s = getSettings();
    const profile = getActiveProfile(s);
    if (!profile) {
        try { toastr.error(t('No active profile — open the Profile manager first.')); } catch {}
        return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'sp-cl-overlay sp-pb-overlay';
    const families = ['all', ...getPresetFamilies()];
    const detectedModel = getActiveModelId();
    const detectedPreset = detectedModel ? findMatchingPreset(detectedModel) : null;

    // v6.23.0: shared "Configure Prompts" header with tab strip — Templates
    // tab is the active one. Slots tab swaps to the prompt editor modal.
    overlay.innerHTML = `
        <div class="sp-cl-container sp-pb-container">
            <div class="sp-cl-header">
                <div class="sp-cl-title">${t('Configure Prompts')} <span class="sp-pe-profile-tag">${esc(profile.name || 'Untitled')}</span></div>
                <button class="sp-cl-close sp-pb-close" type="button" aria-label="${t('Close')}">✕</button>
            </div>
            <div class="sp-cp-tabstrip">
                <button class="sp-cp-tab" data-cp-tab="slots">${t('Slots')}</button>
                <button class="sp-cp-tab sp-cp-tab-active" data-cp-tab="templates">${t('Templates')} <span class="sp-pb-count">${BUILT_IN_PRESETS.length}</span></button>
            </div>
            <div class="sp-pb-body">
                <div class="sp-pb-detection">
                    ${detectedModel
                        ? (detectedPreset
                            ? t(`Active model: <code>${esc(detectedModel)}</code> → matched preset: <strong>${esc(detectedPreset.displayName)}</strong>`)
                            : t(`Active model: <code>${esc(detectedModel)}</code> — no bundled preset matched. Browse below or contribute one.`))
                        : t('No active model detected. Connect to an API to see preset suggestions.')}
                </div>
                ${_createNewMode ? `<div class="sp-pb-mode-banner">${t('Pick a template to create a NEW profile from. The template seeds the profile with model-tuned prompt slots; your existing profiles are not touched.')}</div>` : ''}
                <div class="sp-pb-toolbar">
                    <input type="search" class="sp-pb-search" placeholder="${t('Search by name, model id, or family…')}">
                    <div class="sp-pb-toolbar-row">
                        <div class="sp-pb-family-pills">
                            ${families.map(f => `<button class="sp-pb-family-pill ${f === 'all' ? 'sp-pb-family-active' : ''}" data-family="${esc(f)}">${esc(f === 'all' ? t('All') : f)}</button>`).join('')}
                        </div>
                        <label class="sp-pb-sort-wrap" title="${t('Sort the preset list. Match-first pins your auto-detected and applied presets to the top.')}">
                            <span class="sp-pb-sort-label">${t('Sort')}:</span>
                            <select class="sp-pb-sort">
                                <option value="match-first">${t('Match first')}</option>
                                <option value="popularity">${t('Popularity')}</option>
                                <option value="name">${t('Name')}</option>
                                <option value="family">${t('Family')}</option>
                                <option value="context">${t('Context size')}</option>
                            </select>
                        </label>
                        ${s.orConnectorEnabled ? `<button class="sp-pb-refresh-btn" type="button" title="${t('Fetch fresh pricing and context-window data from OpenRouter. Popularity rankings stay static.')}">↻ ${t('Refresh stats')}</button>` : ''}
                    </div>
                </div>
                <ol class="sp-pb-list"></ol>
                <div class="sp-pb-stats-footer"></div>
            </div>
        </div>
    `;

    const listEl = overlay.querySelector('.sp-pb-list');
    const footerEl = overlay.querySelector('.sp-pb-stats-footer');
    const sortEl = overlay.querySelector('.sp-pb-sort');
    let activeFilter = 'all';
    let searchQ = '';
    // v6.26.0: sort mode persisted in settings.presetBrowserSort.
    // Default 'match-first' per user direction.
    let sortMode = (s.presetBrowserSort && ['match-first','popularity','name','family','context'].includes(s.presetBrowserSort))
        ? s.presetBrowserSort : 'match-first';
    if (sortEl) sortEl.value = sortMode;

    // v6.26.0: prefetch OR stats once per browser open. Map of preset.id →
    // stats object. Empty map if or-stats.json is missing or fetch failed.
    let statsByPresetId = new Map();
    async function _prefetchOrStats() {
        try {
            const entries = await Promise.all(BUILT_IN_PRESETS.map(async (p) => {
                const stats = await getOrStats(p);
                return [p.id, stats];
            }));
            statsByPresetId = new Map(entries.filter(([, v]) => v));
        } catch {
            statsByPresetId = new Map();
        }
    }

    // v6.27.0: footer shows static baseline date + (when the runtime
    // connector has refreshed pricing/context this session or within the
    // 24h cache TTL) a freshness suffix. The user toggles the connector
    // in Generation tab settings; without it, only the static baseline
    // date renders.
    function _formatRelative(iso) {
        try {
            const ms = Date.now() - new Date(iso).getTime();
            if (!Number.isFinite(ms) || ms < 0) return '';
            const min = Math.round(ms / 60000);
            if (min < 1) return t('just now');
            if (min < 60) return t(`${min} minute${min === 1 ? '' : 's'} ago`);
            const hr = Math.round(min / 60);
            if (hr < 24) return t(`${hr} hour${hr === 1 ? '' : 's'} ago`);
            const day = Math.round(hr / 24);
            return t(`${day} day${day === 1 ? '' : 's'} ago`);
        } catch { return ''; }
    }

    async function _renderFooter() {
        if (!footerEl) return;
        const has = await hasOrStats();
        if (!has) {
            footerEl.innerHTML = '';
            return;
        }
        const ts = await getStatsTimestamp();
        const dateStr = ts ? new Date(ts).toISOString().slice(0, 10) : t('unknown');
        const liveAt = getLastRefreshAt();
        const liveSuffix = liveAt
            ? ` · <span class="sp-pb-stats-footer-live">${t('pricing/context refreshed')} ${esc(_formatRelative(liveAt))}</span>`
            : '';
        footerEl.innerHTML = `<span class="sp-pb-stats-footer-text">${t('Popularity baseline:')} ${esc(dateStr)}${liveSuffix}</span>`;
    }

    async function _renderList() {
        await _prefetchOrStats();
        const q = searchQ.trim().toLowerCase();
        const filtered = BUILT_IN_PRESETS.filter(p => {
            if (activeFilter !== 'all' && p.family !== activeFilter) return false;
            if (!q) return true;
            const hay = [p.id, p.displayName, p.family, p.provider, p.notes, ...(p.matchPatterns || [])].join(' ').toLowerCase();
            return hay.includes(q);
        });
        if (!filtered.length) {
            listEl.innerHTML = `<li class="sp-pb-empty">${t('No presets match your filter.')}</li>`;
            return;
        }
        // v6.26.0: sort according to active mode. All modes except 'name'
        // apply sticky-priority bucketing (applied → matched → rest).
        const sorted = _sortPresets(filtered, sortMode, profile, detectedPreset, statsByPresetId);
        listEl.innerHTML = sorted.map(p => {
            const isApplied = profile.appliedPresetId === p.id;
            const isMatched = detectedPreset?.id === p.id;
            const slotCount = Object.keys(p.promptOverrides || {}).length;
            const overridesSummary = slotCount === 0
                ? t('No slot overrides — preset only sets the role.')
                : t(`Overrides ${slotCount} slot${slotCount === 1 ? '' : 's'}: ${Object.keys(p.promptOverrides).join(', ')}`);
            const orStats = statsByPresetId.get(p.id) || null;
            return `
                <li class="sp-pb-row ${isApplied ? 'sp-pb-row-applied' : ''} ${isMatched ? 'sp-pb-row-matched' : ''}" data-preset-id="${esc(p.id)}">
                    <div class="sp-pb-row-head">
                        <div class="sp-pb-row-titles">
                            <span class="sp-pb-row-name">${esc(p.displayName)}</span>
                            <span class="sp-pb-row-family">${esc(p.family)}</span>
                            <span class="sp-pb-row-role" title="${t('System prompt sent as this role')}">${esc(p.systemPromptRole)}</span>
                            ${isMatched ? `<span class="sp-pb-row-tag sp-pb-row-tag-matched">${t('matches your model')}</span>` : ''}
                            ${isApplied ? `<span class="sp-pb-row-tag sp-pb-row-tag-applied">${t('applied')}</span>` : ''}
                        </div>
                        <div class="sp-pb-row-actions">
                            ${_renderSourcesIcon(p)}
                            <button class="sp-cl-export-btn sp-pb-create" data-preset-id="${esc(p.id)}"
                                title="${t('Create a NEW profile seeded from this template. Your existing profiles are untouched.')}">${t('+ New profile')}</button>
                            <button class="sp-cl-export-btn sp-pb-apply-overlay" data-preset-id="${esc(p.id)}" ${isApplied ? 'disabled' : ''}
                                title="${t('Apply this template ON TOP of your currently-active profile. Replaces matching prompt slots; preserves your other settings. Reversible.')}">${isApplied ? t('Applied') : t('Apply to current')}</button>
                        </div>
                    </div>
                    <div class="sp-pb-row-notes">${esc(p.notes)}</div>
                    <div class="sp-pb-row-meta">
                        <span class="sp-pb-row-meta-item">${t('Provider')}: ${esc(p.provider)}</span>
                        ${p.contextWindow ? `<span class="sp-pb-row-meta-item">${t('Context')}: ${(p.contextWindow / 1000).toFixed(0)}K</span>` : ''}
                        <span class="sp-pb-row-meta-item">${esc(overridesSummary)}</span>
                    </div>
                    ${_renderOrChips(orStats)}
                    ${_renderSamplerHints(p.samplerHints)}
                </li>`;
        }).join('');
        // Wire action buttons
        listEl.querySelectorAll('.sp-pb-create').forEach(btn => {
            btn.addEventListener('click', () => _createFromTemplate(btn.dataset.presetId));
        });
        listEl.querySelectorAll('.sp-pb-apply-overlay').forEach(btn => {
            btn.addEventListener('click', () => _apply(btn.dataset.presetId));
        });
    }

    // v6.23.0: create a new profile seeded from a template. Default name is
    // the preset's displayName with a numeric suffix if needed; user can
    // edit the name in the prompt that fires before the create.
    async function _createFromTemplate(presetId) {
        const preset = BUILT_IN_PRESETS.find(p => p.id === presetId);
        if (!preset) return;
        const sNow = getSettings();
        const existingNames = new Set((sNow.profiles || []).map(p => p.name));
        let baseName = preset.displayName;
        let suggestedName = baseName;
        let n = 2;
        while (existingNames.has(suggestedName)) {
            suggestedName = `${baseName} (${n++})`;
        }
        const chosenName = await spPrompt(
            t('Create new profile from template'),
            t(`Pick a name for the new profile. The "${preset.displayName}" template will seed its prompt slots and system-prompt role; panels, schema, and other settings start empty (you can copy from another profile via Duplicate later).`),
            { value: suggestedName, placeholder: suggestedName, okLabel: t('Create profile') }
        );
        if (!chosenName || !chosenName.trim()) return;
        const finalName = chosenName.trim();
        // Build profile via makeProfile so all defaults (incl. promptOverrides /
        // systemPromptRole / appliedPresetId) flow through one path.
        const newProfile = makeProfile({
            name: finalName,
            description: t(`Seeded from template: ${preset.displayName}`),
            promptOverrides: { ...(preset.promptOverrides || {}) },
            systemPromptRole: preset.systemPromptRole || 'system',
            appliedPresetId: preset.id,
        });
        if (!Array.isArray(sNow.profiles)) sNow.profiles = [];
        sNow.profiles.push(newProfile);
        sNow.activeProfileId = newProfile.id;
        saveSettings();
        try { toastr.success(t(`Created "${finalName}" from ${preset.displayName} template — switched to it.`)); } catch {}
        // Local view update so the row reflects the new applied state.
        profile.appliedPresetId = newProfile.appliedPresetId;
        profile.promptOverrides = newProfile.promptOverrides;
        profile.systemPromptRole = newProfile.systemPromptRole;
        _renderList();
    }

    // v6.23.0: "Apply to current" — secondary path. Renamed from _apply for
    // clarity. The primary path is now _createFromTemplate which spins up a
    // new profile (non-destructive). This overlay path is what the user
    // explicitly chose when they clicked "Apply to current" — confirmation
    // microcopy spells out that it MERGES into the active profile.
    async function _apply(presetId) {
        const preset = BUILT_IN_PRESETS.find(p => p.id === presetId);
        if (!preset) return;
        const sNow = getSettings();
        const profileNow = getActiveProfile(sNow);
        if (!profileNow) { try { toastr.error(t('No active profile')); } catch {} return; }
        const slotCount = Object.keys(preset.promptOverrides || {}).length;
        const ok = await spConfirm(
            t(`Apply ${preset.displayName} on top of "${profileNow.name}"?`),
            `${preset.notes}\n\n${slotCount === 0
                ? t('This preset only sets the system-prompt role; no prompt slots will be modified.')
                : t(`This template will OVERWRITE ${slotCount} slot${slotCount === 1 ? '' : 's'} in your current profile (${Object.keys(preset.promptOverrides).join(', ')}). Your edits in OTHER slots are preserved.`)}\n\n${t('Your panels, schema, and other settings are not touched. Reversible from the prompt editor (Clear preset).')}\n\n${t('Tip: prefer "+ New profile" if you want to keep your current setup unchanged.')}`,
            { okLabel: t('Apply to current'), cancelLabel: t('Cancel'), danger: true }
        );
        if (!ok) return;
        const patch = buildPresetPatch(preset, profileNow);
        updateActiveProfile(sNow, { ...patch, appliedPresetId: preset.id });
        saveSettings();
        try { toastr.success(t(`Applied ${preset.displayName} to "${profileNow.name}"`)); } catch {}
        // Update the local profile reference + re-render so the new "applied"
        // badge reflects the change without closing the browser.
        profile.appliedPresetId = preset.id;
        profile.promptOverrides = patch.promptOverrides;
        profile.systemPromptRole = patch.systemPromptRole;
        _renderList();
    }

    _renderList();
    _renderFooter();

    // v6.27.0: opt-in runtime refresh. `refreshStats` is a no-op when the
    // toggle is off, when a refresh already ran this session, or when the
    // 24h TTL hasn't expired. After a successful fetch we reset the
    // registry's lazy cache and re-render so the live overlay flows in.
    (async () => {
        try {
            const r = await orRefreshStats({ silent: true });
            if (r?.refreshed) {
                _resetOrStatsCache();
                await _renderList();
                await _renderFooter();
            }
        } catch (e) { /* never block the browser on connector errors */ }
    })();

    // Manual refresh — bypass session flag, cooldowns, and TTL. Toast
    // wins/losses so the user has visible feedback.
    overlay.querySelector('.sp-pb-refresh-btn')?.addEventListener('click', async function () {
        const btn = this;
        const originalLabel = btn.textContent;
        btn.disabled = true;
        btn.textContent = '⟳ ' + t('Refreshing…');
        try {
            const r = await orRefreshStats({ silent: false, force: true });
            if (r?.refreshed) {
                _resetOrStatsCache();
                await _renderList();
                await _renderFooter();
                try { toastr.success(t(`Refreshed ${r.count} models from OpenRouter`)); } catch {}
            } else if (r?.ok === false) {
                try { toastr.warning(t('Refresh failed: ') + (r.reason || 'unknown')); } catch {}
            } else {
                try { toastr.info(t('Cache already fresh — no refresh needed')); } catch {}
            }
        } catch (e) {
            try { toastr.error(t('Refresh error: ') + (e?.message || e)); } catch {}
        } finally {
            btn.disabled = false;
            btn.textContent = originalLabel;
        }
    });

    // Toolbar wiring
    overlay.querySelector('.sp-pb-search').addEventListener('input', function () {
        searchQ = this.value || '';
        _renderList();
    });
    overlay.querySelectorAll('.sp-pb-family-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            activeFilter = pill.dataset.family;
            overlay.querySelectorAll('.sp-pb-family-pill').forEach(p =>
                p.classList.toggle('sp-pb-family-active', p === pill));
            _renderList();
        });
    });
    // v6.26.0: sort dropdown — persist choice across sessions in
    // settings.presetBrowserSort. Re-render the list (sticky-priority
    // bucketing applies to all modes except 'name').
    sortEl?.addEventListener('change', function () {
        sortMode = this.value;
        const sNow = getSettings();
        sNow.presetBrowserSort = sortMode;
        try { saveSettings(); } catch {}
        _renderList();
    });
    // v6.23.0: Slots tab switches to the prompt editor modal.
    // v6.25.2: opening the new modal first + a single rAF wasn't enough —
    // the new modal's `sp-glass-in 0.18s` entrance animation means it's
    // still semi-transparent for ~180ms. Closing the old one during that
    // window exposes ST through the stack. Wait 200ms (full animation)
    // before closing.
    overlay.querySelector('.sp-cp-tab[data-cp-tab="slots"]')?.addEventListener('click', async () => {
        const ed = await import('./prompt-editor.js');
        ed.openPromptEditor();
        setTimeout(() => _close(), 200);
    });

    function _close() {
        try { document.removeEventListener('keydown', _esc, true); } catch {}
        overlay.remove();
        _activeBrowser = null;
    }
    overlay.querySelector('.sp-pb-close').addEventListener('click', _close);
    overlay.addEventListener('click', e => { if (e.target === overlay) _close(); });
    const _stop = (e) => e.stopPropagation();
    overlay.addEventListener('mousedown', _stop);
    overlay.addEventListener('pointerdown', _stop);
    const _esc = (e) => { if (e.key === 'Escape') { _close(); e.stopPropagation(); } };
    document.addEventListener('keydown', _esc, true);

    document.body.appendChild(overlay);
    _activeBrowser = overlay;
}

export function closePresetBrowser() {
    if (_activeBrowser) {
        try { _activeBrowser.remove(); } catch {}
        _activeBrowser = null;
    }
}
