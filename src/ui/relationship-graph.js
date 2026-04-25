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
//     ],
//     // v6.8.41: organizations tracking — which characters belong to
//     // which groups (cults, schools, precincts, guilds, ships, clans...).
//     // The same character can belong to multiple orgs. The filter UI
//     // reads this directly to build org-highlight dropdowns.
//     organizations: [
//       {
//         name: string,           // e.g. "5th Precinct Police", "The Crimson Hand Cult"
//         kind: string,           // genre-neutral category: "police", "cult", "school",
//                                 //   "guild", "crew", "faction", "family", "company", etc.
//         members: string[],      // canonical NPC names that belong (never {{user}})
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

// v6.8.41: Organization highlight palette. When a user filters to a
// specific org in the relationship web, its members get a colored
// halo using one of these. The color is picked deterministically
// from the org's hashed name so the same org always gets the same
// color across re-opens. Distinct from the edge-type palette so
// org highlights don't visually collide with edge colors.
export const ORG_COLORS = Object.freeze([
    '#f59e0b', // amber
    '#10b981', // emerald
    '#ef4444', // red
    '#8b5cf6', // violet
    '#06b6d4', // cyan
    '#f97316', // orange
    '#ec4899', // pink
    '#84cc16', // lime
    '#14b8a6', // teal
    '#a855f7', // purple
    '#eab308', // yellow
    '#22c55e', // green
]);

// Deterministic hash-based color picker for a given org name.
export function orgColor(orgName) {
    if (!orgName) return ORG_COLORS[0];
    let h = 5381;
    for (let i = 0; i < orgName.length; i++) h = ((h << 5) + h + orgName.charCodeAt(i)) | 0;
    return ORG_COLORS[Math.abs(h) % ORG_COLORS.length];
}

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
// v6.8.41: kept for back-compat — callers that want the full graph
// should use getCachedGraph() which also returns organizations.
export function getCachedEdges() {
    const snap = getLatestSnapshot();
    if (!snap) return null;
    const fp = _fingerprint(snap);
    const cache = _getCache();
    if (!cache || cache.fingerprint !== fp) return null;
    return Array.isArray(cache.edges) ? cache.edges : [];
}

// v6.8.41: Read the full cached graph (edges + organizations). Returns
// null if no cache or stale cache, or an object `{edges, organizations}`
// where either field may be an empty array. Gracefully handles legacy
// caches from <v6.8.41 that only stored `edges`.
export function getCachedGraph() {
    const snap = getLatestSnapshot();
    if (!snap) return null;
    const fp = _fingerprint(snap);
    const cache = _getCache();
    if (!cache || cache.fingerprint !== fp) return null;
    return {
        edges: Array.isArray(cache.edges) ? cache.edges : [],
        organizations: Array.isArray(cache.organizations) ? cache.organizations : [],
    };
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

    return `You are a relationship-graph analyst. Given a list of characters from an ongoing story of ANY genre (modern, medieval, fantasy, sci-fi, historical, slice-of-life, noir, post-apocalyptic, wuxia, space opera, urban fantasy, western, horror, romance, or anything else), output a JSON object with TWO fields: \`edges\` (NPC\u2194NPC connections) and \`organizations\` (groups/factions/institutions that the characters belong to). NEVER include ${userName} in either \u2014 ${userName} is the player and has a separate tracker.

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

## Organizations (new in v6.8.41)
In addition to edges, detect the **organizations / factions / institutions** characters belong to. An "organization" is any named group of 2+ characters bound by a shared affiliation:

- Modern: police precinct, hospital, company, news agency, school, political party, gang
- Medieval/fantasy: knightly order, mage's college, thieves' guild, noble house, temple, clan, cult, coven, adventuring party
- Sci-fi: starfleet, resistance, corporation, colonial authority, away team, ship's crew, hive, syndicate
- Historical: legion, dynasty, trading company, ship's company, expedition
- Slice-of-life: teaching staff, student council, sports team, band, book club, friend group, family unit
- Any setting: brotherhood, sisterhood, order, circle, league, sect, cult, faction, crew, squad, pack, household

**CRITICAL**: distinguish DIFFERENT organizations even when they sound similar. If the story has two separate cults ("The Crimson Hand" and "The Veiled Ones"), emit them as **two separate organizations** with different members. If two detectives are from different precincts, emit two different precincts. The whole point of this field is to let the user filter characters by specific institution, which requires unique naming.

**What to emit as an organization**:
- 2 or more characters who share a specific named institution
- Use the specific name from the story if known ("5th Precinct Police", "The Crimson Hand Cult", "House Velaryon", "USS Endeavor Bridge Crew")
- If no name is given but the group is clearly a distinct unit, use a descriptive name ("Precinct Patrol Unit", "Hospital ER Staff", "Wizard's Council")
- The \`kind\` field is a genre-neutral category ("police", "cult", "school", "guild", "crew", "faction", "family", "company", "religious order", "noble house", "academic", "military unit", "criminal", etc.)

**What NOT to emit**:
- Loose groupings that aren't actually institutions ("people in the same room")
- A single character as their own organization
- {{user}} as a member of any organization

## Output format
Output a single JSON object with two fields:

\`\`\`
{
  "edges": [
    { "from": "...", "to": "...", "type": "...", "label": "..." },
    ...
  ],
  "organizations": [
    { "name": "...", "kind": "...", "members": ["...", "..."] },
    ...
  ]
}
\`\`\`

Edge fields:
- "from": name of the character whose view this is (must be one of the listed characters, never ${userName})
- "to": name of the other character (must be one of the listed characters, never ${userName})
- "type": one of the edge types above
- "label": 1-4 word phrase describing the specific connection. Prefer specific labels that fit the genre.

Organization fields:
- "name": specific organization name (use story-given names when available, descriptive when not). Each org must have a UNIQUE name.
- "kind": genre-neutral category — one or two words. Examples: "police", "cult", "school", "guild", "crew", "family", "company", "religious order", "noble house", "academic", "military unit", "criminal".
- "members": array of character names that belong. A character can appear in multiple organizations' member lists.

Output ONLY the JSON object. No prose, no markdown fences, no commentary. Example shapes for different genres \u2014 use these as **structural templates**, not content to copy:

Modern procedural (two separate precincts working the same case):
{
  "edges": [
    {"from":"Detective Alvarez","to":"Detective Wong","type":"ally","label":"case partner"},
    {"from":"Officer Jones","to":"Detective Alvarez","type":"acquaintance","label":"cross-precinct"}
  ],
  "organizations": [
    {"name":"5th Precinct Detectives","kind":"police","members":["Detective Alvarez","Detective Wong"]},
    {"name":"12th Precinct Patrol","kind":"police","members":["Officer Jones"]}
  ]
}

Medieval fantasy (a knightly order + a rival mage's council):
{
  "edges": [
    {"from":"Sir Aldric","to":"Squire Tam","type":"mentor","label":"knight and squire"},
    {"from":"Lyra the Mage","to":"Archmage Orin","type":"acquaintance","label":"council peer"},
    {"from":"High Lord Varys","to":"Sir Aldric","type":"authority","label":"sworn lord"}
  ],
  "organizations": [
    {"name":"Order of the Silver Hawk","kind":"knightly order","members":["Sir Aldric","Squire Tam","High Lord Varys"]},
    {"name":"Veiled Council of Mages","kind":"mage circle","members":["Lyra the Mage","Archmage Orin"]}
  ]
}

Sci-fi (crew of one ship + visitors from another):
{
  "edges": [
    {"from":"Commander Shen","to":"Lieutenant Vale","type":"authority","label":"commanding officer"},
    {"from":"Dr. Okafor","to":"Tech Specialist Ren","type":"ally","label":"away team"}
  ],
  "organizations": [
    {"name":"USS Endeavor Bridge Crew","kind":"ship crew","members":["Commander Shen","Lieutenant Vale","Captain Iwata"]},
    {"name":"Research Team Gamma","kind":"science team","members":["Dr. Okafor","Tech Specialist Ren"]}
  ]
}

Multi-cult horror (TWO different cults worshipping different things):
{
  "edges": [
    {"from":"Brother Malachi","to":"Sister Ada","type":"ally","label":"cultmate"},
    {"from":"Brother Malachi","to":"Elder Thorne","type":"antagonist","label":"rival cult leader"}
  ],
  "organizations": [
    {"name":"The Crimson Hand","kind":"cult","members":["Brother Malachi","Sister Ada"]},
    {"name":"The Veiled Ones","kind":"cult","members":["Elder Thorne","Prophet Vex","Acolyte Kara"]}
  ]
}

The structure is identical across genres. Only the labels change. Your job is to apply the same structural reasoning to WHATEVER genre the characters come from, using specific names and kinds that fit the story's world. **Always distinguish separate institutions even when they share a kind.**

${characters.length === 0 ? 'No characters to analyze — output {"edges":[],"organizations":[]}' : `Output the JSON object now. Target: ${targetMin}\u2013${targetMax} edges, plus any organizations you detect.`}`;
}

// ── Parsing + validation ────────────────────────────────────────────────
// Parse the raw LLM response into a validated {edges, organizations}
// object. Drops anything malformed instead of throwing so a partially-
// broken response still produces a partial graph.
//
// v6.8.41: response format changed from a bare array of edges to an
// object { edges: [...], organizations: [...] }. This parser handles
// BOTH formats for back-compat with cached graphs from older versions:
//   - If the root is an array, treat it as the edges list and emit
//     organizations: [].
//   - If the root is an object with `edges` / `organizations` fields,
//     parse each independently.
function _parseGraph(raw, validNames, userName) {
    const empty = { edges: [], organizations: [] };
    if (typeof raw !== 'string') {
        warn('relationship-graph: non-string response — got', typeof raw);
        return empty;
    }
    if (!raw.trim()) {
        warn('relationship-graph: empty response from LLM');
        return empty;
    }
    // Strip code fences and leading/trailing prose.
    let cleaned = raw.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    // Find the outermost JSON span. Try object-first (new format),
    // fall back to array (legacy format).
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');
    // Prefer object format when both are present AND the object
    // encloses the array (or at least starts first).
    const useObject = firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace &&
        (firstBracket === -1 || firstBrace < firstBracket);
    if (!useObject && (firstBracket === -1 || lastBracket === -1 || lastBracket < firstBracket)) {
        const preview = raw.substring(0, 400).replace(/\n/g, ' \u21B5 ');
        warn('relationship-graph: no JSON object or array found in response. First 400 chars:', preview);
        return empty;
    }
    if (useObject) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    } else {
        cleaned = cleaned.substring(firstBracket, lastBracket + 1);
    }
    let parsed;
    try { parsed = JSON.parse(cleaned); }
    catch (e) {
        const preview = cleaned.substring(0, 400).replace(/\n/g, ' \u21B5 ');
        warn('relationship-graph: JSON parse failed:', e?.message, '| Attempted to parse:', preview);
        return empty;
    }

    // Normalize: whatever format we got, extract rawEdges and rawOrgs.
    let rawEdges = [];
    let rawOrgs = [];
    if (Array.isArray(parsed)) {
        // Legacy bare-array format
        rawEdges = parsed;
    } else if (parsed && typeof parsed === 'object') {
        rawEdges = Array.isArray(parsed.edges) ? parsed.edges : [];
        rawOrgs = Array.isArray(parsed.organizations) ? parsed.organizations : [];
    } else {
        warn('relationship-graph: parsed value is neither object nor array, got', typeof parsed);
        return empty;
    }

    const validSet = new Set(validNames.map(n => n.toLowerCase().trim()));
    const userLow = (userName || '').toLowerCase().trim();
    const typeSet = new Set(EDGE_TYPES);

    // Build a canonical case-sensitive lookup so we can restore proper
    // casing when the model emits lowercased names.
    const canonByLow = new Map();
    for (const n of validNames) canonByLow.set(n.toLowerCase().trim(), n);

    // ── Parse edges ─────────────────────────────────────────
    const cleanedEdges = [];
    for (const entry of rawEdges) {
        if (!entry || typeof entry !== 'object') continue;
        const rawFrom = String(entry.from || '').trim();
        const rawTo = String(entry.to || '').trim();
        if (!rawFrom || !rawTo) continue;
        const fromLow = rawFrom.toLowerCase();
        const toLow = rawTo.toLowerCase();
        if (userLow && (fromLow === userLow || toLow === userLow)) continue;
        if (!validSet.has(fromLow) || !validSet.has(toLow)) continue;
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
    const finalEdges = result.slice(0, 30);

    // ── Parse organizations ────────────────────────────────
    // Validate each org: must have a non-empty name, a non-empty member
    // list with at least 2 valid known characters, and a kind (default
    // to "group" if missing). Dedup members within each org. Skip orgs
    // that collapse to <2 members after validation.
    const cleanedOrgs = [];
    const seenOrgNames = new Set();
    for (const entry of rawOrgs) {
        if (!entry || typeof entry !== 'object') continue;
        const orgName = String(entry.name || '').trim().substring(0, 80);
        if (!orgName) continue;
        const orgKey = orgName.toLowerCase();
        if (seenOrgNames.has(orgKey)) continue; // dedup by name
        const orgKind = String(entry.kind || 'group').trim().substring(0, 30).toLowerCase() || 'group';
        const rawMembers = Array.isArray(entry.members) ? entry.members : [];
        const validMembers = [];
        const seenMembers = new Set();
        for (const m of rawMembers) {
            const name = String(m || '').trim();
            if (!name) continue;
            const low = name.toLowerCase();
            if (userLow && low === userLow) continue; // {{user}} guard
            if (!validSet.has(low)) continue;          // must be a known character
            if (seenMembers.has(low)) continue;        // dedup members
            seenMembers.add(low);
            validMembers.push(canonByLow.get(low) || name);
        }
        // Orgs with fewer than 2 valid members are useless for filtering
        if (validMembers.length < 2) continue;
        seenOrgNames.add(orgKey);
        cleanedOrgs.push({ name: orgName, kind: orgKind, members: validMembers });
    }

    return { edges: finalEdges, organizations: cleanedOrgs };
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
        const cache = {
            fingerprint: _fingerprint(snap),
            generatedAt: Date.now(),
            edges: [],
            organizations: [],
        };
        _setCache(cache);
        return { edges: cache.edges, organizations: cache.organizations };
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
            // v6.22.0: route through applyPromptRole so the user's
            // profile.systemPromptRole choice propagates to this helper
            // call too. The systemPrompt text itself stays hardcoded —
            // this is a single-purpose JSON generator, not a tunable
            // tracker-generation surface, so it doesn't get its own slot.
            const { applyPromptRole } = await import('../prompts/role.js');
            raw = await generateRaw(applyPromptRole({
                systemPrompt: 'You are a structured JSON generator. Output only valid JSON.',
                prompt,
            }));
        } else {
            throw new Error('No LLM call function available on SillyTavern context');
        }
    } catch (e) {
        warn('relationship-graph: LLM call failed:', e?.message);
        throw e;
    }

    const validNames = characters.map(c => c.name).filter(Boolean);
    const { edges, organizations } = _parseGraph(raw, validNames, userName);
    log('relationship-graph: parsed', edges.length, 'edges and', organizations.length, 'organizations from response');

    const cache = {
        fingerprint: _fingerprint(snap),
        generatedAt: Date.now(),
        edges,
        organizations,
    };
    _setCache(cache);
    return { edges, organizations };
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
