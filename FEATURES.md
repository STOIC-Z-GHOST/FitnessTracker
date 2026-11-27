# MyFit: everything that was added

All progress is saved in the browser (`localStorage`, key `fittrack_save`). There is no backend, so streaks,
XP and achievements are per device, and the leaderboard rivals are simulated. Old saved data is migrated automatically.

Run it: `npm install` then `npm run dev`. Unit tests: `npx tsx tests/xp.test.ts` (also `progress`, `ach`, `quests`).

## 1. Exercise videos and plank
- Pike, diamond and wide push-up videos replace the two-image loop (`public/exercises/*.webm` + `.mp4` + `*-poster.webp`, about 50 KB each).
- A "MyFit" corner badge scales with the video box and covers the generator watermark.
- Plank Hold uses a still image (`public/exercises/plank-poster.webp`) with a countdown ring.

## 2. Brand and logo
- Files in `public/logo/`: `myfit-wordmark.svg` (MY bolt FIT), `myfit-symbol.svg` (bolt with MY/FIT cut out), `myfit-icon.svg`, `myfit-logo.svg`, `myfit-bolt.svg`.
- Used on the welcome screen, login, home header and About. Favicon, `app/icon.svg` and `app/apple-icon.png` are set.

## 3. Guided workout (Workouts tab -> Start Guided Workout)
- Circuit order pike -> diamond -> wide -> plank, repeated for each round. Resumes where you stopped.
- The video plays one rep at a time with a rep counter. After the last rep, tap **Done** (or "Couldn't finish").
- Rest countdown with Pause, +10s and Skip, plus a 3-2-1 beep. Respects the sound, vibration and Auto Rest Timer settings.
- Keeps the screen on. Plank is a timed hold.

## 4. Personal plan (`app/workoutPlan.ts`)
- Reps come from max push-ups: wide push-ups start at 10, +5 for every extra 20 (cap 50), capped at about 70% of your max.
  Pike and diamond are 20% lower. Plank hold is 30 s + 10 s per 20 max, rounded to 5 s.
- Training background changes the plan: Recruit = 3 sets, 20s/75s rest, reps x0.6. Skilled Gladiator = 4 sets, 10s/45s, x0.85.
  Movement Overlord = 5 sets, 10s/30s, x1.0.
- Onboarding order is Training Background then Max Push-ups (slider to 120+) with a live "starting plan" line.

## 5. Schedule
- Rest days: pick up to 2 weekdays in Settings. Rest days never break the streak.
- Level Up: +2 sets per exercise every Daily / 2 / 4 / Weekly (choose in Settings), only after you finished a workout, max 10 sets.
- Checked sets reset each day. If the app stays open past midnight it reloads for the new day.

## 6. Calendar
- Real month with the correct weekdays. Red = trained, blue = rest day, dashed = today (not done yet), red outline = missed.
- Today and the week strip are live. Real history is recorded from first use. Earlier days show sample data.

## 7. Tablets and short screens
- The phone frame scales to fit the window (never taller than the screen) and is up to 1.35x on touch tablets.

## 8. Streak, daily reward and Streak Shield (`app/progress.ts`)
- Daily login reward (pop-up): 20, 25, 30, 40, 50, 60, 100 gold, resets to day 1 if a day is skipped.
- Workout streak: a day counts at 50% of its sets. Rest days neither break nor count.
- Streak Shield (shop, 400 gold, hold up to 3) is used automatically on a missed training day. The old Streak Freeze converts to 1 shield.

## 9. Achievements (Profile -> Achievements tab, `app/achievements.ts`)
- 10 tiered series with 7 tiers (Bronze, Silver, Gold, Platinum, Diamond, Ruby, Mythic): Unbroken (streak), Daily Devotion, Iron Habit (workouts),
  Beast Mode (full workouts), Perfect Week, Rep Machine, Iron Clock (workout time, Mythic = 250 h), Core of Steel (plank), Podium Regular, Veteran.
- Specials: Early Bird, Night Owl, Close Call, Podium Finish, Arena Champion, Season Survivor/Podium/Champion, rank and level badges.
- Seasonal: a Beast badge for every month you finish all scheduled workouts (e.g. "March Beast"), plus yearly Marathon Year and Year of the Beast.
- Gold rewards grow with the tier (25 to 1,000). Pop-ups unlock one at a time, or as one summary when many unlock together.

## 10. XP, levels, ranks and the Arena (`app/xp.ts`, `app/rivals.ts`)
- XP: 10 per set, +50 for a full workout, +10 per streak day (max +100) on a trained day, plus quest XP.
- Level 0 to 100 from lifetime XP (level n costs 200 + 15n). Rank from this season's XP:
  Recruit 0, Warrior 2,500, Gladiator 8,000, Champion 20,000, Overlord 40,000, Mythic 70,000. You start Unranked at level 0.
- Leaderboard: 10 simulated rivals gain XP every 4 hours on a seeded schedule (they keep moving while the app is closed).
  You enter the board at your first XP. A daily trainer reaches #1 in about 2.5 months.

## 11. Quests (Home screen, `app/quests.ts`)
- 3 daily (1 easy + 2 harder, reset at midnight) and 3 weekly (Consistency + 2, reset Monday). Targets scale with your plan.
- Tap **Claim** when complete: daily 25-60 XP + 10-20 gold, weekly 100-150 XP + 60 gold. Quest XP counts for level, rank and the Arena.

## 12. Prizes and rewards
- Weekly Arena prizes: top 3 when the week ends get 300 / 200 / 100 gold. This is worked out even if the app was closed.
- Level rewards: 300 / 600 / 1,000 / 1,500 / 3,000 gold at levels 20 / 40 / 60 / 80 / 100.
- Rank achievements: one per rank (25 to 1,000 gold).

## 13. Yearly reset (seasons = calendar years)
- On Dec 31 everyone (you and the rivals) drops 3 ranks to that rank's XP floor (never below Recruit). Your level is unchanged.
- Rewards are for the rank you finished with, before the drop: 50 / 200 / 500 / 1,200 / 2,500 / 5,000 gold (Recruit to Mythic).
  The final top 3 also get 2,000 / 1,200 / 700 gold. Past seasons are listed under Achievements -> Seasons.

## Where to tune things
| What | File |
|---|---|
| Reps, sets, rest by level, level-up cap | `app/workoutPlan.ts` |
| Streak rule, shield price/cap, login rewards | `app/progress.ts` |
| XP values, level curve, rank thresholds, reset drop, season gold | `app/xp.ts` |
| Rivals (names, head start, pace) | `app/rivals.ts` |
| Quest pool and rewards | `app/quests.ts` |
| Achievement tiers and gold | `app/achievements.ts` |
