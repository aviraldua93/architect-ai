/**
 * Task 3.4: Plan Mode — Think Before Acting
 * Task 3.5: Iterative Refinement — The Edit-Test-Fix Loop
 *
 * Plan mode = think before acting. Direct = act now.
 * Use plan for complex, direct for simple.
 *
 * Claude Code has two execution modes:
 *   1. **Plan mode** (Shift+Tab to toggle): Claude creates a structured plan
 *      before making any changes. Best for multi-file refactors, unfamiliar
 *      codebases, and complex features.
 *   2. **Direct mode** (default): Claude acts immediately. Best for simple
 *      edits, typo fixes, and well-understood changes.
 *
 * The iterative refinement loop is how Claude Code achieves reliability:
 *   Edit → Test → Fail? → Fix → Re-test → Pass ✓
 *
 * This "agentic loop" continues until tests pass or a maximum iteration count
 * is reached. Combined with `/compact` for context management, it allows
 * Claude to work on long tasks without losing coherence.
 *
 * Exam concepts:
 * - Plan mode can be toggled with Shift+Tab in the prompt.
 * - In plan mode, Claude explains WHAT it will do before HOW.
 * - The plan includes: files affected, steps, risks, and rollback strategy.
 * - The edit-test-fix cycle is the core agentic loop in Claude Code.
 * - `/compact` summarises the conversation to free up context window space.
 * - Compaction is lossy — details are summarised, not preserved verbatim.
 * - Token threshold triggers automatic compaction suggestions.
 *
 * @module config/plan-mode
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The two execution modes in Claude Code.
 *
 * Exam trap: Plan mode doesn't mean "do nothing" — it means "explain first,
 * then do". The model still makes changes; it just front-loads the reasoning.
 */
export type PlanMode = 'plan' | 'direct';

/**
 * A structured execution plan generated in plan mode.
 *
 * Exam concept: Plans are not just text — they are structured objects with
 * discrete steps, risk assessments, and rollback strategies. This structure
 * lets Claude track progress and recover from failures mid-execution.
 */
export interface ExecutionPlan {
  /** Human-readable title summarising the task */
  title: string;

  /** High-level description of what the plan achieves */
  description: string;

  /** Ordered list of execution steps */
  steps: PlanStep[];

  /** Files that will be created, modified, or deleted */
  filesAffected: FileChange[];

  /** Identified risks and their mitigations */
  risks: Risk[];

  /** Estimated complexity: low, medium, high */
  complexity: 'low' | 'medium' | 'high';
}

/** A single step in an execution plan. */
export interface PlanStep {
  /** Step number (1-based) */
  order: number;

  /** What this step does */
  description: string;

  /** Files touched in this step */
  files: string[];

  /** Whether this step has been completed */
  completed: boolean;

  /**
   * Checkpoint flag — if true, Claude pauses after this step to verify
   * correctness before continuing. Exam concept: Checkpoints are the
   * "safety net" that makes plan mode reliable for large changes.
   */
  checkpoint: boolean;
}

/** A file change entry in a plan. */
export interface FileChange {
  path: string;
  action: 'create' | 'modify' | 'delete';
  description: string;
}

/** A risk identified during planning. */
export interface Risk {
  description: string;
  severity: 'low' | 'medium' | 'high';
  mitigation: string;
}

/**
 * Task context provided to the plan mode decider.
 *
 * Exam concept: The decider uses heuristics, not hard rules. The context
 * includes signals like file count, familiarity, and task type — but the
 * final decision is a judgment call, not a formula.
 */
export interface TaskContext {
  /** Natural language description of the task */
  description: string;

  /** How many files are likely affected */
  estimatedFileCount: number;

  /** Has the user worked in this area of the codebase before? */
  isFamiliarArea: boolean;

  /** Type of task: feature, bugfix, refactor, docs, test */
  taskType: 'feature' | 'bugfix' | 'refactor' | 'docs' | 'test';

  /** Current codebase size (number of source files) */
  codebaseSize: number;
}

// ---------------------------------------------------------------------------
// PlanModeDecider
// ---------------------------------------------------------------------------

/**
 * Decides whether to use plan mode or direct mode for a given task.
 *
 * The heuristics mirror what an experienced developer would do:
 * - Simple typo fix? → Direct. Don't overthink it.
 * - Multi-file refactor in unfamiliar code? → Plan. Map the territory first.
 *
 * Exam scenario:
 * ```
 * const decider = new PlanModeDecider();
 * const mode = decider.shouldUsePlanMode({
 *   description: "Refactor auth module to use JWT",
 *   estimatedFileCount: 12,
 *   isFamiliarArea: false,
 *   taskType: 'refactor',
 *   codebaseSize: 500,
 * });
 * // → 'plan' — multi-file, unfamiliar, refactor = plan mode
 * ```
 */
export class PlanModeDecider {
  /** Threshold: tasks affecting more files than this suggest plan mode. */
  private readonly multiFileThreshold: number;

  /** Threshold: codebases larger than this suggest plan mode for refactors. */
  private readonly largeCodebaseThreshold: number;

  constructor(options?: { multiFileThreshold?: number; largeCodebaseThreshold?: number }) {
    this.multiFileThreshold = options?.multiFileThreshold ?? 3;
    this.largeCodebaseThreshold = options?.largeCodebaseThreshold ?? 100;
  }

  /**
   * Determine whether plan mode should be used.
   *
   * Heuristics (exam-testable):
   * 1. Multi-file changes (>3 files) → plan
   * 2. Unfamiliar codebase area → plan
   * 3. Refactors → plan (they have cascading effects)
   * 4. Large codebase + feature → plan (need to understand impact)
   * 5. Simple bugfix in familiar code → direct
   * 6. Documentation changes → direct (low risk)
   *
   * Exam trap: These are heuristics, not absolute rules. The user can always
   * override by pressing Shift+Tab to toggle the mode manually.
   */
  shouldUsePlanMode(context: TaskContext): PlanMode {
    // Documentation is almost always safe to do directly
    if (context.taskType === 'docs') return 'direct';

    // Multi-file changes benefit from planning
    if (context.estimatedFileCount > this.multiFileThreshold) return 'plan';

    // Unfamiliar area + non-trivial task → plan
    if (!context.isFamiliarArea && context.taskType !== 'test') return 'plan';

    // Refactors have cascading effects — always plan
    if (context.taskType === 'refactor') return 'plan';

    // Large codebase + feature work → plan to understand impact
    if (context.codebaseSize > this.largeCodebaseThreshold && context.taskType === 'feature') {
      return 'plan';
    }

    // Default: direct mode for simple, familiar tasks
    return 'direct';
  }

  /**
   * Create a structured execution plan for a task.
   *
   * Exam concept: The plan is a living document — steps can be marked
   * complete, new risks can be added, and the plan can be revised mid-flight.
   * This is different from a static design doc.
   */
  createPlan(task: string, context: TaskContext): ExecutionPlan {
    const complexity = this.assessComplexity(context);
    const steps = this.generateSteps(task, context);
    const risks = this.identifyRisks(context);

    return {
      title: `Plan: ${task.substring(0, 80)}`,
      description: task,
      steps,
      filesAffected: this.estimateFileChanges(context),
      risks,
      complexity,
    };
  }

  /**
   * Execute a plan step-by-step, pausing at checkpoints.
   *
   * Exam concept: Execution is incremental. After each checkpoint step,
   * Claude verifies the changes work before proceeding. If a step fails,
   * Claude can revise the remaining plan — this is the "adaptive planning"
   * that distinguishes Claude Code from simple script runners.
   *
   * @returns An async generator yielding step results as they complete.
   */
  async *executePlan(plan: ExecutionPlan): AsyncGenerator<{
    step: PlanStep;
    status: 'completed' | 'failed';
    error?: string;
  }> {
    for (const step of plan.steps) {
      try {
        // In production, this would invoke Claude Code's tool system
        // to actually make the changes. Here we simulate step execution.
        step.completed = true;

        yield { step, status: 'completed' };

        // Checkpoint: pause for verification
        if (step.checkpoint) {
          // In production, Claude would run tests or ask for confirmation
          // before proceeding to the next step.
        }
      } catch (error) {
        yield {
          step,
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  private assessComplexity(context: TaskContext): 'low' | 'medium' | 'high' {
    if (context.estimatedFileCount > 10 || context.taskType === 'refactor') return 'high';
    if (context.estimatedFileCount > 3 || !context.isFamiliarArea) return 'medium';
    return 'low';
  }

  private generateSteps(task: string, context: TaskContext): PlanStep[] {
    const steps: PlanStep[] = [
      {
        order: 1,
        description: `Analyse current state: understand ${context.taskType} scope`,
        files: [],
        completed: false,
        checkpoint: false,
      },
      {
        order: 2,
        description: `Implement changes: ${task.substring(0, 60)}`,
        files: [],
        completed: false,
        checkpoint: true, // always checkpoint after main implementation
      },
      {
        order: 3,
        description: 'Run tests and verify no regressions',
        files: [],
        completed: false,
        checkpoint: true,
      },
    ];

    // Add extra steps for complex tasks
    if (context.estimatedFileCount > 5) {
      steps.splice(1, 0, {
        order: 2,
        description: 'Create/update tests for new behaviour',
        files: [],
        completed: false,
        checkpoint: false,
      });
      // Renumber
      steps.forEach((s, i) => (s.order = i + 1));
    }

    return steps;
  }

  private identifyRisks(context: TaskContext): Risk[] {
    const risks: Risk[] = [];

    if (!context.isFamiliarArea) {
      risks.push({
        description: 'Working in unfamiliar code — may miss implicit dependencies',
        severity: 'medium',
        mitigation: 'Run full test suite after changes; review git blame for context',
      });
    }

    if (context.estimatedFileCount > 5) {
      risks.push({
        description: 'Large change surface — higher chance of merge conflicts',
        severity: 'high',
        mitigation: 'Commit incrementally; use feature branch with frequent rebases',
      });
    }

    if (context.taskType === 'refactor') {
      risks.push({
        description: 'Refactoring may break downstream consumers',
        severity: 'high',
        mitigation: 'Check for callers before modifying signatures; run integration tests',
      });
    }

    return risks;
  }

  private estimateFileChanges(context: TaskContext): FileChange[] {
    // In production, Claude would analyse the codebase to determine actual files.
    // Here we return a placeholder structure.
    return Array.from({ length: Math.min(context.estimatedFileCount, 5) }, (_, i) => ({
      path: `file-${i + 1}`,
      action: 'modify' as const,
      description: `${context.taskType} changes`,
    }));
  }
}

// ---------------------------------------------------------------------------
// Task 3.5: RefinementLoop — Edit-Test-Fix Cycle
// ---------------------------------------------------------------------------

/**
 * Represents a single change in the edit-test-fix cycle.
 */
export interface ChangeAttempt {
  /** Description of what was changed */
  description: string;

  /** Files that were modified */
  filesModified: string[];

  /** Test command to verify the change */
  testCommand: string;
}

/**
 * Result of running a test after a change.
 */
export interface TestResult {
  passed: boolean;
  output: string;
  failureReason?: string;
}

/**
 * Implements the iterative edit-test-fix cycle that makes Claude Code reliable.
 *
 * The loop is simple but powerful:
 *   1. Make an edit
 *   2. Run tests
 *   3. If tests fail → analyse failure → fix → go to 2
 *   4. If tests pass → done
 *
 * This is the same workflow a human developer follows, but automated. The key
 * insight is that Claude doesn't need to get it right the first time — it
 * just needs to converge on a correct solution through iteration.
 *
 * Exam concepts:
 * - The cycle has a maximum iteration count (default: 5) to prevent infinite loops.
 * - Each iteration adds to the context window, which is why `/compact` exists.
 * - The fix step uses the test output to inform the next edit — this is the
 *   "feedback loop" that makes the agentic approach work.
 * - `/compact` summarises the conversation to free context space, but it's
 *   lossy — fine details may be lost in the summary.
 */
export class RefinementLoop {
  /** Maximum number of edit-test-fix iterations before giving up. */
  private readonly maxIterations: number;

  /** Token threshold for suggesting compaction. */
  private readonly compactionThreshold: number;

  constructor(options?: { maxIterations?: number; compactionThreshold?: number }) {
    this.maxIterations = options?.maxIterations ?? 5;
    this.compactionThreshold = options?.compactionThreshold ?? 80_000;
  }

  /**
   * Execute the edit-test-fix cycle for a given change.
   *
   * Exam concept: This is the core "agentic loop". Each iteration:
   * 1. Applies the change (or fix from previous iteration)
   * 2. Runs the test command
   * 3. If passed → return success
   * 4. If failed → generate fix based on test output → iterate
   *
   * The `runTest` callback simulates the test runner — in production, Claude
   * Code invokes the actual test command via the shell tool.
   */
  async editTestFixCycle(
    change: ChangeAttempt,
    runTest: (command: string) => Promise<TestResult>,
  ): Promise<{
    success: boolean;
    iterations: number;
    history: Array<{ attempt: number; testResult: TestResult }>;
  }> {
    const history: Array<{ attempt: number; testResult: TestResult }> = [];

    for (let attempt = 1; attempt <= this.maxIterations; attempt++) {
      const result = await runTest(change.testCommand);
      history.push({ attempt, testResult: result });

      if (result.passed) {
        return { success: true, iterations: attempt, history };
      }

      // In production, Claude would analyse result.output and result.failureReason
      // to generate a targeted fix. The fix becomes the next change attempt.
      // Here we simulate by continuing the loop.
    }

    return { success: false, iterations: this.maxIterations, history };
  }

  /**
   * Compact conversation history by summarising it.
   *
   * The `/compact` command in Claude Code triggers this behaviour. It takes
   * the full conversation history and produces a condensed summary that
   * preserves the essential context while freeing up token space.
   *
   * Exam concepts:
   * - Compaction is lossy — you lose verbatim details but keep the gist.
   * - The summary includes: what was done, what files were changed, what
   *   decisions were made, and what remains to be done.
   * - Compaction resets the conversation but carries forward the summary
   *   as a "memory" block at the top of the new context.
   * - Users can trigger compaction manually (`/compact`) or Claude may
   *   suggest it when approaching the context limit.
   *
   * @param history  Array of conversation entries to summarise.
   * @returns        A compact summary string.
   */
  compactContext(history: Array<{ role: string; content: string }>): string {
    // Count significant entries (non-empty messages)
    const significantEntries = history.filter((h) => h.content.trim().length > 0);
    const totalTokenEstimate = significantEntries.reduce(
      (sum, h) => sum + Math.ceil(h.content.length / 4), // rough token estimate
      0,
    );

    const summary = [
      '## Conversation Summary (compacted)',
      '',
      `**Entries processed**: ${significantEntries.length}`,
      `**Estimated tokens before compaction**: ${totalTokenEstimate}`,
      '',
      '### Key decisions:',
      ...this.extractKeyDecisions(history),
      '',
      '### Files modified:',
      ...this.extractFileReferences(history),
      '',
      '### Remaining work:',
      '- Continue from last completed step',
      '- Run tests to verify current state',
    ];

    return summary.join('\n');
  }

  /**
   * Determine whether compaction should be triggered based on token usage.
   *
   * Exam concept: The threshold is typically 80% of the model's context window.
   * For Claude with 200k tokens, that's ~160k. Compaction at 80% leaves room
   * for the summary itself plus continued conversation.
   *
   * @param tokenCount  Current estimated token count in the conversation.
   * @param maxTokens   Maximum context window size.
   * @returns           True if compaction should be triggered.
   */
  shouldCompact(tokenCount: number, maxTokens: number): boolean {
    const threshold = maxTokens * (this.compactionThreshold / 100_000);
    return tokenCount >= threshold;
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /** Extract key decisions from conversation history. */
  private extractKeyDecisions(
    history: Array<{ role: string; content: string }>,
  ): string[] {
    const decisions: string[] = [];
    for (const entry of history) {
      if (entry.role === 'assistant' && entry.content.includes('decided')) {
        const snippet = entry.content.substring(0, 100).replace(/\n/g, ' ');
        decisions.push(`- ${snippet}...`);
      }
    }
    return decisions.length > 0 ? decisions : ['- No explicit decisions recorded'];
  }

  /** Extract file path references from conversation history. */
  private extractFileReferences(
    history: Array<{ role: string; content: string }>,
  ): string[] {
    const filePatterns = /(?:[\w-]+\/)*[\w-]+\.\w{1,5}/g;
    const files = new Set<string>();

    for (const entry of history) {
      const matches = entry.content.match(filePatterns);
      if (matches) {
        for (const m of matches) files.add(m);
      }
    }

    return files.size > 0
      ? [...files].slice(0, 10).map((f) => `- ${f}`)
      : ['- No file references found'];
  }
}
