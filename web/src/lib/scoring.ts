/**
 * Scoring engine — ported from CLI quiz.ts for web compatibility.
 *
 * Pure functions, no Node.js dependencies, no terminal formatting.
 * Works in browser, server components, and edge runtime.
 */

import type { Question, DomainScore, QuizResult } from './types';
import { DOMAIN_NAMES, TASK_STATEMENT_NAMES } from './types';

/** Calculate quiz score with domain-level breakdown. */
export function calculateScore(
  questions: Question[],
  answers: Map<string, 'A' | 'B' | 'C' | 'D'>,
): { total: number; correct: number; percentage: number; byDomain: Map<number, DomainScore> } {
  const byDomain = new Map<number, DomainScore>();
  let correct = 0;
  const total = questions.length;

  for (const q of questions) {
    const userAnswer = answers.get(q.id);
    const isCorrect = userAnswer === q.correctAnswer;
    if (isCorrect) correct++;

    const domain = q.domain;
    const entry = byDomain.get(domain) ?? { correct: 0, total: 0, percentage: 0 };
    entry.total++;
    if (isCorrect) entry.correct++;
    entry.percentage = entry.total > 0 ? Math.round((entry.correct / entry.total) * 100) : 0;
    byDomain.set(domain, entry);
  }

  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
  return { total, correct, percentage, byDomain };
}

/** 72% = 720/1000 is the passing threshold. */
export function isPassingScore(percentage: number): boolean {
  return percentage >= 72;
}

/** Grade based on percentage. */
export function getGrade(percentage: number): 'distinction' | 'pass' | 'fail' {
  if (percentage >= 90) return 'distinction';
  if (percentage >= 72) return 'pass';
  return 'fail';
}

/** Generate a full quiz report with missed questions and recommendations. */
export function generateReport(
  questions: Question[],
  answers: Map<string, 'A' | 'B' | 'C' | 'D'>,
  timeElapsed?: number,
): QuizResult {
  const { total, correct, percentage, byDomain } = calculateScore(questions, answers);

  const missedQuestions = questions.filter(q => {
    const userAnswer = answers.get(q.id);
    return userAnswer !== q.correctAnswer;
  });

  const domainBreakdown = [...byDomain.entries()]
    .sort(([a], [b]) => a - b)
    .map(([domain, stats]) => ({
      domain,
      name: DOMAIN_NAMES[domain] ?? 'Unknown',
      correct: stats.correct,
      total: stats.total,
      percentage: stats.percentage,
    }));

  const taskScores = new Map<string, { correct: number; total: number }>();
  for (const q of questions) {
    const ts = q.taskStatement;
    const entry = taskScores.get(ts) ?? { correct: 0, total: 0 };
    entry.total++;
    if (answers.get(q.id) === q.correctAnswer) entry.correct++;
    taskScores.set(ts, entry);
  }

  const recommendations: string[] = [];

  const weakDomains = domainBreakdown.filter(d => d.percentage < 60);
  for (const d of weakDomains) {
    recommendations.push(`Focus on Domain ${d.domain}: ${d.name} — you scored ${d.percentage}%`);
  }

  const weakTasks = [...taskScores.entries()]
    .filter(([, s]) => s.total > 0 && (s.correct / s.total) < 0.6)
    .sort(([a], [b]) => a.localeCompare(b));

  for (const [ts, stats] of weakTasks) {
    const pct = Math.round((stats.correct / stats.total) * 100);
    const name = TASK_STATEMENT_NAMES[ts] ?? 'Unknown';
    recommendations.push(`Review Task ${ts}: ${name} (${pct}% — ${stats.correct}/${stats.total})`);
  }

  if (percentage < 50) {
    recommendations.push('Consider reviewing all domain fundamentals before retaking');
  } else if (percentage < 72) {
    recommendations.push("You're close to passing! Focus on your weakest domains");
  } else if (percentage < 90) {
    recommendations.push('Great work! Polish your weak areas to aim for distinction');
  }

  if (missedQuestions.length > 0) {
    const conceptsToReview = new Set<string>();
    for (const q of missedQuestions) {
      if (q.conceptsTested) {
        for (const concept of q.conceptsTested) conceptsToReview.add(concept);
      }
    }
    if (conceptsToReview.size > 0) {
      recommendations.push(`Key concepts to review: ${[...conceptsToReview].slice(0, 5).join(', ')}`);
    }
  }

  return {
    total, correct, percentage, byDomain,
    grade: getGrade(percentage),
    passed: isPassingScore(percentage),
    timeElapsed, missedQuestions, domainBreakdown, recommendations,
  };
}

/** Fisher-Yates shuffle (browser-compatible). */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Filter questions by domain and/or difficulty. */
export function filterQuestions(
  questions: Question[],
  domain?: number,
  difficulty?: string,
): Question[] {
  let filtered = [...questions];
  if (domain) filtered = filtered.filter(q => q.domain === domain);
  if (difficulty && difficulty !== 'all') filtered = filtered.filter(q => q.difficulty === difficulty);
  return filtered;
}

/** Format seconds into MM:SS display string. */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}