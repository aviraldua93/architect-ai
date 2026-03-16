/**
 * Web-compatible types for ArchitectAI.
 * Mirrors the shared types from src/types/index.ts without Node.js dependencies.
 */

// ── Difficulty ────────────────────────────────────────────────
export type Difficulty = 'foundation' | 'intermediate' | 'advanced';
export type LegacyDifficulty = 'easy' | 'medium' | 'hard';
export type AnyDifficulty = Difficulty | LegacyDifficulty;

const DIFFICULTY_MAP: Record<AnyDifficulty, Difficulty> = {
  foundation: 'foundation',
  intermediate: 'intermediate',
  advanced: 'advanced',
  easy: 'foundation',
  medium: 'intermediate',
  hard: 'advanced',
};

export function normalizeDifficulty(d: string): Difficulty {
  return DIFFICULTY_MAP[d as AnyDifficulty] ?? 'intermediate';
}

// ── Question ──────────────────────────────────────────────────
export interface Question {
  id: string;
  domain: number;
  taskStatement: string;
  difficulty: AnyDifficulty;
  scenario: string;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  examTrap?: string;
  conceptsTested?: string[];
  tags?: string[];
}

// ── Domain Metadata ───────────────────────────────────────────
export const DOMAIN_NAMES: Record<number, string> = {
  1: 'Agentic Architecture',
  2: 'Tool Design & MCP',
  3: 'CLI & Commands',
  4: 'Prompt Engineering',
  5: 'Context Management',
};

export const DOMAIN_COLORS: Record<number, string> = {
  1: 'bg-violet-500',
  2: 'bg-blue-500',
  3: 'bg-emerald-500',
  4: 'bg-amber-500',
  5: 'bg-rose-500',
};

/** Structured domain colour tokens used by DomainBadge and other components. */
export const DOMAIN_COLOURS: Record<number, { bg: string; text: string; ring: string; fill: string }> = {
  1: { bg: 'bg-violet-500/20', text: 'text-violet-400', ring: 'ring-violet-500/30', fill: 'bg-violet-500' },
  2: { bg: 'bg-blue-500/20', text: 'text-blue-400', ring: 'ring-blue-500/30', fill: 'bg-blue-500' },
  3: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', ring: 'ring-emerald-500/30', fill: 'bg-emerald-500' },
  4: { bg: 'bg-amber-500/20', text: 'text-amber-400', ring: 'ring-amber-500/30', fill: 'bg-amber-500' },
  5: { bg: 'bg-rose-500/20', text: 'text-rose-400', ring: 'ring-rose-500/30', fill: 'bg-rose-500' },
};

export const DOMAIN_TEXT_COLORS: Record<number, string> = {
  1: 'text-violet-400',
  2: 'text-blue-400',
  3: 'text-emerald-400',
  4: 'text-amber-400',
  5: 'text-rose-400',
};

export const TASK_STATEMENT_NAMES: Record<string, string> = {
  '1.1': 'Agentic Loops',
  '1.2': 'Multi-Agent Orchestration',
  '1.3': 'Subagent Invocation',
  '1.4': 'Workflow Enforcement',
  '1.5': 'Agent SDK Hooks',
  '1.6': 'Task Decomposition',
  '1.7': 'Session State',
  '2.1': 'Tool Descriptions as Selection Mechanism',
  '2.2': 'Structured Error Responses',
  '2.3': 'Tool Choice Modes',
  '2.4': 'MCP Resources, Tools & Prompts',
  '2.5': 'Built-in vs Custom Tools',
  '3.1': 'CLAUDE.md Hierarchy',
  '3.2': 'Slash Commands & Skills',
  '3.3': 'Path Rules with Glob Patterns',
  '3.4': 'Plan Mode Workflow',
  '3.5': 'Iterative Refinement',
  '3.6': 'CI/CD Integration',
  '4.1': 'Explicit Criteria & Rubrics',
  '4.2': 'Few-Shot Examples',
  '4.3': 'Tool Use Schemas & Validation',
  '4.4': 'Validation-Retry Pattern',
  '4.5': 'Batch API',
  '4.6': 'Multi-Instance Review & Aggregation',
  '5.1': 'Context Preservation & Summarisation',
  '5.2': 'Escalation Patterns & Confidence',
  '5.3': 'Error Propagation in Multi-Agent Systems',
  '5.4': 'Codebase Exploration Strategies',
  '5.5': 'Human-in-the-Loop & Approval Gates',
  '5.6': 'Provenance & Audit Trails',
};

export const DOMAIN_WEIGHTS: Record<number, number> = {
  1: 28, 2: 24, 3: 16, 4: 18, 5: 14,
};

// ── UI Component Types (Zara / Suki) ──────────────────────────
/** Alias for Difficulty — used by DifficultyBadge, DomainFilter, etc. */
export type DifficultyLevel = AnyDifficulty;

/** Quiz mode: practice = immediate feedback, study = show explanation, exam = no feedback until end. */
export type QuizMode = 'practice' | 'study' | 'exam';

/** Structured answer option used by AnswerOption component. */
export interface QuestionOption {
  id: 'A' | 'B' | 'C' | 'D';
  text: string;
}

// ── Quiz / Session Types ──────────────────────────────────────
export interface QuizConfig {
  domain?: number;
  questionCount: number;
  difficulty?: Difficulty;
  mode: 'practice' | 'study' | 'exam';
}

export interface AnswerRecord {
  questionId: string;
  userAnswer: 'A' | 'B' | 'C' | 'D';
  correct: boolean;
  timeSpent?: number;
}

export interface DomainScore {
  correct: number;
  total: number;
  percentage: number;
}

export interface QuizResult {
  total: number;
  correct: number;
  percentage: number;
  byDomain: Map<number, DomainScore>;
  grade: 'distinction' | 'pass' | 'fail';
  passed: boolean;
  timeElapsed?: number;
  missedQuestions: Question[];
  domainBreakdown: { domain: number; name: string; correct: number; total: number; percentage: number }[];
  recommendations: string[];
}

export interface SessionRecord {
  id: string;
  date: string;
  mode: 'practice' | 'study' | 'exam';
  score: number;
  total: number;
  percentage: number;
  domains: Record<number, { correct: number; total: number }>;
  timeElapsed?: number;
}