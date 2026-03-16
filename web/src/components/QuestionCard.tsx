'use client';

/**
 * QuestionCard — displays a single quiz question with scenario, options,
 * domain/difficulty badges, and feedback.
 *
 * @author Zara Ibrahim, Frontend React Engineer — ArchitectAI
 * @author Suki Watanabe, Domain Engineer — ArchitectAI
 */

import type { Question, QuestionOption } from '../lib/types';
import type { QuizMode } from '../lib/types';
import { TASK_STATEMENT_NAMES, normalizeDifficulty } from '../lib/types';
import DomainBadge from './DomainBadge';
import DifficultyBadge from './DifficultyBadge';
import AnswerOption from './AnswerOption';

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  mode: QuizMode;
  selectedAnswer: string | undefined;
  isRevealed: boolean;
  onSelectAnswer: (answer: string) => void;
}

export default function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  mode,
  selectedAnswer,
  isRevealed,
  onSelectAnswer,
}: QuestionCardProps) {
  const taskName =
    TASK_STATEMENT_NAMES[question.taskStatement] ?? question.taskStatement;

  const options: QuestionOption[] = (['A', 'B', 'C', 'D'] as const).map(
    (id) => ({ id, text: question.options[id] }),
  );

  const showFeedback =
    isRevealed && (mode === 'practice' || mode === 'study');

  return (
    <div className="w-full rounded-xl bg-slate-800 shadow-lg">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-700 px-6 py-4">
        <DomainBadge domain={question.taskStatement} />
        <DifficultyBadge difficulty={normalizeDifficulty(question.difficulty)} />

        <span className="ml-auto text-sm text-slate-400">
          Task {question.taskStatement}: {taskName}
        </span>
      </div>

      {/* Question number */}
      <div className="px-6 pt-5 text-xs font-medium uppercase tracking-wider text-slate-500">
        Question {questionNumber} of {totalQuestions}
      </div>

      {/* Scenario */}
      <div className="px-6 pt-3">
        <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
          <p className="text-sm leading-relaxed text-slate-300">
            {question.scenario}
          </p>
        </div>
      </div>

      {/* Question text */}
      <div className="px-6 pt-4">
        <p className="text-base font-semibold leading-relaxed text-slate-50">
          {question.question}
        </p>
      </div>

      {/* Answer options */}
      <div className="flex flex-col gap-3 px-6 pt-5 pb-6">
        {options.map((opt) => (
          <AnswerOption
            key={opt.id}
            option={opt}
            isSelected={selectedAnswer === opt.id}
            isCorrect={
              isRevealed
                ? opt.id === question.correctAnswer
                : null
            }
            isRevealed={isRevealed}
            onSelect={onSelectAnswer}
          />
        ))}
      </div>

      {/* Feedback — shown in practice/study mode after answering */}
      {showFeedback && (
        <div className="border-t border-slate-700 px-6 py-5">
          {selectedAnswer === question.correctAnswer ? (
            <div className="mb-3 flex items-center gap-2 text-emerald-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-semibold">Correct!</span>
            </div>
          ) : (
            <div className="mb-3 flex items-center gap-2 text-rose-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-semibold">
                Incorrect — the answer is {question.correctAnswer}
              </span>
            </div>
          )}

          <div className="rounded-lg bg-slate-900/50 p-4">
            <h4 className="mb-2 text-sm font-semibold text-slate-300">
              💡 Explanation
            </h4>
            <p className="text-sm leading-relaxed text-slate-400">
              {question.explanation}
            </p>

            {mode === 'study' && question.examTrap && (
              <div className="mt-3 border-t border-slate-700 pt-3">
                <h4 className="mb-1 text-sm font-semibold text-amber-400">
                  ⚠️ Exam Trap
                </h4>
                <p className="text-sm leading-relaxed text-slate-400">
                  {question.examTrap}
                </p>
              </div>
            )}
          </div>

          {question.conceptsTested && question.conceptsTested.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {question.conceptsTested.map((concept) => (
                <span
                  key={concept}
                  className="rounded-full bg-slate-700/50 px-2.5 py-0.5 text-xs text-slate-400"
                >
                  {concept}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
