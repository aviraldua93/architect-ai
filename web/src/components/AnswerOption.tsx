'use client';

/**
 * AnswerOption — a single selectable answer choice (A/B/C/D).
 *
 * States: default → hover → selected → correct (emerald) / incorrect (rose).
 * Smooth 150ms transitions between all states.
 *
 * @author Zara Ibrahim, Frontend React Engineer — ArchitectAI
 */

import type { QuestionOption } from '@/lib/types';

interface AnswerOptionProps {
  option: QuestionOption;
  isSelected: boolean;
  isCorrect: boolean | null;
  isRevealed: boolean;
  onSelect: (id: string) => void;
}

export default function AnswerOption({
  option,
  isSelected,
  isCorrect,
  isRevealed,
  onSelect,
}: AnswerOptionProps) {
  let containerClasses: string;
  let letterClasses: string;

  if (isRevealed && isCorrect) {
    containerClasses =
      'border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-500/20';
    letterClasses = 'bg-emerald-500 text-white';
  } else if (isRevealed && isSelected && !isCorrect) {
    containerClasses =
      'border-rose-500/50 bg-rose-500/10 ring-1 ring-rose-500/20';
    letterClasses = 'bg-rose-500 text-white';
  } else if (isSelected) {
    containerClasses =
      'border-indigo-500/50 bg-indigo-500/10 ring-1 ring-indigo-500/20';
    letterClasses = 'bg-indigo-500 text-white';
  } else {
    containerClasses =
      'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800';
    letterClasses = 'bg-slate-700 text-slate-300';
  }

  const disabled = isRevealed;

  return (
    <button
      type="button"
      onClick={() => !disabled && onSelect(option.id)}
      disabled={disabled}
      aria-pressed={isSelected}
      className={`group flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-all duration-150
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
        ${containerClasses}
        ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-colors duration-150 ${letterClasses}`}
      >
        {option.id}
      </span>

      <span className="pt-1 text-sm leading-relaxed text-slate-200">
        {option.text}
      </span>

      {isRevealed && isCorrect && (
        <span className="ml-auto shrink-0 pt-1 text-emerald-400" aria-label="Correct answer">
          ✓
        </span>
      )}
      {isRevealed && isSelected && !isCorrect && (
        <span className="ml-auto shrink-0 pt-1 text-rose-400" aria-label="Incorrect answer">
          ✗
        </span>
      )}
    </button>
  );
}
