// tests/temporal-check.test.mjs — v6.24.0 temporal validation tests
//
// Run from project root: node tests/temporal-check.test.mjs
//
// Covers the classifier's three block rules + skip conditions + edge cases
// surfaced by the v6.24 panel review (cold start, user-edit, anti-cascade,
// group chat, unparseable times, midnight rollover, the user's literal
// reported regression fixture).

const {
    classifyTimeChange,
    parseTimeToSeconds,
    parseElapsedToSeconds,
    formatTime,
} = await import('../src/temporal-check.js');

let pass = 0, fail = 0;
const failures = [];
function assertEq(name, actual, expected) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a === e) { pass++; console.log('  OK   ' + name); }
    else {
        fail++;
        failures.push({ name, actual: a, expected: e });
        console.log('  FAIL ' + name + ' — expected ' + e + ', got ' + a);
    }
}
function assertTrue(name, v) { assertEq(name, !!v, true); }

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('temporal-check — v6.24.0 classifier rules');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// ─── parseTimeToSeconds ────────────────────────────────────────────────
console.log('\n── parseTimeToSeconds ──');
assertEq('HH:MM:SS', parseTimeToSeconds('14:30:45'), 14 * 3600 + 30 * 60 + 45);
assertEq('HH:MM (no seconds)', parseTimeToSeconds('16:15'), 16 * 3600 + 15 * 60);
assertEq('H:MM (no leading zero)', parseTimeToSeconds('9:30'), 9 * 3600 + 30 * 60);
assertEq('AM (12 → 0)', parseTimeToSeconds('12:00 AM'), 0);
assertEq('PM (4 → 16)', parseTimeToSeconds('4:15 PM'), 16 * 3600 + 15 * 60);
assertEq('PM (12 stays 12)', parseTimeToSeconds('12:30 PM'), 12 * 3600 + 30 * 60);
assertEq('a.m. variant', parseTimeToSeconds('9:30 a.m.'), 9 * 3600 + 30 * 60);
assertEq('qualitative null', parseTimeToSeconds('morning'), null);
assertEq('empty null', parseTimeToSeconds(''), null);
assertEq('undefined null', parseTimeToSeconds(undefined), null);
assertEq('out-of-range null', parseTimeToSeconds('25:00'), null);
assertEq('truncated null', parseTimeToSeconds('14:'), null);

// ─── parseElapsedToSeconds ─────────────────────────────────────────────
console.log('\n── parseElapsedToSeconds ──');
assertEq('10m', parseElapsedToSeconds('10m'), 600);
assertEq('30s', parseElapsedToSeconds('30s'), 30);
assertEq('2h', parseElapsedToSeconds('2h'), 7200);
assertEq('compound 2h 30m', parseElapsedToSeconds('2h 30m'), 9000);
assertEq('verbose 10 minutes', parseElapsedToSeconds('10 minutes'), 600);
assertEq('with parenthetical', parseElapsedToSeconds('30s (dialogue continues)'), 30);
assertEq('days', parseElapsedToSeconds('3 days'), 3 * 86400);
assertEq('null on empty', parseElapsedToSeconds(''), null);
assertEq('null on undefined', parseElapsedToSeconds(undefined), null);
assertEq('null on plain prose', parseElapsedToSeconds('a moment'), null);

// ─── formatTime ────────────────────────────────────────────────────────
console.log('\n── formatTime ──');
assertEq('zero', formatTime(0), '00:00:00');
assertEq('basic', formatTime(14 * 3600 + 30 * 60 + 45), '14:30:45');
assertEq('midnight rollover wrap', formatTime(86400 + 60), '00:01:00');
assertEq('negative wraps to positive', formatTime(-60), '23:59:00');

// ─── Skip conditions ───────────────────────────────────────────────────
console.log('\n── Skip conditions ──');
const _baseNext = { time: '14:30', date: '04/25/2026' };

(() => {
    const r = classifyTimeChange({ prev: null, next: _baseNext });
    assertEq('cold start: action=skip', r.action, 'skip');
    assertEq('cold start: reason', r.reason, 'cold-start');
})();

(() => {
    const r = classifyTimeChange({ prev: { time: '14:00' }, next: null });
    assertEq('null next: action=skip', r.action, 'skip');
    assertEq('null next: reason', r.reason, 'no-tracker');
})();

(() => {
    const r = classifyTimeChange({
        prev: { time: '16:15', date: '04/25/2026' },
        next: { time: '14:52', date: '04/25/2026', _spMeta: { userEdited: true } },
    });
    assertEq('user-edited next is never validated', r.action, 'skip');
    assertEq('user-edited reason', r.reason, 'user-edited');
})();

(() => {
    const r = classifyTimeChange({
        prev: { time: '16:15', date: '04/25/2026' },
        next: { time: '14:30', date: '04/25/2026' },
        isGroupChat: true,
    });
    assertEq('group chat skipped', r.action, 'skip');
    assertEq('group chat reason', r.reason, 'group-chat-deferred');
})();

(() => {
    const r = classifyTimeChange({
        prev: { time: '14:52', date: '04/25/2026', _temporal: { action: 'rewrite' } },
        next: { time: '14:30', date: '04/25/2026' },
    });
    assertEq('anti-cascade: prev was rewritten → skip', r.action, 'skip');
    assertEq('anti-cascade reason', r.reason, 'prev-was-rewritten');
})();

// ─── Unparseable times ─────────────────────────────────────────────────
console.log('\n── Unparseable times ──');

(() => {
    const r = classifyTimeChange({
        prev: { time: '16:15', date: '04/25/2026' },
        next: { time: 'morning', date: '04/25/2026' },
    });
    assertEq('qualitative time → accept (no false regression)', r.action, 'accept');
    assertEq('unparseable reason', r.reason, 'unparseable-time');
})();

(() => {
    const r = classifyTimeChange({
        prev: { time: 'evening', date: '04/25/2026' },
        next: { time: '20:00', date: '04/25/2026' },
    });
    assertEq('unparseable prev → accept', r.action, 'accept');
})();

// ─── Date-changed → accept ─────────────────────────────────────────────
console.log('\n── Date-changed always accepts ──');

(() => {
    const r = classifyTimeChange({
        prev: { time: '23:50', date: '04/25/2026' },
        next: { time: '00:10', date: '04/26/2026' },
    });
    assertEq('overnight rollover', r.action, 'accept');
    assertEq('rollover reason', r.reason, 'date-changed');
})();

(() => {
    const r = classifyTimeChange({
        prev: { time: '14:30', date: '04/25/2026' },
        next: { time: '08:00', date: '04/26/2026' },
    });
    assertEq('next-day morning after prev-day afternoon', r.action, 'accept');
})();

// ─── Backward time (RULE 1) ────────────────────────────────────────────
console.log('\n── RULE 1: Backward time ──');

(() => {
    const r = classifyTimeChange({
        prev: { time: '16:15', date: '04/25/2026' },
        next: { time: '14:52', date: '04/25/2026', elapsed: '5m' },
    });
    assertEq('backward, no flashback signal → rewrite', r.action, 'rewrite');
    assertEq('backward rewrite to prev+elapsed (5m)', r.newTime, '16:20:00');
    assertEq('backward reason', r.reason, 'backward-without-flashback');
})();

(() => {
    const r = classifyTimeChange({
        prev: { time: '16:15', date: '04/25/2026' },
        next: { time: '14:52', date: '04/25/2026' },
    });
    assertEq('backward, no elapsed → rewrite to prev+1m', r.newTime, '16:16:00');
})();

(() => {
    const r = classifyTimeChange({
        prev: { time: '16:15', date: '04/25/2026' },
        next: { time: '11:15', date: '04/25/2026', temporalIntent: 'flashback' },
    });
    assertEq('backward + temporalIntent=flashback → accept', r.action, 'accept');
    assertEq('flashback intent reason', r.reason, 'backward-flashback-declared');
})();

(() => {
    const r = classifyTimeChange({
        prev: { time: '16:15', date: '04/25/2026' },
        next: { time: '11:15', date: '04/25/2026', elapsed: '5h (flashback to morning)' },
    });
    assertEq('backward + elapsed contains "flashback" → accept', r.action, 'accept');
})();

(() => {
    const r = classifyTimeChange({
        prev: { time: '16:15', date: '04/25/2026' },
        next: { time: '11:15', date: '04/25/2026', elapsed: '5h (earlier that morning)' },
    });
    assertEq('backward + elapsed contains "earlier" → accept', r.action, 'accept');
})();

// ─── Forward time (RULES 2 + 3) ────────────────────────────────────────
console.log('\n── RULES 2+3: Forward time ──');

(() => {
    const r = classifyTimeChange({
        prev: { time: '16:15', date: '04/25/2026' },
        next: { time: '16:25', date: '04/25/2026', elapsed: '10m' },
    });
    assertEq('forward matches elapsed → accept', r.action, 'accept');
    assertEq('matches-elapsed reason', r.reason, 'forward-matches-elapsed');
})();

(() => {
    const r = classifyTimeChange({
        prev: { time: '16:15', date: '04/25/2026' },
        next: { time: '16:30', date: '04/25/2026', elapsed: '10m' },
    });
    assertEq('forward 1.5x elapsed (within 2x slack) → accept', r.action, 'accept');
})();

(() => {
    const r = classifyTimeChange({
        prev: { time: '16:15', date: '04/25/2026' },
        next: { time: '16:45', date: '04/25/2026', elapsed: '10m' },
    });
    assertEq('forward 3x elapsed → rewrite', r.action, 'rewrite');
    assertEq('forward exceeds elapsed: rewrite to prev+elapsed', r.newTime, '16:25:00');
    assertEq('forward exceeds reason', r.reason, 'forward-exceeds-elapsed');
})();

(() => {
    const r = classifyTimeChange({
        prev: { time: '16:15', date: '04/25/2026' },
        next: { time: '22:30', date: '04/25/2026', elapsed: '30s' },
    });
    assertEq('forward huge with tiny elapsed → rewrite', r.action, 'rewrite');
    assertEq('huge-vs-tiny: rewrite to prev+30s', r.newTime, '16:15:30');
})();

(() => {
    const r = classifyTimeChange({
        prev: { time: '16:15', date: '04/25/2026' },
        next: { time: '19:15', date: '04/25/2026', elapsed: '3h' },
    });
    assertEq('forward 3h matches elapsed 3h → accept', r.action, 'accept');
})();

(() => {
    const r = classifyTimeChange({
        prev: { time: '16:15', date: '04/25/2026' },
        next: { time: '19:15', date: '04/25/2026', elapsed: '3h', temporalIntent: 'timeSkip' },
    });
    assertEq('forward + temporalIntent=timeSkip → accept', r.action, 'accept');
    assertEq('timeSkip intent reason', r.reason, 'forward-intent-declared');
})();

(() => {
    const r = classifyTimeChange({
        prev: { time: '16:15', date: '04/25/2026' },
        next: { time: '16:20', date: '04/25/2026' },
    });
    assertEq('forward small (<1h) no elapsed → accept', r.action, 'accept');
})();

(() => {
    const r = classifyTimeChange({
        prev: { time: '16:15', date: '04/25/2026' },
        next: { time: '20:00', date: '04/25/2026' },
    });
    assertEq('forward >1h no elapsed → rewrite to prev+1m', r.action, 'rewrite');
    assertEq('large-jump-no-elapsed: rewrite to prev+1m', r.newTime, '16:16:00');
    assertEq('large-jump reason', r.reason, 'forward-no-elapsed-large-jump');
})();

// ─── Idempotency / no input mutation ───────────────────────────────────
console.log('\n── Purity / idempotency ──');

(() => {
    const prev = { time: '16:15', date: '04/25/2026' };
    const next = { time: '14:52', date: '04/25/2026', elapsed: '5m' };
    const prevCopy = JSON.parse(JSON.stringify(prev));
    const nextCopy = JSON.parse(JSON.stringify(next));
    classifyTimeChange({ prev, next });
    assertEq('classifier does not mutate prev', prev, prevCopy);
    assertEq('classifier does not mutate next', next, nextCopy);
})();

(() => {
    const args = {
        prev: { time: '16:15', date: '04/25/2026' },
        next: { time: '16:25', date: '04/25/2026', elapsed: '10m' },
    };
    const r1 = classifyTimeChange(args);
    const r2 = classifyTimeChange(args);
    assertEq('idempotent on same input', r1.action, r2.action);
    assertEq('idempotent reason', r1.reason, r2.reason);
})();

// ─── User's reported regression fixture ────────────────────────────────
console.log('\n── User reported fixture: #60→#62→#64 (16:15→14:52→15:00) ──');

(() => {
    // The user's literal screenshot. Same date throughout, no elapsed annotations,
    // no temporalIntent. Both #62 and #64 must be rewritten forward.
    const m60 = { time: '16:15:00', date: '04/25/2026' };
    const m62raw = { time: '14:52:00', date: '04/25/2026' };
    const r62 = classifyTimeChange({ prev: m60, next: m62raw });
    assertEq('#62: backward → rewrite', r62.action, 'rewrite');
    assertEq('#62: rewritten time', r62.newTime, '16:16:00');

    // Simulate post-rewrite snapshot for #62 (with _temporal marker added by pipeline)
    const m62 = { time: r62.newTime, date: '04/25/2026', _temporal: { action: 'rewrite' } };
    const m64raw = { time: '15:00:00', date: '04/25/2026' };
    const r64 = classifyTimeChange({ prev: m62, next: m64raw });
    // Anti-cascade kicks in: #62 was rewritten so we don't anchor on it
    assertEq('#64 with rewritten anchor: skip (anti-cascade)', r64.action, 'skip');
    assertEq('#64 anti-cascade reason', r64.reason, 'prev-was-rewritten');
})();

// ─── Final report ──────────────────────────────────────────────────────
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
if (fail === 0) {
    console.log('PASS ' + pass + '/' + (pass + fail));
} else {
    console.log('FAIL ' + fail + ' / PASS ' + pass + ' (' + (pass + fail) + ' total)');
    for (const f of failures) console.log('  ' + f.name + ': expected ' + f.expected + ', got ' + f.actual);
    process.exit(1);
}
