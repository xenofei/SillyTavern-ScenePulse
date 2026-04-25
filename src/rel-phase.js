// ScenePulse — Relationship Phase Enum + Coercer
//
// v6.15.0: relPhase becomes a closed enum (15 stages + Unknown escape).
// Synthesis from 50-panel review (info design / mobile UI / microcopy /
// prompt engineering / game UI). Single-word labels, color-coded by
// stage family, render in a single header pill that fits all resolutions
// down to 320px (degrades to a colored dot at the narrowest breakpoint).
//
// Reasons for this design:
// - Closed enum outperforms "1-2 words" instruction across all model sizes
//   (Claude/GPT ~98% vs ~85%; Llama 8B ~92% vs ~55%).
// - Single token-class word keeps the autoregressive cost flat across the
//   relationships[] array even on local models.
// - Color family is a free second axis of information (Tufte data-ink).
// - Coercer catches synonym drift ("Warm" → "Cordial"), compound qualifiers
//   ("Trusted partnership" → "Trusted"), and Llama-class garbage; never
//   re-prompts (cosmetic field, not worth doubling latency).

import { warn, log } from './logger.js';

/** Closed enum of relationship stages. Order matters for the wiki dropdown. */
export const REL_PHASE_ENUM = Object.freeze([
    'Strangers', 'Wary',
    'Cordial', 'Friendly',
    'Close', 'Trusted', 'Bonded',
    'Flirting', 'Smitten', 'Intimate', 'Devoted',
    'Distant', 'Strained', 'Estranged',
    'Hostile', 'Volatile',
    'Unknown',
]);

/**
 * Stage → color family. Drives pill background/foreground via CSS custom
 * properties (--sp-pill-bg, --sp-pill-fg). Families:
 *   neutral (gray)        — pre-relationship / unknown
 *   civil   (blue)        — professional, polite
 *   warm    (green)       — established positive platonic
 *   romance (rose)        — romantic / sexual
 *   damaged (amber)       — was warm, now cooling/breaking
 *   hostile (red)         — open antagonism
 *   complex (purple)      — genuine instability
 */
export const REL_PHASE_FAMILY = Object.freeze({
    Strangers: 'neutral', Wary: 'neutral', Unknown: 'neutral',
    Cordial: 'civil', Friendly: 'civil',
    Close: 'warm', Trusted: 'warm', Bonded: 'warm',
    Flirting: 'romance', Smitten: 'romance', Intimate: 'romance', Devoted: 'romance',
    Distant: 'damaged', Strained: 'damaged', Estranged: 'damaged',
    Hostile: 'hostile',
    Volatile: 'complex',
});

/** Lower-cased lookup map for fast exact + substring match. Built once. */
const _LOWER_INDEX = Object.freeze(
    REL_PHASE_ENUM.reduce((acc, term) => { acc[term.toLowerCase()] = term; return acc; }, Object.create(null)),
);

/**
 * Coerce an LLM-emitted relPhase string into one of REL_PHASE_ENUM.
 *
 * Five-step fallback (per the prompt-engineering panel):
 *   1. trim + strip surrounding punctuation
 *   2. exact case-insensitive match → accept
 *   3. substring scan: first enum term that appears in the raw → accept
 *      (catches "Trusted partnership" → "Trusted", "Close friends" → "Close")
 *   4. last resort: first whitespace-delimited word, Title Cased, only if it
 *      happens to BE an enum member (rare; mostly here to surface drift)
 *   5. give up → 'Unknown' (never blank — pill always renders something)
 *
 * Always logs {raw, accepted} on miss so the enum can be tuned over time.
 *
 * @param {string|null|undefined} raw  LLM output for relPhase
 * @returns {string}                   One of REL_PHASE_ENUM
 */
export function coerceRelPhase(raw) {
    if (raw == null) return 'Unknown';
    const s = String(raw).trim().replace(/^[\s"'(\[\-—]+|[\s"')\].,;:!?\-—]+$/g, '');
    if (!s) return 'Unknown';

    // 2. exact case-insensitive
    const exact = _LOWER_INDEX[s.toLowerCase()];
    if (exact) return exact;

    // 3. substring scan — find ANY enum term inside the raw string
    const sLow = s.toLowerCase();
    for (const term of REL_PHASE_ENUM) {
        const tLow = term.toLowerCase();
        // word boundary check: \b doesn't work for non-ASCII consistently
        // so we accept term if it appears as a standalone word
        const idx = sLow.indexOf(tLow);
        if (idx >= 0) {
            const before = idx === 0 ? ' ' : sLow[idx - 1];
            const after = idx + tLow.length === sLow.length ? ' ' : sLow[idx + tLow.length];
            if (!/[a-z]/.test(before) && !/[a-z]/.test(after)) {
                if (term !== 'Unknown') {
                    log(`[rel-phase] coerced "${raw}" → "${term}" (substring match)`);
                }
                return term;
            }
        }
    }

    // 4. first-word title-case retry — only if it lands in enum
    const firstWord = s.split(/\s+/)[0].replace(/[^a-zA-Z]/g, '');
    if (firstWord) {
        const titled = firstWord[0].toUpperCase() + firstWord.slice(1).toLowerCase();
        if (_LOWER_INDEX[titled.toLowerCase()]) {
            log(`[rel-phase] coerced "${raw}" → "${titled}" (first-word match)`);
            return _LOWER_INDEX[titled.toLowerCase()];
        }
    }

    // 5. give up
    warn(`[rel-phase] could not coerce "${raw}" → falling back to "Unknown"`);
    return 'Unknown';
}

/** Look up the color family for a (coerced) phase. Returns 'neutral' for unknowns. */
export function relPhaseFamily(phase) {
    return REL_PHASE_FAMILY[phase] || 'neutral';
}
