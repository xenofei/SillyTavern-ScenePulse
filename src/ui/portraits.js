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
 * @param {object} ch  — normalized character object
 * @param {string} accentColor  — CSS color for the monogram background
 * @param {object} [stIndex]  — optional pre-built ST avatar index
 * @returns {{type: string, url: ?string, letter: string, bg: string, fg: string}}
 */
export function getPortraitDescriptor(ch, accentColor, stIndex) {
    const url = resolvePortraitUrl(ch, stIndex);
    const name = String(ch?.name || '?').trim();
    const letter = name === '?' || !name ? '?' : (name.charAt(0) || '?').toUpperCase();
    const bg = accentColor || 'var(--sp-accent)';
    const fg = '#ffffff';
    if (url) return { type: 'url', url, letter, bg, fg };
    return { type: 'monogram', url: null, letter, bg, fg };
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
        return `<div class="sp-char-portrait"><img src="${esc(d.url)}" alt="" onerror="this.parentElement.classList.add('sp-char-portrait-errored');this.remove()"></div>`;
    }
    // Monogram fallback — first letter on the character's accent color
    return `<div class="sp-char-portrait sp-char-portrait-monogram" style="background:${esc(d.bg)}"><span class="sp-char-portrait-letter">${esc(d.letter)}</span></div>`;
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
