// src/ui/sparklines.js — Relationship history sparkline renderer
// Mini canvas sparklines + full-screen SVG graph

import { getTrackerData } from '../settings.js';
import { t } from '../i18n.js';

/**
 * Highlight a message element with glow, pulse, and graceful fade — driven by JS to bypass CSS overrides.
 */
function _highlightMessage(el) {
    el.classList.add('sp-highlight-msg');
    const start = performance.now();
    const PULSE_DURATION = 2000;  // 2 pulses over 2s
    const HOLD = 500;            // hold glow for 0.5s
    const FADE = 1000;           // fade out over 1s
    const TOTAL = PULSE_DURATION + HOLD + FADE;

    function frame(now) {
        const elapsed = now - start;
        if (elapsed >= TOTAL) {
            el.style.removeProperty('outline-color');
            el.style.removeProperty('box-shadow');
            el.classList.remove('sp-highlight-msg');
            return;
        }
        if (elapsed < PULSE_DURATION) {
            // Pulse phase: sin wave between 0.3 and 0.8 opacity glow
            const pulse = Math.sin((elapsed / PULSE_DURATION) * Math.PI * 2) * 0.5 + 0.5;
            const glow1 = 8 + pulse * 14;
            const glow2 = 16 + pulse * 28;
            const alpha1 = 0.3 + pulse * 0.4;
            const alpha2 = 0.1 + pulse * 0.2;
            el.style.setProperty('box-shadow', `0 0 ${glow1}px rgba(77,184,164,${alpha1}), 0 0 ${glow2}px rgba(77,184,164,${alpha2})`, 'important');
            el.style.setProperty('outline-color', `rgba(77,184,164,${0.7 + pulse * 0.3})`, 'important');
        } else {
            // Fade phase: pulse continues but fades out together with outline
            const fadeElapsed = elapsed - PULSE_DURATION;
            const fadeDuration = HOLD + FADE;
            const opacity = Math.max(0, 1 - (fadeElapsed / fadeDuration));
            const pulse = Math.sin((elapsed / PULSE_DURATION) * Math.PI * 2) * 0.5 + 0.5;
            const glow1 = (8 + pulse * 14) * opacity;
            const glow2 = (16 + pulse * 28) * opacity;
            const alpha1 = (0.3 + pulse * 0.4) * opacity;
            const alpha2 = (0.1 + pulse * 0.2) * opacity;
            el.style.setProperty('box-shadow', `0 0 ${glow1}px rgba(77,184,164,${alpha1}), 0 0 ${glow2}px rgba(77,184,164,${alpha2})`, 'important');
            el.style.setProperty('outline-color', `rgba(77,184,164,${(0.7 + pulse * 0.3) * opacity})`, 'important');
            el.style.setProperty('outline-width', `${2 * opacity}px`, 'important');
        }
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

/**
 * Scroll to a message in chat, handling hidden messages.
 * If the message element exists, scroll to it and highlight.
 * If hidden/not found, show a toast notification.
 */
export async function _scrollToMessage(mesIdx) {
    try {
        console.log('[ScenePulse] scrollToMessage: target mesIdx=', mesIdx);

        // Step 1: Check if element already in DOM
        let mesEl = document.querySelector(`.mes[mesid="${mesIdx}"]`);
        console.log('[ScenePulse] scrollToMessage: element in DOM?', !!mesEl);

        // Step 2: If not in DOM, load via showMoreMessages
        if (!mesEl) {
            const allMes = document.querySelectorAll('#chat .mes');
            const firstId = allMes.length ? Number(allMes[0].getAttribute('mesid')) : -1;
            console.log('[ScenePulse] scrollToMessage: firstDisplayedId=', firstId, 'total in DOM=', allMes.length);

            if (firstId > mesIdx) {
                const needed = firstId - mesIdx + 5;
                console.log('[ScenePulse] scrollToMessage: need to load', needed, 'more messages');
                try {
                    const stScript = await import('/script.js');
                    console.log('[ScenePulse] scrollToMessage: showMoreMessages available?', !!stScript.showMoreMessages);
                    await stScript.showMoreMessages(needed);
                    await new Promise(r => setTimeout(r, 500));
                } catch (e) {
                    console.warn('[ScenePulse] scrollToMessage: showMoreMessages failed:', e);
                    // Fallback: click button
                    for (let i = 0; i < 20; i++) {
                        const btn = document.getElementById('show_more_messages');
                        if (!btn) { console.log('[ScenePulse] scrollToMessage: no more button, stopping at attempt', i); break; }
                        btn.click();
                        await new Promise(r => setTimeout(r, 500));
                        if (document.querySelector(`.mes[mesid="${mesIdx}"]`)) break;
                    }
                }
                mesEl = document.querySelector(`.mes[mesid="${mesIdx}"]`);
                console.log('[ScenePulse] scrollToMessage: after loading, element in DOM?', !!mesEl);
            }
        }

        if (!mesEl) {
            // Check total chat length
            const ctx = SillyTavern.getContext();
            console.warn('[ScenePulse] scrollToMessage: FAILED. mesIdx=', mesIdx, 'chat.length=', ctx.chat?.length, 'chat[mesIdx] exists?', !!ctx.chat?.[mesIdx]);
            toastr.warning(`Message #${mesIdx} could not be found`, 'ScenePulse', { timeOut: 4000 });
            return;
        }

        // Step 3: Scroll to it
        const chatContainer = document.getElementById('chat');
        if (chatContainer) {
            const elRect = mesEl.getBoundingClientRect();
            const containerRect = chatContainer.getBoundingClientRect();
            const scrollTarget = elRect.top - containerRect.top + chatContainer.scrollTop - 60;
            console.log('[ScenePulse] scrollToMessage: scrolling chat container to', scrollTarget);
            chatContainer.scrollTo({ top: scrollTarget, behavior: 'smooth' });
        }

        _highlightMessage(mesEl);
        console.log('[ScenePulse] scrollToMessage: SUCCESS for mesIdx=', mesIdx);
    } catch (e) {
        console.error('[ScenePulse] scrollToMessage error:', e);
    }
}

const SPARK_W = 40;
const SPARK_H = 16;

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
    const nonNull = values ? values.filter(v => v !== null).length : 0;

    const canvas = document.createElement('canvas');
    canvas.className = 'sp-sparkline';
    canvas.title = nonNull >= 2 ? t('Click for detailed graph') : t('Need 2+ snapshots for graph');
    canvas.style.width = SPARK_W + 'px';
    canvas.style.height = SPARK_H + 'px';
    canvas.style.cursor = 'pointer';

    if (nonNull >= 2) {
        // Cap to last 30 data points for mini sparkline
        const capped = values.length > 30 ? values.slice(-30) : values;
        drawSparkline(canvas, capped, METER_COLORS[meter] || '#aaa');
    } else {
        // Draw empty sparkline placeholder
        canvas.width = SPARK_W;
        canvas.height = SPARK_H;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(0, 0, SPARK_W, SPARK_H);
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 0.5;
        const mid = SPARK_H / 2;
        ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(SPARK_W, mid); ctx.stroke();
    }

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
                ${snapKeys.length>30?`<span style="color:var(--sp-amber,#d4915e)">${t('Showing last 30')}</span>`:''}
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

        // Data point interaction — hover shows tooltip near cursor, click navigates (desktop) or shows info panel (mobile)
        const svgWrap = overlay.querySelector('.sp-graph-svg-wrap');
        const isMobile = window.innerWidth <= 600 || 'ontouchstart' in window;

        function _buildTip(key, dot) {
            const snap = data.snapshots[String(key)];
            if (!snap) return null;
            const _e = (s) => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
            let msgPreview = '';
            try { const msg = SillyTavern.getContext().chat[key]; if (msg && !msg.is_user) { msgPreview = (msg.mes||'').substring(0,150).trim(); if ((msg.mes||'').length>150) msgPreview+='...'; } } catch {}
            const tip = document.createElement('div');
            tip.className = 'sp-graph-tooltip';
            tip.innerHTML = `<div class="sp-graph-tip-header"><strong>#${key}</strong> ${_e(snap.time||'')} \u00B7 ${_e(snap.sceneTension||'')}</div>
                <div class="sp-graph-tip-loc">${_e(snap.location||'')}</div>
                <div class="sp-graph-tip-topic">${_e(snap.sceneTopic||'')}</div>
                ${msgPreview?`<div class="sp-graph-tip-msg">${_e(msgPreview)}</div>`:''}
                <div class="sp-graph-tip-val">${dot.dataset.meter}: <strong>${dot.dataset.value}</strong></div>
                ${isMobile?`<button class="sp-graph-tip-goto">${t('Go to message')} #${key}</button>`:`<div class="sp-graph-tip-hint">${t('Click to go to message')}</div>`}`;
            return tip;
        }

        function _navigateTo(key) {
            overlay.remove();
            import('../state.js').then(s => s.setCurrentSnapshotMesIdx(key));
            import('../settings.js').then(s => { const sn=s.getTrackerData().snapshots[String(key)]; if(!sn)return; import('../normalize.js').then(n=>{import('./update-panel.js').then(u=>u.updatePanel(n.normalizeTracker(sn)));import('./panel.js').then(p=>p.showPanel());import('./timeline.js').then(tl=>tl.renderTimeline())}); });
            _scrollToMessage(key);
        }

        let _activeTip = null;
        overlay.querySelectorAll('.sp-graph-dot-hit').forEach(dot => {
            if (!isMobile) {
                // Desktop: hover shows tooltip offset from cursor so mouse doesn't cover it
                dot.addEventListener('mouseenter', (e) => {
                    if (_activeTip) { _activeTip.remove(); _activeTip = null; }
                    const key = Number(dot.dataset.snapkey);
                    const tip = _buildTip(key, dot);
                    if (!tip) return;
                    tip.style.pointerEvents = 'none';
                    // Use fixed positioning relative to viewport — always accurate
                    tip.style.position = 'fixed';
                    tip.style.zIndex = '100010';
                    const tipW = 230;
                    const tipH = 180;
                    const vw = window.innerWidth;
                    const vh = window.innerHeight;
                    // Bottom-left corner of tooltip at cursor; flip if near edges
                    let tx = e.clientX;
                    let ty = e.clientY - tipH;
                    if (tx + tipW > vw - 5) tx = e.clientX - tipW;
                    if (ty < 5) ty = e.clientY + 5;
                    tip.style.left = tx + 'px';
                    tip.style.top = ty + 'px';
                    document.body.appendChild(tip);
                    _activeTip = tip;
                });
                dot.addEventListener('mouseleave', () => {
                    const ref = _activeTip;
                    setTimeout(() => { if (_activeTip === ref && ref) { ref.remove(); _activeTip = null; } }, 300);
                });
                dot.addEventListener('click', (e) => { e.stopPropagation(); _navigateTo(Number(dot.dataset.snapkey)); });
            } else {
                // Mobile: first tap shows info panel with "Go to message" button
                dot.addEventListener('click', (e) => {
                    e.stopPropagation();
                    overlay.querySelectorAll('.sp-graph-tooltip').forEach(el => el.remove());
                    const key = Number(dot.dataset.snapkey);
                    const tip = _buildTip(key, dot);
                    if (!tip) return;
                    tip.style.pointerEvents = 'auto';
                    const container = overlay.querySelector('.sp-graph-container');
                    // Center on mobile
                    tip.style.left = '50%';
                    tip.style.transform = 'translateX(-50%)';
                    tip.style.bottom = '80px';
                    tip.style.top = 'auto';
                    tip.style.width = 'min(280px, 80vw)';
                    const gotoBtn = tip.querySelector('.sp-graph-tip-goto');
                    if (gotoBtn) gotoBtn.addEventListener('click', () => _navigateTo(key));
                    container.appendChild(tip);
                });
            }
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
    const data = getTrackerData();
    const GRAPH_CAP = 30; // Max data points displayed on graph

    // Cap to last GRAPH_CAP entries (work on copies to avoid mutating originals)
    let totalLen = 0;
    for (const vals of Object.values(history)) { if (vals.length > totalLen) totalLen = vals.length; }
    const offset = Math.max(0, totalLen - GRAPH_CAP);
    const _hist = {};
    for (const k of Object.keys(history)) { _hist[k] = offset > 0 ? history[k].slice(offset) : [...history[k]]; }
    const _keys = offset > 0 ? snapKeys.slice(offset) : [...snapKeys];
    // Replace references for the rest of this function
    history = _hist;
    snapKeys = _keys;

    const W = 1200, H = 600;
    const padL = 52, padR = 15, padT = 25, padB = 44;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    let maxLen = 0;
    for (const vals of Object.values(history)) {
        if (vals.length > maxLen) maxLen = vals.length;
    }
    if (maxLen < 2) return `<div style="padding:40px;text-align:center;color:#888;font-size:14px"><div style="font-size:24px;margin-bottom:8px;opacity:0.3">📊</div>${t('Need at least 2 snapshots to show graph')}<br><span style="font-size:11px;opacity:0.5">${t('Send more messages to build relationship history')}</span></div>`;

    const xStep = plotW / (maxLen - 1);
    // Calculate label step to prevent overlap with high message counts
    const _labelW = 50; // approximate width of "#1234" label in SVG units
    const _labelStep = Math.max(1, Math.ceil(maxLen / (plotW / _labelW)));
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

    // Vertical grid + clickable X labels (skip labels to prevent overlap on high counts)
    for (let i = 0; i < maxLen; i++) {
        const x = (padL + i * xStep).toFixed(1);
        svg += `<line x1="${x}" y1="${padT}" x2="${x}" y2="${(padT + plotH).toFixed(1)}" stroke="#1e2230" stroke-width="0.8"/>`;
        const snapKey = snapKeys[i] !== undefined ? snapKeys[i] : i;
        // Only render label at step intervals to prevent text overlap
        if (i % _labelStep === 0 || i === maxLen - 1) {
            const label = '#' + snapKey;
            svg += `<text class="sp-graph-xlabel" data-snapkey="${snapKey}" x="${x}" y="${(padT + plotH + 20).toFixed(1)}" fill="#7880a0" font-size="11" font-family="system-ui" text-anchor="middle" style="cursor:pointer"><tspan>${label}</tspan></text>`;
            svg += `<line class="sp-graph-xlabel" data-snapkey="${snapKey}" x1="${(parseFloat(x) - 10).toFixed(1)}" y1="${(padT + plotH + 24).toFixed(1)}" x2="${(parseFloat(x) + 10).toFixed(1)}" y2="${(padT + plotH + 24).toFixed(1)}" stroke="#7880a0" stroke-width="0.5" opacity="0.3"/>`;
        }
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
                pts.push({ x: padL + i * xStep, y: padT + plotH - (values[i] / 100) * plotH, v: values[i], idx: i });
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

        // Dots + value labels for focused
        if (isFocused) {
            for (const p of pts) {
                const _snapKey = snapKeys[p.idx] !== undefined ? snapKeys[p.idx] : p.idx;
                svg += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="6" fill="#0c0e16" stroke="${color}" stroke-width="2.5" style="pointer-events:none"/>`;
                svg += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="${color}" style="pointer-events:none"/>`;
                svg += `<text x="${p.x.toFixed(1)}" y="${(p.y - 12).toFixed(1)}" fill="#ffffff" font-size="13" font-weight="bold" font-family="system-ui" text-anchor="middle" style="pointer-events:none">${p.v}</text>`;
                // Clickable hit target — shows info panel + scrolls to message
                svg += `<circle class="sp-graph-dot-hit" data-snapkey="${_snapKey}" data-meter="${meter}" data-value="${p.v}" data-px="${p.x.toFixed(0)}" data-py="${p.y.toFixed(0)}" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="20" fill="transparent" style="cursor:pointer"/>`;
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
