"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Pause, Play, SkipForward, Check, Timer } from 'lucide-react';

export interface PlayerExercise {
  id: number;
  title: string;
  kind: 'reps' | 'hold';
  target: number;          // reps, or hold seconds
  video: string | null;    // path without extension (".webm" / ".mp4" are added)
  poster: string;
  setsCount: number;
}

interface Props {
  exercises: PlayerExercise[];
  rounds: number;
  /** done[exerciseId][setIndex] — sets that are already logged today */
  done: Record<number, boolean[]>;
  sound: boolean;
  vibration: boolean;
  autoRest: boolean;
  restExercise: number;   // seconds between exercises
  restRound: number;      // seconds after a full round
  onLogSet: (exerciseId: number, setIndex: number) => void;
  onClose: () => void;
}

type Phase = 'ready' | 'active' | 'confirm' | 'rest' | 'done';

// Same corner badge as the inline demos, so the video corner looks identical everywhere.
function VideoBadge() {
  return (
    <div
      className="absolute z-10 pointer-events-none select-none overflow-hidden flex items-center justify-center whitespace-nowrap"
      style={{
        left: '4%', top: '1.5%', width: '27%', height: '15.5%',
        borderRadius: '2.4cqw', gap: '1cqw',
        background: 'linear-gradient(135deg, #0b0b12 0%, #1b1026 100%)',
        boxShadow: '0 0 0 0.4cqw rgba(244,63,94,0.6), 0 0 4cqw rgba(168,85,247,0.45)',
      }}
    >
      <svg viewBox="0 0 24 24" style={{ width: '4.4cqw', height: '4.4cqw' }} aria-hidden="true">
        <defs>
          <linearGradient id="myfitBoltPlayer" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fb7185" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
        </defs>
        <path d="M13 2 4 14h6l-1 8 9-12h-6z" fill="url(#myfitBoltPlayer)" />
      </svg>
      <span className="font-black italic tracking-tight" style={{ fontSize: '4.8cqw', lineHeight: 1 }}>
        <span className="text-white">MY</span>
        <span className="bg-gradient-to-r from-rose-400 to-purple-400 bg-clip-text text-transparent">FIT</span>
      </span>
      <span className="absolute top-0 bottom-0 left-0 myfit-shine" />
    </div>
  );
}

function Ring({ pct, children }: { pct: number; children: React.ReactNode }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(Math.max(pct, 0), 1));
  return (
    <div className="relative w-44 h-44 mx-auto">
      <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
        <defs>
          <linearGradient id="ringGradPlayer" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <circle cx="80" cy="80" r={r} fill="none" stroke="#1f2937" strokeWidth="10" />
        <circle
          cx="80" cy="80" r={r} fill="none" stroke="url(#ringGradPlayer)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 0.25s linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

export default function GuidedWorkout({ exercises, rounds, done, sound, vibration, autoRest, restExercise, restRound, onLogSet, onClose }: Props) {
  // Build the order once: round 1 (every exercise), round 2 (every exercise)... skipping sets already logged.
  const steps = useMemo(() => {
    const list: { ex: PlayerExercise; setIdx: number; round: number }[] = [];
    for (let r = 0; r < rounds; r++) {
      for (const ex of exercises) {
        if (r < ex.setsCount && !done[ex.id]?.[r]) list.push({ ex, setIdx: r, round: r });
      }
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [stepIdx, setStepIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>(steps.length ? 'ready' : 'done');
  const [rep, setRep] = useState(0);
  const [holdLeft, setHoldLeft] = useState(0);
  const [restLeft, setRestLeft] = useState(0);
  const [restTotal, setRestTotal] = useState(restExercise);
  const [paused, setPaused] = useState(false);
  const [loggedCount, setLoggedCount] = useState(0);

  const step = steps[Math.min(stepIdx, Math.max(steps.length - 1, 0))];
  const ex = step?.ex;
  const nextStep = steps[stepIdx + 1];

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const lastBeepRef = useRef<number>(-1);
  const onLogRef = useRef(onLogSet);
  useEffect(() => { onLogRef.current = onLogSet; });

  // ---------- sound / vibration ----------
  const beep = (freq = 880, ms = 110) => {
    if (!sound) return;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioRef.current) audioRef.current = new Ctx();
      const ctx = audioRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.value = 0.07;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + ms / 1000);
    } catch { /* audio not available */ }
  };
  const buzz = (pattern: number | number[]) => {
    if (vibration && typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
  };

  // keep the screen on while working out
  useEffect(() => {
    let lock = null as { release: () => Promise<void> } | null;
    const nav = navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request('screen').then((l) => { lock = l; }).catch(() => {});
    return () => { lock?.release().catch(() => {}); };
  }, []);

  // ---------- step control ----------
  const beginStep = (s: { ex: PlayerExercise }) => {
    setPhase('active');
    setRep(0);
    setPaused(false);
    setHoldLeft(s.ex.kind === 'hold' ? s.ex.target : 0);
    beep(880, 150);
    buzz(60);
  };

  const handleStart = () => beginStep(step);

  const goNext = () => {
    const ni = stepIdx + 1;
    if (ni >= steps.length) { setPhase('done'); return; }
    setStepIdx(ni);
    beginStep(steps[ni]);
  };

  const finishSet = (logged: boolean) => {
    if (logged) {
      onLogRef.current(ex.id, step.setIdx);
      setLoggedCount((n) => n + 1);
    }
    buzz(40);
    if (!nextStep) { beep(1200, 350); setPhase('done'); return; }
    const dur = nextStep.round !== step.round ? restRound : restExercise;
    lastBeepRef.current = -1;
    setRestTotal(dur);
    setRestLeft(dur);
    setPaused(false);
    setPhase('rest');
  };

  // a rep video finished playing
  const handleRepEnd = () => {
    const next = rep + 1;
    setRep(next);
    if (next >= ex.target) {
      beep(1100, 260);
      buzz([150, 80, 150]);
      setPhase('confirm');
    } else {
      beep(740, 50);
      const v = videoRef.current;
      if (v) { v.currentTime = 0; v.play().catch(() => {}); }
    }
  };

  // play / pause the rep video
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (phase === 'active' && ex?.kind === 'reps' && !paused) v.play().catch(() => {});
    else v.pause();
  }, [phase, paused, ex?.kind, stepIdx]);

  // countdown ticker (plank hold + rest)
  useEffect(() => {
    const counting = !paused && ((phase === 'active' && ex?.kind === 'hold') || (phase === 'rest' && autoRest));
    if (!counting) return;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      if (phase === 'active') setHoldLeft((v) => Math.max(0, v - dt));
      else setRestLeft((v) => Math.max(0, v - dt));
    }, 200);
    return () => clearInterval(id);
  }, [paused, phase, ex?.kind, autoRest]);

  // hold finished
  useEffect(() => {
    if (phase === 'active' && ex?.kind === 'hold' && holdLeft <= 0 && !paused) {
      beep(1100, 300);
      buzz([200, 100, 200]);
      setPhase('confirm');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdLeft]);

  // rest finished + 3-2-1 beeps
  useEffect(() => {
    if (phase !== 'rest' || !autoRest) return;
    if (restLeft <= 0) { goNext(); return; }
    const sec = Math.ceil(restLeft);
    if (sec <= 3 && sec !== lastBeepRef.current) {
      lastBeepRef.current = sec;
      beep(660, 80);
      buzz(30);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restLeft, phase]);

  const fmt = (s: number) => {
    const t = Math.ceil(s);
    return t >= 60 ? `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}` : `${t}`;
  };

  // ---------- header numbers ----------
  const stepsDone = stepIdx + (phase === 'rest' || phase === 'done' ? 1 : 0);
  const progressPct = steps.length ? Math.min(100, (stepsDone / steps.length) * 100) : 100;

  const showNextPreview = phase === 'rest' && nextStep;
  const mediaEx = showNextPreview ? nextStep.ex : ex;

  return (
    <div className="absolute inset-0 z-[60] bg-gray-950 flex flex-col animate-fade">
      {/* top bar */}
      <div className="px-5 pt-6 pb-3 flex items-center justify-between shrink-0">
        <button
          onClick={onClose}
          aria-label="Close guided workout"
          className="w-10 h-10 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-300 hover:text-white"
        >
          <X size={18} />
        </button>
        <div className="text-center">
          {phase !== 'done' && step && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest text-rose-400">Round {(phase === 'rest' && nextStep ? nextStep.round : step.round) + 1} / {rounds}</p>
              <p className="text-[11px] text-gray-500 font-mono">Set {Math.min(stepIdx + (phase === 'rest' ? 2 : 1), steps.length)} of {steps.length}</p>
            </>
          )}
          {phase === 'done' && <p className="text-[10px] font-bold uppercase tracking-widest text-rose-400">Workout</p>}
        </div>
        <div className="w-10" />
      </div>
      <div className="mx-5 h-1.5 rounded-full bg-gray-900 overflow-hidden shrink-0">
        <div className="h-full bg-gradient-to-r from-rose-500 to-purple-600 transition-all duration-500" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-6 flex flex-col">
        {phase !== 'done' && mediaEx && (
          <>
            {/* media */}
            <div
              className="relative w-full aspect-video bg-[#0a0a0a] rounded-xl overflow-hidden border border-gray-700 shrink-0"
              style={{ containerType: 'inline-size' }}
            >
              {mediaEx.kind === 'reps' && phase !== 'rest' && mediaEx.video ? (
                <video
                  key={`step-${stepIdx}`}
                  ref={videoRef}
                  poster={mediaEx.poster}
                  aria-label={`${mediaEx.title} demonstration`}
                  className="absolute w-full h-full object-cover"
                  muted
                  playsInline
                  preload="auto"
                  onEnded={handleRepEnd}
                >
                  <source src={`${mediaEx.video}.webm`} type="video/webm" />
                  <source src={`${mediaEx.video}.mp4`} type="video/mp4" />
                </video>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaEx.poster} alt={mediaEx.title} className="absolute w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 scan-overlay pointer-events-none" />
              <VideoBadge />
              {showNextPreview && (
                <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-8">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-rose-300">Up next</p>
                  <p className="text-sm font-black text-white">{mediaEx.title}</p>
                </div>
              )}
              {paused && phase !== 'rest' && (
                <div className="absolute inset-0 z-20 bg-black/60 flex items-center justify-center">
                  <span className="text-sm font-black tracking-widest text-white">PAUSED</span>
                </div>
              )}
            </div>

            {/* title */}
            <div className="mt-4 text-center">
              <h2 className="text-xl font-black">{phase === 'rest' && nextStep ? nextStep.ex.title : ex.title}</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {phase === 'rest' && nextStep
                  ? `Set ${nextStep.setIdx + 1} of ${nextStep.ex.setsCount} • ${nextStep.ex.kind === 'reps' ? `${nextStep.ex.target} reps` : `${nextStep.ex.target}s hold`}`
                  : `Set ${step.setIdx + 1} of ${ex.setsCount} • ${ex.kind === 'reps' ? `${ex.target} reps` : `${ex.target}s hold`}`}
              </p>
            </div>

            {/* phase panel */}
            <div className="flex-1 flex flex-col justify-center py-5">
              {phase === 'ready' && (
                <div className="text-center space-y-4">
                  <p className="text-sm text-gray-400">Get into position, then tap start. Each rep plays once — follow the video.</p>
                  <button
                    onClick={handleStart}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-500 to-purple-600 font-black tracking-wide shadow-lg shadow-rose-500/20 active:scale-[0.98] transition-transform"
                  >
                    START SET
                  </button>
                </div>
              )}

              {phase === 'active' && ex.kind === 'reps' && (
                <div className="text-center space-y-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Rep</p>
                    <p className="text-6xl font-black leading-none bg-gradient-to-r from-rose-400 to-purple-400 bg-clip-text text-transparent">
                      {Math.min(rep + 1, ex.target)}<span className="text-2xl text-gray-600"> / {ex.target}</span>
                    </p>
                  </div>
                  <div className="flex gap-1 justify-center flex-wrap px-4">
                    {Array.from({ length: ex.target }).map((_, i) => (
                      <span key={i} className={`h-1.5 w-5 rounded-full transition-colors ${i < rep ? 'bg-rose-500' : i === rep ? 'bg-rose-500/40' : 'bg-gray-800'}`} />
                    ))}
                  </div>
                  <button
                    onClick={() => setPaused((p) => !p)}
                    className="mx-auto flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-sm font-bold text-gray-300"
                  >
                    {paused ? <Play size={16} /> : <Pause size={16} />}
                    <span>{paused ? 'Resume' : 'Pause'}</span>
                  </button>
                </div>
              )}

              {phase === 'active' && ex.kind === 'hold' && (
                <div className="space-y-4">
                  <Ring pct={holdLeft / ex.target}>
                    <span className="text-5xl font-black">{fmt(holdLeft)}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Hold</span>
                  </Ring>
                  <button
                    onClick={() => setPaused((p) => !p)}
                    className="mx-auto flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-sm font-bold text-gray-300"
                  >
                    {paused ? <Play size={16} /> : <Pause size={16} />}
                    <span>{paused ? 'Resume' : 'Pause'}</span>
                  </button>
                </div>
              )}

              {phase === 'confirm' && (
                <div className="text-center space-y-3">
                  <p className="text-sm text-gray-400">Set finished. Did you complete it? (+10G, +10 XP)</p>
                  <button
                    onClick={() => finishSet(true)}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-500 to-purple-600 font-black tracking-wide shadow-lg shadow-rose-500/20 flex items-center justify-center space-x-2 active:scale-[0.98] transition-transform"
                  >
                    <Check size={20} />
                    <span>DONE (+10G)</span>
                  </button>
                  <button onClick={() => finishSet(false)} className="text-xs text-gray-500 underline underline-offset-4">
                    Couldn&apos;t finish this set
                  </button>
                </div>
              )}

              {phase === 'rest' && (
                <div className="space-y-4">
                  {autoRest ? (
                    <>
                      <Ring pct={restTotal ? restLeft / restTotal : 0}>
                        <span className="text-5xl font-black">{fmt(restLeft)}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 flex items-center space-x-1">
                          <Timer size={10} /><span>{paused ? 'Paused' : 'Rest'}</span>
                        </span>
                      </Ring>
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => setPaused((p) => !p)}
                          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-sm font-bold text-gray-300"
                        >
                          {paused ? <Play size={16} /> : <Pause size={16} />}
                          <span>{paused ? 'Resume' : 'Pause'}</span>
                        </button>
                        <button
                          onClick={() => { setRestLeft((v) => v + 10); setRestTotal((t) => t + 10); }}
                          className="px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-sm font-bold text-gray-300"
                        >
                          +10s
                        </button>
                        <button
                          onClick={goNext}
                          className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-sm font-bold text-gray-300"
                        >
                          <SkipForward size={16} /><span>Skip</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center space-y-3">
                      <p className="text-sm text-gray-400">Rest as long as you need.</p>
                      <button
                        onClick={goNext}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-500 to-purple-600 font-black tracking-wide active:scale-[0.98] transition-transform"
                      >
                        START NEXT SET
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {phase === 'done' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-rose-500 to-purple-600 flex items-center justify-center shadow-lg shadow-rose-500/30">
              <Check size={40} />
            </div>
            <h2 className="text-2xl font-black">
              {steps.length === 0 ? 'Already done today' : 'Workout complete'}
            </h2>
            <p className="text-sm text-gray-400 px-6">
              {steps.length === 0
                ? 'Every set for today is already logged. Come back tomorrow.'
                : `${loggedCount} set${loggedCount === 1 ? '' : 's'} logged • +${loggedCount * 10}G • +${loggedCount * 10} XP`}
            </p>
            <button
              onClick={onClose}
              className="w-full max-w-xs py-4 rounded-2xl bg-gradient-to-r from-rose-500 to-purple-600 font-black tracking-wide"
            >
              CLOSE
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
