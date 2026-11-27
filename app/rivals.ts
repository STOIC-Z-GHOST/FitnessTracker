// Simulated rivals for the leaderboard. They "train" on a seeded schedule, so the board moves
// every 4 hours even while the app is closed and needs no server. Same inputs -> same numbers.

import { todayStr } from './workoutPlan';
import { resetXp } from './xp';

export interface Rival {
  id: string;
  name: string;
  avatarColor: string;
  title: string;
  achievement: string;
  streak: number;
  head: number;        // XP they already have on your first day
  rate: number;        // average XP on a day they train
  rest: number;        // chance of taking a day off (0..1)
  power: number; time: number; discipline: number;
  weekPattern: number[];
  statsVisible: boolean;
}

export const RIVALS: Rival[] = [
  { id: 'vanguard',  name: 'Vanguard_Overlord', avatarColor: 'from-yellow-400 to-amber-600',  title: 'Overlord',          achievement: 'Iron Will — 120 Day Unbroken Streak', streak: 120, head: 13500, rate: 270, rest: 0.1, power: 92, time: 88, discipline: 95, weekPattern: [70, 85, 60, 95, 100, 80, 90], statsVisible: true },
  { id: 'sleeper',   name: 'SleeperBuildPro',   avatarColor: 'from-purple-500 to-indigo-600', title: 'Sleeper Build',     achievement: 'Diamond Push-Up Mastery',            streak: 84,  head: 10200, rate: 255, rest: 0.12, power: 80, time: 75, discipline: 85, weekPattern: [60, 70, 90, 50, 80, 95, 70], statsVisible: true },
  { id: 'calking',   name: 'CalisthenicsKing',  avatarColor: 'from-cyan-400 to-blue-600',     title: 'Calisthenics King', achievement: 'Hollow Body Specialist',             streak: 56,  head: 8400, rate: 235, rest: 0.12, power: 70, time: 65, discipline: 78, weekPattern: [50, 60, 70, 65, 80, 55, 75], statsVisible: true },
  { id: 'hollow',    name: 'HollowBodyWarrior', avatarColor: 'from-emerald-400 to-teal-600',  title: 'Rising Star',       achievement: 'Most Improved Warrior',              streak: 19,  head: 5600, rate: 210, rest: 0.15, power: 55, time: 60, discipline: 50, weekPattern: [40, 55, 30, 60, 45, 50, 35], statsVisible: false },
  { id: 'fiona',     name: 'IronPalmFiona',     avatarColor: 'from-pink-400 to-rose-600',     title: 'Iron Palm',         achievement: 'Perfect Week x12',                   streak: 33,  head: 3900, rate: 185, rest: 0.15, power: 62, time: 58, discipline: 70, weekPattern: [55, 65, 40, 70, 60, 75, 50], statsVisible: true },
  { id: 'plankq',    name: 'PlankQueen',        avatarColor: 'from-sky-400 to-indigo-500',    title: 'Core Crusher',      achievement: 'Core of Steel — 90 min of planks',   streak: 21,  head: 2600, rate: 160, rest: 0.18, power: 48, time: 70, discipline: 66, weekPattern: [30, 50, 60, 45, 55, 40, 65], statsVisible: true },
  { id: 'raven',     name: 'RingRaven',         avatarColor: 'from-fuchsia-400 to-purple-600', title: 'Rising Star',      achievement: 'Early Bird x30',                     streak: 12,  head: 1500, rate: 135, rest: 0.2, power: 44, time: 52, discipline: 58, weekPattern: [35, 40, 55, 30, 50, 45, 25], statsVisible: false },
  { id: 'nova',      name: 'NovaPushups',       avatarColor: 'from-lime-400 to-green-600',    title: 'Night Owl',         achievement: 'Night Owl — 20 late sessions',       streak: 9,   head: 800,  rate: 110, rest: 0.22, power: 38, time: 40, discipline: 45, weekPattern: [20, 35, 45, 30, 25, 40, 30], statsVisible: true },
  { id: 'danny',     name: 'DailyDanny',        avatarColor: 'from-orange-400 to-red-500',    title: 'Fresh Recruit',     achievement: 'First Full Workout',                 streak: 6,   head: 350,  rate: 90,  rest: 0.25, power: 30, time: 34, discipline: 40, weekPattern: [25, 30, 20, 35, 30, 15, 20], statsVisible: true },
  { id: 'sam',       name: 'SoftStartSam',      avatarColor: 'from-slate-400 to-gray-600',    title: 'Just Started',      achievement: 'Day 1 Complete',                     streak: 3,   head: 120,  rate: 70,  rest: 0.3, power: 22, time: 25, discipline: 30, weekPattern: [15, 20, 10, 25, 0, 20, 10], statsVisible: false },
];

// ---- small seeded random generator ----
export const hashStr = (s: string) => {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
};
export const mulberry32 = (a: number) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const epochDay = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
};

// XP a rival earns on one calendar day
const dayGain = (r: Rival, day: number) => {
  const rnd = mulberry32(hashStr(`${r.id}:${day}`));
  if (rnd() < r.rest) return 0;
  return r.rate * (0.4 + 1.2 * rnd());
};

// share of a day's XP that lands in each 4-hour block (more in the evening)
export const BLOCK_WEIGHTS = [0.02, 0.1, 0.18, 0.22, 0.3, 0.18];

const isoOfEpoch = (d: number) => new Date(d * 86400000).toISOString().slice(0, 10);

// A rival's XP at the very start of `endIso` (counts every day before it), with the yearly rank drop applied.
// Use this for "final standings" of a week or a season: it never applies the reset that happens ON endIso.
export function rivalXpBefore(r: Rival, startIso: string, endIso: string): number {
  const start = epochDay(startIso);
  const end = epochDay(endIso);
  let xp = r.head;
  for (let d = start; d < end; d++) {
    if (d > start && isoOfEpoch(d).slice(5) === '01-01') xp = resetXp(xp);
    xp += dayGain(r, d);
  }
  return Math.round(xp);
}

// A rival's XP at `now`, counting from the day you started
export function rivalXp(r: Rival, startIso: string, now: Date): number {
  const todayIso = todayStr(now);
  const start = epochDay(startIso);
  const today = epochDay(todayIso);
  let xp = rivalXpBefore(r, startIso, todayIso);
  if (today >= start) {
    if (today > start && todayIso.slice(5) === '01-01') xp = resetXp(xp);
    const done = Math.min(6, Math.floor(now.getHours() / 4));
    let frac = 0;
    for (let i = 0; i < done; i++) frac += BLOCK_WEIGHTS[i];
    xp += dayGain(r, today) * frac;
  }
  return Math.round(xp);
}

// "4h 12m" until the next 4-hour update
export function refreshIn(now: Date): string {
  const nextHour = (Math.floor(now.getHours() / 4) + 1) * 4;
  const mins = nextHour * 60 - (now.getHours() * 60 + now.getMinutes());
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}
