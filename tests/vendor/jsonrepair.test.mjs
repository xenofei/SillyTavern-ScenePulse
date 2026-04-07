// Smoke test harness for vendored jsonrepair (106 cases).
// Run from project root: node tests/vendor/jsonrepair.test.mjs
// Not loaded by the extension — manifest.json only references index.js.

import { jsonrepair } from '../../src/vendor/jsonrepair.mjs';

// Each case: [category, name, input, expectedJsonOrNull]
// expectedJsonOrNull:
//   - object/array/value → must parse and deep-equal
//   - "PARSES" → must repair to *something* parseable
//   - "THROWS" → jsonrepair must throw (clean failure, not silent corruption)
const cases = [
  // ─── 1) Valid JSON pass-through (8) ───
  ['valid', 'simple object', '{"a":1,"b":2}', {a:1,b:2}],
  ['valid', 'simple array', '[1,2,3]', [1,2,3]],
  ['valid', 'nested', '{"a":{"b":[1,{"c":"d"}]}}', {a:{b:[1,{c:'d'}]}}],
  ['valid', 'empty object', '{}', {}],
  ['valid', 'empty array', '[]', []],
  ['valid', 'all primitives', '{"s":"x","n":1,"b":true,"z":null}', {s:'x',n:1,b:true,z:null}],
  ['valid', 'unicode escape', '{"s":"\\u00e9"}', {s:'é'}],
  ['valid', 'escaped quote', '{"s":"a\\"b"}', {s:'a"b'}],

  // ─── 2) Unescaped quotes (the message-10 killer) (12) ───
  ['unescaped', 'simple stray quote', '{"s":"hello "world""}', 'PARSES'],
  ['unescaped', 'mid-string', '{"s":"the "best" idea"}', 'PARSES'],
  ['unescaped', 'multiple stray quotes', '{"s":"a "b" c "d" e"}', 'PARSES'],
  ['unescaped', 'stray + apostrophe', '{"s":"don\'t say "no""}', 'PARSES'],
  ['unescaped', 'nested object stray', '{"x":{"y":"he said "hi""}}', 'PARSES'],
  ['unescaped', 'array of stray', '{"a":["one "two" three","four"]}', 'PARSES'],
  ['unescaped', 'before comma', '{"s":"end "quote"","next":1}', 'PARSES'],
  ['unescaped', 'before brace', '{"s":"final "word""}', 'PARSES'],
  ['unescaped', 'long narrative', '{"milestone":"Victoria\'s "favorite" thing happened","affection":58}', 'PARSES'],
  ['unescaped', 'multi-stray narrative', '{"summary":"He said "yes" then "no" then "maybe""}', 'PARSES'],
  ['unescaped', 'quote at very start', '{"s":""quoted" start"}', 'PARSES'],
  ['unescaped', 'quote at very end', '{"s":"end "}', {s:'end '}],

  // ─── 3) Trailing commas (6) ───
  ['trailing-comma', 'object trailing', '{"a":1,"b":2,}', {a:1,b:2}],
  ['trailing-comma', 'array trailing', '[1,2,3,]', [1,2,3]],
  ['trailing-comma', 'nested trailing', '{"a":[1,2,],"b":{"c":1,}}', {a:[1,2],b:{c:1}}],
  ['trailing-comma', 'whitespace trailing', '{"a":1 , }', {a:1}],
  ['trailing-comma', 'newline trailing', '{"a":1,\n}', {a:1}],
  ['trailing-comma', 'double trailing', '{"a":1,,}', 'PARSES'],

  // ─── 4) Missing commas (6) ───
  ['missing-comma', 'between fields', '{"a":1 "b":2}', {a:1,b:2}],
  ['missing-comma', 'between array items', '[1 2 3]', 'PARSES'],
  ['missing-comma', 'after string value', '{"a":"x" "b":"y"}', {a:'x',b:'y'}],
  ['missing-comma', 'newline-separated', '{"a":1\n"b":2}', {a:1,b:2}],
  ['missing-comma', 'between objects in array', '[{"a":1} {"b":2}]', 'PARSES'],
  ['missing-comma', 'mixed types', '{"a":true "b":null "c":[]}', {a:true,b:null,c:[]}],

  // ─── 5) Single quotes (5) ───
  ['single-quote', 'all single', "{'a':'hi','b':'there'}", {a:'hi',b:'there'}],
  ['single-quote', 'mixed quotes', '{\'a\':"x","b":\'y\'}', {a:'x',b:'y'}],
  ['single-quote', 'apostrophe in single', "{'msg':'don\\'t worry'}", 'PARSES'],
  ['single-quote', 'array single', "['a','b','c']", ['a','b','c']],
  ['single-quote', 'nested single', "{'x':{'y':'z'}}", {x:{y:'z'}}],

  // ─── 6) Smart/curly quotes (4) ───
  ['smart-quote', 'curly double both', '{\u201Ca\u201D:\u201Cb\u201D}', {a:'b'}],
  ['smart-quote', 'curly single', '{\u2018a\u2019:\u2018b\u2019}', {a:'b'}],
  ['smart-quote', 'mixed curly straight', '{\u201Cname\u201D:"Alice"}', {name:'Alice'}],
  ['smart-quote', 'curly inside value', '{"q":\u201Csmart\u201D}', {q:'smart'}],

  // ─── 7) Python literals (4) ───
  ['python', 'True/False/None', '{"a":True,"b":False,"c":None}', {a:true,b:false,c:null}],
  ['python', 'lowercase true OK', '{"a":true}', {a:true}],
  ['python', 'mixed case', '{"a":True,"b":false}', {a:true,b:false}],
  ['python', 'in array', '[True,False,None]', [true,false,null]],

  // ─── 8) Comments (5) ───
  ['comment', 'line comment', '{"a":1 // note\n,"b":2}', {a:1,b:2}],
  ['comment', 'block comment', '{"a":1,/*note*/"b":2}', {a:1,b:2}],
  ['comment', 'block multiline', '{"a":1,/*\nnote\n*/"b":2}', {a:1,b:2}],
  ['comment', 'leading line', '// header\n{"a":1}', 'PARSES'],
  ['comment', 'trailing line', '{"a":1} // footer', {a:1}],

  // ─── 9) Markdown fences / backticks (5) ───
  ['fence', 'json fence', '```json\n{"a":1}\n```', {a:1}],
  ['fence', 'plain fence', '```\n{"a":1}\n```', {a:1}],
  ['fence', 'fence no newline', '```json{"a":1}```', 'PARSES'],
  ['fence', 'fence with text after', '```json\n{"a":1}\n```\nDone.', 'PARSES'],
  ['fence', 'tilde fence', '~~~json\n{"a":1}\n~~~', 'PARSES'],

  // ─── 10) Number issues (6) ───
  ['number', 'leading zero', '{"a":01}', 'PARSES'],
  ['number', 'plus sign', '{"a":+5}', 'PARSES'],
  ['number', 'trailing dot', '{"a":5.}', 'PARSES'],
  ['number', 'leading dot', '{"a":.5}', 'PARSES'],
  ['number', 'big int', '{"a":9007199254740993}', 'PARSES'],
  ['number', 'scientific', '{"a":1.5e10}', {a:1.5e10}],

  // ─── 11) Brace/bracket issues (8) ───
  ['braces', 'missing close brace', '{"a":1', 'PARSES'],
  ['braces', 'missing close bracket', '[1,2,3', 'PARSES'],
  ['braces', 'extra close brace', '{"a":1}}', {a:1}],
  ['braces', 'mismatched ]vs}', '{"a":[1,2}', 'PARSES'],
  ['braces', 'deeply nested unclosed', '{"a":{"b":{"c":1', 'PARSES'],
  ['braces', 'array unclosed in obj', '{"a":[1,2,3,"b":2}', 'PARSES'],
  ['braces', 'empty unclosed', '{', 'PARSES'],
  ['braces', 'mixed array unclosed', '[{"a":1},{"b":2}', 'PARSES'],

  // ─── 12) Unicode / escape (6) ───
  ['unicode', 'utf8 raw', '{"s":"café"}', {s:'café'}],
  ['unicode', 'emoji', '{"s":"hello 🚀"}', {s:'hello 🚀'}],
  ['unicode', 'cjk', '{"s":"日本語"}', {s:'日本語'}],
  ['unicode', '\\u escape', '{"s":"\\u00e9"}', {s:'é'}],
  ['unicode', 'mixed escape', '{"s":"a\\nb\\tc"}', {s:'a\nb\tc'}],
  ['unicode', 'backslash literal', '{"path":"C:\\\\foo\\\\bar"}', {path:'C:\\foo\\bar'}],

  // ─── 13) Whitespace / control chars (5) ───
  ['whitespace', 'tabs in JSON', '{\t"a":\t1\t}', {a:1}],
  ['whitespace', 'newlines everywhere', '{\n  "a": 1,\n  "b": 2\n}', {a:1,b:2}],
  ['whitespace', 'BOM prefix', '\uFEFF{"a":1}', 'PARSES'],
  ['whitespace', 'nbsp inside', '{"a":\u00a01}', {a:1}],
  ['whitespace', 'CRLF newlines', '{"a":1,\r\n"b":2}', {a:1,b:2}],

  // ─── 14) Mixed quote madness (5) ───
  ['mixed', 'curly + stray', '{\u201Cs\u201D:\u201Choo "haa" hee\u201D}', 'PARSES'],
  ['mixed', 'single with double inside', "{'s':'he said \"hi\"'}", {s:'he said "hi"'}],
  ['mixed', 'double with single inside', '{"s":"don\'t do it"}', {s:"don't do it"}],
  ['mixed', 'all kinds', '{\u201Cname\u201D:\'Alice\',"age":30}', {name:'Alice',age:30}],
  ['mixed', 'backtick keys', '{`a`:1}', 'PARSES'],

  // ─── 15) Realistic ScenePulse-style payloads (10) ───
  ['realistic', 'tracker valid', '{"time":"19:28","date":"06/14/2025","sceneTopic":"meeting","relationships":[{"name":"Victoria","affection":58}]}', {time:'19:28',date:'06/14/2025',sceneTopic:'meeting',relationships:[{name:'Victoria',affection:58}]}],
  ['realistic', 'tracker stray quote in milestone', '{"relationships":[{"name":"Victoria","milestone":"Their "first" date","affection":42}]}', 'PARSES'],
  ['realistic', 'tracker apostrophe', '{"sceneSummary":"Devon\'s plan worked perfectly"}', {sceneSummary:"Devon's plan worked perfectly"}],
  ['realistic', 'tracker trailing comma in chars', '{"characters":[{"name":"A"},{"name":"B"},]}', {characters:[{name:'A'},{name:'B'}]}],
  ['realistic', 'tracker python true', '{"sceneTension":"high","witnesses":True}', {sceneTension:'high',witnesses:true}],
  ['realistic', 'tracker missing comma', '{"a":1 "b":2 "c":3}', {a:1,b:2,c:3}],
  ['realistic', 'tracker fenced', '```json\n{"time":"19:00","characters":[]}\n```', {time:'19:00',characters:[]}],
  ['realistic', 'tracker quote in name', '{"characters":[{"name":"O\'Brien"}]}', {characters:[{name:"O'Brien"}]}],
  ['realistic', 'tracker stray in array', '{"characters":[{"role":"the "boss" of"}]}', 'PARSES'],
  ['realistic', 'tracker huge nested', '{"a":{"b":{"c":{"d":{"e":{"f":"deep"}}}}}}', {a:{b:{c:{d:{e:{f:'deep'}}}}}}],

  // ─── 16) Edge cases / sanity (11) ───
  ['edge', 'unquoted keys', '{a:1,b:2}', {a:1,b:2}],
  ['edge', 'JS-style true literal', '{"a":true}', {a:true}],
  ['edge', 'array of arrays', '[[1,2],[3,4]]', [[1,2],[3,4]]],
  ['edge', 'string with newline literal', '{"s":"line1\\nline2"}', {s:'line1\nline2'}],
  ['edge', 'just a number', '42', 42],
  ['edge', 'just a string', '"hello"', 'hello'],
  ['edge', 'just true', 'true', true],
  ['edge', 'just null', 'null', null],
  ['edge', 'whitespace only', '   ', 'THROWS'],
  ['edge', 'empty string input', '', 'THROWS'],
  ['edge', 'object with mixed escapes', '{"a":"x\\\\y","b":"\\""}', {a:'x\\y',b:'"'}],
];

function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) if (!deepEqual(a[k], b[k])) return false;
  return true;
}

const byCat = {};
let totalPass = 0, totalFail = 0;
const failures = [];

for (const [cat, name, input, expected] of cases) {
  byCat[cat] = byCat[cat] || { pass: 0, fail: 0 };
  let result;
  try {
    const repaired = jsonrepair(input);
    const parsed = JSON.parse(repaired);
    if (expected === 'THROWS') {
      result = { ok: false, why: 'expected THROWS, got: ' + JSON.stringify(parsed).slice(0, 60) };
    } else if (expected === 'PARSES') {
      result = { ok: true };
    } else if (deepEqual(parsed, expected)) {
      result = { ok: true };
    } else {
      result = { ok: false, why: 'expected ' + JSON.stringify(expected) + ' got ' + JSON.stringify(parsed) };
    }
  } catch (e) {
    if (expected === 'THROWS') {
      result = { ok: true };
    } else {
      result = { ok: false, why: 'threw: ' + (e?.message || String(e)) };
    }
  }
  if (result.ok) {
    byCat[cat].pass++;
    totalPass++;
  } else {
    byCat[cat].fail++;
    totalFail++;
    failures.push({ cat, name, input, why: result.why });
  }
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('jsonrepair smoke test — ' + cases.length + ' cases');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
for (const cat of Object.keys(byCat)) {
  const { pass, fail } = byCat[cat];
  const bar = fail === 0 ? 'OK  ' : 'FAIL';
  console.log(bar + ' ' + cat.padEnd(16) + ' ' + pass + '/' + (pass + fail));
}
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TOTAL: ' + totalPass + '/' + cases.length + ' passed (' + totalFail + ' failed)');

if (failures.length) {
  console.log('\nFailures:');
  for (const f of failures) {
    console.log('  [' + f.cat + '] ' + f.name);
    console.log('    input: ' + JSON.stringify(f.input).slice(0, 100));
    console.log('    why:   ' + f.why);
  }
}

process.exit(failures.length ? 1 : 0);
