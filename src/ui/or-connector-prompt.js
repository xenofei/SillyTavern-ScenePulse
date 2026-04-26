// src/ui/or-connector-prompt.js — v6.27.1 one-time OR-connector opt-in dialog
//
// Replaces the plain spConfirm() prompt that fired once per upgrade. The
// generic confirm dialog read as a system warning; this one introduces a
// new feature, so it gets a richer presentation: gradient header, hero
// glyph, benefit bullets, footer microcopy, and clearly differentiated
// OK/cancel actions. Returns Promise<boolean>.
//
// Visual style cribs from existing ScenePulse modal patterns (sp-confirm
// overlay, accent gradient header from sp-cl-header, glass-in entrance).

import { esc } from '../utils.js';
import { t } from '../i18n.js';
import { mountOverlay } from './dialog-base.js';

let _activeOverlay = null;

export function showOrConnectorPrompt() {
    // Reuse spConfirm's dismiss-active-dialog convention so stacking can't happen.
    if (_activeOverlay) { try { _activeOverlay.remove(); } catch {} _activeOverlay = null; }

    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'sp-confirm-overlay sp-orc-overlay';

        // Inline SVG: stylized "pulse-on-network" glyph — ties the
        // ScenePulse mascot motif (concentric rings) to the connector
        // metaphor (signal arc reaching outward).
        const heroSvg = `
            <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <defs>
                    <linearGradient id="sp-orc-grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                        <stop offset="0" stop-color="var(--sp-accent)"/>
                        <stop offset="1" stop-color="#7ad6c0"/>
                    </linearGradient>
                </defs>
                <circle cx="32" cy="32" r="6" fill="url(#sp-orc-grad)"/>
                <circle cx="32" cy="32" r="13" stroke="url(#sp-orc-grad)" stroke-width="1.5" opacity="0.6"/>
                <circle cx="32" cy="32" r="22" stroke="url(#sp-orc-grad)" stroke-width="1.2" opacity="0.35"/>
                <circle cx="32" cy="32" r="30" stroke="url(#sp-orc-grad)" stroke-width="1" opacity="0.18"/>
                <path d="M44 14 L52 14 L52 22" stroke="url(#sp-orc-grad)" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M20 50 L12 50 L12 42" stroke="url(#sp-orc-grad)" stroke-width="1.5" stroke-linecap="round"/>
            </svg>`;

        overlay.innerHTML = `
            <div class="sp-confirm-dialog sp-orc-dialog" role="dialog" aria-modal="true" aria-labelledby="sp-orc-title">
                <div class="sp-orc-hero">
                    <div class="sp-orc-hero-icon">${heroSvg}</div>
                    <div class="sp-orc-hero-eyebrow">${t('Optional · model discovery')}</div>
                </div>
                <div class="sp-orc-body">
                    <h2 class="sp-orc-title" id="sp-orc-title">${t('See what else is out there')}</h2>
                    <p class="sp-orc-lede">${t('When you browse the preset templates, ScenePulse can surface live OpenRouter pricing, context windows, and roleplay popularity beside each model — so you spot alternatives at a glance.')}</p>
                    <ul class="sp-orc-bullets">
                        <li><span class="sp-orc-bullet-glyph">✓</span><span><strong>${t('Read-only by design')}</strong> — ${t('never touches your prompts, samplers, or generations')}</span></li>
                        <li><span class="sp-orc-bullet-glyph">⟳</span><span><strong>${t('One refresh per session')}</strong> — ${t('cached 24 hours locally')}</span></li>
                        <li><span class="sp-orc-bullet-glyph">↗</span><span><strong>${t('Public endpoint')}</strong> — ${t('no auth, no telemetry, ~30 KB')}</span></li>
                    </ul>
                    <div class="sp-orc-footnote">${t('Disable anytime under Settings → Generation. Your bundled prompt presets work the same either way.')}</div>
                </div>
                <div class="sp-orc-actions">
                    <button class="sp-confirm-btn sp-confirm-cancel sp-orc-btn-cancel" type="button">${t('Maybe later')}</button>
                    <button class="sp-confirm-btn sp-confirm-ok-safe sp-orc-btn-ok" type="button">
                        <span class="sp-orc-btn-glyph">↗</span> ${t('Enable')}
                    </button>
                </div>
            </div>`;

        // v6.27.12: lifecycle (ESC/backdrop/Enter, click-bubbling isolation,
        // CSS exit-class) delegated to mountOverlay. Resolution semantics
        // preserved: cancel/esc/backdrop → false; ok/enter → true. The OK
        // path resolves(true) before close so the explicit user-click
        // value wins over the default false in onClose.
        const handle = mountOverlay({
            root: overlay,
            closeOnEnter: true,
            onClose: (reason) => {
                _activeOverlay = null;
                resolve(reason === 'enter');
            },
        });
        overlay.querySelector('.sp-orc-btn-cancel').addEventListener('click', () => handle.close('manual'));
        overlay.querySelector('.sp-orc-btn-ok').addEventListener('click', () => { resolve(true); handle.close('manual'); });
        _activeOverlay = overlay;
        requestAnimationFrame(() => overlay.classList.add('sp-confirm-visible'));
        overlay.querySelector('.sp-orc-btn-ok').focus();
    });
}
