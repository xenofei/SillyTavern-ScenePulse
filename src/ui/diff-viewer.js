// ScenePulse — Payload Diff Viewer
// Shows previous vs current snapshot with green/red line-level diff

import { log } from '../logger.js';
import { esc } from '../utils.js';
import { getSnapshotFor, getPrevSnapshot, getSettings } from '../settings.js';
import { currentSnapshotMesIdx, lastDeltaPayload } from '../state.js';

/**
 * Open the diff viewer overlay for a given snapshot message index.
 * Shows: previous snapshot (input) vs current snapshot (output) with line diff.
 */
export function openDiffViewer(mesIdx) {
    // Close any existing viewer
    closeDiffViewer();

    const current = getSnapshotFor(mesIdx);
    if (!current) { log('DiffViewer: no snapshot for mesIdx=', mesIdx); return; }
    const previous = getPrevSnapshot(mesIdx);

    const currentJson = formatJson(current);
    const previousJson = previous ? formatJson(previous) : null;
    const s = getSettings();
    const deltaJson = (s.deltaMode && lastDeltaPayload) ? formatJson(lastDeltaPayload) : null;

    // Build overlay
    const overlay = document.createElement('div');
    overlay.id = 'sp-diff-overlay';
    overlay.className = 'sp-diff-overlay';

    // Compute diff lines
    const diffResult = previousJson ? computeDiff(previousJson, currentJson) : null;

    overlay.innerHTML = `
        <div class="sp-diff-container">
            <div class="sp-diff-header">
                <span class="sp-diff-title">Payload Inspector</span>
                <span class="sp-diff-meta">Message #${mesIdx}${previous ? '' : ' (first snapshot — no previous)'}${deltaJson ? ' · Delta' : ''}</span>
                <span class="sp-diff-spacer"></span>
                ${diffResult ? `<button class="sp-diff-tab sp-diff-tab-active" data-tab="diff">Changes Only</button>
                <button class="sp-diff-tab" data-tab="full">Full Diff</button>
                <button class="sp-diff-tab" data-tab="side">Side by Side</button>
                ${deltaJson ? '<button class="sp-diff-tab" data-tab="delta">Delta Payload</button>' : ''}
                <button class="sp-diff-tab" data-tab="prev">Previous</button>
                <button class="sp-diff-tab" data-tab="curr">Current</button>` :
                `<button class="sp-diff-tab sp-diff-tab-active" data-tab="curr">Full Payload</button>
                ${deltaJson ? '<button class="sp-diff-tab" data-tab="delta">Delta Payload</button>' : ''}`}
                <button class="sp-diff-copy" title="Copy to clipboard">Copy</button>
            </div>
            <div class="sp-diff-body" id="sp-diff-body"></div>
        </div>
        <button class="sp-diff-close-float" title="Close">&times;</button>
    `;
    // Append to documentElement (not body) to escape SillyTavern's
    // body { position: fixed; overflow: hidden } at <=1000px viewports
    document.documentElement.appendChild(overlay);

    // Tab state
    let activeTab = diffResult ? 'diff' : 'curr';
    const body = overlay.querySelector('#sp-diff-body');

    function renderTab(tab) {
        activeTab = tab;
        overlay.querySelectorAll('.sp-diff-tab').forEach(t => t.classList.toggle('sp-diff-tab-active', t.dataset.tab === tab));
        switch (tab) {
            case 'diff':
                body.innerHTML = renderDiffHtml(diffResult);
                break;
            case 'full':
                body.innerHTML = renderFullDiffHtml(previousJson, currentJson);
                break;
            case 'side':
                body.innerHTML = renderSideBySideHtml(previousJson, currentJson);
                syncSideBySideScroll(body);
                break;
            case 'prev':
                body.innerHTML = `<pre class="sp-diff-pre">${esc(previousJson || '(none)')}</pre>`;
                break;
            case 'curr':
                body.innerHTML = `<pre class="sp-diff-pre">${esc(currentJson)}</pre>`;
                break;
            case 'delta':
                if (deltaJson) {
                    const deltaKeys = Object.keys(lastDeltaPayload || {}).filter(k => k !== '_spMeta').length;
                    body.innerHTML = `<div class="sp-diff-stats"><span class="sp-diff-stat-add">${deltaKeys} fields returned by LLM</span><span class="sp-diff-stat-same">(remaining fields carried forward from previous snapshot)</span></div><pre class="sp-diff-pre">${esc(deltaJson)}</pre>`;
                } else {
                    body.innerHTML = '<div class="sp-diff-empty">No delta payload — delta mode was not active for this generation</div>';
                }
                break;
        }
    }

    // Event handlers
    overlay.querySelectorAll('.sp-diff-tab').forEach(tab => {
        tab.addEventListener('click', () => renderTab(tab.dataset.tab));
    });
    overlay.querySelector('.sp-diff-close-float').addEventListener('click', closeDiffViewer);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeDiffViewer(); });
    overlay.querySelector('.sp-diff-copy').addEventListener('click', () => {
        let text;
        if (activeTab === 'diff' && diffResult) {
            text = diffResult.lines.map(l => `${l.type === 'add' ? '+' : l.type === 'del' ? '-' : ' '} ${l.text}`).join('\n');
        } else if ((activeTab === 'full' || activeTab === 'side') && previousJson) {
            text = `=== PREVIOUS ===\n${previousJson}\n\n=== CURRENT ===\n${currentJson}`;
        } else if (activeTab === 'delta' && deltaJson) {
            text = deltaJson;
        } else if (activeTab === 'prev') {
            text = previousJson || '(none)';
        } else {
            text = currentJson;
        }
        navigator.clipboard.writeText(text).then(() => {
            const btn = overlay.querySelector('.sp-diff-copy');
            btn.textContent = 'Copied!';
            setTimeout(() => btn.textContent = 'Copy', 1500);
        });
    });

    // Initial render
    renderTab(activeTab);
    requestAnimationFrame(() => overlay.classList.add('sp-diff-visible'));
    log('DiffViewer: opened for mesIdx=', mesIdx, 'hasPrev=', !!previous);
}

export function closeDiffViewer() {
    const existing = document.getElementById('sp-diff-overlay');
    if (existing) {
        existing.classList.remove('sp-diff-visible');
        setTimeout(() => existing.remove(), 200);
    }
}

// ── Helpers ──

function formatJson(obj) {
    const clean = { ...obj };
    delete clean._spMeta;
    delete clean._spNormalized;
    return JSON.stringify(clean, null, 2);
}

/**
 * Compute line-level diff between two JSON strings.
 * Returns { lines: [{type: 'same'|'add'|'del', text, lineNum}], stats: {added, removed, unchanged} }
 */
function computeDiff(prevText, currText) {
    const prevLines = prevText.split('\n');
    const currLines = currText.split('\n');

    // Simple LCS-based diff
    const lines = [];
    const stats = { added: 0, removed: 0, unchanged: 0 };

    // Build a set of prev lines with indices for fast lookup
    const prevSet = new Map();
    for (let i = 0; i < prevLines.length; i++) {
        const key = prevLines[i].trim();
        if (!prevSet.has(key)) prevSet.set(key, []);
        prevSet.get(key).push(i);
    }

    // Use a patience-style approach: match identical lines, diff the gaps
    const matched = new Set();
    const matchedPrev = new Set();

    // First pass: find exact matches in order
    let pi = 0;
    for (let ci = 0; ci < currLines.length; ci++) {
        const key = currLines[ci].trim();
        const candidates = prevSet.get(key);
        if (candidates) {
            for (const pidx of candidates) {
                if (pidx >= pi && !matchedPrev.has(pidx)) {
                    matched.add(ci);
                    matchedPrev.add(pidx);
                    pi = pidx + 1;
                    break;
                }
            }
        }
    }

    // Second pass: build output
    let prevIdx = 0;
    let currIdx = 0;

    while (prevIdx < prevLines.length || currIdx < currLines.length) {
        if (currIdx < currLines.length && matched.has(currIdx)) {
            // Emit any unmatched prev lines as deletions
            while (prevIdx < prevLines.length && !matchedPrev.has(prevIdx)) {
                lines.push({ type: 'del', text: prevLines[prevIdx], lineNum: prevIdx + 1 });
                stats.removed++;
                prevIdx++;
            }
            // Emit the matched line
            lines.push({ type: 'same', text: currLines[currIdx], lineNum: currIdx + 1 });
            stats.unchanged++;
            prevIdx++;
            currIdx++;
        } else if (currIdx < currLines.length && !matched.has(currIdx)) {
            // Check if next prev line is unmatched too
            if (prevIdx < prevLines.length && !matchedPrev.has(prevIdx)) {
                lines.push({ type: 'del', text: prevLines[prevIdx], lineNum: prevIdx + 1 });
                stats.removed++;
                prevIdx++;
                lines.push({ type: 'add', text: currLines[currIdx], lineNum: currIdx + 1 });
                stats.added++;
                currIdx++;
            } else {
                lines.push({ type: 'add', text: currLines[currIdx], lineNum: currIdx + 1 });
                stats.added++;
                currIdx++;
            }
        } else {
            // Remaining prev lines are deletions
            if (prevIdx < prevLines.length) {
                lines.push({ type: 'del', text: prevLines[prevIdx], lineNum: prevIdx + 1 });
                stats.removed++;
                prevIdx++;
            } else {
                break;
            }
        }
    }

    return { lines, stats };
}

function renderDiffHtml(diff) {
    if (!diff) return '<div class="sp-diff-empty">No previous snapshot to compare</div>';
    const { lines, stats } = diff;
    // Filter to only changed lines + 2 lines context
    const changedIndices = new Set();
    lines.forEach((l, i) => {
        if (l.type !== 'same') {
            for (let c = Math.max(0, i - 2); c <= Math.min(lines.length - 1, i + 2); c++) changedIndices.add(c);
        }
    });

    let html = `<div class="sp-diff-stats"><span class="sp-diff-stat-add">+${stats.added} added</span><span class="sp-diff-stat-del">-${stats.removed} removed</span><span class="sp-diff-stat-same">${stats.unchanged} unchanged</span></div>`;
    html += '<pre class="sp-diff-pre">';
    let lastShown = -1;
    for (let i = 0; i < lines.length; i++) {
        if (!changedIndices.has(i)) continue;
        if (lastShown >= 0 && i - lastShown > 1) {
            html += `<div class="sp-diff-sep">···</div>`;
        }
        const l = lines[i];
        const cls = l.type === 'add' ? 'sp-diff-line-add' : l.type === 'del' ? 'sp-diff-line-del' : 'sp-diff-line-same';
        const prefix = l.type === 'add' ? '+' : l.type === 'del' ? '-' : ' ';
        html += `<div class="${cls}"><span class="sp-diff-prefix">${prefix}</span>${esc(l.text)}</div>`;
        lastShown = i;
    }
    if (!changedIndices.size) html += '<div class="sp-diff-empty">No changes detected</div>';
    html += '</pre>';
    return html;
}

function renderSideBySideHtml(prevText, currText) {
    if (!prevText) return `<pre class="sp-diff-pre">${esc(currText)}</pre>`;
    const diff = computeDiff(prevText, currText);
    const prevLines = prevText.split('\n');
    const currLines = currText.split('\n');

    // Build aligned left/right arrays from diff output
    const left = [];  // previous
    const right = []; // current
    for (const l of diff.lines) {
        if (l.type === 'same') {
            left.push({ text: l.text, type: 'same' });
            right.push({ text: l.text, type: 'same' });
        } else if (l.type === 'del') {
            left.push({ text: l.text, type: 'del' });
            right.push({ text: '', type: 'pad' });
        } else if (l.type === 'add') {
            left.push({ text: '', type: 'pad' });
            right.push({ text: l.text, type: 'add' });
        }
    }
    // Collapse adjacent del+add pairs into side-by-side (remove padding)
    for (let i = 0; i < left.length - 1; i++) {
        if (left[i].type === 'del' && right[i].type === 'pad' &&
            left[i + 1].type === 'pad' && right[i + 1].type === 'add') {
            // Move the add up next to the del
            right[i] = right[i + 1];
            left.splice(i + 1, 1);
            right.splice(i + 1, 1);
        }
    }

    let html = `<div class="sp-diff-stats"><span class="sp-diff-stat-add">+${diff.stats.added} added</span><span class="sp-diff-stat-del">-${diff.stats.removed} removed</span><span class="sp-diff-stat-same">${diff.stats.unchanged} unchanged</span></div>`;
    html += '<div class="sp-diff-sbs"><div class="sp-diff-sbs-pane sp-diff-sbs-left" id="sp-diff-sbs-left"><div class="sp-diff-sbs-label">Previous</div><pre class="sp-diff-pre">';
    for (const l of left) {
        const cls = l.type === 'del' ? 'sp-diff-line-del' : l.type === 'pad' ? 'sp-diff-line-pad' : 'sp-diff-line-same';
        html += `<div class="${cls}">${l.text ? esc(l.text) : '&nbsp;'}</div>`;
    }
    html += '</pre></div><div class="sp-diff-sbs-pane sp-diff-sbs-right" id="sp-diff-sbs-right"><div class="sp-diff-sbs-label">Current</div><pre class="sp-diff-pre">';
    for (const l of right) {
        const cls = l.type === 'add' ? 'sp-diff-line-add' : l.type === 'pad' ? 'sp-diff-line-pad' : 'sp-diff-line-same';
        html += `<div class="${cls}">${l.text ? esc(l.text) : '&nbsp;'}</div>`;
    }
    html += '</pre></div></div>';
    return html;
}

function syncSideBySideScroll(body) {
    const left = body.querySelector('#sp-diff-sbs-left');
    const right = body.querySelector('#sp-diff-sbs-right');
    if (!left || !right) return;
    let syncing = false;
    const sync = (source, target) => {
        if (syncing) return;
        syncing = true;
        target.scrollTop = source.scrollTop;
        syncing = false;
    };
    left.addEventListener('scroll', () => sync(left, right));
    right.addEventListener('scroll', () => sync(right, left));
}

function renderFullDiffHtml(prevText, currText) {
    if (!prevText) return `<pre class="sp-diff-pre">${esc(currText)}</pre>`;
    const diff = computeDiff(prevText, currText);
    let html = `<div class="sp-diff-stats"><span class="sp-diff-stat-add">+${diff.stats.added} added</span><span class="sp-diff-stat-del">-${diff.stats.removed} removed</span><span class="sp-diff-stat-same">${diff.stats.unchanged} unchanged</span></div>`;
    html += '<pre class="sp-diff-pre">';
    for (const l of diff.lines) {
        const cls = l.type === 'add' ? 'sp-diff-line-add' : l.type === 'del' ? 'sp-diff-line-del' : 'sp-diff-line-same';
        const prefix = l.type === 'add' ? '+' : l.type === 'del' ? '-' : ' ';
        html += `<div class="${cls}"><span class="sp-diff-prefix">${prefix}</span>${esc(l.text)}</div>`;
    }
    html += '</pre>';
    return html;
}
