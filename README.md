<!-- ⚠️ WORK IN PROGRESS ⚠️ -->

> **⚠️ EARLY ACCESS — WORK IN PROGRESS**
>
> ScenePulse is under active development. Expect rough edges, visual glitches, and frequent updates. Some AI models may not reliably produce tracker data in Together mode. Mobile support is functional but still being refined. If something breaks, please [open an issue](https://github.com/xenofei/SillyTavern-ScenePulse/issues) — your feedback shapes what gets fixed next.

---

<div align="center">

<img src="https://img.shields.io/badge/version-5.1.1-4db8a4?style=flat-square&labelColor=1a1c24" alt="Version">
<img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square&labelColor=1a1c24" alt="License">
<img src="https://img.shields.io/badge/platform-SillyTavern%201.12%2B-orange?style=flat-square&labelColor=1a1c24" alt="Platform">

# <img width="836" height="200" alt="image" src="https://github.com/user-attachments/assets/041e92d6-f126-45da-8a2f-7a64a6a8d609" />




**AI-Powered Scene Intelligence for SillyTavern**

*Every scene has a pulse. Now you can feel it.*

</div>

---

ScenePulse is a SillyTavern extension that automatically extracts and tracks scene data from AI responses — characters, relationships, quests, mood, tension, and more — all displayed in a real-time dashboard alongside your roleplay.

## Features

### Live Dashboard
- **Environment cards** — time, date, weather, temperature, location with animated weather icons
- **Scene details** — mood, tension, topic, interaction style, sound environment
- **Real-time updates** every AI message
<img width="857" height="390" alt="image" src="https://github.com/user-attachments/assets/7740dada-d740-49d8-8ae3-1ae6d72767d5" />


### Relationship Tracking
- Animated meter bars for **affection, trust, desire, stress, compatibility** (0–100)
- Auto-generated labels when the model omits them (minimal → low → moderate → strong → intense → overwhelming)
- Delta badges showing changes between messages (▲/▼) with previous-value markers
- Relationship phase, milestones, and time together
- Confidence-based color matching between character and relationship cards — fuzzy name matching with neutral gray for unresolved identities
<img width="859" height="423" alt="image" src="https://github.com/user-attachments/assets/7094c6bb-28af-46b5-a7da-54a5f117371d" />


### Quest Journal
- **North Star** — overarching life purpose
- **Main Quests, Side Quests, Active Tasks** — tiered and collapsible
- Urgency indicators and detailed descriptions
- Perspective enforcement — quests are always framed from the user's point of view using an oppose/align system (hostile NPCs → oppose, allies → support, neutral → decide)
<img width="856" height="556" alt="image" src="https://github.com/user-attachments/assets/3bf59314-4e69-4635-84e9-8823a68bc32b" />


### Character Profiles
- Full appearance tracking: hair, face, outfit, state of dress, posture
- Inner thoughts, immediate needs, short/long-term goals
- Inventory tracking
- Optional fertility status fields with compact inline layout
- Smart name resolution when models omit the `name` field — cross-references `{{char}}`, relationships, `charactersPresent`, role text, and object keys with multi-tier confidence scoring
<img width="860" height="326" alt="image" src="https://github.com/user-attachments/assets/cb314a4e-a6d4-449d-96ad-929556564d40" />


### Story Ideas
- 5 AI-generated plot directions per update (dramatic, intense, comedic, twist, exploratory)
- One-click **paste to edit** or **inject directly** into chat
<img width="860" height="445" alt="image" src="https://github.com/user-attachments/assets/e2614c4c-0b1c-42db-9761-5f3efbc8dd2a" />


### Inner Thoughts Panel *(Desktop)*
- Floating, draggable panel showing each character's inner monologue
- Characters without thoughts show a subtle `…` placeholder
- Ghost mode (transparent), snap-to-edge, resizable
<img width="844" height="287" alt="image" src="https://github.com/user-attachments/assets/660015cd-be56-4456-bee3-f4303d3d2ed4" />


### Immersive Effects *(Desktop)*
- **Weather overlay** — rain, snow, hail, fog, sandstorm, aurora, ash with particle systems
- **Time-of-day tint** — dawn, morning, afternoon, dusk, evening, night ambience
- **Scene transitions** — feathered location change popups with backdrop blur and soft radial fade

### Timeline Scrubber
- Every AI message creates a snapshot
- Click any timeline dot to load historical scene data
- Compare how relationships, quests, and characters evolved over time
<img width="850" height="82" alt="image" src="https://github.com/user-attachments/assets/5b46e312-2921-4a24-9781-4c297669ea27" />


### Custom Panels
- Create panels to track **anything** — health, mana, reputation, faction standings
- Each field supports text, number, meter, list, or enum types
- LLM hints tell the AI what to output for each field
<img width="858" height="472" alt="image" src="https://github.com/user-attachments/assets/6732fa65-dc8b-4390-8445-bbd08d36f9df" />


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
4. A **proactive streaming hider** (MutationObserver with rolling `max-height` cap) prevents the JSON from ever appearing visually during streaming

If the AI omits the tracker, ScenePulse can **automatically fall back** to a separate API call using a dedicated connection profile.

### Separate Mode
Alternatively, ScenePulse can run a completely separate API call after each message — useful for models that struggle with inline instructions. Configure this in the extension settings.

### Settings Persistence
All configuration settings (injection method, profiles, presets, lorebook mode, etc.) are persisted via `localStorage` for reliability. This bypasses SillyTavern's `saveSettingsDebounced()` race condition with `CHAT_CHANGED` events during initialization, ensuring your settings survive restarts.

## Architecture

ScenePulse v5.x uses a modular ES module architecture. The codebase is split into ~30 focused modules:

```
index.js                    ← Thin entry point (~190 lines)
style.css                   ← @import directives only
src/
  constants.js              ← Defaults, schemas, prompts, panel definitions
  logger.js                 ← Debug logging (no global console override)
  utils.js                  ← Shared utilities
  state.js                  ← Centralized mutable state with setter functions
  settings.js               ← Settings CRUD, snapshot management, cached reads
  schema.js                 ← Dynamic schema/prompt builders
  color.js                  ← Character color assignment with fuzzy matching
  normalize.js              ← Data normalization with WeakMap caching
  story-ideas.js            ← Story idea injection
  generation/
    extraction.js           ← Inline tracker extraction from AI responses
    streaming.js            ← Streaming hider (MutationObserver)
    engine.js               ← Generation engine with retry/fallback
    interceptor.js          ← SillyTavern generate interceptor
  ui/
    mobile.js               ← Device detection, FAB, responsive layout
    panel.js                ← Side panel creation and toolbar
    update-panel.js         ← Dashboard rendering with leak-safe canvas animation
    dashboard.js, sections.js, section.js
    weather.js              ← Weather particle system (9 types)
    time-tint.js            ← Time-of-day ambient overlays
    scene-transition.js     ← Location change animations
    timeline.js             ← Timeline scrubber with debounced navigation
    thoughts.js             ← Draggable thought panel
    message.js              ← Per-message integration
    loading.js              ← Loading overlays and timers
    edit-mode.js            ← Inline field editing
  settings-ui/
    create-settings.js      ← Settings panel HTML template
    bind-ui.js              ← Settings form bindings
    custom-panels.js        ← Custom panel manager
    setup-guide.js          ← First-run wizard
    guided-tour.js          ← Interactive feature tour
css/
  24 modular stylesheets    ← Split by component, loaded via @import
```

No bundler required — SillyTavern loads extensions as `<script type="module">`, so native ES imports work out of the box.

## Compatibility

- **SillyTavern** 1.12.0+ (including 1.16.0 with updated `#connection_profiles` selector)
- **Tested models**: GLM-4/5, Claude, GPT-4o, Gemini, Llama 3, Mistral, Qwen
- **API providers**: OpenAI-compatible, Anthropic, Google AI, any provider SillyTavern supports
- **Browsers**: Chrome, Firefox, Safari (mobile & desktop)

> **Note:** Together mode works best with instruction-following models that reliably append structured data. Smaller or older models may need Separate mode or a fallback profile.

## Configuration

Access settings via **Extensions** → **ScenePulse** in SillyTavern's settings panel.

| Setting | Description |
|---------|-------------|
| **Enable ScenePulse** | Master toggle |
| **Auto-generate** | Update tracker on every AI message |
| **Injection method** | Together (inline) or Separate (dedicated API call) |
| **Context messages** | How many recent messages to include (Separate mode) |
| **Fallback profile** | Connection profile for auto-recovery |
| **Weather overlay** | Rain/snow/fog particle effects |
| **Time-of-day tint** | Ambient color tinting |
| **Show thoughts** | Inner monologue floating panel |
| **Panel Manager** | Toggle individual panels and sub-fields |

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

- **JSON visibility during streaming** — The proactive streaming hider catches most cases, but very fast token rates may briefly show tracker JSON before the `max-height` cap takes effect
- **Model compliance** — Some models intermittently skip the tracker block; the fallback system handles this, but it adds a second API call
- **Mobile** — Weather effects, time-of-day tint, inner thoughts panel, and condense view are disabled on mobile to optimize performance
- **Character naming** — When a model omits the `name` field, ScenePulse uses a multi-tier confidence system: 1:1 relationship matching, positional `charactersPresent` alignment, `{{char}}` identification, role↔relType cross-referencing, and last-resort elimination. Ambiguous cases (2+ unnamed characters with insufficient clues) display as neutral gray cards until the next generation resolves them

## Changelog

### v5.1.1
- **Modular architecture** — Refactored from monolithic 5,500-line `index.js` into ~30 ES modules across `src/` and 24 CSS files in `css/`
- **Performance: Fixed canvas animation leak** — Each panel update previously spawned a new perpetual `requestAnimationFrame` loop and `MutationObserver` that were never cleaned up. After rapid timeline navigation, dozens of concurrent animation loops would accumulate
- **Performance: Timeline debounce** — Replaced per-frame batching with 200ms trailing-edge debounce. Rapid clicks settle before expensive work runs
- **Performance: Normalize caching** — `normalizeTracker()` results cached via WeakMap. Revisiting the same snapshot is instant
- **Performance: Thought panel listeners** — Drag/resize handlers now add-on-start, remove-on-end instead of 8 permanent document-level listeners
- **Performance: Scrub guards** — Weather overlay, time tint, and scene transitions skipped during timeline scrubbing
- **Fix: Story idea double-send** — Removed redundant `dispatchEvent` + `click()` call
- **Fix: Global console override removed** — ScenePulse no longer overrides `console.log/warn/error` for all extensions
- **Fix: Version string consistency** — Single `VERSION` constant referenced everywhere
- **Fix: Timeline disappearing on historical node click** — Scrub flag now properly cleared after debounced update
- **Improvement: Settings caching** — `getSettings()` result cached, invalidated on save
- **Improvement: Color map cleanup** — Character color assignments reset on chat switch
- **Improvement: Resize throttle** — Window resize handler throttled to 100ms
- **Improvement: Streaming hider optimization** — Polling interval stops once MutationObserver attaches

### v4.9.90
- Clean quest schema with concise definitions and clear priority hierarchy

### v4.9.88
- Genre-spanning quest perspective examples (10 story types)

## Contributing

Found a bug? Have a feature idea? Contributions welcome!

1. [Open an issue](https://github.com/xenofei/SillyTavern-ScenePulse/issues) to report bugs or suggest features
2. Fork the repo, create a branch, and submit a PR
3. Join the discussion in the issues tab

## Inspiration

ScenePulse started as a desire for something more — a scene-aware companion that could grow alongside the stories being told. These projects paved the way and remain worth checking out:

- [**RPG Companion**](https://github.com/SpicyMarinara/rpg-companion-sillytavern) by SpicyMarinara — The original RPG tracking extension for SillyTavern
- [**WTracker**](https://github.com/bmen25124/SillyTavern-WTracker) by bmen25124 — Lightweight world state tracking
- [**zTracker**](https://github.com/Zaakh/SillyTavern-zTracker) by Zaakh — Scene and character tracking with a clean UI

Their ideas and approaches directly shaped what ScenePulse is becoming. If you're exploring scene tracking for SillyTavern, give them a look.

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

*Built by [xenofei](https://github.com/xenofei)*

*Every scene has a pulse. Now you can feel it.*

</div>
