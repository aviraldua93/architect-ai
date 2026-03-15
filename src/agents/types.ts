/**
 * @module types
 * @description Shared TypeScript types for the ArchitectAI agent system.
 *
 * Domain 1 — Agentic Architecture: Type Foundations
 *
 * Every type here maps to a concept tested in the Claude Certified Architect exam.
 * We re-export Anthropic SDK types where possible and layer our own domain types
 * on top for coordinator orchestration, hook pipelines, and subagent spawning.
 *
 * @author Liam Nakamura, Lead Architect — ArchitectAI
 */

import type Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// Re-exported Anthropic SDK types for convenience
// ---------------------------------------------------------------------------

/** A single message in the Claude Messages API conversation. */
export type Message = Anthropic.Messages.Message;

/** A content block returned by Claude (text or tool_use). */
export type ContentBlock = Anthropic.Messages.ContentBlock;

/** The tool_use content block Claude emits when it wants to call a tool. */
export type ToolUseBlock = Anthropic.Messages.ToolUseBlock;

/** The text content block Claude emits for natural language. */
export type TextBlock = Anthropic.Messages.TextBlock;

/** A tool definition passed to the Messages API. */
export type ToolDefinition = Anthropic.Messages.Tool;

/** The reason Claude stopped generating. */
export type StopReason = Message["stop_reason"];

/** A message param we send TO the API (user or assistant turn). */
export type MessageParam = Anthropic.Messages.MessageParam;

/** Content blocks we send (text, tool_result, etc.). */
export type ContentBlockParam = Anthropic.Messages.ContentBlockParam;

/** A tool_result block we send back after executing a tool. */
export type ToolResultBlockParam = Anthropic.Messages.ToolResultBlockParam;

// ---------------------------------------------------------------------------
// Tool execution types
// ---------------------------------------------------------------------------

/**
 * A concrete tool implementation that the agentic loop can execute.
 *
 * @exam Domain 1.1 — The loop must be able to execute arbitrary tools.
 *       The `execute` function receives the raw input object from Claude
 *       and returns a JSON-serialisable result (or throws).
 */
export interface ToolImplementation {
  /** Must match the `name` field in the corresponding ToolDefinition. */
  name: string;
  /** The JSON schema definition sent to the API. */
  definition: ToolDefinition;
  /**
   * Execute the tool with the given input.
   * The input shape is whatever Claude sends — validated against the schema.
   */
  execute: (input: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Map of tool name → implementation, used by the agentic loop to dispatch calls.
 */
export type ToolRegistry = Map<string, ToolImplementation>;

// ---------------------------------------------------------------------------
// Agentic loop types (Domain 1.1)
// ---------------------------------------------------------------------------

/**
 * Configuration for a single agentic loop run.
 *
 * @exam Domain 1.1 — Agentic Loops
 */
export interface AgenticLoopConfig {
  /** The Claude model to use (e.g. "claude-sonnet-4-20250514"). */
  model: string;
  /** System prompt providing the agent's persona and instructions. */
  systemPrompt: string;
  /** Tool definitions exposed to Claude. */
  tools: ToolDefinition[];
  /** Registry mapping tool names to their implementations. */
  toolRegistry: ToolRegistry;
  /**
   * Maximum iterations as a safety net — NOT the primary stop mechanism.
   *
   * CRITICAL EXAM CONCEPT: The loop's primary stop mechanism is
   * `stop_reason === "end_turn"`, which is MODEL-DRIVEN. This cap exists
   * solely to prevent runaway loops caused by bugs or adversarial prompts.
   * Setting this too low is an anti-pattern — it overrides the model's
   * judgement about when a task is complete.
   *
   * @default 50
   */
  maxIterations?: number;
  /** Optional hook pipeline applied to tool results before they're sent back. */
  hooks?: HookPipeline;
}

/**
 * The result of a completed agentic loop run.
 */
export interface AgenticLoopResult {
  /** The final assistant message content blocks. */
  finalContent: ContentBlock[];
  /** The full conversation history (useful for debugging/logging). */
  conversationHistory: MessageParam[];
  /** Total number of loop iterations (API round-trips). */
  iterations: number;
  /** Total tokens consumed across all API calls. */
  totalTokens: {
    input: number;
    output: number;
  };
}

// ---------------------------------------------------------------------------
// Coordinator / orchestration types (Domain 1.2)
// ---------------------------------------------------------------------------

/**
 * Definition of a subagent that the coordinator can invoke.
 *
 * @exam Domain 1.2 — Hub-and-Spoke Orchestration
 */
export interface SubagentDefinition {
  /** Unique identifier for this subagent. */
  name: string;
  /** What this subagent does — used by the coordinator to decide routing. */
  description: string;
  /** System prompt for the subagent — defines its specialisation. */
  systemPrompt: string;
  /** Tools available to this subagent. */
  tools: ToolDefinition[];
  /** Tool implementations for this subagent's tools. */
  toolRegistry: ToolRegistry;
  /** Model override (defaults to coordinator's model if omitted). */
  model?: string;
}

/**
 * A task decomposed by the coordinator for subagent execution.
 */
export interface DecomposedTask {
  /** Which subagent should handle this task. */
  subagentName: string;
  /** The specific instruction to send to the subagent. */
  instruction: string;
  /**
   * Structured context explicitly passed to the subagent.
   *
   * CRITICAL EXAM CONCEPT (Domain 1.2): Subagents do NOT inherit the
   * coordinator's conversation history. Every piece of information a
   * subagent needs must be explicitly included here. This is the
   * isolation principle — subagents operate in their own context window.
   */
  context: SubagentContext;
  /** Priority for ordering parallel execution groups. */
  priority?: number;
}

/**
 * Structured context passed to a subagent.
 * Contains all information the subagent needs — nothing is inherited.
 *
 * @exam Domain 1.3 — Subagent context must be explicit, not inherited.
 */
export interface SubagentContext {
  /** Key facts the subagent needs to know. */
  facts: string[];
  /** Source URLs for grounding / citation. */
  sourceUrls?: string[];
  /** Confidence scores from upstream processing. */
  confidenceScores?: Record<string, number>;
  /** Arbitrary metadata. */
  metadata?: Record<string, unknown>;
}

/**
 * Result returned by a subagent after completing its task.
 */
export interface SubagentResult {
  /** Which subagent produced this result. */
  subagentName: string;
  /** The final content from the subagent's agentic loop. */
  content: ContentBlock[];
  /** Whether the subagent completed successfully. */
  success: boolean;
  /** Error message if the subagent failed. */
  error?: string;
  /** Token usage for this subagent's run. */
  tokenUsage: {
    input: number;
    output: number;
  };
}

/**
 * The aggregated result from the coordinator after all subagents complete.
 */
export interface CoordinatorResult {
  /** The coordinator's final synthesised response. */
  finalResponse: ContentBlock[];
  /** Individual results from each subagent. */
  subagentResults: SubagentResult[];
  /** Total token usage across coordinator + all subagents. */
  totalTokenUsage: {
    input: number;
    output: number;
  };
}

// ---------------------------------------------------------------------------
// Hook types (Domain 1.5)
// ---------------------------------------------------------------------------

/**
 * Context passed to every hook in the pipeline.
 */
export interface HookContext {
  /** The tool that was called. */
  toolName: string;
  /** The input Claude sent to the tool. */
  toolInput: Record<string, unknown>;
  /** The raw result from tool execution (before hook processing). */
  toolResult: unknown;
  /** The full conversation history at this point. */
  conversationHistory: MessageParam[];
}

/**
 * A PostToolUse hook that transforms or validates tool results.
 *
 * CRITICAL EXAM CONCEPT (Domain 1.5): Hooks provide DETERMINISTIC
 * guarantees. Unlike prompt instructions (which are probabilistic —
 * the model MIGHT follow them), hooks are code that ALWAYS executes.
 * Use hooks for invariants that must never be violated.
 *
 * @exam Domain 1.5 — Agent SDK Hooks
 */
export interface PostToolUseHook {
  /** Human-readable name for logging/debugging. */
  name: string;
  /**
   * Return `true` if this hook should run for the given tool call.
   * Returning `false` skips this hook entirely.
   */
  shouldRun: (context: HookContext) => boolean;
  /**
   * Transform the tool result. Receives the current result and must
   * return the (possibly modified) result. Can also throw to block
   * the operation entirely (escalation pattern).
   */
  execute: (context: HookContext) => Promise<unknown> | unknown;
}

/**
 * A pre-tool-use hook that can intercept and block tool calls.
 *
 * @exam Domain 1.5 — Tool call interception for guardrails.
 */
export interface PreToolUseHook {
  /** Human-readable name for logging/debugging. */
  name: string;
  /** Return `true` if this hook should run for the given tool call. */
  shouldRun: (toolName: string, toolInput: Record<string, unknown>) => boolean;
  /**
   * Validate the tool call. Return `{ allowed: true }` to proceed,
   * or `{ allowed: false, reason: "..." }` to block it.
   */
  validate: (
    toolName: string,
    toolInput: Record<string, unknown>,
  ) => Promise<HookValidationResult> | HookValidationResult;
}

/**
 * Result of a pre-tool-use validation hook.
 */
export interface HookValidationResult {
  allowed: boolean;
  reason?: string;
  /** If blocked, optionally redirect to a different tool. */
  redirectTo?: {
    toolName: string;
    toolInput: Record<string, unknown>;
  };
}

/**
 * A pipeline of hooks that are executed in order.
 *
 * @exam Domain 1.5 — Hook pipelines provide layered deterministic guarantees.
 */
export interface HookPipeline {
  /** Hooks that run BEFORE a tool is executed (can block/redirect). */
  preToolUse: PreToolUseHook[];
  /** Hooks that run AFTER a tool is executed (can transform results). */
  postToolUse: PostToolUseHook[];
}

// ---------------------------------------------------------------------------
// Spawner types (Domain 1.3)
// ---------------------------------------------------------------------------

/**
 * Configuration for spawning a single subagent.
 *
 * @exam Domain 1.3 — Subagent Invocation
 */
export interface SpawnConfig {
  /** The model to use for this subagent. */
  model: string;
  /** System prompt defining the subagent's role. */
  systemPrompt: string;
  /** The user-facing instruction / query for this subagent. */
  userMessage: string;
  /** Tools available to this subagent. */
  tools: ToolDefinition[];
  /** Tool implementations for execution. */
  toolRegistry: ToolRegistry;
  /** Structured context with metadata. */
  context: SubagentContext;
  /** Optional hook pipeline for this subagent. */
  hooks?: HookPipeline;
  /**
   * Safety cap on iterations.
   * @default 30
   */
  maxIterations?: number;
}

/**
 * Result from a spawned subagent, including metadata about the run.
 */
export interface SpawnResult {
  /** The final content blocks from the subagent. */
  content: ContentBlock[];
  /** Number of loop iterations consumed. */
  iterations: number;
  /** Token usage. */
  tokenUsage: {
    input: number;
    output: number;
  };
  /** Wall-clock duration in milliseconds. */
  durationMs: number;
}
