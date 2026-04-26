<div align="center">

<img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fxenofei%2FSillyTavern-ScenePulse%2Fmain%2Fmanifest.json&query=%24.version&label=version&style=flat-square&labelColor=1a1c24&color=4db8a4" alt="Version">
<img src="https://img.shields.io/badge/license-GPL--3.0-blue?style=flat-square&labelColor=1a1c24" alt="License">
<img src="https://img.shields.io/badge/platform-SillyTavern%201.12%2B-orange?style=flat-square&labelColor=1a1c24" alt="Platform">
<img src="https://img.shields.io/badge/languages-29-9b7ac4?style=flat-square&labelColor=1a1c24" alt="Languages">
<img src="https://img.shields.io/github/stars/xenofei/SillyTavern-ScenePulse?style=flat-square&labelColor=1a1c24&color=e8b341" alt="Stars">

# <img width="836" height="200" alt="image" src="https://github.com/user-attachments/assets/041e92d6-f126-45da-8a2f-7a64a6a8d609" />




**AI-Powered Scene Intelligence for SillyTavern**

*Every scene has a pulse. Now you can feel it.*

</div>

---

ScenePulse is a SillyTavern extension that automatically extracts and tracks scene data from AI responses — characters, relationships, quests, mood, tension, and more — all displayed in a real-time dashboard alongside your roleplay.

> [!IMPORTANT]
> ### 🤝 Help us improve LLM responses — contribute model presets!
>
> ScenePulse ships **30 built-in model presets** (DeepSeek, Claude, GPT, Gemini, Kimi, GLM, Llama/Mistral finetunes, etc.), but every model + provider + sampler combination has its own quirks. **If you've found settings that improve tracker JSON quality, narrative coherence, or structured-output reliability for your model, we want to ship them to every user.**
>
> **What helps most:**
> - Sampler values (temperature / top_p / freq-penalty / presence-penalty) that improve JSON compliance on a specific model
> - System-prompt role tweaks (e.g., `user` vs `system` for Claude / DeepSeek thinking models)
> - Prompt-slot overrides that fix prose-instead-of-JSON failures, especially on NSFW / long-context / reasoning models
> - Anti-stagnation tunings, anti-`charactersPresent`-carry-forward fixes, name-awareness improvements
> - New presets for models we don't ship — finetunes, niche providers, jailbreak variants, local models
>
> **How to contribute (pick whichever is easier):**
> - 💬 **Quick suggestion** → [open an issue](https://github.com/xenofei/SillyTavern-ScenePulse/issues/new) describing your model + the change that worked. Even one-line tips are valuable.
> - 📁 **Tested preset** → submit a PR adding a `.json` file to [`presets/`](presets/) — see [`presets/README.md`](presets/README.md) for the schema and [`presets/_examples/`](presets/_examples/) for working examples.
> - 🛠️ **Built-in tuning improvement** → if you'd improve one of the 30 bundled presets, open a PR against [`src/presets/built-in.js`](src/presets/built-in.js) with the model id and the rationale.
>
> Your contributions ship to every user. The more real-world tunings we collect, the better ScenePulse works out-of-the-box for everyone.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Compatibility](#compatibility)
- [Configuration](#configuration)
- [Custom Panels](#custom-panels)
- [Known Issues](#known-issues)
- [Changelog](#changelog)
- [Contributing](#contributing)
- [License](#license)

## Features

### Live Dashboard
- **Environment cards** — time, date, weather, temperature, location with animated weather icons
- **Scene details** — mood, tension, topic, interaction style, sound environment
- **Real-time updates** every AI message
<img width="857" height="390" alt="image" src="https://github.com/user-attachments/assets/7740dada-d740-49d8-8ae3-1ae6d72767d5" />


### Relationship Tracking
- Animated meter bars for **affection, desire, trust, stress, compatibility** (0–100)
- **Unique per-meter delta icons** — emotionally distinct up/down variants: heart/cracked heart (affection), Adinkra symbol/X'd symbol (desire), star/broken star (trust), calm shield/lightning bolt (stress), linked/separated rings (compatibility)
- **Mini sparklines** with dark background and 20% gridlines — always visible, even with <2 data points
- **Full-screen SVG graph** on click — last 30 data points, all meters overlaid, clickable legend, hover tooltips with message preview, click data points to navigate to that message
- Delta indicators showing +/- changes (green up, red down, yellow stress increase, green stress decrease)
- **Previous-value white marker** on the bar showing where the meter was last update
- Relationship phase, milestones, and time together
- Confidence-based color matching between character and relationship cards
<img width="859" height="423" alt="image" src="https://github.com/user-attachments/assets/7094c6bb-28af-46b5-a7da-54a5f117371d" />


### Quest Journal
- **North Star** — overarching life purpose
- **Main Quests, Side Quests, Active Tasks** — tiered and collapsible
- **Quest lifecycle** — NEW (teal badge), UPDATED (amber badge), RESOLVED (green badge, strikethrough)
- Urgency indicators (critical/high/moderate/low/resolved) and detailed descriptions
- User quest management — complete (✓), remove (✕), undo, and add quests directly
- Perspective enforcement — quests always framed from the user's point of view
<img width="856" height="556" alt="image" src="https://github.com/user-attachments/assets/3bf59314-4e69-4635-84e9-8823a68bc32b" />


### Character Profiles
- Full appearance tracking: hair, face, outfit, state of dress, posture
- Inner thoughts, immediate needs, short/long-term goals
- Inventory tracking
- Optional fertility status fields with full field-level granularity
- Smart name resolution when models omit the `name` field
<img width="860" height="326" alt="image" src="https://github.com/user-attachments/assets/cb314a4e-a6d4-449d-96ad-929556564d40" />


### Character Wiki
- **Full-screen browser** for every character ever encountered, not just those currently in scene
- Walks all snapshots once on open to aggregate **first seen, last seen, appearance count, last known location**
- Per-character cards with appearance grid, relationship meters with mini sparklines, goals, inventory, fertility, history metadata
- **Search**, filter pills (All / In Scene / Absent), sort options (name, first seen, last seen, appearances, relevance)
- **Compact grid view**, per-character user notes, avatars, JSON / MD export
- Reachable from the toolbar (book icon)

### Relationship Web
- **SVG circular graph** of all characters with relationship edges
- Edge weight reflects relationship strength; node color matches per-character color assignment
- Reachable from the Character Wiki header

### Story Ideas
- 5 AI-generated plot directions per update (dramatic, intense, comedic, twist, exploratory)
- One-click **paste to edit** or **inject directly** into chat
<img width="860" height="445" alt="image" src="https://github.com/user-attachments/assets/e2614c4c-0b1c-42db-9761-5f3efbc8dd2a" />


### Relationship History Graphs
- **Mini sparklines** inline next to each relationship meter — dark background with 20% gridlines, glowing data lines
- **Full-screen SVG graph** on click — all 5 meters overlaid, clickable legend to focus, area fill under focused line, value labels on data points
- **Clickable X-axis labels** — click any snapshot number to load that historical state
- **Stats bar** — snapshots, data points, current value, average
- Fuzzy name matching across snapshots (handles "Nova" vs "Nova Glaciara")

### Token Usage Analytics
- **Analytics panel** — full-screen overlay with per-snapshot token breakdown
- Summary cards: total tokens, snapshots, avg generation time, total time, session tokens, avg delta savings
- Source breakdown: together/separate/fallback counts, fastest/slowest generation
- Per-snapshot table with tokens, time, source, delta savings
- Accessible from the stats footer

### Theme Presets
- **5 themes**: Default, Midnight, Fantasy, Cyberpunk, Minimal
- Live CSS variable switching — changes instantly, no reload
- Theme selector in Settings > General

### Prompt + Schema Profiles
- **Self-contained profile bundles** — each profile owns its own `{schema, systemPrompt, panels, fieldToggles, dashCards, customPanels}`
- **Switch profiles via dropdown** in Settings → Prompts (e.g. Medieval Fantasy ↔ Pokemon ↔ Modern Slice-of-Life) without manually editing prompts and schemas
- **Full Profile Manager overlay** — list view with active marker, inline rename / duplicate / clear panels / export / delete
- **Per-chat override** — a chat can pin its own profile via `chatMetadata.scenepulse.activeProfileId` (resolution order: per-chat → global → first profile)
- **Import / export** — share profiles as `.json` files; auto-suffixed name on collision, never overwrites
- **Read-through architecture** — switching is `s.activeProfileId = newId`, no destructive copy, no risk of mid-edit data loss
- Force-full regen on switch (delta against a different schema is nonsensical)
- Existing setups auto-migrated into a "Default" profile on first load — nothing lost
- `/sp-profile [name]` slash command for chat-input switching

### Crash Log + Debug Inspector
- **Combined crash log** — captures errors from both ScenePulse AND the host SillyTavern via `window.error`, `window.unhandledrejection`, and ScenePulse-internal `err()` calls. Tagged by source.
- **Persistent across reloads** — hybrid storage (in-memory ring buffer + localStorage mirror + server file flush to `data/<user>/user/files/scenepulse-crash-log.json`)
- **Privacy-conscious** — only stack + metadata + version, no message content by default
- **Debug Inspector overlay** (Settings → Advanced → Debug → 🔍 Debug Inspector) with three tabs:
  - **Activity** — chronological logger.js debug log with level filter, search, live refresh, copy, export
  - **Last Response** — pretty-printed raw LLM JSON from the most recent generation
  - **Crashes** — severity + source filters, expand-for-stack rows, copy entry, copy all, clear, **"Report on GitHub"** per row that pre-fills a new-issue template with the captured stack

### Performance / Reduce Visual Effects
- One-click **"Reduce visual effects"** toggle in Settings → General disables the animated dashboard canvas, particles, shimmers, and decorative blend modes — recommended for laptops or integrated GPUs
- Honors OS-level `prefers-reduced-motion` automatically — no toggle needed
- WDM canvas throttled to ~20fps and paused via `IntersectionObserver` when off-screen even when enabled

### Slash Commands
- `/sp status` — Show tracker state summary (with active profile)
- `/sp regen [section]` — Regenerate tracker (optional: dashboard, scene, quests, relationships, characters, branches)
- `/sp refresh` — Force a full-state regeneration (bypass delta mode, reset drift counter)
- `/sp clear` — Clear all tracker data (with confirmation)
- `/sp toggle <panel>` — Toggle a panel on/off (built-in OR custom panel name; case-insensitive)
- `/sp profile [name]` — List profiles, or switch to one by name (case-insensitive)
- `/sp export` — Export tracker history + profiles as JSON
- `/sp debug` — Show diagnostics
- `/sp help` — List commands

Standalone shortcuts: `/sp-status`, `/sp-regen`, `/sp-refresh`, `/sp-clear`, `/sp-toggle`, `/sp-profile`, `/sp-export`, `/sp-debug`, `/sp-help`. Alias: `/scenepulse <subcommand>`.

### Custom Macros
Template variables for use in character cards, system prompts, Quick Replies. Re-read live on every prompt build — values stay current across generations.

**Scene state:**
- `{{sp_location}}`, `{{sp_time}}`, `{{sp_date}}`, `{{sp_mood}}`, `{{sp_tension}}`
- `{{sp_weather}}`, `{{sp_topic}}`, `{{sp_temperature}}`, `{{sp_summary}}`, `{{sp_northstar}}`

**Aggregations:**
- `{{sp_characters}}` — comma-separated names of characters present in the current scene
- `{{sp_char_count}}` — present-character count (for `{{#if}}` conditionals)
- `{{sp_relationships}}` — formatted `"Jenna (lover, aff:75), Reyes (rival, aff:30)"`
- `{{sp_quests}}` — active quest names (main + side)
- `{{sp_main_quests}}` / `{{sp_side_quests}}` — split tiers
- `{{sp_quest_count}}` — non-resolved quest count
- `{{sp_active_profile}}` — name of the active ScenePulse profile

### Inner Thoughts Panel *(Desktop)*
- Floating, draggable panel showing each character's inner monologue
- Ghost mode (transparent), snap-to-edge, resizable
- Dynamic autofit — panel adjusts when window resizes, never overlaps chat area
<img width="844" height="287" alt="image" src="https://github.com/user-attachments/assets/660015cd-be56-4456-bee3-f4303d3d2ed4" />


### Immersive Effects *(Desktop)*
- **Weather overlay** — rain, snow, hail, fog, sandstorm, aurora, ash with particle systems
- **Time-of-day tint** — dawn, morning, afternoon, dusk, evening, night ambience
- **Scene transitions** — feathered location change popups with backdrop blur and soft radial fade

### Timeline & Snapshot Browser
- Every AI message creates a snapshot (unlimited storage by default, configurable)
- **Timeline scrubber** — click any dot to load historical scene data and scroll to the message
- **"Browse All" button** — paginated snapshot list (10 per page) with time, location, tension, character count, token usage
- Click any row to jump to that snapshot and scroll to the message in chat
- **Historical message navigation** — automatically loads lazy-loaded messages via ST's `showMoreMessages` API
- **Message highlight** — JS-driven glow pulse with graceful fade when scrolling to a message
- 200ms debounced navigation for smooth scrubbing
<img width="850" height="82" alt="image" src="https://github.com/user-attachments/assets/5b46e312-2921-4a24-9781-4c297669ea27" />


### Payload Inspector
- Built-in diff viewer for debugging tracker data
- 5 view modes: Changes Only, Full Diff, Side by Side, Delta Payload, Previous/Current
- Green/red line-level diff with context collapsing
- Copy to clipboard, works on current and historical timeline nodes

### Custom Panels
- Create panels to track **anything** — health, mana, reputation, faction standings
- Each field supports text, number, meter, list, or enum types
- LLM hints tell the AI what to output for each field
<img width="858" height="472" alt="image" src="https://github.com/user-attachments/assets/6732fa65-dc8b-4390-8445-bbd08d36f9df" />


### Delta Mode (Token Saving)
- LLM returns only changed fields instead of echoing the full snapshot
- Client-side delta merge preserves unchanged data from previous snapshot
- Reduces output tokens by ~70–90% on subsequent messages
- Delta savings displayed in stats footer with hover tooltip
- Experimental — may not work with all models

### Temporal Validator *(v6.24.0)*
- **Auto-corrects** LLM time regressions and implausible jumps before they reach the timeline (no more #60 16:15 → #62 14:52 → #64 15:00 surprises)
- **Three block rules** — backward without flashback signal, forward exceeding 2× the model's `elapsed`, forward >1h with no `elapsed` claim
- **Respects intent** — the model can declare a flashback or time-skip via the optional `temporalIntent` schema field (`continue` / `flashback` / `timeSkip` / `parallel`), or annotate the `elapsed` field with `(flashback)` / `(time skip)` / `(meanwhile)`. Cross-date jumps are always trusted.
- **Respects you** — manual time edits via the panel are stamped `userEdited` and never auto-overridden
- **Anti-cascade guard** — refuses to anchor on a previously-rewritten snapshot, so one bad turn can't poison every subsequent classification
- Skips group chats cleanly (per-character clocks deferred to a future release)

### Function Tool Calling *(Experimental, Separate Mode Only)*
- Register `update_scene_tracker` as an LLM function tool via SillyTavern's ToolManager
- When supported (OpenAI, Claude, Gemini), the tracker API call uses structured tool calling instead of text prompt
- More reliable JSON output, no parsing needed
- Status badge in footer: Tool OK (green), Tool Miss (red), Tool Standby (purple)
- Has no effect in Together mode

### Localization (29 Languages)
- Full UI translation — every section header, badge, tooltip, button, dialog, and setting
- LLM output localization — narrative string values generated in the selected language
- Enum values translated at display time (tension, dress state, fertility, meter labels)
- Auto-detect from SillyTavern's locale or manual override
- Live language switch — changes take effect immediately, no reload required
- **Languages:** Chinese (Simplified/Traditional), Spanish, Hindi, Arabic, Portuguese, Russian, Japanese, French, German, Korean, Turkish, Vietnamese, Italian, Thai, Polish, Ukrainian, Indonesian, Dutch, Romanian, Czech, Greek, Hungarian, Swedish, Malay, Finnish, Danish, Norwegian, Hebrew

### Accessibility
- `:focus-visible` outlines on all interactive elements for keyboard navigation
- `@media (prefers-reduced-motion: reduce)` disables all animations
- Status badges include text indicators alongside color

### Settings Tabs
- Settings organized into **General**, **Generation**, **Prompts**, and **Advanced** tabs
- "Enable ScenePulse" checkbox always active even when extension is disabled
- Schema editor with lock/unlock and confirmation dialog
- Config export/import as shareable JSON

### Keyboard Shortcuts
- `Alt+Shift+P` — Toggle ScenePulse panel
- `Alt+Shift+R` — Regenerate tracker (with loading animations)
- `Escape` — Close overlays (diff viewer, graph, confirm dialogs)

### Auto-Update System
- **Update check** on startup via ST's `/api/extensions/version` endpoint with proper auth headers
- **Amber pulsing dot** on brand icon when update available — icon glows amber in sync
- **Update banner** at top of panel: "Update Available" with **"Update & Reload"** button
- One-click update calls ST's `/api/extensions/update` (git pull) then reloads the browser
- **"Later"** dismisses the banner; clicking the glowing icon re-shows it
- Installing/success/error states with visual feedback
- Branch and commit hash displayed in settings header

### Font Scaling
- Adjustable font size slider (0.7x–1.5x) in settings
- Scales only text — layout elements (toolbar, meters, icons) unaffected
- Dashboard cards excluded from scaling

### Mobile Support
- Full-screen panel with slide animations
- Custom top bar replacing SillyTavern's toolbar
- Touch-optimized 42px tap targets
- Floating restore icon in ST's send form
- Post-generation banner notifications
<img width="473" height="1024" alt="image" src="https://github.com/user-attachments/assets/3bb99fa7-ddf6-408e-8568-e6288cc97a85" />


## Installation

### Method 1: SillyTavern Extension Installer
1. Open SillyTavern
2. Go to **Extensions** → **Install Extension**
3. Paste the URL:
   ```
   https://github.com/xenofei/SillyTavern-ScenePulse
   ```
4. Click Install
5. Reload SillyTavern

### Method 2: Manual (Git Clone)
```bash
cd SillyTavern/data/default-user/extensions/third-party
git clone https://github.com/xenofei/SillyTavern-ScenePulse
```
Restart SillyTavern after cloning.

## Quick Start

1. **Install the extension** using either method above
2. **Open a chat** with any character
3. ScenePulse appears as a **side panel** (desktop) or **radar icon** (mobile)
4. **Send a message** — the AI automatically appends tracker data
5. The dashboard updates with scene intelligence

### First-Time Setup
On first load, ScenePulse shows a **Setup Wizard** to configure:
- **Fallback profile** — a dedicated connection profile for when the AI omits tracker data
- **Fallback preset** — optimized sampler settings for JSON output
- **Auto-recovery** — whether to automatically retry when the tracker is missing

You can also take a **Guided Tour** to explore every feature with example data.

## How It Works

ScenePulse operates in **Together mode** by default:

1. A tracker prompt is injected into the AI's context via SillyTavern's interceptor
2. The AI writes its normal narrative response, then appends a JSON block wrapped in `<!--SP_TRACKER_START-->` / `<!--SP_TRACKER_END-->` markers
3. ScenePulse extracts the JSON, strips it from the visible message, and updates the dashboard
4. A **regex filter** (`markdownOnly: true`) strips tracker JSON from the DOM during markdown rendering — preventing the payload from ever being visible during streaming
5. A **streaming hider** (MutationObserver + 20ms polling) provides a CSS fallback layer
6. Malformed JSON is automatically repaired by the vendored [`jsonrepair`](src/vendor/) library (handles trailing commas, unquoted keys, unescaped quotes inside strings, single-quoted values, Python literals, comments, markdown fences, and ~20 other common LLM JSON errors via a tokenizer-based parser)
7. Post-extraction **schema validation** warns about missing fields or invalid enum values

If the AI omits the tracker, ScenePulse can **automatically fall back** to a separate API call using a dedicated connection profile.

### Separate Mode
Alternatively, ScenePulse can run a completely separate API call after each message — useful for models that struggle with inline instructions. Supports optional **function tool calling** for structured JSON output.

### Delta Mode
When enabled, the LLM returns only fields that changed since the last snapshot. The client merges the delta with the previous snapshot, reducing output tokens by ~70–90%. Entity arrays (characters, relationships, quests) are merged by name at the field level.

### Smart Snapshot Selection
When embedding multiple snapshots in the generation prompt, ScenePulse selects the most significant state changes (location changes, new characters, quest completions, tension shifts) rather than just the N most recent.

## Architecture

ScenePulse v6.x uses a modular ES module architecture with ~46 focused modules:

```
index.js                    ← Thin entry point (~320 lines)
style.css                   ← @import directives only
src/
  constants.js              ← Defaults, schemas, prompts, panel definitions
  logger.js                 ← Debug logging
  utils.js                  ← Shared utilities
  state.js                  ← Centralized mutable state with setter functions
  settings.js               ← Settings CRUD, snapshot management, language resolver
  schema.js                 ← Dynamic schema/prompt builders with language injection
  color.js                  ← Character color assignment with fuzzy matching
  normalize.js              ← Data normalization with WeakMap caching
  i18n.js                   ← Internationalization loader (29 languages in locales/*.json)
  update-check.js           ← Update check + one-click updater via ST's extension API
  story-ideas.js            ← Story idea injection
  slash-commands.js          ← Slash command registration (/sp)
  macros.js                  ← Custom macro registration ({{sp_*}})
  themes.js                  ← Theme presets (5 themes)
  stagnation.js              ← Scene stagnation detection
  generation/
    extraction.js           ← Inline tracker extraction with JSON repair
    streaming.js            ← Streaming hider (MutationObserver + 20ms polling)
    engine.js               ← Generation engine with retry/fallback
    delta-merge.js          ← Delta response merging
    interceptor.js          ← SillyTavern generate interceptor
    pipeline.js              ← Shared extraction→normalize→save→update pipeline
    function-tool.js         ← Function tool calling (Separate mode)
    validation.js            ← Post-extraction schema validation
  ui/
    mobile.js               ← Device detection, FAB, responsive layout
    panel.js                ← Side panel creation, toolbar, tablet/auto-condense
    update-panel.js         ← Dashboard rendering with leak-safe canvas animation
    section.js              ← Collapsible section builder
    weather.js              ← Weather particle system (9 types)
    time-tint.js            ← Time-of-day ambient overlays
    scene-transition.js     ← Location change animations
    timeline.js             ← Timeline scrubber + snapshot browser
    thoughts.js             ← Draggable thought panel with dynamic autofit
    message.js              ← Per-message integration + recovery card
    loading.js              ← Loading overlays and timers
    edit-mode.js            ← Inline field editing
    diff-viewer.js          ← Payload inspector with line-level diff
    sparklines.js           ← Relationship history sparklines + SVG graphs
    analytics.js            ← Token usage analytics panel
    character-wiki.js       ← Historical character browser overlay
    relationship-web.js     ← SVG circular relationship graph
  settings-ui/
    create-settings.js      ← Settings panel HTML template (tabbed)
    bind-ui.js              ← Settings form bindings with live language switch
    custom-panels.js        ← Custom panel manager
    setup-guide.js          ← First-run wizard
    guided-tour.js          ← Interactive feature tour
  vendor/
    jsonrepair.mjs          ← Vendored jsonrepair v3.12.0 (ISC) — tokenizer-based JSON repair
    jsonrepair.LICENSE      ← Full ISC license text
    README.md               ← Provenance, upgrade procedure, validation pointer
css/
  29 modular stylesheets    ← Split by component, loaded via @import
tests/
  vendor/                   ← Manual dev scripts for the vendored library
    jsonrepair.test.mjs     ← 106-case smoke suite
    compare.test.mjs        ← Old regex repair vs jsonrepair head-to-head
  *.test.mjs                ← 1,411-case regression suite (delta, profiles, slash,
                              macros, normalize, group chat, character aliases,
                              wiki persistence, crash log, temporal validation, etc.)
```

No bundler required — SillyTavern loads extensions as `<script type="module">`, so native ES imports work out of the box.

## Compatibility

- **SillyTavern** 1.12.0+ (tested up to 1.17.x)
- **Tested models**: GLM-4/5/5.1, Claude, GPT-4o, Gemini, Llama 3, Mistral, Qwen
- **API providers**: OpenAI-compatible, Anthropic, Google AI, any provider SillyTavern supports
- **Browsers**: Chrome, Firefox, Safari (mobile & desktop)
- **Languages**: 29 languages with full UI + LLM output localization

> **Note:** Together mode works best with instruction-following models that reliably append structured data. Smaller or older models may need Separate mode or a fallback profile.

## Configuration

Access settings via **Extensions** → **ScenePulse** in SillyTavern's settings panel. Settings are organized into 4 tabs:

### General Tab
| Setting | Description |
|---------|-------------|
| **Enable ScenePulse** | Master toggle |
| **Delta mode** | Enabled by default — LLM returns only changed fields, saving 66-77% output tokens. Auto-refreshes every 15 turns. Use `/sp-refresh` if data seems stale |
| **Function tool calling** | Use structured tool calling in Separate mode (experimental) |
| **Auto-generate** | Update tracker on every AI message |
| **Reduce visual effects** | Disables the animated dashboard canvas, particles, and decorative blend modes. Recommended on laptops or integrated GPUs |
| **Language** | UI + LLM output language (29 options, auto-detect) |
| **Theme** | Visual theme preset (5 options) |
| **Font scale** | Adjust text size (0.7x–1.5x) |

### Generation Tab
| Setting | Description |
|---------|-------------|
| **Injection method** | Together (inline) or Separate (dedicated API call) |
| **Context messages** | How many recent messages to include (Separate mode) |
| **Fallback profile** | Connection profile for auto-recovery |
| **Lorebook filter** | How lorebooks are included in generation context |

### Prompts Tab
| Setting | Description |
|---------|-------------|
| **Profile** | Active profile selector + new / duplicate / rename / export / import / delete / manage. Each profile bundles its own prompt + schema + panels |
| **System prompt** | The instruction sent to the model (writes to the active profile) |
| **JSON schema** | Output structure definition (writes to the active profile, lockable) |

### Advanced Tab
| Setting | Description |
|---------|-------------|
| **Max snapshots** | Maximum scene snapshots stored per chat (0 = unlimited) |
| **Generate / Clear / Reset** | Manual generation, data clearing, settings reset |
| **Export / Import Config** | Save/load ScenePulse configuration as JSON (includes profiles + per-chat panels) |
| **Debug Inspector** | Tabbed overlay: Activity (live debug log), Last Response (raw LLM JSON), Crashes (persistent error log with "Report on GitHub") |

## Custom Panels

Create custom tracking panels with any fields you need:

1. Open **Panel Manager** (grid icon in toolbar)
2. Scroll to **Custom Panels** → **+ Add Panel**
3. Add fields with:
   - **Key** — JSON field name (e.g., `player_health`)
   - **Label** — display name (e.g., "Health Points")
   - **Type** — text, number, meter (0–100), list, or enum
   - **LLM Hint** — instruction for the AI (e.g., "Current HP out of 100")

Custom fields are automatically included in the tracker prompt and extracted from AI responses.

## Known Issues

- **Model compliance** — Some models intermittently skip the tracker block or output mangled markers; the fallback system handles this with a separate API call, and extraction supports multiple marker variants
- **Delta mode** — Enabled by default since v6.9.0. If you see incomplete or stale data after many turns, use `/sp-refresh` to force a full-state regeneration. The system auto-refreshes every 15 delta turns
- **Payload visibility** — The regex filter and streaming hider work together to hide tracker JSON during streaming. In rare cases with very fast token rates, a brief flash may occur before the hider locks
- **Function tool calling** — Experimental, Separate mode only. GLM-5.1 tool calling is inconsistent; some generations may miss the tool call and fall back to text prompt
- **Mobile** — Weather effects, time-of-day tint, inner thoughts panel, and condense view are disabled on mobile to optimize performance
- **GPU on integrated graphics** — If the panel feels heavy on a laptop or low-power GPU, toggle **Reduce visual effects** in Settings → General. The animated dashboard canvas alone can be expensive on weaker hardware
- **Translations** — While all 29 languages have full translation coverage, some translations may be imperfect. Community corrections welcome — edit the JSON files in [`locales/`](https://github.com/xenofei/SillyTavern-ScenePulse/tree/main/locales)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for the full version history.

**Latest: v6.24.0** — Temporal validator (auto-corrects backward / implausible-forward time jumps from the LLM while respecting intentional plot-driven flashbacks via a new optional `temporalIntent` schema field). Eight prior v6.23.x fixes covered: streaming-hider element binding, blue-bleed class-name collision, fallback preset/sampler stop-swapping, stale "0" auto-migration, model-name reporting accuracy, and a Together-mode regression urgent fix. 1,411 tests passing.

## Contributing

Found a bug? Have a feature idea? Contributions welcome!

1. [Open an issue](https://github.com/xenofei/SillyTavern-ScenePulse/issues) to report bugs or suggest features
2. Fork the repo, create a branch, and submit a PR
3. **Translations** — Add or improve translations in [`src/i18n.js`](src/i18n.js). Each language is a simple key-value object.
4. Join the discussion in the issues tab

## Inspiration

ScenePulse started as a desire for something more — a scene-aware companion that could grow alongside the stories being told. These projects paved the way and remain worth checking out:

- [**RPG Companion**](https://github.com/SpicyMarinara/rpg-companion-sillytavern) by SpicyMarinara — The original RPG tracking extension for SillyTavern
- [**Dooms Enhancement Suite**](https://github.com/DangerDaza/Dooms-Enhancement-Suite) by DangerDaza — A comprehensive SillyTavern enhancement suite for RPG tracking and scene management
- [**WTracker**](https://github.com/bmen25124/SillyTavern-WTracker) by bmen25124 — Lightweight world state tracking
- [**zTracker**](https://github.com/Zaakh/SillyTavern-zTracker) by Zaakh — Scene and character tracking with a clean UI

Their ideas and approaches directly shaped what ScenePulse is becoming. If you're exploring scene tracking or extensions for SillyTavern, give them a look.

## License

GPL-3.0 License — see [LICENSE](LICENSE) for details.

---

<div align="center">

*Built by [xenofei](https://github.com/xenofei)*

*Every scene has a pulse. Now you can feel it.*

</div>
