# Community Model Presets

This folder is the home for community-contributed prompt presets — model-specific tunings of ScenePulse's prompt slot system.

ScenePulse ships with **30 built-in presets** for the most popular models on r/SillyTavern (DeepSeek V3.2/V4, Claude 4.6 family, GPT-5.4, Gemini 2.5 family, Kimi K2.6, Cydonia, Magnum, Behemoth, Midnight Miqu/Rose, MythoMax, and more — see [`src/presets/built-in.js`](../src/presets/built-in.js)). The built-ins surface as a one-time toast when ScenePulse detects the matching model on your active connection.

This folder is for everything else — finetunes, niche models, jailbreak variants, and your own personal tunings that you want to share without waiting for them to be folded into the bundled set.

## How presets work

A preset writes into:
- `profile.promptOverrides` — per-slot text (see [`src/prompts/slots.js`](../src/prompts/slots.js) for the 7 slot ids)
- `profile.systemPromptRole` — `system` / `user` / `assistant`

It does **NOT** touch your panels, field toggles, custom panels, or schema. Applying a preset is fully reversible from the prompt editor (Settings → System Prompt → "Edit Slots…").

## Schema

Each preset is a single `.json` file with this shape:

```json
{
  "id": "kebab-case-unique-id",
  "displayName": "Human Readable Name",
  "family": "claude | gpt | gemini | deepseek | kimi | glm | qwen | mistral-finetune | llama-finetune | gemma-finetune | command-r | grok | legacy | other",
  "provider": "anthropic-api | openai-api | google-api | openrouter | local | featherless | infermatic | other",
  "contextWindow": 128000,
  "strength": "One short phrase about why this model is worth using.",
  "matchPatterns": [
    "exact-substring-of-model-id",
    "another-acceptable-substring"
  ],
  "systemPromptRole": "system | user | assistant",
  "promptOverrides": {
    "role": "Optional override for the role/opening framing slot.",
    "criticalRules": "Optional override for the critical-rules slot.",
    "language": "Optional. Use ${language} as a template variable.",
    "nameAwareness": "Optional override for the name-awareness checklist.",
    "questValidation": "Optional override for the quest-validation checklist.",
    "deltaMode": "Optional override for the delta-mode instructions."
  },
  "notes": "One-line rationale shown in the suggestion toast (~140 chars max).",
  "author": "Your handle / GitHub username (optional but appreciated).",
  "sources": [
    "https://link.to.thread/where/this/was/discussed",
    "https://huggingface.co/model/id"
  ]
}
```

**Required fields:** `id`, `displayName`, `family`, `provider`, `matchPatterns`, `notes`.
**Recommended fields:** `systemPromptRole`, `promptOverrides`, `strength`, `contextWindow`.
**Optional metadata:** `author`, `sources`.

The `fields` slot is **NOT** overridable — it's auto-generated from your panel + field-toggle settings. Don't include it.

## Submitting a preset

1. Test your preset on the actual model. Spot-check 5-10 generations to confirm the JSON parses cleanly.
2. Drop a JSON file in `presets/` named `<provider>-<model-id>.json` (e.g. `featherless-thedrummer-cydonia-24b-v3.json`).
3. Open a PR with a one-line description: model + what your preset fixes vs the built-in default.
4. Reviewers will sanity-check the JSON shape, run a smoke test, and merge.

If your preset matches a model that already has a built-in preset, propose it as an alternative (different filename) — both can coexist; users pick.

## Example

See [`_examples/anthracite-magnum-v5-72b.json`](./_examples/anthracite-magnum-v5-72b.json) for a full-shape preset.

## Loading community presets

As of ScenePulse v6.20.0, community presets in this folder are **not** auto-loaded by the extension — they're meant for browsing on GitHub and copy-paste application via the prompt editor's import flow (planned for v6.21+). For now, the workflow is:

1. Open the JSON file in this folder.
2. Copy the `promptOverrides` and `systemPromptRole` values.
3. Paste them into the prompt editor (Settings → System Prompt → "Edit Slots…") slot by slot, then Save.

A "Browse community presets" affordance with one-click apply is planned for a future release.
