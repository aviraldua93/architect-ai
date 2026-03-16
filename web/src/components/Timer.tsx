'use client';

/**
 * Timer — countdown timer with colour-coded urgency states.
 *
 * Colour transitions:
 *   emerald (>50% time left) → amber (25–50%) → rose (<25%)
 * Pulsing animation when under 60 seconds.
 *
 * @author Zara Ibrahim, Frontend React Engineer — ArchitectAI
 */

import { useEffect, useRef } from 'react';

interface TimerProps {
  totalSeconds: number;
  timeRemaining: number;
  onTimeUp: () => void;
  onTick: () => void;
  isRunning: boolean;
}

export default function Timer({
  totalSeconds,
  timeRemaining,
  onTimeUp,
  onTick,
  isRunning,
}: TimerProps) {
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onTimeUpRef = useRef(onTimeUp);
  const onTickRef = useRef(onTick);

  useEffect(() => { onTimeUpRef.current = onTimeUp; }, [onTimeUp]);
  useEffect(() => { onTickRef.current = onTick; }, [onTick]);

  useEffect(() => {
    if (!isRunning) {
      if (tickRef.current) clearInterval(tickRef.current);
      return;
    }

    tickRef.current = setInterval(() => {
      onTickRef.current();
    }, 1000);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [isRunning]);

  useEffect(() => {
    if (timeRemaining <= 0 && isRunning) {
      onTimeUpRef.current();
    }
  }, [timeRemaining, isRunning]);

  const minutes = Math.max(0, Math.floor(timeRemaining / 60));
  const seconds = Math.max(0, timeRemaining % 60);
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const pct = totalSeconds > 0 ? timeRemaining / totalSeconds : 1;
  let colourClasses: string;
  if (pct > 0.5) {
    colourClasses = 'text-emerald-400';
  } else if (pct > 0.25) {
    colourClasses = 'text-amber-400';
  } else {
    colourClasses = 'text-rose-400';
  }

  const pulseClass = timeRemaining > 0 && timeRemaining < 60 ? 'animate-pulse' : '';

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 font-mono text-lg font-bold ${colourClasses} ${pulseClass}`}
      role="timer"
      aria-live="polite"
      aria-label={`${minutes} minutes and ${seconds} seconds remaining`}
    >
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>

      {display}
    </div>
  );
}
