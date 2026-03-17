# ScenePulse

**AI-driven scene intelligence for SillyTavern.**

ScenePulse transforms every AI response into a living dashboard — tracking characters, relationships, quests, mood, weather, and story state in real-time. No manual bookkeeping. The AI does the work; you stay immersed.

---

## Features

### 🎯 Scene Dashboard
- **Time, date, location, weather, temperature** — updated every message
- Contextual location icons (tavern, forest, castle, ship, city, cave, etc.)
- Click the location icon for a cinematic scene transition popup
- Editable values in edit mode

### 📋 Quest Journal
- **North Star** — your character's driving life purpose
- **Main Quests** — critical storyline objectives
- **Side Quests** — optional enrichment paths
- **Active Tasks** — immediate to-do items
- Collapsible tiers and individual quests with urgency badges (critical/high/moderate/low)
- Quest count badges per tier

### 💬 Inner Thoughts
- Floating panel showing each character's literal inner monologue
- Drag to reposition, resize from corner
- Snap Left — dock to chat edge
- Ghost Mode — transparent frame
- Regenerate — refresh thoughts independently

### ❤️ Relationships
- Five meters per character: **Affection**, **Trust**, **Desire**, **Stress**, **Compatibility**
- Unique SVG icons per meter type (heart, shield, flame, bolt, overlapping circles)
- Delta indicators (▲/▼) showing value changes between snapshots
- Previous-value markers on each bar
- Relationship type and phase badges
- Collapsible character cards

### 👤 Characters
- Full profiles: appearance, outfit, state of dress, posture, proximity, physical state
- Inventory tracking (items carried, not clothing)
- Three-tier goals: immediate need, short-term, long-term
- Fertility tracking (expandable in edit mode)
- Role badges matching relationship panel style
- Collapsible cards

### 💡 Story Ideas
- Five AI-generated plot branches per update
- Categorized: Dramatic, Intense, Comedic, Twist, Exploratory
- Paste to message box for editing, or inject to send immediately

### ⚙️ Custom Panels
- Create panels to track **anything** — health, mana, reputation, faction standings
- Field types: text, number, meter (0-100 bar), list, enum
- LLM hints tell the AI exactly what to output
- Drag-and-drop field reordering within and between panels

### 🕐 Timeline Scrubber
- Every AI message creates a snapshot
- Scrub through history to compare how everything evolved
- Green dot marks the current message

### 🌧️ Environmental Effects
- Weather overlays: rain, snow, fog, storm, hail, sandstorm, ash, aurora, wind
- Time-of-day ambience tinting
- Cinematic scene transition popups on location changes

---

## Installation

### From SillyTavern (Recommended)

1. Open SillyTavern
2. Go to **Extensions** → **Install Extension**
3. Paste this URL:
   ```
   https://github.com/xenofei/SillyTavern-ScenePulse
   ```
4. Click **Install**
5. The extension will auto-load on your next page refresh

### Manual Installation

1. Clone into your SillyTavern extensions folder:
   ```bash
   cd SillyTavern/data/default-user/extensions/third-party/
   git clone https://github.com/xenofei/SillyTavern-ScenePulse.git
   ```
2. Restart SillyTavern

---

## Quick Start

1. After installation, ScenePulse appears as a side panel
2. Run the **Setup Guide** to configure your fallback profile
3. Take the **Guided Tour** to learn all features with example data
4. Send your first message — ScenePulse starts tracking automatically

Both the Setup Guide and Guided Tour are accessible anytime from the ScenePulse settings drawer.

---

## How It Works

ScenePulse operates in **Together mode** by default — it instructs the AI to append structured JSON tracking data at the end of every response. ScenePulse automatically extracts and hides this JSON, displaying it in the panel.

If the AI omits the tracker payload, an optional **fallback** can run a separate API call to recover the data.

### Modes

| Mode | Description |
|------|-------------|
| **Together** (default) | AI appends tracker JSON to its response. Single API call. Fast. |
| **Separate** | Dedicated API call after the AI responds. Two calls per message. |

### Performance Tips

- More panels = more tokens = longer generation times
- Disable panels you don't need (Characters and Story Ideas are heaviest)
- Reduce custom panel fields if generation is slow
- In Separate mode, lower context messages (3-4) for speed

---

## Configuration

Open the ScenePulse settings drawer in SillyTavern's extension panel to configure:

- **Enable/Disable** ScenePulse
- **Auto-generate** on AI messages
- **Injection method** (Together/Separate)
- **Fallback recovery** settings
- **Connection profiles** and presets
- **Panel Manager** — toggle built-in panels and sub-fields
- **Custom Panels** — create and manage custom tracking fields
- **Developer tools** — debug logging and weather preview

---

## Toolbar Reference

| Icon | Function |
|------|----------|
| ⟳ | Regenerate tracker data |
| ⊞ | Panel Manager — toggle panels & fields |
| ⊞⊞ | Expand/Collapse all sections |
| ≡ | Condense view |
| 💬 | Toggle inner thoughts panel |
| ☁ | Toggle weather overlay |
| ☀ | Toggle time-of-day ambience |
| → | Toggle scene transition alerts |
| ✏ | Toggle edit mode |

---

## Requirements

- **SillyTavern** 1.12.0+
- An AI model capable of following structured output instructions (recommended: GPT-4, Claude, Gemini, GLM-5, or similar)

---

## Feedback & Issues

Found a bug? Have a suggestion? Want to contribute?

**[Open an issue on GitHub](https://github.com/xenofei/SillyTavern-ScenePulse/issues)**

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

*Every scene has a pulse. Now you can feel it.*
