'use client';

/**
 * ScoreSummary — end-of-quiz results screen with domain breakdown.
 *
 * Shows overall score, pass/fail indicator (720/1000 = 72%),
 * per-domain breakdown bars, incorrect question review, and action buttons.
 *
 * @author Zara Ibrahim, Frontend React Engineer — ArchitectAI
 * @author Suki Watanabe, Domain Engineer — ArchitectAI
 */

import type { Question } from '../lib/types';
import { DOMAIN_NAMES, DOMAIN_COLOURS } from '../lib/types';
import DomainBadge from './DomainBadge';

interface ScoreSummaryProps {
  questions: Question[];
  answers: Map<number, string>;
  timeElapsed?: number;
  onTryAgain: () => void;
  onReviewMissed: () => void;
}

interface DomainResult {
  domain: number;
  correct: number;
  total: number;
  percentage: number;
}

export default function ScoreSummary({
  questions,
  answers,
  timeElapsed,
  onTryAgain,
  onReviewMissed,
}: ScoreSummaryProps) {
  let correctCount = 0;
  const incorrect: { index: number; question: Question; userAnswer: string }[] = [];

  questions.forEach((q, i) => {
    const userAnswer = answers.get(i);
    if (userAnswer === q.correctAnswer) {
      correctCount++;
    } else {
      incorrect.push({ index: i, question: q, userAnswer: userAnswer ?? '—' });
    }
  });

  const total = questions.length;
  const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const scaledScore = Math.round((percentage / 100) * 1000);
  const passed = percentage >= 72;

  // Domain breakdown
  const domainMap = new Map<number, { correct: number; total: number }>();
  questions.forEach((q, i) => {
    const entry = domainMap.get(q.domain) ?? { correct: 0, total: 0 };
    entry.total++;
    if (answers.get(i) === q.correctAnswer) entry.correct++;
    domainMap.set(q.domain, entry);
  });

  const domainResults: DomainResult[] = [...domainMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([domain, { correct, total: t }]) => ({
      domain,
      correct,
      total: t,
      percentage: t > 0 ? Math.round((correct / t) * 100) : 0,
    }));

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      {/* Score Hero */}
      <div className="rounded-xl bg-slate-800 p-8 text-center shadow-lg">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-slate-400">
          Quiz Complete
        </h2>

        <div
          className={`text-7xl font-bold ${passed ? 'text-emerald-400' : 'text-rose-400'}`}
        >
          {percentage}%
        </div>

        <p className="mt-2 text-lg text-slate-300">
          {correctCount} of {total} correct
        </p>

        <p className="mt-1 text-sm text-slate-500">
          Scaled: {scaledScore}/1000
          <span className="mx-2">·</span>
          <span className={passed ? 'text-emerald-500' : 'text-rose-500'}>
            {passed ? 'PASS' : 'BELOW PASSING'} (720/1000 needed)
          </span>
        </p>

        {timeElapsed !== undefined && timeElapsed > 0 && (
          <p className="mt-2 text-sm text-slate-500">
            ⏱ Completed in {formatTime(timeElapsed)}
          </p>
        )}
      </div>

      {/* Domain Breakdown */}
      <div className="rounded-xl bg-slate-800 p-6 shadow-lg">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Domain Breakdown
        </h3>

        <div className="space-y-4">
          {domainResults.map((dr) => {
            const colours = DOMAIN_COLOURS[dr.domain];
            const barColour = colours?.fill ?? 'bg-slate-500';

            return (
              <div key={dr.domain}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm text-slate-300">
                    D{dr.domain}: {DOMAIN_NAMES[dr.domain] ?? `Domain ${dr.domain}`}
                  </span>
                  <span className="text-sm font-medium text-slate-400">
                    {dr.correct}/{dr.total} ({dr.percentage}%)
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-700">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barColour}`}
                    style={{ width: `${dr.percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Incorrect Questions Review */}
      {incorrect.length > 0 && (
        <div className="rounded-xl bg-slate-800 p-6 shadow-lg">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Incorrect Questions ({incorrect.length})
          </h3>

          <div className="space-y-4">
            {incorrect.map(({ index, question: q, userAnswer }) => (
              <div
                key={q.id}
                className="rounded-lg border border-slate-700 bg-slate-900/50 p-4"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <DomainBadge domain={q.taskStatement} size="sm" />
                  <span className="text-xs text-slate-500">Q{index + 1}</span>
                </div>

                <p className="mb-3 text-sm font-medium text-slate-200">
                  {q.question}
                </p>

                <div className="mb-3 flex flex-col gap-1 text-sm sm:flex-row sm:gap-4">
                  <span className="text-rose-400">
                    Your answer: {userAnswer}) {q.options[userAnswer as keyof typeof q.options] ?? '—'}
                  </span>
                  <span className="text-emerald-400">
                    Correct: {q.correctAnswer}) {q.options[q.correctAnswer]}
                  </span>
                </div>

                <p className="text-sm leading-relaxed text-slate-400">
                  💡 {q.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={onTryAgain}
          className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors duration-150
            hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
        >
          🔄 Try Again
        </button>

        {incorrect.length > 0 && (
          <button
            type="button"
            onClick={onReviewMissed}
            className="rounded-lg border border-slate-600 bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-200 shadow-sm transition-colors duration-150
              hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            📝 Review Missed Questions
          </button>
        )}
      </div>
    </div>
  );
}
