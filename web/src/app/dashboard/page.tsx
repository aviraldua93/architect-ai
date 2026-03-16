'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DOMAIN_NAMES, DOMAIN_COLOURS } from '@/lib/types';
import { getSessions, getProgress } from '@/lib/store';
import { formatTime } from '@/lib/scoring';
import type { SessionRecord } from '@/lib/types';

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

  const recentSessions = sessions.slice(0, 5);

  // Find weak domains
  const domainEntries = Object.entries(progress.domainStats)
    .map(([d, stats]) => ({
      domain: Number(d),
      ...stats,
      percentage: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
    }))
    .sort((a, b) => a.domain - b.domain);

  const weakDomains = [...domainEntries]
    .filter(d => d.total > 0)
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="mb-2 text-3xl font-bold text-slate-100">📊 Dashboard</h1>
      <p className="mb-8 text-slate-400">Track your progress across all study sessions</p>

      {/* Overall stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
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
      </div>

      {/* Domain mastery */}
      <div className="mb-8 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-100">Domain Mastery</h2>
        {domainEntries.length === 0 ? (
          <p className="text-sm text-slate-500">No data yet. Complete a quiz to see your domain mastery.</p>
        ) : (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(d => {
              const stats = progress.domainStats[d];
              const pct = stats && stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
              const colours = DOMAIN_COLOURS[d];
              const barFill = colours?.fill ?? 'bg-slate-500';

              return (
                <div key={d}>
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${barFill}`} />
                      <span className="text-sm font-medium text-slate-200">
                        D{d}: {DOMAIN_NAMES[d]}
                      </span>
                    </div>
                    <span className="text-sm text-slate-400">
                      {stats ? `${stats.correct}/${stats.total}` : '—'} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : pct > 0 ? 'bg-rose-500' : 'bg-slate-700'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Recent activity */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-100">Recent Activity</h2>
          {recentSessions.length === 0 ? (
            <div className="text-center py-8">
              <p className="mb-4 text-sm text-slate-500">No sessions yet</p>
              <Link
                href="/quiz"
                className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-indigo-500"
              >
                Start your first quiz
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSessions.map(session => {
                const date = new Date(session.date);
                const modeEmoji = session.mode === 'exam' ? '🎯' : session.mode === 'study' ? '📖' : '📝';
                return (
                  <div
                    key={session.id}
                    className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-800/30 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-200">
                        {modeEmoji} {session.mode.charAt(0).toUpperCase() + session.mode.slice(1)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${
                        session.percentage >= 72 ? 'text-emerald-400' : session.percentage >= 50 ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {session.percentage}%
                      </p>
                      <p className="text-xs text-slate-500">
                        {session.score}/{session.total}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Weak areas */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-100">⚠️ Weak Areas</h2>
          {weakDomains.length === 0 ? (
            <p className="text-sm text-slate-500">Complete quizzes to identify weak areas.</p>
          ) : (
            <div className="space-y-4">
              {weakDomains.map(d => {
                const colours = DOMAIN_COLOURS[d.domain];
                return (
                  <div key={d.domain} className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${colours?.fill ?? 'bg-slate-500'}`} />
                        <span className="text-sm font-medium text-slate-200">
                          D{d.domain}: {DOMAIN_NAMES[d.domain]}
                        </span>
                      </div>
                      <span className={`text-sm font-bold ${
                        d.percentage >= 72 ? 'text-emerald-400' : d.percentage >= 50 ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {d.percentage}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {d.correct} correct out of {d.total} attempts
                    </p>
                    <Link
                      href="/study"
                      className="mt-2 inline-flex items-center text-xs font-medium text-indigo-400 transition-colors hover:text-indigo-300"
                    >
                      Study this domain →
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}