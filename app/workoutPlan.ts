// Everything that decides WHAT a workout looks like lives here, so it is easy to tweak.

export const MAX_SETS = 10;          // progression stops here
export const SETS_PER_LEVEL_UP = 2;  // "+2 sets" every progression step
export const MAX_EXTRA_SETS = 8;     // upper bound for the stored counter (the real cap is MAX_SETS)

export const SECONDS_PER_REP = 4;    // length of one rep video

export const MAX_REST_DAYS = 2;
export const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const PROGRESSION_OPTIONS: { days: number; label: string }[] = [
  { days: 1, label: 'Daily' },
  { days: 2, label: '2 Days' },
  { days: 4, label: '4 Days' },
  { days: 7, label: 'Weekly' },
];

// ---------- training background ("Recruit" / "Skilled Gladiator" / "Movement Overlord") ----------
export type Experience = 'beginner' | 'intermediate' | 'advanced';

export interface ExperienceProfile {
  baseSets: number;       // rounds at the start
  restExercise: number;   // seconds between exercises
  restRound: number;      // seconds after a full round
  repFactor: number;      // scales reps down for people newer to training
  holdFactor: number;     // same for the plank hold
}

export const EXPERIENCE_PROFILES: Record<Experience, ExperienceProfile> = {
  beginner:     { baseSets: 3, restExercise: 20, restRound: 75, repFactor: 0.6,  holdFactor: 0.6 },
  intermediate: { baseSets: 4, restExercise: 10, restRound: 45, repFactor: 0.85, holdFactor: 0.85 },
  advanced:     { baseSets: 5, restExercise: 10, restRound: 30, repFactor: 1,    holdFactor: 1 },
};

export const normalizeExperience = (e: string): Experience =>
  e === 'beginner' || e === 'advanced' ? e : 'intermediate';

export const profileFor = (experience: string) => EXPERIENCE_PROFILES[normalizeExperience(experience)];

// ---------- reps ----------
// How many full steps of 20 max push-ups the person has: 0-20 -> 0, 21-40 -> 1, 41-60 -> 2 ...
const bucket = (max: number) => Math.max(0, Math.ceil(Math.max(0, max) / 20) - 1);

// Base reps for a normal-ish push-up: 10 at 0-20, then +5 for every extra 20 (cap 50)
export const baseReps = (maxPushups: number) => Math.min(50, 10 + 5 * bucket(maxPushups));

// Pike and diamond are harder than a normal push-up, so they start lower
const EXERCISE_FACTOR: Record<number, number> = { 0: 0.8, 1: 0.8, 2: 1 };

const roundTo5 = (n: number) => Math.round(n / 5) * 5;

// id 0 pike, 1 diamond, 2 wide -> reps per set; id 3 plank -> hold seconds
export const targetFor = (exerciseId: number, maxPushups: number, experience: string): number => {
  const prof = profileFor(experience);
  if (exerciseId === 3) {
    const base = Math.min(90, 30 + 10 * bucket(maxPushups));
    return Math.min(90, Math.max(15, roundTo5(base * prof.holdFactor)));
  }
  // never ask for more than ~70% of what someone can do in one go
  const capacity = Math.max(3, Math.round(maxPushups * 0.7));
  const base = Math.min(baseReps(maxPushups), capacity);
  return Math.max(3, Math.round(base * (EXERCISE_FACTOR[exerciseId] ?? 1) * prof.repFactor));
};

export const setsForExtra = (extraSets: number, baseSets: number) =>
  Math.min(MAX_SETS, baseSets + Math.max(0, extraSets));

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
  setsAlreadyDone: number,
  restExercise: number,
  restRound: number,
) => {
  const perRound = exercises.reduce(
    (sum, e) => sum + (e.kind === 'reps' ? e.target * SECONDS_PER_REP : e.target) + restExercise,
    0,
  );
  const total = rounds * perRound + Math.max(0, rounds - 1) * (restRound - restExercise);
  const done = exercises.length ? (setsAlreadyDone / (rounds * exercises.length)) * total : 0;
  return Math.max(1, Math.round((total - done) / 60));
};
