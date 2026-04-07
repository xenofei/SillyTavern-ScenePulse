// src/generation/pipeline.js — Shared extraction→normalize→save→updatePanel pipeline
// Eliminates duplication between index.js GENERATION_ENDED, message.js onCharMsg, and engine.js

import { log } from '../logger.js';
import {
    genMeta, lastGenSource,
    setCurrentSnapshotMesIdx, setLastGenSource, setLastRawResponse, setLastDeltaPayload,
    addSessionTokens, setLastDeltaSavings, _lastDeltaSavings
} from '../state.js';
import { getSettings, getLatestSnapshot, saveSnapshot, ensureChatSaved } from '../settings.js';
import { normalizeTracker } from '../normalize.js';
import { mergeDelta } from './delta-merge.js';
import { updatePanel } from '../ui/update-panel.js';
import { spPostGenShow, spSetGenerating } from '../ui/mobile.js';
import { addMesButton } from '../ui/message.js';
import { stopStreamingHider } from './streaming.js';
import { validateExtraction } from './validation.js';

/**
 * Process extracted tracker data through the full pipeline:
 * delta merge → normalize → log summary → attach metadata → save snapshot → update panel → save chat
 *
 * @param {number} mesIdx - Message index
 * @param {object} extracted - Raw extracted tracker data
 * @param {string} source - Generation source identifier (e.g., 'auto:together')
 * @param {object} opts - Options
 * @param {number} opts.promptTokens - Estimated prompt tokens
 * @param {number} opts.completionTokens - Estimated completion tokens
 * @param {number} opts.elapsed - Generation time in seconds
 * @param {boolean} opts.stopHider - Whether to stop the streaming hider
 * @param {boolean} opts.unlockGen - Whether to set generating=false
 * @returns {object|null} - Normalized tracker data, or null on failure
 */
export async function processExtraction(mesIdx, extracted, source, opts = {}) {
    const s = getSettings();
    const { promptTokens = 0, completionTokens = 0, elapsed = 0 } = opts;

    setLastGenSource(source);
    setLastRawResponse(JSON.stringify(extracted, null, 2));
    addSessionTokens(promptTokens + completionTokens);

    // Delta merge
    const prevSnap = getLatestSnapshot();
    if (s.deltaMode && prevSnap) {
        setLastDeltaPayload(extracted);
        const fullEstimate = Math.round(JSON.stringify(prevSnap).length / 4);
        if (fullEstimate > 0) {
            setLastDeltaSavings(Math.max(0, Math.round((1 - (completionTokens / fullEstimate)) * 100)));
        }
        extracted = mergeDelta(prevSnap, extracted);
        log('Pipeline: delta merge applied');
    } else {
        setLastDeltaPayload(null);
        setLastDeltaSavings(0);
    }

    // Validate against schema (warnings only, never rejects)
    const _warnings = validateExtraction(extracted);

    // Normalize
    const norm = normalizeTracker(extracted);
    setCurrentSnapshotMesIdx(mesIdx);

    // Attach validation warnings for Inspector
    if (_warnings.length) norm._validationWarnings = _warnings;

    // Log summary
    _logSummary(norm, source);

    // Attach metadata (persists per-snapshot for historical browsing)
    extracted._spMeta = {
        promptTokens,
        completionTokens,
        elapsed,
        source,
        injectionMethod: s.injectionMethod || 'inline',
        deltaSavings: _lastDeltaSavings || 0,
        deltaMode: !!s.deltaMode
    };

    // Save snapshot
    saveSnapshot(mesIdx, extracted);

    // Update panel
    updatePanel(norm);
    spPostGenShow();

    if (opts.stopHider) stopStreamingHider();
    if (opts.unlockGen) spSetGenerating(false);

    // Add message button
    const el = document.querySelector(`.mes[mesid="${mesIdx}"]`);
    if (el) addMesButton(el);

    // Save chat
    try {
        await ensureChatSaved();
        log('Pipeline: chat saved for mesIdx=', mesIdx);
    } catch (e) {
        log('Pipeline: chat save failed:', e?.message);
    }

    return norm;
}

function _logSummary(norm, source) {
    log('=== PIPELINE SUMMARY === source=', source);
    log('  chars:', norm.characters?.length || 0, 'rels:', norm.relationships?.length || 0);
    log('  quests: main=', norm.mainQuests?.length || 0, 'side=', norm.sideQuests?.length || 0);
    log('  ideas:', norm.plotBranches?.length || 0, 'northStar:', JSON.stringify(norm.northStar || '').substring(0, 50));
    log('  scene: topic=' + (norm.sceneTopic ? '✓' : '✗'), 'mood=' + (norm.sceneMood ? '✓' : '✗'), 'tension=' + (norm.sceneTension ? '✓' : '✗'));
    if (norm.characters?.length) {
        for (const c of norm.characters) log('  char:', c.name, 'role=', c.role ? '✓' : '✗', 'thought=', c.innerThought ? '✓' : '✗');
    }
    if (norm.relationships?.length) {
        for (const r of norm.relationships) log('  rel:', r.name, 'aff=', r.affection, 'trust=', r.trust, 'desire=', r.desire, 'compat=', r.compatibility);
    }
}
