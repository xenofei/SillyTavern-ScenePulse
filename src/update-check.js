// ScenePulse — Update Checker
// Checks for updates via SillyTavern's extension version API

import { log, warn } from './logger.js';
import { EXTENSION_NAME } from './constants.js';

let _updateInfo = null;

/**
 * Check for updates via ST's /api/extensions/version endpoint.
 * Returns { branch, commit, isUpToDate, remoteUrl } or null on failure.
 */
export async function checkForUpdate() {
    try {
        // Use ST's getRequestHeaders() for auth — plain fetch returns 403 in multi-user mode
        let headers = { 'Content-Type': 'application/json' };
        try { const ctx = SillyTavern.getContext(); if (ctx.getRequestHeaders) headers = ctx.getRequestHeaders(); } catch {}
        const response = await fetch('/api/extensions/version', {
            method: 'POST',
            headers,
            body: JSON.stringify({ extensionName: EXTENSION_NAME, global: false }),
        });
        if (!response.ok) { if(response.status!==403)warn('Update check: HTTP', response.status); return null; }
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

/** Get cached update info (from last check). */
export function getUpdateInfo() { return _updateInfo; }

/**
 * Show update notification badge on the panel toolbar brand icon.
 */
export function showUpdateBadge() {
    if (!_updateInfo || _updateInfo.isUpToDate) return;
    const brand = document.getElementById('sp-brand-icon');
    if (!brand) return;
    let dot = brand.querySelector('.sp-update-dot');
    if (!dot) {
        dot = document.createElement('span');
        dot.className = 'sp-update-dot';
        dot.title = `Update available on ${_updateInfo.branch}`;
        brand.style.position = 'relative';
        brand.appendChild(dot);
    }
}
