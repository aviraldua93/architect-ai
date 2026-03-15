/**
 * @module spawner
 * @description Subagent spawning — isolated context, parallel execution, and
 * structured metadata passing.
 *
 * @exam Domain 1.3 — Subagent Invocation
 *
 * KEY CONCEPTS:
 *
 * ❶ Each subagent runs in ISOLATED context. It gets its own conversation
 *   history that starts from scratch. No coordinator state leaks in.
 *
 * ❷ Parallel spawning: multiple subagents can run concurrently via
 *   Promise.all. This is critical for performance when subtasks are
 *   independent.
 *
 * ❸ Structured context passing: source URLs, confidence scores, and
 *   arbitrary metadata are serialised into the subagent's prompt.
 *   This ensures provenance is maintained across agent boundaries.
 *
 * @author Liam Nakamura, Lead Architect — ArchitectAI
 */

import Anthropic from "@anthropic-ai/sdk";
import { runAgenticLoop } from "./loop";
import type {
  SpawnConfig,
  SpawnResult,
  SubagentContext,
  ToolRegistry,
} from "./types";

// ---------------------------------------------------------------------------
// Single subagent spawning
// ---------------------------------------------------------------------------

/**
 * Spawn a single subagent with fully isolated context.
 *
 * The subagent gets its own agentic loop, its own conversation history,
 * and its own tool registry. It knows ONLY what we explicitly tell it
 * via the system prompt + user message + structured context.
 *
 * @exam Domain 1.3 — Subagent Invocation
 *
 * @param client - Anthropic SDK client.
 * @param config - Spawn configuration (model, prompt, tools, context).
 * @returns The subagent's result including content, tokens, and timing.
 *
 * @example
 * ```ts
 * const result = await spawnSubagent(client, {
 *   model: "claude-sonnet-4-20250514",
 *   systemPrompt: "You are a research specialist.",
 *   userMessage: "Find the GDP of France in 2023.",
 *   tools: [webSearchTool.definition],
 *   toolRegistry: new Map([["web_search", webSearchTool]]),
 *   context: {
 *     facts: ["User is writing an economics report"],
 *     sourceUrls: ["https://worldbank.org"],
 *     confidenceScores: { "data_freshness": 0.9 },
 *   },
 * });
 * ```
 */
export async function spawnSubagent(
  client: Anthropic,
  config: SpawnConfig,
): Promise<SpawnResult> {
  const startTime = Date.now();

  // -------------------------------------------------------------------------
  // Build the user message with structured context.
  //
  // EXAM CONCEPT ❸: We serialise source URLs, confidence scores, and
  // metadata into the prompt. This is how provenance data crosses agent
  // boundaries — it's explicit, auditable, and deterministic.
  // -------------------------------------------------------------------------
  const enrichedMessage = buildEnrichedMessage(
    config.userMessage,
    config.context,
  );

  // -------------------------------------------------------------------------
  // EXAM CONCEPT ❶: Isolated context.
  //
  // We call runAgenticLoop with a FRESH conversation. The subagent has no
  // awareness of the coordinator's history, other subagents, or any state
  // outside what's in enrichedMessage + systemPrompt.
  // -------------------------------------------------------------------------
  const loopResult = await runAgenticLoop(
    client,
    {
      model: config.model,
      systemPrompt: config.systemPrompt,
      tools: config.tools,
      toolRegistry: config.toolRegistry,
      maxIterations: config.maxIterations ?? 30,
      hooks: config.hooks,
    },
    enrichedMessage,
  );

  const durationMs = Date.now() - startTime;

  return {
    content: loopResult.finalContent,
    iterations: loopResult.iterations,
    tokenUsage: loopResult.totalTokens,
    durationMs,
  };
}

// ---------------------------------------------------------------------------
// Parallel subagent spawning
// ---------------------------------------------------------------------------

/**
 * Spawn multiple subagents in parallel and collect all results.
 *
 * Uses Promise.allSettled to ensure one subagent's failure doesn't
 * crash the entire batch. Failed subagents return error content blocks.
 *
 * @exam Domain 1.3 — Parallel subagent execution
 *
 * @param client - Anthropic SDK client (shared across subagents).
 * @param configs - Array of spawn configurations, one per subagent.
 * @returns Array of results in the same order as the input configs.
 *
 * @example
 * ```ts
 * const results = await spawnParallel(client, [
 *   { model: "claude-sonnet-4-20250514", systemPrompt: "...", userMessage: "Task A", ... },
 *   { model: "claude-sonnet-4-20250514", systemPrompt: "...", userMessage: "Task B", ... },
 * ]);
 * // results[0] → Task A result
 * // results[1] → Task B result
 * ```
 */
export async function spawnParallel(
  client: Anthropic,
  configs: SpawnConfig[],
): Promise<SpawnResult[]> {
  // -------------------------------------------------------------------------
  // EXAM CONCEPT ❷: Parallel execution.
  //
  // Each subagent runs concurrently. They share the Anthropic client
  // (which handles its own connection pooling) but have completely
  // separate conversation histories and tool registries.
  //
  // We use allSettled (not all) so that one failure doesn't abort the
  // rest. This is critical in production — a research agent failing
  // shouldn't prevent the writer agent from completing.
  // -------------------------------------------------------------------------
  const settled = await Promise.allSettled(
    configs.map((config) => spawnSubagent(client, config)),
  );

  return settled.map((outcome, index) => {
    if (outcome.status === "fulfilled") {
      return outcome.value;
    }

    // Return a graceful error result for failed subagents.
    const error =
      outcome.reason instanceof Error
        ? outcome.reason.message
        : "Unknown error during subagent execution";

    return {
      content: [
        {
          type: "text" as const,
          text: `Subagent ${index} failed: ${error}`,
          citations: null,
        },
      ],
      iterations: 0,
      tokenUsage: { input: 0, output: 0 },
      durationMs: 0,
    };
  });
}

// ---------------------------------------------------------------------------
// Context enrichment helpers
// ---------------------------------------------------------------------------

/**
 * Build an enriched user message that includes structured context.
 *
 * This serialises SubagentContext (facts, source URLs, confidence scores,
 * metadata) into a well-formatted prompt section that the subagent can
 * reference during its work.
 *
 * @exam Domain 1.3 — Structured context passing with metadata.
 */
function buildEnrichedMessage(
  baseMessage: string,
  context: SubagentContext,
): string {
  const sections: string[] = [];

  // Facts — the most important context elements.
  if (context.facts.length > 0) {
    sections.push("## Provided Context");
    sections.push(
      context.facts.map((fact, i) => `${i + 1}. ${fact}`).join("\n"),
    );
  }

  // Source URLs for citation and grounding.
  if (context.sourceUrls && context.sourceUrls.length > 0) {
    sections.push("\n## Reference Sources");
    sections.push(
      context.sourceUrls.map((url) => `- ${url}`).join("\n"),
    );
  }

  // Confidence scores from upstream agents.
  if (context.confidenceScores && Object.keys(context.confidenceScores).length > 0) {
    sections.push("\n## Upstream Confidence Scores");
    for (const [metric, score] of Object.entries(context.confidenceScores)) {
      sections.push(`- ${metric}: ${(score * 100).toFixed(1)}%`);
    }
  }

  // Arbitrary metadata.
  if (context.metadata && Object.keys(context.metadata).length > 0) {
    sections.push("\n## Metadata");
    sections.push("```json");
    sections.push(JSON.stringify(context.metadata, null, 2));
    sections.push("```");
  }

  // The actual task instruction.
  sections.push("\n## Your Task");
  sections.push(baseMessage);

  return sections.join("\n");
}
