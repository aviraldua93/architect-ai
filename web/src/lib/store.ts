/**
 * Zustand store for quiz state management.
 */

import { create } from 'zustand';
import type { Question, QuizConfig, SessionRecord, QuizResult } from './types';
import { shuffle, filterQuestions, generateReport } from './scoring';
import { getAllQuestions } from './questions';

type QuizPhase = 'config' | 'active' | 'results';

interface QuizState {
  phase: QuizPhase;
  config: QuizConfig;
  questions: Question[];
  currentIndex: number;
  answers: Map<string, 'A' | 'B' | 'C' | 'D'>;
  flagged: Set<string>;
  startTime: number | null;
  result: QuizResult | null;

  setConfig: (config: Partial<QuizConfig>) => void;
  startQuiz: () => void;
  answerQuestion: (questionId: string, answer: 'A' | 'B' | 'C' | 'D') => void;
  toggleFlag: (questionId: string) => void;
  goToQuestion: (index: number) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  finishQuiz: () => void;
  reset: () => void;
}

const defaultConfig: QuizConfig = {
  questionCount: 10,
  mode: 'practice',
};

export const useQuizStore = create<QuizState>((set, get) => ({
  phase: 'config',
  config: defaultConfig,
  questions: [],
  currentIndex: 0,
  answers: new Map(),
  flagged: new Set(),
  startTime: null,
  result: null,

  setConfig: (partial) =>
    set(state => ({ config: { ...state.config, ...partial } })),

  startQuiz: () => {
    const { config } = get();
    const all = getAllQuestions();
    let filtered = filterQuestions(all, config.domain, config.difficulty);
    filtered = shuffle(filtered);
    const count = config.questionCount === 0
      ? filtered.length
      : Math.min(config.questionCount, filtered.length);
    const questions = filtered.slice(0, count);
    set({
      phase: 'active', questions, currentIndex: 0,
      answers: new Map(), flagged: new Set(),
      startTime: Date.now(), result: null,
    });
  },

  answerQuestion: (questionId, answer) =>
    set(state => {
      const newAnswers = new Map(state.answers);
      newAnswers.set(questionId, answer);
      return { answers: newAnswers };
    }),

  toggleFlag: (questionId) =>
    set(state => {
      const newFlagged = new Set(state.flagged);
      if (newFlagged.has(questionId)) newFlagged.delete(questionId);
      else newFlagged.add(questionId);
      return { flagged: newFlagged };
    }),

  goToQuestion: (index) => set({ currentIndex: index }),

  nextQuestion: () =>
    set(state => ({ currentIndex: Math.min(state.currentIndex + 1, state.questions.length - 1) })),

  prevQuestion: () =>
    set(state => ({ currentIndex: Math.max(state.currentIndex - 1, 0) })),

  finishQuiz: () => {
    const { questions, answers, startTime, config } = get();
    const timeElapsed = startTime ? Math.round((Date.now() - startTime) / 1000) : undefined;
    const result = generateReport(questions, answers, timeElapsed);
    saveSession({
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      mode: config.mode,
      score: result.correct,
      total: result.total,
      percentage: result.percentage,
      domains: Object.fromEntries(
        result.domainBreakdown.map(d => [d.domain, { correct: d.correct, total: d.total }]),
      ),
      timeElapsed,
    });
    set({ phase: 'results', result });
  },

  reset: () =>
    set({
      phase: 'config', config: defaultConfig, questions: [],
      currentIndex: 0, answers: new Map(), flagged: new Set(),
      startTime: null, result: null,
    }),
}));

// ── Local Storage Persistence ─────────────────────────────────

const SESSIONS_KEY = 'architectai-sessions';
const PROGRESS_KEY = 'architectai-progress';

export function saveSession(session: SessionRecord): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    const sessions: SessionRecord[] = raw ? JSON.parse(raw) : [];
    sessions.unshift(session);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.slice(0, 50)));

    const progressRaw = localStorage.getItem(PROGRESS_KEY);
    const progress = progressRaw ? JSON.parse(progressRaw) : {
      totalAnswered: 0, totalCorrect: 0, totalTime: 0,
      domainStats: {} as Record<number, { correct: number; total: number }>,
    };
    progress.totalAnswered += session.total;
    progress.totalCorrect += session.score;
    progress.totalTime += session.timeElapsed ?? 0;
    for (const [domain, stats] of Object.entries(session.domains)) {
      const d = Number(domain);
      if (!progress.domainStats[d]) progress.domainStats[d] = { correct: 0, total: 0 };
      progress.domainStats[d].correct += stats.correct;
      progress.domainStats[d].total += stats.total;
    }
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch { /* localStorage may not be available */ }
}

export function getSessions(): SessionRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function getProgress(): {
  totalAnswered: number;
  totalCorrect: number;
  totalTime: number;
  domainStats: Record<number, { correct: number; total: number }>;
} {
  if (typeof window === 'undefined') {
    return { totalAnswered: 0, totalCorrect: 0, totalTime: 0, domainStats: {} };
  }
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? JSON.parse(raw) : {
      totalAnswered: 0, totalCorrect: 0, totalTime: 0, domainStats: {},
    };
  } catch {
    return { totalAnswered: 0, totalCorrect: 0, totalTime: 0, domainStats: {} };
  }
}