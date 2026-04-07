// src/ui/relationship-web.js — Relationship Web: SVG graph of character connections
import { log } from '../logger.js';
import { t } from '../i18n.js';
import { esc, clamp } from '../utils.js';
import { charColor } from '../color.js';

const W = 1000, H = 700;
const NODE_R = 28;
const METER_COLORS = { affection: '#f472b6', trust: '#60a5fa', desire: '#a78bfa', stress: '#facc15', compatibility: '#34d399' };

// ── Build nodes and edges from wiki entries ──
function _buildGraph(entries) {
    const nodes = [];
    const nameToIdx = new Map();
    for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        const cc = e.color;
        nodes.push({ name: e.name, color: cc.accent, bg: cc.bg, border: cc.border, inScene: e.inScene, role: e.character?.role || '', rel: e.relationship });
        nameToIdx.set(e.name.toLowerCase().trim(), i);
    }

    // Edges: every character with a relationship has a connection to {{user}}
    // We represent {{user}} as the center node
    const edges = [];
    for (let i = 0; i < nodes.length; i++) {
        const rel = nodes[i].rel;
        if (!rel) continue;
        const aff = clamp(typeof rel.affection === 'number' ? rel.affection : 0, 0, 100);
        const trust = clamp(typeof rel.trust === 'number' ? rel.trust : 0, 0, 100);
        const stress = clamp(typeof rel.stress === 'number' ? rel.stress : 0, 0, 100);
        edges.push({ from: -1, to: i, affection: aff, trust: trust, stress: stress, relType: rel.relType || '' });
    }
    return { nodes, edges };
}

// ── Layout: {{user}} at center, characters arranged in circle ──
function _layoutCircular(nodes) {
    const cx = W / 2, cy = H / 2;
    const n = nodes.length;
    if (n === 0) return [];
    const radius = Math.min(W, H) * 0.35;
    const positions = [];
    for (let i = 0; i < n; i++) {
        const angle = (2 * Math.PI * i / n) - Math.PI / 2; // start at top
        positions.push({ x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
    }
    return positions;
}

// ── Edge color based on affection level ──
function _edgeColor(aff) {
    if (aff >= 80) return '#f472b6'; // high affection — pink
    if (aff >= 60) return '#a78bfa'; // moderate — lavender
    if (aff >= 40) return '#60a5fa'; // neutral — blue
    if (aff >= 20) return '#facc15'; // low — yellow
    return '#6b7280'; // very low — gray
}

// ── Edge width based on trust ──
function _edgeWidth(trust) {
    return clamp(trust / 25, 1, 4);
}

// ── Build the SVG ──
function _buildSvg(graph, positions, userName) {
    const { nodes, edges } = graph;
    const cx = W / 2, cy = H / 2;

    let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;max-height:72vh">`;

    // Background
    svg += `<rect width="${W}" height="${H}" fill="#0c0e14" rx="8"/>`;

    // Subtle radial grid
    for (const r of [80, 160, 240]) {
        svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#1a1e2a" stroke-width="0.5"/>`;
    }

    // Edges (drawn first, behind nodes)
    for (const edge of edges) {
        const from = edge.from === -1 ? { x: cx, y: cy } : positions[edge.from];
        const to = positions[edge.to];
        if (!from || !to) continue;
        const col = _edgeColor(edge.affection);
        const w = _edgeWidth(edge.trust);
        const opacity = edge.stress > 70 ? 0.4 : 0.7;
        // Curved edge for visual interest
        const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2;
        const dx = to.x - from.x, dy = to.y - from.y;
        const offset = 20;
        const cpx = mx + (-dy / Math.sqrt(dx * dx + dy * dy || 1)) * offset;
        const cpy = my + (dx / Math.sqrt(dx * dx + dy * dy || 1)) * offset;
        svg += `<path d="M${from.x},${from.y} Q${cpx},${cpy} ${to.x},${to.y}" fill="none" stroke="${col}" stroke-width="${w}" opacity="${opacity}" stroke-linecap="round"/>`;
        // Stress indicator: dashed overlay for high stress
        if (edge.stress > 60) {
            svg += `<path d="M${from.x},${from.y} Q${cpx},${cpy} ${to.x},${to.y}" fill="none" stroke="${METER_COLORS.stress}" stroke-width="1" opacity="0.3" stroke-dasharray="4 4" stroke-linecap="round"/>`;
        }
    }

    // Center node ({{user}})
    svg += `<circle cx="${cx}" cy="${cy}" r="${NODE_R + 4}" fill="#1a1e2a" stroke="#4db8a4" stroke-width="2.5"/>`;
    svg += `<text x="${cx}" y="${cy + 1}" text-anchor="middle" dominant-baseline="central" fill="#4db8a4" font-size="11" font-weight="700">${esc(userName.length > 8 ? userName.substring(0, 7) + '\u2026' : userName)}</text>`;

    // Character nodes
    for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const p = positions[i];
        if (!p) continue;
        const nodeOpacity = n.inScene ? 1 : 0.5;
        // Node circle
        svg += `<g class="sp-web-node" data-idx="${i}" style="cursor:pointer;opacity:${nodeOpacity}">`;
        svg += `<circle cx="${p.x}" cy="${p.y}" r="${NODE_R}" fill="${n.bg}" stroke="${n.color}" stroke-width="2"/>`;
        // Name label
        const shortName = n.name.length > 10 ? n.name.substring(0, 9) + '\u2026' : n.name;
        svg += `<text x="${p.x}" y="${p.y + 1}" text-anchor="middle" dominant-baseline="central" fill="${n.color}" font-size="10" font-weight="600">${esc(shortName)}</text>`;
        // Status dot
        if (n.inScene) {
            svg += `<circle cx="${p.x + NODE_R - 4}" cy="${p.y - NODE_R + 4}" r="4" fill="#4ade80" stroke="#0c0e14" stroke-width="1.5"/>`;
        }
        svg += `</g>`;

        // Edge label (relType) — positioned along the edge midpoint
        const edge = edges.find(e => e.to === i);
        if (edge?.relType) {
            const mx = (cx + p.x) / 2, my = (cy + p.y) / 2;
            svg += `<text x="${mx}" y="${my - 6}" text-anchor="middle" fill="#7880a0" font-size="8" opacity="0.7">${esc(edge.relType)}</text>`;
        }
    }

    // Transparent hit areas for nodes (larger targets for hover/click)
    for (let i = 0; i < nodes.length; i++) {
        const p = positions[i];
        if (!p) continue;
        svg += `<circle class="sp-web-hit" data-idx="${i}" cx="${p.x}" cy="${p.y}" r="${NODE_R + 8}" fill="transparent" style="cursor:pointer"/>`;
    }

    svg += '</svg>';
    return svg;
}

// ── Tooltip for node hover ──
function _showTooltip(node, edge, x, y) {
    _hideTooltip();
    const tip = document.createElement('div');
    tip.className = 'sp-web-tooltip';
    let html = `<div class="sp-web-tip-name" style="color:${node.color}">${esc(node.name)}</div>`;
    if (node.role) html += `<div class="sp-web-tip-role">${esc(node.role)}</div>`;
    if (edge) {
        if (edge.relType) html += `<div class="sp-web-tip-type">${esc(edge.relType)}</div>`;
        html += '<div class="sp-web-tip-meters">';
        for (const [k, label] of [['affection', t('Affection')], ['trust', t('Trust')], ['stress', t('Stress')]]) {
            const v = edge[k] ?? 0;
            html += `<div class="sp-web-tip-meter"><span>${label}</span><span style="color:${METER_COLORS[k]};font-weight:700">${v}</span></div>`;
        }
        html += '</div>';
    }
    if (!node.inScene) html += `<div class="sp-web-tip-absent">${t('Absent')}</div>`;
    tip.innerHTML = html;

    // Position
    const vw = window.innerWidth, vh = window.innerHeight;
    let tx = x + 12, ty = y - 10;
    if (tx + 200 > vw) tx = x - 210;
    if (ty < 10) ty = y + 15;
    if (ty + 150 > vh) ty = vh - 160;
    tip.style.left = tx + 'px';
    tip.style.top = ty + 'px';
    document.body.appendChild(tip);
}

function _hideTooltip() {
    document.querySelectorAll('.sp-web-tooltip').forEach(t => t.remove());
}

// ── Open the relationship web overlay ──
export function openRelationshipWeb(entries) {
    document.querySelector('.sp-web-overlay')?.remove();
    if (!entries?.length) return;

    let userName = '';
    try { userName = SillyTavern.getContext().name1 || 'You'; } catch { userName = 'You'; }

    const graph = _buildGraph(entries);
    const positions = _layoutCircular(graph.nodes);

    const overlay = document.createElement('div');
    overlay.className = 'sp-web-overlay';
    overlay.innerHTML = `<div class="sp-web-container">
        <div class="sp-web-header">
            <div class="sp-web-title">${t('Relationship Web')}</div>
            <div class="sp-web-legend">
                <span style="color:#f472b6">\u25CF ${t('High')}</span>
                <span style="color:#60a5fa">\u25CF ${t('Moderate')}</span>
                <span style="color:#facc15">\u25CF ${t('Low')}</span>
                <span style="color:#6b7280">\u25CF ${t('Minimal')}</span>
                <span style="color:#facc15;font-size:9px">--- ${t('Stress')}</span>
            </div>
            <button class="sp-web-close">\u2715</button>
        </div>
        <div class="sp-web-svg-wrap">${_buildSvg(graph, positions, userName)}</div>
        <div class="sp-web-footer">${graph.nodes.length} ${t('characters')} \u00B7 ${graph.edges.length} ${t('connections')} \u00B7 ${t('Edge color = affection, width = trust, dashes = stress')}</div>
    </div>`;

    // Close handlers
    const _escHandler = (e) => { if (e.key === 'Escape') _close(); };
    function _close() { _hideTooltip(); overlay.remove(); document.removeEventListener('keydown', _escHandler); }
    overlay.querySelector('.sp-web-close').addEventListener('click', _close);
    overlay.addEventListener('click', e => { if (e.target === overlay) { _hideTooltip(); _close(); } });
    document.addEventListener('keydown', _escHandler);

    // Node hover/click
    overlay.querySelectorAll('.sp-web-hit').forEach(hit => {
        const idx = Number(hit.dataset.idx);
        const node = graph.nodes[idx];
        const edge = graph.edges.find(e => e.to === idx);
        hit.addEventListener('mouseenter', (e) => _showTooltip(node, edge, e.clientX, e.clientY));
        hit.addEventListener('mouseleave', () => _hideTooltip());
        hit.addEventListener('click', (e) => {
            e.stopPropagation();
            _showTooltip(node, edge, e.clientX, e.clientY);
        });
    });

    document.body.appendChild(overlay);
    log('Relationship Web: opened with', graph.nodes.length, 'nodes,', graph.edges.length, 'edges');
}
