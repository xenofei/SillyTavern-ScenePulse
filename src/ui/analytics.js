// src/ui/analytics.js — Token Usage Analytics Panel
// Full-screen overlay with detailed generation statistics across all snapshots

import { log } from '../logger.js';
import { t } from '../i18n.js';
import { esc } from '../utils.js';
import { getTrackerData } from '../settings.js';
import { _sessionTokensUsed } from '../state.js';

/**
 * Open the analytics overlay showing per-snapshot and aggregate token stats.
 */
export function openAnalytics() {
    // Remove existing
    document.querySelectorAll('.sp-analytics-overlay').forEach(el => el.remove());

    const data = getTrackerData();
    const snapKeys = Object.keys(data.snapshots || {}).map(Number).sort((a, b) => a - b);

    // Collect per-snapshot stats
    const rows = [];
    let totalPrompt = 0, totalCompletion = 0, totalElapsed = 0;
    let totalDeltaSaved = 0, deltaCount = 0, fallbackCount = 0, togetherCount = 0, separateCount = 0;
    let minElapsed = Infinity, maxElapsed = 0;

    for (const key of snapKeys) {
        const snap = data.snapshots[String(key)];
        const meta = snap?._spMeta || {};
        const prompt = meta.promptTokens || 0;
        const completion = meta.completionTokens || 0;
        const elapsed = meta.elapsed || 0;
        const source = meta.source || '?';
        const injection = meta.injectionMethod || '?';
        const deltaSavings = meta.deltaSavings || 0;
        const isDelta = meta.deltaMode || false;

        totalPrompt += prompt;
        totalCompletion += completion;
        totalElapsed += elapsed;
        if (elapsed > 0 && elapsed < minElapsed) minElapsed = elapsed;
        if (elapsed > maxElapsed) maxElapsed = elapsed;
        if (deltaSavings > 0) { totalDeltaSaved += deltaSavings; deltaCount++; }
        if (source.includes('fallback')) fallbackCount++;
        if (source.includes('together') || injection === 'inline') togetherCount++;
        if (source.includes('separate') || injection === 'separate') separateCount++;

        rows.push({ key, prompt, completion, elapsed, source, injection, deltaSavings, isDelta });
    }

    const avgElapsed = rows.length > 0 ? (totalElapsed / rows.length) : 0;
    const avgDeltaSavings = deltaCount > 0 ? (totalDeltaSaved / deltaCount) : 0;
    const totalTokens = totalPrompt + totalCompletion;

    // Build overlay
    const overlay = document.createElement('div');
    overlay.className = 'sp-analytics-overlay';

    let html = `<div class="sp-analytics-container">
        <div class="sp-analytics-header">
            <span class="sp-analytics-title">${t('Token Usage Analytics')}</span>
            <button class="sp-analytics-close">✕</button>
        </div>

        <div class="sp-analytics-summary">
            <div class="sp-analytics-card">
                <div class="sp-analytics-card-value">${totalTokens.toLocaleString()}</div>
                <div class="sp-analytics-card-label">${t('Total Tokens')}</div>
            </div>
            <div class="sp-analytics-card">
                <div class="sp-analytics-card-value">${snapKeys.length}</div>
                <div class="sp-analytics-card-label">${t('Snapshots')}</div>
            </div>
            <div class="sp-analytics-card">
                <div class="sp-analytics-card-value">${avgElapsed.toFixed(1)}s</div>
                <div class="sp-analytics-card-label">${t('Avg Generation')}</div>
            </div>
            <div class="sp-analytics-card">
                <div class="sp-analytics-card-value">${totalElapsed.toFixed(0)}s</div>
                <div class="sp-analytics-card-label">${t('Total Time')}</div>
            </div>
            <div class="sp-analytics-card">
                <div class="sp-analytics-card-value">${_sessionTokensUsed.toLocaleString()}</div>
                <div class="sp-analytics-card-label">${t('Session Tokens')}</div>
            </div>
            <div class="sp-analytics-card">
                <div class="sp-analytics-card-value">${avgDeltaSavings > 0 ? '-' + Math.round(avgDeltaSavings) + '%' : 'N/A'}</div>
                <div class="sp-analytics-card-label">${t('Avg Delta Savings')}</div>
            </div>
        </div>

        <div class="sp-analytics-breakdown">
            <div class="sp-analytics-row sp-analytics-row-header">
                <span>${t('Source Breakdown')}</span>
            </div>
            <div class="sp-analytics-row">
                <span>${t('Together mode')}</span><span>${togetherCount}</span>
            </div>
            <div class="sp-analytics-row">
                <span>${t('Separate mode')}</span><span>${separateCount}</span>
            </div>
            <div class="sp-analytics-row">
                <span>${t('Fallback recoveries')}</span><span>${fallbackCount}</span>
            </div>
            <div class="sp-analytics-row">
                <span>${t('Fastest generation')}</span><span>${minElapsed < Infinity ? minElapsed.toFixed(1) + 's' : 'N/A'}</span>
            </div>
            <div class="sp-analytics-row">
                <span>${t('Slowest generation')}</span><span>${maxElapsed > 0 ? maxElapsed.toFixed(1) + 's' : 'N/A'}</span>
            </div>
            <div class="sp-analytics-row">
                <span>${t('Avg tokens per snapshot')}</span><span>${rows.length > 0 ? Math.round(totalTokens / rows.length).toLocaleString() : 'N/A'}</span>
            </div>
        </div>

        <div class="sp-analytics-table-wrap">
            <table class="sp-analytics-table">
                <thead><tr>
                    <th>#</th><th>${t('Tokens')}</th><th>${t('Time')}</th>
                    <th>${t('Source')}</th><th>${t('Delta')}</th>
                </tr></thead>
                <tbody>`;

    for (const row of rows) {
        const srcLabel = row.source.replace('auto:', '').replace('manual:', '');
        html += `<tr>
            <td>${row.key}</td>
            <td>${(row.prompt + row.completion).toLocaleString()}</td>
            <td>${row.elapsed > 0 ? row.elapsed.toFixed(1) + 's' : '—'}</td>
            <td><span class="sp-analytics-src ${row.source.includes('fallback') ? 'sp-analytics-src-warn' : ''}">${esc(srcLabel)}</span></td>
            <td>${row.deltaSavings > 0 ? '-' + row.deltaSavings + '%' : '—'}</td>
        </tr>`;
    }

    html += `</tbody></table></div></div>`;
    overlay.innerHTML = html;

    // Close handlers
    overlay.querySelector('.sp-analytics-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    const escHandler = (e) => { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', escHandler); } };
    document.addEventListener('keydown', escHandler);

    document.documentElement.appendChild(overlay);
    log('Analytics panel opened:', snapKeys.length, 'snapshots');
}
