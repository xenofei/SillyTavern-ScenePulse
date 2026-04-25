// src/prompts/slots.js — Named prompt slot system (v6.18.0)
//
// Carves the previously-monolithic `buildDynamicPrompt` into 7 named slots
// so users can override individual sections without rewriting (or breaking)
// the rest of the prompt. Slot text lives here as DEFAULT_SLOT_TEXT; a
// profile may shadow individual slots via `profile.promptOverrides[slotId]`.
// Legacy `profile.systemPrompt` (full-text override) still wins over the
// slot system entirely — backward compatibility for users who already
// hand-wrote a complete prompt.
//
// Slot ordering and where each slot is rendered lives in assembler.js.
// This module is data-only: metadata + default text + a small `getSlotText`
// helper. No side effects, safe to import anywhere.
//
// v6.19.0 will ship the editor UI on top of this module. v6.20.0 ships
// model-specific preset bundles that map preset → promptOverrides at apply
// time.

/** Ordered list of slot ids. Matches the rendering order in assembler.js. */
export const SLOT_IDS = [
    'role',
    'criticalRules',
    'language',
    'fields',
    'nameAwareness',
    'questValidation',
    'deltaMode',
];

/**
 * Slot metadata for the editor UI + diagnostics. Keep keys stable — they
 * are persisted in `profile.promptOverrides` and shipped in v6.20.0 presets.
 *
 * @type {Object<string, {
 *   id: string,
 *   name: string,
 *   description: string,
 *   section: 'opening' | 'body' | 'closing',
 *   editable: boolean,
 *   order: number,
 *   templateVars?: string[],
 * }>}
 */
export const SLOT_META = {
    role: {
        id: 'role',
        name: 'Role / opening framing',
        description: 'How the AI introduces its task. Sets the JSON-only output expectation.',
        section: 'opening',
        editable: true,
        order: 1,
    },
    criticalRules: {
        id: 'criticalRules',
        name: 'Critical rules',
        description: 'The "## CRITICAL RULES" block that enforces JSON shape, prevents empty fields, and ensures carry-forward.',
        section: 'opening',
        editable: true,
        order: 2,
    },
    language: {
        id: 'language',
        name: 'Language directive',
        description: 'Tells the AI which language to write narrative strings in. Includes ${language} template variable. Only included when getLanguage() returns a non-empty value.',
        section: 'opening',
        editable: true,
        order: 3,
        templateVars: ['language'],
    },
    fields: {
        id: 'fields',
        name: 'Field specifications (auto-generated)',
        description: 'Built dynamically from your enabled panels and field toggles. NOT editable as text — change which fields appear via the Panels and Fields settings.',
        section: 'body',
        editable: false,
        order: 4,
    },
    nameAwareness: {
        id: 'nameAwareness',
        name: 'Name-awareness checklist',
        description: 'Per-character checklist forcing the AI to promote placeholder names ("Buzzcut" → "Jack") into the aliases array. Inserted after the Characters field block (only if Characters panel is enabled).',
        section: 'body',
        editable: true,
        order: 5,
    },
    questValidation: {
        id: 'questValidation',
        name: 'Quest validation checklist',
        description: '4-test checklist (player-action, consolidation, urgency, tier-cap) preventing the AI from generating NPC activity logs as quests. Inserted after the Quests field block.',
        section: 'body',
        editable: true,
        order: 6,
    },
    deltaMode: {
        id: 'deltaMode',
        name: 'Delta mode instructions',
        description: 'Tells the AI to return only fields that changed since the previous state. Appended only when delta mode is active AND a previous state exists.',
        section: 'closing',
        editable: true,
        order: 7,
    },
};

// ── Default slot text ──────────────────────────────────────────────────
//
// Verbatim text moved out of schema.js's buildDynamicPrompt. Newlines
// preserved exactly — the assembler handles the surrounding whitespace
// (e.g. `## FIELD SPECIFICATIONS` headers, blank lines between sections).

const _ROLE = `You are a precise scene analysis engine. Read the story context and output a single JSON object conforming exactly to the provided schema. Output raw JSON only — no prose, no markdown fences, no commentary.`;

const _CRITICAL_RULES = `## CRITICAL RULES
1. EVERY field in the schema MUST contain meaningful data. NEVER return empty string "", empty array [], or null for ANY field, EXCEPT for charactersPresent, which MUST be an empty array [] during genuinely solo scenes ({{user}} alone, internal monologue, solitary travel, sleeping, hiding). If not explicitly stated in the story, INFER from context, character descriptions, genre conventions, or the previous state. A best-guess answer is ALWAYS better than an empty field.
2. Output must be valid parseable JSON. No trailing commas, no comments.
3. If the previous state provided a value and you have no new information, carry that value forward UNCHANGED. Emptying a previously-populated field is a critical error.`;

// Template var: ${language}
const _LANGUAGE = `## LANGUAGE
All narrative string values MUST be in \${language}. This includes: sceneMood, sceneTopic, sceneSummary, sceneInteraction, soundEnvironment, character innerThought, goals, appearance descriptions, quest names and details, northStar, relationship labels and milestones, plotBranch names and hooks, custom field values.
JSON keys, enum values (critical/high/moderate/low/resolved, calm/low/moderate/high/critical, pristine/neat/casual/etc.), and time/date formats remain in English.`;

const _NAME_AWARENESS = `1. Is the character's CURRENT canonical name a PLACEHOLDER or a REAL NAME?
   PLACEHOLDER signals (treat as unverified identity):
   - Physical descriptor: "Buzzcut", "Red-haired Woman", "The Tall Man", "Scar-face"
   - Role-only label: "The Paramedic", "The Guard", "Officer", "Bartender", "The Teacher"
   - Definite-article epithet: "The Stranger", "The Entity", "The Hooded Figure"
   - Story-invented identifier that is NOT what people actually call each other
   REAL NAME signals: proper first/last name used in dialogue, narration, introductions, IDs, nametags, third-party references.
2. Was ANY real name — first name OR last name OR full — mentioned this turn for that character?
   - "Browning, you're with me" reveals last name "Browning"
   - "Jack, grab the evidence" reveals first name "Jack"
   - "Detective Jack Browning of the 42nd" reveals full name "Jack Browning"
   - Check dialogue, narration, nametags, IDs, introductions, and what OTHER characters call them.
3. If #1 is PLACEHOLDER and #2 is YES: PROMOTE NOW.
   - Set \`name\` to the fullest real name currently known (even if only first or only last is known).
   - Push the OLD placeholder into \`aliases\` so the client can reconcile relationships and presence lists.
   - If you already had a partial (e.g. canonical was "Jack") and the full name is now known, set \`name\` to "Jack Browning" and push "Jack" into \`aliases\` alongside any earlier placeholder.
   - Emit a SINGLE character entry. NEVER a separate entry under the old placeholder or partial.
   - All references in relationships[] and charactersPresent[] must use the NEW canonical name this turn.
4. If you are unsure whether a mentioned word is a real name or a descriptor, PREFER PROMOTING. The client preserves the old placeholder as an alias, so nothing is lost, and correct identity matters more than playing it safe.
PROMOTION EXAMPLES (canonical name progression across turns):
  Turn N:   {name: "Buzzcut",        aliases: []}                       — real name unknown
  Turn N+1: {name: "Jack",           aliases: ["Buzzcut"]}              — first name revealed
  Turn N+2: {name: "Jack Browning",  aliases: ["Buzzcut", "Jack"]}      — full name revealed
  Turn N:   {name: "The Paramedic",  aliases: []}                       — role-only placeholder
  Turn N+1: {name: "Chris Hale",     aliases: ["The Paramedic"]}        — both names revealed at once
WRONG — do NOT do any of this:
  - Emitting two entries, one under "Buzzcut" and one under "Jack Browning"
  - Keeping "Buzzcut" as canonical after the real name was spoken
  - Putting "(Jack Browning)" inside the name field — names never contain parens
  - Omitting the old placeholder from \`aliases\` on the reveal turn (breaks relationship reconciliation)`;

const _QUEST_VALIDATION = `1. PLAYER ACTION TEST: Can {{user}} take a concrete action to advance this in the next few scenes? If it describes an NPC's ability, backstory, independent activity, or a world fact that {{user}} cannot influence, it is NOT a quest — write it into that character's goals, the sceneSummary, or a character's innerThought instead.
   WRONG (NPC activity — not player-actionable, any genre):
   - "Elly's Tracking Ability" (character trait)
   - "Jack's Research" (what an NPC is doing on their own)
   - "The Ship's Warp Core Status" (system state, not player objective)
   - "Sir Aldric's Oath of Fealty" (NPC backstory)
   - "The Sheriff's Bounty List" (world fact)
   RIGHT (player-actionable — same content, reframed):
   - "Understand Elly's connection to the haunting" (player can investigate)
   - "Help Jack uncover the truth" (player can actively assist)
   - "Repair the warp core before the fleet arrives" (player can act)
   - "Earn Sir Aldric's loyalty" (player can pursue)
   - "Collect the bounty on Black Bart" (player can undertake)

2. CONSOLIDATION TEST: Does an existing quest already cover this objective? If two or more quests share the same investigation, relationship, goal, or resolution condition, MERGE them into ONE quest with a combined detail field. New clues or developments UPDATE an existing quest's detail — they do not spawn new entries. A quest journal with more entries than the tier cap is almost always a sign of fragmentation.
   WRONG (fragmented — one objective split into many):
   - "Eleanor's Timeline" + "Eleanor's Description" + "Understanding the Origin" (3 entries, 1 investigation)
   - "Find the nav charts" + "Decrypt the nav charts" + "Plot the escape route" (3 steps, 1 escape plan)
   - "Speak to the blacksmith" + "Gather ore" + "Forge the blade" (3 steps, 1 crafting goal)
   RIGHT (consolidated):
   - "Investigate Eleanor Cole's connection to the Entity" (1 entry, all clues in the detail)
   - "Chart an escape route through the nebula" (1 entry, steps tracked in the detail)
   - "Commission a legendary blade" (1 entry, progress in the detail)

3. URGENCY CALIBRATION: Urgency reflects TIMING and CONSEQUENCE, not emotional weight. Use the lowest level that honestly fits.
   - critical: Irreversible consequences (death, permanent loss, destruction, betrayal with no second chance) happen THIS scene or NEXT if {{user}} does nothing. MAX 1 critical quest at a time across both tiers. If you have 2+ critical, demote all but the most immediate to high.
   - high: Serious consequences within days of in-story time. Deadline pressure but not instant catastrophe. Examples: a trial date approaching, a ship running low on fuel, a lord's patience wearing thin, a posse closing in.
   - moderate: Active goal {{user}} is working toward. No immediate deadline. Most quests should be moderate.
   - low: Background aspiration or opportunity. Would be nice but no pressure.
   - resolved: Goal achieved, abandoned, or superseded. Stays one turn, then auto-dropped.

4. TIER + CAP TEST: Main quests (MAX 3) = arcs where failure or abandonment reshapes the entire story. Side quests (MAX 4) = enriching but optional. If you have more entries than the cap, CONSOLIDATE or DEMOTE — never exceed. Count your entries before emitting. A single-scene event (one meeting, one fight, one conversation) is NEVER a quest — it belongs in sceneSummary.`;

const _DELTA_MODE = `You are in DELTA mode. The previous state is provided for reference.
1. ONLY return fields whose values CHANGED since the previous state.
2. OMIT any field whose value is identical to the previous state.
3. ALWAYS include: time, date, elapsed (these change every turn).
4. For characters/relationships: include ONLY entities with changes. Include the FULL entity object (all fields) if ANY field changed.
5. For quests: include the FULL array if ANY quest was added/removed/modified. Omit entirely if unchanged.
6. plotBranches: ALWAYS include (fresh suggestions every time).
7. charactersPresent: ALWAYS include, re-verified from THIS turn's narration. Use an empty array [] when {{user}} is alone. Omitting this field is a BUG — the client interprets it as an implicit empty array and will mark everyone as absent. This field overrides rule 1 above: it must be present every turn regardless of whether it changed.
8. Do NOT echo unchanged data. Omitting a field means "unchanged" (except for the ALWAYS-include fields above).`;

/**
 * Default text per slot. The `fields` slot is omitted because it is
 * dynamically generated from settings — the assembler builds it via
 * `buildFieldSpecs` rather than reading text from here.
 */
export const DEFAULT_SLOT_TEXT = Object.freeze({
    role: _ROLE,
    criticalRules: _CRITICAL_RULES,
    language: _LANGUAGE,
    nameAwareness: _NAME_AWARENESS,
    questValidation: _QUEST_VALIDATION,
    deltaMode: _DELTA_MODE,
});

/**
 * Resolve the effective text for a slot, applying any user override.
 *
 * @param {string} slotId
 * @param {{ promptOverrides?: Object<string, string> } | null | undefined} profile
 * @returns {string} The override text if present and non-empty, else the default.
 */
export function getSlotText(slotId, profile) {
    const override = profile?.promptOverrides?.[slotId];
    if (typeof override === 'string' && override.trim()) return override;
    return DEFAULT_SLOT_TEXT[slotId] ?? '';
}

/**
 * Has the profile customized this slot? Used by the editor UI to surface
 * the "Revert to default" affordance only on slots that actually differ.
 */
export function isSlotOverridden(slotId, profile) {
    const override = profile?.promptOverrides?.[slotId];
    return typeof override === 'string' && override.trim().length > 0;
}
