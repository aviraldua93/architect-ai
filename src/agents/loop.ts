/**
 * @module loop
 * @description The Agentic Loop — the single most important pattern in
 * Claude-powered agent systems.
 *
 * @exam Domain 1.1 — Agentic Loops
 *
 * HOW IT WORKS:
 * 1. Send a request to Claude via the Messages API.
 * 2. Inspect `stop_reason` on the response.
 * 3. If `stop_reason === "tool_use"` → extract tool calls, execute them,
 *    append tool_result blocks to the conversation, and loop.
 * 4. If `stop_reason === "end_turn"` → return the final response.
 *
 * CRITICAL EXAM CONCEPTS DEMONSTRATED HERE:
 *
 * ❶ We check `stop_reason`, NOT the content type.
 *    ANTI-PATTERN: `response.content[0].type === "text"` is WRONG because
 *    Claude can return text content blocks ALONGSIDE tool_use blocks in the
 *    same response (e.g., "Let me look that up for you" + tool_use).
 *    Checking content type would cause you to miss the tool call entirely.
 *
 * ❷ No arbitrary iteration cap as the PRIMARY stop mechanism.
 *    The loop stops when Claude sets `stop_reason === "end_turn"`.
 *    This is MODEL-DRIVEN termination. The maxIterations guard is a
 *    safety net for runaway loops, not the intended stop condition.
 *
 * ❸ We never parse natural language like "I'm done" or "Task complete".
 *    That's fragile, locale-dependent, and unstructured. The API provides
 *    a structured, machine-readable signal: `stop_reason`.
 *
 * ❹ Model-driven decision making: Claude decides WHICH tools to call,
 *    in what order, with what arguments. The loop merely executes and
 *    feeds results back. The orchestration logic lives in the model,
 *    not in our code.
 *
 * @author Liam Nakamura, Lead Architect — ArchitectAI
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  AgenticLoopConfig,
  AgenticLoopResult,
  ContentBlock,
  HookPipeline,
  MessageParam,
  ToolImplementation,
  ToolRegistry,
  ToolResultBlockParam,
  ToolUseBlock,
} from "./types";

// ---------------------------------------------------------------------------
// Agentic loop implementation
// ---------------------------------------------------------------------------

/**
 * Run a complete agentic loop: send messages to Claude, execute tool calls,
 * and repeat until the model signals completion via `stop_reason`.
 *
 * @exam Domain 1.1 — This is the canonical agentic loop implementation.
 *
 * @param client - An initialised Anthropic SDK client.
 * @param config - Loop configuration (model, system prompt, tools, registry).
 * @param userMessage - The initial user message that kicks off the loop.
 * @returns The final loop result including conversation history and token counts.
 *
 * @example
 * ```ts
 * const client = new Anthropic();
 * const result = await runAgenticLoop(client, {
 *   model: "claude-sonnet-4-20250514",
 *   systemPrompt: "You are a helpful research assistant.",
 *   tools: [searchTool.definition],
 *   toolRegistry: new Map([["search", searchTool]]),
 * }, "Find the population of Tokyo.");
 * ```
 */
export async function runAgenticLoop(
  client: Anthropic,
  config: AgenticLoopConfig,
  userMessage: string,
): Promise<AgenticLoopResult> {
  const {
    model,
    systemPrompt,
    tools,
    toolRegistry,
    maxIterations = 50,
    hooks,
  } = config;

  // Conversation history starts with the user's initial message.
  const conversationHistory: MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  let iterations = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  // -----------------------------------------------------------------------
  // CORE LOOP: Iterate until Claude signals end_turn or we hit the safety cap.
  //
  // EXAM NOTE: The primary termination signal is `stop_reason === "end_turn"`.
  // The maxIterations check is a safety net, NOT the designed stop mechanism.
  // If your loop routinely hits maxIterations, the prompt or tools are broken.
  // -----------------------------------------------------------------------
  while (iterations < maxIterations) {
    iterations++;

    // Send the current conversation to Claude.
    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      tools,
      messages: conversationHistory,
    });

    // Track token usage across all iterations.
    totalInputTokens += response.usage.input_tokens;
    totalOutputTokens += response.usage.output_tokens;

    // -----------------------------------------------------------------------
    // EXAM CONCEPT ❶: We check stop_reason, NOT content[0].type.
    //
    // Why? Because a single response can contain BOTH text and tool_use blocks.
    // For example, Claude might say "Let me search for that" (text) AND emit
    // a tool_use block in the same response. If we checked content type, we'd
    // see text and incorrectly assume the model is done.
    //
    // stop_reason is the ONLY reliable signal:
    //   - "end_turn" → Claude is finished, return the result.
    //   - "tool_use" → Claude wants us to execute tool(s) and continue.
    //   - "max_tokens" → response was truncated (handle as needed).
    // -----------------------------------------------------------------------

    if (response.stop_reason === "end_turn") {
      // -----------------------------------------------------------------------
      // EXAM CONCEPT ❸: We do NOT parse the text looking for phrases like
      // "I'm done" or "Task complete". The structured stop_reason field is
      // the canonical, machine-readable termination signal.
      // -----------------------------------------------------------------------
      return {
        finalContent: response.content,
        conversationHistory,
        iterations,
        totalTokens: {
          input: totalInputTokens,
          output: totalOutputTokens,
        },
      };
    }

    if (response.stop_reason === "tool_use") {
      // Append the assistant's full response (including any text + tool_use blocks)
      // to conversation history. This is required by the Messages API — the
      // assistant turn must be preserved exactly as received.
      conversationHistory.push({
        role: "assistant",
        content: response.content,
      });

      // -----------------------------------------------------------------------
      // EXAM CONCEPT ❹: Model-driven decision making.
      //
      // Claude decides WHICH tools to call. We extract ALL tool_use blocks from
      // the response and execute each one. Claude may call multiple tools in
      // a single turn (parallel tool use). We execute them all and send back
      // all results together.
      // -----------------------------------------------------------------------
      const toolUseBlocks = response.content.filter(
        (block): block is ToolUseBlock => block.type === "tool_use",
      );

      // Execute each tool call and collect results.
      const toolResults: ToolResultBlockParam[] = await Promise.all(
        toolUseBlocks.map((toolUse) =>
          executeToolCall(toolUse, toolRegistry, hooks),
        ),
      );

      // Append tool results as the next user turn.
      // The Messages API requires tool_result blocks to be in a user message.
      conversationHistory.push({
        role: "user",
        content: toolResults,
      });

      // Loop continues — send the updated conversation back to Claude.
      continue;
    }

    // Handle max_tokens (response truncation).
    // In a production system you might concatenate and re-request.
    // For now, we return what we have.
    if (response.stop_reason === "max_tokens") {
      conversationHistory.push({
        role: "assistant",
        content: response.content,
      });

      return {
        finalContent: response.content,
        conversationHistory,
        iterations,
        totalTokens: {
          input: totalInputTokens,
          output: totalOutputTokens,
        },
      };
    }
  }

  // -------------------------------------------------------------------------
  // EXAM CONCEPT ❷: If we reach here, the safety cap was hit.
  // This should be exceptional, not normal. Log a warning.
  // -------------------------------------------------------------------------
  console.warn(
    `[agentic-loop] Safety cap reached: ${maxIterations} iterations. ` +
      `This likely indicates a problem with the prompt or tool definitions.`,
  );

  return {
    finalContent: [
      {
        type: "text",
        text: `Loop terminated after ${maxIterations} iterations (safety cap). The model did not signal completion.`,
        citations: null,
      },
    ],
    conversationHistory,
    iterations,
    totalTokens: {
      input: totalInputTokens,
      output: totalOutputTokens,
    },
  };
}

// ---------------------------------------------------------------------------
// Tool execution helper
// ---------------------------------------------------------------------------

/**
 * Execute a single tool call from Claude's response and return a tool_result block.
 *
 * This function:
 * 1. Runs pre-tool-use hooks (if any) to validate / block the call.
 * 2. Looks up the tool in the registry and executes it.
 * 3. Runs post-tool-use hooks (if any) to transform the result.
 * 4. Wraps the result in a proper `tool_result` content block.
 *
 * @exam Domain 1.1 — Tool results must be appended as proper tool_result blocks
 *       with the matching tool_use_id. This is NOT optional — the API will
 *       reject messages without matching IDs.
 */
async function executeToolCall(
  toolUse: ToolUseBlock,
  toolRegistry: ToolRegistry,
  hooks?: HookPipeline,
): Promise<ToolResultBlockParam> {
  const { id: toolUseId, name: toolName, input: toolInput } = toolUse;
  const typedInput = toolInput as Record<string, unknown>;

  // -----------------------------------------------------------------------
  // Pre-tool-use hooks: validate and possibly block the call.
  // These are DETERMINISTIC guardrails — they always execute, unlike
  // prompt-based instructions which the model might ignore.
  // -----------------------------------------------------------------------
  if (hooks?.preToolUse) {
    for (const hook of hooks.preToolUse) {
      if (hook.shouldRun(toolName, typedInput)) {
        const validation = await hook.validate(toolName, typedInput);

        if (!validation.allowed) {
          // Tool call was blocked by a hook. Return an error result.
          return {
            type: "tool_result",
            tool_use_id: toolUseId,
            content: JSON.stringify({
              error: `Blocked by hook "${hook.name}": ${validation.reason}`,
              redirected: validation.redirectTo != null,
            }),
            is_error: true,
          };
        }
      }
    }
  }

  // Look up the tool implementation.
  const tool = toolRegistry.get(toolName);
  if (!tool) {
    return {
      type: "tool_result",
      tool_use_id: toolUseId,
      content: JSON.stringify({
        error: `Unknown tool: "${toolName}". Available tools: ${[...toolRegistry.keys()].join(", ")}`,
      }),
      is_error: true,
    };
  }

  try {
    // Execute the tool.
    let result = await tool.execute(typedInput);

    // -----------------------------------------------------------------------
    // Post-tool-use hooks: transform the result.
    //
    // EXAM CONCEPT (Domain 1.5): Hooks provide DETERMINISTIC guarantees.
    // If you need "all timestamps must be ISO 8601", don't put that in the
    // prompt (probabilistic) — put it in a PostToolUse hook (deterministic).
    // -----------------------------------------------------------------------
    if (hooks?.postToolUse) {
      for (const hook of hooks.postToolUse) {
        const hookContext = {
          toolName,
          toolInput: typedInput,
          toolResult: result,
          conversationHistory: [],
        };

        if (hook.shouldRun(hookContext)) {
          result = await hook.execute(hookContext);
        }
      }
    }

    // Serialise the result to a string for the API.
    const serialised =
      typeof result === "string" ? result : JSON.stringify(result);

    return {
      type: "tool_result",
      tool_use_id: toolUseId,
      content: serialised,
    };
  } catch (error) {
    // Tool execution failed — return an error result so Claude can adapt.
    const message =
      error instanceof Error ? error.message : "Unknown error during tool execution";

    return {
      type: "tool_result",
      tool_use_id: toolUseId,
      content: JSON.stringify({ error: message }),
      is_error: true,
    };
  }
}
