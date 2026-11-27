// Daily and weekly quests. Picked from a pool by date (same picks all day / all week),
// targets scale with the person's plan, progress comes from what they already log.

import { addDays, mondayOf } from './progress';
import { hashStr, mulberry32 } from './rivals';

export type Metric = 'sets' | 'reps' | 'hold' | 'minutes' | 'full' | 'trained' | 'rounds' | 'days' | 'fullDays';
export type QuestKind = 'daily' | 'weekly';

export interface QuestPlan {
  totalSets: number;        // sets in one full day
  setsPerExercise: number;  // rounds
  exercises: number;
  repsPerRound: number;     // reps in one round (pike + diamond + wide)
  plankSeconds: number;     // plank hold per set
  plannedMinutes: number;   // length of a full workout
  scheduledDays: number;    // training days per week
}

export interface QuestDef {
  id: string;
  kind: QuestKind;
  group?: 'easy' | 'hard';
  title: string;
  metric: Metric;
  target: (p: QuestPlan) => number;
  desc: (t: number) => string;
  unit: (n: number) => string;   // how to print progress numbers
  xp: number;
  gold: number;
}

const num = (n: number) => `${Math.round(n)}`;
const secs = (n: number) => `${Math.round(n)}s`;
const mins = (n: number) => `${Math.round(n)} min`;
const minsFromSec = (n: number) => `${Math.round(n / 60)} min`;

export const DAILY_POOL: QuestDef[] = [
  { id: 'd-sets',    kind: 'daily', group: 'easy', title: 'Warm Up',      metric: 'sets',    target: (p) => Math.max(3, Math.ceil(p.totalSets / 2)), desc: (t) => `Complete ${t} sets`, unit: num, xp: 30, gold: 10 },
  { id: 'd-trained', kind: 'daily', group: 'easy', title: 'Show Up',      metric: 'trained', target: () => 1, desc: () => "Reach half of today's sets", unit: (n) => (n >= 1 ? 'Done' : 'Not yet'), xp: 30, gold: 10 },
  { id: 'd-minutes', kind: 'daily', group: 'easy', title: 'Time on Task', metric: 'minutes', target: (p) => Math.max(5, Math.round(p.plannedMinutes / 2)), desc: (t) => `Work out for ${t} minutes`, unit: mins, xp: 30, gold: 10 },
  { id: 'd-rounds',  kind: 'daily', group: 'hard', title: 'Round Trip',   metric: 'rounds',  target: (p) => Math.max(1, Math.min(2, p.setsPerExercise)), desc: (t) => `Complete ${t} full ${t === 1 ? 'round' : 'rounds'} (every exercise)`, unit: num, xp: 40, gold: 10 },
  { id: 'd-reps',    kind: 'daily', group: 'hard', title: 'Rep Hunter',   metric: 'reps',    target: (p) => Math.max(10, 2 * p.repsPerRound), desc: (t) => `Do ${t} reps`, unit: num, xp: 35, gold: 10 },
  { id: 'd-hold',    kind: 'daily', group: 'hard', title: 'Core Check',   metric: 'hold',    target: (p) => Math.max(30, 2 * p.plankSeconds), desc: (t) => `Hold planks for ${t} seconds in total`, unit: secs, xp: 25, gold: 10 },
  { id: 'd-full',    kind: 'daily', group: 'hard', title: 'Finish Line',  metric: 'full',    target: () => 1, desc: () => 'Finish every set today', unit: (n) => (n >= 1 ? 'Done' : 'Not yet'), xp: 60, gold: 20 },
];

export const WEEKLY_POOL: QuestDef[] = [
  { id: 'w-days',    kind: 'weekly', title: 'Consistency',   metric: 'days',     target: (p) => Math.max(3, p.scheduledDays - 1), desc: (t) => `Train on ${t} days this week`, unit: num, xp: 150, gold: 60 },
  { id: 'w-full',    kind: 'weekly', title: 'Beast Week',    metric: 'fullDays', target: (p) => Math.max(2, Math.floor(p.scheduledDays / 2)), desc: (t) => `Finish every set on ${t} days`, unit: num, xp: 150, gold: 60 },
  { id: 'w-reps',    kind: 'weekly', title: 'Rep Storm',     metric: 'reps',     target: (p) => Math.max(3, Math.round(p.scheduledDays * 0.6)) * p.setsPerExercise * p.repsPerRound, desc: (t) => `Do ${t.toLocaleString()} reps this week`, unit: num, xp: 120, gold: 60 },
  { id: 'w-hold',    kind: 'weekly', title: 'Iron Core',     metric: 'hold',     target: (p) => 2 * p.setsPerExercise * p.plankSeconds, desc: (t) => `Hold planks for ${Math.round(t / 60)} minutes in total`, unit: minsFromSec, xp: 100, gold: 60 },
  { id: 'w-minutes', kind: 'weekly', title: 'Marathon Week', metric: 'minutes',  target: (p) => Math.max(10, Math.round(p.plannedMinutes * Math.max(2, Math.round(p.scheduledDays * 0.6)))), desc: (t) => `Work out for ${t} minutes this week`, unit: mins, xp: 120, gold: 60 },
];

const shuffle = <T,>(arr: T[], rnd: () => number) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

// 1 easy + 2 harder ones, so there is always something doable on a slow day
export function pickDaily(dateIso: string): QuestDef[] {
  const rnd = mulberry32(hashStr('daily:' + dateIso));
  const easy = DAILY_POOL.filter((q) => q.group === 'easy');
  const hard = DAILY_POOL.filter((q) => q.group === 'hard');
  return [easy[Math.floor(rnd() * easy.length)], ...shuffle(hard, rnd).slice(0, 2)];
}

// 'Consistency' every week + 2 others
export function pickWeekly(weekKey: string): QuestDef[] {
  const rnd = mulberry32(hashStr('weekly:' + weekKey));
  const core = WEEKLY_POOL[0];
  return [core, ...shuffle(WEEKLY_POOL.slice(1), rnd).slice(0, 2)];
}

export const weekKeyOf = (iso: string) => mondayOf(iso);

// ---- progress ----
export interface DayStats { trained: boolean; full: boolean; sets: number; reps: number; hold: number; minutes: number }

export function dailyMetrics(today: DayStats, rounds: number): Record<Metric, number> {
  return {
    sets: today.sets, reps: today.reps, hold: today.hold, minutes: today.minutes,
    full: today.full ? 1 : 0, trained: today.trained ? 1 : 0, rounds,
    days: today.trained ? 1 : 0, fullDays: today.full ? 1 : 0,
  };
}

// sum over Monday..today; `days` maps date -> that day's stats (today's must be the live one)
export function weeklyMetrics(todayIso: string, days: Record<string, Partial<DayStats> | undefined>): Record<Metric, number> {
  const out: Record<Metric, number> = { sets: 0, reps: 0, hold: 0, minutes: 0, full: 0, trained: 0, rounds: 0, days: 0, fullDays: 0 };
  let d = weekKeyOf(todayIso);
  while (d <= todayIso) {
    const r = days[d];
    if (r) {
      out.sets += r.sets || 0; out.reps += r.reps || 0; out.hold += r.hold || 0; out.minutes += r.minutes || 0;
      if (r.trained) out.days += 1;
      if (r.full) out.fullDays += 1;
    }
    d = addDays(d, 1);
  }
  return out;
}

export interface QuestRow { def: QuestDef; target: number; progress: number; done: boolean; claimed: boolean }

export function buildRows(defs: QuestDef[], plan: QuestPlan, metrics: Record<Metric, number>, claimed: string[]): QuestRow[] {
  return defs.map((def) => {
    const target = def.target(plan);
    const progress = Math.min(metrics[def.metric], target);
    return { def, target, progress, done: metrics[def.metric] >= target, claimed: claimed.includes(def.id) };
  });
}

// "5h 12m" until local midnight / "3d 5h" until Monday 00:00
export function dailyResetIn(now: Date) {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  const mins = Math.max(0, Math.round((next.getTime() - now.getTime()) / 60000));
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}
export function weeklyResetIn(now: Date) {
  const daysToMonday = ((8 - now.getDay()) % 7) || 7; // Monday = 1
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysToMonday, 0, 0, 0);
  const mins = Math.max(0, Math.round((next.getTime() - now.getTime()) / 60000));
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  return d > 0 ? `${d}d ${h}h` : `${h}h ${mins % 60}m`;
}
