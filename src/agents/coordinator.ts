/**
 * @module coordinator
 * @description Hub-and-Spoke Orchestration — the Coordinator pattern.
 *
 * @exam Domain 1.2 — Multi-Agent Orchestration
 *
 * THE PATTERN:
 * A central Coordinator agent receives the user's query, uses Claude to
 * decompose it into subtasks, routes each subtask to a specialist subagent,
 * and aggregates the results into a coherent final response.
 *
 * CRITICAL EXAM CONCEPTS DEMONSTRATED HERE:
 *
 * ❶ Hub-and-spoke topology: ALL communication flows through the coordinator.
 *   Subagents NEVER communicate with each other directly. This keeps the
 *   system debuggable and prevents emergent/uncontrolled agent-to-agent
 *   conversations.
 *
 * ❷ Subagents do NOT inherit the coordinator's conversation history.
 *   Each subagent starts with a clean context window. Every piece of
 *   information a subagent needs must be explicitly included in its prompt.
 *   This is the ISOLATION PRINCIPLE.
 *
 * ❸ If task decomposition is narrow, output will be narrow.
 *   The coordinator's decomposition quality is the root cause of output
 *   quality. A poor decomposition cannot be rescued by good subagents.
 *
 * @author Liam Nakamura, Lead Architect — ArchitectAI
 */

import Anthropic from "@anthropic-ai/sdk";
import { spawnSubagent, spawnParallel } from "./spawner";
import type {
  ContentBlock,
  CoordinatorResult,
  DecomposedTask,
  MessageParam,
  SubagentContext,
  SubagentDefinition,
  SubagentResult,
  TextBlock,
  ToolUseBlock,
} from "./types";

// ---------------------------------------------------------------------------
// Coordinator class
// ---------------------------------------------------------------------------

/**
 * A hub-and-spoke coordinator that decomposes user queries and routes them
 * to specialist subagents.
 *
 * @exam Domain 1.2 — Hub-and-Spoke Orchestration
 *
 * @example
 * ```ts
 * const coordinator = new Coordinator(client, {
 *   model: "claude-sonnet-4-20250514",
 *   subagents: [researchAgent, writerAgent, factCheckerAgent],
 * });
 * const result = await coordinator.handle("Write a report on climate change.");
 * ```
 */
export class Coordinator {
  private client: Anthropic;
  private model: string;
  private subagents: Map<string, SubagentDefinition>;

  /**
   * System prompt for the coordinator itself.
   * The coordinator's job is to decompose tasks — not to do the work itself.
   */
  private systemPrompt: string;

  constructor(
    client: Anthropic,
    config: CoordinatorConfig,
  ) {
    this.client = client;
    this.model = config.model;
    this.systemPrompt = config.systemPrompt ?? buildDefaultSystemPrompt(config.subagents);

    // Index subagents by name for fast lookup.
    this.subagents = new Map(
      config.subagents.map((sa) => [sa.name, sa]),
    );
  }

  /**
   * Handle a user query by decomposing it, routing to subagents, and
   * aggregating results.
   *
   * EXAM CONCEPT ❸: The quality of the final output is bounded by the
   * quality of the decomposition. If the coordinator decomposes "write
   * a report on climate change" into just "summarise climate change",
   * the output will be a single summary — not a full report.
   *
   * @param userQuery - The user's natural-language request.
   * @returns Aggregated result from all subagents + coordinator synthesis.
   */
  async handle(userQuery: string): Promise<CoordinatorResult> {
    let totalInput = 0;
    let totalOutput = 0;

    // Step 1: Ask Claude to decompose the task.
    const tasks = await this.decompose(userQuery);

    // Step 2: Route tasks to subagents.
    // Group by priority for ordered execution; within a group, run in parallel.
    const subagentResults = await this.routeAndExecute(tasks);

    // Accumulate token usage from subagent runs.
    for (const result of subagentResults) {
      totalInput += result.tokenUsage.input;
      totalOutput += result.tokenUsage.output;
    }

    // Step 3: Aggregate subagent results into a final response.
    const { finalResponse, tokenUsage: synthTokens } =
      await this.synthesise(userQuery, subagentResults);

    totalInput += synthTokens.input;
    totalOutput += synthTokens.output;

    return {
      finalResponse,
      subagentResults,
      totalTokenUsage: { input: totalInput, output: totalOutput },
    };
  }

  // -------------------------------------------------------------------------
  // Private: Task decomposition
  // -------------------------------------------------------------------------

  /**
   * Use Claude to decompose a user query into concrete subtasks.
   *
   * The coordinator calls Claude with a decompose_task tool. Claude returns
   * structured JSON describing which subagents to invoke and what to tell them.
   */
  private async decompose(userQuery: string): Promise<DecomposedTask[]> {
    const decomposeToolDef: Anthropic.Messages.Tool = {
      name: "decompose_task",
      description:
        "Decompose the user's query into subtasks for specialist subagents. " +
        "Each subtask must include the subagent name, a clear instruction, " +
        "and any context the subagent needs.",
      input_schema: {
        type: "object" as const,
        properties: {
          tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                subagentName: {
                  type: "string",
                  description: "Name of the subagent to handle this task.",
                },
                instruction: {
                  type: "string",
                  description: "Clear, self-contained instruction for the subagent.",
                },
                contextFacts: {
                  type: "array",
                  items: { type: "string" },
                  description: "Key facts the subagent needs.",
                },
                priority: {
                  type: "number",
                  description:
                    "Execution priority (lower = earlier). Tasks with the same priority run in parallel.",
                },
              },
              required: ["subagentName", "instruction", "contextFacts"],
            },
          },
        },
        required: ["tasks"],
      },
    };

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      system: this.systemPrompt,
      tools: [decomposeToolDef],
      messages: [{ role: "user", content: userQuery }],
    });

    // Extract the decompose_task tool call from the response.
    const toolUse = response.content.find(
      (block): block is ToolUseBlock => block.type === "tool_use" && block.name === "decompose_task",
    );

    if (!toolUse) {
      // Claude didn't use the decomposition tool — fall back to a single task.
      return [
        {
          subagentName: [...this.subagents.keys()][0] ?? "default",
          instruction: userQuery,
          context: { facts: [] },
          priority: 0,
        },
      ];
    }

    const input = toolUse.input as {
      tasks: Array<{
        subagentName: string;
        instruction: string;
        contextFacts: string[];
        priority?: number;
      }>;
    };

    return input.tasks.map((task) => ({
      subagentName: task.subagentName,
      instruction: task.instruction,
      context: {
        facts: task.contextFacts,
      },
      priority: task.priority ?? 0,
    }));
  }

  // -------------------------------------------------------------------------
  // Private: Routing and execution
  // -------------------------------------------------------------------------

  /**
   * Route decomposed tasks to subagents, respecting priority ordering.
   *
   * EXAM CONCEPT ❶: All routing goes through the coordinator.
   * Subagents never invoke each other. This is the hub-and-spoke topology.
   *
   * EXAM CONCEPT ❷: Each subagent receives ONLY the context explicitly
   * passed in the DecomposedTask. The coordinator's conversation history,
   * other subagents' results, and any ambient state are NOT available
   * to the subagent. This is deliberate — it prevents context leakage
   * and makes each subagent's behaviour reproducible.
   */
  private async routeAndExecute(
    tasks: DecomposedTask[],
  ): Promise<SubagentResult[]> {
    // Group tasks by priority level.
    const priorityGroups = new Map<number, DecomposedTask[]>();
    for (const task of tasks) {
      const priority = task.priority ?? 0;
      const group = priorityGroups.get(priority) ?? [];
      group.push(task);
      priorityGroups.set(priority, group);
    }

    // Execute groups in priority order (ascending).
    const sortedPriorities = [...priorityGroups.keys()].sort((a, b) => a - b);
    const allResults: SubagentResult[] = [];

    for (const priority of sortedPriorities) {
      const group = priorityGroups.get(priority)!;

      // Within a priority group, spawn subagents in parallel.
      const spawnConfigs = group.map((task) => {
        const subagentDef = this.subagents.get(task.subagentName);

        if (!subagentDef) {
          // Unknown subagent — we'll create a minimal fallback.
          return {
            model: this.model,
            systemPrompt: `You are a helpful assistant. Complete the following task.`,
            userMessage: this.buildSubagentMessage(task),
            tools: [],
            toolRegistry: new Map(),
            context: task.context,
          };
        }

        return {
          model: subagentDef.model ?? this.model,
          systemPrompt: subagentDef.systemPrompt,
          userMessage: this.buildSubagentMessage(task),
          tools: subagentDef.tools,
          toolRegistry: subagentDef.toolRegistry,
          context: task.context,
        };
      });

      const results = await spawnParallel(this.client, spawnConfigs);

      // Map spawn results to SubagentResults.
      for (let i = 0; i < group.length; i++) {
        const task = group[i];
        const spawnResult = results[i];

        allResults.push({
          subagentName: task.subagentName,
          content: spawnResult.content,
          success: true,
          tokenUsage: spawnResult.tokenUsage,
        });
      }
    }

    return allResults;
  }

  /**
   * Build the user message for a subagent.
   *
   * EXAM CONCEPT ❷: Everything the subagent needs is in this message.
   * We explicitly serialise the context facts, source URLs, and confidence
   * scores. The subagent has NO other source of information.
   */
  private buildSubagentMessage(task: DecomposedTask): string {
    const parts: string[] = [];

    // Context block — explicit facts the subagent needs.
    if (task.context.facts.length > 0) {
      parts.push("## Context");
      parts.push(
        task.context.facts.map((f, i) => `${i + 1}. ${f}`).join("\n"),
      );
    }

    // Source URLs for grounding.
    if (task.context.sourceUrls && task.context.sourceUrls.length > 0) {
      parts.push("\n## Sources");
      parts.push(task.context.sourceUrls.join("\n"));
    }

    // Confidence scores from upstream processing.
    if (task.context.confidenceScores) {
      parts.push("\n## Confidence Scores");
      for (const [key, score] of Object.entries(task.context.confidenceScores)) {
        parts.push(`- ${key}: ${(score * 100).toFixed(1)}%`);
      }
    }

    // The actual instruction.
    parts.push("\n## Task");
    parts.push(task.instruction);

    return parts.join("\n");
  }

  // -------------------------------------------------------------------------
  // Private: Result synthesis
  // -------------------------------------------------------------------------

  /**
   * Synthesise subagent results into a final, coherent response.
   *
   * The coordinator sends ALL subagent outputs back to Claude and asks
   * it to produce a unified answer.
   */
  private async synthesise(
    originalQuery: string,
    subagentResults: SubagentResult[],
  ): Promise<{
    finalResponse: ContentBlock[];
    tokenUsage: { input: number; output: number };
  }> {
    // Build a synthesis prompt with all subagent outputs.
    const resultsSummary = subagentResults
      .map((r) => {
        const textContent = r.content
          .filter((block): block is TextBlock => block.type === "text")
          .map((block) => block.text)
          .join("\n");

        return `### ${r.subagentName}\n${r.success ? textContent : `ERROR: ${r.error}`}`;
      })
      .join("\n\n");

    const synthesisPrompt =
      `The user asked: "${originalQuery}"\n\n` +
      `The following specialist agents have provided their outputs:\n\n` +
      `${resultsSummary}\n\n` +
      `Synthesise these results into a single, coherent response that ` +
      `directly addresses the user's original query. Resolve any contradictions ` +
      `and highlight areas of agreement.`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system:
        "You are a synthesis agent. Combine the provided specialist outputs into a coherent final answer.",
      messages: [{ role: "user", content: synthesisPrompt }],
    });

    return {
      finalResponse: response.content,
      tokenUsage: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
    };
  }
}

// ---------------------------------------------------------------------------
// Configuration type
// ---------------------------------------------------------------------------

/**
 * Configuration for creating a Coordinator instance.
 */
export interface CoordinatorConfig {
  /** Claude model to use for coordination. */
  model: string;
  /** Available subagents. */
  subagents: SubagentDefinition[];
  /** Optional custom system prompt for the coordinator. */
  systemPrompt?: string;
}

// ---------------------------------------------------------------------------
// Default system prompt builder
// ---------------------------------------------------------------------------

/**
 * Build the default coordinator system prompt from the available subagents.
 */
function buildDefaultSystemPrompt(subagents: SubagentDefinition[]): string {
  const agentList = subagents
    .map((sa) => `- **${sa.name}**: ${sa.description}`)
    .join("\n");

  return (
    `You are a task coordinator. Your job is to decompose user queries into ` +
    `subtasks and assign each subtask to the most appropriate specialist agent.\n\n` +
    `Available agents:\n${agentList}\n\n` +
    `Rules:\n` +
    `1. Each subtask must be self-contained — include ALL context the agent needs.\n` +
    `2. Assign a priority to each subtask (lower = runs first).\n` +
    `3. Tasks with the same priority will run in parallel.\n` +
    `4. Be specific in your instructions — vague tasks produce vague outputs.\n` +
    `5. Use the decompose_task tool to return your plan.`
  );
}
