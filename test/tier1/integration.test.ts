/**
 * Tier 1 — Integration Smoke Test
 *
 * Validates that every question loaded through the content pipeline
 * conforms to the shared Question contract in src/types/index.ts.
 *
 * This catches the exact class of bug that broke the live demo:
 * questions with fields the CLI didn't expect.
 */

import { describe, it, expect } from 'vitest';
import { getQuestions, clearQuestionCache } from '../../src/content/questions';
import {
  DOMAIN_NAMES,
  TASK_STATEMENT_NAMES,
  DIFFICULTY_MAP,
  normalizeDifficulty,
} from '../../src/types';
import type { Question, AnyDifficulty } from '../../src/types';

// Force a fresh load
clearQuestionCache();
const questions: Question[] = getQuestions();

describe('Integration Smoke Test', () => {
  it('loads at least one question', () => {
    expect(questions.length).toBeGreaterThan(0);
  });

  describe('Every question matches the shared contract', () => {
    for (const q of questions) {
      describe(q.id, () => {
        it('has a valid id pattern d{N}-q{NN}', () => {
          expect(q.id).toMatch(/^d\d+-q\d+$/);
        });

        it('domain is 1-5', () => {
          expect(q.domain).toBeGreaterThanOrEqual(1);
          expect(q.domain).toBeLessThanOrEqual(5);
        });

        it('domain maps to a name', () => {
          expect(DOMAIN_NAMES[q.domain]).toBeDefined();
        });

        it('taskStatement maps to a name', () => {
          expect(TASK_STATEMENT_NAMES[q.taskStatement]).toBeDefined();
        });

        it('difficulty is a recognized value', () => {
          expect(DIFFICULTY_MAP[q.difficulty as AnyDifficulty]).toBeDefined();
        });

        it('normalizeDifficulty returns a canonical value', () => {
          const norm = normalizeDifficulty(q.difficulty);
          expect(['foundation', 'intermediate', 'advanced']).toContain(norm);
        });

        it('has all four options (A-D)', () => {
          for (const key of ['A', 'B', 'C', 'D'] as const) {
            expect(q.options[key]).toBeDefined();
            expect(q.options[key].length).toBeGreaterThan(0);
          }
        });

        it('correctAnswer is A-D', () => {
          expect(['A', 'B', 'C', 'D']).toContain(q.correctAnswer);
        });

        it('explanation is non-empty', () => {
          expect(q.explanation.length).toBeGreaterThan(0);
        });
      });
    }
  });
});