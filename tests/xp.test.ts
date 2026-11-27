import assert from "node:assert/strict";
import { dayXp, xpForLevel, levelFromXp, levelProgress, rankIndex, rankName, rankProgress, MAX_LEVEL, RANKS, resetXp, RANK_DROP, SEASON_RANK_GOLD, SEASON_PODIUM_GOLD } from "../app/xp";
import { RIVALS, rivalXp, rivalXpBefore, refreshIn, epochDay } from "../app/rivals";
let n = 0; const ok = (name: string, fn: () => void) => { fn(); n++; console.log("ok -", name); };
ok("day XP: sets + full bonus + capped streak bonus (only when trained)", () => {
  assert.equal(dayXp(0, false, false, 5), 0);
  assert.equal(dayXp(3, false, false, 5), 30);
  assert.equal(dayXp(8, false, true, 3), 80 + 30);
  assert.equal(dayXp(16, true, true, 4), 160 + 50 + 40);
  assert.equal(dayXp(16, true, true, 40), 160 + 50 + 100);
});
ok("levels start at 0 and cost 200+15n each", () => {
  assert.equal(levelFromXp(0), 0); assert.equal(xpForLevel(1), 215); assert.equal(levelFromXp(214), 0); assert.equal(levelFromXp(215), 1);
  assert.equal(xpForLevel(2) - xpForLevel(1), 230);
});
ok("level 20/40/60/80/100 pace at ~300 XP a day", () => {
  const days = [20, 40, 60, 80, 100].map((l) => Math.round(xpForLevel(l) / 300));
  console.log("   days:", days.join(", "), "| total XP for 100:", xpForLevel(100));
  assert.ok(days[0] >= 15 && days[0] <= 35 && days[4] >= 250 && days[4] <= 400);
});
ok("max level is capped", () => { assert.equal(levelFromXp(10 ** 9), MAX_LEVEL); assert.equal(levelProgress(10 ** 9).maxed, true); assert.equal(levelProgress(10 ** 9).pct, 100); });
ok("level progress numbers", () => { const p = levelProgress(215 + 115); assert.deepEqual([p.level, p.into, p.need], [1, 115, 230]); assert.equal(Math.round(p.pct), 50); });
ok("rank: unranked at 0 XP, Recruit after the first XP, thresholds respected", () => {
  assert.equal(rankIndex(0), -1); assert.equal(rankName(-1), "Unranked"); assert.equal(rankIndex(1), 0);
  assert.equal(rankIndex(2499), 0); assert.equal(rankIndex(2500), 1); assert.equal(rankIndex(70000), 5); assert.equal(rankIndex(10 ** 7), 5);
  assert.equal(RANKS.length, 6);
  assert.deepEqual(rankProgress(2400), { idx: 0, nextName: "Warrior", toNext: 100 }); assert.deepEqual(rankProgress(99999), { idx: 5, nextName: null, toNext: 0 });
});
const start = "2026-03-10";
ok("rivals are deterministic and never lose XP over time", () => {
  for (const r of RIVALS) {
    let prev = -1;
    for (let h = 0; h < 24 * 60; h += 4) {
      const t = new Date(2026, 2, 10, 0, 0); t.setHours(t.getHours() + h);
      const x = rivalXp(r, start, t); assert.ok(x >= prev, r.id + " dropped"); prev = x;
      assert.equal(rivalXp(r, start, t), x);
    }
  }
});
ok("rivals start in ranked order and spread over several ranks", () => {
  const day0 = new Date(2026, 2, 10, 0, 0); const xs = RIVALS.map((r) => rivalXp(r, start, day0));
  assert.deepEqual([...xs].sort((a, b) => b - a), xs);
  const ranks = new Set(xs.map(rankIndex)); assert.ok(ranks.size >= 3, "ranks " + [...ranks]);
});
ok("rivals move during the day (every 4 hours) and between days", () => {
  const r = RIVALS[0]; const a = rivalXp(r, start, new Date(2026, 2, 12, 3, 0)), b = rivalXp(r, start, new Date(2026, 2, 12, 23, 0)), c = rivalXp(r, start, new Date(2026, 2, 13, 3, 0));
  assert.ok(b >= a); assert.ok(c >= b);
});
ok("a daily trainer can pass every rival, a casual one cannot reach the top", () => {
  const sim = (perDay: (d: number) => number, days: number) => { let xp = 0; for (let d = 0; d < days; d++) xp += perDay(d); return xp; };
  const when = (days: number) => new Date(2026, 2, 10 + days, 23, 0);
  const top = (days: number) => Math.max(...RIVALS.map((r) => rivalXp(r, start, when(days))));
  const daily = (d: number) => 310 + Math.min(d, 28) * 6;
  let beatAllAt = -1; for (let d = 1; d <= 200; d++) if (sim(daily, d) > top(d)) { beatAllAt = d; break; }
  console.log("   daily trainer is #1 after", beatAllAt, "days");
  assert.ok(beatAllAt > 0 && beatAllAt < 150);
  const casual = (d: number) => (d % 7 < 3 ? 220 : 0);
  assert.ok(sim(casual, 60) < top(60));
  const lowest = RIVALS[RIVALS.length - 1]; assert.ok(sim(daily, 3) > rivalXp(lowest, start, when(3)));
});
ok("refresh text counts down to the next 4-hour mark", () => {
  assert.equal(refreshIn(new Date(2026, 2, 10, 0, 0)), "4h 0m"); assert.equal(refreshIn(new Date(2026, 2, 10, 3, 30)), "0h 30m"); assert.equal(refreshIn(new Date(2026, 2, 10, 23, 59)), "0h 1m");
  assert.equal(epochDay("1970-01-02"), 1);
});
ok("yearly reset: everyone drops 3 ranks to that rank's XP floor, never below Recruit", () => {
  assert.equal(RANK_DROP, 3);
  assert.equal(resetXp(0), 0);            // unranked stays unranked
  assert.equal(resetXp(100), 0);          // Recruit -> Recruit
  assert.equal(resetXp(2500), 0);         // Warrior -> Recruit
  assert.equal(resetXp(9000), 0);         // Gladiator -> Recruit
  assert.equal(resetXp(20000), 0);        // Champion -> Recruit
  assert.equal(resetXp(40000), 2500);     // Overlord -> Warrior
  assert.equal(resetXp(70000), 8000);     // Mythic -> Gladiator
  assert.equal(resetXp(10 ** 7), 8000);
  assert.equal(SEASON_RANK_GOLD.length, RANKS.length); assert.deepEqual([...SEASON_PODIUM_GOLD], [2000, 1200, 700]);
});
ok("rivals reset on Jan 1 too, final standings use the pre-reset value", () => {
  const s = "2026-01-01"; const v = RIVALS[0];
  const finalXp = rivalXpBefore(v, s, "2027-01-01");
  assert.ok(finalXp > 40000, "vanguard should be deep into the ranks by year end: " + finalXp);
  const after = rivalXp(v, s, new Date(2027, 0, 1, 0, 0));
  assert.equal(after, resetXp(finalXp));
  assert.ok(rivalXp(v, s, new Date(2027, 0, 2, 12, 0)) >= after);
  assert.ok(rivalXp(v, s, new Date(2026, 11, 31, 23, 0)) >= rivalXp(v, s, new Date(2026, 11, 30, 23, 0)));
  assert.equal(rivalXpBefore(v, s, "2026-06-01") <= rivalXpBefore(v, s, "2026-06-02"), true);
  // starting on Jan 1 itself does not drop anything
  assert.equal(rivalXp(RIVALS[3], "2027-01-01", new Date(2027, 0, 1, 0, 0)), RIVALS[3].head);
  console.log("   vanguard final 2026 XP", finalXp, "-> starts 2027 at", after);
});
console.log("\n" + n + " checks passed");
