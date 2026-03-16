/**
 * Web-compatible question loader.
 *
 * Imports domain JSON files directly — Next.js handles JSON imports at build time.
 * No fs, no Node.js APIs.
 */

import type { Question, Difficulty } from './types';
import { normalizeDifficulty } from './types';

import domain1 from '../../../src/content/questions/domain-1-agentic-architecture.json';
import domain2 from '../../../src/content/questions/domain-2-tool-design.json';
import domain3 from '../../../src/content/questions/domain-3-claude-code.json';
import domain4 from '../../../src/content/questions/domain-4-prompt-engineering.json';
import domain5 from '../../../src/content/questions/domain-5-context.json';

const ALL_QUESTIONS: Question[] = [
  ...domain1, ...domain2, ...domain3, ...domain4, ...domain5,
] as Question[];

/** Get all questions. */
export function getAllQuestions(): Question[] {
  return ALL_QUESTIONS;
}

/** Get questions filtered by domain, difficulty, or both. */
export function getQuestions(domain?: number, difficulty?: Difficulty | 'all'): Question[] {
  let questions = [...ALL_QUESTIONS];
  if (domain !== undefined && domain > 0) {
    questions = questions.filter(q => q.domain === domain);
  }
  if (difficulty && difficulty !== 'all') {
    questions = questions.filter(q => normalizeDifficulty(q.difficulty) === difficulty);
  }
  return questions;
}

/** Get unique domains present in the question bank. */
export function getAvailableDomains(): number[] {
  const domains = new Set(ALL_QUESTIONS.map(q => q.domain));
  return [...domains].sort();
}

/** Count questions per domain. */
export function getQuestionCountByDomain(): Map<number, number> {
  const counts = new Map<number, number>();
  for (const q of ALL_QUESTIONS) {
    counts.set(q.domain, (counts.get(q.domain) ?? 0) + 1);
  }
  return counts;
}