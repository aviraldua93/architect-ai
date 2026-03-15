/**
 * Tier 1 — CLI ↔ Content Integration Contract
 *
 * THE CRITICAL ONE. This test verifies that every question in the content
 * layer can be rendered by the CLI without displaying "undefined".
 *
 * This is exactly the bug that embarrassed us in front of the Owner:
 * a question had a domain or taskStatement that the CLI didn't know about,
 * so it rendered "undefined" on screen during the live demo.
 *
 * Contract checks:
 * - Every domain number in the question bank maps to a name in the CLI
 * - Every taskStatement maps to a name in the CLI
 * - Every difficulty value is handled by the CLI's difficultyBadge()
 * - No question field renders as "undefined" in the CLI
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SRC = join(__dirname, '..', '..', 'src');
const QUESTIONS_DIR = join(SRC, 'content', 'questions');

// ── Load the authoritative domain/task mappings ──────────────────
// These are the canonical lookups used by the CLI.
// We import from src/types/index.ts (single source of truth).

const typesModule = await import(join(SRC, 'types', 'index.ts'));
const DOMAIN_NAMES: Record<number, string> = typesModule.DOMAIN_NAMES;
const TASK_STATEMENT_NAMES: Record<string, string> = typesModule.TASK_STATEMENT_NAMES;

// Also read the quiz.ts source to verify it contains the same domain/task
// mappings as types/ — these must stay in sync.
const quizSource = readFileSync(join(SRC, 'cli', 'quiz.ts'), 'utf-8');

// ── Load all questions from the content layer ────────────────────

interface Question {
  id: string;
  domain: number;
  taskStatement: string;
  difficulty: string;
  scenario: string;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correctAnswer: string;
  explanation: string;
  [key: string]: unknown;
}

const jsonFiles = readdirSync(QUESTIONS_DIR).filter(f => f.endsWith('.json'));
const allQuestions: Question[] = [];
for (const file of jsonFiles) {
  const raw = JSON.parse(readFileSync(join(QUESTIONS_DIR, file), 'utf-8'));
  const questions: Question[] = Array.isArray(raw) ? raw : [raw];
  allQuestions.push(...questions);
}

// Difficulty values the CLI can display (from quiz.ts difficultyBadge switch)
const HANDLED_DIFFICULTIES = new Set([
  'easy', 'medium', 'hard',           // legacy
  'foundation', 'intermediate', 'advanced',  // canonical
]);

// ── Tests ────────────────────────────────────────────────────────

describe('CLI ↔ Content Integration Contract', () => {

  it('loaded questions from content directory', () => {
    expect(allQuestions.length).toBeGreaterThan(0);
  });

  // ── types/ and quiz.ts mappings must be in sync ──────────────
  describe('Domain mapping consistency (types/ vs quiz.ts)', () => {
    it('quiz.ts imports DOMAIN_NAMES from shared types', () => {
      expect(quizSource).toContain("from '../types'");
      expect(quizSource).toContain('DOMAIN_NAMES');
    });

    it('quiz.ts imports TASK_STATEMENT_NAMES from shared types', () => {
      expect(quizSource).toContain("from '../types'");
      expect(quizSource).toContain('TASK_STATEMENT_NAMES');
    });

    it('quiz.ts does NOT define its own DOMAIN_NAMES const', () => {
      expect(quizSource).not.toContain('const DOMAIN_NAMES');
    });

    it('quiz.ts does NOT define its own TASK_STATEMENT_NAMES const', () => {
      expect(quizSource).not.toContain('const TASK_STATEMENT_NAMES');
    });
  });

  // ── Every question's domain maps to a name ───────────────────
  describe('Every domain number maps to a CLI domain name', () => {
    const uniqueDomains = [...new Set(allQuestions.map(q => q.domain))];

    it.each(uniqueDomains)('domain %i has a name in DOMAIN_NAMES', (domain) => {
      expect(
        DOMAIN_NAMES[domain],
        `Domain ${domain} has no entry in DOMAIN_NAMES — CLI would show "undefined"`,
      ).toBeDefined();
      expect(DOMAIN_NAMES[domain].length).toBeGreaterThan(0);
    });
  });

  // ── Every question's taskStatement maps to a name ────────────
  describe('Every taskStatement maps to a CLI task name', () => {
    const uniqueStatements = [...new Set(allQuestions.map(q => q.taskStatement))];

    it.each(uniqueStatements)(
      'taskStatement "%s" has a name in TASK_STATEMENT_NAMES',
      (ts) => {
        expect(
          TASK_STATEMENT_NAMES[ts],
          `Task statement "${ts}" has no entry in TASK_STATEMENT_NAMES — CLI would show "undefined"`,
        ).toBeDefined();
        expect(TASK_STATEMENT_NAMES[ts].length).toBeGreaterThan(0);
      },
    );
  });

  // ── Every difficulty value is handled ─────────────────────────
  describe('Every difficulty value is handled by the CLI', () => {
    const uniqueDifficulties = [...new Set(allQuestions.map(q => q.difficulty))];

    it.each(uniqueDifficulties)(
      'difficulty "%s" is handled by difficultyBadge()',
      (difficulty) => {
        expect(
          HANDLED_DIFFICULTIES.has(difficulty),
          `Difficulty "${difficulty}" is not handled by the CLI — would show raw string`,
        ).toBe(true);
      },
    );
  });

  // ── No "undefined" in question display fields ────────────────
  describe('No question field would render as "undefined"', () => {
    for (const q of allQuestions) {
      describe(`Question ${q.id}`, () => {
        it('domain resolves to a name (not undefined)', () => {
          const label = DOMAIN_NAMES[q.domain];
          expect(label, `domain ${q.domain} → undefined`).toBeDefined();
        });

        it('taskStatement resolves to a name (not undefined)', () => {
          const label = TASK_STATEMENT_NAMES[q.taskStatement];
          expect(label, `taskStatement "${q.taskStatement}" → undefined`).toBeDefined();
        });

        it('scenario is defined and non-empty', () => {
          expect(q.scenario).toBeDefined();
          expect(typeof q.scenario).toBe('string');
          expect(q.scenario.length).toBeGreaterThan(0);
        });

        it('question text is defined and non-empty', () => {
          expect(q.question).toBeDefined();
          expect(typeof q.question).toBe('string');
          expect(q.question.length).toBeGreaterThan(0);
        });

        it('all four options are defined strings', () => {
          for (const key of ['A', 'B', 'C', 'D'] as const) {
            const val = q.options[key];
            expect(val, `options.${key} is undefined`).toBeDefined();
            expect(typeof val, `options.${key} is not a string`).toBe('string');
            expect(val.length, `options.${key} is empty`).toBeGreaterThan(0);
          }
        });

        it('explanation is defined and non-empty', () => {
          expect(q.explanation).toBeDefined();
          expect(typeof q.explanation).toBe('string');
          expect(q.explanation.length).toBeGreaterThan(0);
        });
      });
    }
  });
});
