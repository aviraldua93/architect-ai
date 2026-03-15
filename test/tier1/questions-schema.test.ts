/**
 * Tier 1 — Question Bank Schema Validation
 *
 * Validates every question in every JSON file under src/content/questions/.
 * Catches: missing fields, invalid enums, duplicate IDs, empty strings.
 *
 * This test would have caught the broken demo where questions with missing
 * fields rendered as "undefined" in the CLI.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const QUESTIONS_DIR = join(__dirname, '..', '..', 'src', 'content', 'questions');

const VALID_ANSWERS = ['A', 'B', 'C', 'D'] as const;
const VALID_DIFFICULTIES = ['foundation', 'intermediate', 'advanced'] as const;
const VALID_DOMAINS = [1, 2, 3, 4, 5] as const;
const TASK_PATTERN = /^\d+\.\d+$/;

const REQUIRED_FIELDS = [
  'id', 'domain', 'taskStatement', 'difficulty',
  'scenario', 'question', 'options', 'correctAnswer', 'explanation',
] as const;

// ── Load all question JSON files ─────────────────────────────────

interface RawQuestion {
  [key: string]: unknown;
  id?: string;
  domain?: number;
  taskStatement?: string;
  difficulty?: string;
  scenario?: string;
  question?: string;
  options?: { A?: string; B?: string; C?: string; D?: string };
  correctAnswer?: string;
  explanation?: string;
}

const jsonFiles = readdirSync(QUESTIONS_DIR).filter(f => f.endsWith('.json'));
const allQuestions: { file: string; question: RawQuestion }[] = [];

for (const file of jsonFiles) {
  const raw = JSON.parse(readFileSync(join(QUESTIONS_DIR, file), 'utf-8'));
  const questions: RawQuestion[] = Array.isArray(raw) ? raw : [raw];
  for (const q of questions) {
    allQuestions.push({ file, question: q });
  }
}

// ── Tests ────────────────────────────────────────────────────────

describe('Question Bank Schema Validation', () => {
  it('found at least one question file', () => {
    expect(jsonFiles.length).toBeGreaterThan(0);
  });

  it('loaded at least one question', () => {
    expect(allQuestions.length).toBeGreaterThan(0);
  });

  describe.each(jsonFiles)('File: %s', (file) => {
    const fileQuestions = allQuestions
      .filter(entry => entry.file === file)
      .map(entry => entry.question);

    it('contains at least one question', () => {
      expect(fileQuestions.length).toBeGreaterThan(0);
    });

    describe.each(
      fileQuestions.map((q, i) => [`${q.id ?? `MISSING_ID_${i}`}`, q] as const),
    )('Question %s', (_label, q) => {

      it('has all required fields', () => {
        for (const field of REQUIRED_FIELDS) {
          expect(q, `missing field: ${field}`).toHaveProperty(field);
        }
      });

      it('correctAnswer is one of A/B/C/D', () => {
        expect(VALID_ANSWERS).toContain(q.correctAnswer);
      });

      it('difficulty is foundation | intermediate | advanced', () => {
        expect(VALID_DIFFICULTIES).toContain(q.difficulty);
      });

      it('domain is a valid number (1–5)', () => {
        expect(VALID_DOMAINS).toContain(q.domain);
      });

      it('taskStatement matches pattern X.Y', () => {
        expect(q.taskStatement).toMatch(TASK_PATTERN);
      });

      it('options A, B, C, D are all present and non-empty strings', () => {
        expect(q.options).toBeDefined();
        for (const key of VALID_ANSWERS) {
          const val = q.options?.[key];
          expect(val, `options.${key} missing or empty`).toBeTruthy();
          expect(typeof val, `options.${key} is not a string`).toBe('string');
          expect((val as string).trim().length, `options.${key} is blank`).toBeGreaterThan(0);
        }
      });

      it('has no empty string values in required fields', () => {
        for (const field of REQUIRED_FIELDS) {
          const val = q[field];
          if (typeof val === 'string') {
            expect(
              val.trim().length,
              `"${field}" must not be an empty string`,
            ).toBeGreaterThan(0);
          }
        }
      });
    });
  });

  it('all question IDs are globally unique', () => {
    const ids = allQuestions.map(e => e.question.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes, `duplicate IDs found: ${dupes.join(', ')}`).toHaveLength(0);
  });
});
