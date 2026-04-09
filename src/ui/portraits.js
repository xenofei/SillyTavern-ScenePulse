// src/ui/portraits.js — v6.8.20
// Character portrait resolution + rendering helpers.
//
// Portrait resolution priority for a given character name:
//   1. User override  — settings.charPortraits[lowercased name] is a URL
//      string (typically data: from an uploaded file). Highest priority so
//      users can always pin a specific image to a character.
//   2. SillyTavern context  — any character in SillyTavern.getContext()
//      .characters whose `.name` matches the lookup name (case-insensitive).
//      Uses the /characters/{avatar} URL that ST itself serves.
//   3. Alias fallback  — if the character has a non-empty `aliases` array,
//      each alias is checked against the ST characters list in order. This
//      makes portraits survive the v6.8.18 reveal flow (e.g. a "Stranger"
//      entry with aliases=["Jenna"] will pick up Jenna's ST avatar once
//      the real name is revealed and the two entries merge).
//   4. Monogram fallback  — a CSS-only div with the first letter of the
//      name on the character's accent-color background. No image.
//
// The monogram is always returned as a fallback when no image URL is
// available, so callers can rely on getPortraitHtml() always returning
// a render-ready HTML string. The caller-provided character object should
// have `.name`, optionally `.aliases`, and optionally come with a charColor
// already computed (otherwise the caller wraps the output in a CSS var).

import { esc } from '../utils.js';
import { getSettings } from '../settings.js';

// Cache the ST avatar map per-call so we don't walk ST characters more
// than once per panel render. Invalidated at the top of each call to
// _buildAvatarIndex — cheap enough that per-render is fine.
function _buildAvatarIndex() {
    const out = {};
    try {
        const ctx = SillyTavern?.getContext?.();
        const chars = ctx?.characters;
        if (!Array.isArray(chars)) return out;
        for (const c of chars) {
            if (!c?.avatar || !c?.name) continue;
            out[c.name.toLowerCase().trim()] = `/characters/${encodeURIComponent(c.avatar)}`;
        }
    } catch { /* ST not ready yet, return empty */ }
    return out;
}

/**
 * Resolve a portrait URL for a character. Returns a string URL or null.
 * Callers who need a render-ready HTML element should use getPortraitHtml
 * instead — this is the lower-level URL lookup.
 *
 * @param {object} ch  — normalized character object with .name and optionally .aliases
 * @param {object} [stIndex]  — optional pre-built ST avatar index to avoid
 *   rebuilding it for every call in a render loop
 * @returns {string|null}
 */
export function resolvePortraitUrl(ch, stIndex) {
    if (!ch || typeof ch !== 'object') return null;
    const name = (ch.name || '').toLowerCase().trim();
    if (!name) return null;

    // 1. User override
    try {
        const overrides = getSettings()?.charPortraits;
        if (overrides && typeof overrides === 'object' && overrides[name]) {
            return overrides[name];
        }
    } catch { /* settings not ready */ }

    const idx = stIndex || _buildAvatarIndex();

    // 2. ST character match on canonical name
    if (idx[name]) return idx[name];

    // 3. ST character match on any alias
    if (Array.isArray(ch.aliases)) {
        for (const a of ch.aliases) {
            const al = (a || '').toLowerCase().trim();
            if (al && idx[al]) return idx[al];
        }
    }

    return null;
}

/**
 * v6.8.43: shared portrait descriptor used by every avatar-rendering site
 * in the extension (character cards, thoughts panel, relationship web,
 * character wiki, off-scene stubs). Returns a structured object with a
 * guaranteed letter + background color, plus the resolved URL when one
 * is available. This is the single chokepoint: every caller MUST use
 * this helper so monogram fallback behavior is uniform.
 *
 * Shape:
 *   {
 *     type: 'url' | 'monogram',
 *     url: string | null,        // only set when type === 'url'
 *     name: string,              // ALWAYS set — full character name ('?' if empty)
 *     letter: string,            // ALWAYS set — first char uppercased, or '?'
 *     bg: string,                // CSS color string (accent or fallback var)
 *     fg: string,                // monogram text color (defaults to white)
 *   }
 *
 * Rendering guidance:
 * - When type === 'url', draw the image first. If it errors at load time,
 *   fall through to the monogram shown in the same slot (use `letter`).
 * - When type === 'monogram', draw a solid circle/disc in `bg` with
 *   `letter` centered in `fg`.
 *
 * v6.8.44: added `name` field so the universal hover-preview caption
 * can read the full character name from the descriptor without every
 * render site having to pass it separately.
 *
 * @param {object} ch  — normalized character object
 * @param {string} accentColor  — CSS color for the monogram background
 * @param {object} [stIndex]  — optional pre-built ST avatar index
 * @returns {{type: string, url: ?string, name: string, letter: string, bg: string, fg: string}}
 */
export function getPortraitDescriptor(ch, accentColor, stIndex) {
    const url = resolvePortraitUrl(ch, stIndex);
    const rawName = String(ch?.name || '').trim();
    const name = rawName || '?';
    const letter = name === '?' ? '?' : (name.charAt(0) || '?').toUpperCase();
    const bg = accentColor || 'var(--sp-accent)';
    const fg = '#ffffff';
    if (url) return { type: 'url', url, name, letter, bg, fg };
    return { type: 'monogram', url: null, name, letter, bg, fg };
}

/**
 * Build a render-ready portrait HTML string. Always returns something —
 * an <img> tag when a URL was resolved, or a monogram <div> fallback with
 * the first letter of the name on a colored background.
 *
 * v6.8.43: delegates to getPortraitDescriptor so there's a single source
 * of truth for the "URL or monogram" decision and the chosen letter/color.
 *
 * The caller controls sizing via CSS classes. This helper only emits the
 * element structure; the styling lives in css/characters.css under
 * .sp-char-portrait and .sp-char-portrait-monogram.
 *
 * @param {object} ch  — normalized character object
 * @param {string} accentColor  — CSS color (hex/rgb) for the monogram bg
 * @param {object} [stIndex]  — optional pre-built ST avatar index
 * @returns {string}  — HTML string to be inserted via innerHTML
 */
export function getPortraitHtml(ch, accentColor, stIndex) {
    const d = getPortraitDescriptor(ch, accentColor, stIndex);
    if (d.type === 'url') {
        // v6.8.44: bake the universal preview attrs into the chokepoint
        // so every caller (update-panel, thoughts, off-scene stubs, etc.)
        // gets hover-enlarge for free with zero per-site wiring.
        const attrs = getPortraitPreviewAttrs(d);
        return `<div class="sp-char-portrait"${attrs}><img src="${esc(d.url)}" alt="" onerror="this.parentElement.classList.add('sp-char-portrait-errored');this.remove()"></div>`;
    }
    // Monogram fallback — first letter on the character's accent color.
    // Deliberately no preview attrs: enlarging a single letter carries no
    // information, and skipping them prevents the delegated listener
    // from firing on monogram nodes.
    return `<div class="sp-char-portrait sp-char-portrait-monogram" style="background:${esc(d.bg)}"><span class="sp-char-portrait-letter">${esc(d.letter)}</span></div>`;
}

// ─── v6.8.44: universal hover-enlarged portrait preview ───────────────
//
// A single document-level delegated listener watches for any element
// carrying a `data-sp-preview-url` attribute and shows an enlarged
// preview pinned near the cursor. Adding preview support to a new
// avatar site is a matter of placing three data attributes on the
// element — no per-site JS wiring, no init ordering, nothing to
// re-register after a re-render.
//
//   <ANY-ELEMENT
//     data-sp-preview-url="…"    ← full-size image URL
//     data-sp-preview-name="…"   ← character name (caption text)
//     data-sp-preview-color="…"  ← caption color (typically accent)
//   />
//
// Sites that go through getPortraitHtml() get the attrs automatically.
// Sites that build their own HTML/SVG (relationship web, character
// wiki) call `getPortraitPreviewAttrs(descriptor)` and interpolate
// the returned string into their template.
//
// Monogram descriptors return an empty attribute string, so monogram
// avatars never trigger the preview — enlarging a single letter
// carries no information.
//
// Caveat: hover-only means touch devices never see the preview. This
// is an accepted limitation matching the original relationship-web
// behavior; a long-press handler could be added later if needed.

/**
 * Build the data-attribute snippet for an avatar element from its
 * portrait descriptor. Returns an empty string for monogram descriptors
 * so consumers can unconditionally interpolate the result into their
 * HTML/SVG template strings.
 *
 * @param {object} descriptor — the object returned by getPortraitDescriptor
 * @param {string} [nameOverride] — caption override when the descriptor
 *   was built from a stub without the full display name
 * @param {string} [colorOverride] — caption color override (defaults to
 *   descriptor.bg, which is the character's accent color)
 * @returns {string} — attribute string (with leading space) or ''
 */
export function getPortraitPreviewAttrs(descriptor, nameOverride, colorOverride) {
    if (!descriptor || descriptor.type !== 'url' || !descriptor.url) return '';
    const name = nameOverride || descriptor.name || '';
    const color = colorOverride || descriptor.bg || '#ffffff';
    return ` data-sp-preview-url="${esc(descriptor.url)}" data-sp-preview-name="${esc(name)}" data-sp-preview-color="${esc(color)}"`;
}

let _previewEl = null;
let _currentTarget = null;
let _orphanRaf = 0;

function _ensurePreviewEl() {
    if (_previewEl && _previewEl.isConnected) return _previewEl;
    _previewEl = document.createElement('div');
    _previewEl.className = 'sp-portrait-preview';
    _previewEl.setAttribute('aria-hidden', 'true');
    _previewEl.innerHTML = '<img alt=""><div class="sp-portrait-preview-caption"></div>';
    _previewEl.style.display = 'none';
    document.body.appendChild(_previewEl);
    return _previewEl;
}

function _orphanCheck() {
    _orphanRaf = 0;
    if (!_currentTarget) return;
    if (!_currentTarget.isConnected) {
        // The hovered element was removed mid-hover (e.g. panel
        // re-rendered). Hide so the preview doesn't orphan.
        hidePortraitPreview();
        return;
    }
    _orphanRaf = requestAnimationFrame(_orphanCheck);
}

function _showPreviewForTarget(target, clientX, clientY) {
    const url = target.getAttribute('data-sp-preview-url');
    if (!url) return;
    const name = target.getAttribute('data-sp-preview-name') || '';
    const color = target.getAttribute('data-sp-preview-color') || '#ffffff';
    const el = _ensurePreviewEl();
    const img = el.querySelector('img');
    const caption = el.querySelector('.sp-portrait-preview-caption');
    // Only swap src if URL actually changed, to avoid the image
    // flashing/reloading when hovering adjacent avatars in a grid.
    if (img.getAttribute('src') !== url) {
        img.src = url;
        img.onerror = () => hidePortraitPreview();
    }
    if (caption) {
        caption.textContent = name;
        caption.style.color = color;
    }
    // Pinned-near-cursor positioning with viewport-edge avoidance.
    // Matches the v6.8.43 behavior exactly.
    const vw = window.innerWidth, vh = window.innerHeight;
    const boxW = 224, boxH = 260;
    let tx = clientX + 32, ty = clientY + 20;
    if (tx + boxW > vw - 8) tx = clientX - boxW - 18;
    if (tx < 8) tx = 8;
    if (ty + boxH > vh - 8) ty = vh - boxH - 8;
    if (ty < 8) ty = 8;
    el.style.left = tx + 'px';
    el.style.top = ty + 'px';
    el.style.display = '';
    _currentTarget = target;
    // Start (or restart) the orphan-element guard.
    if (_orphanRaf) cancelAnimationFrame(_orphanRaf);
    _orphanRaf = requestAnimationFrame(_orphanCheck);
}

/**
 * Immediately hide the preview. Call from panel close paths so the
 * preview doesn't linger when the hovered element disappears without
 * a mouseout (overlay removed, Escape pressed, etc).
 */
export function hidePortraitPreview() {
    if (_previewEl) _previewEl.style.display = 'none';
    _currentTarget = null;
    if (_orphanRaf) {
        cancelAnimationFrame(_orphanRaf);
        _orphanRaf = 0;
    }
}

function _onPreviewMouseOver(e) {
    const t = e.target;
    if (!t || typeof t.closest !== 'function') return;
    const target = t.closest('[data-sp-preview-url]');
    if (!target) {
        // Pointer moved off any previewable element (but wasn't a
        // direct mouseout event). Leave current preview alone — the
        // paired mouseout handler will hide it.
        return;
    }
    if (target === _currentTarget) return;
    _showPreviewForTarget(target, e.clientX, e.clientY);
}

function _onPreviewMouseOut(e) {
    if (!_currentTarget) return;
    const related = e.relatedTarget;
    // Ignore traversal between children of the same hover target
    // (e.g. cursor moving from the <img> inside <div class="sp-char-portrait">
    // to the wrapper div itself — no visual change needed).
    if (related && _currentTarget.contains && _currentTarget.contains(related)) return;
    // If the cursor moved directly onto a DIFFERENT previewable
    // element, mouseover will fire and swap the preview in place.
    // Otherwise, hide.
    if (related && typeof related.closest === 'function' && related.closest('[data-sp-preview-url]')) return;
    hidePortraitPreview();
}

function _installPreviewListener() {
    if (typeof document === 'undefined' || !document.body) return;
    // Idempotent guard: multiple module imports must not re-register.
    if (document.body.dataset.spPortraitPreviewInstalled === '1') return;
    document.body.dataset.spPortraitPreviewInstalled = '1';
    document.body.addEventListener('mouseover', _onPreviewMouseOver, true);
    document.body.addEventListener('mouseout', _onPreviewMouseOut, true);
}

// Auto-install at module load. Guarded for environments where
// document.body isn't yet ready (unlikely inside a ST extension but
// cheap to handle).
if (typeof document !== 'undefined') {
    if (document.body) {
        _installPreviewListener();
    } else {
        document.addEventListener('DOMContentLoaded', _installPreviewListener, { once: true });
    }
}

/**
 * Build the ST avatar index once and return it — useful for render loops
 * that render multiple character cards in sequence and want to avoid
 * walking ST characters once per card.
 */
export function buildPortraitIndex() {
    return _buildAvatarIndex();
}

/**
 * Save a user-uploaded portrait for a character. Stores a data: URL in
 * settings.charPortraits so it persists with the user's settings.
 *
 * @param {string} name  — character name (will be lowercased as the key)
 * @param {string} dataUrl  — data: URL from a FileReader read
 */
export function setPortraitOverride(name, dataUrl) {
    if (!name || !dataUrl) return;
    const s = getSettings();
    if (!s.charPortraits || typeof s.charPortraits !== 'object') s.charPortraits = {};
    s.charPortraits[name.toLowerCase().trim()] = dataUrl;
    // Import saveSettings lazily to avoid a circular import at module load
    import('../settings.js').then(m => m.saveSettings?.()).catch(() => {});
}

/**
 * Clear a user-uploaded portrait override for a character, falling back
 * to ST avatar lookup or monogram on next render.
 */
export function clearPortraitOverride(name) {
    if (!name) return;
    const s = getSettings();
    if (!s.charPortraits) return;
    delete s.charPortraits[name.toLowerCase().trim()];
    import('../settings.js').then(m => m.saveSettings?.()).catch(() => {});
}
