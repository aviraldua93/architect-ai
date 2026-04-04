'use client';

/**
 * FilterBar — domain and difficulty filter controls using native select
 * dropdowns. Compact, mobile-friendly alternative to DomainFilter pills.
 */

import { DOMAIN_NAMES } from '@/lib/types';
import type { Difficulty } from '@/lib/types';

interface FilterBarProps {
  selectedDomain: number | undefined;
  selectedDifficulty: Difficulty | 'all';
  questionCount: number;
  onDomainChange: (domain: number | undefined) => void;
  onDifficultyChange: (difficulty: Difficulty | 'all') => void;
}

const DIFFICULTIES: { value: Difficulty | 'all'; label: string }[] = [
  { value: 'all', label: 'All Difficulties' },
  { value: 'foundation', label: 'Foundation' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

export default function FilterBar({
  selectedDomain,
  selectedDifficulty,
  questionCount,
  onDomainChange,
  onDifficultyChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-800/80 px-4 py-3 shadow-lg backdrop-blur-sm sm:px-5">
      {/* Domain dropdown */}
      <div className="flex items-center gap-2">
        <label htmlFor="filter-domain" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Domain
        </label>
        <select
          id="filter-domain"
          value={selectedDomain ?? 0}
          onChange={(e) => {
            const v = Number(e.target.value);
            onDomainChange(v === 0 ? undefined : v);
          }}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value={0}>All Domains</option>
          {[1, 2, 3, 4, 5].map((d) => (
            <option key={d} value={d}>
              D{d}: {DOMAIN_NAMES[d]}
            </option>
          ))}
        </select>
      </div>

      {/* Difficulty dropdown */}
      <div className="flex items-center gap-2">
        <label htmlFor="filter-difficulty" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Level
        </label>
        <select
          id="filter-difficulty"
          value={selectedDifficulty}
          onChange={(e) => onDifficultyChange(e.target.value as Difficulty | 'all')}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {DIFFICULTIES.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      {/* Question count badge */}
      <span className="ml-auto rounded-full bg-slate-700/50 px-3 py-1 text-xs font-medium text-slate-400">
        {questionCount} question{questionCount !== 1 ? 's' : ''}
      </span>
    </div>
  );
}
