// Streaks, the daily login reward, and the per-day bookkeeping that achievements read from.
// Everything here is plain functions on plain data so it is easy to test.

import { todayStr, daysBetween } from './workoutPlan';

// A day counts as "trained" when at least this share of the day's sets is done.
export const STREAK_MIN_FRACTION = 0.5;

export const MAX_SHIELDS = 3;      // streak protections you can hold at once
export const SHIELD_PRICE = 400;   // gold

// Gold for day 1..7 of the login chain, then it loops (the chain count keeps growing)
export const LOGIN_REWARDS = [20, 25, 30, 40, 50, 60, 100];
export const rewardForChain = (chain: number) => LOGIN_REWARDS[(Math.max(1, chain) - 1) % LOGIN_REWARDS.length];
export const chainDayIndex = (chain: number) => (Math.max(1, chain) - 1) % LOGIN_REWARDS.length; // 0..6

export const addDays = (iso: string, n: number) => {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return todayStr(d);
};

const weekdayOf = (iso: string) => new Date(iso + 'T00:00:00').getDay(); // 0 = Sunday
const mondayOf = (iso: string) => addDays(iso, -((weekdayOf(iso) + 6) % 7));

// ---------- what we remember about each finished day ----------
export interface DayRecord {
  power: number;
  time: number;
  discipline: number;
  trained: boolean;   // reached STREAK_MIN_FRACTION of the day's sets
  sets?: number;
  minutes?: number;   // time spent (active + rest)
  reps?: number;
  hold?: number;      // plank seconds
  full?: boolean;     // every set of the day done
}

export interface Lifetime {
  days: number;         // days trained
  full: number;         // days with every set done
  minutes: number;
  reps: number;
  hold: number;         // plank seconds
  perfectWeeks: number;
  shieldsUsed: number;
}
export const EMPTY_LIFETIME: Lifetime = { days: 0, full: 0, minutes: 0, reps: 0, hold: 0, perfectWeeks: 0, shieldsUsed: 0 };

export interface Tally { sched: number; done: number }

export interface ProgressState {
  streak: number;                    // settled streak (days before today)
  best: number;
  cursor: string;                    // last day that has been settled (inclusive)
  shields: number;
  lifetime: Lifetime;
  tallies: Record<string, Tally>;    // 'W:2026-11-16' | 'M:2026-11' | 'Y:2026'
}

export interface PeriodResult { kind: 'W' | 'M' | 'Y'; key: string; sched: number; done: number }

export interface SettleResult {
  state: ProgressState;
  usedOn: string[];       // days a shield saved
  lost: boolean;
  lostStreak: number;     // length of the streak that ended (0 if none)
  periods: PeriodResult[];
}

// Walk every day after `cursor` up to (not including) today.
export function settleStreak(
  input: ProgressState,
  today: string,
  restDays: number[],
  history: Record<string, DayRecord | undefined>,
  startDate: string,
): SettleResult {
  const s: ProgressState = {
    ...input,
    lifetime: { ...input.lifetime },
    tallies: Object.fromEntries(Object.entries(input.tallies).map(([k, v]) => [k, { ...v }])),
  };
  const usedOn: string[] = [];
  const periods: PeriodResult[] = [];
  let lost = false;
  let lostStreak = 0;

  const bump = (kind: 'W' | 'M' | 'Y', iso: string, scheduled: boolean, trained: boolean) => {
    const start = kind === 'W' ? mondayOf(iso) : kind === 'M' ? iso.slice(0, 7) + '-01' : iso.slice(0, 4) + '-01-01';
    if (start < startDate) return; // only periods the app covered from their very first day
    const label = kind === 'W' ? start : kind === 'M' ? iso.slice(0, 7) : iso.slice(0, 4);
    const key = `${kind}:${label}`;
    const t = s.tallies[key] || (s.tallies[key] = { sched: 0, done: 0 });
    if (scheduled) { t.sched += 1; if (trained) t.done += 1; }
  };

  let d = addDays(s.cursor, 1);
  let guard = 0;
  while (d < today && guard++ < 4000) {
    const rec = history[d];
    const trained = !!rec?.trained;
    const rest = restDays.includes(weekdayOf(d));

    if (rec) {
      s.lifetime.minutes += rec.minutes || 0;
      s.lifetime.reps += rec.reps || 0;
      s.lifetime.hold += rec.hold || 0;
      if (trained) s.lifetime.days += 1;
      if (rec.full) s.lifetime.full += 1;
    }

    if (trained) {
      s.streak += 1;
      if (s.streak > s.best) s.best = s.streak;
    } else if (!rest) {
      if (s.shields > 0) {
        s.shields -= 1;
        s.lifetime.shieldsUsed += 1;
        usedOn.push(d);
      } else if (s.streak > 0) {
        lost = true;
        lostStreak = s.streak;
        s.streak = 0;
      }
    }

    const scheduled = !rest;
    bump('W', d, scheduled, trained);
    bump('M', d, scheduled, trained);
    bump('Y', d, scheduled, trained);

    const next = addDays(d, 1);
    const closing: ('W' | 'M' | 'Y')[] = [];
    if (weekdayOf(d) === 0) closing.push('W');                 // Sunday ends the week
    if (next.slice(8) === '01') closing.push('M');             // last day of month
    if (next.slice(5) === '01-01') closing.push('Y');          // Dec 31
    for (const kind of closing) {
      const label = kind === 'W' ? mondayOf(d) : kind === 'M' ? d.slice(0, 7) : d.slice(0, 4);
      const key = `${kind}:${label}`;
      const t = s.tallies[key];
      if (t) {
        periods.push({ kind, key, sched: t.sched, done: t.done });
        if (kind === 'W' && t.sched > 0 && t.done === t.sched) s.lifetime.perfectWeeks += 1;
        delete s.tallies[key];
      }
    }
    s.cursor = d;
    d = next;
  }
  // make sure the cursor never lags behind yesterday even if nothing was walked
  const yesterday = addDays(today, -1);
  if (s.cursor < yesterday) s.cursor = yesterday;

  return { state: s, usedOn, lost, lostStreak, periods };
}

// ---------- daily login reward ----------
export interface LoginStatus { claimed: boolean; nextChain: number; reset: boolean }

export function loginStatus(lastClaim: string, chain: number, today: string): LoginStatus {
  if (lastClaim && lastClaim >= today) return { claimed: true, nextChain: chain, reset: false };
  if (lastClaim && daysBetween(lastClaim, today) === 1) return { claimed: false, nextChain: chain + 1, reset: false };
  // first ever claim, or at least one day was skipped -> back to day 1
  return { claimed: false, nextChain: 1, reset: !!lastClaim && chain > 1 };
}

// next streak milestone for the progress bar on the home card
export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 120, 365, 730, 1000];
export const nextMilestone = (streak: number) => STREAK_MILESTONES.find((m) => m > streak) ?? streak + 100;
export const prevMilestone = (streak: number) => [...STREAK_MILESTONES].reverse().find((m) => m <= streak) ?? 0;
