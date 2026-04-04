'use client';

/**
 * WeakAreaCard — highlights a single weak domain that needs attention.
 */

import Link from 'next/link';
import { DOMAIN_NAMES, DOMAIN_COLOURS } from '@/lib/types';

interface WeakAreaCardProps {
  domain: number;
  correct: number;
  total: number;
  percentage: number;
}

export default function WeakAreaCard({
  domain,
  correct,
  total,
  percentage,
}: WeakAreaCardProps) {
  const colours = DOMAIN_COLOURS[domain];
  const fill = colours?.fill ?? 'bg-slate-500';
  const textColor = colours?.text ?? 'text-slate-400';

  const urgency =
    percentage < 40 ? 'Critical' : percentage < 60 ? 'Needs Work' : 'Improving';
  const urgencyColor =
    percentage < 40
      ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
      : percentage < 60
        ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
        : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';

  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-4 transition-all hover:border-slate-600/50 hover:bg-slate-800/50">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full ${fill}`} />
          <span className={`text-sm font-semibold ${textColor}`}>
            Domain {domain}
          </span>
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${urgencyColor}`}>
          {urgency}
        </span>
      </div>

      <h3 className="mb-1 text-base font-medium text-slate-200">
        {DOMAIN_NAMES[domain]}
      </h3>

      <p className="mb-3 text-xs text-slate-500">
        {correct} correct out of {total} attempts
      </p>

      {/* Mini progress bar */}
      <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-slate-700">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            percentage >= 72 ? 'bg-emerald-500' : percentage >= 50 ? 'bg-amber-500' : 'bg-rose-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span
          className={`text-lg font-bold ${
            percentage >= 72 ? 'text-emerald-400' : percentage >= 50 ? 'text-amber-400' : 'text-rose-400'
          }`}
        >
          {percentage}%
        </span>

        <Link
          href="/quiz"
          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-400 transition-colors hover:text-indigo-300"
        >
          Practice →
        </Link>
      </div>
    </div>
  );
}
