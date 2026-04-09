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

// ── Focus computation ─────────────────────────────────────────────────
// v6.8.28: when the user clicks a node, we enter focus mode. Unrelated
// nodes and edges fade out so only the focused node's subgraph is
// visible. This is the biggest readability improvement for dense webs.
// Returns a Set of node indexes that are "in focus" — either the
// focused node itself or any of its direct neighbors.
function _computeFocusSet(graph, focusedIdx) {
    if (focusedIdx == null || focusedIdx < 0) return null;
    const focus = new Set([focusedIdx]);
    for (const e of graph.edges) {
        if (e.from === focusedIdx) focus.add(e.to);
        if (e.to === focusedIdx) focus.add(e.from);
    }
    return focus;
}

// ── Label positioning with collision avoidance ────────────────────────
// v6.8.28: edge labels render at the midpoint of each curved edge with
// a background rect for legibility. When multiple labels fall within
// a small pixel window, we offset subsequent labels along the edge
// normal so they don't stack on top of each other.
function _layoutEdgeLabels(edgePositions) {
    const MIN_DIST = 42; // pixels below which labels are considered colliding
    const placed = [];
    for (const lp of edgePositions) {
        let offset = 0;
        let attempts = 0;
        let trial = { x: lp.x, y: lp.y };
        while (attempts < 6) {
            let collided = false;
            for (const p of placed) {
                const dx = trial.x - p.x;
                const dy = trial.y - p.y;
                if (dx * dx + dy * dy < MIN_DIST * MIN_DIST) {
                    collided = true;
                    break;
                }
            }
            if (!collided) break;
            // Push the label along the edge normal by a growing amount
            offset += 14;
            trial = {
                x: lp.x + lp.nx * offset,
                y: lp.y + lp.ny * offset,
            };
            attempts++;
        }
        lp.x = trial.x;
        lp.y = trial.y;
        placed.push(lp);
    }
    return edgePositions;
}

// ── SVG building ───────────────────────────────────────────────────────
function _buildSvg(graph, positions, userName, state) {
    const { nodes, edges, userIdx } = graph;
    const userPos = positions[userIdx];
    const focusSet = _computeFocusSet(graph, state?.focusedIdx);
    const filterSet = state?.filter; // Set of active edge types, or null = show all
    const vb = state?.viewBox || { x: 0, y: 0, w: W, h: H };
    const showLabels = state?.showLabels !== false; // default true
    const isUserEdgeVisible = filterSet == null || filterSet.has('user');

    let svg = `<svg viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;max-height:72vh" role="img" aria-label="${esc(t('Relationship Web'))}">`;
    svg += `<title>${esc(t('Relationship Web'))}</title>`;

    // Background
    svg += `<rect width="${W}" height="${H}" fill="#0c0e14" rx="8"/>`;

    // Subtle radial grid centered on user
    for (const r of [80, 160, 240, 320]) {
        svg += `<circle cx="${userPos.x}" cy="${userPos.y}" r="${r}" fill="none" stroke="#1a1e2a" stroke-width="0.5"/>`;
    }

    // ── Edges (drawn first, behind nodes) ──
    // v6.8.28: filter by active edge-type set, fade if focus mode is on
    // and this edge isn't adjacent to the focused node, and collect
    // label positions for a second rendering pass with collision
    // avoidance.
    const labelPositions = [];
    let edgeIdx = 0;
    for (const edge of edges) {
        const from = positions[edge.from];
        const to = positions[edge.to];
        if (!from || !to) continue;

        // Filter: skip the edge entirely if its type isn't in the active set
        if (filterSet != null) {
            const typeKey = edge.kind === 'user' ? 'user' : edge.type;
            if (!filterSet.has(typeKey)) { edgeIdx++; continue; }
        }

        // Focus dimming: if focus mode is on and neither endpoint is in
        // the focus set, draw the edge at very low opacity instead of
        // skipping it (so the structural shape of the whole graph is
        // still visible in the background).
        const focusDim = focusSet != null && !(focusSet.has(edge.from) && focusSet.has(edge.to));
        const dimFactor = focusDim ? 0.15 : 1;

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
            const col = _userEdgeColor(edge.affection);
            const w = _userEdgeWidth(edge.trust);
            const stressDim = edge.stress > 70 ? 0.4 : 0.7;
            const opacity = stressDim * dimFactor;
            svg += `<path class="sp-web-edge sp-web-edge-user" d="M${from.x},${from.y} Q${cpx},${cpy} ${to.x},${to.y}" fill="none" stroke="${col}" stroke-width="${w}" opacity="${opacity}" stroke-linecap="round"/>`;
            if (edge.stress > 60) {
                svg += `<path d="M${from.x},${from.y} Q${cpx},${cpy} ${to.x},${to.y}" fill="none" stroke="${METER_COLORS.stress}" stroke-width="1" opacity="${0.3 * dimFactor}" stroke-dasharray="4 4" stroke-linecap="round"/>`;
            }
            // User-edge label: the relType (e.g. "partner", "ex-wife") if present
            if (showLabels && edge.relType && !focusDim) {
                labelPositions.push({
                    x: cpx, y: cpy, nx, ny,
                    text: edge.relType,
                    color: col,
                });
            }
        } else {
            const col = _npcEdgeColor(edge.type);
            const w = 2.2;
            const opacity = 0.72 * dimFactor;
            if (edge.direction === 'reciprocal') {
                const bezMx = 0.25 * from.x + 0.5 * cpx + 0.25 * to.x;
                const bezMy = 0.25 * from.y + 0.5 * cpy + 0.25 * to.y;
                const fromColor = nodes[edge.from].color;
                const toColor = nodes[edge.to].color;
                const cp1x = from.x + (cpx - from.x) * 0.5;
                const cp1y = from.y + (cpy - from.y) * 0.5;
                svg += `<path class="sp-web-edge sp-web-edge-npc" d="M${from.x},${from.y} Q${cp1x},${cp1y} ${bezMx},${bezMy}" fill="none" stroke="${fromColor}" stroke-width="${w}" opacity="${opacity}" stroke-linecap="round"/>`;
                const cp2x = to.x + (cpx - to.x) * 0.5;
                const cp2y = to.y + (cpy - to.y) * 0.5;
                svg += `<path class="sp-web-edge sp-web-edge-npc" d="M${bezMx},${bezMy} Q${cp2x},${cp2y} ${to.x},${to.y}" fill="none" stroke="${toColor}" stroke-width="${w}" opacity="${opacity}" stroke-linecap="round"/>`;
                svg += `<path d="M${from.x},${from.y} Q${cpx},${cpy} ${to.x},${to.y}" fill="none" stroke="${col}" stroke-width="1" opacity="${0.4 * dimFactor}" stroke-linecap="round"/>`;
            } else {
                svg += `<path class="sp-web-edge sp-web-edge-npc" d="M${from.x},${from.y} Q${cpx},${cpy} ${to.x},${to.y}" fill="none" stroke="${col}" stroke-width="${w}" opacity="${opacity}" stroke-linecap="round"/>`;
            }
            // Glyph circle — dimmed if focus-filtered
            const glyph = EDGE_GLYPHS[edge.type] || '';
            if (glyph && !focusDim) {
                svg += `<g class="sp-web-edge-glyph">`;
                svg += `<circle cx="${cpx}" cy="${cpy}" r="9" fill="#0c0e14" stroke="${col}" stroke-width="1"/>`;
                svg += `<text x="${cpx}" y="${cpy + 3}" text-anchor="middle" dominant-baseline="central" font-size="11" fill="${col}">${glyph}</text>`;
                svg += `</g>`;
            }
            // Collect label for second rendering pass
            if (showLabels && edge.label && !focusDim) {
                // Position label slightly offset from the glyph so they don't overlap
                labelPositions.push({
                    x: cpx + nx * offsetSign * 16,
                    y: cpy + ny * offsetSign * 16,
                    nx: nx * offsetSign,
                    ny: ny * offsetSign,
                    text: edge.label.length > 22 ? edge.label.substring(0, 20) + '\u2026' : edge.label,
                    color: col,
                });
            }
        }
        edgeIdx++;
    }

    // ── Edge labels (second pass, with collision avoidance) ────────────
    // v6.8.28: render labels with background rect after collision
    // avoidance so no two labels stack. Uses a monospace-ish approach
    // where text width is approximated from character count.
    if (showLabels && labelPositions.length) {
        _layoutEdgeLabels(labelPositions);
        for (const lp of labelPositions) {
            const txtWidth = lp.text.length * 5.6 + 10; // rough approximation at 9px
            const rectX = lp.x - txtWidth / 2;
            const rectY = lp.y - 8;
            svg += `<g class="sp-web-edge-label" pointer-events="none">`;
            svg += `<rect x="${rectX}" y="${rectY}" width="${txtWidth}" height="14" rx="3" fill="#0c0e14" stroke="${lp.color}" stroke-width="0.8" opacity="0.92"/>`;
            svg += `<text x="${lp.x}" y="${lp.y + 3}" text-anchor="middle" dominant-baseline="central" font-size="9" fill="${lp.color}" font-weight="600">${esc(lp.text)}</text>`;
            svg += `</g>`;
        }
    }

    // ── Nodes ──
    for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const p = positions[i];
        if (!p) continue;
        const isUser = n.isUser;
        const r = isUser ? CENTER_R + 2 : NODE_R;
        // v6.8.28: focus mode dims unrelated nodes to 15% so the
        // selected subgraph stands out. The focused node itself +
        // its direct neighbors stay at full opacity.
        const focusDim = focusSet != null && !focusSet.has(i);
        const baseOpacity = isUser ? 1 : (n.inScene ? 1 : 0.5);
        const nodeOpacity = focusDim ? 0.15 : baseOpacity;
        const isFocused = state?.focusedIdx === i;
        svg += `<g class="sp-web-node ${isFocused ? 'sp-web-node-focused' : ''}" data-idx="${i}" style="cursor:pointer;opacity:${nodeOpacity}">`;
        svg += `<title>${esc(n.name)}${n.role ? ' — ' + esc(n.role) : ''}</title>`;
        const strokeWidth = isFocused ? (isUser ? 4 : 3.5) : (isUser ? 2.5 : 2);
        svg += `<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="${n.bg}" stroke="${n.color}" stroke-width="${strokeWidth}"${isFocused ? ` filter="drop-shadow(0 0 6px ${n.color})"` : ''}/>`;
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

// ── Edge type descriptions for legend ─────────────────────────────────
// v6.8.28: one-line descriptions shown in the legend panel so users can
// decode what each color + glyph means without guessing.
const EDGE_TYPE_LABELS = {
    user: { label: 'Ties to you', desc: 'NPC\u2192you meters (affection/trust)' },
    family: { label: 'Family', desc: 'Blood or legal kin' },
    friend: { label: 'Friend', desc: 'Platonic bond' },
    ally: { label: 'Ally', desc: 'Actively supports' },
    rival: { label: 'Rival', desc: 'Competitive, not hostile' },
    antagonist: { label: 'Antagonist', desc: 'Actively opposes' },
    mentor: { label: 'Mentor', desc: 'Teaches / guides' },
    authority: { label: 'Authority', desc: 'Institutional power' },
    lover: { label: 'Lover', desc: 'Romantic bond' },
    lust: { label: 'Lust', desc: 'Purely physical' },
    acquaintance: { label: 'Acquaintance', desc: 'Weak tie' },
    unknown: { label: 'Unknown', desc: 'Type unclear' },
};

// ── Main entry point ───────────────────────────────────────────────────
export function openRelationshipWeb(entries) {
    document.querySelector('.sp-web-overlay')?.remove();
    if (!entries?.length) return;

    let userName = '';
    try { userName = SillyTavern.getContext().name1 || 'You'; } catch { userName = 'You'; }

    // v6.8.28: expanded session state for Phase 2 features.
    //   layoutMode      — "force" | "circular" (toggle)
    //   focusedIdx      — node index that has subgraph focus, or null
    //   filter          — Set<string> of visible edge types, or null=all
    //   showLabels      — toggle edge labels on/off
    //   viewBox         — SVG viewBox for zoom/pan {x,y,w,h}
    //   positions       — persistent node positions (for drag-to-reposition)
    //   draggedIdx      — node being dragged, or null
    let layoutMode = 'force';
    let npcEdges = isGraphEnabled() ? (getCachedEdges() || []) : [];
    let focusedIdx = null;
    let filter = null; // null = show all types
    let showLabels = true;
    let viewBox = { x: 0, y: 0, w: W, h: H };
    let positions = null; // computed on first render, persisted for drag
    let currentGraph = null;
    let draggedIdx = null;

    function _rerender() {
        const graph = _buildGraph(entries, npcEdges, userName);
        currentGraph = graph;
        // Only recompute positions when the roster changes or layout mode
        // changes. Dragged positions should persist across re-renders
        // triggered by hover / filter / focus changes.
        if (!positions || positions.length !== graph.nodes.length) {
            positions = layoutMode === 'force'
                ? _layoutForceDirected(graph.nodes, graph.edges, graph.userIdx)
                : _layoutCircular(graph.nodes, graph.userIdx);
        }
        const state = { focusedIdx, filter, showLabels, viewBox };
        const svgWrap = overlay.querySelector('.sp-web-svg-wrap');
        if (svgWrap) svgWrap.innerHTML = _buildSvg(graph, positions, userName, state);
        const footer = overlay.querySelector('.sp-web-footer');
        if (footer) {
            const userEdgeCount = graph.edges.filter(e => e.kind === 'user').length;
            const npcEdgeCount = graph.edges.filter(e => e.kind === 'npc').length;
            const stale = isGraphEnabled() && isCacheStale();
            const staleIndicator = stale ? ' \u00B7 <span class="sp-web-stale">' + t('graph outdated') + '</span>' : '';
            const focusIndicator = focusedIdx != null ? ' \u00B7 <span class="sp-web-focus-note">' + t('focused on') + ' ' + esc(graph.nodes[focusedIdx]?.name || '?') + '</span>' : '';
            footer.innerHTML = `${graph.nodes.length - 1} ${t('characters')} \u00B7 ${userEdgeCount} ${t('user ties')}${npcEdgeCount ? ' \u00B7 ' + npcEdgeCount + ' ' + t('NPC ties') : ''}${staleIndicator}${focusIndicator}`;
        }
        _updateLegendCounts(graph);
        _attachNodeHandlers(graph);
        _attachDragHandlers(graph);
    }

    function _relayout() {
        // Force-recompute positions (used when layout mode changes or
        // the user clicks the "reset positions" button).
        positions = null;
        _rerender();
    }

    function _updateLegendCounts(graph) {
        // Count edges per type so the legend can show (n) next to each row
        // and auto-hide types with 0 edges.
        const counts = {};
        for (const e of graph.edges) {
            const k = e.kind === 'user' ? 'user' : e.type;
            counts[k] = (counts[k] || 0) + 1;
        }
        overlay.querySelectorAll('.sp-web-legend-row').forEach(row => {
            const typeKey = row.dataset.type;
            const count = counts[typeKey] || 0;
            const countEl = row.querySelector('.sp-web-legend-count');
            if (countEl) countEl.textContent = count;
            row.classList.toggle('sp-web-legend-empty', count === 0);
            // Visually mark filtered-out rows
            const active = filter == null || filter.has(typeKey);
            row.classList.toggle('sp-web-legend-inactive', !active);
        });
    }

    function _attachNodeHandlers(graph) {
        overlay.querySelectorAll('.sp-web-hit').forEach(hit => {
            const idx = Number(hit.dataset.idx);
            hit.addEventListener('mouseenter', (e) => {
                if (draggedIdx != null) return;
                _showTooltip(graph, idx, e.clientX, e.clientY);
            });
            hit.addEventListener('mouseleave', () => _hideTooltip());
            hit.addEventListener('click', (e) => {
                e.stopPropagation();
                // Click-to-focus: clicking a node toggles focus mode.
                // Clicking the already-focused node clears focus.
                if (focusedIdx === idx) {
                    focusedIdx = null;
                } else {
                    focusedIdx = idx;
                }
                _hideTooltip();
                _rerender();
            });
        });
    }

    function _attachDragHandlers(graph) {
        // v6.8.28: drag-to-reposition nodes. The position persists across
        // re-renders until the user clicks "Reset positions" or the
        // roster changes. Uses pointer events (mouse + touch unified).
        const svgEl = overlay.querySelector('.sp-web-svg-wrap svg');
        if (!svgEl) return;

        function _pointerToSvg(e) {
            // Convert client coordinates to SVG viewBox coordinates
            const rect = svgEl.getBoundingClientRect();
            const relX = (e.clientX - rect.left) / rect.width;
            const relY = (e.clientY - rect.top) / rect.height;
            return {
                x: viewBox.x + relX * viewBox.w,
                y: viewBox.y + relY * viewBox.h,
            };
        }

        overlay.querySelectorAll('.sp-web-hit').forEach(hit => {
            const idx = Number(hit.dataset.idx);
            // Don't allow dragging the {{user}} node — it's anchored
            if (idx === graph.userIdx) return;
            hit.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                e.preventDefault();
                draggedIdx = idx;
                hit.setPointerCapture?.(e.pointerId);
            });
        });

        svgEl.addEventListener('pointermove', (e) => {
            if (draggedIdx == null) return;
            const p = _pointerToSvg(e);
            positions[draggedIdx] = { x: clamp(p.x, NODE_R, W - NODE_R), y: clamp(p.y, NODE_R, H - NODE_R) };
            _rerender();
        });
        svgEl.addEventListener('pointerup', () => { draggedIdx = null; });
        svgEl.addEventListener('pointercancel', () => { draggedIdx = null; });
    }

    function _attachZoomPanHandlers() {
        const svgWrap = overlay.querySelector('.sp-web-svg-wrap');
        if (!svgWrap) return;

        // Zoom on wheel — zoom about the cursor position for intuitive feel
        svgWrap.addEventListener('wheel', (e) => {
            e.preventDefault();
            const svgEl = svgWrap.querySelector('svg');
            if (!svgEl) return;
            const rect = svgEl.getBoundingClientRect();
            const relX = (e.clientX - rect.left) / rect.width;
            const relY = (e.clientY - rect.top) / rect.height;
            // Cursor position in current viewBox coordinates
            const cx = viewBox.x + relX * viewBox.w;
            const cy = viewBox.y + relY * viewBox.h;
            const factor = e.deltaY > 0 ? 1.15 : 1 / 1.15;
            const newW = clamp(viewBox.w * factor, W * 0.25, W * 3);
            const newH = clamp(viewBox.h * factor, H * 0.25, H * 3);
            // Keep the cursor at the same SVG coordinate after zoom
            viewBox = {
                x: cx - (cx - viewBox.x) * (newW / viewBox.w),
                y: cy - (cy - viewBox.y) * (newH / viewBox.h),
                w: newW,
                h: newH,
            };
            _rerender();
        }, { passive: false });

        // Pan on middle-click drag OR on background click-drag (when not
        // dragging a node)
        let panning = false;
        let panStart = null;
        svgWrap.addEventListener('pointerdown', (e) => {
            // Only initiate pan if the click is on the SVG background,
            // NOT on a node hit area
            if (e.target.closest('.sp-web-hit') || e.target.closest('.sp-web-node')) return;
            if (draggedIdx != null) return;
            panning = true;
            panStart = { x: e.clientX, y: e.clientY, vbx: viewBox.x, vby: viewBox.y };
        });
        svgWrap.addEventListener('pointermove', (e) => {
            if (!panning || !panStart) return;
            const svgEl = svgWrap.querySelector('svg');
            if (!svgEl) return;
            const rect = svgEl.getBoundingClientRect();
            const dx = (e.clientX - panStart.x) * (viewBox.w / rect.width);
            const dy = (e.clientY - panStart.y) * (viewBox.h / rect.height);
            viewBox = { ...viewBox, x: panStart.vbx - dx, y: panStart.vby - dy };
            _rerender();
        });
        svgWrap.addEventListener('pointerup', () => { panning = false; panStart = null; });
        svgWrap.addEventListener('pointercancel', () => { panning = false; panStart = null; });
    }

    // ── Build the legend panel markup ──
    // v6.8.28: legend is a vertical panel on the right side of the overlay.
    // Each row shows color swatch + glyph + label + count + description.
    // Clicking a row toggles that type in the filter. "All" row resets.
    const legendTypes = ['user', 'family', 'friend', 'ally', 'rival', 'antagonist', 'mentor', 'authority', 'lover', 'lust', 'acquaintance', 'unknown'];
    function _buildLegendHtml() {
        let html = '<div class="sp-web-legend-panel">';
        html += `<div class="sp-web-legend-header">${t('Legend')}</div>`;
        html += `<div class="sp-web-legend-row sp-web-legend-all" data-type="__all__"><span class="sp-web-legend-label">${t('Show all')}</span></div>`;
        for (const typeKey of legendTypes) {
            const meta = EDGE_TYPE_LABELS[typeKey] || { label: typeKey, desc: '' };
            let color, glyph;
            if (typeKey === 'user') {
                color = '#f472b6'; // affection pink
                glyph = '\u2764';  // filled heart
            } else {
                color = EDGE_COLORS[typeKey] || '#9a9a9a';
                glyph = EDGE_GLYPHS[typeKey] || '';
            }
            html += `<div class="sp-web-legend-row" data-type="${esc(typeKey)}" title="${esc(meta.desc)}">`;
            html += `<span class="sp-web-legend-swatch" style="background:${color}"></span>`;
            html += `<span class="sp-web-legend-glyph" style="color:${color}">${glyph}</span>`;
            html += `<span class="sp-web-legend-label">${esc(t(meta.label))}</span>`;
            html += `<span class="sp-web-legend-count">0</span>`;
            html += `</div>`;
        }
        html += '</div>';
        return html;
    }

    // Build overlay shell.
    const overlay = document.createElement('div');
    overlay.className = 'sp-web-overlay';
    const graphEnabled = isGraphEnabled();
    const hasCache = graphEnabled && getCachedEdges() !== null;
    const generateBtnLabel = hasCache ? t('Regenerate NPC graph') : t('Generate NPC graph');
    overlay.innerHTML = `<div class="sp-web-container">
        <div class="sp-web-header">
            <div class="sp-web-title">${t('Relationship Web')}</div>
            <div class="sp-web-toolbar">
                <button class="sp-web-labels-toggle sp-web-tb-active" title="${t('Toggle edge labels')}">${t('Labels')}</button>
                <button class="sp-web-reset-btn" title="${t('Reset view (zoom + positions)')}">\u2921</button>
                <button class="sp-web-layout-toggle" title="${t('Toggle layout (force/circular)')}">\u26B2</button>
                ${graphEnabled ? `<button class="sp-web-generate-btn" title="${esc(generateBtnLabel)}">\u21BB ${t('NPC')}</button>` : ''}
                <button class="sp-web-close">\u2715</button>
            </div>
        </div>
        <div class="sp-web-body">
            <div class="sp-web-svg-wrap"></div>
            ${_buildLegendHtml()}
        </div>
        <div class="sp-web-footer"></div>
    </div>`;

    // Close handlers
    const _escHandler = (e) => {
        if (e.key === 'Escape') {
            // Escape: if focused on a node, unfocus first; otherwise close
            if (focusedIdx != null) { focusedIdx = null; _rerender(); return; }
            _close();
        }
    };
    function _close() { _hideTooltip(); overlay.remove(); document.removeEventListener('keydown', _escHandler); }
    overlay.querySelector('.sp-web-close').addEventListener('click', _close);
    overlay.addEventListener('click', e => { if (e.target === overlay) { _hideTooltip(); _close(); } });
    document.addEventListener('keydown', _escHandler);

    // Layout toggle
    overlay.querySelector('.sp-web-layout-toggle').addEventListener('click', (e) => {
        e.stopPropagation();
        layoutMode = layoutMode === 'force' ? 'circular' : 'force';
        _relayout();
    });

    // Labels toggle
    overlay.querySelector('.sp-web-labels-toggle').addEventListener('click', (e) => {
        e.stopPropagation();
        showLabels = !showLabels;
        e.currentTarget.classList.toggle('sp-web-tb-active', showLabels);
        _rerender();
    });

    // Reset view (zoom + pan + positions + focus)
    overlay.querySelector('.sp-web-reset-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        viewBox = { x: 0, y: 0, w: W, h: H };
        focusedIdx = null;
        filter = null;
        _relayout();
    });

    // Legend row click → toggle filter
    overlay.querySelectorAll('.sp-web-legend-row').forEach(row => {
        row.addEventListener('click', (e) => {
            e.stopPropagation();
            const typeKey = row.dataset.type;
            if (typeKey === '__all__') {
                filter = null;
                _rerender();
                return;
            }
            if (filter == null) {
                // First filter click: start with ONLY this type active
                filter = new Set([typeKey]);
            } else if (filter.has(typeKey)) {
                filter.delete(typeKey);
                if (filter.size === 0) filter = null;
            } else {
                filter.add(typeKey);
            }
            _rerender();
        });
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
                _relayout();
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
    _attachZoomPanHandlers();
    log('Relationship Web: opened with', entries.length, 'NPCs,', npcEdges.length, 'NPC edges, layout=', layoutMode);
}
