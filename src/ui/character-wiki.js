// src/ui/character-wiki.js — Character Wiki: historical character browser overlay
import { log } from '../logger.js';
import { t } from '../i18n.js';
import { esc, clamp } from '../utils.js';
import { getTrackerData, getLatestSnapshot, getPrevSnapshot, getSettings, saveSettings } from '../settings.js';
import { normalizeTracker } from '../normalize.js';
import { charColor } from '../color.js';
import { createSparklineCanvas, _scrollToMessage } from './sparklines.js';
import { currentSnapshotMesIdx } from '../state.js';

// ── Name matching (same fuzzy logic as sparklines.js getMeterHistory) ──
function _nameMatch(a, b) {
    if (!a || !b) return false;
    const al = a.toLowerCase().trim(), bl = b.toLowerCase().trim();
    if (al === bl) return true;
    if (al.startsWith(bl + ' ') || bl.startsWith(al + ' ')) return true;
    const af = al.split(/\s/)[0], bf = bl.split(/\s/)[0];
    return af === bf && af.length > 2;
}

// ── Notes storage ──
function _getNotes() { return getSettings().wikiNotes || {}; }
function _saveNote(name, text) {
    const s = getSettings();
    if (!s.wikiNotes) s.wikiNotes = {};
    const key = name.toLowerCase().trim();
    if (text.trim()) s.wikiNotes[key] = text.trim();
    else delete s.wikiNotes[key];
    saveSettings();
}
function _getNote(name) { return _getNotes()[name.toLowerCase().trim()] || ''; }

// ── Character avatar URL ──
function _getAvatarUrl() {
    try {
        const ctx = SillyTavern.getContext();
        const chars = ctx.characters;
        if (!chars?.length) return {};
        const map = {};
        for (const c of chars) {
            if (c.avatar) map[(c.name || '').toLowerCase().trim()] = `/characters/${encodeURIComponent(c.avatar)}`;
        }
        return map;
    } catch { return {}; }
}

// ── Build wiki entries from snapshot data ──
function _buildEntries() {
    const latest = getLatestSnapshot();
    if (!latest) return [];
    const norm = normalizeTracker(latest);
    const chars = norm.characters || [];
    const rels = norm.relationships || [];
    const cp = (norm.charactersPresent || []).map(n => (n || '').toLowerCase().trim());
    const presentSet = new Set(cp);

    const data = getTrackerData();
    const snapKeys = Object.keys(data.snapshots).map(Number).sort((a, b) => a - b);
    const meta = new Map();

    for (const key of snapKeys) {
        const snap = data.snapshots[String(key)];
        if (!snap) continue;
        const snapChars = snap.characters || [];
        const snapPresent = (snap.charactersPresent || []).map(n => (n || '').toLowerCase().trim());
        for (const ch of snapChars) {
            const cn = (ch.name || '').toLowerCase().trim();
            if (!cn || cn === '?') continue;
            if (!meta.has(cn)) meta.set(cn, { firstSeen: key, lastSeen: key, appearances: 0, lastLocation: '' });
            const m = meta.get(cn);
            if (snapPresent.includes(cn) || snapPresent.some(p => _nameMatch(p, cn))) {
                m.lastSeen = key;
                m.appearances++;
                m.lastLocation = snap.location || m.lastLocation;
            }
        }
    }

    const prevSnap = getPrevSnapshot(currentSnapshotMesIdx || snapKeys[snapKeys.length - 1] || 0);
    const prevRelMap = {};
    if (prevSnap?.relationships) {
        for (const pr of (Array.isArray(prevSnap.relationships) ? prevSnap.relationships : []))
            prevRelMap[(pr.name || '').toLowerCase()] = pr;
    }

    const avatarMap = _getAvatarUrl();
    const entries = [];
    const seen = new Set();
    for (const ch of chars) {
        const cn = (ch.name || '').toLowerCase().trim();
        if (!cn || cn === '?' || seen.has(cn)) continue;
        seen.add(cn);
        const rel = rels.find(r => _nameMatch(r.name, ch.name)) || null;
        const inScene = presentSet.has(cn) || cp.some(p => _nameMatch(p, cn));
        const m = meta.get(cn) || {};
        const prevRel = prevRelMap[cn] || null;
        entries.push({
            name: ch.name, character: ch, relationship: rel, prevRelationship: prevRel, inScene,
            firstSeen: m.firstSeen || 0, lastSeen: m.lastSeen || 0,
            appearances: m.appearances || 0, lastLocation: m.lastLocation || '',
            color: charColor(ch.name), avatarUrl: avatarMap[cn] || '',
        });
    }
    for (const rel of rels) {
        const rn = (rel.name || '').toLowerCase().trim();
        if (!rn || seen.has(rn)) continue;
        if ([...seen].some(s => _nameMatch(s, rn))) continue;
        seen.add(rn);
        const inScene = presentSet.has(rn) || cp.some(p => _nameMatch(p, rn));
        const m = meta.get(rn) || {};
        const prevRel = prevRelMap[rn] || null;
        entries.push({
            name: rel.name, character: { name: rel.name, role: rel.relType || '' },
            relationship: rel, prevRelationship: prevRel, inScene,
            firstSeen: m.firstSeen || 0, lastSeen: m.lastSeen || 0,
            appearances: m.appearances || 0, lastLocation: m.lastLocation || '',
            color: charColor(rel.name), avatarUrl: avatarMap[rn] || '',
        });
    }
    return entries;
}

// ── Sort ──
function _sortEntries(entries, sortKey) {
    let charName = '';
    try { charName = (SillyTavern.getContext().name2 || '').toLowerCase(); } catch {}
    return [...entries].sort((a, b) => {
        const aMain = _nameMatch(a.name, charName), bMain = _nameMatch(b.name, charName);
        if (aMain && !bMain) return -1;
        if (bMain && !aMain) return 1;
        if (sortKey === 'name' || sortKey === 'default') {
            if (a.inScene && !b.inScene) return -1;
            if (b.inScene && !a.inScene) return 1;
        }
        switch (sortKey) {
            case 'firstSeen': return a.firstSeen - b.firstSeen;
            case 'lastSeen': return b.lastSeen - a.lastSeen;
            case 'appearances': return b.appearances - a.appearances;
            default: return a.name.localeCompare(b.name);
        }
    });
}

// ── Filter ──
function _filterEntries(entries, filterMode, searchText) {
    let filtered = entries;
    if (filterMode === 'inScene') filtered = filtered.filter(e => e.inScene);
    else if (filterMode === 'absent') filtered = filtered.filter(e => !e.inScene);
    if (searchText) {
        const q = searchText.toLowerCase();
        filtered = filtered.filter(e => {
            const ch = e.character, rel = e.relationship;
            return (e.name || '').toLowerCase().includes(q)
                || (ch.role || '').toLowerCase().includes(q)
                || (ch.hair || '').toLowerCase().includes(q)
                || (ch.face || '').toLowerCase().includes(q)
                || (ch.innerThought || '').toLowerCase().includes(q)
                || (ch.immediateNeed || '').toLowerCase().includes(q)
                || (ch.shortTermGoal || '').toLowerCase().includes(q)
                || (ch.longTermGoal || '').toLowerCase().includes(q)
                || (rel?.relType || '').toLowerCase().includes(q)
                || (rel?.relPhase || '').toLowerCase().includes(q)
                || (rel?.milestone || '').toLowerCase().includes(q)
                || (e.lastLocation || '').toLowerCase().includes(q)
                || _getNote(e.name).toLowerCase().includes(q);
        });
    }
    return filtered;
}

// ── Meter HTML ──
function _meterHtml(key, label, value, meterLabel, prevValue) {
    const labelLow = (meterLabel || '').toLowerCase();
    const isNA = value === -1 || meterLabel === 'N/A' || labelLow.includes('n/a');
    const isUnknown = labelLow.includes('unknown') || labelLow.includes('unclear') || labelLow.includes('???');
    const hasTag = meterLabel && !isNA && !isUnknown;
    const tagCls = hasTag ? ' sp-wiki-meter-has-tag' : '';
    const tagHtml = hasTag ? `<div class="sp-wiki-meter-tag">${esc(meterLabel)}</div>` : '';
    const delta = (typeof value === 'number' && typeof prevValue === 'number' && value !== prevValue) ? value - prevValue : null;
    const isStress = key === 'stress';
    const deltaHtml = delta ? `<span class="sp-wiki-meter-delta ${isStress ? (delta > 0 ? 'sp-wiki-delta-stress-up' : 'sp-wiki-delta-stress-down') : (delta > 0 ? 'sp-wiki-delta-up' : 'sp-wiki-delta-down')}">${delta > 0 ? '+' : ''}${delta}</span>` : '';
    if (isNA) {
        return `<div class="sp-wiki-meter-row"><div class="sp-wiki-meter-label">${esc(label)}</div><div class="sp-wiki-meter-bar"><div class="sp-wiki-meter-fill" data-meter="${key}" style="width:0%"></div></div><div class="sp-wiki-meter-val sp-wiki-meter-na">N/A</div></div>`;
    }
    if (isUnknown) {
        const uTag = meterLabel ? `<div class="sp-wiki-meter-tag">${esc(meterLabel)}</div>` : '';
        return `<div class="sp-wiki-meter-row${meterLabel ? ' sp-wiki-meter-has-tag' : ''}">${uTag}<div class="sp-wiki-meter-label">${esc(label)}</div><div class="sp-wiki-meter-bar"><div class="sp-wiki-meter-fill" data-meter="${key}" style="width:0%"></div></div><div class="sp-wiki-meter-val sp-wiki-meter-na">?</div></div>`;
    }
    const v = clamp(typeof value === 'number' ? value : 0, 0, 100);
    return `<div class="sp-wiki-meter-row${tagCls}">${tagHtml}<div class="sp-wiki-meter-label">${esc(label)}</div><div class="sp-wiki-meter-bar"><div class="sp-wiki-meter-fill" data-meter="${key}" style="width:${v}%"></div></div><div class="sp-wiki-meter-val">${v}${deltaHtml}</div></div>`;
}

function _previewText(e) {
    const ch = e.character;
    if (ch.innerThought) return ch.innerThought.length > 80 ? ch.innerThought.substring(0, 77) + '\u2026' : ch.innerThought;
    if (ch.immediateNeed) return ch.immediateNeed.length > 80 ? ch.immediateNeed.substring(0, 77) + '\u2026' : ch.immediateNeed;
    return '';
}

function _lastSeenText(e) {
    if (e.inScene) return t('In Scene');
    if (e.lastLocation) return e.lastLocation.length > 30 ? e.lastLocation.substring(0, 27) + '\u2026' : e.lastLocation;
    if (e.lastSeen) return t('Msg') + ' #' + e.lastSeen;
    return t('Unknown');
}

// ── Export helpers ──
function _exportJson(entries) {
    const data = entries.map(e => ({ name: e.name, inScene: e.inScene, firstSeen: e.firstSeen, lastSeen: e.lastSeen, appearances: e.appearances, lastLocation: e.lastLocation, character: e.character, relationship: e.relationship, notes: _getNote(e.name) || undefined }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'scenepulse-characters.json'; a.click();
    URL.revokeObjectURL(url);
}

function _exportMarkdown(entries) {
    let md = '# Character Wiki\n\n';
    for (const e of entries) {
        const ch = e.character, rel = e.relationship;
        md += `## ${e.name}\n`;
        md += `**Status:** ${e.inScene ? 'In Scene' : 'Absent'} | **Role:** ${ch.role || 'N/A'}\n`;
        if (ch.hair || ch.face || ch.outfit) md += `**Appearance:** ${[ch.hair, ch.face, ch.outfit].filter(Boolean).join(' | ')}\n`;
        if (rel) {
            md += `**Relationship:** ${rel.relType || ''} (${rel.relPhase || ''})\n`;
            md += `- Affection: ${rel.affection ?? '?'} | Trust: ${rel.trust ?? '?'} | Desire: ${rel.desire ?? '?'} | Stress: ${rel.stress ?? '?'} | Compatibility: ${rel.compatibility ?? '?'}\n`;
            if (rel.milestone) md += `- Milestone: ${rel.milestone}\n`;
        }
        if (ch.immediateNeed || ch.shortTermGoal || ch.longTermGoal) {
            md += `**Goals:** ${[ch.immediateNeed, ch.shortTermGoal, ch.longTermGoal].filter(Boolean).join(' | ')}\n`;
        }
        md += `**First:** Msg #${e.firstSeen} | **Last:** Msg #${e.lastSeen} | **Seen:** ${e.appearances}x\n`;
        const note = _getNote(e.name);
        if (note) md += `**Notes:** ${note}\n`;
        md += '\n---\n\n';
    }
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'scenepulse-characters.md'; a.click();
    URL.revokeObjectURL(url);
}

// ── Render an entry card ──
function _renderEntry(e, viewMode) {
    const ch = e.character;
    const rel = e.relationship;
    const cc = e.color;

    const card = document.createElement('div');
    card.className = 'sp-wiki-entry' + (e.inScene ? '' : ' sp-wiki-absent');
    if (viewMode === 'grid') card.classList.add('sp-wiki-grid-card');
    card.style.setProperty('--char-bg', cc.bg);
    card.style.setProperty('--char-border', cc.border);
    card.style.setProperty('--char-accent', cc.accent);

    let roleShort = ch.role || '';
    if (roleShort.length > 60) roleShort = roleShort.substring(0, 57) + '\u2026';
    const statusCls = e.inScene ? 'sp-wiki-status-in' : 'sp-wiki-status-out';
    const statusText = _lastSeenText(e);
    const preview = _previewText(e);

    // Avatar thumbnail
    const avatarHtml = e.avatarUrl ? `<img class="sp-wiki-avatar" src="${esc(e.avatarUrl)}" alt="" onerror="this.style.display='none'">` : '';

    // ── Grid (compact) mode ──
    if (viewMode === 'grid') {
        let miniMeters = '';
        if (rel) {
            for (const [k, c] of [['affection','#f472b6'],['trust','#60a5fa'],['desire','#a78bfa'],['stress','#facc15'],['compatibility','#34d399']]) {
                const v = clamp(typeof rel[k] === 'number' ? rel[k] : 0, 0, 100);
                miniMeters += `<div class="sp-wiki-mini-bar"><div class="sp-wiki-mini-fill" style="width:${v}%;background:${c}"></div></div>`;
            }
        }
        card.innerHTML = `<div class="sp-wiki-grid-inner">
            ${avatarHtml}
            <div class="sp-wiki-grid-name">${esc(e.name)}</div>
            <span class="sp-wiki-status ${statusCls}" style="font-size:8px;padding:1px 4px">${esc(statusText)}</span>
            ${roleShort ? `<div class="sp-wiki-grid-role">${esc(roleShort)}</div>` : ''}
            ${miniMeters ? `<div class="sp-wiki-mini-meters">${miniMeters}</div>` : ''}
        </div>`;
        return card;
    }

    // ── List (full) mode ──
    card.innerHTML = `<div class="sp-wiki-entry-header">
        ${avatarHtml}
        <span class="sp-wiki-chevron">\u25B6</span>
        <div class="sp-wiki-header-text">
            <div class="sp-wiki-header-top">
                <span class="sp-wiki-name">${esc(e.name)}</span>
                ${roleShort ? `<span class="sp-wiki-role">${esc(roleShort)}</span>` : ''}
            </div>
            ${preview ? `<div class="sp-wiki-preview">${esc(preview)}</div>` : ''}
        </div>
        <span class="sp-wiki-status ${statusCls}">${esc(statusText)}</span>
    </div><div class="sp-wiki-entry-body"></div>`;

    card.querySelector('.sp-wiki-entry-header').addEventListener('click', () => card.classList.toggle('sp-card-open'));

    const body = card.querySelector('.sp-wiki-entry-body');
    let bodyHtml = '';

    if (ch.innerThought) bodyHtml += `<div class="sp-wiki-thought">${esc(ch.innerThought)}</div>`;

    // Role — always first in the body if present
    if (ch.role) {
        bodyHtml += '<div class="sp-wiki-section-label">' + t('Role') + '</div>';
        bodyHtml += `<div class="sp-wiki-val" style="margin-bottom:6px">${esc(ch.role)}</div>`;
    }

    // Appearance — v6.8.15 trimmed schema: outfit absorbs stateOfDress,
    // posture absorbs physicalState, notableDetails replaces the rest.
    const appearFields = [
        ['Hair', ch.hair],
        ['Face', ch.face],
        ['Outfit', ch.outfit],
        ['Posture', ch.posture],
        ['Proximity', ch.proximity],
        ['Notable Details', ch.notableDetails],
    ];
    if (appearFields.some(([, v]) => v)) {
        bodyHtml += '<div class="sp-wiki-section-label">' + t('Appearance') + '</div><div class="sp-wiki-grid">';
        for (const [label, val] of appearFields) { if (val) bodyHtml += `<div class="sp-wiki-field">${esc(t(label))}</div><div class="sp-wiki-val">${esc(val)}</div>`; }
        if (Array.isArray(ch.inventory) && ch.inventory.length) bodyHtml += `<div class="sp-wiki-field">${esc(t('Inventory'))}</div><div class="sp-wiki-val">${esc(ch.inventory.join(', '))}</div>`;
        bodyHtml += '</div>';
    }

    // Meters
    if (rel) {
        bodyHtml += '<div class="sp-wiki-section-label">' + t('Relationship') + '</div>';
        if (rel.relType || rel.relPhase) {
            bodyHtml += '<div style="margin-bottom:4px">';
            if (rel.relType) bodyHtml += `<span class="sp-wiki-role" style="margin-right:4px">${esc(rel.relType)}</span>`;
            if (rel.relPhase) bodyHtml += `<span class="sp-wiki-role" style="background:rgba(100,160,255,0.12)">${esc(rel.relPhase)}</span>`;
            bodyHtml += '</div>';
        }
        const pRel = e.prevRelationship;
        bodyHtml += '<div class="sp-wiki-meters">';
        bodyHtml += _meterHtml('affection', t('Affection'), rel.affection, rel.affectionLabel, pRel?.affection);
        bodyHtml += _meterHtml('trust', t('Trust'), rel.trust, rel.trustLabel, pRel?.trust);
        bodyHtml += _meterHtml('desire', t('Desire'), rel.desire, rel.desireLabel, pRel?.desire);
        bodyHtml += _meterHtml('stress', t('Stress'), rel.stress, rel.stressLabel, pRel?.stress);
        bodyHtml += _meterHtml('compatibility', t('Compatibility'), rel.compatibility, rel.compatibilityLabel, pRel?.compatibility);
        bodyHtml += '</div>';
        if (rel.timeTogether || rel.milestone) {
            bodyHtml += '<div class="sp-wiki-grid" style="margin-top:4px">';
            if (rel.timeTogether) bodyHtml += `<div class="sp-wiki-field">${esc(t('Time Known'))}</div><div class="sp-wiki-val">${esc(rel.timeTogether)}</div>`;
            if (rel.milestone) bodyHtml += `<div class="sp-wiki-field">${esc(t('Milestone'))}</div><div class="sp-wiki-val">${esc(rel.milestone)}</div>`;
            bodyHtml += '</div>';
        }
    }

    // Goals
    const goalFields = [['Need', ch.immediateNeed], ['Short-Term', ch.shortTermGoal], ['Long-Term', ch.longTermGoal]];
    if (goalFields.some(([, v]) => v)) {
        bodyHtml += '<div class="sp-wiki-section-label">' + t('Goals') + '</div><div class="sp-wiki-grid">';
        for (const [label, val] of goalFields) { if (val) bodyHtml += `<div class="sp-wiki-field">${esc(t(label))}</div><div class="sp-wiki-val">${esc(val)}</div>`; }
        bodyHtml += '</div>';
    }

    // Fertility — v6.8.15 trimmed schema: fertStatus + fertNotes only
    if (ch.fertStatus && ch.fertStatus !== 'N/A') {
        const fertFields = [['Status', ch.fertStatus], ['Notes', ch.fertNotes]];
        if (fertFields.some(([, v]) => v)) {
            bodyHtml += '<div class="sp-wiki-section-label">' + t('Fertility') + '</div><div class="sp-wiki-grid">';
            for (const [label, val] of fertFields) { const sv = String(val || ''); if (sv) bodyHtml += `<div class="sp-wiki-field">${esc(t(label))}</div><div class="sp-wiki-val">${esc(sv)}</div>`; }
            bodyHtml += '</div>';
        }
    }

    // User notes
    const existingNote = _getNote(e.name);
    bodyHtml += '<div class="sp-wiki-section-label">' + t('Notes') + '</div>';
    bodyHtml += `<textarea class="sp-wiki-notes" placeholder="${t('Add your notes about this character...')}">${esc(existingNote)}</textarea>`;

    // History metadata
    bodyHtml += '<div class="sp-wiki-meta">';
    if (e.firstSeen) bodyHtml += `<div class="sp-wiki-meta-item sp-wiki-meta-link" data-msg="${e.firstSeen}">${t('First appeared')}: <strong>${t('Msg')} #${e.firstSeen}</strong></div>`;
    if (e.lastSeen) bodyHtml += `<div class="sp-wiki-meta-item sp-wiki-meta-link" data-msg="${e.lastSeen}">${t('Last in scene')}: <strong>${t('Msg')} #${e.lastSeen}</strong></div>`;
    if (e.appearances) bodyHtml += `<div class="sp-wiki-meta-item">${t('Present')}: <strong>${e.appearances}x</strong></div>`;
    if (e.lastLocation) bodyHtml += `<div class="sp-wiki-meta-item">${t('Location')}: <strong>${esc(e.lastLocation)}</strong></div>`;
    bodyHtml += '</div>';

    body.innerHTML = bodyHtml;

    // Sparklines — appended AFTER innerHTML
    if (rel) {
        const metersDiv = body.querySelector('.sp-wiki-meters');
        if (metersDiv) {
            const meterRows = metersDiv.querySelectorAll('.sp-wiki-meter-row');
            const meterKeys = ['affection', 'trust', 'desire', 'stress', 'compatibility'];
            meterRows.forEach((row, i) => {
                try {
                    const spark = createSparklineCanvas(e.name, meterKeys[i]);
                    if (spark) { spark.style.marginLeft = '4px'; row.querySelector('.sp-wiki-meter-val')?.appendChild(spark); }
                } catch (_) {}
            });
        }
    }

    // Notes save on blur
    const notesArea = body.querySelector('.sp-wiki-notes');
    if (notesArea) {
        notesArea.addEventListener('blur', () => _saveNote(e.name, notesArea.value));
    }

    // Clickable metadata links
    body.querySelectorAll('.sp-wiki-meta-link').forEach(link => {
        link.addEventListener('click', (ev) => {
            ev.stopPropagation();
            const msgIdx = Number(link.dataset.msg);
            if (msgIdx > 0) { document.querySelector('.sp-wiki-overlay')?.remove(); _scrollToMessage(msgIdx).catch(() => {}); }
        });
    });

    return card;
}

// ── Open the wiki overlay ──
export function openCharacterWiki() {
    document.querySelector('.sp-wiki-overlay')?.remove();

    const allEntries = _buildEntries();
    if (!allEntries.length) {
        log('Character Wiki: no characters found');
        try { toastr.info(t('No character data yet. Send a message to start tracking.'), 'ScenePulse'); } catch {}
        return;
    }

    let filterMode = 'all';
    let sortKey = 'default';
    let searchText = '';
    let viewMode = 'list'; // 'list' or 'grid'

    const overlay = document.createElement('div');
    overlay.className = 'sp-wiki-overlay';

    const inSceneCount = allEntries.filter(e => e.inScene).length;
    const absentCount = allEntries.length - inSceneCount;

    overlay.innerHTML = `<div class="sp-wiki-container">
        <div class="sp-wiki-header">
            <div class="sp-wiki-title">${t('Character Wiki')} <span>${allEntries.length} ${t('characters')}</span></div>
            <button class="sp-wiki-export-btn" id="sp-wiki-web-graph" title="${t('Relationship Web')}"><svg viewBox="0 0 14 14" width="12" height="12" fill="none"><circle cx="7" cy="3" r="2" stroke="currentColor" stroke-width="1.2"/><circle cx="3" cy="11" r="2" stroke="currentColor" stroke-width="1.2"/><circle cx="11" cy="11" r="2" stroke="currentColor" stroke-width="1.2"/><line x1="6" y1="5" x2="4" y2="9" stroke="currentColor" stroke-width="1"/><line x1="8" y1="5" x2="10" y2="9" stroke="currentColor" stroke-width="1"/><line x1="5" y1="11" x2="9" y2="11" stroke="currentColor" stroke-width="1"/></svg></button>
            <button class="sp-wiki-export-btn" id="sp-wiki-export-json" title="${t('Export JSON')}">JSON</button>
            <button class="sp-wiki-export-btn" id="sp-wiki-export-md" title="${t('Export Markdown')}">MD</button>
            <button class="sp-wiki-close">\u2715</button>
        </div>
        <div class="sp-wiki-toolbar">
            <input class="sp-wiki-search" type="text" placeholder="${t('Search characters...')}">
            <div class="sp-wiki-filters">
                <button class="sp-wiki-filter sp-wiki-filter-active" data-filter="all">${t('All')} (${allEntries.length})</button>
                <button class="sp-wiki-filter" data-filter="inScene">${t('In Scene')} (${inSceneCount})</button>
                <button class="sp-wiki-filter" data-filter="absent">${t('Absent')} (${absentCount})</button>
            </div>
            <div class="sp-wiki-toolbar-right">
                <button class="sp-wiki-expand-btn sp-wiki-view-toggle" id="sp-wiki-view-toggle" title="${t('Toggle grid/list view')}">
                    <svg viewBox="0 0 14 14" width="12" height="12" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/><rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/><rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/><rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/></svg>
                </button>
                <button class="sp-wiki-expand-btn" id="sp-wiki-expand-all" title="${t('Expand All')}">\u25BC</button>
                <button class="sp-wiki-expand-btn" id="sp-wiki-collapse-all" title="${t('Collapse All')}">\u25B2</button>
                <select class="sp-wiki-sort">
                    <option value="default">${t('Relevance')}</option>
                    <option value="name">${t('Name (A-Z)')}</option>
                    <option value="firstSeen">${t('First Seen')}</option>
                    <option value="lastSeen">${t('Last Seen')}</option>
                    <option value="appearances">${t('Appearances')}</option>
                </select>
            </div>
        </div>
        <div class="sp-wiki-list"></div>
        <div class="sp-wiki-footer"><span class="sp-wiki-footer-count"></span></div>
    </div>`;

    const list = overlay.querySelector('.sp-wiki-list');
    const footerCount = overlay.querySelector('.sp-wiki-footer-count');

    function _updateFooter(shown) {
        footerCount.textContent = `${shown} ${t('shown')} \u00B7 ${inSceneCount} ${t('in scene')} \u00B7 ${absentCount} ${t('absent')}`;
    }

    function _render() {
        const filtered = _filterEntries(allEntries, filterMode, searchText);
        const sorted = _sortEntries(filtered, sortKey);
        list.innerHTML = '';
        list.classList.toggle('sp-wiki-list-grid', viewMode === 'grid');
        if (!sorted.length) {
            list.innerHTML = `<div class="sp-wiki-empty">${t('No characters match your search.')}</div>`;
            _updateFooter(0);
            return;
        }
        const frag = document.createDocumentFragment();
        for (const entry of sorted) frag.appendChild(_renderEntry(entry, viewMode));
        list.appendChild(frag);
        _updateFooter(sorted.length);
    }

    // Close
    const _escHandler = (e) => { if (e.key === 'Escape') _close(); };
    function _close() { overlay.remove(); document.removeEventListener('keydown', _escHandler); }
    overlay.querySelector('.sp-wiki-close').addEventListener('click', _close);
    overlay.addEventListener('click', e => { if (e.target === overlay) _close(); });
    document.addEventListener('keydown', _escHandler);

    // Search
    let _searchTimer;
    overlay.querySelector('.sp-wiki-search').addEventListener('input', e => {
        clearTimeout(_searchTimer);
        _searchTimer = setTimeout(() => { searchText = e.target.value; _render(); }, 150);
    });

    // Filter pills
    overlay.querySelectorAll('.sp-wiki-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            overlay.querySelectorAll('.sp-wiki-filter').forEach(b => b.classList.remove('sp-wiki-filter-active'));
            btn.classList.add('sp-wiki-filter-active');
            filterMode = btn.dataset.filter;
            _render();
        });
    });

    // Sort
    overlay.querySelector('.sp-wiki-sort').addEventListener('change', e => { sortKey = e.target.value; _render(); });

    // Expand/Collapse
    overlay.querySelector('#sp-wiki-expand-all').addEventListener('click', () => { list.querySelectorAll('.sp-wiki-entry').forEach(e => e.classList.add('sp-card-open')); });
    overlay.querySelector('#sp-wiki-collapse-all').addEventListener('click', () => { list.querySelectorAll('.sp-wiki-entry').forEach(e => e.classList.remove('sp-card-open')); });

    // View toggle (list/grid)
    overlay.querySelector('#sp-wiki-view-toggle').addEventListener('click', () => {
        viewMode = viewMode === 'list' ? 'grid' : 'list';
        overlay.querySelector('#sp-wiki-view-toggle').classList.toggle('sp-wiki-filter-active', viewMode === 'grid');
        _render();
    });

    // Relationship Web
    overlay.querySelector('#sp-wiki-web-graph').addEventListener('click', () => {
        import('./relationship-web.js').then(m => m.openRelationshipWeb(allEntries)).catch(e => { log('Web graph:', e); });
    });

    // Export
    overlay.querySelector('#sp-wiki-export-json').addEventListener('click', () => {
        const filtered = _filterEntries(allEntries, filterMode, searchText);
        _exportJson(_sortEntries(filtered, sortKey));
    });
    overlay.querySelector('#sp-wiki-export-md').addEventListener('click', () => {
        const filtered = _filterEntries(allEntries, filterMode, searchText);
        _exportMarkdown(_sortEntries(filtered, sortKey));
    });

    document.body.appendChild(overlay);
    _render();
    log('Character Wiki: opened with', allEntries.length, 'characters');
}
