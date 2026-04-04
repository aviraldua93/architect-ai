/**
 * @module tool-choice-demo
 * @description Demonstrates the three tool_choice modes and when to use each.
 *
 * @exam Domain 2.3 — Tool Choice Modes
 *
 * The `tool_choice` parameter controls whether and how Claude uses tools.
 * There are exactly three modes, and the exam tests all of them.
 *
 * This file is a reference implementation — it is NOT executed at runtime.
 * It exists so students can study the patterns and the codebase_search tool
 * can surface these examples during study sessions.
 *
 * @author Sofia Andersson, Tool Systems Engineer — ArchitectAI
 */

import type Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// Type aliases for readability
// ---------------------------------------------------------------------------

type ToolChoice = Anthropic.Messages.MessageCreateParams["tool_choice"];

// ---------------------------------------------------------------------------
// Mode 1: "auto" — Model decides whether to use a tool
// ---------------------------------------------------------------------------

/**
 * EXAM NOTE: "auto" is the DEFAULT mode. The model may or may not call a tool
 * depending on whether it thinks a tool is needed.
 *
 * Use when: The model should decide whether a tool is needed based on the query.
 * Example: A general assistant that sometimes needs to search but often can
 * answer from its training data.
 */
const autoConfig: { tool_choice: ToolChoice } = {
  tool_choice: { type: "auto" },
};

// ---------------------------------------------------------------------------
// Mode 2: { type: "any" } — Force the model to use SOME tool (model picks which)
// ---------------------------------------------------------------------------

/**
 * EXAM NOTE: "any" forces tool use but lets the model choose which tool.
 * The model CANNOT produce a final text-only response in this mode —
 * it MUST call at least one tool.
 *
 * Use when: You need structured output or a specific action, but don't care
 * which tool the model selects.
 *
 * EXAM ANTI-PATTERN: Do NOT use { type: "any" } on every turn of an agentic
 * loop. Because the model can never produce a final text response, the loop
 * will never terminate via stop_reason === "end_turn". You'll hit the safety
 * cap (maxIterations) instead — which is a bug, not a feature.
 *
 * The correct pattern: use "any" or "tool" on the FIRST turn only, then
 * switch to "auto" for subsequent turns so the model can eventually finish.
 */
const anyConfig: { tool_choice: ToolChoice } = {
  tool_choice: { type: "any" },
};

// ---------------------------------------------------------------------------
// Mode 3: { type: "tool", name: "..." } — Force a specific tool
// ---------------------------------------------------------------------------

/**
 * EXAM NOTE: Forces the model to call a specific tool by name.
 * Useful for the first turn of a loop where you MUST look up context first.
 *
 * Use when: The first turn MUST call a specific tool (e.g., always look up
 * context before answering).
 *
 * EXAM PATTERN — First-turn forcing:
 * A common production pattern is to use { type: "tool", name: "lookup" }
 * on turn 1 (force context retrieval), then switch to { type: "auto" }
 * for all subsequent turns (let the model decide when it's done).
 */
const toolConfig: { tool_choice: ToolChoice } = {
  tool_choice: { type: "tool", name: "lookup" },
};

// ---------------------------------------------------------------------------
// Pattern: First-turn forcing with mode switching
// ---------------------------------------------------------------------------

/**
 * Demonstrates the recommended first-turn forcing pattern.
 *
 * @exam Domain 2.3 — This is the canonical pattern tested on the exam.
 *
 * Turn 1: Force the model to call "context_lookup" so it always retrieves
 *         relevant context before answering.
 * Turn 2+: Switch to "auto" so the model can decide whether to use more
 *          tools or produce a final text response.
 *
 * EXAM NOTE: If you forget to switch back to "auto" after the first turn,
 * the model will be forced to call "context_lookup" on EVERY turn, which
 * creates an infinite loop (it can never signal end_turn).
 */
function getToolChoiceForTurn(turnNumber: number): ToolChoice {
  if (turnNumber === 1) {
    // First turn: force context lookup.
    return { type: "tool", name: "context_lookup" };
  }
  // Subsequent turns: let the model decide.
  return { type: "auto" };
}

// ---------------------------------------------------------------------------
// Exports for type-checking — these are reference values, not runtime config
// ---------------------------------------------------------------------------

export { autoConfig, anyConfig, toolConfig, getToolChoiceForTurn };
