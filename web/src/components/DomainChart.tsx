'use client';

/**
 * DomainChart — CSS-only horizontal bar chart showing domain coverage.
 * No charting library required.
 */

import { DOMAIN_NAMES, DOMAIN_COLOURS } from '@/lib/types';

interface DomainStat {
  domain: number;
  correct: number;
  total: number;
}

interface DomainChartProps {
  domainStats: Record<number, { correct: number; total: number }>;
}

export default function DomainChart({ domainStats }: DomainChartProps) {
  const domains = [1, 2, 3, 4, 5];

  const stats: DomainStat[] = domains.map((d) => ({
    domain: d,
    correct: domainStats[d]?.correct ?? 0,
    total: domainStats[d]?.total ?? 0,
  }));

  const hasData = stats.some((s) => s.total > 0);

  if (!hasData) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-100">Domain Coverage</h2>
        <p className="text-sm text-slate-500">Complete a quiz to see your domain coverage chart.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      <h2 className="mb-5 text-lg font-semibold text-slate-100">Domain Coverage</h2>

      <div className="space-y-4">
        {stats.map((s) => {
          const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
          const colours = DOMAIN_COLOURS[s.domain];
          const barColor =
            pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : pct > 0 ? 'bg-rose-500' : 'bg-slate-700';

          return (
            <div key={s.domain}>
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${colours?.fill ?? 'bg-slate-500'}`} />
                  <span className="text-sm font-medium text-slate-200">
                    D{s.domain}: {DOMAIN_NAMES[s.domain]}
                  </span>
                </div>
                <span className="text-sm text-slate-400">
                  {s.total > 0 ? `${s.correct}/${s.total}` : '—'}{' '}
                  <span className={`font-semibold ${
                    pct >= 72 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : pct > 0 ? 'text-rose-400' : 'text-slate-500'
                  }`}>
                    ({pct}%)
                  </span>
                </span>
              </div>

              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
