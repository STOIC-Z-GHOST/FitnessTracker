// Everything that decides WHAT a workout looks like lives here, so it is easy to tweak.

export const BASE_SETS = 4;          // rounds per workout before any progression
export const MAX_SETS = 10;          // progression stops here
export const SETS_PER_LEVEL_UP = 2;  // "+2 sets" every progression step

export const SECONDS_PER_REP = 4;    // length of one rep video
export const REST_BETWEEN_EXERCISES = 10; // seconds
export const REST_BETWEEN_ROUNDS = 45;    // seconds, after every full round

export const MAX_REST_DAYS = 2;
export const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const PROGRESSION_OPTIONS: { days: number; label: string }[] = [
  { days: 1, label: 'Daily' },
  { days: 2, label: '2 Days' },
  { days: 4, label: '4 Days' },
  { days: 7, label: 'Weekly' },
];

export type Tier = 0 | 1 | 2;

// Tier comes from the "Max Pushups" answer on the onboarding screen:
// 0-10 -> tier 0, 11-20 -> tier 1, 21+ -> tier 2
export const tierFromMax = (maxPushups: number): Tier => (maxPushups <= 10 ? 0 : maxPushups <= 20 ? 1 : 2);

// Reps (or hold seconds) per set for each exercise id, by tier.
// Pike and diamond are harder than a normal push-up, so they start a little lower.
export const TARGETS: Record<number, { kind: 'reps' | 'hold'; byTier: [number, number, number] }> = {
  0: { kind: 'reps', byTier: [4, 8, 12] },   // pike
  1: { kind: 'reps', byTier: [4, 8, 12] },   // diamond
  2: { kind: 'reps', byTier: [5, 10, 15] },  // wide
  3: { kind: 'hold', byTier: [20, 30, 45] }, // plank (seconds)
};

export const targetFor = (exerciseId: number, tier: Tier) => TARGETS[exerciseId].byTier[tier];

export const setsForExtra = (extraSets: number) => Math.min(MAX_SETS, BASE_SETS + Math.max(0, extraSets));
export const MAX_EXTRA_SETS = MAX_SETS - BASE_SETS;

// ---- dates (local time, ISO yyyy-mm-dd so plain string compare works) ----
export const todayStr = (d: Date = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const daysBetween = (fromIso: string, toIso: string) => {
  const a = new Date(fromIso + 'T00:00:00');
  const b = new Date(toIso + 'T00:00:00');
  return Math.round((b.getTime() - a.getTime()) / 86400000);
};

// Rough length of a full workout in minutes (for the Start button)
export const estimateMinutes = (
  exercises: { kind: 'reps' | 'hold'; target: number }[],
  rounds: number,
  setsAlreadyDone = 0,
) => {
  const perRound = exercises.reduce(
    (sum, e) => sum + (e.kind === 'reps' ? e.target * SECONDS_PER_REP : e.target) + REST_BETWEEN_EXERCISES,
    0,
  );
  const total = rounds * perRound + Math.max(0, rounds - 1) * (REST_BETWEEN_ROUNDS - REST_BETWEEN_EXERCISES);
  const done = exercises.length ? (setsAlreadyDone / (rounds * exercises.length)) * total : 0;
  return Math.max(1, Math.round((total - done) / 60));
};
