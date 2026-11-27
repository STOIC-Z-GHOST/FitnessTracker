import assert from 'node:assert/strict';
import { settleStreak, seasonTotal, loginStatus, addDays, EMPTY_LIFETIME, rewardForChain, ProgressState, DayRecord } from '../app/progress';
const mk = (cursor: string, extra: Partial<ProgressState> = {}): ProgressState => ({ streak: 0, best: 0, cursor, shields: 0, lifetime: { ...EMPTY_LIFETIME }, tallies: {}, seasonXp: {}, ...extra });
const rec = (trained = true, more: Partial<DayRecord> = {}): DayRecord => ({ power: 100, time: 100, discipline: 100, trained, ...more });
const D = '2026-03-02'; // Monday
let n = 0; const ok = (name: string, fn: () => void) => { fn(); n++; console.log('ok -', name); };

ok('nothing happened yet: no loss, cursor = yesterday', () => {
  const r = settleStreak(mk(addDays(D, -1)), addDays(D, 3), [], {}, D);
  assert.equal(r.state.streak, 0); assert.equal(r.lost, false); assert.equal(r.state.cursor, addDays(D, 2));
});
ok('3 trained days -> streak 3, best 3', () => {
  const h = { [D]: rec(), [addDays(D, 1)]: rec(), [addDays(D, 2)]: rec() };
  const r = settleStreak(mk(addDays(D, -1)), addDays(D, 3), [], h, D);
  assert.equal(r.state.streak, 3); assert.equal(r.state.best, 3);
});
ok('rest day neither breaks nor counts', () => {
  const rest = [new Date(addDays(D, 1) + 'T00:00:00').getDay()];
  const h = { [D]: rec(), [addDays(D, 2)]: rec() };
  const r = settleStreak(mk(addDays(D, -1)), addDays(D, 3), rest, h, D);
  assert.equal(r.state.streak, 2); assert.equal(r.lost, false);
});
ok('missed day + shield: streak kept, shield used', () => {
  const h = { [D]: rec() };
  const r = settleStreak(mk(addDays(D, -1), { shields: 1 }), addDays(D, 2), [], h, D);
  assert.equal(r.state.streak, 1); assert.equal(r.state.shields, 0); assert.deepEqual(r.usedOn, [addDays(D, 1)]); assert.equal(r.lost, false);
  const r2 = settleStreak(r.state, addDays(D, 4), [], { ...h, [addDays(D, 2)]: rec(), [addDays(D, 3)]: rec() }, D);
  assert.equal(r2.state.streak, 3);
});
ok('missed day, no shield: streak lost, reports old length', () => {
  const h = { [D]: rec(), [addDays(D, 1)]: rec(), [addDays(D, 2)]: rec() };
  const r = settleStreak(mk(addDays(D, -1)), addDays(D, 4), [], h, D);
  assert.equal(r.lost, true); assert.equal(r.lostStreak, 3); assert.equal(r.state.streak, 0); assert.equal(r.state.best, 3);
});
ok('2 shields cover 2 missed days, third miss breaks', () => {
  const h = { [D]: rec() };
  const r = settleStreak(mk(addDays(D, -1), { shields: 2 }), addDays(D, 4), [], h, D);
  assert.equal(r.state.shields, 0); assert.equal(r.usedOn.length, 2); assert.equal(r.lost, true); assert.equal(r.state.streak, 0);
});
ok('re-running settle is a no-op (idempotent)', () => {
  const h = { [D]: rec(), [addDays(D, 1)]: rec() };
  const a = settleStreak(mk(addDays(D, -1)), addDays(D, 2), [], h, D);
  const b = settleStreak(a.state, addDays(D, 2), [], h, D);
  assert.deepEqual(b.state, a.state);
});
ok('lifetime totals fold in once', () => {
  const h = { [D]: rec(true, { minutes: 20, reps: 50, hold: 30, full: true }), [addDays(D, 1)]: rec(true, { minutes: 10, reps: 20 }) };
  const a = settleStreak(mk(addDays(D, -1)), addDays(D, 2), [], h, D);
  assert.deepEqual({ ...a.state.lifetime }, { ...EMPTY_LIFETIME, days: 2, full: 1, minutes: 30, reps: 70, hold: 30 });
  const b = settleStreak(a.state, addDays(D, 2), [], h, D);
  assert.equal(b.state.lifetime.minutes, 30);
});
ok('perfect week + full month (Beast) detected, partial first period ignored', () => {
  // Month of March 2026, rest on Sundays; app started Mar 1 (Sunday) so the first week is partial
  const start = '2026-03-01'; const h: Record<string, DayRecord> = {};
  for (let i = 0; i < 31; i++) { const d = addDays(start, i); if (new Date(d + 'T00:00:00').getDay() !== 0) h[d] = rec(); }
  const r = settleStreak(mk(addDays(start, -1)), '2026-04-02', [0], h, start);
  const m = r.periods.find((p) => p.key === 'M:2026-03')!;
  assert.ok(m && m.sched > 0 && m.done === m.sched, 'March fully done');
  assert.equal(r.periods.filter((p) => p.kind === 'W').length >= 4, true);
  assert.equal(r.state.lifetime.perfectWeeks >= 4, true);
  assert.deepEqual(Object.keys(r.state.tallies).sort(), ['M:2026-04', 'W:2026-03-30']); // only periods still in progress
});
ok('a missed day in a month means no Beast', () => {
  const start = '2026-03-01'; const h: Record<string, DayRecord> = {};
  for (let i = 0; i < 31; i++) { const d = addDays(start, i); if (i !== 10) h[d] = rec(); }
  const r = settleStreak(mk(addDays(start, -1), { shields: 5 }), '2026-04-02', [], h, start);
  const m = r.periods.find((p) => p.key === 'M:2026-03')!; assert.ok(m.done < m.sched);
});
ok('month that started before the app is never tallied', () => {
  const start = '2026-03-10'; const h: Record<string, DayRecord> = {};
  for (let i = 0; i < 25; i++) h[addDays(start, i)] = rec();
  const r = settleStreak(mk(addDays(start, -1)), '2026-04-05', [], h, start);
  assert.equal(r.periods.some((p) => p.key === 'M:2026-03'), false);
});
ok('xp folds into lifetime and into the right season year once', () => {
  const h = { '2025-12-31': rec(true, { xp: 100 }), '2026-01-01': rec(true, { xp: 250 }), '2026-01-02': rec(false, { xp: 40 }) };
  const a = settleStreak(mk('2025-12-30'), '2026-01-03', [], h, '2025-12-31');
  assert.equal(a.state.lifetime.xp, 390); assert.deepEqual(a.state.seasonXp, { '2025': 100, '2026': 290 });
  const b = settleStreak(a.state, '2026-01-03', [], h, '2025-12-31'); assert.deepEqual(b.state.seasonXp, a.state.seasonXp); assert.equal(b.state.lifetime.xp, 390);
});
ok('week ends are reported once, with season XP at that moment', () => {
  // Mon 2026-03-02 .. Sun 03-08 is one full week; XP 100/day on 03-02..03-04, then a quiet end of week
  const h: Record<string, DayRecord> = { '2026-03-02': rec(true, { xp: 100 }), '2026-03-03': rec(true, { xp: 100 }), '2026-03-04': rec(true, { xp: 100 }), '2026-03-09': rec(true, { xp: 500 }), '2026-03-10': rec(true, { xp: 500 }) };
  const a = settleStreak(mk('2026-03-01'), '2026-03-09', [], h, '2026-03-02');
  assert.deepEqual(a.weekEnds, [{ weekStart: '2026-03-02', endIso: '2026-03-09', seasonXp: 300 }]);
  const again = settleStreak(a.state, '2026-03-09', [], h, '2026-03-02'); assert.equal(again.weekEnds.length, 0);
  const b = settleStreak(a.state, '2026-03-23', [], h, '2026-03-02');   // two more weeks pass
  assert.deepEqual(b.weekEnds.map((w) => [w.weekStart, w.seasonXp]), [['2026-03-09', 1300], ['2026-03-16', 1300]]);
});
ok('season ends on Dec 31: final XP, rank drop and the new season base', () => {
  const h: Record<string, DayRecord> = { '2026-12-30': rec(true, { xp: 69000 }), '2026-12-31': rec(true, { xp: 1500 }), '2027-01-01': rec(true, { xp: 300 }) };
  const a = settleStreak(mk('2026-12-29'), '2027-01-02', [], h, '2026-12-29');
  assert.deepEqual(a.seasonEnds, [{ year: 2026, finalXp: 70500, rank: 5 }]);          // Mythic
  assert.equal(a.state.seasonBase!['2027'], 8000);                                    // drops to Gladiator
  assert.equal(a.state.seasonXp['2027'], 300);
  const again = settleStreak(a.state, '2027-01-02', [], h, '2026-12-29'); assert.equal(again.seasonEnds.length, 0); assert.equal(again.state.seasonBase!['2027'], 8000);
});
ok('a lower rank drops to Recruit (base 0); an unranked user stays unranked; years with a base add up', () => {
  const h: Record<string, DayRecord> = { '2026-12-31': rec(true, { xp: 9000 }) };
  const a = settleStreak(mk('2026-12-30'), '2027-01-02', [], h, '2026-12-30'); assert.deepEqual(a.seasonEnds, [{ year: 2026, finalXp: 9000, rank: 2 }]); assert.equal(a.state.seasonBase!['2027'], 0);
  const none = settleStreak(mk('2026-12-30'), '2027-01-02', [], {}, '2026-12-30'); assert.deepEqual(none.seasonEnds, [{ year: 2026, finalXp: 0, rank: -1 }]); assert.equal(none.state.seasonBase!['2027'], 0);
  assert.equal(seasonTotal({ seasonXp: { '2027': 300 }, seasonBase: { '2027': 8000 } }, 2027), 8300);
});
ok('two seasons can end in one visit, and week ends use base + earned XP', () => {
  const h: Record<string, DayRecord> = { '2026-12-31': rec(true, { xp: 41000 }), '2027-12-31': rec(true, { xp: 100 }) };
  const a = settleStreak(mk('2026-12-30'), '2028-01-02', [], h, '2026-12-30');
  assert.deepEqual(a.seasonEnds.map((e) => [e.year, e.finalXp, e.rank]), [[2026, 41000, 4], [2027, 2600, 1]]);   // Overlord -> base 2,500; then 2,500 + 100
  assert.equal(a.state.seasonBase!['2028'], 0);
  const wk = settleStreak(mk('2027-01-02'), '2027-01-11', [], { '2027-01-05': rec(true, { xp: 40 }) }, '2026-12-30');
  assert.equal(wk.weekEnds.find((w) => w.endIso === '2027-01-11')!.seasonXp, 40);
  const wk2 = settleStreak({ ...mk('2027-01-02'), seasonBase: { '2027': 8000 } }, '2027-01-11', [], { '2027-01-05': rec(true, { xp: 40 }) }, '2026-12-30');
  assert.equal(wk2.weekEnds.find((w) => w.endIso === '2027-01-11')!.seasonXp, 8040);
});
ok('login: first claim', () => assert.deepEqual(loginStatus('', 0, D), { claimed: false, nextChain: 1, reset: false }));
ok('login: consecutive day continues the chain', () => assert.deepEqual(loginStatus(addDays(D, -1), 4, D), { claimed: false, nextChain: 5, reset: false }));
ok('login: skipped a day resets to day 1', () => assert.deepEqual(loginStatus(addDays(D, -2), 6, D), { claimed: false, nextChain: 1, reset: true }));
ok('login: already claimed today', () => assert.equal(loginStatus(D, 3, D).claimed, true));
ok('login: clock moved backwards does not allow a re-claim', () => assert.equal(loginStatus(addDays(D, 5), 3, D).claimed, true));
ok('login rewards loop every 7 days', () => { assert.equal(rewardForChain(1), 20); assert.equal(rewardForChain(7), 100); assert.equal(rewardForChain(8), 20); });
console.log(`\n${n} checks passed`);
