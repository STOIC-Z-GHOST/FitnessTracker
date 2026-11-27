// XP, levels and ranks.
//   Level = lifetime XP (never resets, 0..100)
//   Rank  = season XP (this year's XP; the yearly reset comes later)

export const XP_PER_SET = 10;
export const XP_FULL_BONUS = 50;     // every set of the day done
export const XP_STREAK_STEP = 10;    // bonus per streak day on a trained day...
export const XP_STREAK_CAP = 100;    // ...up to this much

export const MAX_LEVEL = 100;

// XP earned today, from what is ticked off right now
export const dayXp = (sets: number, full: boolean, trained: boolean, streak: number) =>
  Math.max(0, sets) * XP_PER_SET +
  (full ? XP_FULL_BONUS : 0) +
  (trained ? Math.min(XP_STREAK_CAP, XP_STREAK_STEP * Math.max(0, streak)) : 0);

// total XP needed to reach level n (level 0 = 0 XP). Each level costs 200 + 15n.
export const xpForLevel = (n: number) => (n <= 0 ? 0 : 200 * n + (15 * n * (n + 1)) / 2);

export const levelFromXp = (xp: number) => {
  let l = 0;
  while (l < MAX_LEVEL && xp >= xpForLevel(l + 1)) l++;
  return l;
};

export interface LevelInfo { level: number; into: number; need: number; pct: number; maxed: boolean }
export const levelProgress = (xp: number): LevelInfo => {
  const level = levelFromXp(xp);
  if (level >= MAX_LEVEL) return { level, into: 0, need: 0, pct: 100, maxed: true };
  const base = xpForLevel(level);
  const need = xpForLevel(level + 1) - base;
  const into = Math.max(0, xp - base);
  return { level, into, need, pct: Math.min(100, (into / need) * 100), maxed: false };
};

export const RANKS = [
  { name: 'Recruit',   min: 0,     color: '#9ca3af' },
  { name: 'Warrior',   min: 2500,  color: '#34d399' },
  { name: 'Gladiator', min: 8000,  color: '#60a5fa' },
  { name: 'Champion',  min: 20000, color: '#fbbf24' },
  { name: 'Overlord',  min: 40000, color: '#f43f5e' },
  { name: 'Mythic',    min: 70000, color: '#c084fc' },
] as const;

// -1 = unranked (no XP this season yet)
export const rankIndex = (seasonXp: number) => {
  if (seasonXp <= 0) return -1;
  let idx = 0;
  RANKS.forEach((r, i) => { if (seasonXp >= r.min) idx = i; });
  return idx;
};
// Yearly reset: everyone drops 3 ranks (never below Recruit) and starts the new season at that rank's XP floor.
export const RANK_DROP = 3;
export const resetXp = (seasonXp: number) => {
  const idx = rankIndex(seasonXp);
  return idx < 0 ? 0 : RANKS[Math.max(0, idx - RANK_DROP)].min;
};

// Gold for the rank you finish a season with, and extra for the final top 3
export const SEASON_RANK_GOLD = [50, 200, 500, 1200, 2500, 5000] as const; // Recruit .. Mythic
export const SEASON_PODIUM_GOLD = [2000, 1200, 700] as const;

export const rankName = (idx: number) => (idx < 0 ? 'Unranked' : RANKS[idx].name);
export const rankColor = (idx: number) => (idx < 0 ? '#6b7280' : RANKS[idx].color);

export const rankProgress = (seasonXp: number) => {
  const idx = rankIndex(seasonXp);
  const next = idx + 1 < RANKS.length ? RANKS[idx + 1] : null;
  return { idx, nextName: next ? next.name : null, toNext: next ? Math.max(0, next.min - seasonXp) : 0 };
};

export const fmtXp = (n: number) => Math.round(n).toLocaleString('en-US');
