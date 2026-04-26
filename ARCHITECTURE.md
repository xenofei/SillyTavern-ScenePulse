# ScenePulse — Architecture Map

A short reference for non-obvious cross-cutting rules that span multiple
modules. File-level headers cover module-local invariants; this document
covers the things you'd otherwise have to reverse-engineer by reading
five files.

## Module graph

```
state ─┐
        ├──► settings ──► profiles ──► generation ──► ui
        │                                  ▲
        │                                  └─ schema, prompts, normalize
        │
builtins ┴──► (schema.js, prompt.js — pure data, no logic)
i18n / utils ──► (leaves — imported widely, import nothing)
```

- `src/state.js` — single mutable state object behind setter functions.
  See its header for why ESM live bindings forced the `export let` +
  setter pattern.
- `src/settings.js` — bridges SillyTavern's extension settings into
  ScenePulse's profile model. Owns `getActiveSchema()`,
  `getActivePrompt()`, `getLatestSnapshot()`, and the legacy-mirror
  helpers. The single longest file in the codebase by intent — settings
  surface area is large.
- `src/profiles.js` — profile CRUD + cloning. `makeProfile` is the
  single constructor; never reach in and assemble a profile literal.
- `src/generation/` — pipeline (extraction → normalize → save) plus the
  interceptor that injects ScenePulse's tracker prompt into ST's
  generation. Read [`interceptor.js`](src/generation/interceptor.js)
  before touching anything in this directory.
- `src/builtins/` — `BUILTIN_SCHEMA` and `BUILTIN_PROMPT`. Edit these
  files to extend the bundled defaults, NOT `src/constants.js` (which
  re-exports them for backward compatibility).
- `src/ui/` — flat directory; one file per overlay/widget. The shared
  overlay lifecycle helper is [`dialog-base.js`](src/ui/dialog-base.js)
  but most legacy modules still inline their own ESC + click-outside
  handlers. Migration is incremental — see that file's header.

## Source-of-truth rules

These rules are load-bearing across the codebase and not always obvious
from the call site:

1. **Active profile is the source of truth (post-v6.13.0).** Anything
   under `s.profiles[s.activeProfileId]` wins over the same key at the
   root of `s`. Root settings are legacy mirrors kept so older code
   paths still read sensible values; new code should always go through
   `getActiveProfile(s)` and `buildProfileView(s, profile)`.
2. **`getActiveSchema()` falls back gracefully.** When `profile.schema`
   is corrupt JSON, it falls through to the dynamic builder AND warns
   the user once (toastr) so a silent tracker-mostly-empty failure
   doesn't go unnoticed. See `src/settings.js`.
3. **Wiki entries are permanent.** Characters added to the wiki never
   disappear from there even if they leave the active scene. Tests in
   `tests/wiki-permanence.test.mjs` enforce this.
4. **`{{user}}` is never a character.** Filter at every read site that
   walks `characters[]` or `relationships[]` — the LLM occasionally
   tries to slip the user persona in. Multiple normalize.js paths and
   schema descriptions guard against it.

## In-flight generation contract

Inline tracker generation has a two-flag in-flight tuple:

```
generating === true  &&  inlineGenStartMs > 0
```

Both flags must be cleared together. Half-cleared state was the cause
of the v6.23.x Together-mode skip regression chain (commits a8e6f65,
95b97ee). v6.27.13 widened the interceptor's stuck-detection guard to
treat any `generating === true` without a fresh start time as stale,
and v6.27.14 added a 180s watchdog that force-resets the tuple when
ST never fires a termination event (e.g. ECONNRESET on a slow upstream).

Termination paths that clear the tuple:
- `GENERATION_ENDED` event (success or extraction-failure deferral)
- `GENERATION_STOPPED` event (user clicked stop)
- 180s watchdog (catches network drops)
- Next interceptor call's stuck-detection (last-resort)

## Dialog system

12 overlay-style dialog modules currently live in `src/ui/`. Each
implements its own ESC keydown listener, click-outside handler,
mousedown/pointerdown stopPropagation isolation, and exit-anim
teardown. The duplication caused the v6.23.x backdrop/popover
regression chain (four successive fixes for the same bug shape).

`src/ui/dialog-base.js` ships `mountOverlay({ root, onClose,
closeOnEsc, closeOnEnter, closeOnBackdrop, closingClass })` as the
canonical lifecycle helper. As of v6.27.12, only `or-connector-prompt`
and `preset-suggestion-prompt` use it. Migration of the other ten
modules is incremental — touch the file → migrate it. See that
file's header for the migration criteria.

## CSS file ownership

`style.css` is the entry point and `@import`s every CSS file. Files
are mostly named for their feature, with one carryover misnomer:

- `css/crash-log.css` (1461 lines after v6.27.10 audit) holds the
  ENTIRE debug-overlay system: `.sp-cl-*` (crash log), `.sp-di-*`
  (debug inspector + doctor + perf-tab), and a few stragglers. A
  full split was attempted and deferred because rules are interleaved
  with shared `@media` blocks; cascade-safe extraction would require
  duplicating media wrappers per file. Add new debug/perf rules here,
  not in `css/debug.css`.
- `css/dialogs.css` and `css/preset-browser.css` were split out in
  v6.27.9 to fix prefix↔filename mismatches in `custom-panels.css`
  and `prompt-editor.css`.
- `css/perf-overlay.css` (v6.27.10) holds the standalone perf-capture
  floating pill (distinct from the Inspector's perf TAB).

## State mutation and clone rules

- `src/state.js` uses `export let` + setter functions, not
  `Object.defineProperty`, because ESM forbids dynamic getter exports
  on the module namespace. The header in that file is the canonical
  explanation.
- Use `structuredClone()` for deep copies. v6.27.7 swept `JSON.parse(JSON
  .stringify(...))` out of every site — it's slower, semantically
  weaker (no Date/Map handling), and shouldn't reappear.

## Versioning protocol

Every commit bumps version in BOTH `manifest.json` AND
`src/constants.js`. The duplication is intentional — bump-both is the
release-checklist forcing function. Don't refactor it into a single
runtime read.

i18n covers all 29 languages in `locales/*.json`. Adding a translatable
string means updating every locale file, not a subset.

## Where to read first

If you're new to the codebase and want to make a change, read in this order:

1. This file (you are here)
2. [CLAUDE.md](CLAUDE.md) — coding style, commit hygiene, refactor philosophy
3. [src/state.js](src/state.js) — the mutable state surface
4. [src/settings.js](src/settings.js) — profile + persistence machinery
5. [src/generation/interceptor.js](src/generation/interceptor.js) — the
   hot path everything else feeds into
