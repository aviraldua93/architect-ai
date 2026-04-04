'use client';

/**
 * HistoryTable — recent quiz session history rendered as a table.
 */

import Link from 'next/link';
import type { SessionRecord } from '@/lib/types';

interface HistoryTableProps {
  sessions: SessionRecord[];
  limit?: number;
}

const MODE_EMOJI: Record<string, string> = {
  practice: '📝',
  study: '📖',
  exam: '🎯',
};

export default function HistoryTable({ sessions, limit = 10 }: HistoryTableProps) {
  const display = sessions.slice(0, limit);

  if (display.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-100">Recent History</h2>
        <div className="py-8 text-center">
          <p className="mb-4 text-sm text-slate-500">No sessions yet</p>
          <Link
            href="/quiz"
            className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-indigo-500"
          >
            Start your first quiz →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      <h2 className="mb-4 text-lg font-semibold text-slate-100">Recent History</h2>

      {/* Mobile card layout */}
      <div className="space-y-3 sm:hidden">
        {display.map((s) => {
          const date = new Date(s.date);
          return (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-800/30 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-200">
                  {MODE_EMOJI[s.mode] ?? '📝'}{' '}
                  {s.mode.charAt(0).toUpperCase() + s.mode.slice(1)}
                </p>
                <p className="text-xs text-slate-500">
                  {date.toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`text-sm font-bold ${
                    s.percentage >= 72
                      ? 'text-emerald-400'
                      : s.percentage >= 50
                        ? 'text-amber-400'
                        : 'text-rose-400'
                  }`}
                >
                  {s.percentage}%
                </p>
                <p className="text-xs text-slate-500">
                  {s.score}/{s.total}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th className="pb-3 pr-4">Date</th>
              <th className="pb-3 pr-4">Mode</th>
              <th className="pb-3 pr-4 text-right">Score</th>
              <th className="pb-3 pr-4 text-right">Result</th>
              <th className="pb-3 text-right">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {display.map((s) => {
              const date = new Date(s.date);
              const timeStr = s.timeElapsed
                ? `${Math.floor(s.timeElapsed / 60)}m ${s.timeElapsed % 60}s`
                : '—';

              return (
                <tr key={s.id} className="text-slate-300">
                  <td className="py-3 pr-4 whitespace-nowrap">
                    {date.toLocaleDateString()}{' '}
                    <span className="text-xs text-slate-500">
                      {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap">
                    {MODE_EMOJI[s.mode] ?? '📝'}{' '}
                    {s.mode.charAt(0).toUpperCase() + s.mode.slice(1)}
                  </td>
                  <td className="py-3 pr-4 text-right whitespace-nowrap">
                    {s.score}/{s.total}
                  </td>
                  <td className="py-3 pr-4 text-right whitespace-nowrap">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        s.percentage >= 72
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : s.percentage >= 50
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {s.percentage}%
                    </span>
                  </td>
                  <td className="py-3 text-right whitespace-nowrap text-slate-500">
                    {timeStr}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
