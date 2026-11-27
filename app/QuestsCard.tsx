"use client";

import React, { useState } from 'react';
import { Check, Clock, Sparkles, Target } from 'lucide-react';
import type { QuestRow } from './quests';

interface Props {
  daily: QuestRow[];
  weekly: QuestRow[];
  dailyReset: string;
  weeklyReset: string;
  onClaim: (row: QuestRow) => void;
}

export default function QuestsCard({ daily, weekly, dailyReset, weeklyReset, onClaim }: Props) {
  const [tab, setTab] = useState<'daily' | 'weekly'>('daily');
  const rows = tab === 'daily' ? daily : weekly;
  const ready = (list: QuestRow[]) => list.filter((r) => r.done && !r.claimed).length;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4" aria-label="Quests">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Target size={16} className="text-rose-400" />
          <h3 className="font-black text-sm">Quests</h3>
        </div>
        <span className="flex items-center space-x-1 text-[10px] text-gray-500 font-mono">
          <Clock size={10} /> <span>Resets in {tab === 'daily' ? dailyReset : weeklyReset}</span>
        </span>
      </div>

      <div className="flex bg-gray-900 rounded-lg p-1 mb-3" role="tablist">
        {([['daily', 'Daily', daily], ['weekly', 'Weekly', weekly]] as const).map(([id, label, list]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 ${tab === id ? 'bg-gray-800 text-white shadow' : 'text-gray-500'}`}
          >
            <span>{label}</span>
            {ready(list) > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">{ready(list)}</span>}
          </button>
        ))}
      </div>

      <div className="space-y-2.5">
        {rows.map((r) => {
          const pct = r.target > 0 ? Math.min(100, (r.progress / r.target) * 100) : 0;
          return (
            <div
              key={r.def.id}
              className={`rounded-xl border p-3 transition-colors ${r.claimed ? 'bg-gray-900/50 border-gray-800 opacity-70' : r.done ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-gray-900 border-gray-800'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-sm font-bold flex items-center space-x-1.5">
                    <span>{r.def.title}</span>
                    {r.claimed && <Check size={13} className="text-emerald-400" />}
                  </h4>
                  <p className="text-[11px] text-gray-400 leading-snug">{r.def.desc(r.target)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] font-black text-purple-300 flex items-center justify-end space-x-1"><Sparkles size={10} /> <span>+{r.def.xp} XP</span></p>
                  <p className="text-[10px] font-black text-yellow-400">+{r.def.gold}G</p>
                </div>
              </div>
              <div className="mt-2.5 flex items-center space-x-3">
                <div className="flex-1 h-1.5 rounded-full bg-gray-800 overflow-hidden" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={`${r.def.title} progress`}>
                  <div className={`h-full rounded-full transition-all duration-500 ${r.done ? 'bg-emerald-400' : 'bg-gradient-to-r from-rose-500 to-purple-500'}`} style={{ width: `${pct}%` }} />
                </div>
                {r.claimed ? (
                  <span className="text-[10px] font-bold text-emerald-400 w-16 text-right">Claimed</span>
                ) : r.done ? (
                  <button
                    onClick={() => onClaim(r)}
                    className="text-[11px] font-black px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow active:scale-95 transition-transform"
                  >
                    Claim
                  </button>
                ) : (
                  <span className="text-[10px] font-mono text-gray-500 w-16 text-right">{r.def.unit(r.progress)} / {r.def.unit(r.target)}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
