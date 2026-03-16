'use client';

import { useState, useMemo, useCallback } from 'react';
import type { Question, DifficultyLevel } from '@/lib/types';
import { DOMAIN_NAMES, DOMAIN_COLOURS } from '@/lib/types';
import { getAllQuestions } from '@/lib/questions';
import { shuffle, filterQuestions, generateReport, formatTime } from '@/lib/scoring';
import { QuestionCard, ProgressBar, ScoreSummary, DomainFilter } from '@/components';
import { saveSession } from '@/lib/store';

type Phase = 'config' | 'active' | 'results';

const QUESTION_COUNTS = [5, 10, 20, 0] as const;
const QUESTION_COUNT_LABELS: Record<number, string> = { 5: '5', 10: '10', 20: '20', 0: 'All' };

export default function QuizPage() {
  // Config state
  const [selectedDomain, setSelectedDomain] = useState<number | undefined>(undefined);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | undefined>(undefined);
  const [questionCount, setQuestionCount] = useState<number>(10);

  // Quiz state
  const [phase, setPhase] = useState<Phase>('config');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<number, string>>(new Map());
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [startTime, setStartTime] = useState<number>(0);

  const allQuestions = useMemo(() => getAllQuestions(), []);

  const filteredCount = useMemo(() => {
    return filterQuestions(allQuestions, selectedDomain, selectedDifficulty).length;
  }, [allQuestions, selectedDomain, selectedDifficulty]);

  const startQuiz = () => {
    let filtered = filterQuestions(allQuestions, selectedDomain, selectedDifficulty);
    filtered = shuffle(filtered);
    const count = questionCount === 0 ? filtered.length : Math.min(questionCount, filtered.length);
    setQuestions(filtered.slice(0, count));
    setCurrentIndex(0);
    setAnswers(new Map());
    setRevealed(new Set());
    setStartTime(Date.now());
    setPhase('active');
  };

  const handleAnswer = (answer: string) => {
    const newAnswers = new Map(answers);
    newAnswers.set(currentIndex, answer);
    setAnswers(newAnswers);
    // In practice mode, reveal answer immediately
    const newRevealed = new Set(revealed);
    newRevealed.add(currentIndex);
    setRevealed(newRevealed);
  };

  const goNext = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const finishQuiz = () => {
    const timeElapsed = Math.round((Date.now() - startTime) / 1000);
    const answerMap = new Map<string, 'A' | 'B' | 'C' | 'D'>();
    questions.forEach((q, i) => {
      const a = answers.get(i);
      if (a) answerMap.set(q.id, a as 'A' | 'B' | 'C' | 'D');
    });
    const result = generateReport(questions, answerMap, timeElapsed);
    saveSession({
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      mode: 'practice',
      score: result.correct,
      total: result.total,
      percentage: result.percentage,
      domains: Object.fromEntries(
        result.domainBreakdown.map(d => [d.domain, { correct: d.correct, total: d.total }]),
      ),
      timeElapsed,
    });
    setPhase('results');
  };

  const handleTryAgain = useCallback(() => {
    setPhase('config');
    setQuestions([]);
    setAnswers(new Map());
    setRevealed(new Set());
  }, []);

  const handleReviewMissed = useCallback(() => {
    // Go back to first missed question
    const firstMissed = questions.findIndex((q, i) => answers.get(i) !== q.correctAnswer);
    if (firstMissed >= 0) setCurrentIndex(firstMissed);
    setPhase('active');
  }, [questions, answers]);

  // ── Configuration Phase ─────────────────────────────────────
  if (phase === 'config') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="mb-2 text-3xl font-bold text-slate-100">Practice Quiz</h1>
        <p className="mb-8 text-slate-400">Quick practice with instant feedback after each question</p>

        <DomainFilter
          selectedDomain={selectedDomain}
          selectedDifficulty={selectedDifficulty}
          questionCount={filteredCount}
          onDomainChange={setSelectedDomain}
          onDifficultyChange={setSelectedDifficulty}
        />

        <div className="mt-6 rounded-xl bg-slate-800 p-5 shadow-lg">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Question Count
          </h3>
          <div className="flex flex-wrap gap-2">
            {QUESTION_COUNTS.map(count => (
              <button
                key={count}
                onClick={() => setQuestionCount(count)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium ring-1 ring-inset transition-all duration-150 ${
                  questionCount === count
                    ? 'bg-indigo-500/20 text-indigo-300 ring-indigo-500/50'
                    : 'bg-slate-700/50 text-slate-400 ring-slate-600 hover:text-slate-300'
                }`}
              >
                {QUESTION_COUNT_LABELS[count]}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={startQuiz}
          disabled={filteredCount === 0}
          className="mt-8 w-full rounded-lg bg-indigo-600 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-500 hover:shadow-indigo-500/40 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Start Quiz ({questionCount === 0 ? filteredCount : Math.min(questionCount, filteredCount)} questions)
        </button>
      </div>
    );
  }

  // ── Active Quiz Phase ───────────────────────────────────────
  if (phase === 'active') {
    const currentQuestion = questions[currentIndex];
    const isRevealed = revealed.has(currentIndex);
    const answeredCount = answers.size;

    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <ProgressBar current={currentIndex + 1} total={questions.length} className="mb-6" />

        <QuestionCard
          question={currentQuestion}
          questionNumber={currentIndex + 1}
          totalQuestions={questions.length}
          mode="practice"
          selectedAnswer={answers.get(currentIndex)}
          isRevealed={isRevealed}
          onSelectAnswer={handleAnswer}
        />

        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={goPrev}
            disabled={currentIndex === 0}
            className="rounded-lg border border-slate-700 bg-slate-800/50 px-5 py-2.5 text-sm font-medium text-slate-300 transition-all hover:border-slate-600 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>

          <div className="flex items-center gap-3">
            {currentIndex < questions.length - 1 ? (
              <button
                onClick={goNext}
                className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-indigo-500 active:scale-[0.98]"
              >
                Next →
              </button>
            ) : null}

            {answeredCount >= questions.length && (
              <button
                onClick={finishQuiz}
                className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-500 active:scale-[0.98]"
              >
                Finish Quiz ✓
              </button>
            )}
          </div>
        </div>

        {/* Quick finish option */}
        {answeredCount < questions.length && answeredCount > 0 && (
          <div className="mt-4 text-center">
            <button
              onClick={finishQuiz}
              className="text-sm text-slate-500 transition-colors hover:text-slate-300"
            >
              End quiz early ({answeredCount}/{questions.length} answered)
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Results Phase ───────────────────────────────────────────
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-8 text-center text-3xl font-bold text-slate-100">Quiz Results</h1>
      <ScoreSummary
        questions={questions}
        answers={answers}
        timeElapsed={Math.round((Date.now() - startTime) / 1000)}
        onTryAgain={handleTryAgain}
        onReviewMissed={handleReviewMissed}
      />
    </div>
  );
}