"use client";

import React, { useEffect } from 'react';
import { Trophy } from 'lucide-react';

export interface ToastItem { key: string; title: string; gold: number; color: string; kicker?: string }

export default function AchievementToast({ toast, onDone }: { toast: ToastItem | null; onDone: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(onDone, 3600);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast?.key]);

  if (!toast) return null;
  return (
    <div key={toast.key} className="absolute top-4 inset-x-4 z-[80] animate-fade pointer-events-none" role="status" aria-live="polite">
      <div
        className="rounded-2xl bg-gray-950/95 backdrop-blur border px-4 py-3 flex items-center space-x-3 shadow-2xl"
        style={{ borderColor: toast.color, boxShadow: `0 0 24px ${toast.color}55` }}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${toast.color}22`, color: toast.color }}>
          <Trophy size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{toast.kicker || 'Achievement unlocked'}</p>
          <p className="text-sm font-black truncate">{toast.title}</p>
        </div>
        {toast.gold > 0 && <span className="text-sm font-black text-yellow-400 shrink-0">+{toast.gold}G</span>}
      </div>
    </div>
  );
}
