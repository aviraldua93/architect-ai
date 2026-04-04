'use client';

import { useEffect, useState } from 'react';
import { getSessions, getProgress } from '@/lib/store';
import { formatTime } from '@/lib/scoring';
import type { SessionRecord } from '@/lib/types';
import DomainChart from '@/components/DomainChart';
import HistoryTable from '@/components/HistoryTable';
import WeakAreaCard from '@/components/WeakAreaCard';

/** Calculate study streak — consecutive days with at least one session. */
function calcStudyStreak(sessions: SessionRecord[]): number {
  if (sessions.length === 0) return 0;

  const uniqueDays = new Set(
    sessions.map((s) => new Date(s.date).toISOString().slice(0, 10)),
  );
  const sortedDays = [...uniqueDays].sort().reverse();

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  // Streak must include today or yesterday
  if (sortedDays[0] !== today && sortedDays[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 0; i < sortedDays.length - 1; i++) {
    const curr = new Date(sortedDays[i]).getTime();
    const next = new Date(sortedDays[i + 1]).getTime();
    if (curr - next === 86_400_000) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export default function DashboardPage() {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [progress, setProgress] = useState({
    totalAnswered: 0,
    totalCorrect: 0,
    totalTime: 0,
    domainStats: {} as Record<number, { correct: number; total: number }>,
  });

  useEffect(() => {
    setSessions(getSessions());
    setProgress(getProgress());
  }, []);

  const overallAccuracy = progress.totalAnswered > 0
    ? Math.round((progress.totalCorrect / progress.totalAnswered) * 100)
    : 0;

  const studyStreak = calcStudyStreak(sessions);

  // Weak domains sorted by percentage ascending
  const weakDomains = Object.entries(progress.domainStats)
    .map(([d, stats]) => ({
      domain: Number(d),
      ...stats,
      percentage: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
    }))
    .filter((d) => d.total > 0)
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="mb-2 text-3xl font-bold text-slate-100">📊 Dashboard</h1>
      <p className="mb-8 text-slate-400">Track your progress across all study sessions</p>

      {/* Overall stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-center">
          <p className="text-3xl font-bold text-indigo-400">{progress.totalAnswered}</p>
          <p className="text-sm text-slate-500">Questions Answered</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-center">
          <p className={`text-3xl font-bold ${overallAccuracy >= 72 ? 'text-emerald-400' : overallAccuracy >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
            {overallAccuracy}%
          </p>
          <p className="text-sm text-slate-500">Overall Accuracy</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-center">
          <p className="text-3xl font-bold text-slate-200">{formatTime(progress.totalTime)}</p>
          <p className="text-sm text-slate-500">Time Studied</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-center">
          <p className="text-3xl font-bold text-amber-400">
            {studyStreak > 0 ? `${studyStreak}🔥` : '0'}
          </p>
          <p className="text-sm text-slate-500">Day Streak</p>
        </div>
      </div>

      {/* Domain coverage chart */}
      <div className="mb-8">
        <DomainChart domainStats={progress.domainStats} />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* History table */}
        <HistoryTable sessions={sessions} limit={8} />

        {/* Weak areas */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-100">⚠️ Weak Areas</h2>
          {weakDomains.length === 0 ? (
            <p className="text-sm text-slate-500">Complete quizzes to identify weak areas.</p>
          ) : (
            <div className="space-y-4">
              {weakDomains.map((d) => (
                <WeakAreaCard
                  key={d.domain}
                  domain={d.domain}
                  correct={d.correct}
                  total={d.total}
                  percentage={d.percentage}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}