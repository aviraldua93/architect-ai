/**
 * @module types
 * @description SINGLE SOURCE OF TRUTH for all shared types in architect-ai.
 *
 * Every module that needs Question, Difficulty, QuizOptions, or domain metadata
 * imports from HERE. No one defines their own version.
 *
 * This file was created during the integration audit to resolve interface
 * mismatches between the CLI (Ravi), content (Maya), and agent (Liam) modules.
 *
 * @author Marcus Webb, Senior Integration Engineer — ArchitectAI
 */

// ---------------------------------------------------------------------------
// Re-export agent system types (Liam's module)
// ---------------------------------------------------------------------------

export type {
  AgenticLoopConfig,
  AgenticLoopResult,
  ContentBlock,
  CoordinatorResult,
  DecomposedTask,
  HookContext,
  HookPipeline,
  HookValidationResult,
  Message,
  MessageParam,
  PostToolUseHook,
  PreToolUseHook,
  SpawnConfig,
  SpawnResult,
  StopReason,
  SubagentContext,
  SubagentDefinition,
  SubagentResult,
  TextBlock,
  ToolDefinition,
  ToolImplementation,
  ToolRegistry,
  ToolResultBlockParam,
  ToolUseBlock,
} from "../agents/types";

// ---------------------------------------------------------------------------
// Difficulty levels
// ---------------------------------------------------------------------------

/** Canonical difficulty levels used in the question bank. */
export type Difficulty = "foundation" | "intermediate" | "advanced";

/** Legacy difficulty labels (used in early sample data). */
export type LegacyDifficulty = "easy" | "medium" | "hard";

/** Union of all difficulty values the system may encounter. */
export type AnyDifficulty = Difficulty | LegacyDifficulty;

/** Map legacy difficulty labels to canonical ones. */
export const DIFFICULTY_MAP: Record<AnyDifficulty, Difficulty> = {
  foundation: "foundation",
  intermediate: "intermediate",
  advanced: "advanced",
  easy: "foundation",
  medium: "intermediate",
  hard: "advanced",
};

/** Normalize any difficulty string to a canonical Difficulty value. */
export function normalizeDifficulty(d: string): Difficulty {
  return DIFFICULTY_MAP[d as AnyDifficulty] ?? "intermediate";
}

// ---------------------------------------------------------------------------
// Question interface — matches the actual JSON schema
// ---------------------------------------------------------------------------

/**
 * A single exam-prep question as stored in the JSON question bank.
 *
 * This interface matches what Maya's domain JSON files actually contain.
 * Fields like `domainName` and `taskStatementName` are NOT in the JSON —
 * they are resolved at runtime via DOMAIN_NAMES and TASK_STATEMENT_NAMES.
 */
export interface Question {
  /** Unique ID, pattern: d{domain}-q{number} (e.g. "d1-q01"). */
  id: string;
  /** Domain number (1–5). */
  domain: number;
  /** Task statement identifier (e.g. "1.1", "2.2"). */
  taskStatement: string;
  /** Difficulty level. */
  difficulty: AnyDifficulty;
  /** Real-world scenario that frames the question. */
  scenario: string;
  /** The actual question text. */
  question: string;
  /** Four answer options (A–D). */
  options: { A: string; B: string; C: string; D: string };
  /** Which option is correct. */
  correctAnswer: "A" | "B" | "C" | "D";
  /** Detailed explanation shown after answering. */
  explanation: string;
  /** Common exam trap / distractor explanation. */
  examTrap?: string;
  /** Concepts this question tests. */
  conceptsTested?: string[];
  /** Freeform tags for categorization. */
  tags?: string[];
}

// ---------------------------------------------------------------------------
// Quiz configuration
// ---------------------------------------------------------------------------

export interface QuizOptions {
  domain?: number;
  taskStatement?: string;
  count?: number;
}

// ---------------------------------------------------------------------------
// Domain metadata — the AUTHORITATIVE lookups
// ---------------------------------------------------------------------------

/** Human-readable domain names, keyed by domain number. */
export const DOMAIN_NAMES: Record<number, string> = {
  1: "Agentic Architecture",
  2: "Tool Design & MCP",
  3: "CLI & Commands",
  4: "Prompt Engineering",
  5: "Context Management",
};

/** Human-readable task statement names, keyed by "X.Y" identifier. */
export const TASK_STATEMENT_NAMES: Record<string, string> = {
  // Domain 1 — Agentic Architecture
  "1.1": "Agentic Loops",
  "1.2": "Multi-Agent Orchestration",
  "1.3": "Subagent Invocation",
  "1.4": "Workflow Enforcement",
  "1.5": "SDK Hooks",
  "1.6": "Task Decomposition",
  "1.7": "Session State",
  // Domain 2 — Tool Design & MCP
  "2.1": "Tool Descriptions",
  "2.2": "Tool Choice Modes",
  "2.3": "Error Handling Schemas",
  "2.4": "MCP Architecture",
  "2.5": "Built-in Tools",
  // Domain 3 — CLI & Commands
  "3.1": "CLAUDE.md Hierarchy",
  "3.2": "Custom Slash Commands",
  "3.3": "Path-Specific Rules",
  "3.4": "Plan Mode",
  "3.5": "Iterative Refinement",
  "3.6": "CI/CD Integration",
  // Domain 4 — Prompt Engineering
  "4.1": "Explicit Criteria",
  "4.2": "Few-Shot Examples",
  "4.3": "Structured Output",
  "4.4": "Validation-Retry",
  "4.5": "Batch API",
  "4.6": "Multi-Instance Review",
  // Domain 5 — Context Management
  "5.1": "Context Preservation",
  "5.2": "Escalation Patterns",
  "5.3": "Error Propagation",
  "5.4": "Codebase Exploration",
  "5.5": "Human Review",
  "5.6": "Provenance",
};

/** Domain weights for exam scoring (percentage of total). */
export const DOMAIN_WEIGHTS: Record<number, number> = {
  1: 28,
  2: 24,
  3: 16,
  4: 18,
  5: 14,
};
