// src/ui/sparklines.js — Relationship history sparkline renderer
// Mini canvas sparklines + full-screen SVG graph

import { getTrackerData } from '../settings.js';
import { t } from '../i18n.js';

const SPARK_W = 56;
const SPARK_H = 22;

const METER_COLORS = {
    affection: '#e87070',
    trust: '#5bc47a',
    desire: '#c47ab8',
    stress: '#d4915e',
    compatibility: '#5b8cc4',
};

/**
 * Gather meter history for a character across all snapshots.
 */
export function getMeterHistory(charName) {
    const data = getTrackerData();
    const snapKeys = Object.keys(data.snapshots || {}).map(Number).sort((a, b) => a - b);
    const history = { affection: [], trust: [], desire: [], stress: [], compatibility: [] };
    const nameLow = (charName || '').toLowerCase().trim();
    const nameFirst = nameLow.split(/\s/)[0];

    for (const key of snapKeys) {
        const snap = data.snapshots[String(key)];
        const rels = snap?.relationships;
        if (!Array.isArray(rels)) {
            for (const m of Object.keys(history)) history[m].push(null);
            continue;
        }
        const match = rels.find(r => {
            const rn = (r.name || '').toLowerCase().trim();
            return rn === nameLow || nameLow.startsWith(rn + ' ') || rn.startsWith(nameLow + ' ')
                || (nameFirst.length > 2 && rn.split(/\s/)[0] === nameFirst);
        });
        if (match) {
            for (const m of Object.keys(history)) {
                const val = match[m];
                history[m].push(typeof val === 'number' ? val : null);
            }
        } else {
            for (const m of Object.keys(history)) history[m].push(null);
        }
    }
    return history;
}

/**
 * Draw a mini sparkline on a canvas element.
 */
export function drawSparkline(canvas, values, color) {
    canvas.width = SPARK_W;
    canvas.height = SPARK_H;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, SPARK_W, SPARK_H);

    const points = [];
    for (let i = 0; i < values.length; i++) {
        if (values[i] !== null && values[i] !== undefined) {
            points.push({ x: i, y: values[i] });
        }
    }
    if (points.length < 2) return;

    const padY = 2;

    // Dark background
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, SPARK_W, SPARK_H);

    // Grid lines every 20%
    const yScale0 = (SPARK_H - padY * 2) / 100;
    for (const pct of [0, 20, 40, 60, 80, 100]) {
        const gy = SPARK_H - padY - pct * yScale0;
        ctx.strokeStyle = pct === 0 || pct === 100 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(SPARK_W, gy);
        ctx.stroke();
    }
    const xStep = (SPARK_W - 2) / Math.max(values.length - 1, 1);
    const yScale = (SPARK_H - padY * 2) / 100;

    // Data line
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    let started = false;
    for (const pt of points) {
        const px = 1 + pt.x * xStep;
        const py = SPARK_H - padY - pt.y * yScale;
        if (!started) { ctx.moveTo(px, py); started = true; }
        else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Current value dot
    const last = points[points.length - 1];
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(1 + last.x * xStep, SPARK_H - padY - last.y * yScale, 2, 0, Math.PI * 2);
    ctx.fill();
}

/**
 * Create a sparkline canvas element for a specific meter.
 */
export function createSparklineCanvas(charName, meter) {
    const history = getMeterHistory(charName);
    const values = history[meter];
    if (!values || values.filter(v => v !== null).length < 2) return null;

    const canvas = document.createElement('canvas');
    canvas.className = 'sp-sparkline';
    canvas.title = t('Click for detailed graph');
    canvas.style.width = SPARK_W + 'px';
    canvas.style.height = SPARK_H + 'px';
    canvas.style.cursor = 'pointer';
    drawSparkline(canvas, values, METER_COLORS[meter] || '#aaa');

    canvas.addEventListener('click', (e) => {
        e.stopPropagation();
        showExpandedGraph(charName, meter, e.target);
    });

    return canvas;
}

// ── Full-screen SVG graph ──

function showExpandedGraph(charName, focusMeter) {
    document.querySelectorAll('.sp-graph-overlay').forEach(el => el.remove());

    const history = getMeterHistory(charName);
    const data = getTrackerData();
    const snapKeys = Object.keys(data.snapshots || {}).map(Number).sort((a, b) => a - b);

    const overlay = document.createElement('div');
    overlay.className = 'sp-graph-overlay';

    let activeMeter = focusMeter;

    const render = () => {
        const vals = history[activeMeter]?.filter(v => v !== null) || [];
        const cur = vals[vals.length - 1] || 0;
        const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;

        // Legend HTML — large buttons
        let legendHtml = '';
        for (const [meter, color] of Object.entries(METER_COLORS)) {
            const mv = history[meter]?.filter(v => v !== null) || [];
            if (mv.length < 1) continue;
            const active = meter === activeMeter ? ' sp-graph-legend-active' : '';
            legendHtml += `<button class="sp-graph-legend-btn${active}" data-meter="${meter}"><span class="sp-graph-legend-dot" style="background:${color}"></span>${t(meter.charAt(0).toUpperCase() + meter.slice(1))}</button>`;
        }

        overlay.innerHTML = `<div class="sp-graph-container">
            <div class="sp-graph-header">
                <span class="sp-graph-title">${charName} — ${t('Relationship History')}</span>
                <button class="sp-graph-close">✕</button>
            </div>
            <div class="sp-graph-svg-wrap">${_buildSvgGraph(history, activeMeter, snapKeys)}</div>
            <div class="sp-graph-legend">${legendHtml}</div>
            <div class="sp-graph-stats">
                <span>${t('Snapshots')}: ${snapKeys.length}</span>
                <span>${t('Data points')}: ${vals.length}</span>
                <span>${t('Current')}: ${cur}</span>
                <span>${t('Average')}: ${avg}</span>
            </div>
        </div>`;

        // Bind close
        overlay.querySelector('.sp-graph-close').addEventListener('click', () => overlay.remove());

        // Bind legend button clicks
        overlay.querySelectorAll('.sp-graph-legend-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                activeMeter = btn.dataset.meter;
                render();
            });
        });

        // Bind clickable lines in SVG (invisible fat hit areas)
        overlay.querySelectorAll('.sp-graph-line-hit').forEach(el => {
            el.style.cursor = 'pointer';
            el.addEventListener('click', () => {
                activeMeter = el.dataset.meter;
                render();
            });
        });

        // Bind clickable X-axis labels to load historical snapshots
        overlay.querySelectorAll('.sp-graph-xlabel').forEach(el => {
            el.style.cursor = 'pointer';
            el.addEventListener('click', () => {
                const key = Number(el.dataset.snapkey);
                if (!key) return;
                overlay.remove();
                // Load the historical snapshot
                import('../state.js').then(s => s.setCurrentSnapshotMesIdx(key));
                import('../settings.js').then(s => {
                    const snap = s.getTrackerData().snapshots[String(key)];
                    if (!snap) return;
                    import('../normalize.js').then(n => {
                        const norm = n.normalizeTracker(snap);
                        import('./update-panel.js').then(u => u.updatePanel(norm));
                        import('./panel.js').then(p => p.showPanel());
                        import('./timeline.js').then(tl => tl.renderTimeline());
                    });
                });
            });
        });
    };

    // Close on backdrop / Escape
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    const escH = (e) => { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', escH); } };
    document.addEventListener('keydown', escH);

    document.documentElement.appendChild(overlay);
    render();
}

function _buildSvgGraph(history, focusMeter, snapKeys) {
    const W = 1200, H = 600;
    const padL = 48, padR = 15, padT = 25, padB = 40;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    let maxLen = 0;
    for (const vals of Object.values(history)) {
        if (vals.length > maxLen) maxLen = vals.length;
    }
    if (maxLen < 2) return '<div style="padding:60px;text-align:center;color:#888;font-size:14px">Need at least 2 snapshots to show graph</div>';

    const xStep = plotW / (maxLen - 1);
    const NS = 'http://www.w3.org/2000/svg';
    let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="${NS}" style="width:100%;height:auto;display:block;max-height:72vh">`;

    // Background
    svg += `<rect width="${W}" height="${H}" fill="#0c0e16" rx="4"/>`;

    // Glow filter definition
    svg += `<defs><filter id="spGlow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;

    // Horizontal grid — lines every 5, labels every 20
    for (let pct = 0; pct <= 100; pct += 5) {
        const y = (padT + plotH - (pct / 100) * plotH).toFixed(1);
        const isMajor = pct % 20 === 0;
        const isMid = pct === 50;
        const c = isMid ? '#3a4058' : isMajor ? '#282d3c' : '#181c26';
        const sw = isMid ? 1.5 : isMajor ? 0.8 : 0.4;
        svg += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="${c}" stroke-width="${sw}"/>`;
    }

    // Y-axis labels every 20
    for (let pct = 0; pct <= 100; pct += 20) {
        const y = (padT + plotH - (pct / 100) * plotH).toFixed(1);
        svg += `<text x="${padL - 10}" y="${y}" fill="#9098b0" font-size="12" font-family="system-ui" text-anchor="end" dominant-baseline="middle">${pct}</text>`;
    }

    // Vertical grid + clickable X labels
    for (let i = 0; i < maxLen; i++) {
        const x = (padL + i * xStep).toFixed(1);
        svg += `<line x1="${x}" y1="${padT}" x2="${x}" y2="${(padT + plotH).toFixed(1)}" stroke="#1e2230" stroke-width="0.8"/>`;
        const snapKey = snapKeys[i] !== undefined ? snapKeys[i] : i;
        const label = '#' + snapKey;
        // Clickable label — class + data attribute for JS binding
        svg += `<text class="sp-graph-xlabel" data-snapkey="${snapKey}" x="${x}" y="${(padT + plotH + 20).toFixed(1)}" fill="#7880a0" font-size="12" font-family="system-ui" text-anchor="middle" style="cursor:pointer"><tspan>${label}</tspan></text>`;
        // Hover underline hint
        svg += `<line class="sp-graph-xlabel" data-snapkey="${snapKey}" x1="${(parseFloat(x) - 12).toFixed(1)}" y1="${(padT + plotH + 24).toFixed(1)}" x2="${(parseFloat(x) + 12).toFixed(1)}" y2="${(padT + plotH + 24).toFixed(1)}" stroke="#7880a0" stroke-width="0.5" opacity="0.3"/>`;
    }

    // Draw meter lines — unfocused first, focused last (on top)
    const meters = Object.entries(METER_COLORS);
    const sorted = [...meters].sort(([a], [b]) => (a === focusMeter ? 1 : 0) - (b === focusMeter ? 1 : 0));
    let hitAreas = ''; // Collect hit areas to render on top of everything

    for (const [meter, color] of sorted) {
        const values = history[meter];
        if (!values) continue;
        const pts = [];
        for (let i = 0; i < values.length; i++) {
            if (values[i] !== null) {
                pts.push({ x: padL + i * xStep, y: padT + plotH - (values[i] / 100) * plotH, v: values[i] });
            }
        }
        if (pts.length < 2) continue;

        const isFocused = meter === focusMeter;
        const pathD = pts.map((p, j) => `${j === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

        // Area fill for focused
        if (isFocused) {
            const lastPt = pts[pts.length - 1];
            const firstPt = pts[0];
            const bottom = padT + plotH;
            svg += `<path d="${pathD} L${lastPt.x.toFixed(1)},${bottom} L${firstPt.x.toFixed(1)},${bottom} Z" fill="${color}" opacity="0.15"/>`;
        }

        // Visible line
        svg += `<path d="${pathD}" fill="none" stroke="${color}" stroke-width="${isFocused ? 3.5 : 2}" stroke-linejoin="round" stroke-linecap="round" opacity="${isFocused ? 1 : 0.35}"${isFocused ? ' filter="url(#spGlow)"' : ''} style="pointer-events:none"/>`;

        // Dots + labels for focused
        if (isFocused) {
            for (const p of pts) {
                svg += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="6" fill="#0c0e16" stroke="${color}" stroke-width="2.5" style="pointer-events:none"/>`;
                svg += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="${color}" style="pointer-events:none"/>`;
                svg += `<text x="${p.x.toFixed(1)}" y="${(p.y - 12).toFixed(1)}" fill="#ffffff" font-size="13" font-weight="bold" font-family="system-ui" text-anchor="middle" style="pointer-events:none">${p.v}</text>`;
            }
        }

        // Collect hit area for ALL lines (rendered last, on top of everything)
        if (!isFocused) {
            hitAreas += `<path class="sp-graph-line-hit" data-meter="${meter}" d="${pathD}" fill="none" stroke="transparent" stroke-width="16" stroke-linejoin="round" stroke-linecap="round" style="cursor:pointer"/>`;
        }
    }

    // Append hit areas last — they sit on top of dots/labels so they're always clickable
    svg += hitAreas;

    svg += '</svg>';
    return svg;
}
