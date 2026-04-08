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

### [6.8.15] — 2026-04-08

#### Fixed — group chat support
- **Group chats now track all participating characters, not just the first one.** Previously ScenePulse had zero group-chat awareness: no code path read SillyTavern's `selected_group` context, no prompt injection listed the group roster, and the filter cascade silently dropped any character the model forgot to mention each turn. In a 3-character group chat the model would typically emit data for whichever character was speaking and ScenePulse would destroy the other two on save. Five-layer fix:
  1. **New `getGroupMemberNames()` helper** in `src/normalize.js` resolves the active group's member list from `SillyTavern.getContext().groups[selected_group].members`, mapping each member reference to a character name via `context.characters` or the file-extension-stripped raw reference as fallback.
  2. **Interceptor prompt injection** (`src/generation/interceptor.js`) — when a group chat is active with >1 members, the mandatory hints section now explicitly lists all group participants by name and tells the model "ALL of these characters MUST appear in both the characters array and charactersPresent (unless the narrative has explicitly removed them from the scene)." This is seen at maximum attention weight with every generation.
  3. **Group carry-forward in `normalizeTracker`** — if the model omits a group-member character from the current turn's output, the missing entry is restored from the previous snapshot with all its fields intact (deep-cloned so history isn't mutated). The model's output for present characters still wins; only truly-missing members are carried forward.
  4. **`filterForView` group rescue** — unions the group roster into `presentSet` before filtering, so `characters` and `relationships` keep their group-member entries even when the model left them out of `charactersPresent`. Also fixes the sync filter to read from the already-cleaned `out` rather than the raw `snap` input.
  5. **`_isPrimary` computed flag** replaces the brittle `name2`-only sort logic across `update-panel.js`, `thoughts.js`, and `character-wiki.js`. In single chats the bot character is primary; in group chats every group member is primary and they all bubble to the top as a cohort. Primary characters get a slightly heavier left-border accent via the new `.sp-char-primary` CSS class.

#### Changed — character schema trim
- **Deleted 8 redundant character fields.** The character schema was collecting 22 required fields per entry every turn, with significant redundancy and some fields that were forcing the model into structured output about reproductive state for every NPC including children — a safety-refusal risk. The trim removes:
  - `stateOfDress` (the outfit field's free text already describes clothing state; the enum was redundant)
  - `physicalState` (overlapped with `posture` — vague instructions meant the model emitted the same content in both)
  - `fertReason`, `fertCyclePhase`, `fertCycleDay`, `fertWindow`, `fertPregnancy`, `fertPregWeek` (three different representations of the same biological state, could drift out of sync, and the 8-field cluster was a major token sink for characters where fertility isn't relevant)
- **Kept `fertStatus` + `fertNotes`** — status remains a simple active/N/A enum; any details the user wants go in a single free-text notes field. Storage is smaller, the model can't drift, and the UI has nothing to render when the status is N/A.
- **Added `notableDetails`** as a single optional free-text field for distinguishing features that don't fit the structured slots — scars, tattoos, accents, mannerisms, glasses, disabilities, nervous tells. Replaces the dumping-ground behavior where these leaked into `face` or `physicalState` inconsistently.

#### Changed — character UI
- **`innerThought` is now rendered in the main character card**, not just in the thought panel and Character Wiki. The field was collected every turn but invisible to users who didn't open those other views. It's a first-class row in the card body, editable via the inline edit mode, with italic styling and a dashed top border to separate it from role.
- **`role` is rendered in full** as an editable card body row, replacing the old header badge that passed the value through a destructive `shortRole()` regex (which chopped text after conjunctions like "who", "that", "and" and capped at 80 chars). The stored data is now visible end-to-end.
- **Character appearance grid simplified** to the trimmed schema: Hair, Face, Outfit, Posture, Proximity, Notable Details, Inventory. Fewer fields, clearer purpose per field.

#### Changed — prompt clarifications
- **Character cardinality cap**: "Maximum 5 character entries per turn. Track only named or plot-relevant NPCs. Background crowd members, extras, and incidental walk-ons do NOT get character entries — mention them in sceneSummary instead."
- **Proximity now specifies "relative to `{{user}}`"** with concrete examples ("arm's reach", "across the table", "in the next room", "three blocks away"). The previous bare "position/distance" wording drifted across turns.
- **`innerThought` guidance rewritten positively** — the old "NEVER include emotion labels" prohibition was ambiguous on the boundary between "I'm scared" (valid thought) and "scared, anxious, panicked" (invalid label list). New guidance says: "Write it as dialogue they have with themselves — use their voice, their word choices, their cadence. BE them for one sentence." The RIGHT/WRONG examples are preserved but framed as "this is a description of feelings, not a thought" for the wrong case.
- **Goals vs quests distinction** explicit: character goal fields describe what THE CHARACTER wants from their perspective; quest journal entries describe what {{user}} is doing from the user's perspective. A character goal does not automatically become a user quest. Explicit protection for user-added quests: "Respect {{user}}'s existing quest journal: if quests are carried forward from previous state (including manually-added ones the user created via the UI), do NOT try to consolidate them into character goals or drop them because a character has a related motivation."
- **Outfit absorbs state of dress**: "Full outfit description including all layers AND current state (neat/rumpled/disheveled/partially undressed). ONE field — do NOT emit stateOfDress separately."
- **Posture absorbs physical state**: "Body language, stance, AND physical state (alert/tense/exhausted/intoxicated/injured). ONE field — do NOT emit physicalState separately."
- **Fertility guidance simplified**: "fertStatus is 'active' only when pregnancy or cycle tracking is narratively relevant to the story. Default to 'N/A' for children, men, non-human characters, and any scenario where fertility isn't part of what's happening. When 'active', put the details (cycle day, phase, window, pregnancy week, notes) as free text in fertNotes — a single field, not a structured dump."

#### Migration
- **Lazy v6.8.15 migration in `settings.getTrackerData()`** walks every stored snapshot in a chat on first load and folds legacy fields into their surviving counterparts: `stateOfDress` → appended to `outfit` in parentheses; `physicalState` → appended to `posture` with a semicolon; structured fertility fields (`fertReason`, `fertCyclePhase`, `fertCycleDay`, `fertWindow`, `fertPregnancy`, `fertPregWeek`) → concatenated into `fertNotes` as a free-text summary; `notableDetails` → initialized to empty string. The legacy keys are then deleted from storage. Guarded by a per-chat `_spCharTrimMigrated` flag so the scan only runs once.
- Same fold-in logic runs in `normalizeChar()` during every tracker extraction, so legacy snapshots that bypass the migration (e.g. data from another source) still get cleaned on the way through normalize.

#### Removed — i18n
- Deleted 203 lines across `src/i18n.js` covering 7 field labels × 29 languages: `Dress`, `Physical`, `Cycle Phase`, `Cycle Day`, `Window`, `Pregnancy`, `Preg. Week`. Added 29 new `Notable Details` entries (one per language) with translations for all 29 locales.

#### Tests
- **New `tests/group-chat.test.mjs` with 20 cases** covering `getGroupMemberNames()` in single and group modes, `_isPrimary` derivation for both chat types, group carry-forward when the model omits members, duplicate prevention when the model emits all members, `filterForView` group rescue, and a single-chat regression guard.
- Full sweep: 134/134 (20 group-chat + 46 no-user-as-character + 24 classify-quest + 26 delta-merge-fuzzy + 18 extraction-cleanjson). No regressions.

### [6.8.14] — 2026-04-08

#### Fixed
- **`{{user}}` is never tracked as a character anymore.** The model was occasionally creating character entries for the player — by persona name, by the literal `{{user}}` template token, or by aliases like "You" / "User" / "Player". Those entries then got their own inner-thought cards in the thought panel, their own appearance grid, and their own relationship meters pointing at themselves. The prompt already said "EXCEPT `{{user}}`" but the model was ignoring it under long-context pressure.

#### Added — five-layer defense
- **`isUserName(name)` exported from `src/normalize.js`** — canonical user-name detection. Matches SillyTavern's `name1` (case-insensitive, trimmed), the literal `{{user}}` template token, and the common aliases "user" / "you" / "player" / "me". Single source of truth shared across normalize + filterForView.
- **`normalizeTracker()` filters the user from three arrays**:
  1. `o.characters` — stripped after all primary, failsafe, and alternate-key population paths run, so one filter guarantees the user never reaches the view layer regardless of which path built the array
  2. `o.relationships` — self-relationship entries dropped (a user can't have a relationship with themselves; the array expresses how NPCs perceive the user, not vice versa)
  3. `o.charactersPresent` — filtered at read time before the fallback derivation logic runs
- **`filterForView()` belt-and-braces strip** — defensive filter at the view layer catches any legacy snapshot or alternate code path that skipped normalize. Also fixes a pre-existing subtle bug where the char/rel sync block was re-reading `snap.charactersPresent` instead of the already-stripped `out.charactersPresent`, which could have reintroduced the user from legacy data.
- **v6.8.14 snapshot migration in `settings.getTrackerData()`** — heals existing chats by walking every stored snapshot once on first load, stripping `{{user}}` entries from `characters`, `relationships`, and `charactersPresent`. Guarded by a per-chat `_spUserStripMigrated` flag so the scan only runs once. Persists via `saveMetadata()` when any snapshot was touched. Uses an inline minimal helper (not the normalize export) to avoid a circular import.
- **Prompt strengthened at two places**:
  - `src/constants.js` BUILTIN_PROMPT — new CRITICAL bullet in the Characters section: "NEVER include {{user}} as a character entry. {{user}} is the player — the human reader — not an NPC. {{user}} has no innerThought field, no role, no appearance fields." Relationships section expanded to explicitly forbid self-relationships.
  - `src/generation/interceptor.js` runtime reminder — new CRITICAL section at the top of the prev-state injection, seen at maximum attention weight with every delta-mode generation. Explicitly forbids user entries in `characters`, `relationships`, AND `charactersPresent`.

#### Added — tests
- **`tests/no-user-as-character.test.mjs`** — 46 new test cases covering `isUserName` direct matches (persona name + aliases + case/whitespace variations), `isUserName` non-matches (NPC names, empty/null/undefined, partial matches, `{{char}}` template token), `normalizeTracker` stripping from characters/relationships/charactersPresent under every alias, `filterForView` defensive strip on legacy snapshots, and a regression guard ensuring NPC-only data passes through unchanged. 46/46 passing.
- **Full regression sweep**: 114/114 total across all four suites (46 no-user + 24 classify-quest + 26 delta-merge-fuzzy + 18 extraction-cleanjson). No regressions.

### [6.8.13] — 2026-04-07

#### Fixed
- **"Updated" badges only fire on meaningful quest changes now.** The quest journal badge fired on any string difference between turns — including cosmetic rephrasings, punctuation tweaks, and filler-word swaps that the model produces under structured-output pressure just to feel like it's emitting work. Real story progress and trivial wording noise got the same visual weight. The classifier has been rewritten to require one of three substantive signals before flagging an "Updated" badge: (a) urgency changed, (b) name changed, or (c) detail content meaningfully changed measured by Jaccard similarity over stopword-filtered, stemmed tokens. Detail diffs with ≥75% token overlap are now classified as `stale` (no badge) and logged at diagnostic level for observability.

#### Prompt — stop the edits at the source
- **New MUST-level "quest update rules" section in BUILTIN_PROMPT** ([src/constants.js](src/constants.js)). The model is now explicitly told it MUST NOT modify an existing quest's name, detail, or urgency unless one of these specifically happened in the turn being written:
  1. **Urgency changed** — the story actually shifted the stakes (deadline passed, threat neutralized, preparation completed)
  2. **Concrete new information** — the detail needs to reflect a fact that didn't exist last turn, with the specific scene beat cited
  3. **Resolution** — urgency is being set to `"resolved"` because a resolution trigger fired
- If none of those apply, emit the quest **byte-identical** to last turn, or omit it from the delta entirely. Rephrasing, synonym swaps, filler additions, and "refreshing" a detail for its own sake are explicitly forbidden. New REMINDER rule #6 reinforces the no-cosmetic-edit rule in plain language.
- **Runtime reminder updated in `src/generation/interceptor.js`** — the same rules injected with every delta-mode tracker generation so the model sees them at maximum attention weight.

#### Added
- **`src/ui/classify-quest.js`** — new standalone module housing the meaningfulness-aware classifier. Pure function, no DOM dependencies, directly testable in node. Exports `classifyQuest(q, prev, hasPrevSnap)` and `COSMETIC_SIMILARITY` constant (`0.75`).
- **Jaccard-similarity threshold of `0.75`** — details with ≥75% non-stopword stemmed-token overlap are treated as cosmetic. Tuned against realistic cases: punctuation tweaks (similarity 1.00), stopword swaps (1.00), casing changes (1.00) all suppress; adding one or more concrete content words (0.60) or replacing the content entirely (0.00) all flag.
- **Diagnostic logging** — when a below-threshold diff is suppressed, `classifyQuest` emits a `log()` line with the quest name, similarity score, and trimmed previews of both details. Gives us observability into how often the model is ignoring the prompt rule without polluting the UI.
- **Exported `tokenizeQuestText` and `jaccardSimilarity` from `src/generation/delta-merge.js`** as stable public entry points so `classify-quest.js` reuses the exact same normalization rules (stopword set, stemmer, punctuation strip) as the fuzzy dedup. Single source of truth for quest-text tokenization.
- **`tests/classify-quest.test.mjs`** — 24 new test cases covering: baseline states (resolved, new, no-prev-snap), identical entries, cosmetic edits (punctuation, casing, stopword swaps), urgency changes, substantive detail additions, name changes, empty-detail edge cases, and borderline cases near the threshold. 24/24 passing. All three test suites (classify + fuzzy + cleanJson) total 68/68 passing.

#### Why the prompt AND the classifier both need the fix
The prompt-level rule targets the root cause: the model makes trivial edits because the schema slot encourages "something must have changed this turn." The classifier-level rule is a safety net for when the model ignores the prompt anyway (which it will, under long-context pressure). Both layers are defensive — either alone would help, but together they eliminate the noise from two independent angles.

### [6.8.12] — 2026-04-07

#### Fixed
- **Thought panel showed all historical characters after a page refresh.** Character storage accumulates every character ever encountered in a chat (since v6.6.5, to support the Character Wiki overlay). The view-layer filter via `filterForView` trims storage down to only `charactersPresent` names and is correctly applied inside `updatePanel` before the quest journal and character list render. But the thought panel's `updateThoughts` function was called from five other code paths that passed raw unfiltered storage: `renderExisting` on page refresh, the toolbar thoughts toggle, panel re-show, settings toggle, and settings reset. Each of those paths rendered thought cards for every accumulated character — including ones who had left the scene many turns ago. Most visibly after a page refresh, which is when `renderExisting` runs.
- Filtering now happens inside `updateThoughts` itself at the render choke point. Applied once via `filterForView` (which honors the `_spViewFiltered` idempotence flag), so the existing `updatePanel → updateThoughts` path is still a single filter pass. All five previously-broken call sites are fixed without touching their call sites.

### [6.8.11] — 2026-04-07

#### Fixed
- **Quest resolution is now required, not optional.** The carry-forward instruction in both the main system prompt (`src/constants.js` BUILTIN_PROMPT) and the runtime prev-state reminder (`src/generation/interceptor.js`) used `MAY mark a quest as "resolved"` language, which allowed the model to leave stale completed quests hanging in the journal indefinitely. Replaced with a MUST-level rule plus four concrete resolution triggers: goal accomplished, situation moot, user abandoned, or superseded by a later quest. The prompt now explicitly says "this is not a judgment call — any of these triggers means the quest MUST flip to `resolved` on this turn." Also adds the resolved-stays-one-turn lifecycle explanation so the model understands why it shouldn't silently delete.
- **Cross-tier quest duplication.** The model was emitting the same underlying quest in both `mainQuests` and `sideQuests` under long-context pressure — a failure mode the prompt forbade but didn't enforce. A new `consolidateQuests()` function runs as a post-merge cleanup pass that (a) fuzzy-dedups inside each tier (the existing v6.8.8 logic, now extracted and exported) and (b) adds a cross-tier phase where `mainQuests` wins over `sideQuests` on fuzzy match — if a sideQuest's name fuzzy-matches a mainQuest at ≥0.60 Jaccard similarity, the sideQuest is dropped and its non-empty field values are merged into the matching main entry (main name stays canonical).

#### Added
- **`consolidateQuests(snap)` exported from `src/generation/delta-merge.js`.** Mutates the snapshot in place and returns it for chaining. Two phases: in-tier fuzzy dedup via `_dedupQuestArray`, then cross-tier mainQuests-absorbs-sideQuests. Safe to call on any snapshot-shaped object including legacy ones with missing or non-array tier fields. Idempotent.
- **v6.8.11 migration in `settings.getTrackerData()`** — runs `consolidateQuests()` over every snapshot in a chat on first read. Guarded by a new per-chat `_spQuestDedupMigrated` flag so the scan only runs once even though `getTrackerData` is hot. Persists via `saveMetadata()`. Heals existing chats that accumulated quest duplicates before this release landed.
- **4 new cross-tier dedup test cases** in `tests/delta-merge-fuzzy.test.mjs`: mainQuests absorbs matching sideQuest, unrelated sideQuests stay in their tier, no-op when mainQuests is empty, multiple sideQuests absorbing into the same mainQuest. 26/26 total cases pass.

#### Changed
- The post-merge pass inside `mergeDelta()` is now a single `consolidateQuests(merged)` call instead of an inline per-tier loop. Behavior on a single delta merge is unchanged; the refactor exists so the migration path in `settings.js` can call the same function without duplicating logic.

### [6.8.10] — 2026-04-07

#### Fixed
- **Quest mutation buttons (delete / complete / undo / edit detail / edit name) now look up the storage entry by name instead of by view index.** When a quest tier exceeds its display cap, `filterForView` reorders the view to show high-urgency quests first. The mutation handlers were using the view index to splice/mutate the storage array, which silently mutated the wrong quest in storage and caused the panel to re-render with the visible quest still present. Most visible symptom: clicking the delete button on a `mainQuests` entry appeared to do nothing because the wrong storage entry was being removed and the visible high-urgency quest just bubbled back to the top of the view on re-render. Tiers under their cap (where view order matched storage order) were unaffected.
- New `_findQuestStorageIdx(snap, tierKey, name)` helper resolves storage indices by name lookup (the canonical merge key used by `mergeEntityArray`). All five mutation handlers now refuse to mutate when the lookup returns -1 rather than guessing at a position. The name-edit handler captures the old name *before* mutating `p.name` so the lookup uses the pre-edit identifier.

This is a v6.8.8 regression introduced when per-tier view caps were added — the existing handlers were written assuming view-index = storage-index, which became false the moment the cap started reordering.

### [6.8.9] — 2026-04-07

#### Removed
- **`activeTasks` quest tier removed entirely.** The tier had no clear domain — its definition ("immediate concrete to-do items") invited the model to treat the quest journal as a reactive scene-by-scene to-do list rather than a forward-looking life roadmap, generating one entry per narrative beat. Real-world chats accumulated dozens of entries over a single session because every scene-level action became a new task. The previous fuzzy dedup work in v6.8.8 catches paraphrase duplicates but cannot fix this — the model was correctly interpreting an impossible instruction. Removing the tier eliminates the category mistake at the source.

#### Migration
- **Lazy snapshot migration.** Old chats with `activeTasks` data persisted in `chatMetadata.scenepulse.snapshots[*]` are migrated transparently on the first read of the chat. The migration strips the `activeTasks` field from every snapshot in the chat, sets a per-chat flag so the scan only runs once, and persists the cleaned metadata back to disk via `saveMetadata()`. Idempotent and silent.
- Defensive strip points at every choke point in the data flow: `delta-merge` drops the field from both prev-snapshot input and incoming delta payloads, `interceptor`'s `_cleanSnap` removes it before sending the previous state to the LLM, `engine`'s `_cleanSnapForPrompt` and continuation `_cleanSnap` do the same on the separate-generation path, and `filterForView` deletes it before render. Any path that bypasses one strip is caught by another.
- The model is no longer told the field exists — system prompt, dynamic schema builder, and interceptor's mandatory hints all omit it.

#### Changed — quest journal redesign
- **Hard caps in the prompt**: `mainQuests` MAX 3, `sideQuests` MAX 4. The previous prompt had no upper bound and relied on the model's judgement, which produced 6+ main quests and 4+ side quests in long chats.
- **Velocity limit**: "Introduce AT MOST 1 new quest per turn. If the scene has many possible actions, those belong in `sceneSummary` or each character's `immediateNeed` / `shortTermGoal` — NOT as new quests. Prefer updating an existing quest's detail over creating a new one."
- **Duration test in the prompt**: "Before adding a quest, ask: 'will this still matter 5 scenes from now?' If no, it is NOT a quest. Write it into `sceneSummary` instead. The quest journal is a save-game log, not a to-do list for the current scene."
- **Tightened tier definitions**: `mainQuests` are now defined as "primary life arcs that persist across dozens of scenes and take hours, days, or weeks of in-story time to progress" with explicit examples of what does and does not qualify. `sideQuests` similarly tightened to "optional life paths pursued in parallel".
- View cap reduced from `mainQuests: 5 / sideQuests: 6 / activeTasks: 8` (19 total) to `mainQuests: 5 / sideQuests: 6` (11 total). The prompt-level caps are the primary throttle; the view caps remain as a small-buffer safety net.

#### Files touched (16)
`src/constants.js` (schema, BUILTIN_PANELS, BUILTIN_PROMPT, TOUR_EXAMPLE_DATA, REMINDER, hard caps + velocity + duration test), `src/schema.js` (dynamic builder), `src/normalize.js` (drop field, view cap, audit, defensive strip in `filterForView`), `src/generation/delta-merge.js` (ENTITY_ARRAYS, QUEST_ARRAYS, prev/delta strips), `src/generation/interceptor.js` (`_cleanSnap`, mandatoryHints), `src/generation/engine.js` (`_cleanSnap`, `_cleanSnapForPrompt`, `prevQuests` set, partKey field map, `KNOWN` keys, log summary), `src/generation/extraction.js` (KNOWN_KEYS), `src/generation/pipeline.js` (log summary), `src/ui/update-panel.js` (quest tier loop, badge counts, prev map, QUEST_ICONS), `src/ui/timeline.js` (questCount), `src/slash-commands.js` (status summary), `src/macros.js` (`sp_quests` handler), `src/i18n.js` (58 entries removed across 29 languages), `src/settings-ui/guided-tour.js` (Quest Journal step), `src/settings.js` (lazy snapshot migration in `getTrackerData()`), `css/quests.css` (`.sp-tier-tasks` rule), plus `tests/delta-merge-fuzzy.test.mjs` updated.

### [6.8.8] — 2026-04-07

#### Fixed
- **Quest journal no longer accumulates near-duplicates turn after turn.** Quest names are generated fresh each turn by the model and drift across paraphrasings (for example, "pay and dismiss uber driver" → "pay and direct uber driver"). The previous merge logic only matched exact lowercased names, so every paraphrase became a new quest and the tier grew unboundedly. A single long chat in testing hit 39 active tasks before the fix.

#### Added — fuzzy quest consolidation
- **Fuzzy dedup in `delta-merge.js`** — applied only to the three quest arrays (`mainQuests`, `sideQuests`, `activeTasks`). Characters and relationships still match by exact name (their names are identity). When exact match fails, the merge logic tokenizes both quest names, strips punctuation and stopwords, stems suffixes (`cook`/`cooking`/`cooked`/`cooks` → `cook`), and computes Jaccard similarity over the remaining token sets. A score of 0.60 or higher treats the two as the same quest and merges them field-level.
- **Post-merge dedup pass** — runs once after the per-entry merge on each quest tier to catch two cases the per-entry path can't: (a) near-duplicates already present in the carried-forward previous snapshot (heals existing chats with bloated quest piles) and (b) two paraphrases of the same quest in a single delta batch (where the per-entry path treats each as new because they're both being added in the same step).
- **Stability rule**: on a fuzzy match, the existing quest's canonical name is preserved — the delta's rephrasing is discarded so the user doesn't see quest names reshuffle every turn. On an exact match the names are identical by definition so this is a no-op.
- **Threshold tuned against real log data.** Paraphrase cases consolidate ("pay and dismiss uber driver" ↔ "pay and direct uber driver" → 0.60 match). Distinct but related tasks stay separate ("get jenna medical help" vs "get jenna to hospital" → 0.40 no match). Parent vs qualified child stays separate ("comfort jenna" vs "comfort jenna after confession" → 0.50 no match).

#### Added — per-tier view caps
- **Quest tier display caps in `filterForView`** — `mainQuests` max 5, `sideQuests` max 6, `activeTasks` max 8. When a tier exceeds its cap, quests are scored by urgency × recency and the top N are shown. **Storage is never touched** — the full quest array persists in the snapshot and is still visible in the Character Wiki, Payload Inspector, and any export. Only the main panel view is capped. This is the safety net: even if fuzzy dedup misses something, the user never sees a quest journal longer than 19 items total.

#### Changed
- **Interceptor prompt wording** — replaced the `"NEVER drop quests"` directive with permission for the model to consolidate duplicates and near-duplicates into a single clearer entry. The old wording was too absolute and directly encouraged the accumulation pathology. Now: "You MAY consolidate duplicates or near-duplicates into a single clearer entry — prefer consolidation over duplication." Applied to both the injected prompt in `src/constants.js` and the runtime reminder in `src/generation/interceptor.js`.

#### Notes
Four layers of defense stack: (1) prompt lets the model consolidate on its side, (2) fuzzy merge catches paraphrases the model still emits, (3) post-merge dedup heals existing quest piles in carried-forward state, (4) view cap guarantees a readable journal even if all three upper layers miss. New test harness at `tests/delta-merge-fuzzy.test.mjs` with 15 cases covering exact-match regression, real paraphrase cases, below-threshold cases, no-fuzzy on characters/relationships, post-merge healing of existing piles, same-batch paraphrase collapse, and false-positive guards against unrelated quests.

### [6.8.7] — 2026-04-07

#### Fixed
- **Balanced-brace JSON extraction in `cleanJson()`** — the extractor now walks forward from the first `{` tracking brace depth (string-aware) and stops at the first balanced close, instead of using `lastIndexOf('}')`. This correctly handles trailing junk after the first complete JSON object — for example, when another extension's version tag (`{"@schema":"1.1"}`) is echoed by the model inside ScenePulse's tracker markers. The previous approach concatenated both objects and fed them to `JSON.parse`, which always failed and caused recovery fallbacks to cascade. Includes string-awareness so that braces inside string values never count toward depth.
- **Defensive `inlineGenStartMs` resets** at every terminal point of the inline generation path. The flag previously leaked `> 0` on cancel, fallback success, fallback failure, and ST's own `GENERATION_STOPPED` event — only the success path cleared it. A leaked flag could misroute a subsequent `CHARACTER_MESSAGE_RENDERED` event from another extension (e.g. MemoryBooks inserting a memory message) into ScenePulse's extraction path within the 60-second stale-reset window. Resets now fire on cancel (`engine.js`), ST stop (`index.js`), and all recovery exit paths (`message.js`).

#### Notes
Both fixes are defensive and do not change any success-path behavior. Added `tests/extraction-cleanjson.test.mjs` with 18 cases covering trailing-junk patterns, string-awareness (braces/escaped quotes inside string values), unbalanced fallback, and regression guards for the existing `jsonrepair` integration.

### [6.8.6] — 2026-04-07

#### Added
- **Head-anchor injection** for the inline tracker prompt — a short reminder is now prepended to the start of the chat context in addition to the existing tail reminder. Counters lost-in-the-middle attention behavior on long prompts: as the injected schema spec plus accumulated snapshot state grows past ~3k tokens, the appendix instruction at the end can lose attention weight and the model may forget to emit the tracker block entirely. A short reminder near the start primes the model's planning phase to know structured output is required before it begins narrative generation.
- **Two-tier recovery for tracker omission** — when extraction fails because no tracker markers are present in the response, ScenePulse now attempts a cheap continuation re-prompt before escalating to a full separate generation. The continuation passes only the response text and asks for a tracker JSON object for it. Cost is roughly 600–2500 prompt tokens vs ~6000 for the existing full fallback, ~10–15s vs ~40s, and the tracker is generated from the exact text already on screen rather than being re-derived from chat context. Falls through to the existing full separate generation if the continuation fails. Triggered only for the "no SP markers" failure mode when response length is between 500 and 2500 chars; the JSON-unparseable failure mode skips this tier and goes straight to the full fallback, since re-prompting will not change the underlying sampling/formatting glitch.

#### Notes
Both changes target the inline (Together) generation path. Neither touches `cleanJson` or the vendored `jsonrepair` library. The full separate-generation fallback is unchanged and remains the final tier.

### [6.8.5] — 2026-04-06

#### Added
- **Character Wiki overlay** — full-screen browser for every character ever encountered, not just those currently in scene. Walks all snapshots once on open to aggregate first-seen / last-seen / appearance count / last known location. Per-character cards with appearance grid, relationship meters with mini sparklines, goals, inventory, fertility, history metadata. Search, filter pills (All / In Scene / Absent), sort options (name / first seen / last seen / appearances / relevance), compact grid view, per-character user notes, avatars, JSON / MD export.
- **Relationship Web visualization** — SVG circular layout graph of all characters with relationship edges. Edge weight reflects relationship strength; node color reflects per-character color assignment. Reachable from the Character Wiki header.
- **Container queries for the panel** — `#sp-panel` declares `container-type: inline-size; container-name: sp-panel` so child styles can react to the panel's actual width. Replaces viewport `@media` queries that broke on `position: fixed`. New breakpoints at 550px and 380px.
- **Tablet fullscreen mode** — 601–1024px viewports now match the mobile fullscreen overlay pattern, with the mobile slide-up animation and the mobile-style top bar.
- **Auto-condense at intermediate widths** — when the available space between SillyTavern's chat and the viewport edge drops below 360px, the panel automatically engages compact mode and shrinks to a 240–280px sidebar. Releases when space returns. Honors a per-user override flag.
- **Vendored `jsonrepair` v3.12.0 (ISC)** — proper tokenizer-based JSON repair for malformed inline tracker payloads. See [`src/vendor/`](src/vendor/) and the 106-case validation suite in [`tests/vendor/`](tests/vendor/).

#### Changed
- **Quest journal UI** — quest entry NEW / UPDATED / RESOLVED badges moved to a right-aligned group alongside the action buttons. Tier-header status counts also right-aligned. Section-header summary badges relocated to sit just before the refresh button. `"upd"` abbreviation replaced with full `t('updated')` localized text, capitalized via CSS so all 29 locales render naturally.
- **Inline tracker JSON parsing** — `cleanJson()` now delegates to vendored `jsonrepair` after a strict `JSON.parse()` fails, replacing nine in-house regex passes that could not recover from common LLM errors like unescaped quotes inside string values. Worst-case behavior is unchanged — a clean throw still triggers the existing separate-generation fallback path.
- **Character storage now accumulates** — delta merge no longer prunes characters absent from a delta payload. The full historical character set is preserved in snapshots forever. The view layer trims via `filterForView()`. This is what the Character Wiki overlay browses.
- **Interceptor prompt** — removed "silently / hidden" wording that some models latched onto and parroted back into narrative. Concrete delta payload examples added to improve schema compliance.
- **Wiki meter row spacing** — label column widened to 80px desktop / 75px mobile so "Compatibility" no longer overflows into the bar.

#### Fixed
- **Character / relationship sync** — `filterForView()` reconciles `d.characters` against `d.charactersPresent` and creates stub character entries for any name that appears in `d.relationships` but is missing from `d.characters`. Resolves the "4 relationships shown but only 1 character" gap.
- **MemoryBooks (and similar extension) compatibility** — `GENERATION_ENDED` handler now guards on `inlineGenStartMs > 0` before attempting primary extraction. Other extensions fire `GENERATION_ENDED` for their own `quietPrompt()` calls; the prior code was attempting to extract a tracker from those messages and corrupting them. Extraction now only runs against generations ScenePulse actually injected into.
- **Streaming hider regex** — broadened to match `[SCENE TRACKER ...]` echoed instruction headers some models emit during streaming.
- **JSON parse error logging** — `_parseErrorOffset()` now matches both V8/Chromium `position N` and Firefox `line N column N` parse-error formats. Previously the regex only handled V8, so on Firefox the logged context window was always anchored at position 0 instead of the actual failure point.
- **Fallback warning text** — the "Together mode: AI omitted tracker payload" warning previously claimed `no SP markers` even when the markers were present and the JSON inside was the problem. It now reports one of two distinct failure kinds: `markers found, JSON unparseable` (sampling/formatting) vs `no SP markers` (prompt-following). These have different root causes and warrant different remediation.
- **Live language switch** for settings, schema-edit protection (lock confirm), experimental-feature caution labels, and miscellaneous settings i18n fixes.

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
