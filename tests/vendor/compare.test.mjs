// Compare old in-house regex repair vs vendored jsonrepair on stray-quote cases.
// This is the diagnostic that justifies (or refutes) the migration.
// Run from project root: node tests/vendor/compare.test.mjs
import { jsonrepair } from '../../src/vendor/jsonrepair.mjs';

function oldRepair(c) {
  let repaired = c
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":')
    .replace(/:\s*'([^']*)'/g, ':"$1"')
    .replace(/\t/g, ' ')
    .replace(/[\x00-\x1f]/g, m => m === '\n' || m === '\r' ? m : '')
    .replace(/,\s*,/g, ',')
    .replace(/"\s*\n\s*"/g, '","')
    .replace(/\\'/g, "'");
  // Old unescaped-quote heuristic
  repaired = repaired.replace(/"([^"]*?)(?<!\\)"(?=[^:,}\]\s])/g, (m, p1) => '"' + p1.replace(/"/g, '\\"') + '"');
  return repaired;
}

const cases = [
  // Critical: the patterns that broke message 10
  ['boundary `""}`',           '{"s":"hello "world""}'],
  ['stray with apostrophe',    `{"s":"don't say "no""}`],
  ['stray nested object',      '{"x":{"y":"he said "hi""}}'],
  ['multi stray narrative',    '{"summary":"He said "yes" then "no" then "maybe""}'],
  ['stray before comma',       '{"s":"end "quote"","next":1}'],
  // Realistic ScenePulse-style — what would actually appear in a tracker
  ['rel milestone',            '{"relationships":[{"milestone":"Their "first" date","affection":42}]}'],
  ['char role',                '{"characters":[{"role":"the "boss" of"}]}'],
  ['mid-string',               '{"s":"the "best" idea"}'],
  ['multiple stray',           '{"s":"a "b" c "d" e"}'],
  ['narrative w/ apostrophe',  `{"milestone":"Victoria's "favorite" thing happened","affection":58}`],
  ['array of strays',          '{"a":["one "two" three","four"]}'],
];

let oldPass = 0, newPass = 0;
const wins = [], losses = [], shared = [];

console.log('case'.padEnd(28) + 'old   new');
console.log('─'.repeat(45));
for (const [name, input] of cases) {
  let oldOk = false, newOk = false;
  let oldOut = '', newOut = '';
  try { oldOut = oldRepair(input); JSON.parse(oldOut); oldOk = true; } catch {}
  try { newOut = jsonrepair(input); JSON.parse(newOut); newOk = true; } catch {}
  console.log(name.padEnd(28) + (oldOk ? 'OK   ' : 'FAIL ') + ' ' + (newOk ? 'OK' : 'FAIL'));
  if (oldOk) oldPass++;
  if (newOk) newPass++;
  if (newOk && !oldOk) wins.push(name);
  if (oldOk && !newOk) losses.push(name);
  if (oldOk && newOk) shared.push(name);
}
console.log('─'.repeat(45));
console.log('TOTALS: old=' + oldPass + '/' + cases.length + '  new=' + newPass + '/' + cases.length);
console.log('');
console.log('NEW wins (jsonrepair fixes, regex did not): ' + wins.length);
for (const w of wins) console.log('  + ' + w);
console.log('NEW losses (regex fixed, jsonrepair did not): ' + losses.length);
for (const l of losses) console.log('  - ' + l);
console.log('Both fix: ' + shared.length);
