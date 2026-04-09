// src/ui/relationship-graph.js — v6.8.27
// NPC↔NPC relationship graph: batch inference + caching + edge data operations.
//
// Architecture (Phase 1 per unified multi-discipline review):
// Instead of asking the main tracker prompt to emit NPC↔NPC relations every
// turn (expensive, poor compliance, rare usage), this module lazily generates
// a relationship graph on demand when the user opens the web overlay. The
// result is cached in chatMetadata keyed by a snapshot fingerprint so
// re-opening the overlay without new generations is free.
//
// Cost profile: ~2000 tokens in + ~1500 tokens out per generation, cached
// across reopens within the same snapshot set. Opt-in via
// settings.npcRelationshipGraph (default false — must be enabled in the
// settings drawer to unlock the feature).
//
// Data model:
//   cache = {
//     fingerprint: string,  // hash of character names + archetypes + roles
//     generatedAt: number,  // ms epoch
//     edges: [
//       {
//         from: string,           // canonical name (NPC, never {{user}})
//         to: string,             // canonical name (NPC, never {{user}})
//         type: string,           // one of EDGE_TYPES
//         label: string,          // 1-4 word phrase
//         direction: 'from-to' | 'reciprocal',  // reciprocal = both agree on the tie
//       },
//       ...
//     ]
//   }
//
// The edges are ALREADY directed at storage time — if both A→B and B→A
// exist in the model's output, we collapse them into a single reciprocal
// edge during post-processing so the renderer doesn't have to do it.

import { log, warn } from '../logger.js';
import { getSettings, saveSettings, getLatestSnapshot } from '../settings.js';

// Canonical edge types. Mirrors the archetype set but uses generic
// relationship nouns instead of {{user}}-facing terms ("family" stays but
// "background"/"pet" drop out since those aren't bidirectional bonds).
export const EDGE_TYPES = Object.freeze([
    'family',
    'friend',
    'ally',
    'rival',
    'antagonist',
    'mentor',
    'authority',
    'lover',
    'lust',
    'acquaintance',
    'unknown',
]);

// Edge glyphs — emoji markers rendered on the edge midpoint so color-blind
// users can identify edge types without relying on the palette alone.
// Emojis chosen for clarity at 10-12px rendering.
export const EDGE_GLYPHS = Object.freeze({
    family: '\u2693',      // anchor — "anchored to the family"
    friend: '\u2661',      // white heart outline
    ally: '\u25C6',        // diamond — solidarity
    rival: '\u2694',       // crossed swords
    antagonist: '\u2716',  // heavy multiplication X
    mentor: '\u2605',      // black star — guidance
    authority: '\u2692',   // hammer — institutional
    lover: '\u2665',       // filled heart
    lust: '\u263D',        // crescent moon — night/desire
    acquaintance: '\u25CB', // white circle — faint tie
    unknown: '\u25A1',     // white square — blank
});

// Edge colors matching the archetype palette. Kept separately from the
// archetype CSS to avoid reaching into CSS variables from JS at render time.
export const EDGE_COLORS = Object.freeze({
    family: '#b68ae0',
    friend: '#7dd3c0',
    ally: '#6ab8e0',
    rival: '#d4a855',
    antagonist: '#d45050',
    mentor: '#a1d080',
    authority: '#8a9bb5',
    lover: '#e07ab0',
    lust: '#c74a6a',
    acquaintance: '#9a9a9a',
    unknown: '#6e6e6e',
});

// ── Fingerprint ─────────────────────────────────────────────────────────
// A fingerprint is a deterministic string derived from the current set of
// tracked characters. If the fingerprint changes (new character, archetype
// shift, name change, significant role edit), the cached graph is stale
// and regeneration is offered to the user. We intentionally DON'T hash
// the entire snapshot — small scene changes shouldn't invalidate the
// graph, only identity-level changes.
function _fingerprint(snapshot) {
    if (!snapshot || !Array.isArray(snapshot.characters)) return 'empty';
    const parts = [];
    for (const ch of snapshot.characters) {
        if (!ch || !ch.name) continue;
        const name = ch.name.toLowerCase().trim();
        const arch = (ch.archetype || '').toLowerCase().trim();
        // Include a short role excerpt so "Jenna: friend" vs "Jenna: rival's
        // sister" regenerates, but typo-level role edits don't.
        const roleKey = (ch.role || '').toLowerCase().trim().substring(0, 40);
        parts.push(`${name}|${arch}|${roleKey}`);
    }
    parts.sort();
    // Simple djb2 hash of the joined string — collision-resistant enough
    // for cache key purposes at typical chat sizes.
    const joined = parts.join(';');
    let h = 5381;
    for (let i = 0; i < joined.length; i++) {
        h = ((h << 5) + h + joined.charCodeAt(i)) | 0;
    }
    return (h >>> 0).toString(36);
}

// ── Cache ───────────────────────────────────────────────────────────────
// The cache lives in chatMetadata.scenepulse.relationshipGraph — persists
// per-chat, so different chats each have their own graph. Cleared when
// the user clicks "Regenerate" or when the fingerprint changes.
function _getCache() {
    try {
        const m = SillyTavern.getContext().chatMetadata;
        if (!m || !m.scenepulse) return null;
        return m.scenepulse.relationshipGraph || null;
    } catch { return null; }
}

function _setCache(cache) {
    try {
        const m = SillyTavern.getContext().chatMetadata;
        if (!m) return;
        if (!m.scenepulse) m.scenepulse = { snapshots: {} };
        m.scenepulse.relationshipGraph = cache;
        SillyTavern.getContext().saveMetadata();
    } catch (e) { warn('relationship-graph: cache save failed:', e?.message); }
}

export function clearCache() {
    try {
        const m = SillyTavern.getContext().chatMetadata;
        if (m?.scenepulse?.relationshipGraph) {
            delete m.scenepulse.relationshipGraph;
            SillyTavern.getContext().saveMetadata();
            log('relationship-graph: cache cleared');
        }
    } catch (e) { warn('relationship-graph: cache clear failed:', e?.message); }
}

// Read cached edges if the fingerprint still matches the current snapshot.
// Returns null if no cache, stale cache, or empty cache.
export function getCachedEdges() {
    const snap = getLatestSnapshot();
    if (!snap) return null;
    const fp = _fingerprint(snap);
    const cache = _getCache();
    if (!cache || cache.fingerprint !== fp) return null;
    return Array.isArray(cache.edges) ? cache.edges : [];
}

// Is the current cache stale (different fingerprint) vs the latest snap?
// Used to show a "regenerate available" indicator in the UI.
export function isCacheStale() {
    const snap = getLatestSnapshot();
    if (!snap) return false;
    const cache = _getCache();
    if (!cache) return false;
    return cache.fingerprint !== _fingerprint(snap);
}

// ── Prompt construction ─────────────────────────────────────────────────
// Build the batch inference prompt. Takes the list of tracked characters
// with their archetypes and roles, asks the model to emit a compact JSON
// array of directed edges between them, and returns the prompt string.
//
// Prompt design decisions:
//   1. List characters with archetype + role + 1-sentence description so the
//      model has enough context to infer relationships without pulling the
//      entire chat history.
//   2. Provide the enum inline with 1-line descriptions so the model doesn't
//      have to guess semantics.
//   3. Ask for ASYMMETRIC edges with explicit example — this is the hardest
//      thing to get right (models love to symmetrize).
//   4. Cap at 30 edges total to keep output bounded even for large rosters.
//   5. Explicit "do not include {{user}}" rule at top AND bottom.
function _buildPrompt(characters, userName) {
    const charLines = characters.map(ch => {
        const name = ch.name || '?';
        const arch = ch.archetype ? `[${ch.archetype}]` : '';
        const role = ch.role ? ` — ${ch.role.substring(0, 120)}` : '';
        return `- ${name} ${arch}${role}`;
    }).join('\n');

    const n = characters.length;
    // v6.8.39: soft minimum edge quota based on roster size. For small
    // rosters (2-3) we expect 1-3 edges; for medium (4-6) we expect
    // 4-8; for large (7+) we want ~1.5x the roster so the graph
    // actually visualizes the web rather than 1-2 hand-picked ties.
    const targetMin = n <= 2 ? Math.max(0, n - 1) : n <= 4 ? n : Math.ceil(n * 1.3);
    const targetMax = Math.min(30, Math.ceil(n * 2.5));

    return `You are a relationship-graph analyst. Given a list of characters from an ongoing story of ANY genre (modern, medieval, fantasy, sci-fi, historical, slice-of-life, noir, post-apocalyptic, wuxia, space opera, urban fantasy, western, horror, romance, or anything else), output a JSON array of the connections BETWEEN THEM (NPC\u2194NPC only \u2014 NEVER include ${userName} in the graph; ${userName} is the player and has a separate relationship tracker).

## Tracked characters
${charLines}

## Task
For EACH PAIR of characters in the roster, ask: "do these two people share any structure, history, or active story tie?" Emit an edge when the answer is yes. Work through the list systematically. A complete pairwise pass produces a richer, more honest graph than cherry-picking only the most dramatic ties.

## Target edge count
Roster has **${n} characters** \u2014 aim for **${targetMin}\u2013${targetMax} total edges**. If you emit fewer than ${targetMin}, you are undercounting structural ties. If you emit more than ${targetMax}, you are inventing connections that aren't supported by the role descriptions.

## How to find edges \u2014 genre-independent patterns

The story's setting doesn't matter. The STRUCTURES that generate relationships are the same across every genre. Ask these questions for each pair:

### 1. Do they share a hierarchy?
Any ranking system where one answers to another. Examples across genres \u2014 these are **illustrations, not a closed list**:
- Modern: boss/employee, captain/officer, doctor/nurse, president/staff
- Military: commanding officer/subordinate, sergeant/private
- Medieval/fantasy: lord/vassal, knight/squire, master/apprentice, guildmaster/journeyman, high priest/acolyte
- Sci-fi: captain/crew, admiral/ensign, council/delegate, AI overseer/operator
- Academic: professor/student, dean/faculty, mentor/trainee
- Criminal/political: boss/lieutenant, elder/initiate, handler/agent
- Religious: abbot/monk, archbishop/priest, high matriarch/novice
- **Any setting where one person has formal power to reward, punish, command, or evaluate another.**
\u2192 emit **authority** (or **mentor** if the defining feature is teaching rather than commanding)

### 2. Do they share a team, unit, or working group?
Small groups bound by shared purpose and proximity. Examples \u2014 again, illustrations only:
- Modern: patrol partners, shift partners, surgical team, news crew, band members
- Medieval/fantasy: adventuring party, fellowship, warband, coven, pack, circle of mages, hunting party, war-council
- Sci-fi: bridge crew, away team, strike team, science team, pod, squadron
- Historical: expedition, convoy, regiment, royal retinue, ship's company, caravan
- Any setting: cell, clique, crew, ensemble, faction, fellowship, outfit, posse, ring, squad, troupe
\u2192 emit **ally** (if actively working together on a current goal), **acquaintance** (if just same-team default), or **friend** (if the team bond has developed into genuine platonic warmth)

### 3. Do they belong to the same organization, order, house, or clan?
Larger institutions where all members are at least nominally related. Examples:
- Modern: company, agency, police force, hospital, university, newsroom, political party
- Medieval/fantasy: knightly order, mage's college, thieves' guild, noble house, temple, clan, school of sorcery
- Sci-fi: starfleet, resistance, corporation, colonial authority, hive, syndicate
- Historical: legion, dynasty, senate, trading company
- Any setting: brotherhood, sisterhood, circle, confederation, cult, federation, league, network, sect, tribe, union
\u2192 usually **acquaintance** as the default, or **ally**/**rival** if they're pulling the same or different ways within the org

### 4. Do they share a household, camp, caravan, ship, or lodging?
People physically living together usually form ties. Examples: family home, monastery, barracks, starship quarters, tribal longhouse, refugee camp, traveling troupe, pirate ship, noble's palace, academy dormitory, space station district, post-apocalyptic bunker, wizard's tower, inn regulars.
\u2192 **family** if they're actually kin; otherwise **friend** / **acquaintance** depending on warmth.

### 5. Do they share a craft, calling, or role-type?
Two people with the same profession are usually peers even when not formally organized. Examples:
- Any kind of **healer** (doctor, medic, cleric, herbalist, shaman, med-tech, chirurgeon, priestess of healing) \u2014 peers in their craft
- Any kind of **warrior** (soldier, knight, samurai, mercenary, ranger, paladin, stormtrooper, bounty hunter) \u2014 professional peers
- Any kind of **scholar** (professor, mage, alchemist, engineer, researcher, scribe, xenobiologist) \u2014 academic peers
- Any kind of **performer** (bard, actor, musician, courtesan, dancer, oracle) \u2014 craft peers
- Any kind of **spy/scout** (agent, operative, ranger, assassin, informant, recon) \u2014 shadow peers
- **The pattern generalizes: two characters in the same line of work know of each other by reputation even without specific dialogue.**
\u2192 usually **acquaintance** as default, **rival** if competitive, **ally** if currently working together

### 6. Is there a vertical teaching relationship?
Teacher/student, master/apprentice, mentor/trainee, elder/novice, initiator/initiate. Present in every genre (martial arts master, wizard's apprentice, knight's squire, academic advisor, crime boss grooming a protege, sage and disciple, captain training a new officer).
\u2192 emit **mentor** on the teaching side

### 7. Is there a named story-specific tie?
- Named friendships, romances, feuds, rivalries, oaths, debts, grudges, pacts, marriages, betrayals
- Family relationships explicitly stated (brother, mother, cousin, bastard child, sworn brother, blood sister, adopted son)
- Role text that mentions another named character ("Jenna's sister", "Marcus's liegeman", "Captain Reyes' second-in-command", "the Duke's former lover")
- Role text sharing a last name or clan name usually implies **family**
\u2192 emit the specific type (**family**, **lover**, **antagonist**, etc.) with a descriptive label

## What does NOT count as an edge
- A service worker who interacted once in passing with no role beyond the service (a one-time waiter, a cab driver, a guard who checked papers)
- Strangers who happened to share a room with no interaction
- Background crowd members with no role description
- Connections you would have to invent from pure genre convention with no evidence in the listed roles (don't assume all elves hate all dwarves; don't assume all soldiers are bitter; don't assume all nobles know each other)

## Rules
1. NEVER include ${userName} as \`from\` or \`to\`. This graph is NPC\u2194NPC only.
2. Asymmetry is allowed and valuable \u2014 A's view of B may differ from B's view of A. Emit both sides when they meaningfully differ (e.g. A loves B but B is using A, or one is a mentor and the other is a resentful student).
3. If two characters are symmetrically related (mutual colleagues, mutual friends, partners, fellow members), emit just ONE edge; the renderer will display it as reciprocal.
4. Characters marked [background] should have NO edges unless they have a specific named tie to another character.
5. Characters marked [pet] CAN have edges to other NPCs when meaningful (a bonded cat, a war-hound, a familiar, a pack animal's handler). Their tie to ${userName} is tracked separately; don't include it here.
6. Hard cap: maximum 30 edges total. Prioritize structural ties + named narrative ties.

## Edge types (pick the most specific that fits)
- **family**: blood/legal/adopted kin (parent, sibling, child, spouse-as-kin, clan relative, sworn brother)
- **lover**: romantic partner or active romantic interest (emotional bond)
- **lust**: purely sexual, no romance
- **antagonist**: actively opposes the other
- **mentor**: teaches/trains/guides the other (knowledge flow is the defining feature \u2014 magic tutor, combat instructor, academic advisor, wise elder, etc.)
- **authority**: has institutional power over the other (commanding officer, liege, master, abbot, guildmaster, boss, judge, king)
- **rival**: competitive tension, not hostile (fellow candidates, friendly rivals, competitors for the same prize)
- **ally**: actively supports the other's goals \u2014 "we are pulling the same rope right now"
- **friend**: established platonic bond with real warmth
- **acquaintance**: knows each other but no strong bond \u2014 the honest default for same-organization peers without specific feelings established
- **unknown**: connection exists but type unclear

When in doubt between friend and acquaintance, pick **acquaintance**. When in doubt between authority and mentor, pick whichever feature dominates the current scene \u2014 power asymmetry = authority, skill transfer = mentor. When in doubt between lover and lust, pick lover if there's ANY emotional investment, lust only if it's purely physical on both sides.

## Output format
A JSON array of objects. Each object has:
- "from": name of the character whose view this is (must be one of the listed characters, never ${userName})
- "to": name of the other character (must be one of the listed characters, never ${userName})
- "type": one of the edge types above
- "label": 1-4 word phrase describing the specific connection. Prefer specific labels over generic ones. The label should fit the genre of the story \u2014 "patrol partner" fits modern, "sworn brother" fits medieval, "bridge officer" fits sci-fi, "fellow apprentice" fits fantasy.

Output ONLY the JSON array. No prose, no markdown fences, no commentary. Example shapes for different genres \u2014 use these as **structural templates**, not content to copy:

Modern procedural:
[
  {"from":"Detective Alvarez","to":"Detective Wong","type":"ally","label":"case partner"},
  {"from":"Officer Jones","to":"Detective Alvarez","type":"acquaintance","label":"same precinct"}
]

Medieval fantasy:
[
  {"from":"Sir Aldric","to":"Squire Tam","type":"mentor","label":"knight and squire"},
  {"from":"Lyra the Mage","to":"Brother Orin","type":"acquaintance","label":"fellow council member"},
  {"from":"High Lord Varys","to":"Sir Aldric","type":"authority","label":"sworn lord"}
]

Sci-fi:
[
  {"from":"Commander Shen","to":"Lieutenant Vale","type":"authority","label":"commanding officer"},
  {"from":"Dr. Okafor","to":"Tech Specialist Ren","type":"ally","label":"away team"},
  {"from":"Captain Iwata","to":"Commander Shen","type":"authority","label":"ship captain"}
]

Slice-of-life:
[
  {"from":"Ms. Tanaka","to":"Principal Kimura","type":"authority","label":"staff"},
  {"from":"Yuki","to":"Haruto","type":"friend","label":"childhood friend"},
  {"from":"Chef Marcus","to":"Lena","type":"mentor","label":"cooking teacher"}
]

The structure (authority, mentor, ally, acquaintance, family) is identical across genres. Only the labels change to match the setting. Your job is to apply the same structural reasoning to WHATEVER genre the listed characters come from, using labels that fit the story's world.

${characters.length === 0 ? 'No characters to analyze — output []' : `Output the JSON array now. Target: ${targetMin}\u2013${targetMax} edges.`}`;
}

// ── Parsing + validation ────────────────────────────────────────────────
// Parse the raw LLM response into a validated edge list. Drops anything
// malformed instead of throwing so a partially-broken response still
// produces a partial graph.
function _parseEdges(raw, validNames, userName) {
    if (typeof raw !== 'string') {
        warn('relationship-graph: non-string response — got', typeof raw);
        return [];
    }
    if (!raw.trim()) {
        warn('relationship-graph: empty response from LLM');
        return [];
    }
    // Strip code fences and leading/trailing prose.
    let cleaned = raw.trim();
    // Remove ```json fences
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    // Find the first [ and last ] so we can handle leading/trailing commentary
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');
    if (firstBracket === -1 || lastBracket === -1 || lastBracket < firstBracket) {
        // v6.8.30: log the first 400 chars of the response so users can see
        // WHY parsing failed (LLM refused, wrapped JSON in prose, returned
        // empty, etc.). Previously this warning gave zero diagnostic info.
        const preview = raw.substring(0, 400).replace(/\n/g, ' \u21B5 ');
        warn('relationship-graph: no JSON array found in response. First 400 chars:', preview);
        return [];
    }
    cleaned = cleaned.substring(firstBracket, lastBracket + 1);
    let parsed;
    try { parsed = JSON.parse(cleaned); }
    catch (e) {
        const preview = cleaned.substring(0, 400).replace(/\n/g, ' \u21B5 ');
        warn('relationship-graph: JSON parse failed:', e?.message, '| Attempted to parse:', preview);
        return [];
    }
    if (!Array.isArray(parsed)) {
        warn('relationship-graph: parsed value is not an array, got', typeof parsed);
        return [];
    }

    const validSet = new Set(validNames.map(n => n.toLowerCase().trim()));
    const userLow = (userName || '').toLowerCase().trim();
    const typeSet = new Set(EDGE_TYPES);

    // Build a canonical case-sensitive lookup so we can restore proper
    // casing when the model emits lowercased names.
    const canonByLow = new Map();
    for (const n of validNames) canonByLow.set(n.toLowerCase().trim(), n);

    const cleanedEdges = [];
    for (const entry of parsed) {
        if (!entry || typeof entry !== 'object') continue;
        const rawFrom = String(entry.from || '').trim();
        const rawTo = String(entry.to || '').trim();
        if (!rawFrom || !rawTo) continue;
        const fromLow = rawFrom.toLowerCase();
        const toLow = rawTo.toLowerCase();
        // {{user}} guard in both directions
        if (userLow && (fromLow === userLow || toLow === userLow)) continue;
        // Both endpoints must be known characters
        if (!validSet.has(fromLow) || !validSet.has(toLow)) continue;
        // No self-edges
        if (fromLow === toLow) continue;
        const rawType = String(entry.type || 'unknown').toLowerCase().trim();
        const type = typeSet.has(rawType) ? rawType : 'unknown';
        const label = String(entry.label || type).trim().substring(0, 40) || type;
        cleanedEdges.push({
            from: canonByLow.get(fromLow) || rawFrom,
            to: canonByLow.get(toLow) || rawTo,
            type,
            label,
            direction: 'from-to',
        });
    }

    // v6.8.36: dedup by (from, to) PAIR, not (from, to, type) triple.
    // A relationship between two characters should be ONE edge. The
    // previous triple-keyed dedup allowed the LLM to emit multiple
    // edges for the same pair with different types (e.g. Reyes→Jane as
    // both "protective colleague" and "grateful"), producing a tangled
    // multi-line rendering. Pick the best-signal type via a ranked
    // priority: stronger narrative ties (family, lover) beat weaker
    // ones (acquaintance, unknown). First non-empty label wins.
    const TYPE_PRIORITY = {
        family: 10,
        lover: 9,
        lust: 8,
        antagonist: 7,
        mentor: 6,
        authority: 6,
        rival: 5,
        ally: 4,
        friend: 3,
        acquaintance: 1,
        unknown: 0,
    };
    const bestByPair = new Map();
    for (const e of cleanedEdges) {
        const key = `${e.from.toLowerCase()}>${e.to.toLowerCase()}`;
        const prev = bestByPair.get(key);
        if (!prev) {
            bestByPair.set(key, e);
            continue;
        }
        // Replace only if the new type has strictly higher priority.
        // Ties keep the first-seen (label + type stable across re-renders).
        const prevP = TYPE_PRIORITY[prev.type] ?? 0;
        const newP = TYPE_PRIORITY[e.type] ?? 0;
        if (newP > prevP) {
            bestByPair.set(key, e);
        }
    }
    const deduped = [...bestByPair.values()];

    // Collapse reciprocal pairs: if both A→B and B→A exist, mark the
    // first one as reciprocal and drop the second. The renderer uses
    // this flag to draw a two-tone edge. After the pair-dedup above,
    // each direction has exactly one type, so the reciprocal detection
    // no longer needs a type suffix on the key.
    const result = [];
    const pairKey = (a, b) => `${a.toLowerCase()}|${b.toLowerCase()}`;
    const indexByPair = new Map();
    for (const e of deduped) {
        const reverseK = pairKey(e.to, e.from);
        if (indexByPair.has(reverseK)) {
            // The reverse was already emitted — mark THAT one as reciprocal
            // and drop this one. The earlier entry wins (label stable).
            result[indexByPair.get(reverseK)].direction = 'reciprocal';
            continue;
        }
        indexByPair.set(pairKey(e.from, e.to), result.length);
        result.push(e);
    }

    // Cap at 30 edges defensively in case the model ignored the prompt cap.
    return result.slice(0, 30);
}

// ── Batch inference entry point ─────────────────────────────────────────
// Called when the user opens the overlay with "generate NPC graph" on,
// or clicks the regenerate button in the overlay. Returns the edge list
// and writes it to the cache. Throws on hard failures so the UI can show
// an error state.
export async function generateGraph() {
    const snap = getLatestSnapshot();
    if (!snap) throw new Error('No snapshot available');
    const characters = Array.isArray(snap.characters) ? snap.characters : [];
    if (characters.length < 2) {
        // Nothing to graph — cache empty and return immediately.
        const cache = { fingerprint: _fingerprint(snap), generatedAt: Date.now(), edges: [] };
        _setCache(cache);
        return cache.edges;
    }

    let userName = 'You';
    try { userName = SillyTavern.getContext().name1 || 'You'; } catch {}

    const prompt = _buildPrompt(characters, userName);
    log('relationship-graph: generating with', characters.length, 'characters, prompt len=', prompt.length);

    // Use the same SillyTavern quiet-prompt path as the main tracker
    // generator. This inherits whatever connection profile the user has
    // configured for ScenePulse — no new connection management here.
    let raw = '';
    try {
        const ctx = SillyTavern.getContext();
        const { generateQuietPrompt, generateRaw } = ctx;
        if (typeof generateQuietPrompt === 'function') {
            raw = await generateQuietPrompt({ quietPrompt: prompt });
        } else if (typeof generateRaw === 'function') {
            raw = await generateRaw({
                systemPrompt: 'You are a structured JSON generator. Output only valid JSON.',
                prompt,
            });
        } else {
            throw new Error('No LLM call function available on SillyTavern context');
        }
    } catch (e) {
        warn('relationship-graph: LLM call failed:', e?.message);
        throw e;
    }

    const validNames = characters.map(c => c.name).filter(Boolean);
    const edges = _parseEdges(raw, validNames, userName);
    log('relationship-graph: parsed', edges.length, 'edges from response');

    const cache = {
        fingerprint: _fingerprint(snap),
        generatedAt: Date.now(),
        edges,
    };
    _setCache(cache);
    return edges;
}

// ── Feature-flag helper ─────────────────────────────────────────────────
// Returns true if the user has opted into NPC↔NPC graph generation. This
// is a per-user setting (default false) not a per-chat metadata flag, so
// enabling it in one chat enables it in all.
export function isEnabled() {
    return getSettings().npcRelationshipGraph === true;
}

export function setEnabled(on) {
    const s = getSettings();
    s.npcRelationshipGraph = !!on;
    saveSettings();
    if (!on) clearCache();
}
