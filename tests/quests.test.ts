import assert from 'node:assert/strict';
import { pickDaily, pickWeekly, DAILY_POOL, WEEKLY_POOL, buildRows, dailyMetrics, weeklyMetrics, dailyResetIn, weeklyResetIn, weekKeyOf, QuestPlan } from '../app/quests';
let n = 0; const ok = (name: string, fn: () => void) => { fn(); n++; console.log('ok -', name); };
const plan: QuestPlan = { totalSets: 16, setsPerExercise: 4, exercises: 4, repsPerRound: 33, plankSeconds: 35, plannedMinutes: 16, scheduledDays: 5 };
ok('daily picks: stable for a date, 3 distinct, exactly 1 easy + 2 hard', () => {
  for (let i = 0; i < 60; i++) {
    const d = new Date(2026, 2, 1 + i); const iso = d.toISOString().slice(0, 10);
    const a = pickDaily(iso), b = pickDaily(iso);
    assert.deepEqual(a.map((q) => q.id), b.map((q) => q.id)); assert.equal(new Set(a.map((q) => q.id)).size, 3);
    assert.equal(a.filter((q) => q.group === 'easy').length, 1); assert.equal(a.filter((q) => q.group === 'hard').length, 2);
  }
});
ok('daily picks vary across days (every quest shows up)', () => {
  const seen = new Set<string>(); for (let i = 0; i < 90; i++) pickDaily(new Date(2026, 2, 1 + i).toISOString().slice(0, 10)).forEach((q) => seen.add(q.id));
  assert.equal(seen.size, DAILY_POOL.length);
});
ok('weekly picks: Consistency always + 2 others, stable per week', () => {
  const seen = new Set<string>();
  for (let i = 0; i < 40; i++) { const k = weekKeyOf(new Date(2026, 0, 5 + i * 7).toISOString().slice(0, 10)); const a = pickWeekly(k); assert.equal(a[0].id, 'w-days'); assert.equal(new Set(a.map((q) => q.id)).size, 3); assert.deepEqual(a.map((q) => q.id), pickWeekly(k).map((q) => q.id)); a.forEach((q) => seen.add(q.id)); }
  assert.equal(seen.size, WEEKLY_POOL.length);
});
ok('targets scale with the plan and never go silly', () => {
  const tiny: QuestPlan = { totalSets: 6, setsPerExercise: 3, exercises: 2, repsPerRound: 8, plankSeconds: 20, plannedMinutes: 6, scheduledDays: 3 };
  for (const q of [...DAILY_POOL, ...WEEKLY_POOL]) { const a = q.target(plan), b = q.target(tiny); assert.ok(a >= 1 && b >= 1, q.id); assert.ok(a >= b, q.id + ' scales up'); assert.ok(q.desc(a).length > 3); }
  assert.equal(DAILY_POOL.find((q) => q.id === 'd-sets')!.target(plan), 8); assert.equal(WEEKLY_POOL[0].target(plan), 4); assert.equal(WEEKLY_POOL[0].target({ ...plan, scheduledDays: 7 }), 6);
});
ok('daily XP stays near a third of a normal day (~310 XP)', () => {
  const avg = DAILY_POOL.reduce((s, q) => s + q.xp, 0) / DAILY_POOL.length; const perDay = 1 * (30) + 2 * 40;
  console.log('   avg quest XP', avg.toFixed(0), '| 3 quests/day ~', (3 * avg).toFixed(0), '| weekly total ~', (3 * WEEKLY_POOL.reduce((s, q) => s + q.xp, 0) / WEEKLY_POOL.length).toFixed(0));
  assert.ok(3 * avg < 160 && perDay < 160);
});
ok('rows: progress is capped, done/claimed flags', () => {
  const defs = pickDaily('2026-03-10'); const m = dailyMetrics({ trained: true, full: false, sets: 99, reps: 5, hold: 0, minutes: 1 }, 1);
  const rows = buildRows(defs, plan, m, [defs[0].id]);
  assert.ok(rows.every((r) => r.progress <= r.target)); assert.equal(rows[0].claimed, true);
  const sets = buildRows([DAILY_POOL[0]], plan, m, [])[0]; assert.equal(sets.done, true); assert.equal(sets.progress, sets.target);
});
ok('weekly metrics add up Monday..today only', () => {
  // 2026-03-11 is a Wednesday; week starts Mon 03-09
  const days = { '2026-03-08': { trained: true, reps: 999 }, '2026-03-09': { trained: true, full: true, reps: 100, minutes: 10 }, '2026-03-10': { trained: false, reps: 20 }, '2026-03-11': { trained: true, full: false, reps: 50, hold: 70 }, '2026-03-12': { trained: true, reps: 500 } };
  const m = weeklyMetrics('2026-03-11', days);
  assert.equal(m.days, 2); assert.equal(m.fullDays, 1); assert.equal(m.reps, 170); assert.equal(m.hold, 70); assert.equal(m.minutes, 10);
});
ok('reset timers', () => {
  assert.equal(dailyResetIn(new Date(2026, 2, 10, 18, 30)), '5h 30m'); assert.equal(dailyResetIn(new Date(2026, 2, 10, 23, 59)), '0h 1m');
  assert.equal(weeklyResetIn(new Date(2026, 2, 9, 12, 0)), '6d 12h');   // Monday noon
  assert.equal(weeklyResetIn(new Date(2026, 2, 15, 23, 0)), '0h 60m'.replace('0h 60m', '1h 0m')); // Sunday 23:00
  assert.equal(weeklyResetIn(new Date(2026, 2, 14, 12, 0)), '1d 12h');  // Saturday noon
});
console.log(`\n${n} checks passed`);
