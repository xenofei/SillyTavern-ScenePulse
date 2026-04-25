// src/prompts/assembler.js — Composes the final system prompt (v6.18.0)
//
// Replaces the monolithic 200+ line `buildDynamicPrompt` in schema.js. The
// assembler interleaves:
//   - 6 static slots (text from src/prompts/slots.js, optionally overridden
//     per profile)
//   - 1 dynamic slot ("fields") that produces panel-derived field specs
//     from the live settings — this slot is NOT user-editable as text;
//     users change the field set via the Panels and Fields settings UI.
//
// Backward compatibility:
//   - `profile.systemPrompt` (legacy full-text override) wins over the
//     entire slot system. Users with hand-written prompts upgrade with
//     zero behavior change.
//   - `buildDynamicPrompt(s, opts)` in schema.js delegates here with
//     `profile=null` so all existing callers (settings UI preview, doctor
//     schema check, slash commands) keep working.
//
// Output equivalence: with no profile and no overrides, this assembler
// produces a prompt byte-identical to the pre-v6.18.0 `buildDynamicPrompt`.
// Verified by tests/prompt-assembler.test.mjs.

import { DEFAULTS } from '../constants.js';
import { getLanguage, getActivePanels } from '../settings.js';
import { getSlotText } from './slots.js';

const BRANCH_TYPES = ['dramatic', 'intense', 'comedic', 'twist', 'exploratory'];

// ── Per-section field-spec builders ────────────────────────────────────
//
// Each returns the text block for one section, or '' if the section is
// disabled. Lifted verbatim from schema.js's buildDynamicPrompt — same
// strings, same conditionals, same trailing newlines.

function _dashboardFields(s) {
    const dc = s.dashCards || DEFAULTS.dashCards;
    const env = [];
    if (dc.time !== false) env.push('- time: HH:MM:SS (24h format)');
    if (dc.date !== false) env.push('- date: MM/DD/YYYY (DayName) — e.g. "03/17/2025 (Monday)"');
    if (dc.location !== false) env.push('- location: Immediate > Parent — only 2 levels — e.g. "Kitchen > Windbloom Apartment"');
    if (dc.weather !== false) env.push('- weather: Sky/precipitation only.');
    if (dc.temperature !== false) env.push('- temperature: Include both number AND description. Example: "72°F — warm and humid" or "3°C — biting cold". Never just a number alone.');
    if (!env.length) return '';
    return '\n### Environment\n' + env.join('\n') + '\n';
}

function _sceneFields(s) {
    const ft = s.fieldToggles || {};
    const fields = [];
    if (ft.sceneTopic !== false) fields.push('- sceneTopic: What is happening in this scene in 1-5 words.');
    if (ft.sceneMood !== false) fields.push('- sceneMood: The emotional atmosphere.');
    if (ft.sceneInteraction !== false) fields.push('- sceneInteraction: How the characters are engaging.');
    if (ft.sceneTension !== false) fields.push('- sceneTension: One of: calm, low, moderate, high, critical. Reflects stakes and urgency.');
    if (ft.sceneSummary !== false) fields.push('- sceneSummary: 2-3 sentence factual summary of what is currently happening.');
    if (ft.soundEnvironment !== false) fields.push('- soundEnvironment: What is audible right now.');
    if (ft.charactersPresent !== false) fields.push('- charactersPresent: Array of character names PHYSICALLY PRESENT in the current beat with {{user}}. Only include characters who are in the same location RIGHT NOW, close enough to interact or observe. EXCLUDE anyone {{user}} is merely thinking about, remembering, dreaming of, reading about, or who is in a different location. SOLO SCENES ARE REAL: if {{user}} is alone (walking, hiding, internal monologue, sleeping, meditating, travelling alone), emit an EMPTY array []. An empty charactersPresent is valid and expected for solitude beats. NEVER carry forward the previous scene\'s roster out of habit — re-verify presence from THIS turn\'s narration every time.');
    if (!fields.length) return '';
    return '\n### Scene Analysis (REQUIRED)\n' + fields.join('\n') + '\n';
}

function _characterFields(s) {
    const ft = s.fieldToggles || {};
    const fields = [
        '- name: Character CURRENT canonical name ONLY. Never embed aliases, titles, or parentheticals. WRONG: "Officer Jane (The Entity)". RIGHT: {name: "Officer Jane", aliases: ["The Entity"]}. This rule applies in characters[], relationships[], AND charactersPresent[] — all references to the same character must use the identical canonical name. See the NAME AWARENESS checklist below for how to choose and update this field.',
        '- aliases: Array of former names, placeholders, partial names, or merged identities the character has been known by. Every time you promote a name (placeholder → real, partial → full), the previous value MUST go here. Emit a SINGLE character entry; never a separate entry under an old name. See NAME AWARENESS checklist below.',
    ];
    if (ft.char_archetype !== false) fields.push('- archetype: ONE dominant narrative role. ally=actively supports current goals | friend=platonic bond, no active quest required | rival=competitive, not hostile | mentor=teaches/trains {{user}} (skill/wisdom transfer) | authority=institutional power over {{user}} (boss/cop/judge/commander — power asymmetry is the defining feature, NOT teaching) | antagonist=actively opposes | family=blood/legal kin | lover=romantic partner or interest (emotional bond) | lust=purely sexual, no romance | pet=non-human companion | background=minor NPC with no story weight. Empty string if unclassified. A teacher running a lesson is mentor; the same teacher in a disciplinary meeting is authority — archetype is turn-to-turn mutable.');
    fields.push('- role: WHO this person IS — their identity/title/relationship. NOT feelings.');
    if (ft.char_innerThought !== false) fields.push("- innerThought: The exact sentence in their head, first-person, in their voice. 1-3 sentences. BE them for a sentence. Not a list of emotion labels.");
    if (ft.char_immediateNeed !== false) fields.push('- immediateNeed: What they urgently need RIGHT NOW in this scene.');
    if (ft.char_shortTermGoal !== false) fields.push('- shortTermGoal: What THEY want in the coming hours/days, from their perspective.');
    if (ft.char_longTermGoal !== false) fields.push("- longTermGoal: Their overarching life motivation. NOT the same as {{user}}'s quest journal — a character's goal does not automatically become a quest.");
    if (ft.char_hair !== false) fields.push('- hair: Hair style, color, length.');
    if (ft.char_face !== false) fields.push('- face: Facial features, expression, makeup.');
    if (ft.char_outfit !== false) fields.push('- outfit: Full outfit description including all layers AND current state (neat/rumpled/disheveled/partially undressed). ONE field.');
    if (ft.char_posture !== false) fields.push('- posture: Body language, stance, AND physical state (alert/tense/exhausted/intoxicated/injured). ONE field.');
    if (ft.char_proximity !== false) fields.push("- proximity: Physical distance relative to {{user}} specifically. Examples: 'arm's reach', 'across the table', 'in the next room'.");
    if (ft.char_notableDetails !== false) fields.push("- notableDetails: Distinguishing features that don't fit other fields — scars, tattoos, accents, mannerisms, glasses, disabilities, tells. Optional; empty string if nothing distinctive.");
    if (ft.char_inventory !== false) fields.push('- inventory: ONLY objects (phone, keys, weapons, bags) — NOT clothing');
    if (ft.char_fertility !== false) {
        fields.push('- fertStatus: "active" ONLY when pregnancy/cycle is narratively relevant. "N/A" for children, men, non-humans, and any scenario where fertility isn\'t part of the story.');
        fields.push('- fertNotes: Free-text details (cycle day, pregnancy week, etc) when fertStatus is "active". Empty or "N/A" otherwise.');
    }
    return '\n### Characters (all EXCEPT {{user}}) — MAX 5 entries, named NPCs only\n' + fields.join('\n') + '\n';
}

function _questFields(s) {
    const ft = s.fieldToggles || {};
    const fields = [];
    if (ft.northStar !== false) fields.push("- northStar: {{user}}'s ONE driving dream or life purpose. \"Not yet revealed\" if unknown.");
    if (ft.mainQuests !== false) fields.push('- mainQuests: MAX 3. Primary life arcs that persist across many scenes and take hours/days/weeks of in-story time. NOT scene-level events.');
    if (ft.sideQuests !== false) fields.push('- sideQuests: MAX 4. Optional life paths {{user}} is pursuing in parallel. Also persist across multiple scenes. NOT "things to do this scene".');
    if (!fields.length) return { text: '', includeChecklist: false };
    let block = "\n### Quest Journal (from {{user}}'s perspective)\n" + fields.join('\n');
    const includeChecklist = ft.mainQuests !== false || ft.sideQuests !== false;
    if (includeChecklist) {
        block += "\n- All quests: name + urgency (critical/high/moderate/low/resolved) + detail.\n- ALWAYS from {{user}}'s perspective. If hostile: oppose their goal. If ally: support them as {{user}}'s action.\n- VELOCITY LIMIT: Introduce AT MOST 1 new quest per turn. Scene-level actions belong in sceneSummary, NOT as new quests. Prefer updating existing quests over creating new ones.\n- DURATION TEST: If the task would not still matter 5 scenes from now, it is NOT a quest.\n- Carry forward unresolved quests. You may consolidate duplicates. When a quest is completed in the story, set its urgency to \"resolved\" instead of removing it.\n";
    }
    return { text: block, includeChecklist };
}

function _relationshipFields(s) {
    const ft = s.fieldToggles || {};
    const fields = ['- name: Character name'];
    if (ft.rel_type !== false) fields.push('- relType: Their social role/dynamic with {{user}}. MAX 2 words. Examples: "Co-worker", "Customer", "Bartender", "Childhood friend". No commas, no slashes, no parentheses.');
    if (ft.rel_phase !== false) fields.push('- relPhase: ONE word from this exact list — Strangers, Wary, Cordial, Friendly, Close, Trusted, Bonded, Flirting, Smitten, Intimate, Devoted, Distant, Strained, Estranged, Hostile, Volatile, Unknown. No other words. No punctuation. No qualifiers. Pick the closest if uncertain. Use Strangers for never-met; Unknown only if genuinely unclear from context. RIGHT: "Trusted"  RIGHT: "Flirting"  RIGHT: "Strangers"  WRONG: "Trusted partnership"  WRONG: "Growing closer, testing boundaries"');
    if (ft.rel_timeknown !== false) fields.push("- timeTogether: How long they've known each other");
    if (ft.rel_milestone !== false) fields.push('- milestone: Most recent significant moment between this NPC and {{user}}. MAX 10 words. One concrete event, not a paragraph. No commas chaining clauses, no em-dash continuations, no parenthetical asides. RIGHT: "Covered my shift when no one else would."  RIGHT: "Filed a formal complaint about a wrong order."  WRONG: "She told him coffee was never the point, she was testing his honesty, and now asks if he can keep his hands to himself for the three-block walk—a first for her on this street."  WRONG: "Walked in during the confrontation, observing quietly, and seemed to recognize the tension as familiar from her own past."');
    const meters = [];
    if (ft.rel_affection !== false) meters.push('affection');
    if (ft.rel_trust !== false) meters.push('trust');
    if (ft.rel_desire !== false) meters.push('desire');
    if (ft.rel_stress !== false) meters.push('stress');
    if (ft.rel_compatibility !== false) meters.push('compatibility');
    if (meters.length) fields.push('- Meters (0-100): ' + meters.join(', ') + '. Each meter takes a {meter}Label string. MAX 3 words per label. No commas, no em-dashes, no chained clauses. Title Case. RIGHT: "Warm" / "Building trust" / "Quiet devotion" / "Oil and water". WRONG: "deeply moved, finds him utterly compelling and trustworthy" / "growing sense of shared perspective" / "openly inviting, her hand on his chest, leading him forward".');
    if (ft.rel_desire !== false) fields.push('- desire: 0 for anyone without established sexual interest (family, strangers, minors)');
    return '\n### Relationships (how characters perceive {{user}})\n' + fields.join('\n') + '\n';
}

function _storyIdeaFields(s) {
    const ft = s.fieldToggles || {};
    const enabled = BRANCH_TYPES.filter(t => ft['branch_' + t] !== false);
    if (!enabled.length) return '';
    return `\n### Plot Branches (EXACTLY ${enabled.length} suggestions)\nOne per category: ${enabled.join(', ')}. Each must be SPECIFIC to the current scene — name characters, reference established details. Each needs type, name (2-5 words), hook (1-2 sentences explaining what happens and why it matters).\n`;
}

function _customPanelFields(s) {
    const customPanels = getActivePanels(s).filter(cp => cp.enabled !== false && cp.fields?.length);
    if (!customPanels.length) return '';
    let block = '\n### Custom Tracked Fields\n';
    for (const cp of customPanels) {
        block += `\n#### ${cp.name}\n`;
        for (const f of cp.fields) {
            if (f.enabled === false) continue;
            const typeHint =
                f.type === 'meter' ? '(integer 0-100)' :
                f.type === 'number' ? '(integer)' :
                f.type === 'list' ? '(array of strings)' :
                f.type === 'enum' ? `(one of: ${(f.options || []).join(', ')})` :
                '(string)';
            block += `- ${f.key}: ${f.desc || f.label} ${typeHint}\n`;
        }
    }
    return block;
}

// ── The assembler ──────────────────────────────────────────────────────

/**
 * Build the full system prompt. Replaces the inline body of
 * `buildDynamicPrompt` from schema.js.
 *
 * @param {object} s        Settings (or a profile-projected view of them)
 * @param {object|null} profile  Active profile (for slot overrides). Pass
 *                               null to use defaults — `getActivePrompt`
 *                               always passes a profile; the schema.js
 *                               wrapper passes null so legacy callers see
 *                               default behavior.
 * @param {object} [opts]
 * @param {boolean} [opts.isDelta]      Force delta mode on/off (default: derive from settings)
 * @param {boolean} [opts.hasPrevState] When isDelta isn't set, derive delta from this + s.deltaMode
 * @returns {string}
 */
export function assemblePrompt(s, profile, opts = {}) {
    // Legacy override wins over the slot system entirely. A profile that
    // hand-wrote a complete prompt continues working byte-for-byte.
    if (profile?.systemPrompt && typeof profile.systemPrompt === 'string' && profile.systemPrompt.trim()) {
        return profile.systemPrompt;
    }

    const panels = s.panels || DEFAULTS.panels;
    const isDelta = opts.isDelta != null ? opts.isDelta : (s.deltaMode && opts.hasPrevState);

    // ── Opening section ────────────────────────────────────────────────
    let prompt = `# SCENE TRACKER — JSON OUTPUT ONLY\n\n`;
    prompt += getSlotText('role', profile) + '\n\n';
    prompt += getSlotText('criticalRules', profile) + '\n';

    // ── Body section: field specifications ─────────────────────────────
    prompt += '\n## FIELD SPECIFICATIONS\n';

    const lang = getLanguage();
    if (lang) {
        // Apply ${language} template variable substitution.
        const langText = getSlotText('language', profile).replace(/\$\{language\}/g, lang);
        prompt += '\n' + langText + '\n';
    }

    if (panels.dashboard) prompt += _dashboardFields(s);
    if (panels.scene)     prompt += _sceneFields(s);

    if (panels.characters) {
        prompt += _characterFields(s);
        // Name-awareness checklist embeds inside the characters section
        // because the surrounding instructions only make sense if the
        // characters[] array is part of the schema. The header line stays
        // in the assembler (constant); the checklist body is overridable.
        prompt += '\n#### NAME AWARENESS — run this check for EVERY character, EVERY turn\n';
        prompt += getSlotText('nameAwareness', profile);
    }

    if (panels.quests) {
        const { text, includeChecklist } = _questFields(s);
        prompt += text;
        if (includeChecklist) {
            prompt += '\n#### QUEST VALIDATION — apply ALL tests to every quest before emitting it\n';
            prompt += getSlotText('questValidation', profile);
        }
    }

    if (panels.relationships) prompt += _relationshipFields(s);
    if (panels.storyIdeas)    prompt += _storyIdeaFields(s);
    prompt += _customPanelFields(s);

    // ── Closing section: delta mode (only if applicable) ───────────────
    if (isDelta) {
        prompt += `\n\n## DELTA MODE — RETURN ONLY CHANGES\n`;
        prompt += getSlotText('deltaMode', profile);
        prompt += '\n';
    }

    return prompt;
}
