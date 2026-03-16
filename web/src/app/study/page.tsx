'use client';

import { useState, useMemo } from 'react';
import type { Question, DifficultyLevel } from '@/lib/types';
import { DOMAIN_NAMES, DOMAIN_COLOURS } from '@/lib/types';
import { getAllQuestions } from '@/lib/questions';
import { shuffle, filterQuestions } from '@/lib/scoring';
import { QuestionCard, DomainFilter } from '@/components';

export default function StudyPage() {
  const [selectedDomain, setSelectedDomain] = useState<number | undefined>(undefined);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | undefined>(undefined);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | undefined>(undefined);
  const [isRevealed, setIsRevealed] = useState(false);
  const [questionsStudied, setQuestionsStudied] = useState(0);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());

  const allQuestions = useMemo(() => getAllQuestions(), []);

  const filteredQuestions = useMemo(() => {
    return filterQuestions(allQuestions, selectedDomain, selectedDifficulty);
  }, [allQuestions, selectedDomain, selectedDifficulty]);

  const pickRandomQuestion = () => {
    const unseen = filteredQuestions.filter(q => !seenIds.has(q.id));
    const pool = unseen.length > 0 ? unseen : filteredQuestions;
    const shuffled = shuffle(pool);
    const next = shuffled[0];
    if (next) {
      setCurrentQuestion(next);
      setSelectedAnswer(undefined);
      setIsRevealed(false);
    }
  };

  const handleAnswer = (answer: string) => {
    setSelectedAnswer(answer);
    setIsRevealed(true);
    setQuestionsStudied(prev => prev + 1);
    setSeenIds(prev => {
      const updated = new Set(prev);
      if (currentQuestion) updated.add(currentQuestion.id);
      return updated;
    });
  };

  const handleNext = () => {
    pickRandomQuestion();
  };

  const handleStartStudying = () => {
    setSeenIds(new Set());
    setQuestionsStudied(0);
    pickRandomQuestion();
  };

  // ── Not started ─────────────────────────────────────────────
  if (!currentQuestion) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="mb-2 text-3xl font-bold text-slate-100">📖 Study Mode</h1>
        <p className="mb-8 text-slate-400">
          Study one question at a time with detailed explanations. Select your answer to reveal the full breakdown.
        </p>

        <DomainFilter
          selectedDomain={selectedDomain}
          selectedDifficulty={selectedDifficulty}
          questionCount={filteredQuestions.length}
          onDomainChange={setSelectedDomain}
          onDifficultyChange={setSelectedDifficulty}
        />

        <button
          onClick={handleStartStudying}
          disabled={filteredQuestions.length === 0}
          className="mt-8 w-full rounded-lg bg-emerald-600 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-500 hover:shadow-emerald-500/40 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Start Studying ({filteredQuestions.length} questions)
        </button>
      </div>
    );
  }

  // ── Studying ────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setCurrentQuestion(null);
              setSelectedAnswer(undefined);
              setIsRevealed(false);
            }}
            className="text-sm text-slate-400 transition-colors hover:text-slate-200"
          >
            ← Back to filters
          </button>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <span className="rounded-full bg-slate-800 px-3 py-1">
            <span className="font-semibold text-emerald-400">{questionsStudied}</span> studied
          </span>
          <span className="rounded-full bg-slate-800 px-3 py-1">
            <span className="font-semibold text-slate-200">{seenIds.size}</span>/{filteredQuestions.length} seen
          </span>
        </div>
      </div>

      {/* Domain filter pills (inline) */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => { setSelectedDomain(undefined); pickRandomQuestion(); }}
          className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-all ${
            selectedDomain === undefined
              ? 'bg-indigo-500/20 text-indigo-300 ring-indigo-500/50'
              : 'bg-slate-700/50 text-slate-400 ring-slate-600 hover:text-slate-300'
          }`}
        >
          All
        </button>
        {[1, 2, 3, 4, 5].map(d => {
          const colours = DOMAIN_COLOURS[d];
          const isActive = selectedDomain === d;
          return (
            <button
              key={d}
              onClick={() => {
                setSelectedDomain(isActive ? undefined : d);
                setTimeout(pickRandomQuestion, 0);
              }}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-all ${
                isActive
                  ? `${colours.bg} ${colours.text} ${colours.ring}`
                  : 'bg-slate-700/50 text-slate-400 ring-slate-600 hover:text-slate-300'
              }`}
            >
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${isActive ? colours.fill : 'bg-slate-500'}`} />
              D{d}
            </button>
          );
        })}
      </div>

      {/* Question */}
      <QuestionCard
        question={currentQuestion}
        questionNumber={questionsStudied + (isRevealed ? 0 : 1)}
        totalQuestions={filteredQuestions.length}
        mode="study"
        selectedAnswer={selectedAnswer}
        isRevealed={isRevealed}
        onSelectAnswer={handleAnswer}
      />

      {/* Next button */}
      {isRevealed && (
        <div className="mt-6 text-center">
          <button
            onClick={handleNext}
            className="rounded-lg bg-indigo-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-500 active:scale-[0.98]"
          >
            Next Question →
          </button>
        </div>
      )}
    </div>
  );
}