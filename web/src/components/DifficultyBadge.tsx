/**
 * DifficultyBadge — colour-coded badge for question difficulty level.
 *
 * @author Zara Ibrahim, Frontend React Engineer — ArchitectAI
 */

import type { DifficultyLevel, Difficulty } from '@/lib/types';
import { normalizeDifficulty } from '@/lib/types';

interface DifficultyBadgeProps {
  difficulty: DifficultyLevel;
}

const config: Record<Difficulty, { label: string; classes: string }> = {
  foundation: {
    label: 'Foundation',
    classes: 'bg-slate-600/30 text-slate-300 ring-slate-500/30',
  },
  intermediate: {
    label: 'Intermediate',
    classes: 'bg-amber-500/20 text-amber-400 ring-amber-500/30',
  },
  advanced: {
    label: 'Advanced',
    classes: 'bg-rose-500/20 text-rose-400 ring-rose-500/30',
  },
};

export default function DifficultyBadge({ difficulty }: DifficultyBadgeProps) {
  const normalized = normalizeDifficulty(difficulty);
  const { label, classes } = config[normalized] ?? config.intermediate;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${classes}`}
    >
      {label}
    </span>
  );
}
