import assert from 'node:assert/strict';
import { SERIES, TIERS, SPECIALS, LEVEL_MILESTONES, RANK_ACHIEVEMENTS, TOP3_GOLD, newTierUnlocks, newSpecialUnlocks, specialUnlock, seasonalUnlocks, tiersReached, countUnlocked, topAchievement, beastId, seasonalInfo, fmtMinutes, BASE_TOTAL, AchContext, AchMap } from '../app/achievements';
import { EMPTY_LIFETIME } from '../app/progress';
let n = 0; const ok = (name: string, fn: () => void) => { fn(); n++; console.log('ok -', name); };
const ctx = (o: Partial<AchContext> = {}): AchContext => ({ lifetime: { ...EMPTY_LIFETIME }, today: { trained: false, full: false, minutes: 0, reps: 0, hold: 0 }, bestStreak: 0, bestLogin: 0, ageDays: 0, level: 0, rankIdx: -1, podiums: 0, ...o });

ok('every series has 7 increasing thresholds', () => { for (const s of SERIES) { assert.equal(s.thresholds.length, TIERS.length, s.id); for (let i = 1; i < 7; i++) assert.ok(s.thresholds[i] > s.thresholds[i - 1], s.id); } });
ok('fresh user: nothing unlocked', () => assert.equal(newTierUnlocks({}, ctx()).length, 0));
ok('first workout (today) -> Iron Habit Bronze', () => {
  const u = newTierUnlocks({}, ctx({ today: { trained: true, full: false, minutes: 10, reps: 20, hold: 0 } }));
  assert.deepEqual(u.map((x) => x.title), ['Iron Habit: Bronze']);
});
ok('first FULL workout -> Beast Mode Bronze too (day-1 full workout)', () => {
  const u = newTierUnlocks({}, ctx({ today: { trained: true, full: true, minutes: 20, reps: 60, hold: 30 } }));
  assert.ok(u.some((x) => x.title === 'Beast Mode: Bronze') && u.some((x) => x.title === 'Iron Habit: Bronze'));
});
ok('30 minutes -> Iron Clock Bronze; 3 hours -> Silver', () => {
  let u = newTierUnlocks({}, ctx({ today: { trained: true, full: false, minutes: 30, reps: 0, hold: 0 } }));
  assert.ok(u.some((x) => x.title === 'Iron Clock: Bronze'));
  u = newTierUnlocks({ time: ['2026-01-01'] }, ctx({ lifetime: { ...EMPTY_LIFETIME, minutes: 190 } }));
  assert.deepEqual(u.filter((x) => x.id === 'time').map((x) => x.title), ['Iron Clock: Silver']);
});
ok('jumping several tiers awards each tier once', () => {
  const u = newTierUnlocks({}, ctx({ lifetime: { ...EMPTY_LIFETIME, minutes: 1600 } })).filter((x) => x.id === 'time');
  assert.deepEqual(u.map((x) => x.tier), [0, 1, 2, 3]);
  assert.equal(u.reduce((a, x) => a + x.gold, 0), 25 + 50 + 100 + 200);
});
ok('idempotent: already-owned tiers never repeat', () => {
  const c = ctx({ lifetime: { ...EMPTY_LIFETIME, minutes: 1600 } });
  const first = newTierUnlocks({}, c);
  const ach: AchMap = {}; first.forEach((u) => { ach[u.id] = [...(ach[u.id] || []), '2026-01-01']; });
  assert.equal(newTierUnlocks(ach, c).length, 0);
});
ok('Mythic needs 250 hours', () => {
  const t = SERIES.find((s) => s.id === 'time')!;
  assert.equal(tiersReached(t.thresholds, 14999), 6); assert.equal(tiersReached(t.thresholds, 15000), 7);
  assert.equal(fmtMinutes(15000), '250 hr'); assert.equal(fmtMinutes(30), '30 min'); assert.equal(fmtMinutes(90), '1 hr 30 min');
});
ok('streak + login series follow best values', () => {
  const u = newTierUnlocks({}, ctx({ bestStreak: 7, bestLogin: 3 })).map((x) => x.title);
  assert.deepEqual(u.sort(), ['Daily Devotion: Bronze', 'Unbroken: Bronze', 'Unbroken: Silver'].sort());
});
ok('plank hold counts in minutes', () => {
  const u = newTierUnlocks({}, ctx({ lifetime: { ...EMPTY_LIFETIME, hold: 5 * 60 } })).map((x) => x.title);
  assert.deepEqual(u.sort(), ['Core of Steel: Bronze', 'Core of Steel: Silver'].sort());
});
ok('specials unlock once', () => { assert.equal(specialUnlock({}, 'early-bird')!.title, 'Early Bird'); assert.equal(specialUnlock({ 'early-bird': ['x'] }, 'early-bird'), null); assert.equal(specialUnlock({}, 'nope'), null); });
ok('March Beast from a perfect month', () => {
  const u = seasonalUnlocks([{ kind: 'M', key: 'M:2026-03', sched: 27, done: 27 }], {});
  assert.deepEqual(u.map((x) => x.title), ['March Beast']); assert.equal(u[0].id, beastId(2026, 3)); assert.equal(u[0].gold, 150);
});
ok('a month with a miss gives nothing; an all-rest month gives nothing', () => {
  assert.equal(seasonalUnlocks([{ kind: 'M', key: 'M:2026-03', sched: 27, done: 26 }], {}).length, 0);
  assert.equal(seasonalUnlocks([{ kind: 'M', key: 'M:2026-03', sched: 0, done: 0 }], {}).length, 0);
});
ok('no double award for an owned month', () => assert.equal(seasonalUnlocks([{ kind: 'M', key: 'M:2026-03', sched: 5, done: 5 }], { [beastId(2026, 3)]: ['d'] }).length, 0));
ok('Year of the Beast needs all 12 months; Marathon needs 200 days', () => {
  const ach: AchMap = {}; for (let m = 1; m <= 11; m++) ach[beastId(2026, m)] = ['d'];
  assert.equal(seasonalUnlocks([{ kind: 'Y', key: 'Y:2026', sched: 300, done: 250 }], ach).map((x) => x.id).join(), 'marathon-2026');
  const both = seasonalUnlocks([{ kind: 'M', key: 'M:2026-12', sched: 20, done: 20 }, { kind: 'Y', key: 'Y:2026', sched: 300, done: 250 }], ach).map((x) => x.id);
  assert.deepEqual(both.sort(), [beastId(2026, 12), 'marathon-2026', 'yearbeast-2026'].sort());
  assert.equal(seasonalInfo('yearbeast-2026')!.name, '2026 Year of the Beast');
});
ok('counts and top achievement', () => {
  const ach: AchMap = { time: ['a', 'b', 'c'], streak: ['a'], 'early-bird': ['a'], [beastId(2026, 3)]: ['a'] };
  const c = countUnlocked(ach); assert.deepEqual([c.tiers, c.specials, c.seasonal, c.total], [4, 1, 1, 5]);
  assert.equal(topAchievement(ach), 'Iron Clock: Gold'); assert.equal(topAchievement({}), null); assert.equal(BASE_TOTAL, SERIES.length * 7 + SPECIALS.length);
});
ok('level milestones: 20/40/60/80/100 with growing gold, each once', () => {
  assert.deepEqual(LEVEL_MILESTONES.map((m) => m.level), [20, 40, 60, 80, 100]);
  assert.equal(newSpecialUnlocks({}, ctx({ level: 19 })).filter((u) => u.id.startsWith('level-')).length, 0);
  const u = newSpecialUnlocks({}, ctx({ level: 45 })).filter((x) => x.id.startsWith('level-'));
  assert.deepEqual(u.map((x) => [x.id, x.gold]), [['level-20', 300], ['level-40', 600]]);
  assert.equal(newSpecialUnlocks({ 'level-20': ['d'], 'level-40': ['d'] }, ctx({ level: 45 })).filter((x) => x.id.startsWith('level-')).length, 0);
  const all = newSpecialUnlocks({}, ctx({ level: 100 })).filter((x) => x.id.startsWith('level-')); assert.equal(all.reduce((a, x) => a + x.gold, 0), 300 + 600 + 1000 + 1500 + 3000);
});
ok('rank achievements follow the season rank (unranked gives none, Mythic gives all six)', () => {
  assert.equal(newSpecialUnlocks({}, ctx({ rankIdx: -1 })).filter((u) => u.id.startsWith('rank-')).length, 0);
  assert.deepEqual(newSpecialUnlocks({}, ctx({ rankIdx: 0 })).filter((u) => u.id.startsWith('rank-')).map((u) => u.title), ['Enter the Arena']);
  assert.equal(newSpecialUnlocks({}, ctx({ rankIdx: 5 })).filter((u) => u.id.startsWith('rank-')).length, 6);
  assert.equal(RANK_ACHIEVEMENTS.length, 6);
  // a rank drop after the yearly reset never takes an achievement away: already-owned ones are skipped
  assert.equal(newSpecialUnlocks({ 'rank-3': ['d'] }, ctx({ rankIdx: 3 })).some((u) => u.id === 'rank-3'), false);
});
ok('podium series counts weekly top-3 finishes; podium specials are event-based', () => {
  const u = newTierUnlocks({}, ctx({ podiums: 3 })).filter((x) => x.id === 'podiums').map((x) => x.title);
  assert.deepEqual(u, ['Podium Regular: Bronze', 'Podium Regular: Silver']);
  assert.equal(specialUnlock({}, 'podium')!.gold, 100); assert.equal(specialUnlock({}, 'arena-champion')!.gold, 250);
  assert.equal(newSpecialUnlocks({}, ctx({ level: 100, rankIdx: 5, podiums: 9 })).some((x) => x.id === 'podium' || x.id === 'arena-champion'), false);
  assert.deepEqual([...TOP3_GOLD], [300, 200, 100]);
});
console.log(`\n${n} checks passed`);
