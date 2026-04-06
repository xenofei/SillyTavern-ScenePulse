// ScenePulse — Update Checker + One-Click Updater
// Checks for updates via SillyTavern's extension version API
// Shows a professional update banner with one-click install + reload

import { log, warn } from './logger.js';
import { EXTENSION_NAME } from './constants.js';
import { t } from './i18n.js';

let _updateInfo = null;

function _getHeaders() {
    let headers = { 'Content-Type': 'application/json' };
    try { const ctx = SillyTavern.getContext(); if (ctx.getRequestHeaders) headers = ctx.getRequestHeaders(); } catch {}
    return headers;
}

/**
 * Check for updates via ST's /api/extensions/version endpoint.
 */
export async function checkForUpdate() {
    try {
        const response = await fetch('/api/extensions/version', {
            method: 'POST',
            headers: _getHeaders(),
            body: JSON.stringify({ extensionName: EXTENSION_NAME, global: false }),
        });
        if (!response.ok) { warn('Update check: HTTP', response.status); return null; }
        const data = await response.json();
        _updateInfo = {
            branch: data.currentBranchName || 'unknown',
            commit: (data.currentCommitHash || '').substring(0, 7),
            isUpToDate: data.isUpToDate !== false,
            remoteUrl: data.remoteUrl || '',
        };
        log('Update check:', _updateInfo.branch, _updateInfo.commit, _updateInfo.isUpToDate ? 'up-to-date' : 'UPDATE AVAILABLE');
        return _updateInfo;
    } catch (e) {
        warn('Update check failed:', e?.message);
        return null;
    }
}

export function getUpdateInfo() { return _updateInfo; }

/**
 * Show pulsing dot on the brand icon.
 */
export function showUpdateBadge() {
    if (!_updateInfo || _updateInfo.isUpToDate) return;
    const wrap = document.getElementById('sp-brand-icon-wrap');
    if (!wrap) return;
    let dot = wrap.querySelector('.sp-update-dot');
    if (!dot) {
        dot = document.createElement('span');
        dot.className = 'sp-update-dot';
        wrap.appendChild(dot);
        // Click the wrapper to re-show the update banner
        wrap.style.cursor = 'pointer';
        wrap.addEventListener('click', _onBrandClick);
    }
}

function _onBrandClick(e) {
    const wrap = document.getElementById('sp-brand-icon-wrap');
    if (!wrap?.querySelector('.sp-update-dot')) return;
    const body = document.getElementById('sp-panel-body');
    if (body?.querySelector('.sp-update-banner')) return;
    e.stopPropagation();
    e.preventDefault();
    showUpdateBanner();
}

/**
 * Show a professional update banner inside the ScenePulse panel.
 */
export function showUpdateBanner() {
    if (!_updateInfo || _updateInfo.isUpToDate) return;
    const body = document.getElementById('sp-panel-body');
    if (!body) return;
    if (body.querySelector('.sp-update-banner')) return;

    const banner = document.createElement('div');
    banner.className = 'sp-update-banner';
    banner.innerHTML = `
        <div class="sp-update-banner-content">
            <div class="sp-update-banner-icon">
                <svg viewBox="0 0 20 20" width="18" height="18" fill="none">
                    <circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M10 5v6M10 13v1.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
            </div>
            <div class="sp-update-banner-text">
                <div class="sp-update-banner-title">${t('Update Available')}</div>
                <div class="sp-update-banner-sub">${t('A new version of ScenePulse is ready to install.')}</div>
            </div>
        </div>
        <div class="sp-update-banner-actions">
            <button class="sp-update-btn-install">${t('Update & Reload')}</button>
            <button class="sp-update-btn-dismiss">${t('Later')}</button>
        </div>
    `;

    // Install handler
    banner.querySelector('.sp-update-btn-install').addEventListener('click', async () => {
        const installBtn = banner.querySelector('.sp-update-btn-install');
        installBtn.disabled = true;
        installBtn.textContent = t('Updating...');
        banner.classList.add('sp-update-banner-installing');
        try {
            const resp = await fetch('/api/extensions/update', {
                method: 'POST',
                headers: _getHeaders(),
                body: JSON.stringify({ extensionName: EXTENSION_NAME, global: false }),
            });
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            const data = await resp.json();
            log('Update installed:', data.shortCommitHash);
            installBtn.textContent = t('Reloading...');
            banner.classList.remove('sp-update-banner-installing');
            banner.classList.add('sp-update-banner-success');
            setTimeout(() => location.reload(), 1000);
        } catch (e) {
            warn('Update failed:', e?.message);
            installBtn.textContent = t('Update Failed');
            installBtn.disabled = false;
            banner.classList.remove('sp-update-banner-installing');
            banner.classList.add('sp-update-banner-error');
            setTimeout(() => {
                installBtn.textContent = t('Retry');
                banner.classList.remove('sp-update-banner-error');
            }, 3000);
        }
    });

    // Dismiss handler
    banner.querySelector('.sp-update-btn-dismiss').addEventListener('click', () => {
        banner.classList.add('sp-update-banner-closing');
        setTimeout(() => banner.remove(), 300);
    });

    body.insertBefore(banner, body.firstChild);
}
