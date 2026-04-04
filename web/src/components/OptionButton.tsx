'use client';

/**
 * OptionButton — a single clickable answer option (A/B/C/D) with
 * correct/incorrect visual feedback.
 *
 * States: idle → selected → correct (green) / incorrect (red).
 */

import clsx from 'clsx';

interface OptionButtonProps {
  label: 'A' | 'B' | 'C' | 'D';
  text: string;
  isSelected: boolean;
  /** null = not yet revealed, true = correct, false = incorrect */
  correctState: boolean | null;
  disabled: boolean;
  onSelect: () => void;
}

export default function OptionButton({
  label,
  text,
  isSelected,
  correctState,
  disabled,
  onSelect,
}: OptionButtonProps) {
  const isRevealed = correctState !== null;

  const containerCls = clsx(
    'group flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-all duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
    {
      'border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-500/20':
        isRevealed && correctState === true,
      'border-rose-500/50 bg-rose-500/10 ring-1 ring-rose-500/20':
        isRevealed && isSelected && correctState === false,
      'border-slate-700 bg-slate-800/30':
        isRevealed && !isSelected && correctState === false,
      'border-indigo-500/50 bg-indigo-500/10 ring-1 ring-indigo-500/20':
        !isRevealed && isSelected,
      'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800':
        !isRevealed && !isSelected,
      'cursor-default': disabled,
      'cursor-pointer': !disabled,
    },
  );

  const letterCls = clsx(
    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-colors duration-150',
    {
      'bg-emerald-500 text-white': isRevealed && correctState === true,
      'bg-rose-500 text-white': isRevealed && isSelected && correctState === false,
      'bg-slate-700 text-slate-400': isRevealed && !isSelected && correctState === false,
      'bg-indigo-500 text-white': !isRevealed && isSelected,
      'bg-slate-700 text-slate-300': !isRevealed && !isSelected,
    },
  );

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={isSelected}
      className={containerCls}
    >
      <span className={letterCls}>{label}</span>

      <span className="pt-1 text-sm leading-relaxed text-slate-200">
        {text}
      </span>

      {isRevealed && correctState === true && (
        <span className="ml-auto shrink-0 pt-1 text-emerald-400" aria-label="Correct">✓</span>
      )}
      {isRevealed && isSelected && correctState === false && (
        <span className="ml-auto shrink-0 pt-1 text-rose-400" aria-label="Incorrect">✗</span>
      )}
    </button>
  );
}
