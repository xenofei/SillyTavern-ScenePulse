<!-- ⚠️ WORK IN PROGRESS ⚠️ -->

> **⚠️ EARLY ACCESS — WORK IN PROGRESS**
>
> ScenePulse is under active development. Expect rough edges, visual glitches, and frequent updates. Some AI models may not reliably produce tracker data in Together mode. Mobile support is functional but still being refined. If something breaks, please [open an issue](https://github.com/xenofei/SillyTavern-ScenePulse/issues) — your feedback shapes what gets fixed next.

---

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

### Slash Commands *(Experimental)*
- `/sp status` — Show tracker state summary
- `/sp regen [section]` — Regenerate tracker
- `/sp clear` — Clear all tracker data (with confirmation)
- `/sp toggle <panel>` — Toggle panel on/off
- `/sp export` — Export tracker history as JSON
- `/sp debug` — Show diagnostics
- `/sp help` — List commands

### Custom Macros *(Experimental)*
Template variables for use in character cards, system prompts, Quick Replies:
- `{{sp_location}}`, `{{sp_time}}`, `{{sp_date}}`, `{{sp_mood}}`, `{{sp_tension}}`
- `{{sp_weather}}`, `{{sp_topic}}`, `{{sp_characters}}`, `{{sp_quests}}`
- `{{sp_northstar}}`, `{{sp_summary}}`, `{{sp_temperature}}`

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
6. Malformed JSON is automatically repaired (trailing commas, unquoted keys, unescaped quotes)
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
  i18n.js                   ← Internationalization (29 languages, 344 keys)
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
    panel.js                ← Side panel creation and toolbar
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
    sparklines.js            ← Relationship history sparklines + SVG graphs
    analytics.js             ← Token usage analytics panel
  settings-ui/
    create-settings.js      ← Settings panel HTML template (tabbed)
    bind-ui.js              ← Settings form bindings with live language switch
    custom-panels.js        ← Custom panel manager
    setup-guide.js          ← First-run wizard
    guided-tour.js          ← Interactive feature tour
css/
  27 modular stylesheets    ← Split by component, loaded via @import
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
| **Delta mode** | Return only changed fields — saves tokens (experimental) |
| **Function tool calling** | Use structured tool calling in Separate mode (experimental) |
| **Auto-generate** | Update tracker on every AI message |
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
| **System prompt** | The instruction sent to the model |
| **JSON schema** | Output structure definition (lockable) |

### Advanced Tab
| Setting | Description |
|---------|-------------|
| **Max snapshots** | Maximum scene snapshots stored per chat (0 = unlimited) |
| **Generate / Clear / Reset** | Manual generation, data clearing, settings reset |
| **Export / Import Config** | Save/load ScenePulse configuration as JSON |
| **Debug tools** | SP Log, Console, Last Response, View Log |

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
- **Delta mode** — Experimental. Some models may not reliably return only changed fields, leading to missing data. Disable delta mode if you see incomplete snapshots
- **Payload visibility** — The regex filter and streaming hider work together to hide tracker JSON during streaming. In rare cases with very fast token rates, a brief flash may occur before the hider locks
- **Function tool calling** — Experimental, Separate mode only. GLM-5.1 tool calling is inconsistent; some generations may miss the tool call and fall back to text prompt
- **Slash commands / macros** — Experimental, need further testing ([#7](https://github.com/xenofei/SillyTavern-ScenePulse/issues/7), [#8](https://github.com/xenofei/SillyTavern-ScenePulse/issues/8))
- **Mobile** — Weather effects, time-of-day tint, inner thoughts panel, and condense view are disabled on mobile to optimize performance
- **Translations** — While all 29 languages have full translation coverage, some translations may be imperfect. Community corrections welcome in [`src/i18n.js`](https://github.com/xenofei/SillyTavern-ScenePulse/blob/main/src/i18n.js)

## Changelog

### v6.6.0
- **Auto-update system** — Update check with proper ST auth headers. Amber pulsing dot + banner with one-click "Update & Reload" button. Calls ST's git pull endpoint then reloads browser.
- **Historical node navigation** — Clicking timeline dots or Browse All items scrolls to the message in chat, auto-loading lazy-loaded messages via `showMoreMessages`. Works with messages not currently in the DOM.
- **Message highlight animation** — JS-driven glow pulse with graceful synchronized fade on outline + box-shadow. Bypasses CSS animation restrictions from ST themes.
- **Graph hover tooltips** — Hovering data points shows message preview (150 chars), location, mood, tension near the cursor. Click navigates to that message.
- **Mobile graph support** — Tap shows info panel with "Go to message" button for touch devices.
- **Browse All pagination** — 10 items per page with First/Prev/Next/Last navigation. Starts on most recent page. Larger fonts (13-15px).
- **Unlimited snapshot storage** — Default `maxSnapshots: 0` (unlimited). User-configurable in Advanced settings.
- **Graph capped to 30 data points** — X-axis labels auto-skip to prevent overlap on high message counts. "Showing last 30" indicator when capped.
- **Unique per-meter delta icons** — Emotionally distinct up/down SVGs: full/cracked heart, bright/dim star, Adinkra/X'd symbol, calm shield/lightning bolt, linked/separated rings. Stress uses yellow up / green down.
- **Relationship meter improvements** — Bars aligned across all resolutions with fixed-width columns. Mini sparklines always visible. Icons inline after delta values.
- **Settings improvements** — Schema lock/unlock with single confirmation. Disabled state grays out everything except enable checkbox. Max snapshots setting.
- **Streaming hider** — More aggressive early detection (`"time":` + time format pattern). Catches partial SP markers during streaming.

### v6.3.6
- **Relationship sparklines** — Mini inline sparklines on each meter, full-screen SVG graph overlay with clickable legend, area fill, value labels, per-snapshot stats, and clickable X-axis labels for historical navigation
- **Token analytics panel** — Full-screen overlay with summary cards, source breakdown, and per-snapshot token/time table
- **Theme presets** — 5 themes (Default, Midnight, Fantasy, Cyberpunk, Minimal) with live CSS variable switching
- **Slash commands** — `/sp status`, `regen`, `clear`, `toggle`, `export`, `debug`, `help` (experimental)
- **Custom macros** — 12 template variables: `{{sp_location}}`, `{{sp_time}}`, `{{sp_mood}}`, etc. (experimental)
- **Scene stagnation detection** — Alerts when tension/mood/topic are static for 4+ messages
- **Snapshot browser** — "Browse All" button for navigating all historical snapshots
- **Function tool calling** — Separate mode only, experimental
- **Post-extraction schema validation** — Warns about missing fields and invalid enums
- **Shared extraction pipeline** — Eliminates 3-way extraction/save/render duplication
- **Smart snapshot selection** — Embeds most significant state changes, not just most recent
- **Config export/import** — Save/load full settings as shareable JSON
- **Settings tabs** — General, Generation, Prompts, Advanced
- **Accessibility** — focus-visible, prefers-reduced-motion, screen reader support
- **Keyboard shortcuts** — Alt+Shift+P (panel), Alt+Shift+R (regen), Escape (close overlays)
- **Unique per-meter delta icons** — Heart, Adinkra, star, lightning/shield, venn rings with green/red/yellow variants
- **Inline recovery card** — Retry button shown when extraction fails
- **Error boundary** — updatePanel restores previous content on render failure
- **ST version check** — Warns if SillyTavern < 1.12.0
- **Timer leak fixes** — Intervals moved from DOM elements to module state
- **Streaming hider** — 20ms polling, aggressive early key detection, regex catches partial markers
- **max_tokens** — No longer overridden by ScenePulse; user's ST preset controls token budget

### v5.9.8
- **Payload hiding during streaming** — Tracker JSON hidden using SillyTavern's regex pipeline (`markdownOnly: true`). Handles SP markers, mangled variants, and markerless raw JSON patterns.
- **Markerless JSON extraction** — `RAW_TIME_KEY_SCAN` fallback detects `{"time":` patterns.
- **JSON repair** — Enhanced repair pipeline for malformed tracker JSON.

### v5.8.7
- **Localization** — Full UI translation for 29 languages. Enum values translated at display time. Live language switch.
- **Delta mode** — LLM returns only changed fields. ~70–90% token savings.
- **Quest completion system** — Full lifecycle with user management.
- **Payload Inspector** — 5-mode diff viewer.
- **Font scaling** — 0.7x–1.5x text-only scaling.
- **Performance** — Canvas animation leak fixed, caching, debouncing.

### v5.1.1
- **Modular architecture** — Refactored from monolithic 5,500-line `index.js` into ~30 ES modules

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
