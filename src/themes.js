// src/themes.js — Theme presets system
// 6 themes that swap CSS custom properties on the panel root

import { log } from './logger.js';
import { t } from './i18n.js';

export const THEMES = {
    default: {
        name: 'Default',
        vars: {} // Uses variables.css defaults
    },
    midnight: {
        name: 'Midnight',
        vars: {
            '--sp-accent': '#7b8ef8',
            '--sp-accent-dim': 'rgba(123,142,248,0.12)',
            '--sp-accent-glow': 'rgba(123,142,248,0.35)',
            '--sp-bg': 'rgba(10,12,20,0.96)',
            '--sp-surface': 'rgba(18,22,38,0.92)',
            '--sp-surface-hover': 'rgba(28,34,56,0.95)',
            '--sp-border': 'rgba(60,70,120,0.25)',
            '--sp-text': '#b0b8d4',
            '--sp-text-dim': '#5a6490',
            '--sp-text-bright': '#d4d8f0',
            '--sp-amber': '#c49a5e',
            '--sp-green': '#5bc47a',
            '--sp-purple': '#a07af8',
        }
    },
    fantasy: {
        name: 'Fantasy',
        vars: {
            '--sp-accent': '#d4a050',
            '--sp-accent-dim': 'rgba(212,160,80,0.12)',
            '--sp-accent-glow': 'rgba(212,160,80,0.35)',
            '--sp-bg': 'rgba(22,18,14,0.96)',
            '--sp-surface': 'rgba(34,28,20,0.92)',
            '--sp-surface-hover': 'rgba(48,40,30,0.95)',
            '--sp-border': 'rgba(100,80,50,0.25)',
            '--sp-text': '#c8bea8',
            '--sp-text-dim': '#7a6e58',
            '--sp-text-bright': '#e8dcc8',
            '--sp-amber': '#d4915e',
            '--sp-green': '#8ab45a',
            '--sp-purple': '#b48a6a',
        }
    },
    cyberpunk: {
        name: 'Cyberpunk',
        vars: {
            '--sp-accent': '#00f0e0',
            '--sp-accent-dim': 'rgba(0,240,224,0.10)',
            '--sp-accent-glow': 'rgba(0,240,224,0.35)',
            '--sp-bg': 'rgba(8,8,16,0.97)',
            '--sp-surface': 'rgba(16,16,32,0.92)',
            '--sp-surface-hover': 'rgba(24,24,48,0.95)',
            '--sp-border': 'rgba(0,200,180,0.15)',
            '--sp-text': '#a0c8d4',
            '--sp-text-dim': '#4a6878',
            '--sp-text-bright': '#d0f0f8',
            '--sp-amber': '#f08030',
            '--sp-green': '#30f080',
            '--sp-purple': '#d050f0',
        }
    },
    minimal: {
        name: 'Minimal',
        vars: {
            '--sp-accent': '#888',
            '--sp-accent-dim': 'rgba(136,136,136,0.10)',
            '--sp-accent-glow': 'rgba(136,136,136,0.2)',
            '--sp-bg': 'rgba(16,16,18,0.96)',
            '--sp-surface': 'rgba(24,24,28,0.92)',
            '--sp-surface-hover': 'rgba(34,34,40,0.95)',
            '--sp-border': 'rgba(80,80,90,0.2)',
            '--sp-text': '#a0a0a8',
            '--sp-text-dim': '#606068',
            '--sp-text-bright': '#d0d0d8',
            '--sp-amber': '#b8a080',
            '--sp-green': '#80b890',
            '--sp-purple': '#a090b8',
        }
    }
};

/**
 * Apply a theme to the ScenePulse panel.
 * @param {string} themeId — key from THEMES
 */
export function applyTheme(themeId) {
    const theme = THEMES[themeId] || THEMES.default;

    // Remove old theme style element
    const oldStyle = document.getElementById('sp-theme-style');
    if (oldStyle) oldStyle.remove();

    if (themeId === 'default' || !theme.vars) {
        log('Theme applied: default (reset)');
        return;
    }

    // Inject <style> element with CSS variable overrides scoped to SP elements
    const varsCSS = Object.entries(theme.vars).map(([k, v]) => `${k}: ${v};`).join('\n    ');
    const style = document.createElement('style');
    style.id = 'sp-theme-style';
    style.textContent = `
#sp-panel, #sp-thought-panel, .sp-diff-overlay, .sp-confirm-overlay, .sp-graph-popup, .sp-loading-glass {
    ${varsCSS}
}`;
    document.head.appendChild(style);
    log('Theme applied:', themeId);
}

/**
 * Get list of available themes for settings UI.
 */
export function getThemeList() {
    return Object.entries(THEMES).map(([id, theme]) => ({
        id,
        name: t(theme.name),
    }));
}
