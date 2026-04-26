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
  ],
  "samplerHints": {
    "temperature": 0.85,
    "top_p": 0.95,
    "top_k": 40,
    "min_p": 0.05,
    "frequency_penalty": 0.0,
    "presence_penalty": 0.0,
    "repetition_penalty": 1.05,
    "guidance": "Optional: prose hint for models that don't accept the standard samplers (e.g. Claude 4.7, GPT-5 reasoning, DeepSeek thinking).",
    "confidence": "high",
    "sources": [
      "https://docs.vendor.com/sampler-recommendations",
      "https://huggingface.co/model-card-discussion"
    ]
  }
}
```

**Required fields:** `id`, `displayName`, `family`, `provider`, `matchPatterns`, `notes`.
**Recommended fields:** `systemPromptRole`, `promptOverrides`, `strength`, `contextWindow`.
**Optional metadata:** `author`, `sources`, `samplerHints`.

The `fields` slot is **NOT** overridable — it's auto-generated from your panel + field-toggle settings. Don't include it.

### About `samplerHints` (v6.25.0+)

`samplerHints` is **DISPLAY-ONLY advisory** — ScenePulse never auto-applies these values to your sampler sliders. They appear on the preset card so users can manually match them in their ST connection settings if they wish. (Per v6.23.7, SP no longer mutates user sampler state.)

- All numeric fields are optional; include only what's documented for the model.
- `guidance` is a prose alternative for models that don't accept the standard samplers — Claude 4.7 family (no temp/top_p/top_k), GPT-5 reasoning (use `reasoning_effort` instead), DeepSeek thinking variants (samplers silently ignored). You can include both numeric fields AND a guidance string.
- `confidence` is one of `"high" | "medium" | "low"` — high means vendor docs, medium means well-tested community thread, low means anecdotal.
- `sources` should cite the URLs that justify the values: model card discussions, vendor sampling docs, r/SillyTavern threads.

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

## OpenRouter stats sidecar (v6.26.0+)

The preset browser surfaces inline chips on each card showing OpenRouter Roleplay-collection rank, weekly token volume, cost per million tokens, and a `FREE` flag for free-tier endpoints. These come from a sidecar file `presets/or-stats.json` that's regenerated by a maintainer-run script, NOT fetched at runtime.

### Maintenance flow

1. **Update rankings** — edit `tools/or-rankings.json` to reflect the current top ~40 models on https://openrouter.ai/collections/roleplay (rank, weekly token volume, collection membership).
2. **Run the refresh script**: `node tools/refresh-or-stats.mjs`
   - Fetches live `https://openrouter.ai/api/v1/models` for pricing + context window
   - Joins with the ranked entries from step 1
   - Writes `presets/or-stats.json`
3. **Review the diff and commit manually** — the script does NOT auto-commit. Eyeball surprising changes (price drops, new models, OR slug renames).

### `presets/or-stats.json` shape

```json
{
  "_generatedBy": "tools/refresh-or-stats.mjs",
  "fetchedAt": "2026-04-26T16:33:09.645Z",
  "rankingsLastUpdated": "2026-04-26",
  "modelCountFromOR": 355,
  "rankedEntries": 44,
  "matched": 22,
  "unmatched": 22,
  "stats": {
    "deepseek/deepseek-chat": {
      "weeklyTokens": 1100000000000,
      "rank": 1,
      "collections": ["roleplay"],
      "contextLength": 128000,
      "pricing": { "input": 0.27, "output": 1.10 },
      "orSlug": "deepseek/deepseek-v3.2-20251201"
    }
  }
}
```

### Why a sidecar instead of a runtime fetch?

OpenRouter's `/api/v1/models` is CORS-permissive and could be fetched live, but exposes only pricing/context — not popularity. Popularity data lives only in the rendered HTML of the rankings/collections pages. Scraping HTML from every user's browser is fragile, slow, and rude. The sidecar approach is fast (zero network), reliable (works offline), and maintainable (one file the maintainer regenerates periodically).

## Runtime pricing/context refresh (v6.27.0+, opt-in)

The static sidecar is the source of truth for popularity, but pricing and context windows drift between releases. v6.27.0 adds an opt-in **OpenRouter Stats Connector** that refreshes the pricing/context overlay live from `/api/v1/models` when the preset browser opens.

- **Off by default** — users opt in via Setup Wizard step 5, the one-time prompt that fires after upgrade, or Settings → Generation → "Enable OpenRouter pricing/context refresh".
- **One fetch per session, cached 24h** — opening the preset browser repeatedly does not spam the endpoint. A session-flag short-circuits silent auto-refreshes after the first attempt.
- **Manual refresh** — a labeled `↻ Refresh stats` button appears on the preset browser toolbar when the connector is enabled. Bypasses session flag, cooldowns, and TTL.
- **Failure modes**:
  - Offline / network error → silently skip, keep static stats. No cooldown.
  - 5xx / timeout (3s ceiling) → skip without cooldown so we retry next session.
  - 429 → 1-hour cooldown (rate-limit etiquette).
  - 4xx / shape mismatch / parse failure → 1-day cooldown (probably CORS or upstream change — back off and retry tomorrow).
- **What changes**: per-preset `pricing` and `contextLength` come from the live API; popularity (`rank`, `weeklyTokens`, `collections`) stays static. The footer shows both: `Popularity baseline: 2026-04-26 · pricing/context refreshed 4 hours ago`.
- **Storage**: cache lives in `localStorage` under `sp_openrouter_cache_v1`. Clearing it forces a fresh fetch on the next preset-browser open.

Source: [`src/presets/or-connector.js`](../src/presets/or-connector.js). Tests: [`tests/or-connector.test.mjs`](../tests/or-connector.test.mjs).
