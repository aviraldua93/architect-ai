/**
 * Scenario loader — loads and validates JSON scenario files.
 *
 * Scenarios are multi-question practice sets tied to realistic production
 * situations. Each scenario contains 5 questions using the same schema as
 * the question bank, plus a narrative description and expert walkthrough.
 *
 * This is the ONLY module that reads scenario JSON from disk.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { z } from 'zod';
import type { Question, Difficulty } from '../../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------------------------------------------------------------------------
// Schema — scenario questions use a relaxed ID pattern (e.g. "cs-q01")
// ---------------------------------------------------------------------------

const ScenarioQuestionSchema = z.object({
  id: z.string().min(1),
  domain: z.number().int().min(1).max(5),
  taskStatement: z.string().regex(/^\d+\.\d+$/, 'Task statement must follow pattern: X.Y'),
  difficulty: z.enum(['foundation', 'intermediate', 'advanced']),
  scenario: z.string().min(50, 'Scenario must be at least 50 characters'),
  question: z.string().min(10, 'Question must be at least 10 characters'),
  options: z.object({
    A: z.string().min(5),
    B: z.string().min(5),
    C: z.string().min(5),
    D: z.string().min(5),
  }),
  correctAnswer: z.enum(['A', 'B', 'C', 'D']),
  explanation: z.string().min(30, 'Explanation must be at least 30 characters'),
  examTrap: z.string().min(10, 'Exam trap must be at least 10 characters'),
  conceptsTested: z.array(z.string()).min(1, 'Must test at least one concept'),
});

const ScenarioSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(5),
  description: z.string().min(500, 'Description must be at least 500 characters'),
  domains: z.array(z.number().int().min(1).max(5)).min(1),
  questions: z.array(ScenarioQuestionSchema).length(5, 'Each scenario must have exactly 5 questions'),
  walkthrough: z.string().min(100, 'Walkthrough must be at least 100 characters'),
  relatedFiles: z.array(z.string()).min(1),
});

export type Scenario = z.infer<typeof ScenarioSchema>;

// ---------------------------------------------------------------------------
// File registry
// ---------------------------------------------------------------------------

const SCENARIO_FILES = [
  'customer-support-agent.json',
  'code-generation.json',
  'multi-agent-research.json',
  'developer-productivity.json',
  'ci-cd-pipeline.json',
  'structured-extraction.json',
] as const;

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

let cachedScenarios: Scenario[] | null = null;

/** Load all scenarios from known JSON files, with Zod validation. */
export function loadScenarios(): Scenario[] {
  if (cachedScenarios) return cachedScenarios;

  const allScenarios: Scenario[] = [];

  for (const file of SCENARIO_FILES) {
    const filePath = join(__dirname, file);
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(filePath, 'utf-8'));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`[scenario-loader] Failed to parse JSON file "${file}": ${message}`);
    }
    const parsed = ScenarioSchema.parse(raw);
    allScenarios.push(parsed);
  }

  cachedScenarios = allScenarios;
  return allScenarios;
}

/** Clear the scenario cache (useful for testing). */
export function clearScenarioCache(): void {
  cachedScenarios = null;
}

/** Get a single scenario by ID. */
export function getScenario(id: string): Scenario | undefined {
  return loadScenarios().find((s) => s.id === id);
}

/** Get all questions across all scenarios. */
export function getScenarioQuestions(): Question[] {
  return loadScenarios().flatMap((s) =>
    s.questions.map((q) => q as unknown as Question),
  );
}
