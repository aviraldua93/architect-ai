'use client';

import { useState, useMemo, useCallback } from 'react';
import type { Question } from '@/lib/types';
import { getAllQuestions } from '@/lib/questions';
import { shuffle, generateReport } from '@/lib/scoring';
import { QuestionCard, ProgressBar, ScoreSummary, Timer } from '@/components';
import { saveSession } from '@/lib/store';

type ExamPhase = 'intro' | 'active' | 'results';

const EXAM_QUESTION_COUNT = 30;
const EXAM_TIME_SECONDS = 45 * 60; // 45 minutes

export default function ExamPage() {
  const [phase, setPhase] = useState<ExamPhase>('intro');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<number, string>>(new Map());
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [startTime, setStartTime] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(EXAM_TIME_SECONDS);
  const [showConfirm, setShowConfirm] = useState(false);

  const allQuestions = useMemo(() => getAllQuestions(), []);

  const startExam = () => {
    const shuffled = shuffle(allQuestions);
    setQuestions(shuffled.slice(0, Math.min(EXAM_QUESTION_COUNT, shuffled.length)));
    setCurrentIndex(0);
    setAnswers(new Map());
    setFlagged(new Set());
    setStartTime(Date.now());
    setTimeRemaining(EXAM_TIME_SECONDS);
    setPhase('active');
  };

  const handleAnswer = (answer: string) => {
    const newAnswers = new Map(answers);
    newAnswers.set(currentIndex, answer);
    setAnswers(newAnswers);
  };

  const toggleFlag = () => {
    const newFlagged = new Set(flagged);
    if (newFlagged.has(currentIndex)) newFlagged.delete(currentIndex);
    else newFlagged.add(currentIndex);
    setFlagged(newFlagged);
  };

  const submitExam = useCallback(() => {
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
      mode: 'exam',
      score: result.correct,
      total: result.total,
      percentage: result.percentage,
      domains: Object.fromEntries(
        result.domainBreakdown.map(d => [d.domain, { correct: d.correct, total: d.total }]),
      ),
      timeElapsed,
    });
    setShowConfirm(false);
    setPhase('results');
  }, [questions, answers, startTime]);

  const handleTimeUp = useCallback(() => {
    submitExam();
  }, [submitExam]);

  const handleTick = useCallback(() => {
    setTimeRemaining(prev => Math.max(0, prev - 1));
  }, []);

  // ── Intro Phase ─────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 text-center">
        <div className="mb-6 text-6xl">🎯</div>
        <h1 className="mb-4 text-3xl font-bold text-slate-100">Mock Exam</h1>
        <p className="mb-8 text-lg text-slate-400">
          Simulate the real exam experience with {EXAM_QUESTION_COUNT} questions and a 45-minute time limit.
        </p>

        <div className="mx-auto mb-10 max-w-sm space-y-3 rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-left">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Exam Rules</h3>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-indigo-400">•</span>
              {EXAM_QUESTION_COUNT} random questions from all domains
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400">•</span>
              45-minute time limit
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400">•</span>
              No feedback until submission
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400">•</span>
              72% (720/1000) required to pass
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400">•</span>
              Flag questions to review before submitting
            </li>
          </ul>
        </div>

        <button
          onClick={startExam}
          className="rounded-xl bg-indigo-600 px-10 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-500 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]"
        >
          Start Exam
        </button>
      </div>
    );
  }

  // ── Active Exam ─────────────────────────────────────────────
  if (phase === 'active') {
    const currentQuestion = questions[currentIndex];

    return (
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* Timer bar */}
        <div className="mb-6">
          <Timer
            totalSeconds={EXAM_TIME_SECONDS}
            timeRemaining={timeRemaining}
            onTimeUp={handleTimeUp}
            onTick={handleTick}
            isRunning={true}
          />
        </div>

        <div className="flex gap-6">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            <ProgressBar current={currentIndex + 1} total={questions.length} className="mb-6" />

            <QuestionCard
              question={currentQuestion}
              questionNumber={currentIndex + 1}
              totalQuestions={questions.length}
              mode="exam"
              selectedAnswer={answers.get(currentIndex)}
              isRevealed={false}
              onSelectAnswer={handleAnswer}
            />

            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                className="rounded-lg border border-slate-700 bg-slate-800/50 px-5 py-2.5 text-sm font-medium text-slate-300 transition-all hover:border-slate-600 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>

              <button
                onClick={toggleFlag}
                className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                  flagged.has(currentIndex)
                    ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30'
                    : 'border border-slate-700 bg-slate-800/50 text-slate-400 hover:text-amber-400'
                }`}
              >
                {flagged.has(currentIndex) ? '🚩 Flagged' : '🏳️ Flag'}
              </button>

              <button
                onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
                disabled={currentIndex === questions.length - 1}
                className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>

          {/* Question navigator sidebar */}
          <div className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-24 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Questions
              </h3>
              <div className="grid grid-cols-6 gap-2">
                {questions.map((_, i) => {
                  const isAnswered = answers.has(i);
                  const isFlagged = flagged.has(i);
                  const isCurrent = i === currentIndex;
                  let bg = 'bg-slate-800 text-slate-500';
                  if (isCurrent) bg = 'bg-indigo-600 text-white ring-2 ring-indigo-400';
                  else if (isFlagged) bg = 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30';
                  else if (isAnswered) bg = 'bg-emerald-500/20 text-emerald-400';

                  return (
                    <button
                      key={i}
                      onClick={() => setCurrentIndex(i)}
                      className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold transition-all ${bg}`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 space-y-1 border-t border-slate-800 pt-3 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm bg-emerald-500/20" />
                  Answered ({answers.size})
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm bg-amber-500/20" />
                  Flagged ({flagged.size})
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm bg-slate-800" />
                  Unanswered ({questions.length - answers.size})
                </div>
              </div>

              <button
                onClick={() => setShowConfirm(true)}
                className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-emerald-500 active:scale-[0.98]"
              >
                Submit Exam
              </button>
            </div>
          </div>
        </div>

        {/* Mobile submit */}
        <div className="mt-6 text-center lg:hidden">
          <button
            onClick={() => setShowConfirm(true)}
            className="rounded-lg bg-emerald-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-500 active:scale-[0.98]"
          >
            Submit Exam ({answers.size}/{questions.length} answered)
          </button>
        </div>

        {/* Confirm modal */}
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-md rounded-xl border border-slate-700 bg-slate-800 p-6 shadow-2xl">
              <h3 className="mb-2 text-lg font-bold text-slate-100">Submit Exam?</h3>
              <p className="mb-4 text-sm text-slate-400">
                You have answered <span className="font-semibold text-slate-200">{answers.size}</span> of{' '}
                <span className="font-semibold text-slate-200">{questions.length}</span> questions.
                {questions.length - answers.size > 0 && (
                  <span className="text-amber-400">
                    {' '}{questions.length - answers.size} unanswered questions will be marked incorrect.
                  </span>
                )}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 rounded-lg border border-slate-600 bg-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 transition-all hover:bg-slate-600"
                >
                  Continue Exam
                </button>
                <button
                  onClick={submitExam}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-emerald-500"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Results Phase ───────────────────────────────────────────
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-8 text-center text-3xl font-bold text-slate-100">🎯 Exam Results</h1>
      <ScoreSummary
        questions={questions}
        answers={answers}
        timeElapsed={EXAM_TIME_SECONDS - timeRemaining}
        onTryAgain={() => setPhase('intro')}
        onReviewMissed={() => {
          const firstMissed = questions.findIndex((q, i) => answers.get(i) !== q.correctAnswer);
          if (firstMissed >= 0) setCurrentIndex(firstMissed);
          setPhase('active');
        }}
      />
    </div>
  );
}