// ScenePulse — Internationalization Module
// Provides t(key) function for UI string translations.
//
// v6.9.7: translations extracted from this file to locales/*.json
// (29 language files, 336 keys each). Previously all 8,400 lines of
// translation dictionaries were embedded inline — this file was 35%
// of the entire JS codebase. Now it's a thin loader that fetches the
// appropriate JSON file on first use and caches it.
//
// Adding a new language: create locales/<language-name>.json with the
// same key structure as any existing file, then add the language name
// → filename mapping to locales/_manifest.json.

import { getLanguage } from './settings.js';

// Manifest mapping language display names to JSON filenames
let _manifest = null;
// Cached translation table for the current language
let _cache = null;
let _cachedLang = '';

/**
 * Load the locale manifest (language name → filename mapping).
 * Cached after first call.
 */
async function _loadManifest() {
    if (_manifest) return _manifest;
    try {
        // Resolve the locales/ path relative to the extension root.
        // In SillyTavern, extensions load from /scripts/extensions/third-party/<name>/
        // or /data/default-user/extensions/<name>/. The import.meta.url
        // gives us the current module's URL, from which we can derive
        // the extension root.
        const base = new URL('..', import.meta.url).href;
        const resp = await fetch(base + 'locales/_manifest.json');
        if (resp.ok) _manifest = await resp.json();
        else _manifest = {};
    } catch {
        _manifest = {};
    }
    return _manifest;
}

/**
 * Load a specific language's translation table from its JSON file.
 * Returns the parsed object or an empty object on failure.
 */
async function _loadLocale(langName) {
    const manifest = await _loadManifest();
    const filename = manifest[langName];
    if (!filename) return {};
    try {
        const base = new URL('..', import.meta.url).href;
        const resp = await fetch(base + 'locales/' + filename);
        if (resp.ok) return await resp.json();
    } catch { /* network or parse failure — fall back to English */ }
    return {};
}

/**
 * Translate a UI string. Returns translation if available, otherwise
 * the English key as fallback. Synchronous — uses a pre-loaded cache.
 * Call initI18n() at startup to warm the cache before first render.
 * @param {string} key - English string to translate
 * @returns {string} Translated string or English fallback
 */
export function t(key) {
    if (!_cache || !_cachedLang) return key;
    return _cache[key] || key;
}

/**
 * Initialize the translation cache for the current language setting.
 * Should be called once at extension startup, before the first render.
 * Safe to call multiple times (re-fetches if language changed).
 */
export async function initI18n() {
    const lang = getLanguage();
    if (!lang) { _cache = null; _cachedLang = ''; return; }
    if (lang === _cachedLang && _cache) return; // already loaded
    _cache = await _loadLocale(lang);
    _cachedLang = lang;
}

/** Reset cached language (call when language setting changes). */
export function resetI18nCache() {
    _cachedLang = '';
    _cache = null;
}
