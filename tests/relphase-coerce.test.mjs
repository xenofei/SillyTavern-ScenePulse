// Manual dev test for src/rel-phase.js — coerceRelPhase()
// Run from project root: node tests/relphase-coerce.test.mjs
//
// v6.15.0: relPhase is a closed enum. The coercer is the second line of defence
// (the schema instruction is the first) — when LLMs drift past the cap or emit
// synonyms, the coercer must catch it deterministically. Behaviour matters
// across model classes: Claude/GPT rarely miss but emit synonyms; Llama 8B and
// Mistral Small frequently emit compound qualifiers that must be salvaged.

import { coerceRelPhase, REL_PHASE_ENUM, REL_PHASE_FAMILY, relPhaseFamily } from '../src/rel-phase.js';

let pass = 0, fail = 0;
const failures = [];

function assertEq(name, actual, expected) {
    if (actual === expected) { pass++; console.log('  OK   ' + name); }
    else {
        fail++;
        failures.push({ name, actual, expected });
        console.log('  FAIL ' + name + ' — expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
    }
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('coerceRelPhase — closed-enum validator');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// ═══════════════════════════════════════════════════════════════════════
// 1. Exact matches (the happy path — Claude/GPT compliance)
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Exact matches ──');
for (const term of REL_PHASE_ENUM) {
    assertEq(`exact "${term}"`, coerceRelPhase(term), term);
}

// ═══════════════════════════════════════════════════════════════════════
// 2. Case insensitivity (model casing drift)
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Case insensitivity ──');
assertEq('lowercase "trusted"',  coerceRelPhase('trusted'),  'Trusted');
assertEq('uppercase "HOSTILE"',  coerceRelPhase('HOSTILE'),  'Hostile');
assertEq('mixed "FlIrTiNg"',     coerceRelPhase('FlIrTiNg'), 'Flirting');
assertEq('lowercase "strangers"',coerceRelPhase('strangers'),'Strangers');

// ═══════════════════════════════════════════════════════════════════════
// 3. Whitespace + punctuation trimming
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Whitespace and punctuation ──');
assertEq('leading space',         coerceRelPhase('  Trusted'),     'Trusted');
assertEq('trailing space',        coerceRelPhase('Friendly  '),    'Friendly');
assertEq('trailing period',       coerceRelPhase('Hostile.'),      'Hostile');
assertEq('quoted',                coerceRelPhase('"Cordial"'),     'Cordial');
assertEq('parenthesised',         coerceRelPhase('(Devoted)'),     'Devoted');
assertEq('with comma',            coerceRelPhase('Bonded,'),       'Bonded');

// ═══════════════════════════════════════════════════════════════════════
// 4. Compound qualifier salvage (Llama 8B / Mistral failure mode)
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Compound qualifier salvage ──');
assertEq('"Trusted partnership"', coerceRelPhase('Trusted partnership'), 'Trusted');
assertEq('"Close friends"',       coerceRelPhase('Close friends'),       'Close');
assertEq('"Strained alliance"',   coerceRelPhase('Strained alliance'),   'Strained');
assertEq('"Volatile situation"',  coerceRelPhase('Volatile situation'),  'Volatile');
assertEq('"Wary acquaintance"',   coerceRelPhase('Wary acquaintance'),   'Wary');
assertEq('"Newly intimate"',      coerceRelPhase('Newly intimate'),      'Intimate');

// ═══════════════════════════════════════════════════════════════════════
// 5. Free-form prose salvage (the actual screenshot failure)
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Free-form prose salvage ──');
assertEq('"Intimate, teasing connection"',
    coerceRelPhase('Intimate, teasing connection'), 'Intimate');
// "closer" is not a word-boundary match for "close" — false-positive guard correctly
// rejects this. The schema instruction is the first line of defence; if the LLM
// emits this prose, "Unknown" is the safe fallback.
assertEq('"Growing closer, testing boundaries"',
    coerceRelPhase('Growing closer, testing boundaries'), 'Unknown');
assertEq('"Confrontational, history of complaints"',
    coerceRelPhase('Confrontational, history of complaints'), 'Unknown');
assertEq('"First meeting"',
    coerceRelPhase('First meeting'), 'Unknown');

// ═══════════════════════════════════════════════════════════════════════
// 6. Empty / null / garbage input
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Empty / null / garbage ──');
assertEq('empty string',     coerceRelPhase(''),         'Unknown');
assertEq('whitespace only',  coerceRelPhase('   '),      'Unknown');
assertEq('null',             coerceRelPhase(null),       'Unknown');
assertEq('undefined',        coerceRelPhase(undefined),  'Unknown');
assertEq('punctuation only', coerceRelPhase('---'),      'Unknown');
assertEq('emoji garbage',    coerceRelPhase('???'),      'Unknown');
assertEq('numeric input',    coerceRelPhase(42),         'Unknown');
assertEq('completely off-vocab "Spicy"', coerceRelPhase('Spicy'), 'Unknown');

// ═══════════════════════════════════════════════════════════════════════
// 7. Non-substring false-positive guard
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── False-positive guard (no substring inside another word) ──');
// "Closely related" should NOT match "Close" because "Close" is part of
// "Closely" (no word boundary). Substring scan must respect word boundaries.
assertEq('"Closely related" is NOT Close',
    coerceRelPhase('Closely related'), 'Unknown');
assertEq('"Untrustworthy" is NOT Trusted',
    coerceRelPhase('Untrustworthy'), 'Unknown');
assertEq('"Hostility" is NOT Hostile',
    coerceRelPhase('Hostility'), 'Unknown');

// ═══════════════════════════════════════════════════════════════════════
// 8. Family lookup (drives pill color)
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Family lookup ──');
assertEq('Strangers → neutral', relPhaseFamily('Strangers'), 'neutral');
assertEq('Trusted → warm',      relPhaseFamily('Trusted'),   'warm');
assertEq('Intimate → romance',  relPhaseFamily('Intimate'),  'romance');
assertEq('Hostile → hostile',   relPhaseFamily('Hostile'),   'hostile');
assertEq('Volatile → complex',  relPhaseFamily('Volatile'),  'complex');
assertEq('Estranged → damaged', relPhaseFamily('Estranged'), 'damaged');
assertEq('Cordial → civil',     relPhaseFamily('Cordial'),   'civil');
assertEq('Unknown → neutral',   relPhaseFamily('Unknown'),   'neutral');
assertEq('garbage → neutral',   relPhaseFamily('Spicy'),     'neutral');

// ═══════════════════════════════════════════════════════════════════════
// 9. Enum / family invariants
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── Enum / family invariants ──');
assertEq('REL_PHASE_ENUM is frozen', Object.isFrozen(REL_PHASE_ENUM), true);
assertEq('REL_PHASE_FAMILY is frozen', Object.isFrozen(REL_PHASE_FAMILY), true);
assertEq('every enum has a family',
    REL_PHASE_ENUM.every(t => typeof REL_PHASE_FAMILY[t] === 'string'), true);
assertEq('Unknown is in enum',
    REL_PHASE_ENUM.includes('Unknown'), true);

// ═══════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
if (fail === 0) {
    console.log(`PASS ${pass}/${pass}`);
} else {
    console.log(`FAIL ${fail}/${pass + fail} (passed ${pass})`);
    process.exit(1);
}
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
