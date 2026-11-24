"use client";

import React from 'react';
import { Check, Flame, Gift, ShieldCheck, Crown, Sparkles } from 'lucide-react';
import { LOGIN_REWARDS, chainDayIndex } from './progress';

export interface DailyReport {
  shieldsUsed: number;   // streak shields consumed since the last visit
  lost: boolean;         // workout streak ended
  lostStreak: number;
  chainReset: boolean;   // login chain went back to day 1
}

interface Props {
  chain: number;          // the login day being claimed now (1, 2, 3 ...)
  reward: number;         // gold
  workoutStreak: number;
  report: DailyReport | null;
  onClaim: () => void;
}

export default function DailyRewardModal({ chain, reward, workoutStreak, report, onClaim }: Props) {
  const current = chainDayIndex(chain); // 0..6
  return (
    <div className="absolute inset-0 z-[65] bg-black/80 backdrop-blur-sm flex items-center justify-center p-5 animate-fade" role="dialog" aria-label="Daily reward">
      <div className="w-full bg-gray-900 border border-gray-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-rose-500/10 rounded-full blur-2xl" />
        <div className="relative text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-r from-rose-500 to-purple-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
            <Gift size={26} />
          </div>
          <h2 className="text-xl font-black mt-3">Daily Reward</h2>
          <p className="text-xs text-gray-400 mt-1">
            {chain === 1 ? 'Day 1 of your login chain' : `Day ${chain} of your login chain`}
          </p>
        </div>

        {report && (report.shieldsUsed > 0 || report.lost || report.chainReset) && (
          <div className="relative mt-4 space-y-2">
            {report.shieldsUsed > 0 && (
              <div className="flex items-start space-x-2 text-xs bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-xl p-3">
                <ShieldCheck size={16} className="shrink-0 mt-0.5" />
                <span>
                  {report.shieldsUsed === 1 ? 'A Streak Shield' : `${report.shieldsUsed} Streak Shields`} protected your workout streak while you were away.
                </span>
              </div>
            )}
            {report.lost && (
              <div className="flex items-start space-x-2 text-xs bg-orange-500/10 border border-orange-500/30 text-orange-300 rounded-xl p-3">
                <Flame size={16} className="shrink-0 mt-0.5" />
                <span>Your {report.lostStreak}-day workout streak ended. Train today and start a new one.</span>
              </div>
            )}
            {report.chainReset && (
              <div className="flex items-start space-x-2 text-xs bg-gray-800 border border-gray-700 text-gray-300 rounded-xl p-3">
                <Gift size={16} className="shrink-0 mt-0.5" />
                <span>You missed a day, so the login chain started over at day 1.</span>
              </div>
            )}
          </div>
        )}

        <div className="relative grid grid-cols-7 gap-1.5 mt-5">
          {LOGIN_REWARDS.map((gold, i) => {
            const done = i < current;
            const now = i === current;
            const big = i === LOGIN_REWARDS.length - 1;
            return (
              <div
                key={i}
                className={`rounded-xl border flex flex-col items-center py-2 transition-all ${
                  now
                    ? 'border-rose-400 bg-rose-500/15 shadow-[0_0_14px_rgba(244,63,94,0.35)] -translate-y-0.5'
                    : done
                      ? 'border-emerald-500/30 bg-emerald-500/10'
                      : 'border-gray-800 bg-gray-950'
                }`}
              >
                <span className="text-[8px] font-bold text-gray-500 uppercase">Day {i + 1}</span>
                <div className="h-6 flex items-center justify-center my-0.5">
                  {done ? <Check size={14} className="text-emerald-400" /> : big ? <Crown size={14} className="text-yellow-400" /> : <Sparkles size={13} className={now ? 'text-rose-300' : 'text-yellow-500/70'} />}
                </div>
                <span className={`text-[10px] font-black ${now ? 'text-white' : done ? 'text-emerald-400' : 'text-gray-400'}`}>{gold}</span>
              </div>
            );
          })}
        </div>

        <div className="relative flex items-center justify-center space-x-1.5 mt-4 text-xs text-gray-400">
          <Flame size={13} className="text-orange-500" />
          <span>Workout streak: <b className="text-gray-200">{workoutStreak} {workoutStreak === 1 ? 'day' : 'days'}</b></span>
        </div>

        <button
          onClick={onClaim}
          className="relative w-full mt-4 py-4 rounded-2xl bg-gradient-to-r from-rose-500 to-purple-600 font-black tracking-wide shadow-lg shadow-rose-500/20 active:scale-[0.98] transition-transform"
        >
          CLAIM +{reward}G
        </button>
      </div>
    </div>
  );
}
