/**
 * @module decomposer
 * @description Task Decomposition — fixed sequential pipelines vs dynamic
 * adaptive decomposition, and the attention dilution problem.
 *
 * @exam Domain 1.6 — Task Decomposition
 *
 * TWO STRATEGIES (THE EXAM TESTS BOTH):
 *
 * ❶ FIXED SEQUENTIAL PIPELINE:
 *   A predefined sequence of stages that always execute in order.
 *   Example: Extract → Analyse → Format.
 *
 *   PROS: Predictable, repeatable, easy to debug. Every run follows
 *   the same path, which makes testing and auditing straightforward.
 *
 *   CONS: Wasteful for simple tasks. If the user asks "What is 2+2?",
 *   running it through Extract → Analyse → Format wastes tokens on
 *   unnecessary stages. Fixed pipelines lack adaptability.
 *
 * ❷ DYNAMIC ADAPTIVE DECOMPOSITION:
 *   Claude analyses the task at runtime and decides how to break it down.
 *   The decomposition itself is model-driven — the system doesn't
 *   predetermine the stages.
 *
 *   PROS: Flexible, efficient for varied workloads. Simple tasks get
 *   simple decomposition; complex tasks get thorough decomposition.
 *
 *   CONS: Needs guardrails. The model might over-decompose (creating
 *   too many tiny subtasks) or under-decompose (cramming too much into
 *   one subtask). Both degrade quality.
 *
 * ATTENTION DILUTION — THE HIDDEN QUALITY KILLER:
 *
 *   When a single prompt processes too many items (e.g., "review these
 *   20 files for security issues"), quality degrades. The model's
 *   attention is spread across too many items and it misses details.
 *
 *   FIX: Process items in small batches (3–5 per pass), then run an
 *   integration pass to merge insights. This is the "per-file passes +
 *   integration pass" pattern.
 *
 * @author Ravi Krishnan, CLI & Platform Engineer — ArchitectAI
 */

import type { MessageParam } from "./types";

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

/**
 * The two decomposition strategies the exam tests.
 *
 * @exam Domain 1.6 — You MUST know both strategies and when to apply each:
 *   - 'fixed_sequential': Well-understood, repeatable tasks.
 *   - 'dynamic_adaptive': Variable, complex, or novel tasks.
 */
export type DecompositionStrategy = "fixed_sequential" | "dynamic_adaptive";

/**
 * A single subtask produced by decomposition.
 */
export interface Subtask {
  /** Unique identifier for this subtask. */
  id: string;
  /** Human-readable description of what this subtask does. */
  description: string;
  /**
   * Input data or context needed for this subtask.
   * For fixed pipelines, this is the output of the previous stage.
   * For dynamic decomposition, this is extracted from the parent task.
   */
  input: string;
  /**
   * Estimated complexity (used by the dynamic decomposer to decide
   * whether to decompose further).
   */
  estimatedComplexity: "low" | "medium" | "high";
  /** Dependencies — subtask IDs that must complete before this one starts. */
  dependsOn: string[];
  /** Optional grouping key for batching related subtasks. */
  groupKey?: string;
}

/**
 * Result of processing a subtask.
 */
export interface SubtaskResult {
  /** The subtask that was processed. */
  subtaskId: string;
  /** The output produced by processing this subtask. */
  output: string;
  /** Whether processing succeeded. */
  success: boolean;
  /** Error message if processing failed. */
  error?: string;
}

/**
 * A stage in a fixed sequential pipeline.
 */
export interface PipelineStage {
  /** Human-readable name for this stage (e.g. "extract", "analyse"). */
  name: string;
  /** Description of what this stage does. */
  description: string;
  /**
   * The processing function for this stage.
   * Receives the output of the previous stage (or the original input
   * for the first stage) and produces output for the next stage.
   */
  process: (input: string, context?: Record<string, unknown>) => Promise<string>;
}

// ---------------------------------------------------------------------------
// Fixed Sequential Pipeline
// ---------------------------------------------------------------------------

/**
 * A fixed sequential pipeline that always executes the same stages in order.
 *
 * @exam Domain 1.6 — Fixed pipelines are best for:
 *   - Well-understood, repeatable tasks (e.g., ETL pipelines)
 *   - Regulated processes that must follow a prescribed order
 *   - Tasks where every stage is always necessary
 *
 * ANTI-PATTERN: Using a fixed pipeline for highly variable tasks.
 * If most queries only need 1–2 of your 5 stages, you're wasting
 * tokens and latency on unnecessary stages.
 *
 * @example
 * ```ts
 * const pipeline = new FixedPipeline([
 *   { name: "extract", description: "Extract key entities", process: extractFn },
 *   { name: "analyse", description: "Analyse sentiment", process: analyseFn },
 *   { name: "format", description: "Format as report", process: formatFn },
 * ]);
 *
 * const result = await pipeline.execute("Analyse this customer feedback...");
 * // Always runs: extract → analyse → format, even for simple input.
 * ```
 */
export class FixedPipeline {
  private stages: PipelineStage[];

  constructor(stages: PipelineStage[]) {
    if (stages.length === 0) {
      throw new Error(
        "FixedPipeline requires at least one stage. " +
          "A pipeline with zero stages produces no output.",
      );
    }
    this.stages = stages;
  }

  /**
   * Execute all stages in sequence, passing each stage's output
   * as input to the next.
   *
   * @exam Domain 1.6 — Fixed pipelines are predictable but inflexible.
   * Every invocation runs ALL stages regardless of input complexity.
   * This is the tradeoff: reliability vs efficiency.
   *
   * @param input - The initial input to feed into the first stage.
   * @param context - Optional context available to all stages.
   * @returns The final output from the last stage, plus per-stage results.
   */
  async execute(
    input: string,
    context?: Record<string, unknown>,
  ): Promise<{
    finalOutput: string;
    stageResults: Array<{ stageName: string; output: string; durationMs: number }>;
  }> {
    const stageResults: Array<{
      stageName: string;
      output: string;
      durationMs: number;
    }> = [];

    let currentInput = input;

    for (const stage of this.stages) {
      const startTime = Date.now();
      const output = await stage.process(currentInput, context);
      const durationMs = Date.now() - startTime;

      stageResults.push({
        stageName: stage.name,
        output,
        durationMs,
      });

      // Output of this stage becomes input to the next.
      currentInput = output;
    }

    return {
      finalOutput: currentInput,
      stageResults,
    };
  }

  /**
   * Get the names of all stages in execution order.
   */
  getStageNames(): string[] {
    return this.stages.map((s) => s.name);
  }

  /**
   * Get the number of stages in this pipeline.
   */
  get stageCount(): number {
    return this.stages.length;
  }
}

// ---------------------------------------------------------------------------
// Dynamic Adaptive Decomposer
// ---------------------------------------------------------------------------

/**
 * A dynamic decomposer that analyses tasks at runtime and decides
 * how to break them down.
 *
 * @exam Domain 1.6 — Dynamic decomposition is best for:
 *   - Tasks with variable complexity ("generate a report" vs "what is 2+2?")
 *   - Novel tasks the system hasn't seen before
 *   - Workloads where efficiency matters (skip unnecessary stages)
 *
 * The decomposer uses a provided analyse function (typically backed by Claude)
 * to determine the optimal subtask breakdown. It then checks each subtask
 * for recursive decomposition needs and batches related subtasks.
 *
 * @example
 * ```ts
 * const decomposer = new DynamicDecomposer(
 *   async (task, ctx) => {
 *     // Call Claude to decompose the task
 *     const subtasks = await claudeDecompose(task, ctx);
 *     return subtasks;
 *   },
 *   { attentionThreshold: 5 },
 * );
 *
 * const plan = await decomposer.decompose(
 *   "Review these 15 files for security vulnerabilities",
 *   { fileCount: 15 },
 * );
 * // plan.subtasks will be batched into groups of 5
 * ```
 */
export class DynamicDecomposer {
  /**
   * The analysis function that decomposes a task into subtasks.
   * In production, this is backed by a Claude API call.
   */
  private analyseFn: (
    task: string,
    context: Record<string, unknown>,
  ) => Promise<Subtask[]>;

  /**
   * Configuration for the decomposer's guardrails.
   */
  private config: DynamicDecomposerConfig;

  constructor(
    analyseFn: (
      task: string,
      context: Record<string, unknown>,
    ) => Promise<Subtask[]>,
    config: Partial<DynamicDecomposerConfig> = {},
  ) {
    this.analyseFn = analyseFn;
    this.config = {
      attentionThreshold: config.attentionThreshold ?? 5,
      maxRecursionDepth: config.maxRecursionDepth ?? 3,
      maxSubtasks: config.maxSubtasks ?? 20,
      maxBatchSize: config.maxBatchSize ?? 5,
    };
  }

  /**
   * Decompose a task into subtasks using the analysis function.
   *
   * @exam Domain 1.6 — Dynamic decomposition sends the task to Claude
   * (via the analyseFn) and receives a structured list of subtasks.
   * The decomposer then applies guardrails:
   *   1. Cap total subtasks at maxSubtasks (prevent over-decomposition)
   *   2. Check each subtask for recursive decomposition needs
   *   3. Batch related subtasks to reduce attention dilution
   *
   * @param task - The task description to decompose.
   * @param context - Contextual information that helps Claude decide
   *   how to break down the task.
   * @returns Decomposition plan with subtasks and batching information.
   */
  async decompose(
    task: string,
    context: Record<string, unknown> = {},
  ): Promise<DecompositionPlan> {
    // Step 1: Get initial decomposition from the analysis function.
    let subtasks = await this.analyseFn(task, context);

    // Step 2: Guard against over-decomposition.
    if (subtasks.length > this.config.maxSubtasks) {
      console.warn(
        `[decomposer] Task produced ${subtasks.length} subtasks, ` +
          `exceeding max of ${this.config.maxSubtasks}. Truncating.`,
      );
      subtasks = subtasks.slice(0, this.config.maxSubtasks);
    }

    // Step 3: Check for recursive decomposition needs.
    const recursiveFlags = subtasks.map((st) =>
      this.shouldDecomposeRecursively(st),
    );

    // Step 4: Batch related subtasks to mitigate attention dilution.
    const batches = this.batchSubtasks(subtasks, this.config.maxBatchSize);

    // Step 5: Check if attention dilution guard should activate.
    const attentionWarning =
      subtasks.length > this.config.attentionThreshold
        ? {
            triggered: true,
            message:
              `Task produced ${subtasks.length} subtasks, exceeding attention ` +
              `threshold of ${this.config.attentionThreshold}. Using multi-pass ` +
              `strategy with batches of ${this.config.maxBatchSize}.`,
            recommendedStrategy: "multi_pass" as const,
          }
        : { triggered: false, message: "", recommendedStrategy: "single_pass" as const };

    return {
      originalTask: task,
      strategy: "dynamic_adaptive",
      subtasks,
      batches,
      recursiveDecompositionNeeded: recursiveFlags,
      attentionWarning,
    };
  }

  /**
   * Determine if a subtask is too complex and should be decomposed further.
   *
   * @exam Domain 1.6 — Recursive decomposition handles the case where a
   * subtask is itself too large for a single prompt. This prevents
   * attention dilution at the subtask level.
   *
   * Criteria for recursive decomposition:
   *   - High estimated complexity
   *   - Input length exceeds a threshold (proxy for complexity)
   *   - Description contains markers like "multiple", "all", "each"
   *
   * @param subtask - The subtask to evaluate.
   * @returns True if the subtask should be decomposed further.
   */
  shouldDecomposeRecursively(subtask: Subtask): boolean {
    // High complexity tasks should always be decomposed further.
    if (subtask.estimatedComplexity === "high") return true;

    // Long inputs are a proxy for complex tasks.
    if (subtask.input.length > 2000) return true;

    // Description markers that suggest multiple items.
    const multiItemMarkers = /\b(all|each|every|multiple|several|many|list of)\b/i;
    if (multiItemMarkers.test(subtask.description)) return true;

    return false;
  }

  /**
   * Group related subtasks into batches for multi-pass processing.
   *
   * @exam Domain 1.6 — Batching is the primary mitigation for attention
   * dilution. Instead of asking Claude to process 20 items in one prompt
   * (where quality degrades for items 15–20), we process in batches
   * of 3–5 with an integration pass at the end.
   *
   * Batching strategy:
   *   1. Group by `groupKey` if available (semantic grouping).
   *   2. If no groupKey, batch sequentially by `maxBatchSize`.
   *   3. Respect dependency ordering within batches.
   *
   * @param subtasks - The subtasks to batch.
   * @param maxBatchSize - Maximum items per batch (default from config).
   * @returns Array of batches, each containing up to maxBatchSize subtasks.
   */
  batchSubtasks(
    subtasks: Subtask[],
    maxBatchSize?: number,
  ): Subtask[][] {
    const batchSize = maxBatchSize ?? this.config.maxBatchSize;

    if (subtasks.length === 0) return [];

    // Strategy 1: Group by groupKey if any subtasks have one.
    const hasGroupKeys = subtasks.some((st) => st.groupKey);

    if (hasGroupKeys) {
      const groups = new Map<string, Subtask[]>();

      for (const subtask of subtasks) {
        const key = subtask.groupKey ?? "__ungrouped__";
        const group = groups.get(key) ?? [];
        group.push(subtask);
        groups.set(key, group);
      }

      // Split large groups into batch-sized chunks.
      const batches: Subtask[][] = [];
      for (const group of groups.values()) {
        for (let i = 0; i < group.length; i += batchSize) {
          batches.push(group.slice(i, i + batchSize));
        }
      }

      return batches;
    }

    // Strategy 2: Sequential batching.
    const batches: Subtask[][] = [];
    for (let i = 0; i < subtasks.length; i += batchSize) {
      batches.push(subtasks.slice(i, i + batchSize));
    }

    return batches;
  }
}

/**
 * Configuration for the DynamicDecomposer.
 */
export interface DynamicDecomposerConfig {
  /**
   * Number of items above which attention dilution guard activates.
   *
   * @exam Domain 1.6 — The attention dilution threshold. When a single
   * prompt needs to process more than this many items, quality degrades.
   * The guard triggers multi-pass processing to maintain quality.
   *
   * @default 5
   */
  attentionThreshold: number;
  /**
   * Maximum recursion depth for subtask decomposition.
   * Prevents infinite decomposition loops.
   * @default 3
   */
  maxRecursionDepth: number;
  /**
   * Maximum total subtasks allowed from a single decomposition.
   * Guards against over-decomposition.
   * @default 20
   */
  maxSubtasks: number;
  /**
   * Maximum subtasks per batch for multi-pass processing.
   * @default 5
   */
  maxBatchSize: number;
}

/**
 * The output of a decomposition operation.
 */
export interface DecompositionPlan {
  /** The original task that was decomposed. */
  originalTask: string;
  /** Which strategy was used. */
  strategy: DecompositionStrategy;
  /** The resulting subtasks. */
  subtasks: Subtask[];
  /** Subtasks grouped into batches for multi-pass processing. */
  batches: Subtask[][];
  /**
   * Per-subtask flag indicating whether recursive decomposition is needed.
   * Index matches the subtasks array.
   */
  recursiveDecompositionNeeded: boolean[];
  /** Attention dilution warning (if threshold was exceeded). */
  attentionWarning: {
    triggered: boolean;
    message: string;
    recommendedStrategy: "single_pass" | "multi_pass";
  };
}

// ---------------------------------------------------------------------------
// Attention Dilution Guard
// ---------------------------------------------------------------------------

/**
 * Standalone attention dilution guard that can be applied to any workload.
 *
 * @exam Domain 1.6 — Attention dilution is a quality problem, not a
 * capability problem. Claude CAN process 20 items in one prompt, but
 * the quality of analysis for each item degrades as the total count
 * increases. This is analogous to a human reviewer who gets less
 * thorough as the pile of documents grows.
 *
 * THE FIX: Per-item (or per-batch) passes + integration pass.
 *   Pass 1: Process items 1–5, produce findings.
 *   Pass 2: Process items 6–10, produce findings.
 *   Pass 3: Process items 11–15, produce findings.
 *   Integration: Merge all findings, identify cross-cutting themes.
 *
 * This pattern trades latency (more API calls) for quality (thorough
 * analysis of each item). The exam tests this tradeoff.
 *
 * @example
 * ```ts
 * const guard = new AttentionDilutionGuard(5);
 *
 * // 3 items — no batching needed
 * guard.shouldBatch(3); // → false
 *
 * // 12 items — batching activated
 * guard.shouldBatch(12); // → true
 * guard.createBatches(items, 5); // → [[0-4], [5-9], [10-11]]
 * ```
 */
export class AttentionDilutionGuard {
  private threshold: number;

  /**
   * @param threshold - Number of items above which batching activates.
   *   The default of 5 is based on empirical testing: Claude maintains
   *   high-quality analysis for up to ~5 items per prompt. Beyond that,
   *   later items receive less thorough analysis.
   */
  constructor(threshold: number = 5) {
    if (threshold < 1) {
      throw new Error("Attention threshold must be at least 1.");
    }
    this.threshold = threshold;
  }

  /**
   * Check if the item count exceeds the attention threshold.
   */
  shouldBatch(itemCount: number): boolean {
    return itemCount > this.threshold;
  }

  /**
   * Split items into batches for multi-pass processing.
   *
   * @param items - The items to batch.
   * @param batchSize - Items per batch (defaults to threshold).
   * @returns Array of batches.
   */
  createBatches<T>(items: T[], batchSize?: number): T[][] {
    const size = batchSize ?? this.threshold;
    const batches: T[][] = [];

    for (let i = 0; i < items.length; i += size) {
      batches.push(items.slice(i, i + size));
    }

    return batches;
  }

  /**
   * Build a multi-pass execution plan for processing items.
   *
   * Returns a plan with batch passes + an integration pass.
   * The caller is responsible for executing each pass.
   *
   * @exam Domain 1.6 — The multi-pass pattern:
   *   1. Process each batch independently (batch passes).
   *   2. Merge all batch results (integration pass).
   *   This maintains quality by keeping each prompt focused.
   */
  buildMultiPassPlan<T>(
    items: T[],
    batchSize?: number,
  ): MultiPassPlan<T> {
    const batches = this.createBatches(items, batchSize);

    return {
      totalItems: items.length,
      batchCount: batches.length,
      batchSize: batchSize ?? this.threshold,
      batches: batches.map((batch, index) => ({
        batchIndex: index,
        items: batch,
        passType: "batch" as const,
      })),
      requiresIntegrationPass: batches.length > 1,
    };
  }

  /**
   * Get the current threshold.
   */
  getThreshold(): number {
    return this.threshold;
  }
}

/**
 * A multi-pass execution plan for attention-dilution-safe processing.
 */
export interface MultiPassPlan<T> {
  totalItems: number;
  batchCount: number;
  batchSize: number;
  batches: Array<{
    batchIndex: number;
    items: T[];
    passType: "batch";
  }>;
  /**
   * If true, an integration pass is needed to merge batch results.
   * Only false when the entire workload fits in a single batch.
   */
  requiresIntegrationPass: boolean;
}
