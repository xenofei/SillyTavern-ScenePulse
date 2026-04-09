// src/ui/relationship-web.js — Relationship Web overlay
//
// v6.8.27: overhaul. Previously a forced-circular layout showing only
// {{user}}→NPC edges. Now:
//   - Seeded force-directed layout (deterministic per character roster)
//   - NPC↔NPC edges when Phase 1 NPC graph is enabled + cached
//   - Two-tone reciprocal edges for bidirectional ties
//   - Emoji glyph on each edge midpoint for color-blind accessibility
//   - Hover-only labels (no always-on labels to avoid collision)
//   - {{user}} anchored at center
//   - Classic circular layout preserved as a "Classic view" toggle
//     fallback for users who prefer the old look.
//
// The NPC↔NPC data comes from src/ui/relationship-graph.js (lazy batch
// inference on open, cached per-snapshot). When the setting is off or
// the cache is empty, the web falls back to the v6.8.21 star topology
// showing only the existing {{user}}-facing relationships.
import { log, warn } from '../logger.js';
import { t } from '../i18n.js';
import { esc, clamp } from '../utils.js';
import { charColor } from '../color.js';
import {
    isEnabled as isGraphEnabled,
    getCachedEdges,
    isCacheStale,
    generateGraph,
    clearCache,
    EDGE_COLORS,
    EDGE_GLYPHS,
} from './relationship-graph.js';

const W = 1000, H = 700;
const NODE_R = 28;
const CENTER_R = 32;
const METER_COLORS = { affection: '#f472b6', trust: '#60a5fa', desire: '#a78bfa', stress: '#facc15', compatibility: '#34d399' };

// ── Deterministic RNG ──────────────────────────────────────────────────
// Mulberry32 — small, deterministic, good-enough for layout seeding.
// Seeded from a hash of the character name list so the same roster
// always produces the same initial positions and thus the same final
// force-directed layout after simulation. Avoids the "graph looks
// different each time I open it" problem.
function _mulberry32(seed) {
    return function () {
        let t = (seed += 0x6D2B79F5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function _seedFromNames(names) {
    const joined = [...names].sort().join('|').toLowerCase();
    let h = 5381;
    for (let i = 0; i < joined.length; i++) h = ((h << 5) + h + joined.charCodeAt(i)) | 0;
    return h >>> 0;
}

// ── Force-directed layout ──────────────────────────────────────────────
// A compact Fruchterman-Reingold variant tuned for small graphs (5-30
// nodes). Runs ~200 iterations with a cooling schedule. {{user}} node
// is pinned at center throughout the simulation so the layout stays
// centered around the player. Drag-to-reposition is deferred to v2 —
// nodes are fixed after simulation freezes.
function _layoutForceDirected(nodes, edges, userIdx) {
    const n = nodes.length;
    if (n === 0) return [];
    const cx = W / 2, cy = H / 2;

    // Seeded RNG for determinism
    const names = nodes.map(node => node.name || '?');
    const rng = _mulberry32(_seedFromNames(names));

    // Initial positions: concentric ring around center with a small
    // random offset. User pinned at center.
    const positions = new Array(n);
    const initRadius = Math.min(W, H) * 0.28;
    for (let i = 0; i < n; i++) {
        if (i === userIdx) {
            positions[i] = { x: cx, y: cy };
        } else {
            const angle = (2 * Math.PI * i) / Math.max(1, n - 1) - Math.PI / 2;
            const jitter = (rng() - 0.5) * 30;
            positions[i] = {
                x: cx + (initRadius + jitter) * Math.cos(angle),
                y: cy + (initRadius + jitter) * Math.sin(angle),
            };
        }
    }
    if (n <= 1) return positions;

    // Ideal edge length k — Fruchterman-Reingold's constant
    const area = W * H;
    const k = Math.sqrt(area / n) * 0.65;
    const k2 = k * k;

    // Adjacency for attractive force lookups
    const adj = new Map();
    for (const e of edges) {
        if (e.from < 0 || e.to < 0) continue;
        const key = `${Math.min(e.from, e.to)}|${Math.max(e.from, e.to)}`;
        adj.set(key, true);
    }
    function connected(i, j) {
        if (i === j) return false;
        const key = `${Math.min(i, j)}|${Math.max(i, j)}`;
        return adj.has(key);
    }

    // Simulation loop
    const ITER = 180;
    let temp = Math.min(W, H) * 0.12;
    const cooling = temp / ITER;

    for (let iter = 0; iter < ITER; iter++) {
        const disp = new Array(n);
        for (let i = 0; i < n; i++) disp[i] = { x: 0, y: 0 };

        // Repulsive forces (O(n²) — fine for typical roster sizes)
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                let dx = positions[i].x - positions[j].x;
                let dy = positions[i].y - positions[j].y;
                let d2 = dx * dx + dy * dy;
                if (d2 < 0.01) { dx = rng() - 0.5; dy = rng() - 0.5; d2 = 1; }
                const d = Math.sqrt(d2);
                const f = k2 / d;
                const fx = (dx / d) * f;
                const fy = (dy / d) * f;
                disp[i].x += fx;
                disp[i].y += fy;
                disp[j].x -= fx;
                disp[j].y -= fy;
            }
        }

        // Attractive forces along edges
        for (const e of edges) {
            if (e.from < 0 || e.to < 0) continue;
            const pi = positions[e.from];
            const pj = positions[e.to];
            const dx = pi.x - pj.x;
            const dy = pi.y - pj.y;
            const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
            const f = (d * d) / k;
            const fx = (dx / d) * f;
            const fy = (dy / d) * f;
            disp[e.from].x -= fx;
            disp[e.from].y -= fy;
            disp[e.to].x += fx;
            disp[e.to].y += fy;
        }

        // Apply displacements, clamped by current temperature
        for (let i = 0; i < n; i++) {
            if (i === userIdx) continue; // pin user at center
            const d = Math.sqrt(disp[i].x * disp[i].x + disp[i].y * disp[i].y) || 0.01;
            positions[i].x += (disp[i].x / d) * Math.min(d, temp);
            positions[i].y += (disp[i].y / d) * Math.min(d, temp);
            // Keep nodes inside the viewbox with margin
            const margin = NODE_R + 20;
            positions[i].x = clamp(positions[i].x, margin, W - margin);
            positions[i].y = clamp(positions[i].y, margin, H - margin);
        }

        temp = Math.max(temp - cooling, 0.1);
    }

    return positions;
}

// ── Classic circular layout (fallback) ─────────────────────────────────
// The v6.8.21 layout preserved as a toggle alternative for users who
// prefer the old look or when the force-directed simulation produces
// something messy for their particular roster.
function _layoutCircular(nodes, userIdx) {
    const n = nodes.length;
    if (n === 0) return [];
    const cx = W / 2, cy = H / 2;
    const radius = Math.min(W, H) * 0.35;
    const positions = new Array(n);
    // Filter out user from the ring; user goes at center
    let ringIdx = 0;
    const ringCount = userIdx >= 0 ? n - 1 : n;
    for (let i = 0; i < n; i++) {
        if (i === userIdx) {
            positions[i] = { x: cx, y: cy };
            continue;
        }
        const angle = (2 * Math.PI * ringIdx / Math.max(1, ringCount)) - Math.PI / 2;
        positions[i] = { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
        ringIdx++;
    }
    return positions;
}

// ── Build nodes and edges ──────────────────────────────────────────────
// Combines the existing {{user}}-facing relationships[] data with the
// NPC↔NPC edges from relationship-graph.js (if cached and enabled).
// Returns a structure the SVG builder can consume directly.
function _buildGraph(entries, npcEdges, userName) {
    const nodes = [];
    const nameToIdx = new Map();

    // Add {{user}} as node 0 (by convention — the renderer uses userIdx=0)
    nodes.push({
        name: userName,
        isUser: true,
        color: '#4db8a4',
        bg: '#1a1e2a',
        border: '#4db8a4',
        inScene: true,
        role: '',
        rel: null,
    });
    const userIdx = 0;
    nameToIdx.set(userName.toLowerCase().trim(), userIdx);

    // Add NPC nodes
    for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        const cc = e.color;
        nodes.push({
            name: e.name,
            isUser: false,
            color: cc.accent,
            bg: cc.bg,
            border: cc.border,
            inScene: e.inScene,
            role: e.character?.role || '',
            rel: e.relationship,
        });
        nameToIdx.set(e.name.toLowerCase().trim(), nodes.length - 1);
        // Also index aliases so edge resolution can find aliased references
        const aliases = Array.isArray(e.character?.aliases) ? e.character.aliases : [];
        for (const a of aliases) {
            const al = (a || '').toLowerCase().trim();
            if (al && !nameToIdx.has(al)) nameToIdx.set(al, nodes.length - 1);
        }
    }

    // {{user}}-facing edges from relationships[] (unchanged from v6.8.21 logic)
    const edges = [];
    for (let i = 1; i < nodes.length; i++) {
        const rel = nodes[i].rel;
        if (!rel) continue;
        const aff = clamp(typeof rel.affection === 'number' ? rel.affection : 0, 0, 100);
        const trust = clamp(typeof rel.trust === 'number' ? rel.trust : 0, 0, 100);
        const stress = clamp(typeof rel.stress === 'number' ? rel.stress : 0, 0, 100);
        edges.push({
            from: userIdx,
            to: i,
            kind: 'user',
            affection: aff,
            trust,
            stress,
            relType: rel.relType || '',
            direction: 'from-to',
        });
    }

    // NPC↔NPC edges from the cached graph
    if (Array.isArray(npcEdges)) {
        for (const e of npcEdges) {
            const fromLow = (e.from || '').toLowerCase().trim();
            const toLow = (e.to || '').toLowerCase().trim();
            const fromIdx = nameToIdx.get(fromLow);
            const toIdx = nameToIdx.get(toLow);
            // Skip broken refs (character no longer in current roster) and
            // any edge that accidentally references the user node
            if (fromIdx == null || toIdx == null) continue;
            if (fromIdx === userIdx || toIdx === userIdx) continue;
            if (fromIdx === toIdx) continue;
            edges.push({
                from: fromIdx,
                to: toIdx,
                kind: 'npc',
                type: e.type || 'unknown',
                label: e.label || e.type || '',
                direction: e.direction || 'from-to',
            });
        }
    }

    return { nodes, edges, userIdx };
}

// ── Edge color / width helpers ─────────────────────────────────────────
// User-facing edges use the old affection/trust scheme. NPC edges use
// the new per-type palette.
function _userEdgeColor(aff) {
    if (aff >= 80) return '#f472b6';
    if (aff >= 60) return '#a78bfa';
    if (aff >= 40) return '#60a5fa';
    if (aff >= 20) return '#facc15';
    return '#6b7280';
}
function _userEdgeWidth(trust) { return clamp(trust / 25, 1, 4); }
function _npcEdgeColor(type) { return EDGE_COLORS[type] || EDGE_COLORS.unknown; }

// ── SVG building ───────────────────────────────────────────────────────
function _buildSvg(graph, positions, userName) {
    const { nodes, edges, userIdx } = graph;
    const userPos = positions[userIdx];

    let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;max-height:72vh" role="img" aria-label="${esc(t('Relationship Web'))}">`;
    svg += `<title>${esc(t('Relationship Web'))}</title>`;

    // Background
    svg += `<rect width="${W}" height="${H}" fill="#0c0e14" rx="8"/>`;

    // Subtle radial grid centered on user
    for (const r of [80, 160, 240, 320]) {
        svg += `<circle cx="${userPos.x}" cy="${userPos.y}" r="${r}" fill="none" stroke="#1a1e2a" stroke-width="0.5"/>`;
    }

    // ── Edges (drawn first, behind nodes) ──
    // For reciprocal NPC edges we draw a single two-tone curve: the
    // first half in the `from` character's accent, the second half in
    // the `to` character's accent.
    let edgeIdx = 0;
    for (const edge of edges) {
        const from = positions[edge.from];
        const to = positions[edge.to];
        if (!from || !to) continue;
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        // Curved edges for visual interest; offset sign hashed per edge so
        // multiple edges between similar regions don't overlap exactly.
        const offsetSign = ((edge.from * 31 + edge.to * 17 + edgeIdx * 7) % 2 === 0) ? 1 : -1;
        const offset = 24 + (edgeIdx % 3) * 8;
        const mx = (from.x + to.x) / 2;
        const my = (from.y + to.y) / 2;
        const nx = -dy / len;
        const ny = dx / len;
        const cpx = mx + nx * offset * offsetSign;
        const cpy = my + ny * offset * offsetSign;

        if (edge.kind === 'user') {
            // Existing user-facing rendering (affection color, trust width, stress dash)
            const col = _userEdgeColor(edge.affection);
            const w = _userEdgeWidth(edge.trust);
            const opacity = edge.stress > 70 ? 0.4 : 0.7;
            svg += `<path class="sp-web-edge sp-web-edge-user" d="M${from.x},${from.y} Q${cpx},${cpy} ${to.x},${to.y}" fill="none" stroke="${col}" stroke-width="${w}" opacity="${opacity}" stroke-linecap="round"/>`;
            if (edge.stress > 60) {
                svg += `<path d="M${from.x},${from.y} Q${cpx},${cpy} ${to.x},${to.y}" fill="none" stroke="${METER_COLORS.stress}" stroke-width="1" opacity="0.3" stroke-dasharray="4 4" stroke-linecap="round"/>`;
            }
        } else {
            // NPC↔NPC: type-colored curve with optional two-tone for reciprocal.
            // Line style: solid (default) — we use line weight to communicate
            // intensity. Dashed lines are reserved for high-stress user edges.
            const col = _npcEdgeColor(edge.type);
            const w = 2.2;
            const opacity = 0.72;
            if (edge.direction === 'reciprocal') {
                // Two-tone: first half in `from` node color, second in `to` node color.
                // Draw as two separate paths meeting at the curve midpoint (t=0.5
                // of the quadratic Bezier). For readability we compute the midpoint
                // of the Bezier and draw two straight-ish subcurves through it.
                const bezMx = 0.25 * from.x + 0.5 * cpx + 0.25 * to.x;
                const bezMy = 0.25 * from.y + 0.5 * cpy + 0.25 * to.y;
                const fromColor = nodes[edge.from].color;
                const toColor = nodes[edge.to].color;
                // First half — from → midpoint with control 1
                const cp1x = from.x + (cpx - from.x) * 0.5;
                const cp1y = from.y + (cpy - from.y) * 0.5;
                svg += `<path class="sp-web-edge sp-web-edge-npc" d="M${from.x},${from.y} Q${cp1x},${cp1y} ${bezMx},${bezMy}" fill="none" stroke="${fromColor}" stroke-width="${w}" opacity="${opacity}" stroke-linecap="round"/>`;
                // Second half — midpoint → to with control 2
                const cp2x = to.x + (cpx - to.x) * 0.5;
                const cp2y = to.y + (cpy - to.y) * 0.5;
                svg += `<path class="sp-web-edge sp-web-edge-npc" d="M${bezMx},${bezMy} Q${cp2x},${cp2y} ${to.x},${to.y}" fill="none" stroke="${toColor}" stroke-width="${w}" opacity="${opacity}" stroke-linecap="round"/>`;
                // Type color overlay as a thin core line so the edge kind is
                // still identifiable even when the two-tone colors dominate.
                svg += `<path d="M${from.x},${from.y} Q${cpx},${cpy} ${to.x},${to.y}" fill="none" stroke="${col}" stroke-width="1" opacity="0.4" stroke-linecap="round"/>`;
            } else {
                // Directional (one-way) edge — single color from the type palette.
                svg += `<path class="sp-web-edge sp-web-edge-npc" d="M${from.x},${from.y} Q${cpx},${cpy} ${to.x},${to.y}" fill="none" stroke="${col}" stroke-width="${w}" opacity="${opacity}" stroke-linecap="round"/>`;
            }
            // Emoji glyph on the midpoint for color-blind accessibility +
            // at-a-glance edge type identification without hovering.
            const glyph = EDGE_GLYPHS[edge.type] || '';
            if (glyph) {
                svg += `<g class="sp-web-edge-glyph">`;
                svg += `<circle cx="${cpx}" cy="${cpy}" r="9" fill="#0c0e14" stroke="${col}" stroke-width="1"/>`;
                svg += `<text x="${cpx}" y="${cpy + 3}" text-anchor="middle" dominant-baseline="central" font-size="11" fill="${col}">${glyph}</text>`;
                svg += `</g>`;
            }
        }
        edgeIdx++;
    }

    // ── Nodes ──
    for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const p = positions[i];
        if (!p) continue;
        const isUser = n.isUser;
        const r = isUser ? CENTER_R + 2 : NODE_R;
        const nodeOpacity = isUser ? 1 : (n.inScene ? 1 : 0.5);
        svg += `<g class="sp-web-node" data-idx="${i}" style="cursor:pointer;opacity:${nodeOpacity}">`;
        svg += `<title>${esc(n.name)}${n.role ? ' — ' + esc(n.role) : ''}</title>`;
        svg += `<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="${n.bg}" stroke="${n.color}" stroke-width="${isUser ? 2.5 : 2}"/>`;
        const shortName = n.name.length > 10 ? n.name.substring(0, 9) + '\u2026' : n.name;
        svg += `<text x="${p.x}" y="${p.y + 1}" text-anchor="middle" dominant-baseline="central" fill="${n.color}" font-size="${isUser ? 11 : 10}" font-weight="${isUser ? 700 : 600}">${esc(shortName)}</text>`;
        if (!isUser && n.inScene) {
            svg += `<circle cx="${p.x + NODE_R - 4}" cy="${p.y - NODE_R + 4}" r="4" fill="#4ade80" stroke="#0c0e14" stroke-width="1.5"/>`;
        }
        svg += `</g>`;
    }

    // Transparent hit areas for hover/click (larger than the visible nodes)
    for (let i = 0; i < nodes.length; i++) {
        const p = positions[i];
        if (!p) continue;
        svg += `<circle class="sp-web-hit" data-idx="${i}" cx="${p.x}" cy="${p.y}" r="${NODE_R + 10}" fill="transparent" style="cursor:pointer"/>`;
    }

    svg += '</svg>';
    return svg;
}

// ── Tooltip ────────────────────────────────────────────────────────────
// Shows the hovered node's details + any incident edges (both user and NPC).
function _showTooltip(graph, nodeIdx, x, y) {
    _hideTooltip();
    const node = graph.nodes[nodeIdx];
    const tip = document.createElement('div');
    tip.className = 'sp-web-tooltip';

    let html = `<div class="sp-web-tip-name" style="color:${node.color}">${esc(node.name)}</div>`;
    if (node.role) html += `<div class="sp-web-tip-role">${esc(node.role)}</div>`;

    // User-facing edge details (if this node has a direct connection to {{user}})
    const userEdge = graph.edges.find(e => e.kind === 'user' && (e.from === nodeIdx || e.to === nodeIdx));
    if (userEdge) {
        if (userEdge.relType) html += `<div class="sp-web-tip-type">${esc(userEdge.relType)}</div>`;
        html += '<div class="sp-web-tip-meters">';
        for (const [k, label] of [['affection', t('Affection')], ['trust', t('Trust')], ['stress', t('Stress')]]) {
            const v = userEdge[k] ?? 0;
            html += `<div class="sp-web-tip-meter"><span>${label}</span><span style="color:${METER_COLORS[k]};font-weight:700">${v}</span></div>`;
        }
        html += '</div>';
    }

    // NPC edges incident to this node — compact list with label + glyph
    const npcIncident = graph.edges.filter(e => e.kind === 'npc' && (e.from === nodeIdx || e.to === nodeIdx));
    if (npcIncident.length) {
        html += '<div class="sp-web-tip-npc-list">';
        for (const e of npcIncident) {
            const otherIdx = e.from === nodeIdx ? e.to : e.from;
            const other = graph.nodes[otherIdx];
            if (!other) continue;
            const col = _npcEdgeColor(e.type);
            const glyph = EDGE_GLYPHS[e.type] || '';
            const dirSymbol = e.direction === 'reciprocal' ? '\u21C4' : (e.from === nodeIdx ? '\u2192' : '\u2190');
            html += `<div class="sp-web-tip-npc-row"><span class="sp-web-tip-glyph" style="color:${col}">${glyph}</span><span class="sp-web-tip-dir">${dirSymbol}</span><span class="sp-web-tip-other" style="color:${other.color}">${esc(other.name)}</span><span class="sp-web-tip-label">${esc(e.label || e.type)}</span></div>`;
        }
        html += '</div>';
    }

    if (!node.isUser && !node.inScene) html += `<div class="sp-web-tip-absent">${t('Absent')}</div>`;

    tip.innerHTML = html;
    const vw = window.innerWidth, vh = window.innerHeight;
    let tx = x + 12, ty = y - 10;
    if (tx + 240 > vw) tx = x - 250;
    if (ty < 10) ty = y + 15;
    if (ty + 220 > vh) ty = vh - 230;
    tip.style.left = tx + 'px';
    tip.style.top = ty + 'px';
    document.body.appendChild(tip);
}
function _hideTooltip() { document.querySelectorAll('.sp-web-tooltip').forEach(t => t.remove()); }

// ── Main entry point ───────────────────────────────────────────────────
export function openRelationshipWeb(entries) {
    document.querySelector('.sp-web-overlay')?.remove();
    if (!entries?.length) return;

    let userName = '';
    try { userName = SillyTavern.getContext().name1 || 'You'; } catch { userName = 'You'; }

    // State: layoutMode ("force" | "circular") persists across re-renders
    // of the same overlay session. Default "force" — the new v6.8.27
    // layout. User can toggle to "circular" via the toolbar button.
    let layoutMode = 'force';
    // NPC edges loaded from cache at open; regenerate button refreshes.
    let npcEdges = isGraphEnabled() ? (getCachedEdges() || []) : [];

    function _rerender() {
        const graph = _buildGraph(entries, npcEdges, userName);
        const positions = layoutMode === 'force'
            ? _layoutForceDirected(graph.nodes, graph.edges, graph.userIdx)
            : _layoutCircular(graph.nodes, graph.userIdx);
        const svgWrap = overlay.querySelector('.sp-web-svg-wrap');
        if (svgWrap) svgWrap.innerHTML = _buildSvg(graph, positions, userName);
        const footer = overlay.querySelector('.sp-web-footer');
        if (footer) {
            const userEdges = graph.edges.filter(e => e.kind === 'user').length;
            const npcEdgeCount = graph.edges.filter(e => e.kind === 'npc').length;
            const stale = isGraphEnabled() && isCacheStale();
            const staleIndicator = stale ? ' \u00B7 <span class="sp-web-stale">' + t('graph outdated') + '</span>' : '';
            footer.innerHTML = `${graph.nodes.length - 1} ${t('characters')} \u00B7 ${userEdges} ${t('user ties')}${npcEdgeCount ? ' \u00B7 ' + npcEdgeCount + ' ' + t('NPC ties') : ''}${staleIndicator}`;
        }
        _attachNodeHandlers(graph);
    }

    function _attachNodeHandlers(graph) {
        overlay.querySelectorAll('.sp-web-hit').forEach(hit => {
            const idx = Number(hit.dataset.idx);
            hit.addEventListener('mouseenter', (e) => _showTooltip(graph, idx, e.clientX, e.clientY));
            hit.addEventListener('mouseleave', () => _hideTooltip());
            hit.addEventListener('click', (e) => {
                e.stopPropagation();
                _showTooltip(graph, idx, e.clientX, e.clientY);
            });
        });
    }

    // Build overlay shell. Layout toggle + NPC generate button live in the header.
    const overlay = document.createElement('div');
    overlay.className = 'sp-web-overlay';
    const graphEnabled = isGraphEnabled();
    const hasCache = graphEnabled && getCachedEdges() !== null;
    const generateBtnLabel = hasCache ? t('Regenerate NPC graph') : t('Generate NPC graph');
    overlay.innerHTML = `<div class="sp-web-container">
        <div class="sp-web-header">
            <div class="sp-web-title">${t('Relationship Web')}</div>
            <div class="sp-web-legend">
                <span style="color:#f472b6">\u25CF ${t('Affection')}</span>
                <span style="color:#60a5fa">\u25CF ${t('Trust')}</span>
                <span style="color:#facc15;font-size:9px">--- ${t('Stress')}</span>
            </div>
            <button class="sp-web-layout-toggle" title="${t('Toggle layout (force/circular)')}">\u26B2</button>
            ${graphEnabled ? `<button class="sp-web-generate-btn" title="${esc(generateBtnLabel)}">\u21BB ${t('NPC')}</button>` : ''}
            <button class="sp-web-close">\u2715</button>
        </div>
        <div class="sp-web-svg-wrap"></div>
        <div class="sp-web-footer"></div>
    </div>`;

    // Close handlers
    const _escHandler = (e) => { if (e.key === 'Escape') _close(); };
    function _close() { _hideTooltip(); overlay.remove(); document.removeEventListener('keydown', _escHandler); }
    overlay.querySelector('.sp-web-close').addEventListener('click', _close);
    overlay.addEventListener('click', e => { if (e.target === overlay) { _hideTooltip(); _close(); } });
    document.addEventListener('keydown', _escHandler);

    // Layout toggle
    overlay.querySelector('.sp-web-layout-toggle').addEventListener('click', (e) => {
        e.stopPropagation();
        layoutMode = layoutMode === 'force' ? 'circular' : 'force';
        _rerender();
    });

    // NPC graph generate / regenerate button
    const genBtn = overlay.querySelector('.sp-web-generate-btn');
    if (genBtn) {
        genBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (genBtn.classList.contains('sp-web-loading')) return;
            genBtn.classList.add('sp-web-loading');
            genBtn.disabled = true;
            const origText = genBtn.innerHTML;
            genBtn.innerHTML = '\u29D6 ' + t('Generating...');
            try {
                const fresh = await generateGraph();
                npcEdges = fresh || [];
                _rerender();
                log('Relationship Web: generated', npcEdges.length, 'NPC edges');
            } catch (err) {
                warn('Relationship Web: graph generation failed:', err?.message);
                genBtn.innerHTML = '\u2716 ' + t('Failed');
                setTimeout(() => { genBtn.innerHTML = origText; }, 2000);
            } finally {
                genBtn.classList.remove('sp-web-loading');
                genBtn.disabled = false;
                if (genBtn.innerHTML.includes('Generating')) genBtn.innerHTML = origText;
            }
        });
    }

    document.body.appendChild(overlay);
    _rerender();
    log('Relationship Web: opened with', entries.length, 'NPCs,', npcEdges.length, 'NPC edges, layout=', layoutMode);
}
