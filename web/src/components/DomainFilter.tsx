'use client';

/**
 * DomainFilter — dropdown/pill selector for domain & difficulty filtering.
 *
 * Shows domain pills (colour-coded), difficulty pills, and a question count
 * that updates based on current filters.
 *
 * @author Zara Ibrahim, Frontend React Engineer — ArchitectAI
 * @author Suki Watanabe, Domain Engineer — ArchitectAI
 */

import type { DifficultyLevel } from '../lib/types';
import { DOMAIN_NAMES, DOMAIN_COLOURS } from '../lib/types';

interface DomainFilterProps {
  selectedDomain: number | undefined;
  selectedDifficulty: DifficultyLevel | undefined;
  questionCount: number;
  onDomainChange: (domain: number | undefined) => void;
  onDifficultyChange: (difficulty: DifficultyLevel | undefined) => void;
}

const domains = [1, 2, 3, 4, 5] as const;

const difficulties: { key: DifficultyLevel; label: string; activeClasses: string }[] = [
  {
    key: 'foundation',
    label: 'Foundation',
    activeClasses: 'bg-slate-600 text-slate-100 ring-slate-500',
  },
  {
    key: 'intermediate',
    label: 'Intermediate',
    activeClasses: 'bg-amber-500/30 text-amber-300 ring-amber-500/50',
  },
  {
    key: 'advanced',
    label: 'Advanced',
    activeClasses: 'bg-rose-500/30 text-rose-300 ring-rose-500/50',
  },
];

export default function DomainFilter({
  selectedDomain,
  selectedDifficulty,
  questionCount,
  onDomainChange,
  onDifficultyChange,
}: DomainFilterProps) {
  return (
    <div className="space-y-4 rounded-xl bg-slate-800 p-5 shadow-lg">
      {/* Domain pills */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Domain
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onDomainChange(undefined)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition-all duration-150
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
              ${selectedDomain === undefined
                ? 'bg-indigo-500/20 text-indigo-300 ring-indigo-500/50'
                : 'bg-slate-700/50 text-slate-400 ring-slate-600 hover:text-slate-300'
              }`}
          >
            All
          </button>

          {domains.map((d) => {
            const colours = DOMAIN_COLOURS[d];
            const isActive = selectedDomain === d;

            return (
              <button
                key={d}
                type="button"
                onClick={() => onDomainChange(isActive ? undefined : d)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition-all duration-150
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
                  ${isActive
                    ? `${colours.bg} ${colours.text} ${colours.ring}`
                    : 'bg-slate-700/50 text-slate-400 ring-slate-600 hover:text-slate-300'
                  }`}
              >
                <span
                  className={`inline-block h-2 w-2 rounded-full ${isActive ? colours.fill : 'bg-slate-500'}`}
                  aria-hidden="true"
                />
                {DOMAIN_NAMES[d]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Difficulty pills */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Difficulty
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onDifficultyChange(undefined)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition-all duration-150
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
              ${selectedDifficulty === undefined
                ? 'bg-indigo-500/20 text-indigo-300 ring-indigo-500/50'
                : 'bg-slate-700/50 text-slate-400 ring-slate-600 hover:text-slate-300'
              }`}
          >
            All
          </button>

          {difficulties.map(({ key, label, activeClasses }) => {
            const isActive = selectedDifficulty === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() =>
                  onDifficultyChange(isActive ? undefined : key)
                }
                className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition-all duration-150
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
                  ${isActive
                    ? activeClasses
                    : 'bg-slate-700/50 text-slate-400 ring-slate-600 hover:text-slate-300'
                  }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Question count */}
      <div className="border-t border-slate-700 pt-3">
        <p className="text-sm text-slate-400">
          <span className="font-semibold text-slate-200">{questionCount}</span>{' '}
          question{questionCount !== 1 ? 's' : ''} match
          {questionCount === 1 ? 'es' : ''} your filters
        </p>
      </div>
    </div>
  );
}
