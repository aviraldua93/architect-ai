/**
 * Question bank loader — loads and validates JSON question files.
 *
 * This is the ONLY module that reads question JSON from disk.
 * All other modules (quiz.ts, tests, etc.) import from here.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { QuestionBankSchema } from './schema';
import type { Question, Difficulty } from '../../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Known domain question files — add new domains here. */
const DOMAIN_FILES = [
  'domain-1-agentic-architecture.json',
] as const;

let cachedQuestions: Question[] | null = null;

/** Load all questions from known domain files, with Zod validation. */
function loadAllQuestions(): Question[] {
  if (cachedQuestions) return cachedQuestions;

  const allQuestions: Question[] = [];

  for (const file of DOMAIN_FILES) {
    const filePath = join(__dirname, file);
    const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
    const parsed = QuestionBankSchema.parse(raw);
    allQuestions.push(...parsed);
  }

  cachedQuestions = allQuestions;
  return allQuestions;
}

/** Clear the question cache (useful for testing). */
export function clearQuestionCache(): void {
  cachedQuestions = null;
}

/**
 * Get questions, optionally filtered by domain, task statement, or difficulty.
 */
export function getQuestions(
  domain?: number,
  taskStatement?: string,
  difficulty?: string,
): Question[] {
  let questions = loadAllQuestions();

  if (domain !== undefined) {
    questions = questions.filter((q) => q.domain === domain);
  }

  if (taskStatement !== undefined) {
    questions = questions.filter((q) => q.taskStatement === taskStatement);
  }

  if (difficulty !== undefined) {
    questions = questions.filter((q) => q.difficulty === (difficulty as Difficulty));
  }

  return questions;
}

export type { Question, Difficulty };