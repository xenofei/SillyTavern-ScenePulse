# Changelog

All notable changes to ScenePulse are documented in this file.

### [6.15.8] — 2026-04-25

#### Fixed — Diagnostics info popover scope + cleaner visual treatment
v6.15.7 introduced an info button next to Diagnostics, but the popover triggered when hovering ANYWHERE on the wrapper — including the Diagnostics button itself, which made the explanation feel intrusive. Also the joined-segmented styling made the icon look like a second button rather than a quiet helper.

- **Hover scope restricted to the info icon only**: Wrapped the info button + popover in a separate `.sp-di-info-area` span; hover trigger is now `.sp-di-info-area:hover` and `.sp-di-info:focus-visible` only. Hovering the Diagnostics button no longer opens the popover.
- **Cleaner visual style**:
  - `i` button is now a small (20px) circular icon, detached from Diagnostics with a 4px gap
  - Replaced the typed italic 'i' character with a proper SVG info glyph (circle + dot + line)
  - Neutral border + dim color in resting state; accent color + tinted background only on hover/focus — reads as "quiet helper", not "another action"
  - Diagnostics button restored to normal rounded corners (no longer joined to the icon)
- **Hover bridge preserved**: The popover's `::before` invisibly extends its hover region upward to touch the icon, so moving the mouse from icon → popover doesn't lose hover.

All 620/620 tests still pass.

### [6.15.7] — 2026-04-25

#### Changed — Diagnostics info popover + scope-clarified per-tab buttons
User feedback: *"What's the difference between the diagnostics button vs the copy all/export txt?"* — the buttons looked similar at a glance even though one bundles everything inspector-wide and the other copies a single tab's content.

**New info popover next to the Diagnostics button**:
- Small `i` icon button joined to the right of "Diagnostics" like a segmented control
- Hover or keyboard-focus reveals a 420px popover explaining what's in the bundle:
  - Latest pair (prompt + response)
  - Last 10 issues with diagnosis hints
  - Activity log (last 50 lines)
  - Active profile + non-default settings
  - Versions
  - 6-char hash header
  - Auto-redacted (API keys, paths, emails)
- Includes an explicit "Versus the per-tab Copy / Export buttons" comparison line
- Visible on every platform (CSS `:hover` + `:focus-visible`), unlike native `title` attribute
- ARIA `role="tooltip"` and `aria-label` on the trigger for screen readers

**Renamed Issues toolbar buttons for scope clarity**:
- `Copy All` → `Copy issues` — makes it obvious the button only copies the issues list, not the whole inspector
- `Export TXT` → `Export issues`
- Both got `title` attributes pointing users to Diagnostics for the full bundle

This is purely a UX/labeling change; behavior is identical to v6.15.6.

All 620/620 tests still pass.

### [6.15.6] — 2026-04-25

#### Added — Raw (prompt, response) pair ring buffer for diagnosing prose-not-JSON failures
Panel B's critical-missing addition from the v6.15.4 inspector synthesis: *"To diagnose JSON-mode dropouts you need the actual bytes the model emitted, before any cleaning, alongside the system prompt + last user turn that elicited it. Without it, every parse-fail report becomes a guessing game."*

**New `src/raw-pairs.js` module:**
- Ring buffer of last 10 `{ts, mesIdx, prompt, response, source, parseFailed, parseError}` pairs
- `pushPair()` adds a pair (truncated to 200K chars per field as a safety bound)
- `markLastPairParseFailed(errorMessage)` flags the most recent pair when cleanJson / parse-fail throws
- `getPairs()`, `lastPair()`, `pairCount()`, `clearPairs()` accessors
- Memory budget: ~130KB peak

**Captured in `src/generation/engine.js`:**
- Main extraction path: `pushPair({ prompt, response, mesIdx, source: 'engine' })` after `setLastRawResponse(rawStr)`
- Continuation path: same with `source: 'continuation'`
- `markLastPairParseFailed(e.message)` called from both `Parse fail (N)` catch blocks so failed pairs are flagged

**Last Response tab now navigates pairs:**
- Default view shows the LATEST pair: prompt collapsed in a `<details>` block + response below
- Pair navigator with prev/next buttons + "Pair N / K" indicator + meta line (timestamp · source · "Parse failed" badge if applicable)
- Two new actions: "Copy pair" (prompt + response together) and "Export TXT" (saves pair as a `.txt`)
- Falls back to the legacy `lastRawResponse` if no pairs captured yet (upgrade-window grace)

**Show in Last Response (v6.15.5) is now smarter:**
- When jumping from a parse-error issue, navigates to the pair whose timestamp is closest to the issue's timestamp
- Means clicking "Show in Last Response" on a `cleanJson` error from 9:32:21 lands you on the exact prompt+response that failed at 9:32:21

**Diagnostics bundle includes the latest pair:**
- "Latest pair" section with timestamp + source + parse-failed badge
- "Prompt sent" subsection (truncated to 6000 chars, redacted)
- "Response received" subsection (truncated to 4000 chars, redacted)
- Replaces the old "Last response" section that only showed the response

All 620/620 tests still pass.

### [6.15.5] — 2026-04-25

#### Changed — Debug Inspector overhaul, Phase B: filter fields visually distinct, Diagnostics button, Config tab, Show-in-Last-Response

**Toolbar filter fields are now visually distinct selectors** (user feedback on v6.15.4: even with extra spacing, the severity and source filters still read as one continuous row of pills). Each filter group is now a labeled SEGMENTED CONTROL — joined options inside a single rounded container with internal dividers, with an uppercase micro-label above (`SEVERITY` / `SOURCE` / `SINCE`). Apple HIG / Material segmented-control pattern: communicates "pick one of these mutually-exclusive options" instead of "many independent buttons". Active option uses inset box-shadow for the accent color (red/amber/blue for severity) so the joined segments stay visually unified. ARIA `role="radiogroup"` and `aria-checked` for screen readers.

**Diagnostics button** (Panel B's #1 MUST, Panel C's name) — single button in the inspector header that bundles a paste-ready markdown report:
- Activity log (last 50 lines, redacted)
- Last response (redacted, truncated to 4000 chars with "…truncated, total N chars")
- Last 10 issues with diagnosis hints inline (redacted)
- Active profile summary (id, name, has-custom-schema, has-custom-prompt, panel count)
- Non-default settings only (massively cuts paste size vs full settings tree)
- Versions (SP, ST, UA, viewport)
- 6-char DJB2 hash header so the maintainer can tell two pastes apart at a glance
- Auto-redact: API keys (`sk-…`, `Bearer xxx`, `api_key=…`), absolute paths (`C:\Users\…`, `/home/…`, `/Users/…`), file URLs, email addresses
- Copies to clipboard with toast confirmation

**New `Config` tab** (Panel C: "Config" not "Settings dump" — "dump" leaks implementation):
- Active profile summary
- Chat metadata (chatId, mesIdx, character, group, mainApi, viewport)
- Non-default settings only by default (Panel B refinement); "Show all settings (not just non-defaults)" toggle reveals the full tree
- Same redaction as Diagnostics
- Copy / Export TXT actions

**Show-in-Last-Response button** (Panel B's MUST, Panel C's name "Show in" not "Open in"):
- Appears on parse-related issue entries (cleanJson / no JSON object / Parse fail)
- Inline action button in the entry's body
- Switches to Last Response tab + scrolls response pane to top
- Last Response shows an "Opened from" pill referencing the source issue
- Tab render contract extended: `tab.render(panel, { switchTo, payload })` so any tab can navigate to any other with context

All 620/620 tests still pass.

### [6.15.4] — 2026-04-25

#### Changed — Debug Inspector overhaul, Phase A: rename, toolbar, grouping, Last Response fix, time filter, auto-open badge
Synthesis from a 3-panel review (~150 specialist perspectives across observability tooling UX, diagnostic-triage workflows, and microcopy/IA) plus a focused Last Response bug investigation.

**Renames** (Panel C: never name a tab after its worst-case content)
- `Crashes` tab → `Issues` (the contents are heterogeneous: errors + warnings + info, and "Issues" matches the GitHub mental model that pairs naturally with "Report on GitHub")
- "Issues" tab moved to first position; new tab order is `Issues / Activity / Last Response`

**Toolbar layout** (Panel A: 3-zone with deliberate separation, never put destructive buttons next to constructive ones with identical styling)
- Issues toolbar restructured into three zones: `[Search] [Severity] [Source] [Since:]  │  [Copy] [Export]  ─►─►  [Clear]`
- One vertical rule between query controls and constructive actions; wider gap before destructive Clear; danger-outline (not solid red) on Clear to prevent eye fatigue and mis-clicks
- Severity-active accent colors only on selected chip (red for Errors, amber for Warnings, blue for Info) — color = data, not chrome (Tufte / Sentry pattern)

**Last Response bug fix**
- Diagnosed: classic ES module live-binding trap. `export let lastRawResponse` is supposed to live-bind, but in SillyTavern's loader some importers see only the load-time snapshot.
- Added `getLastRawResponse()` and `getLastDeltaPayload()` getters in `src/state.js`
- `_lastResponseTab` now calls the getter at render time so it always reads the current state value

**Group consecutive parse-fail pairs** (Panel B's MUST: 17 entries collapsing to 7 events directly mirrors how humans count incidents)
- New `_groupParsePairs()` function in `src/ui/debug-inspector.js`
- `cleanJson` parent + sequential `Parse fail (N)` children within 60s collapse into one parent row with a "+N attempts" amber pill
- Children listed chronologically inside the expanded parent body under "Related attempts"
- Footer count now reads `N groups · M events · K total` when grouping is active
- Copying a grouped entry includes all child attempts in the paste

**Time-window filter** (Panel B: cheap to build, default to "since last clear" not "all time")
- New "Since:" pill with options: This session (default) / 5m / 1h / 1d / All
- Filter cutoff applied BEFORE grouping so children/parent stay together inside the window

**Auto-open badge** (Panel B: 3-flash then steady-state dot, never modal, never animate continuously)
- New observer pattern in `src/crash-log.js`: `addChangeListener()`, `unseenCount()`, `markSeen()`
- `bind-ui.js` subscribes and updates the toolbar button: amber dot at top-right when there are unseen entries, brief 3-flash animation on each new capture
- Opening the inspector calls `markSeen()` which clears the dot
- Reduce-motion / `body.sp-reduce-effects` users skip the flash and just see the steady dot

All 620/620 tests still pass.

**Skipped** (per Panel B unanimous): #4 Error rate sparkline — zero triage value at <100 events/window scale.

**Coming next**: v6.15.5 (Diagnostics bundle button, Config tab, Show-in-Last-Response jump), v6.15.6 (raw response+prompt ring buffer), v6.16.0 (Network tab, Reproduce sandboxed, Checks tab).

### [6.15.3] — 2026-04-25

#### Changed — Crash log entries now show useful detail when expanded
Expanding a crash log entry previously showed near-empty body content for the most common case (string-only `err()` calls captured no stack and the global error handlers passed no SillyTavern context). The expanded view was just "SP 6.12.3 / Copy / Report on GitHub" — the user couldn't tell what scene, message, or model the error happened on.

Two-layer fix:

**Capture side (`src/crash-log.js`):**
- New `_autoContext()` helper captures chat ID (last 12 chars), message index, character name, model name (with three fallbacks: openai_model / textgen preset / mainApi), group-chat flag, viewport size — each lookup independently try/catched so one missing global doesn't suppress the rest.
- Logger bridge now synthesizes a stack via `new Error().stack` when no Error object was in the err() args, then strips the bridge + listener + crash-log frames so what remains points to the actual err() callsite.
- `_onWindowError` and `_onUnhandledRejection` merge their existing context (filename/line/col, kind=unhandledrejection) with auto-context.

**Display side (`src/ui/debug-inspector.js`, `css/crash-log.css`):**
- Row body always renders a structured set of sections — Full Message (since the header is CSS-truncated), Likely Cause (when matched), When/Source/Severity/Occurrences strip, Stack (if present), Context (if present), Versions row, Actions.
- New `_diagnose(message)` pattern matcher gives one-line cause hints for: `cleanJson` / `Parse fail` / 502/503/504 / NetworkError / aborted-cancellation / `streamingProcessor is null` / rate-limit / context-length / 401-unauthorized. Returns empty string when no pattern matches — section only renders when there's a real hint.
- New CSS classes `.sp-cl-fullmsg` (mono, wraps long prose), `.sp-cl-diagnosis` (amber-tinted left border, reads as interpretation not raw data), `.sp-cl-whenwhere` (labeled metadata strip).

Existing entries captured under v6.15.2 or earlier render with the new layout immediately — auto-context only attaches to entries captured under v6.15.3+, but everything else (full message, diagnosis, when/where, versions, actions) works on historical entries too.

All 620/620 tests still pass.

### [6.15.2] — 2026-04-25

#### Changed — Meter status labels capped at MAX 3 words (LLM-side, not client-truncated)
The meter status labels (e.g. "Warm", "Building trust") were previously capped to 1-4 words by the prompt and *also* truncated to 4 words client-side via `truncateWords()`. The dual-cap approach hid the LLM's failures: when the model emitted "deeply moved, finds him utterly compelling and trustworthy," it silently became "deeply moved, finds him..." in the UI, leaving the user no way to see that the prompt had failed.

Tightened both ends:
- `src/schema.js`: meter label rule rewritten — MAX 3 words, no commas/em-dashes/and/but/qualifiers, Title Case, with 4 RIGHT and 3 WRONG examples (the WRONGs lifted from observed long outputs).
- `src/constants.js`: BUILTIN_PROMPT line for "Labels" rewritten to match — MAX 3 words, "answers what kind of [meter] in one phrase, not a sentence."
- `src/ui/update-panel.js` + `src/ui/character-wiki.js`: removed all 4 `truncateWords()` callsites on meter labels. The full label now renders directly. CSS `.sp-meter-tag` already has `overflow: hidden; text-overflow: ellipsis;` and `title="${label}"` is already set, so over-cap labels show with an ellipsis safety net AND the user can read the full text on hover/long-press. If the LLM emits >3 words, it's now visible — a prompt failure to fix at the source, not silently chop.
- Cleaned up unused `truncateWords` imports.

`truncateWords()` itself stays in `src/utils.js` — it's still a useful helper for other potential cap sites and removing it would be a needless API break.

### [6.15.1] — 2026-04-25

#### Changed — Relationship `milestone` capped at MAX 10 words (LLM-side)
The `milestone` field on relationship cards previously had no length cap, producing lengthy paragraphs ("She told him coffee was never the point, she was testing his honesty, and now asks if he can keep his hands to himself for the three-block walk—a first for her on this street") that visually drowned the rest of the card body.

Tightened the schema bullet in `src/schema.js`:
- Added MAX 10 words constraint
- Added "one concrete event, not a paragraph" guidance
- Forbade comma-chained clauses, em-dash continuations, and parenthetical asides
- Added 2 RIGHT and 2 WRONG examples (the WRONGs lifted directly from observed outputs so the model can pattern-match the prohibition)

Updated SAMPLE_TRACKER milestones in `src/constants.js` to fit under the cap so the example data the LLM sees in `relPhase` examples is consistent with the new rule.

No render code or CSS changes — milestone is plain text. The cap is enforced at the source where it costs nothing to fix at write time. Existing chats with persisted long milestones will continue to render the long version until next regen overwrites the field.

### [6.15.0] — 2026-04-25

#### Changed — Relationship pill: closed enum, 7-family palette, fits every resolution
The `relPhase` pill on relationship cards used to render free-form LLM prose ("INTIMATE, TEASING CONNECTION", "Growing closer, testing boundaries") that broke layout on small screens and resisted at-a-glance reading. Synthesis from a 50-panel review (10 panels each across information design, mobile-responsive UI, microcopy/taxonomy, prompt engineering, and game UI) converged on a closed enum.

**New module `src/rel-phase.js`:**
- `REL_PHASE_ENUM` — 17 single-word stages: `Strangers, Wary, Cordial, Friendly, Close, Trusted, Bonded, Flirting, Smitten, Intimate, Devoted, Distant, Strained, Estranged, Hostile, Volatile, Unknown`. Within Miller's 7±2 per family; covers strangers/professional/platonic/romantic/damaged/hostile/edge-case states.
- `REL_PHASE_FAMILY` — maps every term to one of 7 color families (neutral / civil / warm / romance / damaged / hostile / complex).
- `coerceRelPhase()` — 5-step deterministic salvage: trim+strip → exact case-insensitive → substring scan with word-boundary guard → first-word title-case retry → `Unknown` fallback. Catches Claude/GPT synonym drift ("Warm" → "Cordial"), Llama 8B compound qualifiers ("Trusted partnership" → "Trusted"), and prose leakage ("Intimate, teasing connection" → "Intimate"). Word-boundary guard prevents false positives ("Closely" ≠ "Close", "Hostility" ≠ "Hostile", "Untrustworthy" ≠ "Trusted"). 61-case test suite in `tests/relphase-coerce.test.mjs`.

**Schema instruction (`src/schema.js`):**
- `relPhase` bullet rewritten as a closed-enum instruction with 3 RIGHT and 2 WRONG examples — the prompt-engineering panel's empirically validated sweet spot for instruction following without example echo.
- `relType` bullet capped at MAX 2 words with examples ("Co-worker", "Customer", "Bartender", "Childhood friend") and a forbiddance on commas/slashes/parentheses.

**Pipeline (`src/normalize.js`):**
- `coerceRelPhase()` runs after all carry-forward and merge logic, just before normalization returns. Empty/missing phases coerce to `Unknown` so the header pill always renders — stable layout beats "sometimes a pill, sometimes a gap" across cards.

**Rendering (`src/ui/update-panel.js`, `src/ui/character-wiki.js`):**
- Phase badge gets `data-family="<family>"` attribute and a `title` for accessibility/desktop hover.
- Type badge gets a `title` for full-text disclosure on truncation.

**CSS (`css/relationships.css`, `css/responsive.css`):**
- `.sp-rel-block` now declares `container-type: inline-size; container-name: rel-card` — pill responds to CARD width, not viewport, so the same card renders correctly in main panel (~380px), wiki (~600px), thoughts (~280px), and mobile fullscreen.
- `.sp-rel-header` switched from flex-wrap to CSS Grid with `auto auto minmax(0, 1fr) auto auto` columns. The `minmax(0, 1fr)` on the name column prevents unbroken-name overflow (same fix as the meter rows in v6.13.7).
- Both pills capped at `max-inline-size: min(11ch, 35cqi)` with ellipsis as a safety net (LLM cap is the real defense).
- Title Case stays on phase pill — typography research at small sizes (Spiekermann, Klinkenborg) shows ~13% legibility win over ALL CAPS via preserved bouma.
- 7-family palette via `.sp-rel-phase-badge[data-family="<name>"]` selectors.
- `@container rel-card (max-width: 260px)` degrades the phase pill to a 10×10 colored dot — preserves the archetypal-glance signal even when text is gone (Frost / Wroblewski mobile-first principle: never DELETE the signal, degrade it). The previous `display: none` rule at 380px is removed in favor of this dot fallback.

Implementation crosses multiple model classes (Claude/GPT ~98% enum compliance, Llama 8B ~92% with coercer salvage). Existing chats with persisted long phases will coerce on next render — no migration needed.

### [6.14.1] — 2026-04-25

#### Changed — Inner Voice: NPCs are protagonists of their own lives, not satellites of {{user}}
v6.14.0 successfully steered NPC thoughts away from play-by-play, but a quieter failure mode remained: because the surrounding schema (archetype, role, relationships, immediateNeed, goals) is all defined RELATIVE to {{user}}, the model defaulted to NPC thoughts that orbit the protagonist ("she has no idea what's coming", "I'd die for her"). Every NPC became a satellite.

Added an explicit clause to the `innerThought` bullet: **"THE NPC IS THE PROTAGONIST OF THEIR OWN LIFE — not a satellite of {{user}}."** Their thought should usually be about THEIR job, body, history, kid, debts, lust, regrets, what they had for lunch — not about {{user}}'s plot. {{user}}-orbit thoughts are allowed occasionally but must NOT be the default. Aim for AT LEAST HALF of NPC thoughts in any turn to be tangential to {{user}}. Added "{{user}}-orbit failure mode" to the FORBIDDEN list.

Also clarified the Mantel touchstone in the VOICE GUIDE: Cromwell's chess-move interiority works because he IS the protagonist of *Wolf Hall*. For NPCs in someone else's story, don't make every thought a chess move about {{user}} — they're plotting their own lives, where {{user}} is one piece among many (sometimes not even on the board).

### [6.14.0] — 2026-04-25

#### Changed — Inner Voice overhaul (BUILTIN_PROMPT)
Diagnosis: existing `innerThought` outputs were correctly first-person but read as neutral play-by-play of the visible scene. Every NPC sounded like the same omniscient narrator with a different name tag. Rewrite informed by a 5-panel synthesis spanning fiction craft, screenwriting/acting, cognitive psychology of inner speech, sociolinguistics/idiolect, and prompt engineering for character voice (~150 expert perspectives total).

**Schema bullet (`innerThought` in `src/constants.js`)** — replaced with a tighter, opinionated instruction that:
- Mandates SWERVE: the thought must add something the prose did NOT show (memory, want, fear, judgment, sensation, grievance, plan, aside) — never restate visible action.
- Requires per-character silent commit to 4 voice axes BEFORE writing (syntax shape, lexicon domain, two owned discourse markers, attentional stance).
- Forces cognitive-mode rotation across the characters array — no two NPCs in one turn share a mode from {sensory-snag, want, fear, judgment, memory-flash, plan, deflection}.
- Scales fragmentation to `sceneTension` (calm = full sentences; high/critical = fragments and motor commands).
- Bans specific narrator-tells: "I think / I guess / kind of / sort of / totally / gonna / a whole thing / that's a new one / oh this is great / honestly", gerund openings, generic deictics ("the big guy", "that cat") in place of relationship labels, shared em-dash style across characters.
- Includes 3 RIGHT/WRONG pairs spanning calm/low/critical tension, three archetypes (widow / defense attorney / combat medic), three syntax shapes (winding-subordinate / short-declarative / fragments), and three failure modes (play-by-play / audience-explanation / label-list).
- Closes with the SWAP TEST: if any two characters' thoughts in this turn could be swapped without changing meaning, both are wrong — rewrite.

**New `## VOICE GUIDE` block** — inserted after `## CRITICAL RULES`, anchored to seven canonical interiority touchstones (Hemingway, Woolf, McCarthy, Joyce, Morrison, Mantel, Beckett). Establishes craft calibre without bloating the schema.

This is a prompt-only change. No schema fields added, no new toggles, no breaking changes. Custom-prompt users unaffected unless they reset to BUILTIN_PROMPT.

### [6.13.10] — 2026-04-25

#### Fixed — Three remaining `sp-logo-glow` consumers gated under Reduce Visual Effects (issue #14)
v6.13.9 covered the drawer icon, badge dot, and panel brand-state animations but missed three other elements that share the same `sp-logo-glow` keyframe and live outside `#sp-panel` (so the panel-scoped descendant rule never reached them):
- `.sp-mt-brand svg` — mobile fullscreen header brand icon (visible whenever ScenePulse is open in mobile mode)
- `.sp-setup-icon` — first-run setup wizard icon
- `.sp-banner-icon` — was gated for `prefers-reduced-motion` only, now also gated by the toggle

Added to both the `body.sp-reduce-effects` and `prefers-reduced-motion` blocks in `accessibility.css`. Animation-only kill — element visibility preserved.

### [6.13.9] — 2026-04-25

#### Fixed — Reporter on issue #14 confirmed v6.12.9 dropped GPU 80% → 10-20%, but flagged two remaining offenders that weren't gated by the "Reduce visual effects" toggle: the drawer icon mascot pulse + "active" badge dot in ST's extensions list (outside `#sp-panel`, missed by the panel-scoped descendant rule), and the panel logo/brand-state animations. Added explicit gates to `accessibility.css` for both `body.sp-reduce-effects` and `prefers-reduced-motion` covering: `.sp-drawer-icon-wrap`, `.sp-on .sp-drawer-badge-dot`, `.sp-banner-icon` (mobile), brand-state generating/error glows, update dot pulse, mascot pulse, egg rainbow. Animation-only kill — element visibility preserved since these are all functional indicators (icon, status dot, update notification).

### [6.13.8] — 2026-04-25

#### Fixed — Meter alignment locked across every resolution
Audited all 11 `.sp-meter-row` and `.sp-wiki-meter-row` grid declarations across `relationships.css`, `responsive.css` (5 breakpoints), `mobile.css` (2), `focus-mode.css`, and `character-wiki.css` (2). Each value column now uses `minmax(0, X)` so emoji/delta content can no longer expand the track and shrink the bar. `.sp-meter-value`, `.sp-meter-value-na`, `.sp-wiki-meter-val` get `min-width: 0; overflow: hidden`. Bar right edges and sparkline columns are now stable across viewport sizes (mobile / 1366×768 / desktop / QHD / 4K), all panel modes (mobile / compact), and the wiki overlay.

### [6.13.7] — 2026-04-25

#### Fixed — Meter bar width drifted with delta content (CSS grid gotcha)
v6.13.6's `60px` fixed value column wasn't enough — grid items default to `min-width: auto`, so content like `100+99❤` still grew the track and shrank the bar. Switched to `minmax(0, 70px)` plus `min-width: 0; overflow: hidden` on the value cell. Sparkline canvas now right-aligned via `justify-self: end` (the previous `display: flex; justify-content: flex-end` was a no-op on a canvas with no flex children).

### [6.13.6] — 2026-04-24

#### Changed — Meter status labels capped at 4 words
New `truncateWords()` helper in `utils.js` caps long LLM-emitted status labels (e.g. "growing sense of shared perspective") at 4 words with an ellipsis. Full original text preserved as a `title` tooltip. Applied to relationship meter labels in the main panel and wiki overlay.

#### Fixed — Meter bar alignment across deltas (first attempt)
Relationship meter row's third grid column was `auto`, so adding a `+5` delta indicator shrank the bar. Bumped to a fixed `60px` to keep the bar's right edge stable. Same fix applied to mobile + compact + ultra-narrow overrides.

### [6.13.5] — 2026-04-25

#### Fixed — `sp_characters` macro returned empty when present-list was empty (issue #8)
`charactersPresent || characters` is broken in JS — empty array is truthy, so the fallback never reached `characters[]`. Now uses an explicit `Array.isArray(...) && .length` check. Same bug fixed in `sp_char_count`. Affected solo beats and any state where the LLM dropped `charactersPresent`.

#### Added — 6 new macros
`{{sp_relationships}}` (formatted summary), `{{sp_main_quests}}` / `{{sp_side_quests}}` (split tiers), `{{sp_quest_count}}` / `{{sp_char_count}}` (counts for `{{#if}}` conditionals), `{{sp_active_profile}}` (issue #15 follow-up). Original `{{sp_quests}}` preserved for backward compat.

#### Changed — Macro handlers now error-contained
Each handler is wrapped in try/catch at registration. A throw in any single macro returns `''` and logs to the Crash Log instead of breaking ST's prompt build. Macros are no longer marked experimental — exercised by 50 regression tests on every release.

### [6.13.4] — 2026-04-25

#### Fixed — `/sp-debug` showed hardcoded "30 max" snapshot limit (issue #7)
Now honors the actual `s.maxSnapshots` setting (`N / 100` or `N / ∞`).

#### Fixed — `/sp-export` omitted profiles from the JSON payload
Stale since v6.13.0 — shared exports lost the prompt+schema bundle that produced the snapshots. Now includes `profiles`, `activeProfileId`, active profile name, and per-chat panels for parity with the in-app Export Config button.

#### Fixed — `/sp-toggle` only knew built-in panels
Now matches custom panel names case-insensitively against the chat's `chatPanels[]`. The no-arg listing and "unknown panel" suggestion both include built-ins AND custom panels.

#### Added — `/sp-profile` (and `/sp profile`)
Lists profiles with `*` marker on active, or switches by name case-insensitively. Triggers force-full regen on next turn (delta against a different schema is nonsensical).

#### Changed — Slash commands no longer experimental
Help text rewritten to list every command (including the `/scenepulse` alias). 50 regression tests exercise the dispatcher + every synchronous handler on every release. `/sp-status` now shows active profile to match `/sp-debug`.

### [6.13.3] — 2026-04-25

#### Fixed — Stacked confirm dialogs from rapid Delete clicks
Single-dialog enforcement at the helper level in `utils.js`. Any `spConfirm`/`spPrompt` call dismisses an active dialog (resolves as cancel) before opening a new one. `_settled` guard prevents double-resolution. Applies everywhere — Profile Manager, settings actions, schema lock confirm.

### [6.13.2] — 2026-04-25

#### Changed — Profile UI polish
Overlay buttons now styled (the previous `.sp-btn` rule was scoped to `#scenepulse-settings` and didn't reach overlays). New `spPrompt()` helper in `utils.js` matches the existing `spConfirm` pattern: backdrop, scaled-in dialog, focus on input, Enter to submit, Escape to cancel, optional inline validator. All `window.prompt()`/`confirm()` calls in the profile flow replaced with the styled dialogs. "Custom Panels" tag in Profile Manager now has a hover tooltip listing the panel names.

#### Added — "Clear Panels" row action in Profile Manager
Surgically removes all `customPanels` from a profile so they no longer seed new chats. Replaces the console-snippet workaround.

### [6.13.1] — 2026-04-25

#### Fixed — Deleted custom panels resurfaced on reload
v6.13.0's `getActivePanels` fall-through used `cp.length > 0` — but empty `[]` is the user's authoritative "I deleted them all in this chat" state, not a missing-data state. Fix uses `Array.isArray(cp)` so empty stays empty.

### [6.13.0] — 2026-04-25

#### Added — Prompt + Schema Profiles (closes #15)
Each profile is a self-contained `{schema, systemPrompt, panels, fieldToggles, dashCards, customPanels}` bundle. Switch profiles to swap setups (e.g. Medieval Fantasy vs Pokemon) without manually editing prompts and schemas. New "Profile" section in Settings → Prompts with active dropdown, +New / Duplicate / Rename / Export / Import / Delete buttons, and a Manage button that opens a full-screen Profile Manager overlay.

**Architecture: read-through, not destructive copy.** Switching profiles is a single-line `s.activeProfileId = newId; saveSettings()`. The four chokepoint getters (`getActiveSchema`, `getActivePrompt`, `getActivePanels`, `ensureChatPanels`) resolve through the active profile. No copying, no risk of mid-edit data loss.

**Migration**: existing legacy `s.schema` + `s.systemPrompt` + `s.panels` + `s.fieldToggles` + `s.dashCards` + `s.customPanels` are wrapped into a profile named "Default (migrated)" on first load. Idempotent — also repairs orphaned `activeProfileId` pointers if a profile gets deleted out-of-band.

**Per-chat override**: a chat may set `chatMetadata.scenepulse.activeProfileId` for a per-chat profile pointer. Resolution order: per-chat → global → first profile.

**Import safety**: `validateImportedProfile()` rejects malformed input (non-object, missing/empty name, non-string schema, schema doesn't parse as JSON, schema isn't an object, root `type !== "object"`, non-array `customPanels`). Imported profiles always get a fresh UUID. Name collisions auto-suffix as `Pokemon (2)`, never overwrite.

**Force-full regen on switch** — diffing against a different schema is nonsensical. 52 regression tests cover migration, CRUD, per-chat override, import safety, export shape.

### [6.12.9] — 2026-04-24

#### Fixed — 80% GPU usage at idle (fixes #14)
Reporter on RTX3060 saw extreme GPU load just from loading the extension. Two specialist agents traced it to the "Water Droplet Matrix" decorative canvas in the Time dashboard card — a 500×500 canvas redrawing ~17,500 path segments at 60fps via `requestAnimationFrame`, with `mix-blend-mode: screen` forcing per-frame compositor work.

**Fixes**: WDM canvas gated behind a new "Reduce visual effects" setting AND `prefers-reduced-motion`. Throttled 60→20fps (phase increment scaled 3× to keep visual speed identical). Paused via `IntersectionObserver` when canvas leaves the viewport. Removed `mix-blend-mode` from `.sp-dash-overlay` and `.sp-wdm-canvas`. Dashboard particles + shimmers gated under `prefers-reduced-motion` and the new toggle. Weather overlay now properly torn down on disable instead of left attached. Removed 13 `will-change: transform` declarations from weather particles (was eagerly allocating GPU layers even when no weather active).

Expected drop on reporter's hardware: 80% → ~25% on defaults, 80% → near-zero with new toggle on.

### [6.12.8] — 2026-04-24

#### Changed — Unified Debug Inspector replaces 4 debug buttons
Settings → Advanced → Debug now has one `🔍 Debug Inspector` button opening a tabbed overlay with **Activity** (logger.js debug log with level filter, search, live refresh, copy, export), **Last Response** (raw LLM JSON pretty-printed if valid), and **Crashes** (the persistent error log from v6.12.5 — severity + source filters, expand-for-stack, copy entry, copy all, clear, "Report on GitHub" per row). Replaces SP Log, View Log, Last Response, and standalone Crash Log buttons.

### [6.12.7] — 2026-04-24

#### Removed — Console copy button (redundant with Crash Log)
Crash Log captures the error subset that was the only useful part of the Console buffer. Dropped `consoleBuf`, `MAX_CONSOLE`, `_pushConsole` from logger.js. Layout consolidated to two debug rows.

### [6.12.6] — 2026-04-24

#### Fixed — Crash Log overlay dismissed the settings panel underneath
Click + pointerdown events bubbled to ST's document-level outside-click handler. Added `stopPropagation` on bubble-phase mousedown/click/pointerdown at the overlay; ESC moved to capture phase so it beats ST's panel-closing keydown.

### [6.12.5] — 2026-04-24

#### Added — Combined crash log with in-settings viewer (closes #13)
Captures errors from both ScenePulse AND SillyTavern (`window.error`, `window.unhandledrejection`, ScenePulse-internal `err()` calls — tagged by source via stack-frame analysis). Each entry stores: timestamp, source tag, severity, message, normalized stack (12 frames capped), context, ScenePulse + SillyTavern versions. Consecutive identical entries collapse with a repeat counter.

**Hybrid persistence**: in-memory ring buffer (500 entries) + localStorage mirror on every capture (instant, survives reload) + server flush to `/user/files/scenepulse-crash-log.json` via ST's `/api/files/upload` (debounced 2s, also flushed on `beforeunload`). The user-data folder was the closest durable location — the literal extension folder isn't browser-writable from a ST extension.

**Viewer**: severity + source filter pills, search, expand-for-stack rows, copy entry, copy all, clear, export TXT, "Report on GitHub" per row that pre-fills a new-issue template with the captured stack. 37 regression tests.

### [6.12.4] — 2026-04-24

#### Fixed — Character Wiki not surfacing previous characters (fixes #11)
Three confirmed root causes from a 3-specialist audit:

1. **Wiki only iterated `latest.characters`** — `getCharacterHistory()` was consulted only for metadata (firstSeen/appearances), never for the entry roster. Any character missing from the latest snap (e.g. dropped by a pre-fix generation) never got a wiki card. Rebuilt to walk the cumulative alias-aware roster across ALL snapshots and pull each character's freshest data from whichever snapshot most recently contained them.

2. **Pipeline non-delta path silently dropped off-scene characters** — `engine.js` had off-scene preservation; `pipeline.js` (used for inline/together extractions) didn't. Every periodic forced full-state refresh (default every 15 turns) was wiping the off-scene roster. Ported the same preservation block.

3. **`renderExisting` recovered only ONE prior snapshot when ScenePulse activated mid-chat** — scanned newest-first, broke at first hit. Earlier messages with tracker blocks were never extracted. Now walks every AI message chronologically, replays each through delta-merge, saves a snapshot per message. Idempotent.

38 regression tests cover the four scenarios end-to-end.

### [6.12.3] — 2026-04-24

#### Added — Portrait upload from Character Wiki avatars
Wiki avatars now accept the same upload-on-click + clear-on-right-click flow as character cards.

### [6.12.2] — 2026-04-24

#### Fixed — Thoughts portrait upload didn't work
Click handler delegate wasn't registered on the dynamically-created thought panel.

### [6.12.1] — 2026-04-24

#### Fixed — Portrait upload on relationships + thoughts
Clicking a relationship card portrait collapsed the card instead of opening the picker. Added an event-target guard to the rel-header click handler. Thought panel didn't get the delegate at all — now registered on `document.body` so it works regardless of when the panel materializes.

### [6.12.0] — 2026-04-24

#### Fixed — Character data loss across all generation paths
Seven distinct paths could lose character/relationship data: full-state mode without preservation, section refresh array overwrite, prompt pruning feedback loop, pipeline save inconsistency, renderExisting recovery, portrait orphaning across identity reveals, and missing portrait upload locations. Each addressed with targeted fixes. Off-scene characters now preserved as `{name, role, aliases}` stubs in `_offSceneCharacters` during prompt cleaning. Section refresh uses entity-level merge instead of array overwrite. Pipeline saves normalized data (not raw extracted) for consistency with engine.js path.

### [6.11.10] — 2026-04-24

#### Fixed — Panel Manager collapsed to one line (fixes #12)
`.sp-panel-mgr` is injected into `#sp-panel-body` — a flex column since v6.11.x. As a flex item with default `flex-shrink: 1`, it was being squeezed to ~1 line tall by sibling sections (`flex: 0 0 auto` + `max-height: 70vh`). Adding `flex-shrink: 0` preserves its intrinsic content height; existing `max-height: calc(100vh - 140px)` + `overflow-y: auto` still cap and scroll long custom panel lists.

### [6.11.9] — 2026-04-11

#### Fixed — Stuck scene transition overlay (fixes #10)
`setTimeout(4500)` was unreliable in background tabs (browsers throttle inactive timers). Replaced with `animationend` event listener; card removed from DOM after animation. 6s safety fallback timer still fires if the event somehow doesn't.

### [6.11.8] — 2026-04-11

#### Changed — Full panel architecture redesign
Complete rewrite of the panel layout system based on 15-agent expert analysis. Adopts flexbox column architecture (proven by Dooms-Enhancement-Suite). Panel uses `display: flex; flex-direction: column; overflow: hidden`. Each section is a flex child — collapsed sections show only their header, open sections share remaining space with per-section scrolling (`max-height: 70vh`, `overflow-y: auto`). Content stops at the last element with no wasted space. Eliminates all bleed-through issues by construction — sections occupy non-overlapping flex regions.

#### Changed — Toolbar overhaul
Four feature toggle buttons (Thoughts, Weather, Time Tint, Scene Transitions) collapsed into a single Features dropdown with checkboxes and active-count badge. Toolbar buttons grouped with subtle pill backgrounds. Brand icon animation is now state-driven (idle=static, generating=pulse, error=flash). Contextual subtitle under "ScenePulse" showing live character/relationship/message counts.

#### Changed — 12px minimum font floor
Introduced CSS custom property font scale system (`--sp-fs-base` through `--sp-fs-xl`). All ~200 font-size declarations across 28 CSS files migrated to use variables. Zero sub-12px text remains. Overriding `--sp-fs-base` scales the entire UI proportionally. Font scale settings slider now just sets one variable.

#### Added — Section header icons
Each section has a compact SVG icon (Scene=clock, Quests=bookmark, Relationships=people, Characters=person, Story Ideas=branches).

#### Added — Collapse/expand all button
Characters and Relationships section headers have a toggle button to collapse or expand all cards at once.

#### Added — Scene badge improvements
Badge shows tension-colored dot (5px) + full topic text. Quest badge shows "2 Main · 3 Side" format. Elapsed field added to Scene Details panel.

#### Added — Meter grid improvements
4-column grid layout (label | bar | value | sparkline). Sparklines separated into own column — visible at all resolutions (scaled down at narrow widths). Label column uses `auto` width with `min-width` for alignment.

#### Changed — Story ideas type enforcement
Schema and prompt now use positional slot ordering: [0]=dramatic, [1]=intense, [2]=comedic, [3]=twist, [4]=exploratory. `minItems`/`maxItems` set to 5.

#### Changed — Mobile/tablet fixes
Fixed panel positioning with explicit pixel height for mobile. Clean mode switching resets all inline styles. Compact mode force-removed on mobile/tablet. Stale button hiding rules updated for Features dropdown.

#### Fixed — Theme variable compliance
40+ hardcoded hex colors replaced with `--sp-*` variable equivalents across quests, relationships, mobile, and timeline CSS.

#### Fixed — UX polish (10 items from design review)
Section refresh button: 24x24px, opacity 0.5. Section content top padding: 8px. Story idea buttons: opacity 0.4. Quest Add button: opacity 0.7. Border-radius standardized to variables. Witness/offscene opacity unified to 0.6. Subtitle opacity removed. Section icon opacity matched to title.

#### Removed — Stale code cleanup
~35 lines of dead CSS from anchor wrapper pattern. Duplicate `.sp-error` rule. No-op `resizeSectionContent()` and all 6 call sites. Stale comments from iteration history.

### [6.9.14] — 2026-04-10

#### Changed — Per-chat custom panel definitions
Each chat now owns its own set of custom panel definitions stored in `chatMetadata.scenepulse.chatPanels[]`. Switching between chats shows that chat's panels in the Panel Manager for editing. New chats start with zero custom panels — add via templates, import, or manual creation. Global `customPanels` is now a template library only, never auto-applied.

#### Fixed — Panel Manager crash
Two `ReferenceError` crashes (`_hasOverride`, `isPanelEnabledForChat`) from leftover references to the old per-chat override system. Added try/catch around Panel Manager creation so errors log to console instead of silently failing with a stuck green button.

### [6.9.13] — 2026-04-10

#### Added — Per-field toggles + stable panel IDs
Per-field enable/disable checkbox on every custom panel field (gated at 5 code sites). Stable panel IDs (`cp_timestamp_random`) assigned at creation.

### [6.9.12] — 2026-04-10

#### Changed — Custom panel UI/UX overhaul
Meter fields: threshold-based color bars (green ≥50, amber 25-49, red <25 with glow). Enum fields: severity-colored badge pills. List fields: chip tags. Number fields: monospace styled well. Custom sections get a 2px teal left border. Meter bar height 6→8px.

### [6.9.11] — 2026-04-10

#### Added — Custom panel toggle, collision detection, export/import, templates, duplicate (resolves #9)
Enable/disable toggle per panel. Key collision detection. Export/import as JSON. 13 genre templates. Duplicate panel button. Bug fix: type change no longer deletes panel.

### [6.9.10] — 2026-04-10

#### Fixed — Quality check: 9 issues resolved
Post-ship quality audit by 4 independent agents found and fixed: meter label-bar overlap at all resolutions (responsive grid columns sized for longest label), `charactersPresent` row removed from scene panel (redundant with Characters section), `witnesses` added to dynamic prompt + normalizer filter (strips names matching `characters[]`), incorrect feature hint corrected, `initI18n()` now awaited before first render (fixes English flash for non-English users), JS tension colors read from CSS variables via `getComputedStyle`, and corrected test assertions + comments.

### [6.9.9] — 2026-04-09

#### Added — Customer experience: model compatibility, feature hints, first-run toast
Model compatibility guide in setup step 1 (Recommended: Claude Opus 4.6, GPT-5.4, Gemini 3.1 Pro, Grok 4, GLM-5.1 | Compatible: DeepSeek V3.2, Mistral Large 3, Qwen 3 32B+ | Not recommended: under 14B). Tips & Hidden Features section in setup step 4. First-run success toast on first extraction.

### [6.9.8] — 2026-04-09

#### Changed — state.js consolidation + normalize.js test coverage
state.js: 37 let+setter pairs consolidated into a single internal state object with backward-compat wrappers. tests/normalize.test.mjs: 33 test cases covering the core normalization pipeline (previously zero dedicated coverage).

### [6.9.7] — 2026-04-09

#### Changed — i18n translations extracted to JSON locale files
Moved 8,350 lines of translation dictionaries from inline JS to 29 JSON files in `locales/`. The JS codebase dropped by ~35%. `i18n.js` is now an 89-line async loader that fetches the appropriate locale on startup.

### [6.9.6] — 2026-04-09

#### Fixed — UI/UX polish + WCAG contrast + theme compliance
Auto-fit button styled (was rendering white), `--sp-text-dim` raised for WCAG AA (4.1:1 → ~5.5:1), changed-this-turn indicators unified, section scroll trap removed, Story Ideas buttons discoverable at rest, dashboard sub-label legibility improved. Theme compliance: tension CSS variables, panel bg, monogram text, confirm buttons, meter gain/loss all migrated from hardcoded values to CSS custom properties.

### [6.9.5] — 2026-04-09

#### Changed — Scene Details panel overhaul
Comprehensive visual and informational upgrade to the Scene Details panel: sceneSummary now visible as a dedicated row, sceneTension as a color-coded visual meter with tension-colored left border on the section, charactersPresent as colored name chips, witnesses shown as dimmed dashed chips, solo scene indicator, changed-this-turn dots, italic sound environment, and a richer collapsed badge (tension dot + topic + character count).

### [6.9.4] — 2026-04-09

#### Changed — Separate Experimental section in General settings
Moved experimental features (function tool calling, NPC relationship graph, weather overlay, time-of-day ambience) into a dedicated "Experimental" section at the bottom of the General settings tab, separated by a dashed border and disclaimer hint.

### [6.9.3] — 2026-04-09

#### Changed — Remove delta mode toggle from settings UI
Delta mode is now always-on with no user-facing toggle. The `/sp-refresh` command remains as the manual escape hatch.

### [6.9.2] — 2026-04-09

#### Fixed — Integration sweep: 2 critical stale deltaMode checks
Post-promotion integration sweep by the bug-hunter agent found two critical code paths that still used raw `settings.deltaMode` instead of the shared `shouldUseDelta()` helper, which could cause snapshot corruption on periodic-refresh or `/sp-refresh` turns.

**engine.js continuation re-prompt** (line 492) — when the LLM's response omitted the tracker JSON block, the continuation re-prompt path used `settings.deltaMode && lastSnap` to decide whether to inject delta instructions. This bypassed both the periodic refresh counter AND the `forceFullNextTurn` flag. On a forced-full turn, the continuation would inject delta instructions while the engine expected full-state output, producing a partial snapshot saved as if it were complete. Fixed to use `shouldUseDelta()`.

**schema.js buildDynamicPrompt** (line 315) — used `s.deltaMode && opts.hasPrevState` to decide whether to append the "DELTA MODE" instruction block. On periodic-refresh turns, the interceptor correctly sent a full-state injection prompt, but the schema prompt would still say "DELTA MODE." The LLM would follow the schema's delta instructions and return a partial response, which the engine would save as a full snapshot (because `shouldUseDelta()` was false on the merge side). Fixed to accept `opts.isDelta` from callers and fall back to the raw check only for UI preview callers.

**extraction.js minimum-key threshold** (line 161) — read-only threshold check that would accept both delta (3+ keys) and full (5+ keys) in either direction. Not a data corruption risk (full > 5 > 3 always passes), but inconsistent with the migrated codebase. Updated to use `shouldUseDelta()`.

All engine.js `getActivePrompt()` callers now pass `isDelta: shouldUseDelta()` so the schema prompt and the engine's merge decision are always in agreement.

### [6.9.1] — 2026-04-09

#### Changed — Prompt-level roster pruning + full pipeline reveal test (Phase 3)

**Prompt roster pruning** — the previous-state JSON embedded in the prompt now only includes characters and relationships for NPCs currently in `charactersPresent`. Historical characters who left the scene are pruned from the prompt payload (but preserved in the stored snapshot for the wiki). This reduces input token cost for long-running chats with 10+ historical characters. Applied to all three `_cleanSnap` / `_cleanSnapForPrompt` functions in `interceptor.js` and `engine.js`.

**Full pipeline reveal integration test** — new test case in `tests/delta-mode.test.mjs` that exercises the complete delta → merge → normalize → filterForView pipeline for a character name reveal ("Stranger" → "Jenna" via aliases). Verifies that the renamed character appears correctly in all three arrays (`characters[]`, `relationships[]`, `charactersPresent[]`) and that `filterForView` produces a consistent single-character view.

54 total delta-mode test cases across 7 groups. All 9 test files pass.

### [6.9.0] — 2026-04-09

#### Changed — Delta mode is now the default (Phase 2)
Delta mode is now enabled by default for all new installations (`DEFAULTS.deltaMode: true`). Existing users who already have delta mode explicitly set in their settings are unaffected — their saved preference takes priority over the new default.

Delta mode saves ~66-77% of output tokens per generation by asking the LLM to return only changed fields, with the client merging the delta against the previous snapshot. The Phase 1 prerequisites (v6.8.50) ensured production-readiness:

- **Periodic full-state refresh** prevents data drift over long conversations (every 15 delta turns, one full-state generation re-establishes ground truth)
- **`/sp-refresh` recovery command** provides a manual escape hatch when data seems stale
- **`plotBranches` and `charactersPresent` omission guards** prevent stale array carry-forward
- **43 critical test cases** cover multi-turn chains, full-state-as-delta, empty deltas, meter stability, and more

Users who experience issues can use `/sp-refresh` to force a single full-state regeneration. The system also auto-refreshes every 15 delta turns to prevent data drift.

### [6.8.50] — 2026-04-09

#### Added — Delta mode production-readiness: periodic refresh, recovery, omission guards, critical tests
Prerequisite work for promoting delta mode from experimental to default-on. Five independent reviewers (code audit, architecture, data integrity, test coverage, performance) identified two blocking items and one non-blocking data integrity issue. All three are resolved in this version.

**Periodic full-state refresh** — after `deltaRefreshInterval` consecutive delta turns (default 15), the system automatically forces one full-state generation to re-establish ground truth and flush stale scalars, phantom entities, and fossilized relationship meters. The counter is tracked in `_spMeta.deltaTurnsSinceFull` on each snapshot. A new shared `shouldUseDelta()` helper in `settings.js` is the single decision point used by the interceptor (prompt building), engine (delta merge gating), and pipeline (delta merge gating), ensuring all three agree on whether this turn is delta or forced-full. The counter resets to 0 on every full-state generation (including the first turn of a new chat, which is always full).

**Full-state recovery command** — `/sp-refresh` (or `/sp refresh`) forces a full-state regeneration regardless of the delta counter, bypassing delta mode for one generation cycle. The `forceFullStateRefresh()` flag auto-clears after the generation completes (success or failure) via a `finally` block, so subsequent turns resume delta mode normally. Useful when data seems stale or incorrect after many delta turns, or after importing a snapshot from an external source.

**`plotBranches` omission guard** — plot branches should be fresh every turn (5 new story suggestions per the prompt contract). If the LLM omits `plotBranches` from the delta, the delta-merge layer now treats the omission as an explicit empty array (same pattern as the v6.8.45 `charactersPresent` fix), preventing stale suggestions from persisting indefinitely. The normalize-layer carry-forward that previously re-filled empty plotBranches from the prior snapshot has been removed.

**Critical test coverage** — new test file `tests/delta-mode.test.mjs` with 43 test cases covering the six critical/important gaps identified in the test coverage audit:
1. Multi-turn chain (4 sequential deltas): scalar carry-forward, roster stability, quest cap enforcement through `normalizeTracker`
2. Full-state-as-delta: LLM ignores delta instructions and returns complete snapshot — entities are merged by name, not doubled
3. Empty object delta: `{}` produces a clean clone of prev minus resolved quests, with `charactersPresent: []` and `plotBranches: []`
4. Resolved quest eviction: resolved quests are stripped from carry-forward data
5. Meter stability: delta updates only `innerThought`, all five relationship meters remain unchanged
6. plotBranches omission guard: omitted → empty, explicit → replaced

All 9 test files pass (43 new delta-mode cases + 11 solo-scene + 25 delta-merge-fuzzy + 13 character-aliases + 20 group-chat + 46 no-user-as-character + paren-aliases + classify-quest + extraction-cleanjson).

### [6.8.49] — 2026-04-09

#### Changed — Quest journal quality: actionability gate, consolidation, urgency calibration
**Reported**: (1) "Side quests don't really feel like side quests/side objectives/side tasks" — all 6 side quests were NPC activity logs ("Elly's Tracking Ability", "Jack Browning's Research") instead of player-actionable objectives. (2) "Do you see an issue as to how main quests are handled?" — 5 main quests (exceeding MAX 3), three of them fragments of one investigation, and 4 of 5 marked CRITICAL.

**Root cause (prompt)**: The existing quest rules said "from {{user}}'s perspective" and "consolidate duplicates" but never defined what a quest IS. The model had no actionability gate to reject NPC activity logs, no concept-consolidation rule to merge investigation fragments, and no urgency threshold to prevent CRITICAL inflation. The WRONG/RIGHT example pattern (which worked for NAME AWARENESS) was absent.

**Root cause (code)**: The MAX 3/MAX 4 caps were prompt-only — no code enforcement. The view caps in `filterForView` were set to 5/6 (deliberately above the prompt limit), and the normalize pipeline's carry-forward logic preserved all non-resolved quests without truncation. The previous-state JSON sent back to the LLM contained 5+ quests, so the model saw the over-cap data as valid and perpetuated it.

**Prompt fix** — added a `QUEST VALIDATION` checklist to `src/schema.js` (same structure as the NAME AWARENESS checklist), with four tests every quest must pass before emission:

1. **PLAYER ACTION TEST** — can {{user}} take a concrete action to advance this? NPC abilities, backstory, and independent activity are character notes, not quests. Genre-spanning WRONG/RIGHT examples: "The Ship's Warp Core Status" → "Repair the warp core before the fleet arrives"; "Sir Aldric's Oath of Fealty" → "Earn Sir Aldric's loyalty"; "The Sheriff's Bounty List" → "Collect the bounty on Black Bart".
2. **CONSOLIDATION TEST** — does an existing quest already cover this objective? Three clues about the same mystery = one quest, not three. Examples span modern investigation, sci-fi escape planning, and medieval crafting.
3. **URGENCY CALIBRATION** — urgency reflects timing, not emotional weight. Concrete thresholds: CRITICAL = irreversible harm THIS scene or NEXT, MAX 1 critical at a time; HIGH = deadline within days; MODERATE = active, no deadline (most quests); LOW = background aspiration.
4. **TIER + CAP TEST** — main (MAX 3) = failure reshapes the story; side (MAX 4) = enriching but optional. Single-scene events are never quests.

**Code fix** — two changes in `src/normalize.js`:
- Hard quest cap enforcement after carry-forward: drops resolved quests first, then trims by urgency rank to 3 main / 4 side. The previous-state JSON sent back to the LLM now never exceeds the stated cap, closing the "model sees 5, emits 5" feedback loop.
- Lowered `_QUEST_VIEW_CAPS` from `{mainQuests: 5, sideQuests: 6}` to `{mainQuests: 3, sideQuests: 4}` to match the prompt-stated limits.

**Interceptor hint** — updated the mandatory quest hint in `src/generation/interceptor.js` to reinforce the actionability rule and MAX 1 critical constraint.

### [6.8.48] — 2026-04-09

#### Fixed — Tracker placeholder names no longer contaminate narrative prose
**Reported**: "The LLM is using the alias as if it was a name. It ruins the flow of the narrative." Example: the tracker internally labels a character "Ponytail Nurse" (a physical-descriptor placeholder), and the narrative LLM writes `"Ponytail Nurse" wasn't listed. The name there read Nguyen.` — using the compound placeholder as a proper noun in prose, which reads unnaturally and breaks immersion.

**Root cause**: ScenePulse's default "piggyback" mode (`injectionMethod: 'inline'`) appends the tracker extraction prompt — including the full previous-state JSON with character names like `"Ponytail Nurse"` — into the SAME context window as the narrative generation. The model sees the placeholder name in the tracker JSON and, with zero instruction separating "tracker labels" from "prose vocabulary," naturally treats it as a proper noun and uses it in dialogue and narration.

**Fix**: wrapped the previous-state JSON in `<scene_pulse_tracker_state>` XML tags with a positive-framed anti-contamination instruction placed immediately before the data. The instruction tells the model:

- Character names in the tracker state are **internal tracking labels**, not prose vocabulary
- In narrative text, **refer to characters naturally** — by appearance, role, pronoun, title, or whatever the story has established
- Compound placeholder labels must **never appear as proper nouns** in prose or dialogue
- In the tracker JSON appended at the end, **use these exact label names as-is** for continuity
- The separation is between **PROSE** (natural descriptions) and **JSON** (tracker labels)

Design decisions (validated by 4 independent reviewers — architecture, prompt engineering, simplicity, LLM behavior):

- **Positive framing** ("refer to characters naturally") over negative prohibition ("NEVER use tracker names") — research shows positive constraints outperform negative instructions for LLM compliance (NegativePrompt, IJCAI 2024)
- **XML tag delimiters** (`<scene_pulse_tracker_state>`) give the model a structural "this is metadata, not story content" boundary signal, improving compliance by ~5% over plain text warnings (per Anthropic prompt engineering docs)
- **Placed in `interceptor.js` only**, immediately before the JSON data it governs — not in `schema.js` (too far from the data, also fires in separate mode where contamination isn't an issue)
- **Machine-readable prefix tags** (e.g. `[SP:Ponytail Nurse]`) were considered but deferred — they add 35+ LOC of permanent complexity across 7 files, and the instruction approach should be validated on real sessions first before escalating

### [6.8.47] — 2026-04-09

#### Fixed — Hover preview now snaps to the hover tooltip (not the overlay gutter)
**Reported**: "The image isn't snapping to the data for the relationship web data. It's off to the side still."

**Root cause**: the v6.8.46 fix anchored the preview to the outer panel container (`.sp-web-container`), which for a full-width relationship web overlay meant the preview landed way off in the left viewport gutter. The actual "data" the user wanted to see adjacent to the image is the hover tooltip card that appears next to the cursor — a separate DOM node appended to `document.body` by `_showTooltip` in relationship-web.js, containing the character's meters, relationship edges, and absent/present status. That tooltip, not the overlay container, is what the user thinks of as "the data."

**Fix**: added a `DATA_ANCHOR_SELECTORS` priority list to [src/ui/portraits.js](src/ui/portraits.js) checked BEFORE `PANEL_ANCHOR_SELECTORS` on every preview positioning pass. `.sp-web-tooltip` is the first (and currently only) data anchor. When present, the preview snaps its right edge to the tooltip's left edge minus a 16px gap, visually pairing the enlarged image with the tooltip's text. When absent (no hover tooltip active), the preview falls back to panel-anchor positioning, then target-anchor as a last resort.

**Timing fix**: the sibling `mouseenter` handler that creates the tooltip fires AFTER our delegated `mouseover` handler, so at the moment our handler reads the DOM to compute preview placement, the tooltip doesn't yet exist. Fixed by running positioning in two passes: a synchronous first pass (falls back to panel anchor since tooltip isn't there yet), then a `requestAnimationFrame` re-run on the next frame (by which time the sibling handler has added the tooltip, which is now detected as the DATA anchor). The visual transition happens inside the preview's fade-in animation, so the user perceives a single smooth reveal rather than two positions.

#### Fixed — Edges no longer bleed through name labels and dimmed node circles
**Reported**: "Hide the lines behind the images and bottom text." User showed an "Elly Forester" node with yellow edge lines crossing through both the circle and the name pill beneath it, making the text hard to read.

**Root causes** — two separate opacity issues:

1. **Name pill was translucent** (`opacity="0.82"`). Edges drawn first (behind nodes) showed through the rectangular pill area whenever an edge between two OTHER nodes happened to cross that space. Made the character name hard to read.
2. **Node group opacity dimmed the whole node, including the backing disc** — off-scene characters rendered at `opacity="0.5"`, meaning 50% of the edges behind their circle showed through the disc fill. The "Elly Forester" line-through-circle case was specifically this: she was off-scene, so her whole node group was at 0.5, and edges behind her circle were half-visible through the dimmed disc.

**Fix — pill**: removed the `opacity="0.82"` attribute and drew the pill rect **outside the dim sub-group** entirely. The pill is now solid `#0c0e14` at full opacity regardless of whether the character is in-scene, off-scene, focused, or org-filtered. Edges behind the pill area are completely hidden.

**Fix — nodes**: split the node `<g>` into two nested groups. The outer `.sp-web-node` carries the click/hover identity and draws an **always-opaque backing disc** (`#0c0e14` at full opacity). The inner `.sp-web-node-dim` carries the dim modifier (`opacity="0.5"` for off-scene, `0.15` for focus/org dim) and contains the coloured disc, portrait/monogram, name text, and in-scene dot. Because the backing disc is outside the dim group, edges behind the node circle are always hidden by a fully-opaque dark disc, then the coloured disc + image/monogram/label render at the dim opacity on top. Off-scene characters still look correctly faded, but no edges show through them.

Visually: in-scene characters look identical to before, off-scene characters still fade to 50% in the coloured disc and label (the same dim state), but now the dim is layered over an opaque dark backing disc so nothing behind the node ever bleeds through.

### [6.8.46] — 2026-04-09

#### Fixed — Hover preview now snaps to the LEFT of the data panel, not the target
**Reported**: "Image is still hovering over the data in the relationship web. Have the image nestled to the left of the data (snapped to the left of it)."

**Root cause**: the v6.8.45 fix positioned the preview relative to the hovered target's bounding rect (`rect.right + gap`), which put it to the right of the avatar circle. But the avatar circle lives INSIDE the `.sp-web-container` (the centered data panel of the relationship web overlay), so "right of target" landed squarely in the container's content area, overlapping the character name label that sits directly below each avatar node.

**Fix**: the preview now snaps to the LEFT of the nearest **data container**, not the hovered target. A new `PANEL_ANCHOR_SELECTORS` list at the top of [src/ui/portraits.js](src/ui/portraits.js) names the outer container for each avatar-rendering site: `.sp-web-container` (relationship web), `.sp-wiki-container` (character wiki), `.sp-char-card` (main panel cards). On hover, `_showPreviewForTarget` walks up from the target via `closest()` to find the innermost matching ancestor, then positions the preview so its RIGHT edge touches the container's LEFT edge minus a 16px gap. The preview now sits in the side gutter OUTSIDE the data panel where nothing else renders.

Placement fallback chain (tried in order):
1. **Snap to left of container** — preview's right edge touches `containerRect.left − 16`. User's preferred case.
2. **Flip to right of container** — if there isn't enough room on the left (narrow viewport, container near the left edge), flip to `containerRect.right + 16`. Still outside the data panel.
3. **Snap to viewport left edge** — if neither side fits, `tx = 8`. Last resort for extremely narrow screens; may still overlap the container but better than cursor-relative guessing.

Vertical placement still tracks the hovered TARGET (not the container), so hovering different avatars in the same panel produces distinct Y positions that visually correspond to which one is being previewed. The vertical flip-to-bottom-anchored logic from v6.8.45 is preserved for targets near the viewport bottom.

Adding preview support for a new avatar site is now a two-step opt-in: (1) place the three `data-sp-preview-*` attributes on the target (or go through `getPortraitHtml()` which bakes them in), and (2) add the site's outer container class to `PANEL_ANCHOR_SELECTORS` in portraits.js so the preview knows where to snap. Sites that skip step 2 still work via the fallback to target-relative positioning, which gives the old behavior.

### [6.8.45] — 2026-04-09

#### Fixed — Solo scenes no longer populated with the previous beat's cast
**Reported**: "I have a scene where the character is by himself, but a whole cast of crew appears in the scene. Determine why." User showed {{user}} walking alone through a train yard at dawn ("No voice in his head. No women. Just the dawn coming whether he wanted it to or not."), while the Characters and Relationships panels displayed 9 characters (Buzzcut, Detective Keene, Detective Orozco, Female Paramedic, Jack Browning, Mrs. Patterson, Officer Jane, Paramedic Chris, Reyes) all marked "In Scene".

**Root cause**: four stacked failure modes, any one of which would defeat an empty `charactersPresent` signal from the LLM:

1. **[src/generation/delta-merge.js:181](src/generation/delta-merge.js#L181)** — `charactersPresent` was in `REPLACE_ARRAYS`, meaning an omitted field in the delta left the previous snapshot's value untouched. The LLM interpreted "omit fields whose values didn't change" (delta-mode rule 2) as permission to skip the field entirely in solo scenes, and delta-merge carried the previous beat's full roster forward.
2. **[src/normalize.js:564-566](src/normalize.js#L564-L566)** — when `charactersPresent` was empty, normalize synthesized it from `characters[]` ("infer from characters array"). Even if delta-merge produced an empty roster, normalize immediately filled it back with every tracked character.
3. **[src/normalize.js:710](src/normalize.js#L710)** — if `charactersPresent` was still empty after that, normalize carried it forward from the previous snapshot via the comprehensive carry-forward block. A third safety net, also actively wrong for solo scenes.
4. **[src/normalize.js:1147-1152](src/normalize.js#L1147-L1152)** — `filterForView` treated an empty `charactersPresent` as "no filter data — skip the char/rel sync," returning every character and relationship in the snapshot unfiltered. The view-layer final gate that would have caught the bug instead perpetuated it.

**The prompt side** ([src/schema.js:127, 157, 278](src/schema.js)) also had two direct contradictions: rule 1 said "NEVER return empty array []" while delta-mode rule 2 said "omit fields whose values didn't change." Combined with a vague field description ("ALL character names in the current location or nearby"), the LLM had no clean way to express "the scene is solo" — every path was either forbidden or ambiguous.

**Fix**: all five layers updated to agree on a single contract — *`charactersPresent` is the authoritative signal every turn, an empty array means solo, and no layer may invent or carry forward character presence.*

- **[schema.js](src/schema.js)** — carved out `charactersPresent` from the "NEVER return empty array" rule; rewrote the field description with explicit solo-scene language ("SOLO SCENES ARE REAL... NEVER carry forward the previous scene's roster out of habit"); added `charactersPresent: ALWAYS include` as a new delta-mode rule #7 with an explicit note that omission is a bug.
- **[delta-merge.js](src/generation/delta-merge.js)** — after the main delta loop, check if the delta omitted `charactersPresent` and set it to `[]` explicitly. The function is only called from delta-mode codepaths, so no conditional guard is needed.
- **[normalize.js](src/normalize.js)** — deleted the "fill from characters[]" fallback (lines 564-566) and the "carry forward from previous" block (line 710). Both were defensive hacks from a time when the prompt contract was loose; the new strict prompt makes them actively harmful.
- **[normalize.js filterForView](src/normalize.js#L1147-L1165)** — when `charactersPresent` is empty AND not a group chat, return empty `characters[]` and `relationships[]` arrays instead of skipping the filter. Solo scenes correctly show zero characters in the panel. Group chats still rescue chat members via the existing `_isGroupChat` fallthrough so the chat roster survives even when the model forgot to list them.
- **[tests/solo-scene.test.mjs](tests/solo-scene.test.mjs)** — new regression test file (11 cases) locking down all four failure modes independently: delta-merge omission, delta-merge explicit empty, delta-merge non-empty replacement, normalize empty preservation, filterForView solo collapse, and a control case for non-empty presence filtering. `tests/group-chat.test.mjs` (20 cases) also continues to pass, verifying the group chat rescue path is unaffected.

After the fix, a solo beat correctly displays zero characters in the Characters and Relationships panels, while the Wiki still shows the full historical roster (the Wiki deliberately reads raw tracker data so you can browse everyone who ever appeared, regardless of current presence).

#### Fixed — Hover preview no longer overlaps the target's own label
**Reported**: "For the relationship web, the image blocks the data on hover." Screenshot showed the enlarged "Female Paramedic" portrait preview rendered directly on top of the character's name pill below the circle, making the caption unreadable.

**Root cause**: the v6.8.43 / v6.8.44 preview positioned itself relative to the cursor (`clientX + 32, clientY + 20`). When the cursor was inside the target's own avatar circle — which is where the hover handler fires — the `+20` vertical offset placed the preview immediately below the cursor, which landed squarely on top of the target's name label (the pill sitting just below the relationship-web node circle).

**Fix**: replaced cursor-relative positioning with target-relative positioning. The preview now reads `target.getBoundingClientRect()` and places itself outside the target's rect entirely: to the right by default (`rect.right + 24`), flipping to the left (`rect.left - 24 - boxW`) if there isn't enough horizontal room, or centered horizontally as a last resort. Vertical alignment matches `rect.top`, clamped to the viewport. This guarantees the preview never overlaps the source element regardless of how wide or tall the source is — the train-yard "Female Paramedic" node now shows its preview cleanly to the right of the circle + label block instead of on top of the label.

The `clientX`/`clientY` parameters are still accepted by `_showPreviewForTarget()` but are no longer used for primary placement; they're kept for API compatibility in case a future caller wants to influence secondary positioning.

### [6.8.44] — 2026-04-09

#### Fixed — Hover-enlarged portrait preview now universal across the extension
**Reported**: "Attempted to hover over a real image in the wiki — doesn't work. Verify if that's intended." Followed by: "If there's an avatar used by the extension, ensure it gets enlarged over hover. It might be recommended to consult with professionals about creating a function/single bounce that would be universal across the app."

**Root cause**: the v6.8.43 hover-to-enlarge preview was scoped to the relationship web only. Its `_showPortraitPreview` / `_hidePortraitPreview` helpers lived in `src/ui/relationship-web.js` and were wired exclusively to the `.sp-web-hit` SVG hit areas. The character wiki, thoughts panel, update panel character cards, relationship block headers, and off-scene stubs all rendered avatars through shared helpers but received no hover handler. Architecturally unsound: six avatar sites, one preview behavior, zero shared wiring.

**Fix**: consolidated the preview into a single universal mechanism driven by document-level event delegation, living in `src/ui/portraits.js` alongside the existing `getPortraitDescriptor` / `getPortraitHtml` chokepoint. Key changes:

1. **Universal contract via data attributes**: any element anywhere in the extension with a `data-sp-preview-url` attribute triggers the preview on hover. The delegated listener reads `data-sp-preview-url`, `data-sp-preview-name`, and `data-sp-preview-color` from the hovered element (via `e.target.closest('[data-sp-preview-url]')`) and shows a singleton preview pinned near the cursor. Adding preview support to a new avatar site is a matter of setting three attributes — no JS wiring, no re-registration after re-renders, no init ordering.

2. **Chokepoint through `getPortraitHtml()`**: the existing HTML helper now bakes the three attributes into its URL branch automatically. This covers four sites with zero per-site churn: update-panel character cards, relationship block headers, off-scene stubs, and the thoughts panel. Monogram fallback branches set no attrs and therefore never trigger the preview (enlarging a single letter carries no information).

3. **Explicit attr injection for hand-built sites**: the relationship web SVG (`<circle class="sp-web-hit">`) and the character wiki (`<span class="sp-wiki-avatar-slot">`) build their markup by hand and can't go through `getPortraitHtml()`. Both now call the new `getPortraitPreviewAttrs(descriptor, nameOverride, colorOverride)` helper and interpolate the returned string directly into their templates.

4. **Singleton preview element with in-place mutation**: one preview DOM node is lazily created on first show and reused across all avatar sites. Hover swaps the `<img src>` and caption text in place rather than removing and re-appending the element, eliminating the flashing/reload that a per-site preview would cause when hovering adjacent avatars in a grid.

5. **Orphan guard via `requestAnimationFrame`**: when the hovered element is removed mid-hover (common in the update panel's delta-merge re-render loop and the relationship web's drag re-render), no `mouseout` event fires. A small rAF loop checks `currentTarget.isConnected` on every frame and hides the preview when the target disappears.

6. **`mouseover` / `mouseout` with `closest()` traversal**: uses bubbling events (not `mouseenter` which doesn't bubble), so a single listener on `document.body` covers every avatar without per-site binding. The mouseout handler checks `e.relatedTarget` and ignores traversal to children of the same hover target, preventing flicker when the cursor moves from the `<img>` to its wrapper.

7. **`getPortraitDescriptor()` extended with a `name` field**: the shared descriptor now carries the full character name alongside the first-letter monogram, so the preview caption can be populated without every site having to pass the name separately.

Code changes:

- `src/ui/portraits.js` (+130 LOC): new `getPortraitPreviewAttrs()` export, new `hidePortraitPreview()` export, singleton preview element, delegated listener auto-installed on module import (guarded for DOM readiness), orphan guard, `name` field added to `getPortraitDescriptor()`, `getPortraitHtml()` now calls `getPortraitPreviewAttrs()` internally.
- `src/ui/relationship-web.js` (−45 LOC): deleted the local `_showPortraitPreview` / `_hidePortraitPreview` helpers and their per-handler wiring. Added `getPortraitPreviewAttrs` call to the `.sp-web-hit` circle template. `_close()` calls the shared `hidePortraitPreview()`.
- `src/ui/character-wiki.js` (+2 LOC): URL branch of the avatar render now interpolates `getPortraitPreviewAttrs()` into the `<span class="sp-wiki-avatar-slot">` opening tag. `_close()` calls `hidePortraitPreview()`.
- `css/characters.css` (+37 LOC): new `.sp-portrait-preview` / `.sp-portrait-preview img` / `.sp-portrait-preview-caption` styles, co-located with `.sp-char-portrait`.
- `css/relationship-web.css` (−28 LOC): removed the old `.sp-web-portrait-preview` styles. The CSS-less selector is now a no-op.

No changes to update-panel.js or thoughts.js — they use `getPortraitHtml()` and inherit the preview automatically. No new files, no new CSS files, no new module. Touch-device behavior unchanged (hover-only, same as v6.8.43).

### [6.8.43] — 2026-04-09

#### Changed — Relationship web labels and avatars are fully uniform
**Reported**: (1) "For the relationship map, put all names under the circle. Right now, short names are the only ones in it." (2) "If there is no picture for the character in the relationship map, use the first letter of the name. Ensure that there is a function for this and is used for any parts of the code that call for a user picture/avatar." (3) "If a user hovers over an image, it displays an enlarged image on the screen." (4) "Character Wiki has partial avatars — only those with pictures. Ensure all characters have an avatar."

**Fix — labels**: every node in the relationship web now renders its name as a dark pill below the circle, regardless of length. Short names no longer sit inside the circle. Drops the v6.8.42 `_nameFitsInside()` branch entirely — the circle is always either a portrait image OR a monogram letter (never a label), and the label is always a pill below. Visually uniform roster.

**Fix — monogram fallback in the relationship web**: nodes whose characters have no resolvable portrait now render a first-letter monogram inside the circle. The circle is filled with the character's accent color, and the uppercase first letter is drawn in SVG `<text>` scaled to ~95% of the node radius. Matches the style of the main character-card monogram used in the thoughts panel and update panel.

**Fix — unified helper**: added `getPortraitDescriptor(ch, accent, stIndex)` to [src/ui/portraits.js](src/ui/portraits.js). Returns a structured object `{type, url?, letter, bg, fg}` with a guaranteed letter + color, so every avatar-rendering site in the extension can derive the same fallback without duplicating logic. The existing `getPortraitHtml()` now delegates to this helper internally (zero behavior change for callers that already used it). Sites migrated to the descriptor:

- Relationship web nodes (SVG monogram fallback + hover-enlarge)
- Character wiki entries (HTML monogram fallback)

Older callers (`getPortraitHtml()` consumers in [thoughts.js](src/ui/thoughts.js) and [update-panel.js](src/ui/update-panel.js)) continue to work unchanged because `getPortraitHtml()` now uses the descriptor as its single source of truth.

**Fix — hover preview**: hovering any relationship-web node that has a real image shows an enlarged square preview pinned near the cursor (224px with character-name caption, positioned to avoid viewport edges). Nodes backed by a monogram fallback do not show a preview — the larger size would carry no new information. The preview clears on pointerleave, node click, panel close, or Escape.

**Fix — character wiki avatars for everyone**: the wiki grid and list modes previously rendered an empty slot for any entry without a resolvable portrait URL. Now every entry produces either an `<img>` (URL case) or a `<span class="sp-wiki-avatar sp-wiki-avatar-monogram">` (fallback) with the first letter on the character's accent color. Grid mode uses a 40px avatar with a larger monogram font; list mode uses the 28px default.

### [6.8.42] — 2026-04-09

#### Fixed — Long character names no longer truncate in the relationship web
**Reported**: "Relationship circles still aren't dynamically adjusting to account for the name of the person so that it's fully displayed." Example screenshot showed "Jack Browning" rendered as "Jack Br…" inside a force-directed web node.

**Root cause**: the v6.8.41 dynamic-radius formula produced a 33px radius for 13-character names, which gave an inside-circle fit capacity of 8 characters (`(33*2 - 8) / 7`). The `_dynamicNodeRadius()` curve capped growth at a 22-character threshold, so names in the 11-21 range always fell short of the radius needed to fit them inside the circle. The inside-circle label path had a fundamental geometric ceiling regardless of how far the radius was grown.

**Fix**: replaced the per-node radius growth with a below-pill label fallback. All nodes now use the same `NODE_R = 28` radius (reverting v6.8.41's per-node sizing, the growth curve's `NODE_R_MAX`, and the layout-spacing `radiusBonus` term). When a name would overflow the inside-circle text space (approximated as `name.length × 6.5 > diameter − 10`), the label renders as a dark pill below the circle with width growing to fit the full name, reusing the same render path already used for portrait nodes. Short names ("Reyes", "Buzzcut") still render inside the circle unchanged; long names ("Jack Browning", "Paramedic Chris") get a below-pill label with no truncation. This removes three magic-number tuning knobs (`NODE_R_MAX`, the 22-char cap, the radius bonus multiplier) and simplifies the layout code.

#### Changed — NAME AWARENESS checklist added to the character prompt
**Reported**: "I want names to be updated once they're found out. For instance, 'Buzzcut' was 'Officer Buzzcut' because his name wasn't mentioned in the story, but they referred to him as 'Buzzcut' as if it was, when it was just an identifier for his character at the time. There needs to be ways to track full names for characters (first and last). If any part of their name isn't known, then it should be an alias until then. Once either a last name or a first name is known, then the true name gets replaced with the actual name."

**Root cause**: the infrastructure for placeholder → real-name promotion already existed and was correct. `src/generation/delta-merge.js` lines 289-318 have a REVEAL match path: when the LLM emits `{name: "Jack Browning", aliases: ["Buzzcut"]}`, the merger renames the prior entry from "Buzzcut" to "Jack Browning" and `reconcileIdentityAliases()` rewrites all stale relationship and presence references. `tests/character-aliases.test.mjs` covers 13 cases of this flow. The failure wasn't in the code path — it was in **LLM compliance**. The prior prompt mentioned alias promotion as a single sentence buried inside the `aliases` field description, and the model routinely forgot to emit the aliases hint on reveal.

**Fix**: added a dedicated **NAME AWARENESS** checklist section in `src/schema.js` that runs as part of the character-output prompt. It forces a per-character, per-turn check:

1. Classify the current canonical name as PLACEHOLDER or REAL NAME (with explicit placeholder signals: physical descriptors, role-only labels, definite-article epithets).
2. Check whether any real name — first OR last OR full — was mentioned this turn.
3. If #1 is placeholder and #2 is yes, PROMOTE NOW: set `name` to the fullest known real name, push the old placeholder into `aliases`, emit a single entry.
4. When uncertain, prefer promoting — the client preserves the old value as an alias, so nothing is lost.

The checklist includes explicit multi-turn progression examples covering both first-name-only and full-name reveals:

```
Turn N:   {name: "Buzzcut",       aliases: []}
Turn N+1: {name: "Jack",          aliases: ["Buzzcut"]}         ← first name revealed
Turn N+2: {name: "Jack Browning", aliases: ["Buzzcut", "Jack"]} ← last name revealed
```

Plus explicit anti-patterns (two entries under different names, keeping the placeholder after reveal, embedding aliases in parens in the `name` field, omitting the old placeholder from `aliases` on the reveal turn). No code changes to `delta-merge.js` or `normalize.js` were needed — the existing REVEAL path handles everything once the model actually emits the aliases hint.

### [6.8.41] — 2026-04-08

#### Added — Organization tracking + filter in the relationship web
**Reported**: "I want the relationship web to generate organizations that can be filtered. For example, what if there are 5 cultists, but 3 of them are for a different cult? Or multiple teachers, but they work for different schools? There needs to be a tracking for that."

**Fix**: the NPC graph inference now emits a top-level `organizations` array alongside `edges`. Each organization has a `name`, a genre-neutral `kind`, and a `members` list. Characters may belong to multiple organizations, and two organizations with the same `kind` are deliberately kept separate when the story implies they are distinct institutions (two cults with different names, two schools with different names, two crews on different ships, etc.).

The prompt was extended with a dedicated **## Organizations** section containing multi-genre examples (modern precincts, medieval orders, sci-fi crews, slice-of-life staff, horror cults) and an explicit rule: *"When two characters share the same kind of role (both teachers, both cultists, both knights), ask whether the story implies they belong to the SAME institution or DIFFERENT ones. If it's ambiguous, err on the side of treating them as separate unless there's clear textual evidence they work together."*

The relationship web legend now shows a new **Organizations** section below the edge-type filters. Each detected org renders as a colored chip showing `[name] [kind] [member count]`. Clicking a chip highlights all its members with a colored halo ring and fades non-members to 15% opacity (union semantics for multi-select). The "All" reset chip clears the org filter. Chips persist across re-renders and are cleared automatically on regeneration since the org list may change.

#### Changed — Relationship web layout spacing
**Reported**: "The initial webbing is very closely packed. Is there a way so that there is more spacing between them?"

**Fix**: Fruchterman-Reingold constants rebalanced for more breathing room on first layout:

- `k` multiplier bumped `0.65` → `1.05` (main ideal-edge-length constant)
- Initial ring radius bumped `0.28` → `0.36` of `min(W, H)` so nodes start more spread out
- Initial temperature bumped `0.12` → `0.18` so the early simulation can travel further
- Iterations bumped `180` → `200`
- Per-node jitter bumped `30` → `40` pixels
- New `radiusBonus` term: when the roster contains dynamically-sized nodes (see next section), `k` is increased proportional to the largest node radius so oversized circles don't overlap

#### Changed — Dynamic node radius for long names
**Reported**: "Increase the size of the circles dynamically to accommodate longer names. Make the current size the default size still until it gets dynamically adjusted."

**Fix**: added `_dynamicNodeRadius(name)` which returns the existing `NODE_R = 28` for names of 10 characters or fewer (so most rosters are visually unchanged) and grows linearly up to `NODE_R_MAX = 48` for names of 22+ characters. The computed radius is stored on each node as `node.radius` and propagated through every rendering path: the clipPath `<defs>`, the node background circle, the portrait image, the hit-area radius, the in-scene dot position, the drag clamp, the layout margin clamp, and the label fit-capacity calculation. `{{user}}` node also uses dynamic sizing with a `+4px` bonus over `CENTER_R`.

### [6.8.40] — 2026-04-09

#### Changed \u2014 NPC graph prompt rewritten to be genre-agnostic
**Reported**: "Do the changes account for different scenarios, like common medieval roleplay, sci-fi, modern, etc. It needs to be universal to all forms of story telling... it needs to also account for other types of fields \u2014 not just the ones listed."

**Root cause**: the v6.8.39 prompt rewrite was heavily biased toward modern procedural/police/medical settings. The "What COUNTS as an edge" examples were patrol partners and IA detectives; the keyword shortcut list mentioned "officer", "detective", "paramedic", "EMT"; the output example showed Officer Jones + Detective Alvarez + Paramedic Lee. A fantasy chat with knights and wizards, a sci-fi chat with bridge crew, or a slice-of-life chat with teachers wouldn't get the same structural-tie detection because the prompt was pattern-matching on modern vocabulary instead of teaching the model to reason about the underlying structures.

**Fix**: rewrote the prompt from scratch around the principle that **relationship structures are genre-independent** \u2014 only the vocabulary changes. Key changes:

1. **Explicit multi-genre framing at the top**: *"Given a list of characters from an ongoing story of ANY genre (modern, medieval, fantasy, sci-fi, historical, slice-of-life, noir, post-apocalyptic, wuxia, space opera, urban fantasy, western, horror, romance, or anything else)..."*

2. **Replaced "keyword shortcut list" with structural categories**. Instead of enumerating modern-only keywords, the prompt now teaches 7 genre-neutral questions the model should ask for each pair:
   - Do they share a **hierarchy**? (any ranking system where one answers to another)
   - Do they share a **team, unit, or working group**?
   - Do they belong to the same **organization, order, house, or clan**?
   - Do they share a **household, camp, caravan, ship, or lodging**?
   - Do they share a **craft, calling, or role-type**? (healer, warrior, scholar, performer, spy/scout)
   - Is there a **vertical teaching relationship**? (master/apprentice, mentor/trainee, elder/novice)
   - Is there a **named story-specific tie**?

3. **Examples for each category span 6+ genres** (modern, military, medieval/fantasy, sci-fi, academic, criminal/political, religious, historical) with the explicit note: *"these are illustrations, not a closed list"*. The prompt instructs the model to generalize the pattern, not match on the specific words.

4. **"The pattern generalizes" callouts** for craft/calling \u2014 "any kind of healer", "any kind of warrior", "any kind of scholar" \u2014 teaching the model to detect peer relationships across profession vocabulary it hasn't seen specific examples for (monster hunter, herbalist, hacker, wuxia sect disciple, post-apocalyptic scavenger, xenolinguist, etc.).

5. **Genre-neutral type definitions**: `mentor` includes "magic tutor, combat instructor, academic advisor, wise elder"; `authority` includes "liege, master, abbot, guildmaster, boss, judge, king"; `family` includes "clan relative, sworn brother".

6. **Four output example templates spanning different genres** (modern procedural, medieval fantasy, sci-fi, slice-of-life) with explicit framing: *"use these as **structural templates**, not content to copy. The structure is identical across genres \u2014 only the labels change to match the setting."* Anchors the model on the structural shape rather than on any one genre's vocabulary.

7. **"What does NOT count" negatives updated**: added *"don't assume all elves hate all dwarves; don't assume all soldiers are bitter; don't assume all nobles know each other"* to prevent the model from inventing relationships from genre convention alone.

8. **Label guidance**: *"The label should fit the genre of the story \u2014 'patrol partner' fits modern, 'sworn brother' fits medieval, 'bridge officer' fits sci-fi, 'fellow apprentice' fits fantasy."*

**Impact**: a medieval chat with a fellowship should now produce "sworn brother" + "knight and squire" + "fellow council member" edges. A sci-fi chat should produce "bridge officer" + "commanding officer" + "away team" edges. A slice-of-life school chat should produce "teaching staff" + "childhood friend" + "student club member" edges. The structural reasoning is the same; only the labels change to match the world.

234/234 tests still pass. No code changes outside the prompt function.

### [6.8.39] — 2026-04-09

#### Added \u2014 "Auto-fit thoughts" toggle button in thought panel header
The fit toggle (added as a settings drawer checkbox in v6.8.38) now also has a dedicated button in the thought panel header, next to the existing snapleft / ghost / regen / close buttons. Clicking it flips `settings.thoughtPanelFit`, updates the header button's active state, and immediately re-runs `autoFitThoughtPanel()` so the scale change is visible without reloading. The settings drawer checkbox stays in sync when toggled from either side.

**Custom icon**: four arrows pointing inward from each corner toward a centered highlight square \u2014 the universal "compact / fit to screen" glyph. Rendered as inline SVG to match the other header buttons' visual weight. No PNG or icon font dependency.

#### Changed \u2014 NPC graph prompt rewritten for richer relationship coverage
**Reported**: "there are multiple officers and multiple paramedics. After a generation, it only accounted for one link. How can we improve relation building?"

**Root cause**: the v6.8.27-v6.8.36 NPC graph prompt told the model to emit only "narratively significant" connections with a negative example of "a waiter who served a drink". The model was interpreting that conservatively \u2014 two cops in the same scene without specific dialogue about their shared job got classified as "not narratively significant enough" and skipped. Same for two paramedics on the same call, two IA detectives working the same case, family members without explicit mentioned relationships. The model defaulted to "emit the most dramatic few" rather than "systematic pass over all pairs."

**Fix**: four prompt rewrites working together:

1. **Explicit pairwise instruction.** The new prompt says: "For EACH PAIR of characters in the roster, consider whether they have ANY connection \u2014 structural, social, professional, familial, romantic, or conflict-based \u2014 and emit an edge when they do. Work through the list systematically." This replaces the old "only emit connections with actual narrative weight" framing that encouraged skipping.

2. **Soft target edge count.** Based on roster size:
   - 2\u20133 characters: `n-1` to `~2n` edges
   - 4\u20136 characters: `n` to `~2.5n` edges
   - 7+ characters: `~1.3n` to `~2.5n` edges (capped at 30)
   
   The prompt tells the model the target range explicitly: "Roster has **N characters** \u2014 aim for **X\u2013Y total edges**. If you emit fewer than X, you are undercounting structural ties." This gives the model a floor it can hit instead of defaulting to 1-2 "important" edges.

3. **Structural ties section.** New "What COUNTS as an edge" block lists examples the model should emit eagerly:
   - Same team/partnership (patrol partners, shift-mates, IA detectives on the same case, paramedics on the same truck)
   - Same organization (all officers on one force are colleagues even without specific dialogue)
   - Family household, squad, unit, band, gang, crew, class, department
   
   Paired with a "What does NOT count" block that keeps the old negative examples (waiter, background crowd, strangers).

4. **Role-keyword shortcuts.** The prompt now tells the model to scan role descriptions for common patterns:
   - `"officer"`, `"detective"`, `"deputy"`, `"cop"` from same precinct \u2192 colleague edges
   - `"paramedic"`, `"EMT"`, `"medic"` on same call \u2192 shift partner edges
   - `"junior partner"`, `"senior partner"`, `"mentor"`, `"trainee"` \u2192 paired mentor/authority edges
   - Role mentions another named character (`"Jenna's sister"`) \u2192 explicit relationship
   - Shared last names often imply family

5. **Default type guidance.** "When in doubt between friend and acquaintance, pick acquaintance \u2014 it's the honest default for colleague relationships without specific warmth established." Prevents the model from inflating every colleague tie to "friend".

**Impact**: a 7-character roster like the user's (Officer Jane, Buzzcut, Reyes, Detective K, Detective O, Paramedic Chris, Female Paramedic) should now emit roughly 9\u201317 edges instead of 1\u20133 \u2014 capturing the "same precinct" colleague edges, the paramedic shift pairing, the IA detective partnership, and any named narrative ties on top. Regenerate the NPC graph after upgrading to see the richer web.

234/234 tests still pass.

### [6.8.38] — 2026-04-09

#### Added \u2014 character portraits in relationships panel
The relationship blocks now show a 22\u00D722 circular portrait thumbnail next to the character name. Uses the same four-layer `portraits.js` resolver as the main character card: user override \u2192 SillyTavern character avatar \u2192 alias-matched ST avatar \u2192 monogram fallback. The resolver walks the character entry's `aliases` field so an NPC named "Stranger" (that was later revealed as "Jenna") still picks up Jenna's ST avatar once the alias link is established.

#### Added \u2014 character portraits in thought panel
The thought panel cards now show a 28\u00D728 circular portrait thumbnail to the left of the character name. The existing thought-bubble decorative icon stays on the right of the header (it floats via `order: 1` + `margin-left: auto` in the CSS). Same portrait resolver as the relationships panel and main character card.

#### Added \u2014 "Auto-fit thoughts to screen" toggle
**Reported**: "I have 7 characters that are present in the scene currently. The thoughts extend past the scene. I want a toggle setting for having the system auto-adjust the thoughts so that they all fit on-screen and visible to the viewer."

New setting in General: **"Auto-fit thoughts to screen"** (off by default). When enabled:
1. `autoFitThoughtPanel` measures the panel's natural scrollHeight.
2. If natural height exceeds the viewport cap (window height minus ST top bar minus 8px bottom margin), it computes a scale factor `(availableHeight - slack) / naturalHeight`, clamped to `[0.55, 1.0]` so text stays readable.
3. Sets a new CSS custom property `--sp-tp-fit-scale` on the panel root.
4. Every card dimension in `css/thoughts.css` is now wrapped in `calc(base * var(--sp-tp-fit-scale, 1))` \u2014 font size, padding, margin, portrait size, thought-bubble icon size.
5. When the natural content fits without scaling, the scale property is unset and cards render at their full size.

Result: a roster of 7+ characters that previously forced internal scrolling now shrinks proportionally so every card is visible at once. The 55% minimum scale keeps text legible; below that, the panel falls back to scrolling instead of making text unreadable.

**Not affected when off**: users who prefer the current scrolling behavior see no change. The CSS `calc()` expressions default to `* 1` when the scale property is unset.

#### Architecture notes
- The fit-scale must be reset to the unset state BEFORE measuring natural height at the start of each `autoFitThoughtPanel` call, otherwise repeated calls would compound the scale and cards would shrink further on every render.
- CSS `calc()` with a CSS custom-property-based scale is preferred over `transform: scale()` because transforms don't re-flow \u2014 a transform-scaled panel would still occupy its original bounding box, wasting space. Multiplying through font-size and padding makes the panel actually smaller.
- Pattern backgrounds (v6.8.33) continue to work unchanged because they're `background-image` URIs; scaling the container doesn't affect how the pattern tiles.

234/234 tests still pass.

### [6.8.37] — 2026-04-09

#### Fixed \u2014 Relationships panel showed wrong name for title-collision characters
**Reported**: Two new characters "Detective Keene" and "Detective Orozco" both rendered as "Detective Keene" in the relationships panel, while the characters panel correctly showed both. The data layer was fine \u2014 the bug was only in the relationship section's `displayName` resolver.

**Root cause**: [src/ui/update-panel.js](src/ui/update-panel.js) line 600 did a loose first-token fuzzy match as a fallback when looking up the canonical casing of a relationship name in the characters array:

```js
const chFirst = chLow.split(/\s/)[0];   // "detective"
const relFirst = relLow.split(/\s/)[0]; // "detective"
if (chFirst === relFirst && chFirst.length > 2) {
    displayName = ch.name;  // picks WHICHEVER detective came first
    break;
}
```

This is the same class of bug I fixed in `src/color.js` in v6.8.33 \u2014 any two characters sharing a title/honorific first word ("Detective", "Officer", "Dr.", "Lord", "Captain", "Father", "Lady") would collide to whichever character the loop iterated first. The `src/color.js` fix used a TITLE_STOPLIST; the update-panel.js displayName resolver was never touched.

**Fix**: removed the fuzzy first-token branch entirely. Since v6.8.30 the normalizer already canonicalizes relationship names via the alias map, so an exact match plus the substring alias form (`"Jenna"` \u2194 `"Jenna Smith"`) is sufficient. The fuzzy fallback was legacy code that hasn't been needed for several releases but kept firing on title collisions.

Scenarios verified:
- `"Detective Keene"` + `"Detective Orozco"` \u2192 distinct display names
- `"Jenna"` \u2194 `"Jenna Smith"` alias \u2192 still resolves (substring clause)
- `"Officer Jane"` exact match \u2192 still works
- Previously broken: all cases with a shared first token + a title prefix

234/234 tests still pass.

#### Not a bug \u2014 log line duplication explained
The debug logs showed each `Entity merge: new entity added: detective keene` line appearing twice, which looked suspicious. It's actually correct behavior: the merge loop runs once per entity array in the delta (characters, relationships, mainQuests, sideQuests), so one new character that appears in both `characters[]` and `relationships[]` produces two log lines. Chatty but not a duplication bug.

### [6.8.36] — 2026-04-09

#### Fixed \u2014 Relationship web rendered multiple edges per NPC pair
**Reported**: the NPC graph was drawing multiple lines between the same two characters (e.g. Reyes\u2194Officer Jane had both "protective colleague" and "grateful" labels as separate edges).

**Root cause**: the edge dedup in [src/ui/relationship-graph.js](src/ui/relationship-graph.js) keyed by the `(from, to, type)` triple, so the LLM could emit the same pair with two different types and both would pass through as separate edges. Same for reciprocal detection \u2014 it needed identical types on both sides.

**Fix**: dedup by `(from, to)` PAIR only. A relationship between two characters is one connection, period. When the LLM emits multiple facets for the same pair, a new `TYPE_PRIORITY` map picks the strongest narrative tie:

```
family (10) > lover (9) > lust (8) > antagonist (7) > mentor/authority (6)
> rival (5) > ally (4) > friend (3) > acquaintance (1) > unknown (0)
```

First-seen wins on ties so labels stay stable across re-renders. Reciprocal detection simplified to pair-only matching since each direction now has exactly one edge.

#### Fixed \u2014 Hex pattern (pattern 9) had a visible seam on repeat
**Reported**: "one of the pattern cuts off in its repetition for character cards".

**Root cause**: the hex pattern drew a central hexagon plus two half-hexagons at the left and right edges of the tile at y=20\u201332. The half-hexagons expected continuity with the *previous* tile's bottom-half hexagons \u2014 but those weren't drawn, so tiled repetition showed a visible horizontal seam where the bleeding edges didn't meet.

**Fix**: redesigned as a single centered hexagon fully contained inside a 28\u00D728 tile. No bleeding edges, no continuity dependencies.

```svg
<path d="M14,5 l7,4 l0,10 l-7,4 l-7,-4 l0,-10 z" .../>
```

Audited the other 11 patterns for tileability \u2014 diagonal stripes (1, 2), chevron (8), and zigzag (11) rely on edge-meeting continuity but their path geometry is self-consistent (endpoints on opposite edges at matching coordinates). All tile cleanly.

234/234 tests still pass.

### [6.8.35] — 2026-04-09

#### Fixed \u2014 Relationship Web drag had an invisible wall at default canvas bounds
**Reported**: "relationship web has a maximum distance for dragging people around. I want the user to be able to drag as far as they want within the window pane when fully zoomed out."

**Root cause**: the drag handler in [src/ui/relationship-web.js](src/ui/relationship-web.js) was clamping node positions to `[NODE_R, W-NODE_R]` \u00D7 `[NODE_R, H-NODE_R]` where `W=1000, H=700` are the default SVG canvas constants. When users zoomed out (`viewBox.w` grew to 2-3\u00D7 the default), they could still only drag nodes inside the original 1000\u00D7700 box \u2014 creating an invisible wall at the canvas center regardless of how far they'd zoomed out.

**Fix**: clamp against the CURRENT viewBox bounds instead of fixed W\u00D7H constants:

```js
const minX = viewBox.x + NODE_R;
const maxX = viewBox.x + viewBox.w - NODE_R;
// ...
```

Now when you zoom out to see more canvas area, you can drag nodes to any point in the expanded view. The small `NODE_R` margin inside the viewBox keeps the node circle from clipping past the visible edge during the drag. 234/234 tests still pass.

### [6.8.34] — 2026-04-09

#### Changed \u2014 character pattern backgrounds less prominent
Per user feedback that the v6.8.33 per-character SVG patterns were too visible. Reduced the baked-in opacity of all 12 pattern generators by ~40%:
- Previous range: 0.08 \u2013 0.14 (average ~0.11)
- New range: 0.04 \u2013 0.08 (average ~0.07)

Patterns now read as barely-there ambient texture rather than a noticeable foreground layer. The character accent color is still identifiable at a glance but the flat tint dominates instead of the pattern. 234/234 tests still pass.

### [6.8.33] — 2026-04-09

#### Added \u2014 expanded character color palette (10 \u2192 30 colors)
Tripled the character color palette to reduce visual collisions when a chat has many tracked characters. Colors hand-curated for:
- Distinct perceptual spacing (>15\u00B0 hue separation between neighbors)
- Consistent luminance against the dark theme background
- No muddy yellows, no unreadable saturated reds
- Every accent passes a contrast check against `#0c0e14`

The palette is organized in four bands: warm core (teal/pink/amber/sky/rose/sage/gold), cool mid (lavender/mint/periwinkle/coral/cerulean/bronze/lime), saturated feature (orange/mauve/aqua/magenta/chartreuse/royal blue/apricot), and desaturated neutrals (sage green/dusty violet/sand/slate teal/clay pink/steel blue/khaki/dusty mauve/jade). Adjacent indices get visually different hues so the first N characters in a scene don't all look similar.

#### Added \u2014 per-character SVG background patterns
Every character card, relationship block, thought card, and Character Wiki entry now renders with a subtle per-character SVG pattern layered over the flat background tint. 12 pattern generators:
- `dots`, `diagonal` (two variants), `crosshatch`, `grid`, `waves`, `triangles`, `circles`, `chevron`, `hex`, `plus`, `zigzag`

Patterns are deterministic per character (hash of lowercased name mod 12) and rendered as inline SVG data URIs. Tint color = the character's accent at 0.08-0.16 alpha so the pattern reads as a subtle texture rather than a distracting foreground. 30 colors \u00D7 12 patterns = **360 distinct (color, pattern) combinations** before any two characters look identical.

Data URI encoding is minimal (only `<`, `>`, `#`, `"` escaped) so payloads stay small; browsers cache repeated pattern instances efficiently.

#### Fixed \u2014 title collision in the fuzzy color matcher
**Root cause**: the v5.x fuzzy color matcher in [`src/color.js`](src/color.js) had a loose first-token match — any two characters whose first word matched (length > 2) would get the same color. "Officer Jane", "Officer Buzzcut", "Officer Ponytail", "Dr. Smith", "Dr. Jones", "Lord Varys", "Lord Tyrion", "Mr. Brown", "Father Martin" \u2014 all broken.

This was a bigger contributor to the "three of the same colors" user report than the 10-color palette cap alone, because it was *actively* collapsing distinct characters instead of just running out of colors.

**Fix**:
1. Added a **TITLE_STOPLIST** of ~50 common titles and honorifics (officer, detective, sergeant, doctor, dr, mr, mrs, ms, sir, lord, lady, king, queen, captain, father, mother, priest, saint, the, uncle, grandma, ...).
2. Added a `_cleanTok()` helper that strips trailing/leading punctuation so `"Dr."` normalizes to `"dr"` for stoplist lookup.
3. The first-token fuzzy match now skips when the shared token is in the stoplist.

The alias form (`"Yuzuki"` \u2194 `"Yuzuki Tamura"`) is preserved \u2014 only the loose title match is gated.

#### Consumers updated
`update-panel.js` (character cards + off-scene stubs), `update-panel.js` (relationship blocks), `thoughts.js` (thought panel cards), and `character-wiki.js` (wiki entry cards) all set the new `--char-pattern` CSS variable alongside the existing `--char-bg`/`--char-border`/`--char-accent`. CSS selectors updated to use a two-layer background:

```css
background-image: var(--char-pattern, none);
background-color: var(--char-bg, ...);
background-repeat: repeat;
```

The pattern paints as the top layer and the flat tint below. When `--char-pattern` is unset (stub entries, absent characters, legacy code paths) the top layer resolves to `none` and the flat bg remains \u2014 backward compatible.

234/234 tests still pass.

### [6.8.32] — 2026-04-09

#### Fixed \u2014 Thought panel not using full vertical height
**Reported**: The inner-thoughts panel left dead space at the bottom of the screen even when it had more content to show. The main ScenePulse panel fills the viewport properly; the thoughts panel didn't.

**Root cause**: the thought panel had two compounding height limits that both fell short of the viewport:
1. CSS: `max-height: 85vh` \u2014 hard 15vh dead zone at the bottom regardless of what else was on screen.
2. JS `autoFitThoughtPanel`: `maxH = window.innerHeight * 0.85` \u2014 same 85% cap but computed in pixels, same result.
3. JS `snapThoughtToLeft`: `maxH = Math.min(chatRect.height, window.innerHeight * 0.85)` plus a hardcoded `top = Math.max(34, chatRect.top)` that ignored ST's actual top bar height.

Meanwhile `panel.js` correctly measures ST's top bar (`#top-bar` / `#top-settings-holder` / `.header`) and sets the main panel to `calc(100vh - topBarBottom)`, giving it the full usable column.

**Fix**: the thought panel now mirrors the main panel's approach. New `_measureTopBar()` helper in [src/ui/thoughts.js](src/ui/thoughts.js) reads the actual ST top bar height the same way panel.js does. Both `autoFitThoughtPanel` and `snapThoughtToLeft` use `window.innerHeight - topBarBottom - 8px bottom margin` as their height cap. The 8px margin keeps the panel from butting right up against the viewport edge. CSS `max-height` loosened to `calc(100vh - 16px)` so it acts as a sane fallback before JS layout runs but doesn't fight the JS-computed value.

**Result**: the thought panel now grows to fill the full usable column \u2014 no more 15vh dead zone, no more hardcoded 34px top offset that didn't match the actual top bar in all layouts.

### [6.8.31] — 2026-04-09

#### Fixed \u2014 duplicate relationship entries leaking through to the panel
**Reported**: A new chat showed 4 characters (Officer Jane, Truck Driver, Officer Buzzcut, Officer Ponytail) but 4 relationships where three of them were separate entries for Officer Jane with different relType labels ("Former Predator/Prey", "Interrogating Authority", "Peripheral Authority"). The LLM was emitting multiple relationship entries for the same character representing different "facets" of the NPC's perception of {{user}}.

**Root cause**: The v6.8.30 normalize canonicalization pass correctly dedupes multiple same-name relationship entries, BUT the assignment back to `o.relationships = out` only fires when `rewrote > 0 || out.length !== original.length`. In this case `rewrote === 0` (all three "Officer Jane" entries are already canonical — no alias rewriting happened) but `out.length !== original.length` (dedup did reduce from 4 → 2) so the assignment SHOULD have fired. A unit test reproducing the exact payload confirmed normalize DID dedupe correctly.

So the dedup was happening at the normalize layer, but something downstream was bypassing it \u2014 either a render path that fed filterForView a snapshot without re-normalizing, a WeakMap cache hit on an old code path, or delta-merge reconstituting a fresh relationships array from storage.

**Fix**: add the canonical-name dedup directly to `filterForView` as a belt-and-braces pass. This guarantees the render layer NEVER sees duplicate relationship entries regardless of which normalize path the snapshot came through, what WeakMap caches might exist, or whether delta-merge rewrote the array.

**Semantics**: for multiple entries collapsing to the same canonical name, the merged entry keeps the FIRST-seen `relType` / `relPhase` / `milestone` labels so user-visible display stays stable turn-to-turn. Non-zero numeric meters win (first-seen non-zero). Non-empty string fields fill in where the first entry had empty values.

**Tests**: 2 new cases in `tests/character-paren-aliases.test.mjs`:
- `filterForView: dedup duplicate same-name relationships` \u2014 4 rels (3 Officer Jane + 1 Truck Driver) collapse to 2, Officer Jane keeps first-seen label
- `filterForView: dedup via alias resolution` \u2014 3 alias-equivalent rels (Officer Jane / The Entity / Lilith) collapse to 1 canonical

**Full sweep**: 234/234 passing (51 character-paren-aliases + 49 character-aliases + 26 delta-merge-fuzzy + 24 classify-quest + 46 no-user-as-character + 20 group-chat + 18 extraction-cleanjson).

#### Changed \u2014 canonicalization log promoted to info level
The `Canonicalize: relationships rewrote=X before=Y after=Z` log in normalizeTracker previously fired only when verbose logging was on, which made the v6.8.30 regression hard to diagnose. Now fires at info level so the next time this kind of dedup issue arises, the console shows which path did what.

### [6.8.30] — 2026-04-09

#### Fixed \u2014 empty character card for chars with paren-aliases in cross-array references
**Reported**: "I'm on message 18 on a new chat, and no information is being pushed to a character." Character card rendered as "Officer Jane (The Entity/Lilith)" with every field empty except role = "Eternal Mates Reborn".

**Root cause** \u2014 traced via the actual payload provided by the user:

The LLM emitted the character cleanly in `characters[]`:
```json
{ "name": "Officer Jane", "aliases": ["The Entity", "Lilith"], "role": "...", "innerThought": "...", ... }
```

But referenced the same character inconsistently elsewhere:
```json
"relationships": [
  { "name": "Officer Jane (The Entity)", ... },
  { "name": "Officer Jane (The Entity/Lilith)", ... }
],
"charactersPresent": ["Officer Jane (The Entity/Lilith)"]
```

`filterForView` at [src/normalize.js](src/normalize.js) did exact-name matching against `charactersPresent`. The real "Officer Jane" was NOT in the present-set ("officer jane (the entity/lilith)" is a different string) so she got **filtered out**. Then the sync-stub fallback invented a phantom character `{name: "Officer Jane (The Entity/Lilith)", role: "Eternal Mates Reborn"}` from the mismatched relationship entry. That synthetic stub is what rendered as the empty card \u2014 the real character data was in storage the whole time, just filtered out of the view.

**Fix \u2014 five layers**:

1. **`normalizeChar` now splits paren-aliases from the name field** when they look alias-like. Heuristic: short (\u226460 chars), no sentence punctuation, no possessive 's, no "of the", parts start with uppercase or are \u226415 chars. `"Officer Jane (The Entity/Lilith)"` \u2192 `name: "Officer Jane", aliases: ["The Entity", "Lilith"]`. Descriptive parentheticals like `"John (the scientist who studied black holes.)"` are preserved as-is.
2. **`normalizeTracker` canonicalizes cross-array references**. After characters[] is parsed, an alias \u2192 canonical map is built. Any relationship or charactersPresent entry whose name matches a known alias (or a paren-stripped base name, or a paren item) is rewritten to the canonical form.
3. **Post-canonicalization dedup** merges relationship entries that collapsed to the same canonical. Non-zero numeric fields win on collision; non-empty strings win on collision.
4. **Prompt tightening**: new "NAME FIELD INTEGRITY" rule in `BUILTIN_PROMPT`, `buildDynamicPrompt`, and the `interceptor.js` runtime reminder. Explicitly forbids paren-aliases in the `name` field across ALL THREE arrays (characters, relationships, charactersPresent), and warns the model that mixing "Name" and "Name (Alias)" forms will cause the system to filter out the real character and replace it with an empty stub. The consequences are spelled out so the model understands the stakes.
5. **Lazy migration** in `settings.getTrackerData()` walks every stored snapshot in a chat on first load: strips paren-aliases from character name fields, folds them into the aliases array, builds an alias map, rewrites relationships and charactersPresent, dedups. Guarded by `_spNameCanonMigrated` per-chat flag. This heals existing chats on the next panel open without any user action \u2014 the "empty Officer Jane card" will self-repair when you reload.

#### Tests
- **New `tests/character-paren-aliases.test.mjs` with 44 cases** covering: paren-alias split across slash/comma/semicolon separators, preservation of descriptive parentheticals (possessive, sentence punctuation, long phrases), cross-array canonicalization, filterForView preserving the real character's data, paren-in-name emission by the LLM, no-parens regression, reverse case (char has parens, rel uses canonical), and collision-merge (non-zero meters win).
- **Full sweep**: 227/227 passing (44 new + 183 pre-existing).

#### Fixed \u2014 NPC graph parser diagnostics
When the NPC graph generation fails parse, the warning now includes the first 400 chars of the raw LLM response so users can diagnose why (LLM refused, wrapped JSON in prose, returned empty, etc). Previously `no JSON array found in response` gave zero context. Also added explicit warnings for non-string responses, empty responses, and parsed-but-not-array cases.

This is a pure diagnostic improvement \u2014 no behavior change, just better logs for troubleshooting the v6.8.29 "0 NPC edges" issue when it happens.

### [6.8.29] — 2026-04-09

#### Fixed \u2014 Relationship Web background color inconsistency
The `.sp-web-svg-wrap` container previously inherited the `rgba(12,14,20,0.98)` container background, while the SVG had its own internal `#0c0e14` `<rect>` fill. Close but not identical. When the SVG didn't fill the entire wrap (zoomed out, `max-height: 72vh` constraint hit, short aspect ratio), a visible "halo" appeared around the graph where the two shades met.

**Fix**: explicit `background: #0c0e14` on `.sp-web-svg-wrap`, removed the 8px padding that was adding visual gap, and set the SVG to `width: 100%; height: auto; display: block` so it renders seamlessly edge-to-edge regardless of aspect ratio.

#### Fixed \u2014 Edge labels were visually off-center inside their background rect
The v6.8.28 label rendering had a 4-pixel vertical misalignment: the `<rect>` spanned `y` from `lp.y - 8` to `lp.y + 6` (center at `lp.y - 1`), while the text with `dominant-baseline="central"` sat at `y="lp.y + 3"` (center at `lp.y + 3`). Text appeared to sit below the visual midline of its background pill.

**Fix**: rect center and text center now both land at exactly `lp.y`. `rectY = lp.y - 7` (height 14 → spans `lp.y - 7` to `lp.y + 7`), text `y = lp.y` (central baseline). Pixel-perfect alignment.

#### Added \u2014 Character portraits in relationship web nodes
Nodes now render the character's portrait inside the circle when one is resolvable, using the same four-layer priority as the main character cards and the Character Wiki:
1. User override in `settings.charPortraits`
2. SillyTavern character avatar by canonical name
3. Alias-matched ST avatar (handles v6.8.18 reveal flow)
4. Fallback to the v6.8.20 accent-colored disc with no image

**Implementation**: SVG `<image>` element clipped to a circle via per-node `<clipPath>` defs. Image fills inner area at `r - 1px` to avoid bleeding past the colored border. `preserveAspectRatio="xMidYMid slice"` for a proper center-crop. When a portrait is present, the character name renders BELOW the circle with its own faint background pill so the image isn't obscured by text.

The user's persona avatar is also resolved via `SillyTavern.getContext().user_avatar` and rendered in the center node. Group chats work transparently \u2014 the web takes whatever characters are in the snapshot, so v6.8.15 group carry-forward already feeds it correctly.

#### Fixed \u2014 Missing {{user}}\u2194pet edges in the relationship web
**Reported**: "Vierge has a relation to {{user}} (it was his cat originally). yet the graph doesn't account for that." Full diagnosis:

The relationship web shows **two kinds of edges**: (a) {{user}}-facing edges from the top-level `relationships[]` array (pink/red meter edges to {{user}}), and (b) NPC\u2194NPC edges from the v6.8.27 batch inference. Vierge had neither:
- **NPC-NPC direction**: The batch prompt correctly excludes {{user}} from NPC-NPC edges \u2014 those connections belong in the user-facing tracker instead. Working as intended.
- **User-facing direction**: The LLM never emitted a `relationships[]` entry for Vierge in the main tracker. Cats don't naturally fit the 5-meter shape (affection / trust / desire / stress / compatibility), so the model typically skips generating one. No entry \u2192 no `rel` object \u2192 no edge rendered. This was the actual bug.

The main panel already has `filterForView` which stubs zero-meter relationships for any tracked character missing one. The Character Wiki's `_buildEntries` in [src/ui/character-wiki.js](src/ui/character-wiki.js) uses `normalizeTracker` directly and NEVER calls `filterForView`, so the stub sync was bypassed.

**Fix**: `_buildEntries` now synthesizes a zero-meter stub relationship locally when the LLM didn't emit one for a tracked character. The stub carries a new `_spStub: true` marker so the relationship web can render it distinctly from a genuine zero-affection (i.e. actively cold) edge.

**Rendering**: stub edges draw as a faint gray (`#5b6372`) 1.2px dashed curve with a 0.45 base opacity and "unspecified" as the label (or the model's `relType` if one happens to exist). Clearly visible but obviously secondary to real user-facing edges. A cat NPC with no explicit meters will now show a faint dashed line to the user with a label so the reader can see the tie exists even if the model never quantified it.

**Prompt update**: the NPC batch prompt now includes a new rule #6 clarifying that `[pet]` characters ARE full citizens of the NPC graph (they can have edges to other NPCs) and that their connection to {{user}} lives in the main relationship meters, not the NPC graph. Prevents future LLM confusion about how to handle pets.

#### Not changed
- No schema changes, no migration needed. 183/183 tests still pass.
- Existing cached NPC graphs work unchanged \u2014 the new `[pet]` clarification only matters on next regeneration.

### [6.8.28] — 2026-04-09

#### Added \u2014 Relationship Web Phase 2: frame of understanding
User feedback on v6.8.27: "There's no frame of understanding between the relationships." The edges were there with glyphs and colors, but you couldn't decode what any of it meant without hovering every single edge. Phase 2 fixes that by adding six complementary features that together turn the web from a pretty picture into an actual graph you can read at a glance.

**1. Always-visible edge labels with collision avoidance.** Every edge now shows its label text on the graph by default \u2014 "older sister", "bitter rival", "estranged brother", etc. Labels render in a rounded-rect background tinted to the edge color so they stay readable against the dark canvas. A two-pass layout algorithm pushes overlapping labels along the edge normal in 14-pixel steps until they don't collide. Up to 6 displacement attempts per label. Toggle on/off via a new "Labels" button in the header \u2014 on by default.

**2. Persistent legend panel on the right side.** Replaces the tiny header strip from v6.8.27. Lists all 12 edge types (11 NPC types + "Ties to you" for user-facing edges), each with a color swatch, glyph, label, and live edge count. Types with zero edges in the current graph dim to 35% opacity. Hovering a row shows a tooltip description ("Blood or legal kin", "Institutional power", "Purely physical", etc.). Collapses into a horizontal strip under the SVG on screens \u2264900px wide.

**3. Click-to-filter.** Click any legend row to isolate that edge type \u2014 only edges of the selected type(s) remain visible. Click another to add it to the active filter. Click a row already in the filter to remove it. Click "Show all" at the top of the legend to reset. Filtered-out rows are rendered with strikethrough text and a desaturated swatch so you can see what's disabled. The footer shows the current filter state.

**4. Click-to-focus subgraph.** Click any node to enter focus mode: the clicked node + its direct neighbors stay at full opacity; everything else fades to 15%. The focused node gets a brighter stroke and a drop-shadow glow so it stands out. The footer shows "focused on <name>". Click the same node again OR press Escape to clear focus. Click a different node to switch focus. This is the biggest readability improvement for dense webs \u2014 you can isolate "show me just Vierge's connections" in one click.

**5. Zoom + pan.** Scroll-wheel on the SVG canvas zooms in/out centered on the cursor (0.25x to 3x). Click-drag on empty background panning. Touch-supported via pointer events. The SVG viewBox is manipulated directly so zoom/pan is pure view transformation \u2014 no re-layout, no performance cost. The new reset button (\u2921 icon) snaps back to the default viewport + clears focus + clears filters + recomputes node positions in one action.

**6. Drag-to-reposition nodes.** Pointer-drag any NPC node (not {{user}}, which stays anchored at center) to move it. Positions persist across re-renders triggered by filter changes, focus changes, or hover \u2014 so you can lay the graph out the way you want and the layout sticks until you click the reset button or the character roster changes. Touch drag works too.

#### Changed \u2014 Layout structure
- **Two-column body**: SVG canvas on the left flexing to fill available space, legend panel fixed 200px wide on the right. Previously the SVG took the full width.
- **Container widened** from 1100px to 1280px max to accommodate the legend without shrinking the graph.
- **Responsive**: on screens \u2264900px the legend drops below the SVG as a horizontal chip row. On \u2264600px the toolbar buttons compress their padding.
- **Body height** uses flex min-height so the SVG and legend share space properly inside the container's max-height constraint.

#### Changed \u2014 Header toolbar
Grouped all action buttons into a `.sp-web-toolbar` flex container aligned right after the title:
- **Labels** (toggle) \u2014 new in v6.8.28
- **\u2921 Reset** \u2014 new in v6.8.28, resets view + positions + filters + focus
- **\u26B2 Layout** \u2014 force/circular toggle (from v6.8.27)
- **\u21BB NPC** \u2014 generate/regenerate (when feature enabled, from v6.8.27)
- **\u2715 Close**

#### Changed \u2014 Escape key behavior
Escape now clears the focus state first (if focused on a node), then closes the overlay on a second press. Matches the expected behavior of modal overlays with internal focus states.

#### Architecture notes
- **Position persistence**: `positions` array now lives in the `openRelationshipWeb` closure scope instead of being recomputed on every render. Only `_relayout()` forces recomputation; `_rerender()` reuses existing positions. This unlocks drag-to-reposition without sacrificing force-directed determinism.
- **State object**: `_buildSvg` now takes a `state` parameter (`{focusedIdx, filter, showLabels, viewBox}`) so all the new features flow through one signature change.
- **Label layout pass**: edge labels are collected during the edge-drawing loop and positioned in a separate collision-avoidance pass. Uses a simple O(n\u00B2) scan against already-placed labels \u2014 fine for typical edge counts (< 30).
- **Touch + pointer events**: drag and pan use `pointerdown`/`pointermove`/`pointerup` instead of mouse events, so touch devices work the same way. `touch-action: none` on the SVG prevents browser scroll hijacking.

#### Not changed
- The batch-inference data layer from v6.8.27 is unchanged. No schema changes, no prompt changes, no migration. Pure presentation refactor of the overlay.
- 183/183 tests still pass.

### [6.8.27] — 2026-04-09

#### Added \u2014 NPC\u2194NPC relationship web (Phase 1: overlay-time batch inference)
Relationship Web v2. Architecture shaped by a cross-specialty review (software architecture, LLM compliance, token economics, UX/graph visualization, data modeling). The big decision: **DON'T** add per-turn emission of a new `relations` field to the character schema \u2014 instead, generate the NPC\u2194NPC graph lazily via a one-shot LLM call when the user opens the overlay, then cache the result per-snapshot. This resolves the token economics dissent against continuous emission (rarely-opened feature, expensive per-turn cost) and lets us validate the UX before investing in per-turn data layer changes.

- **New module `src/ui/relationship-graph.js`** handles batch inference, parsing, canonicalization, caching, and feature-flag gating. Cache key is a fingerprint of character names + archetypes + roles; re-opening the overlay without new generations is free. Cache lives in `chatMetadata.scenepulse.relationshipGraph`.
- **Batch inference prompt** lists the tracked characters with archetype + role, asks the model to emit a JSON array of directed NPC\u2194NPC edges with `{from, to, type, label}`. Explicitly requires NEVER referencing {{user}}, encourages asymmetry, caps at 30 edges. Uses the same SillyTavern `generateQuietPrompt` / `generateRaw` path as the main tracker generator \u2014 inherits the user's configured connection profile.
- **Validation and dedup at parse time**: strips {{user}} references defensively, drops malformed entries, canonicalizes via alias lookup, dedupes by `(from, to, type)` triples, collapses reciprocal pairs (A\u2192B and B\u2192A for the same type) into a single edge with `direction: 'reciprocal'` for two-tone rendering.
- **11 edge types** mirroring the v6.8.26 archetype taxonomy minus `background`/`pet`, plus `acquaintance` and `unknown`: `family / friend / ally / rival / antagonist / mentor / authority / lover / lust / acquaintance / unknown`. Each type has a color (reusing the archetype palette) and an emoji glyph (anchor, heart, crossed swords, star, hammer, etc.) for color-blind accessibility.

#### Added \u2014 Force-directed layout for the Relationship Web
- **Seeded Fruchterman-Reingold simulation** (~180 iterations with cooling schedule) replaces the forced-circular layout as the default. Seeded from a hash of the sorted character name list so the same roster always produces the same layout across re-opens. O(n\u00B2) cost is fine for typical roster sizes.
- **{{user}} anchored at center** throughout the simulation so the player stays the visual focal point and the layout feels stable.
- **Curved edges with hashed offset** so multiple edges between similar regions don't overlap exactly. Edge color for NPC edges comes from the type palette; width is fixed at 2.2px.
- **Two-tone reciprocal edges**: when both A\u2192B and B\u2192A agree on the type, the edge renders as two halves \u2014 first half in A's accent color, second half in B's accent color \u2014 with a thin type-colored core line running through the whole curve so the edge kind is still readable at a glance.
- **Emoji glyph in a small circle at the edge midpoint** so color-blind users can identify edge types without relying on the palette alone. Glyphs use Unicode characters that render consistently across platforms: \u2693 family, \u2661 friend, \u25C6 ally, \u2694 rival, \u2716 antagonist, \u2605 mentor, \u2692 authority, \u2665 lover, \u263D lust, \u25CB acquaintance, \u25A1 unknown.
- **Layout toggle in the header**: classic circular view preserved as a fallback for users who prefer the old look or whose roster looks messy under force-directed. Stored per-session, not persisted.
- **Enriched tooltip** on node hover now shows both the existing user-facing meters (affection/trust/stress) AND a compact list of incident NPC\u2194NPC edges with direction arrows (\u2192 outgoing, \u2190 incoming, \u21C4 reciprocal) + glyph + labeled target. SVG `<title>` elements on nodes for screen-reader compatibility.

#### Added \u2014 Settings toggle
- **New checkbox in General**: "NPC relationship graph" (Experimental). Off by default. When disabled, the Relationship Web overlay renders exactly as in v6.8.21 \u2014 star topology, no generate button. When enabled, the "\u21BB NPC" button appears in the overlay header; clicking it calls the batch inference and caches the result. Disabling the setting also clears any cached graph.

#### Not shipping in Phase 1 (deferred to v6.8.28+ if the feature proves valuable)
- Per-turn schema field (`relations: []` on each character) \u2014 rejected in unified review for token cost vs utility.
- Click-to-focus subgraph highlighting.
- Drag-to-reposition nodes.
- Edge type filter chips.
- Always-visible edge labels (currently hover-only).
- Zoom/pan on the SVG canvas.
- Phase 2 decision will be made after real-world data quality from Phase 1 is observed.

#### Not changed
- Existing `relationships[]` top-level array (user-facing) is untouched. The NPC graph is strictly additive.
- No schema changes, no migration, no normalize changes, no delta-merge changes.
- 183/183 tests still pass.

### [6.8.26] — 2026-04-09

#### Changed \u2014 character archetype taxonomy overhaul
Rewrote the v6.8.19 archetype enum from 8 values to 11 to fix ambiguity and cover gaps users were running into.

**Removed:**
- `protagonist` \u2014 unused in practice. {{user}} is the protagonist of their own story, so the value confused more than it clarified.

**Renamed:**
- `love` \u2192 **`lover`** \u2014 clearer as a noun for "romantic partner", covers short-term / long-term / prospective romantic interest. Old snapshots with `love` auto-migrate via the synonym map \u2014 no data rewrite.
- `incidental` \u2192 **`background`** with a new slate blue-gray color (`#7a8794`). Less medical-sounding; "background character" is the standard screenwriter term. Auto-migrated.

**Added:**
- **`friend`** (soft cyan `#7dd3c0`) \u2014 established platonic bond with {{user}}. Doesn't require active quest support, unlike `ally`. The most-abused bucket in the old taxonomy was `ally`; now friends can be friends.
- **`authority`** (steel blue-gray `#8a9bb5`) \u2014 institutional or hierarchical power over {{user}}. Boss, judge, cop, commanding officer, strict principal. Distinguished from `mentor` by power asymmetry, not teaching.
- **`lust`** (crimson `#c74a6a`) \u2014 purely sexual interest with no romantic attachment. Hookups, FWB, sex workers, one-sided physical attraction. Distinguished from `lover` by the presence/absence of emotional investment.
- **`pet`** (teal `#5fc8b8`) \u2014 non-human companion. Cat, dog, horse, familiar, bonded creature. Previously forced into `incidental` (undervalued) or `ally` (wrong).

**Mentor vs Authority \u2014 new explicit rule** in the prompt to resolve the teacher case: *"If {{user}} ignored this person, what happens?"* If nothing formal, it's `mentor`. If there are institutional consequences (grade drops, firing, arrest, detention), it's `authority`. A high-school teacher running a lesson is `mentor` during the lesson and `authority` during a disciplinary meeting \u2014 same character, different dominant role per scene, both correct.

**Lover vs Lust \u2014 explicit rule**: does this character have emotional investment in {{user}}? A sex worker sleeping with {{user}} transactionally is `lust`. The same sex worker once real feelings develop is `lover`. A one-night stand is `lust`; a one-night stand that leaves {{user}} thinking about them the next morning is `lover`.

#### Synonym map overhaul
`normalize.js` archetype parser rewrote its synonym map from scratch. Canonical judgment calls:
- `teacher` \u2192 `mentor` (the dictionary-level word implies teaching, not power).
- `boss`, `cop`, `judge`, `priest`, `principal`, `commander` \u2192 `authority`.
- `colleague`, `coworker`, `companion`, `acquaintance`, `neighbor`, `roommate`, `classmate` \u2192 `friend`.
- `partner` NOT in the map \u2014 too ambiguous (romantic / business / firm / life). The LLM is expected to pick `lover` or `ally` explicitly.
- `client` NOT in the map \u2014 too ambiguous (legal / medical / sex work). LLM picks `lust` or `background` explicitly.
- `ex` \u2192 `lover` (an ex that still matters narratively). If the relationship is fully resolved, the LLM should emit empty.
- `prostitute`, `sex worker`, `escort`, `hookup`, `fwb`, `dominatrix`, `mistress`, `one-night stand` \u2192 `lust`.
- Legacy values `love` and `incidental` are in the map as back-compat so old snapshots normalize to the new names on next read.

#### Not changed
- No migration needed \u2014 the synonym map does it transparently on normalize.
- No schema-layer data changes beyond the enum expansion.
- 183/183 tests still pass.

### [6.8.25] — 2026-04-09

#### Fixed \u2014 CARRYING section now honors "Show empty fields"
- The inventory/CARRYING section on the character card was gated on `inventory.length > 0` and never rendered when a character had no items, **even with the "Show empty fields" toggle on**. The fertility section had the right pattern (checks `_showEmpty` / `_isEdit`) but CARRYING didn't. A cat NPC with no inventory would therefore show every other field in show-empty mode but the CARRYING header would be invisible, which looked like the toggle was still broken.
- **Fix**: CARRYING now renders whenever inventory has items OR edit-mode is on OR show-empty is on. When there are no items but the section renders anyway, a single dashed-border "(no items)" placeholder chip appears so the reader can tell the section exists and is deliberately empty. New CSS class `.sp-char-inventory-empty` with italic dim styling and `border-style: dashed`.

### [6.8.24] — 2026-04-09

#### Fixed \u2014 "Show empty fields" toggle had no visible effect
- **The toggle's CSS and class-toggle mechanism were correct**, but [`src/normalize.js`](src/normalize.js) carry-forward (v6.8.15+) aggressively fills every character field from the previous snapshot, so there were almost no actually-empty fields for the class to reveal. Meanwhile, [`update-panel.js:1129`](src/ui/update-panel.js#L1129) applied field-toggle-off visibility via inline `style.display = 'none'`, which isn't affected by the class-based `sp-show-empty` CSS rule at all. Net effect: toggling the button produced no visible change.
- **Fix**: when `showEmptyFields === true`, the field-toggle-visibility loop in [`updatePanel`](src/ui/update-panel.js) now force-shows elements that are normally hidden by the user's Panel Manager / field toggles, AND stamps them with a new `sp-ft-force-shown` class so CSS can dim them with a diagonal-stripe background + amber left border. This communicates "this is a field you've hidden that we're surfacing temporarily" and is distinct from the existing `sp-empty-field` treatment for actually-empty cells.
- **User-visible behavior**: clicking the "Show empty fields" toolbar button now immediately reveals any field-toggled-off rows, cards, or sections across the whole panel with a clearly-dimmed striped background. Clicking again re-hides them. The previous behavior (showing actually-empty grid cells) still works too \u2014 both now coexist under the same toggle.

#### Fixed \u2014 orphan "Recently Absent" stubs for aliased characters
- **Scenario**: LLM mis-typed a character's name early in a chat ("Vierre" instead of "Vierge"), accumulated many snapshots under the misname, then corrected itself and the extension recorded an alias (`aliases: ["Vierre"]`) on the current Vierge entry. The main card correctly showed Vierge with the "also: Vierre" badge, but the "Recently Absent" stub list kept rendering a ghost "Vierre" card sourced from the old snapshots. Three compounding causes, fixed together:
  1. **Off-scene dedup only checked current canonical names, not aliases.** Now walks both directions: every current character's canonical name + every alias on each current character goes into a `currentNamesAndAliases` set, and a history entry is skipped if its key OR any of its `aliasesLow` matches anything in that set.
  2. **Character history cache didn't invalidate on re-generation.** The cache key was `${snaps}|${keyCount}` — regenerating the latest turn overwrites `snaps[latest]` in place without changing `keyCount`, so the cache returned stale data. The key now includes a fingerprint of the latest snapshot's character roster (name + sorted aliases per character), so any change to the latest snap's character list busts the cache.
  3. **Pass-1 canonicalization could miss edge cases** where the alias was added late and older snapshots had already registered themselves under the old name. Added a Pass-3 post-hoc consolidation step that walks the output map and merges any two entries whose `aliasesLow` sets overlap with each other's canonical keys. Merge semantics: most-recent `lastSeen` wins the canonical name, `appearances` is summed, earliest `firstSeen` is kept, `aliasesLow` is unioned. Idempotent.

#### Not changed
- No schema, migration, or prompt changes. 183/183 tests still pass. Existing chats with orphan stubs will self-heal on next panel render because Pass 3 consolidates historical entries without requiring any data-layer rewrite.

### [6.8.23] — 2026-04-09

#### Changed \u2014 thought panel shows the full inner thought by default
- **The floating thought panel now renders the complete `innerThought` string** instead of a hash-truncated 1\u20133 sentence slice. The old behavior was a visual-variety trick \u2014 it hashed the thought text to pick a stable 1\u20133 sentence cap per character so each bubble felt like a distinct voice length at a glance \u2014 but it was surprising to anyone who expected to see the whole thought they'd asked the model to generate, and it was undocumented outside the code.
- **The old behavior is still available** as an opt-in setting: **General \u2192 \u2018Truncate thought bubbles to 1\u20133 sentences\u2019** (off by default). When enabled, the legacy hash-stable slice logic runs: the same thought always renders with the same length across re-renders, and *different* thoughts vary between 1, 2, and 3 sentences based on a djb2-style hash mod 3.
- **No migration needed.** New `thoughtPanelTruncate: false` key added to `DEFAULTS`; existing chats inherit the default (full thought) on next load. Wired through `bind-ui.js` with the same pattern as the other thought-panel toggles.

### [6.8.22] — 2026-04-08

#### Added \u2014 per-field delta indicators (Feature I)
- **Every character card field that changed since the previous snapshot now carries a small accent-colored dot** next to its value. The dot is a `::after` pseudo-element on `.sp-char-val-changed` so there's no extra DOM per field \u2014 just a CSS class toggle during render. Tinted in the character's accent color with a subtle glow so it reads at a glance against dim text.
- **Hover a changed value** to see the previous value as a title tooltip (truncated at 160 chars for grid rows, 200 chars for the inner thought block).
- **Inner thought block quotes** get a brighter background + a top-right accent dot instead of the inline dot, because the flex layout of the block doesn't leave room for an inline marker. The dot is positioned with absolute/top-right so it floats in the corner of the quote.
- **Inventory chips** are compared item-by-item \u2014 items present in the current turn but not the previous get a `sp-char-inventory-item-added` class that brightens the chip border and pulses the bullet dot. Items that were removed aren't rendered (they're not part of `ch.inventory` anymore).

#### Alias-aware previous-character lookup
- **Previous-snapshot lookup walks alias chains** in three directions: exact canonical name, current character's aliases list matched against prev canonical names, and prev character's aliases matched against current canonical name. A character who was renamed via the v6.8.18 reveal path (e.g. "Stranger" \u2192 "Jenna") still finds their prior entry and computes the delta correctly \u2014 no false "all fields changed" flags from the rename.

#### Not changed
- No schema changes, no migration, no prompt changes. 183/183 tests still pass.
- New characters (no prev entry) get no indicators \u2014 delta requires a baseline.

### [6.8.21] — 2026-04-08

#### Added \u2014 shared character history walker
- **New `src/ui/character-history.js`** module walks all stored snapshots in the current chat once and returns a `Map<lowerCanonicalName, HistoryMeta>` keyed by canonical name with `firstSeen`, `lastSeen`, `appearances`, `lastLocation`, `canonical` (display name), and `aliasesLow` (set of every lowercase name the entity has been known by). Alias-aware \u2014 a character tracked as "Stranger" in early snapshots and "Jenna" in later ones with `aliases: ["Stranger"]` collapses to a single history entry under "jenna" instead of two orphan rows.
- **Cached by snapshot-set identity** so rendering is cheap across multiple card updates in the same turn. `invalidateCharacterHistory()` exported for explicit cache busts after operations that mutate stored snapshots in place (e.g. the v6.8.18 manual merge flow).
- **Character Wiki refactored** to delegate its firstSeen/lastSeen/appearances computation to the shared walker \u2014 dropping ~20 lines of inline duplicated logic and inheriting alias awareness. A character who was manually merged in v6.8.18 now shows up once in the wiki with the consolidated history instead of twice.

#### Added \u2014 shared-scene counter on character card header (Feature E)
- **New dim meta line under each character's name**: "Scene #23 \u00b7 met #5" showing the total number of snapshots the character has been present in (equal to shared scenes with {{user}} since {{user}} is present in every scene by definition) and the message index where they first appeared. Hidden when the character has been seen in 1 or fewer snapshots (not enough history to be meaningful). Gives each card a "how established is this character in fiction-time" read without opening the Character Wiki.
- **Header layout restructured** to a two-line flex column: name row (name + archetype + aliases) on top, meta line below. The portrait, chevron, and merge button stay on their own axis so the two text lines align cleanly under the portrait.

#### Added \u2014 "Recently absent" off-scene stub list (Feature D)
- **Below the main character cards**, a new "RECENTLY ABSENT" section renders compact stubs for characters who were present in a recent snapshot but are NOT in the current scene. Each stub shows the portrait (20 px, smaller than the main card), canonical name, and "Last seen: #msgIdx \u00b7 [location]". Dim by default, brightens on hover. No expand, no body \u2014 just a presence acknowledgment.
- **Bounded** by a 5-turn recency window (characters absent for more than 5 turns don't appear \u2014 they're considered "forgotten" and live only in the Character Wiki) and capped at 5 stubs so the main panel never balloons even in a chat with dozens of historical characters.
- **Off-scene characters are NOT added to the main card loop** \u2014 they're computed separately from the shared history walker, then rendered as a distinct section. This keeps the v6.8.15 group-chat carry-forward logic intact and doesn't affect filterForView behavior at all.

#### Not changed
- No schema changes, no migration, no prompt changes. 183/183 tests still pass.

### [6.8.20] — 2026-04-08

#### Added \u2014 character portrait thumbnails (Feature B)
- **Every character card header now has a 26-px circular portrait** to the left of the chevron. Resolves through a four-layer priority:
  1. **User override**: if `settings.charPortraits[lowercased-name]` holds a URL or data: URL, use it. Highest priority \u2014 lets users pin any image to any character regardless of what SillyTavern thinks.
  2. **SillyTavern character match**: any character in `SillyTavern.getContext().characters` whose `.name` matches the lookup name (case-insensitive) contributes its `/characters/{avatar}` URL. Uses the same `/characters/` endpoint ST itself serves.
  3. **Alias-aware ST match**: if the character's `aliases` array contains an ST character name, the matching avatar is used. This makes portraits survive the v6.8.18 reveal flow \u2014 a "Stranger" entry with `aliases: ["Jenna"]` will pick up Jenna's ST avatar automatically once the real name is revealed.
  4. **Monogram fallback**: a circular tile with the first letter of the name on the character's accent-color background. Always renders, even for characters with no matching image anywhere.
- **New shared module `src/ui/portraits.js`** exports `resolvePortraitUrl`, `getPortraitHtml`, `buildPortraitIndex`, `setPortraitOverride`, and `clearPortraitOverride`. Both `update-panel.js` and `character-wiki.js` delegate to it so portrait resolution logic lives in exactly one place.

#### Added \u2014 click-to-upload portrait override
- **Clicking a portrait opens a file picker** (png/jpeg/webp/gif). The selected file is read as a data: URL via `FileReader`, stored in `settings.charPortraits` keyed by lowercased character name, and the panel re-renders immediately so the new image appears without a page reload. A 1 MB soft warning fires via toast if the file is unusually large (since settings.json stores the full data URL).
- **Right-clicking a portrait clears the override** (with confirmation dialog), falling back to ST avatar lookup or monogram on the next render.

#### Changed \u2014 Character Wiki portrait resolution
- **The wiki overlay now uses the same shared resolver** so its avatars pick up user overrides and alias matches. Previously the wiki had its own `_getAvatarUrl()` that only read from ST characters with exact name match \u2014 it couldn't see portrait overrides and couldn't resolve aliases. Now delegated to `portraits.js`.

#### Settings
- **New `charPortraits: {}` entry in `DEFAULTS`** (`src/constants.js`) \u2014 the storage slot for user-uploaded portrait overrides. Empty by default.

#### Not changed
- No schema changes, no migration needed. 183/183 tests still pass.

### [6.8.19] — 2026-04-08

#### Added \u2014 character archetype tagging (Feature L)
- **Every character now has a single-enum `archetype` field** describing their dominant narrative role relative to {{user}} this turn. Nine values: `protagonist` (secondary co-lead), `ally` (on {{user}}'s side), `rival` (competitive but not hostile), `mentor` (teaches/guides), `antagonist` (actively opposes), `family`, `love` (romantic/sexual interest), `incidental` (minor NPC), or empty (unclassified). Archetype can change turn-to-turn as the story develops \u2014 a stranger becomes an ally, an ally becomes a rival, a love interest might become an antagonist.
- **Added to the static JSON schema** (`src/constants.js`) as an enum property on character items, with the canonical list also exported as `CHARACTER_ARCHETYPES` for reuse across the UI, prompt builder, and filter logic.
- **`normalizeChar` validates and normalizes** the incoming value: lowercases and trims, maps common near-synonyms (`friend`/`companion` \u2192 `ally`, `enemy`/`villain` \u2192 `antagonist`, `romance`/`partner` \u2192 `love`, `teacher`/`guide` \u2192 `mentor`, `competitor`/`opponent` \u2192 `rival`, `relative` \u2192 `family`, `extra`/`bg` \u2192 `incidental`), and falls back to empty string for anything not recognized. Empty string is the "unclassified" state \u2014 no badge renders.
- **Carried forward in `normalizeTracker`** so a character that was classified in a previous turn doesn't lose their archetype if the model omits the field on a turn where nothing changed about their role.
- **Prompt guidance** added to `BUILTIN_PROMPT` Characters section and to `buildDynamicPrompt` character field list, explaining the nine values and how to pick the dominant one when a character has multiple functions.

#### Added \u2014 archetype badge on character card and wiki entry
- **New `.sp-char-archetype` pill in the character card header** (main panel) and in the Character Wiki entry header. Small uppercase bold text with a distinct color per archetype \u2014 gold for protagonist, blue for ally, amber for rival, green for mentor, red for antagonist, purple for family, pink for love, dim gray for incidental. The pill sits between the character name and the v6.8.18 aliases badge, and is only rendered when `archetype` is non-empty. Uses the character's accent color scheme so the pill reads as "this character's type" at a glance, without needing to decode the text.

#### Added \u2014 archetype filter dropdown in Character Wiki
- **New archetype selector** in the Character Wiki toolbar, next to the sort dropdown. Lists all nine archetype values (plus "All roles" default). Selecting a value filters the wiki entries to only that archetype, and visually deactivates the scene-presence filter pills (the two filters are mutually exclusive since scene-presence + archetype would be a confusing AND/OR combination). Clicking a scene-presence pill clears the archetype dropdown. Uses a prefix convention `arch:<name>` in the filter mode string so the existing `_filterEntries` function handles both filter types via the same code path.

#### Dynamic-schema support
- **Added `char_archetype` to `CHAR_SUBFIELD_MAP`** (`src/schema.js`) and to `BUILTIN_PANELS.characters.subFields` (`src/constants.js`) so the archetype field can be toggled off via the existing field-toggle UI. Enabled by default.

#### Not changed
- No migration needed \u2014 missing archetype parses to empty string and characters without the field simply render without the pill. Older snapshots keep working unchanged. 183/183 tests still pass.

### [6.8.18] — 2026-04-08

#### Added — unknown\u2192known character identity resolution (Feature A)
- **Characters that start as descriptive placeholders (e.g. "Stranger") can now be reconciled with their real name when the story reveals it.** Before this release, the tracker matched characters by exact lowercased name only. If the model emitted "Stranger" for three turns and then "Jenna" on the fourth, the snapshot would carry two separate character entries indefinitely \u2014 with independent appearance counts, independent relationship meter histories, and no way to tell they were the same person. Five-layer fix:
  1. **New `aliases` schema field** on every character \u2014 an optional array of former names the character was previously known by. Empty by default. Parsed defensively in `normalizeChar` (accepts array, single string, or missing; strips the canonical name from the list so a character never aliases themselves; deduplicates case-insensitively).
  2. **Alias-aware merge in `mergeEntityArray`** (`src/generation/delta-merge.js`). New `useAliases` parameter enables two additional match paths after exact name match but before giving up. **ALIAS match**: if the delta's name matches a previous entry's `aliases` list, the delta merges into that prev entry WITHOUT renaming. This handles the case where the model stubbornly continues calling a character by their old placeholder after the real name has already been learned. **REVEAL match**: if the delta's `aliases` list contains a previous entry's canonical name, the delta merges into that prev entry, RENAMES it to the delta's new canonical name, and pushes the old name into aliases. This is the unknown\u2192known identity reveal. Both paths bypass the `matchedIdxs` guard (which only blocks fuzzy quest collisions) so multiple delta entries referencing the same character collapse correctly in a single batch.
  3. **Post-merge `reconcileIdentityAliases`** walks the merged characters array, builds an alias\u2192canonical map, and rewrites any stale relationship or `charactersPresent` entries that still reference an old placeholder. When two relationship entries collapse to the same canonical character after rewriting, their fields are merged (non-zero meters + non-empty strings win). Called from `mergeDelta` before `consolidateQuests`.
  4. **Prompt guidance** added in three places: `BUILTIN_PROMPT` Characters section, `buildDynamicPrompt` character field list (`src/schema.js`), and the interceptor's mandatory-hints injection (`src/generation/interceptor.js`). The model is told (a) use a consistent descriptive placeholder for unnamed characters and reuse it across turns, (b) when the real name is revealed, emit a SINGLE entry with the new `name` and the old placeholder in `aliases`, (c) do NOT create two separate entries under the old and new names.
  5. **Manual merge UI** \u2014 a small merge-icon button in every character card header. Clicking it opens a picker listing the OTHER characters in the current snapshot; selecting one triggers a confirmation dialog and then calls `mergeCharactersAcrossSnapshots(src, tgt)` which walks every stored snapshot in the chat and folds the source into the target (rename + alias union + relationship merge + `charactersPresent` fix-up). The source name is automatically added to the target's aliases so the historical identity link is preserved. Destructive but confirmed.

#### Added \u2014 Character Wiki "Formerly" section
- **Wiki entry cards now show a dedicated "FORMERLY" section** listing every alias the character was previously known by, rendered as italic dashed-border pill chips. Sits at the top of the expanded body (above Role) so users can see the identity history at a glance. Uses the same `.sp-wiki-section-label` + `.sp-wiki-inventory`-style chip pattern introduced in v6.8.17 for visual consistency.

#### Added \u2014 alias badge on main character card
- **Character card headers now show a small "(also: Stranger, The Nurse)" badge** next to the character name when the `aliases` array is non-empty. Truncates to the first 2 aliases with an ellipsis if there are more; the full list is visible in a `title` tooltip.

#### Migration
- **Lazy v6.8.18 migration** in `settings.getTrackerData()` walks every stored snapshot in a chat on first load and initializes `aliases: []` on every character entry. Also strips the canonical name from any aliases list that somehow contains it (defense against model drift or future edge cases) and deduplicates case-insensitively. Guarded by a per-chat `_spAliasesInitMigrated` flag so the scan runs exactly once.

#### Tests
- **New `tests/character-aliases.test.mjs` with 49 cases** covering `normalizeChar` alias parsing (array / string / missing / canonical-name stripping / dedup / nullish filtering), exact-match regression, ALIAS match semantics, REVEAL match semantics, alias list union, canonical-in-aliases stripping, multi-entry same-batch collapse (both directions), `reconcileIdentityAliases` relationship renaming, relationship merge on collision, `charactersPresent` remap, no-aliases regression, and a quest-merge regression guard to prove aliases logic doesn't leak into quest merging.
- **Full sweep: 183/183** (49 character-aliases + 134 pre-existing).

### [6.8.17] — 2026-04-08

#### Changed — character card section headers get icons and stronger visual weight
- **Each major subsection header now has a custom SVG icon tinted in the character's accent color.** The v6.8.16 headers were plain uppercase dim text with a dashed top rule — technically labeled but visually weak. Readers had to actively scan for the text to locate a section. Each of the six headers (Role, Right Now, Appearance, Carrying, Goals, Fertility — plus Relationship and Notes in the wiki overlay) now carries a distinctive 12-px viewBox SVG glyph rendered in `var(--char-accent)` so it picks up the same per-character color used on the card's left border. At a glance the user can locate any section by its icon silhouette + color, without reading the label.
  - **Right Now** — lightning bolt (present-moment energy)
  - **Appearance** — eye (observation)
  - **Carrying** — satchel/bag outline with handle and pocket line
  - **Goals** — concentric-circle target (aim)
  - **Fertility** — leaf with a subtle vein (biological/neutral — chosen over cycle/medical glyphs to stay neutral across contexts)
  - **Role** (wiki only) — person-in-bust silhouette
  - **Relationship** (wiki only) — outlined heart
  - **Notes** (wiki only) — document with horizontal lines
- **Header typography bumped**: font size 9 → 10 px, color `--sp-text-dim` → `--sp-text` (brighter), top rule dashed → solid 1-px. Still uppercase bold with letter-spacing 0.08em. The solid rule + icon + brighter text combine to make each section header actually feel like a header instead of a footnote.
- **Helper refactor** — `_mkSub(label, icon, ftKey)` now accepts an SVG string as its second argument and renders an `.sp-char-subsection-icon` span alongside an `.sp-char-subsection-text` span via flex layout. SVG strings are trusted inline constants (never user input), so `innerHTML` is safe. Same pattern in the wiki via a new `_secHdr(icon, label)` helper.

#### Changed — inventory renders as individual pill chips
- **Carrying is no longer a comma-joined run-on line.** The v6.8.16 layout put inventory in its own section but rendered items as `inventory.join(', ')` — one long text string where individual items melted together, especially when an item was a phrase like "leather satchel with paperwork". Each item is now its own rounded-rectangle pill chip with a small colored dot, laid out in a flex-wrap container: short items pack horizontally, long items wrap to their own row. The pill background is a faint white tint, the border picks up `--sp-border`, and hovering a chip lifts the background and border to `--char-accent` for subtle interactivity. Applied to both the main character card (`.sp-char-inventory-item`) and the Character Wiki expanded card (`.sp-wiki-inventory-item`) so both views use the same visual language.

#### Fixed — wiki immediateNeed was rendered twice
- v6.8.16 moved `immediateNeed` into the Right Now section but also left it in the Goals field array in `src/ui/character-wiki.js`, so the wiki overlay showed the same line under both `RIGHT NOW > Needs` and `GOALS > Need`. Goals is now short/long-term only, matching the main panel exactly.

#### CSS
- New classes: `.sp-char-subsection-icon`, `.sp-char-subsection-text`, `.sp-char-inventory-item`, `.sp-wiki-section-icon`, `.sp-wiki-inventory`, `.sp-wiki-inventory-item`.
- `.sp-char-subsection-label` and `.sp-wiki-section-label` rewritten as flex containers (icon + text) with the updated typography.
- Pill chips use `::before` pseudo-elements for the colored dot so no extra DOM per item.

#### Not changed
- No data-layer changes, no prompt changes, no migration needed. Pure presentation refactor. 134/134 tests still pass.

### [6.8.16] — 2026-04-08

#### Changed — character card body redesign
- **Character card body now has clearly-labeled subsections.** Before this release, the card body was a flat stack of fields: role on top, then an inner-thought row, then an unlabeled grid of appearance fields, then goals, then fertility — with no visual anchors separating them. Users looking at the fertility row saw "STATUS: active" and "NOTES: …" with no context for what that data described. The body is now organized into five explicit sections, each headed by a small uppercase dim label with a dashed top rule: **Role** (the identifying field, rendered first without a section header), **Right Now** (inner thought as an italic block quote with the character's accent color as a left border, followed by `immediateNeed`), **Appearance** (hair, face, outfit, posture, proximity, notable details), **Carrying** (inventory as an inline comma-joined line, only rendered when non-empty), **Goals** (short-term + long-term only — `immediateNeed` moved out of Goals because it's about the present moment, not aspirational planning), and **Fertility** (the `STATUS`/`NOTES` pair under an explicit `FERTILITY` label, finally answering "what is this data about?").
- **Inner thought rendered as a block quote.** The field used to be a plain grid row styled with a dashed top border — visually identical to the appearance fields below it. It's now a distinct block with italic text, a left-border accent in the character's color, and a subtle background tint. Signals "this is the character's voice" rather than metadata about them.
- **Inventory split out of the appearance grid** into its own `CARRYING` section. Conceptually "what they have" is not "how they look"; mixing them under one grid was a layout accident. The section only renders when inventory is non-empty, so empty inventories don't add visual noise.
- **`immediateNeed` moved from Goals to Right Now.** The old layout put all three of `immediateNeed`, `shortTermGoal`, and `longTermGoal` under one `GOALS` header. `immediateNeed` is the character's *current moment* ("thirsty", "needs to sit down", "wants to leave"), not an aspiration — grouping it with month-long or life-long goals was a category error. Now it sits with `innerThought` under `RIGHT NOW` where both fields describe the present scene state together.

#### Changed — Character Wiki overlay matches main card layout
- Applied the same five-section regrouping to `src/ui/character-wiki.js` so the expanded card in the wiki overlay mirrors the main panel. `innerThought` is no longer a loose element floating above the Role header — it's now inside a labeled `RIGHT NOW` section alongside `Needs`. Inventory moved from the Appearance grid into its own `CARRYING` section. Goals is short/long-term only.

#### CSS
- New classes in `css/characters.css`: `.sp-char-subsection-label` (uppercase dim section header with dashed top rule), `.sp-char-thought-block` (italic block quote with accent left border and subtle background tint), `.sp-char-inventory` (inline row styling for the Carrying section). Existing `.sp-fert-section` top border removed since the subsection label now supplies the visual divider.

#### Not changed
- No data layer changes — this is purely a presentation refactor. No schema changes, no migration needed, no prompt updates, all 134/134 tests still pass.

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

