// src/ui/preset-suggestion-prompt.js — v6.27.3 styled "Apply X preset?" dialog
//
// Replaces the plain spConfirm() call inside preset-suggestion.js. Same
// rationale as the v6.27.1 OR-connector dialog: this is a feature-
// detection moment ("we recognized your model"), not a system warning,
// so it deserves a hero-icon dialog with chips, not a generic confirm
// box.
//
// Surfaces the preset's family + provider as badges, renders sampler
// hints inline when the preset has them, and explicitly tells the user
// what the apply mutation touches vs preserves. Returns Promise<boolean>.

import { esc } from '../utils.js';
import { t } from '../i18n.js';

let _activeOverlay = null;

function _samplerChips(hints) {
    if (!hints) return '';
    const NUMERIC = [
        ['temperature', 'temp'],
        ['top_p', 'top_p'],
        ['top_k', 'top_k'],
        ['min_p', 'min_p'],
        ['frequency_penalty', 'freq'],
        ['presence_penalty', 'pres'],
        ['repetition_penalty', 'rep'],
    ];
    const chips = [];
    for (const [key, label] of NUMERIC) {
        if (typeof hints[key] === 'number') {
            chips.push(`<span class="sp-psp-chip">${esc(label)} <strong>${esc(String(hints[key]))}</strong></span>`);
        }
    }
    if (!chips.length && !hints.guidance) return '';
    if (!chips.length && hints.guidance) {
        return `<div class="sp-psp-samplers sp-psp-samplers-guidance"><span class="sp-psp-sampler-label">${t('API note')}</span><span class="sp-psp-guidance">${esc(hints.guidance)}</span></div>`;
    }
    let out = `<div class="sp-psp-samplers"><span class="sp-psp-sampler-label">${t('Sampler hints')}</span><span class="sp-psp-chips">${chips.join('')}</span>`;
    if (hints.guidance) out += `<span class="sp-psp-guidance">${esc(hints.guidance)}</span>`;
    out += '</div>';
    return out;
}

/**
 * Show the styled "Apply X preset?" dialog. Returns Promise<boolean> —
 * true when the user picks "Apply preset", false on cancel/Escape/
 * backdrop-click.
 *
 * @param {object} preset            BUILT_IN_PRESETS entry
 * @param {string} [activeModelId]   Model id we matched against
 * @param {string} [activeProfileName]  Active profile's display name
 */
export function showPresetSuggestionPrompt(preset, activeModelId = '', activeProfileName = '') {
    if (_activeOverlay) { try { _activeOverlay.remove(); } catch {} _activeOverlay = null; }

    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'sp-confirm-overlay sp-psp-overlay';

        // Hero icon: a target reticle with a check, evokes "we matched
        // your model and verified it." Same visual register as the OR-
        // connector dialog (concentric rings, accent gradient).
        const heroSvg = `
            <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <defs>
                    <linearGradient id="sp-psp-grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                        <stop offset="0" stop-color="var(--sp-accent)"/>
                        <stop offset="1" stop-color="#7ad6c0"/>
                    </linearGradient>
                </defs>
                <circle cx="32" cy="32" r="22" stroke="url(#sp-psp-grad)" stroke-width="1.4" stroke-dasharray="3 3" opacity="0.6"/>
                <circle cx="32" cy="32" r="13" stroke="url(#sp-psp-grad)" stroke-width="1.4" opacity="0.85"/>
                <path d="M24 33 L30 39 L42 25" stroke="url(#sp-psp-grad)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
                <line x1="32" y1="6"  x2="32" y2="12" stroke="url(#sp-psp-grad)" stroke-width="1.2" stroke-linecap="round" opacity="0.6"/>
                <line x1="32" y1="52" x2="32" y2="58" stroke="url(#sp-psp-grad)" stroke-width="1.2" stroke-linecap="round" opacity="0.6"/>
                <line x1="6"  y1="32" x2="12" y2="32" stroke="url(#sp-psp-grad)" stroke-width="1.2" stroke-linecap="round" opacity="0.6"/>
                <line x1="52" y1="32" x2="58" y2="32" stroke="url(#sp-psp-grad)" stroke-width="1.2" stroke-linecap="round" opacity="0.6"/>
            </svg>`;

        const slotCount = Object.keys(preset.promptOverrides || {}).length;
        const slotList = slotCount
            ? Object.keys(preset.promptOverrides).join(', ')
            : '';

        const detectionLine = activeModelId
            ? t(`Detected <code>${esc(activeModelId)}</code> on your active connection.`)
            : t('Your active connection matches this bundled preset.');

        overlay.innerHTML = `
            <div class="sp-confirm-dialog sp-psp-dialog" role="dialog" aria-modal="true" aria-labelledby="sp-psp-title">
                <div class="sp-psp-hero">
                    <div class="sp-psp-hero-icon">${heroSvg}</div>
                    <div class="sp-psp-hero-eyebrow">${t('Model match detected')}</div>
                </div>
                <div class="sp-psp-body">
                    <h2 class="sp-psp-title" id="sp-psp-title">${t('Apply')} <span class="sp-psp-preset-name">${esc(preset.displayName)}</span> ${t('preset?')}</h2>
                    <div class="sp-psp-badges">
                        <span class="sp-psp-badge sp-psp-badge-family">${esc(preset.family || 'other')}</span>
                        <span class="sp-psp-badge sp-psp-badge-provider">${esc(preset.provider || 'other')}</span>
                        ${preset.contextWindow ? `<span class="sp-psp-badge sp-psp-badge-ctx">${(preset.contextWindow / 1000).toFixed(0)}K ${t('ctx')}</span>` : ''}
                    </div>
                    <p class="sp-psp-detect">${detectionLine}</p>
                    ${preset.notes ? `<p class="sp-psp-notes">${esc(preset.notes)}</p>` : ''}
                    ${_samplerChips(preset.samplerHints)}
                    <div class="sp-psp-effects">
                        <div class="sp-psp-effect sp-psp-effect-touch">
                            <div class="sp-psp-effect-head">${t('Will update')}</div>
                            <div class="sp-psp-effect-body">${slotCount ? t(`Prompt slots (${slotCount}): ${slotList}`) : t('System-prompt role only')}<br>${t('System-prompt role')}</div>
                        </div>
                        <div class="sp-psp-effect sp-psp-effect-keep">
                            <div class="sp-psp-effect-head">${t('Will preserve')}</div>
                            <div class="sp-psp-effect-body">${t('Panels, schema')}<br>${t('Custom panels, theme')}</div>
                        </div>
                    </div>
                    ${activeProfileName ? `<div class="sp-psp-footnote">${t('Applies to active profile: ')}<strong>${esc(activeProfileName)}</strong>. ${t('Reversible from the prompt editor.')}</div>` : ''}
                </div>
                <div class="sp-psp-actions">
                    <button class="sp-confirm-btn sp-confirm-cancel sp-psp-btn-cancel" type="button">${t('Not now')}</button>
                    <button class="sp-confirm-btn sp-confirm-ok-safe sp-psp-btn-ok" type="button">
                        <span class="sp-psp-btn-glyph">✦</span> ${t('Apply preset')}
                    </button>
                </div>
            </div>`;

        let _settled = false;
        const close = (result) => {
            if (_settled) return;
            _settled = true;
            overlay.classList.add('sp-confirm-closing');
            setTimeout(() => { try { overlay.remove(); } catch {} _activeOverlay = null; }, 200);
            document.removeEventListener('keydown', onKey, true);
            resolve(result);
        };
        const onKey = (e) => {
            if (e.key === 'Escape') { close(false); e.stopPropagation(); }
            else if (e.key === 'Enter') { close(true); e.stopPropagation(); }
        };
        overlay.querySelector('.sp-psp-btn-cancel').addEventListener('click', () => close(false));
        overlay.querySelector('.sp-psp-btn-ok').addEventListener('click', () => close(true));
        overlay.addEventListener('click', e => { if (e.target === overlay) close(false); });
        const stop = (e) => e.stopPropagation();
        overlay.addEventListener('mousedown', stop);
        overlay.addEventListener('pointerdown', stop);
        document.addEventListener('keydown', onKey, true);

        document.body.appendChild(overlay);
        _activeOverlay = overlay;
        requestAnimationFrame(() => overlay.classList.add('sp-confirm-visible'));
        overlay.querySelector('.sp-psp-btn-ok').focus();
    });
}
