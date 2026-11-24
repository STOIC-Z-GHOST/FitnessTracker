"use client";

import React, { useState } from 'react';
import { Flame, Gift, Dumbbell, Swords, Calendar, Zap, Timer, Shield, Crown, Sunrise, Moon, Trophy, Target, Lock, Check } from 'lucide-react';
import {
  TIERS, MYTHIC_INDEX, SERIES, SPECIALS, MONTH_NAMES, MARATHON_DAYS, BASE_TOTAL,
  beastId, marathonId, yearBeastId, seasonalInfo, countUnlocked, tiersReached,
  AchContext, AchMap, Category, IconKey,
} from './achievements';
import type { Tally } from './progress';

const ICONS: Record<IconKey, React.ComponentType<{ size?: number; className?: string }>> = {
  Flame, Gift, Dumbbell, Swords, Calendar, Zap, Timer, Shield, Crown, Sunrise, Moon, Trophy, Target,
};

interface Props {
  ach: AchMap;
  ctx: AchContext;
  year: number;
  month0: number;                       // 0..11 (current month)
  tallies: Record<string, Tally>;
  startDate: string;
}

const FILTERS: { id: 'all' | Category; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'streak', label: 'Streak' },
  { id: 'workout', label: 'Workouts' },
  { id: 'time', label: 'Time' },
  { id: 'seasonal', label: 'Seasons' },
  { id: 'special', label: 'Special' },
];

const fmtDate = (iso?: string) => (iso ? new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '');

function Pips({ count }: { count: number }) {
  return (
    <div className="flex items-center space-x-1" aria-label={`${count} of ${TIERS.length} tiers`}>
      {TIERS.map((t, i) => (
        <span
          key={t.name}
          title={t.name}
          className="w-2.5 h-2.5 rounded-full border"
          style={i < count ? { background: t.color, borderColor: t.color, boxShadow: i === MYTHIC_INDEX ? `0 0 8px ${t.color}` : undefined } : { borderColor: '#374151' }}
        />
      ))}
    </div>
  );
}

export function AchievementPreview({ ach, onViewAll }: { ach: AchMap; onViewAll: () => void }) {
  type Row = { id: string; name: string; sub: string; color: string; icon: IconKey; score: number };
  const rows: Row[] = [];
  for (const s of SERIES) {
    const n = (ach[s.id] || []).length;
    if (n > 0) rows.push({ id: s.id, name: s.name, sub: `${TIERS[n - 1].name} tier`, color: TIERS[n - 1].color, icon: s.icon, score: n * 10 + (n === TIERS.length ? 50 : 0) });
  }
  for (const sp of SPECIALS) if ((ach[sp.id] || []).length) rows.push({ id: sp.id, name: sp.name, sub: sp.desc, color: '#fbbf24', icon: sp.icon, score: 5 });
  for (const id of Object.keys(ach)) {
    const info = (ach[id] || []).length ? seasonalInfo(id) : null;
    if (info) rows.push({ id, name: info.name, sub: info.desc, color: '#fbbf24', icon: info.icon, score: id.startsWith('yearbeast') ? 200 : 60 });
  }
  rows.sort((a, b) => b.score - a.score);
  const top = rows.slice(0, 3);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Achievements & Badges</h4>
        <button onClick={onViewAll} className="text-[11px] font-bold text-rose-400">View all</button>
      </div>
      {top.length === 0 ? (
        <button onClick={onViewAll} className="w-full text-left p-4 bg-gray-900 rounded-xl border border-dashed border-gray-700">
          <p className="text-sm font-bold text-gray-300">No achievements yet</p>
          <p className="text-[11px] text-gray-500 mt-0.5">Finish your first workout to unlock your first badge.</p>
        </button>
      ) : (
        top.map((r) => {
          const Icon = ICONS[r.icon];
          return (
            <div key={r.id} className="flex items-center p-3 bg-gray-900 rounded-xl border border-gray-800">
              <div className="mr-4 p-2 rounded-lg border" style={{ background: `${r.color}1a`, borderColor: `${r.color}44`, color: r.color }}>
                <Icon size={20} />
              </div>
              <div className="min-w-0">
                <h5 className="font-bold text-sm" style={{ color: r.color }}>{r.name}</h5>
                <p className="text-[10px] text-gray-400 truncate">{r.sub}</p>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default function AchievementsView({ ach, ctx, year, month0, tallies, startDate }: Props) {
  const [filter, setFilter] = useState<'all' | Category>('all');
  const counts = countUnlocked(ach);
  const show = (c: Category) => filter === 'all' || filter === c;

  const monthTile = (m0: number) => {
    const id = beastId(year, m0 + 1);
    const owned = (ach[id] || []).length > 0;
    const monthStart = `${year}-${String(m0 + 1).padStart(2, '0')}-01`;
    const isCurrent = m0 === month0;
    const isFuture = m0 > month0;
    const t = tallies[`M:${year}-${String(m0 + 1).padStart(2, '0')}`];
    let status = 'Locked';
    if (owned) status = 'Earned';
    else if (isFuture) status = 'Upcoming';
    else if (isCurrent) status = t ? (t.done < t.sched ? 'Missed a day' : `${t.done}/${t.sched} days`) : 'Next full month';
    else if (monthStart < startDate) status = 'Before you joined';
    else status = 'Missed';
    return (
      <div
        key={id}
        className={`rounded-xl border p-2.5 flex flex-col items-center text-center transition-all ${owned ? 'bg-yellow-500/10 border-yellow-500/40' : isCurrent ? 'bg-rose-500/5 border-rose-500/30' : 'bg-gray-900 border-gray-800'}`}
        style={owned ? { boxShadow: '0 0 14px rgba(251,191,36,0.2)' } : undefined}
      >
        {owned ? <Swords size={18} className="text-yellow-400" /> : <Lock size={15} className={isCurrent ? 'text-rose-300' : 'text-gray-600'} />}
        <span className={`text-[11px] font-black mt-1 ${owned ? 'text-yellow-300' : 'text-gray-300'}`}>{MONTH_NAMES[m0].slice(0, 3)} Beast</span>
        <span className="text-[9px] text-gray-500 mt-0.5">{status}</span>
      </div>
    );
  };

  const yearTile = (id: string, owned: boolean, progress: string) => {
    const info = seasonalInfo(id)!;
    const Icon = ICONS[info.icon];
    return (
      <div key={id} className={`rounded-2xl border p-4 flex items-center space-x-3 ${owned ? 'bg-yellow-500/10 border-yellow-500/40' : 'bg-gray-800 border-gray-700'}`}>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${owned ? 'bg-yellow-500/15 border-yellow-500/40 text-yellow-400' : 'bg-gray-900 border-gray-700 text-gray-600'}`}>
          {owned ? <Icon size={20} /> : <Lock size={18} />}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-bold">{info.name}</h4>
          <p className="text-[11px] text-gray-400 leading-snug">{info.desc}</p>
          <p className="text-[10px] text-gray-500 mt-1">{owned ? `Earned ${fmtDate((ach[id] || [])[0])}` : progress}</p>
        </div>
        <span className="text-[11px] font-black text-yellow-400 shrink-0">+{info.gold}G</span>
      </div>
    );
  };

  const beastsThisYear = Array.from({ length: 12 }, (_, i) => (ach[beastId(year, i + 1)] || []).length > 0).filter(Boolean).length;
  const yearTally = tallies[`Y:${year}`];
  const otherSeasonal = Object.keys(ach).filter((id) => ach[id].length && seasonalInfo(id) && !id.includes(String(year)));

  return (
    <div className="space-y-5">
      {/* summary */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Unlocked</p>
            <p className="text-2xl font-black">{counts.total}<span className="text-sm text-gray-500 font-bold"> / {BASE_TOTAL}</span></p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Seasonal</p>
            <p className="text-lg font-black text-yellow-400">{counts.seasonalTotal}</p>
          </div>
        </div>
        <div className="w-full h-2 rounded-full bg-gray-900 border border-gray-700 mt-3 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-rose-500 to-purple-500 rounded-full transition-all duration-700" style={{ width: `${Math.min(100, (counts.total / BASE_TOTAL) * 100)}%` }} />
        </div>
      </div>

      {/* filters */}
      <div className="flex space-x-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${filter === f.id ? 'bg-gradient-to-r from-rose-500 to-purple-600 border-transparent text-white' : 'bg-gray-900 border-gray-800 text-gray-400'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* tiered series */}
      {SERIES.filter((s) => show(s.category)).map((s) => {
        const Icon = ICONS[s.icon];
        const dates = ach[s.id] || [];
        const reached = Math.min(dates.length, TIERS.length);
        const value = s.value(ctx);
        const liveReached = tiersReached(s.thresholds, value);
        const maxed = reached >= TIERS.length;
        const next = maxed ? s.thresholds[TIERS.length - 1] : s.thresholds[reached];
        const pct = maxed ? 100 : Math.max(0, Math.min(100, (value / next) * 100));
        const tier = reached > 0 ? TIERS[reached - 1] : null;
        const mythic = reached === TIERS.length;
        return (
          <div key={s.id} className="bg-gray-800 border rounded-2xl p-4" style={{ borderColor: tier ? `${tier.color}55` : '#374151', boxShadow: mythic ? '0 0 22px rgba(192,132,252,0.25)' : undefined }}>
            <div className="flex items-start space-x-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border"
                style={mythic
                  ? { background: 'linear-gradient(135deg,#f43f5e,#a855f7)', borderColor: 'transparent', color: '#fff' }
                  : tier ? { background: `${tier.color}22`, borderColor: `${tier.color}66`, color: tier.color } : { background: '#111827', borderColor: '#374151', color: '#4b5563' }}
              >
                {tier ? <Icon size={22} /> : <Lock size={18} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold">{s.name}</h4>
                  <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: tier ? tier.color : '#6b7280' }}>{tier ? tier.name : 'Locked'}</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-snug mt-0.5">{maxed ? 'Every tier earned. Legendary.' : s.goal(next)}</p>
              </div>
            </div>
            <div className="mt-3">
              <div className="w-full h-1.5 rounded-full bg-gray-900 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${TIERS[Math.min(reached, MYTHIC_INDEX)].color}, #a855f7)` }} />
              </div>
              <div className="flex items-center justify-between mt-2">
                <Pips count={reached} />
                <span className="text-[10px] text-gray-500 font-mono">
                  {maxed ? s.show(value) : `${s.show(value)} / ${s.show(next)}`}
                </span>
              </div>
              {dates[reached - 1] && <p className="text-[10px] text-gray-600 mt-1.5">{TIERS[reached - 1].name} unlocked {fmtDate(dates[reached - 1])}</p>}
              {liveReached > reached && <p className="text-[10px] text-emerald-400 mt-1">New tier ready to unlock</p>}
            </div>
          </div>
        );
      })}

      {/* seasonal */}
      {show('seasonal') && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-black">{year} Seasons</h3>
            <p className="text-[11px] text-gray-500">Finish every scheduled workout in a month to earn its Beast. Rest days don&apos;t count against you.</p>
          </div>
          <div className="grid grid-cols-3 gap-2">{Array.from({ length: 12 }, (_, i) => monthTile(i))}</div>
          {yearTile(
            yearBeastId(year),
            (ach[yearBeastId(year)] || []).length > 0,
            `${beastsThisYear}/12 monthly Beasts`,
          )}
          {yearTile(
            marathonId(year),
            (ach[marathonId(year)] || []).length > 0,
            yearTally ? `${yearTally.done}/${MARATHON_DAYS} days so far` : 'Needs a full year of tracking',
          )}
          {otherSeasonal.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Earned in earlier years</p>
              <div className="flex flex-wrap gap-2">
                {otherSeasonal.map((id) => (
                  <span key={id} className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 flex items-center space-x-1">
                    <Check size={11} /> <span>{seasonalInfo(id)!.name}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* specials */}
      {show('special') && (
        <div className="space-y-3">
          <h3 className="text-sm font-black">Special</h3>
          {SPECIALS.map((sp) => {
            const Icon = ICONS[sp.icon];
            const owned = (ach[sp.id] || []).length > 0;
            return (
              <div key={sp.id} className={`rounded-2xl border p-4 flex items-center space-x-3 ${owned ? 'bg-yellow-500/10 border-yellow-500/40' : 'bg-gray-800 border-gray-700'}`}>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${owned ? 'bg-yellow-500/15 border-yellow-500/40 text-yellow-400' : 'bg-gray-900 border-gray-700 text-gray-600'}`}>
                  {owned ? <Icon size={20} /> : <Lock size={18} />}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold">{sp.name}</h4>
                  <p className="text-[11px] text-gray-400">{sp.desc}</p>
                  {owned && <p className="text-[10px] text-gray-500 mt-1">Earned {fmtDate(ach[sp.id][0])}</p>}
                </div>
                <span className="text-[11px] font-black text-yellow-400 shrink-0">+{sp.gold}G</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
