// Achievement catalog + evaluation. Plain data and plain functions.

import type { Lifetime, PeriodResult } from './progress';

export const TIERS = [
  { name: 'Bronze',   gold: 25,   color: '#cd7f32' },
  { name: 'Silver',   gold: 50,   color: '#cbd5e1' },
  { name: 'Gold',     gold: 100,  color: '#fbbf24' },
  { name: 'Platinum', gold: 200,  color: '#5eead4' },
  { name: 'Diamond',  gold: 350,  color: '#60a5fa' },
  { name: 'Ruby',     gold: 600,  color: '#f43f5e' },
  { name: 'Mythic',   gold: 1000, color: '#c084fc' },
] as const;
export const MYTHIC_INDEX = TIERS.length - 1;

export type Category = 'streak' | 'workout' | 'time' | 'seasonal' | 'special';
export type IconKey = 'Flame' | 'Gift' | 'Dumbbell' | 'Swords' | 'Calendar' | 'Zap' | 'Timer' | 'Shield' | 'Crown' | 'Sunrise' | 'Moon' | 'Trophy' | 'Target';

// what we know about the user, used to measure progress
export interface AchContext {
  lifetime: Lifetime;
  today: { trained: boolean; full: boolean; minutes: number; reps: number; hold: number };
  bestStreak: number;
  bestLogin: number;
  ageDays: number;
}

export const fmtMinutes = (m: number) => {
  const total = Math.round(m);
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const r = total % 60;
  return r ? `${h} hr ${r} min` : `${h} hr`;
};
const plural = (n: number, one: string, many = one + 's') => `${n.toLocaleString()} ${n === 1 ? one : many}`;

export interface Series {
  id: string;
  name: string;
  category: Category;
  icon: IconKey;
  thresholds: number[];                 // one per tier (7)
  value: (c: AchContext) => number;
  goal: (t: number) => string;          // text for reaching threshold t
  show: (n: number) => string;          // how to print a progress number
}

export const SERIES: Series[] = [
  {
    id: 'streak', name: 'Unbroken', category: 'streak', icon: 'Flame',
    thresholds: [3, 7, 14, 30, 60, 120, 365],
    value: (c) => c.bestStreak,
    goal: (t) => `Reach a ${plural(t, 'day')} workout streak`,
    show: (n) => plural(Math.floor(n), 'day'),
  },
  {
    id: 'login', name: 'Daily Devotion', category: 'streak', icon: 'Gift',
    thresholds: [3, 7, 14, 30, 60, 100, 200],
    value: (c) => c.bestLogin,
    goal: (t) => `Claim your daily reward ${plural(t, 'day')} in a row`,
    show: (n) => plural(Math.floor(n), 'day'),
  },
  {
    id: 'workouts', name: 'Iron Habit', category: 'workout', icon: 'Dumbbell',
    thresholds: [1, 10, 30, 75, 150, 300, 600],
    value: (c) => c.lifetime.days + (c.today.trained ? 1 : 0),
    goal: (t) => (t === 1 ? 'Complete your first workout' : `Complete ${plural(t, 'workout')}`),
    show: (n) => plural(Math.floor(n), 'workout'),
  },
  {
    id: 'beast', name: 'Beast Mode', category: 'workout', icon: 'Swords',
    thresholds: [1, 7, 21, 50, 100, 200, 400],
    value: (c) => c.lifetime.full + (c.today.full ? 1 : 0),
    goal: (t) => (t === 1 ? 'Finish every set of a day (your first full workout)' : `Finish every set on ${plural(t, 'day')}`),
    show: (n) => plural(Math.floor(n), 'full workout'),
  },
  {
    id: 'perfect', name: 'Perfect Week', category: 'workout', icon: 'Calendar',
    thresholds: [1, 4, 10, 20, 40, 80, 150],
    value: (c) => c.lifetime.perfectWeeks,
    goal: (t) => `Train on every scheduled day in ${plural(t, 'week')}`,
    show: (n) => plural(Math.floor(n), 'week'),
  },
  {
    id: 'reps', name: 'Rep Machine', category: 'workout', icon: 'Zap',
    thresholds: [100, 500, 2000, 5000, 10000, 25000, 50000],
    value: (c) => c.lifetime.reps + c.today.reps,
    goal: (t) => `Do ${plural(t, 'rep')} in total`,
    show: (n) => plural(Math.floor(n), 'rep'),
  },
  {
    id: 'time', name: 'Iron Clock', category: 'time', icon: 'Timer',
    thresholds: [30, 180, 600, 1500, 3000, 6000, 15000], // minutes
    value: (c) => c.lifetime.minutes + c.today.minutes,
    goal: (t) => `Work out for ${fmtMinutes(t)} in total`,
    show: (n) => fmtMinutes(n),
  },
  {
    id: 'plank', name: 'Core of Steel', category: 'time', icon: 'Shield',
    thresholds: [1, 5, 15, 40, 90, 180, 400], // minutes of plank holds
    value: (c) => (c.lifetime.hold + c.today.hold) / 60,
    goal: (t) => `Hold planks for ${fmtMinutes(t)} in total`,
    show: (n) => fmtMinutes(n),
  },
  {
    id: 'veteran', name: 'Veteran', category: 'time', icon: 'Crown',
    thresholds: [7, 30, 100, 200, 365, 730, 1095],
    value: (c) => c.ageDays,
    goal: (t) => `Be a MyFit member for ${plural(t, 'day')}`,
    show: (n) => plural(Math.floor(n), 'day'),
  },
];

export const tiersReached = (thresholds: number[], value: number) => thresholds.filter((t) => value >= t).length;

// ---------- one-off specials ----------
export interface Special { id: string; name: string; desc: string; gold: number; icon: IconKey }
export const SPECIALS: Special[] = [
  { id: 'early-bird', name: 'Early Bird', desc: 'Log a set before 7 AM', gold: 50, icon: 'Sunrise' },
  { id: 'night-owl', name: 'Night Owl', desc: 'Log a set after 10 PM', gold: 50, icon: 'Moon' },
  { id: 'close-call', name: 'Close Call', desc: 'Let a Streak Shield save your streak', gold: 75, icon: 'Shield' },
];

// ---------- monthly / yearly ----------
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const BEAST_GOLD = 150;
export const MARATHON_GOLD = 750;
export const YEAR_BEAST_GOLD = 1500;
export const MARATHON_DAYS = 200;

export const beastId = (year: number, month1: number) => `beast-${year}-${String(month1).padStart(2, '0')}`;
export const marathonId = (year: number) => `marathon-${year}`;
export const yearBeastId = (year: number) => `yearbeast-${year}`;

export interface SeasonalInfo { id: string; name: string; desc: string; gold: number; icon: IconKey }
export function seasonalInfo(id: string): SeasonalInfo | null {
  let m = /^beast-(\d{4})-(\d{2})$/.exec(id);
  if (m) {
    const name = MONTH_NAMES[Number(m[2]) - 1];
    return { id, name: `${name} Beast`, desc: `Finish every scheduled workout in ${name} ${m[1]}`, gold: BEAST_GOLD, icon: 'Swords' };
  }
  m = /^marathon-(\d{4})$/.exec(id);
  if (m) return { id, name: `${m[1]} Marathon Year`, desc: `Train on ${MARATHON_DAYS}+ scheduled days in ${m[1]}`, gold: MARATHON_GOLD, icon: 'Trophy' };
  m = /^yearbeast-(\d{4})$/.exec(id);
  if (m) return { id, name: `${m[1]} Year of the Beast`, desc: `Earn all 12 monthly Beasts in ${m[1]}`, gold: YEAR_BEAST_GOLD, icon: 'Crown' };
  return null;
}

// ---------- unlocking ----------
export interface Unlock { id: string; tier?: number; title: string; gold: number; color: string; icon: IconKey }
export type AchMap = Record<string, string[]>; // id -> unlock date for each tier reached (one date for specials/seasonal)

export function newTierUnlocks(ach: AchMap, ctx: AchContext): Unlock[] {
  const out: Unlock[] = [];
  for (const s of SERIES) {
    const reached = tiersReached(s.thresholds, s.value(ctx));
    const have = (ach[s.id] || []).length;
    for (let t = have; t < reached; t++) {
      out.push({ id: s.id, tier: t, title: `${s.name}: ${TIERS[t].name}`, gold: TIERS[t].gold, color: TIERS[t].color, icon: s.icon });
    }
  }
  return out;
}

export function specialUnlock(ach: AchMap, id: string): Unlock | null {
  const sp = SPECIALS.find((x) => x.id === id);
  if (!sp || (ach[id] && ach[id].length)) return null;
  return { id, title: sp.name, gold: sp.gold, color: '#fbbf24', icon: sp.icon };
}

// monthly Beast / yearly badges from finished periods
export function seasonalUnlocks(periods: PeriodResult[], ach: AchMap): Unlock[] {
  const out: Unlock[] = [];
  const have = (id: string) => (ach[id] && ach[id].length > 0) || out.some((u) => u.id === id);
  const push = (id: string) => {
    const info = seasonalInfo(id);
    if (info && !have(id)) out.push({ id, title: info.name, gold: info.gold, color: '#fbbf24', icon: info.icon });
  };
  for (const p of periods) {
    if (p.kind === 'M' && p.sched > 0 && p.done === p.sched) {
      const [y, m] = p.key.slice(2).split('-').map(Number);
      push(beastId(y, m));
    }
  }
  for (const p of periods) {
    if (p.kind === 'Y') {
      const y = Number(p.key.slice(2));
      if (p.done >= MARATHON_DAYS) push(marathonId(y));
      let all = true;
      for (let m = 1; m <= 12; m++) if (!have(beastId(y, m))) all = false;
      if (all) push(yearBeastId(y));
    }
  }
  return out;
}

// ---------- summaries for the UI ----------
export const BASE_TOTAL = SERIES.length * TIERS.length + SPECIALS.length;

export function countUnlocked(ach: AchMap) {
  let tiers = 0;
  let specials = 0;
  let seasonal = 0;
  for (const [id, dates] of Object.entries(ach)) {
    if (SERIES.some((s) => s.id === id)) tiers += dates.length;
    else if (SPECIALS.some((s) => s.id === id)) specials += dates.length ? 1 : 0;
    else if (seasonalInfo(id)) seasonal += dates.length ? 1 : 0;
  }
  return { tiers, specials, seasonal, total: tiers + specials, seasonalTotal: seasonal };
}

// best thing you own, for the leaderboard / profile preview
export function topAchievement(ach: AchMap): string | null {
  const year = Object.keys(ach).filter((k) => k.startsWith('yearbeast-')).sort().pop();
  if (year) return seasonalInfo(year)!.name;
  let bestN = 0;
  let bestName: string | null = null;
  for (const s of SERIES) {
    const n = (ach[s.id] || []).length;
    if (n > 0 && n >= bestN) { bestN = n; bestName = `${s.name}: ${TIERS[n - 1].name}`; }
  }
  return bestName;
}
