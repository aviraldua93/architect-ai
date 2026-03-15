/**
 * @module workflow-enforcer
 * @description Workflow Enforcement — the critical distinction between
 * PROGRAMMATIC enforcement and PROMPT-BASED guidance.
 *
 * @exam Domain 1.4 — Workflow Enforcement
 *
 * THE FUNDAMENTAL INSIGHT (EXAM FAVOURITE):
 *
 *   PROGRAMMATIC enforcement = DETERMINISTIC. Code runs every time.
 *   If a financial transaction exceeds $10K, a programmatic rule WILL block it.
 *   There is zero probability of the check being skipped.
 *
 *   PROMPT-BASED guidance = PROBABILISTIC. You can instruct the model
 *   "keep responses under 500 words" but it might produce 600. Prompt
 *   instructions are suggestions that the model follows MOST of the time,
 *   but not ALL of the time.
 *
 * WHEN TO USE WHICH:
 *   - Compliance, financial limits, PII redaction → ALWAYS programmatic.
 *     These are invariants — violations have legal/financial consequences.
 *   - Tone, style, formatting preferences → prompt-based is fine.
 *     A slightly wrong tone is annoying, not catastrophic.
 *
 * The exam tests whether you know that "prompts are probabilistic,
 * code is deterministic" and can apply this to real-world scenarios.
 *
 * HUMAN-IN-THE-LOOP (HITL):
 * For high-stakes decisions where full automation is too risky but
 * full manual processing is too slow, we route to a human review queue.
 * The handoff must be STRUCTURED and SELF-CONTAINED — the reviewer
 * does NOT have the conversation transcript.
 *
 * @author Ravi Krishnan, CLI & Platform Engineer — ArchitectAI
 */

import type { MessageParam } from "./types";

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

/**
 * Enforcement type determines HOW a rule is applied.
 *
 * @exam Domain 1.4 — This is the most-tested distinction in workflow enforcement:
 *   - 'programmatic': Code-level checks that ALWAYS execute. Cannot be bypassed
 *     by prompt injection or model creativity. Use for compliance invariants.
 *   - 'prompt_based': Instructions injected into the system prompt. The model
 *     follows them ~95% of the time but may deviate. Use for preferences.
 */
export type EnforcementType = "programmatic" | "prompt_based";

/**
 * A single workflow rule that the enforcer evaluates.
 *
 * Programmatic rules have a `check` function that returns pass/fail.
 * Prompt-based rules have `promptGuidance` text injected into the system prompt.
 *
 * @exam Domain 1.4 — Rules encode the organisation's policies. The enforcement
 * type determines whether they're guaranteed (programmatic) or best-effort
 * (prompt-based).
 */
export interface WorkflowRule {
  /** Unique identifier for this rule (e.g. "fin-txn-limit", "pii-redact"). */
  ruleId: string;
  /** Human-readable description of what this rule enforces. */
  description: string;
  /** Whether this rule is enforced by code or by prompt instruction. */
  enforcement: EnforcementType;
  /**
   * For PROGRAMMATIC rules: a check function that evaluates the tool call.
   * Returns `{ passed: true }` or `{ passed: false, violation: "reason" }`.
   *
   * For PROMPT-BASED rules: this is optional (the rule is enforced via
   * prompt text, not a check function).
   */
  check?: (
    toolName: string,
    params: Record<string, unknown>,
  ) => RuleCheckResult | Promise<RuleCheckResult>;
  /**
   * For PROMPT-BASED rules: text injected into the system prompt.
   * Ignored for programmatic rules (they use the check function).
   */
  promptGuidance?: string;
  /**
   * Action to take when a programmatic rule is violated.
   *   - 'block': Prevent the tool call entirely (default for compliance).
   *   - 'warn': Log a warning but allow the call (for soft limits).
   *   - 'human_review': Route to the human-in-the-loop queue.
   */
  onViolation: "block" | "warn" | "human_review";
}

/**
 * Result of evaluating a programmatic rule's check function.
 */
export interface RuleCheckResult {
  passed: boolean;
  /** Present when `passed` is false — explains why the rule was violated. */
  violation?: string;
}

/**
 * Result of running all enforcement checks before a tool call.
 */
export interface EnforcementResult {
  /** Whether the tool call is allowed to proceed. */
  allowed: boolean;
  /** Violations from programmatic rules that failed. */
  violations: Array<{
    ruleId: string;
    description: string;
    violation: string;
    action: "block" | "warn" | "human_review";
  }>;
  /** Items routed to human review (if any rules triggered HITL). */
  humanReviewItems: StructuredHandoff[];
}

/**
 * Result of running post-execution checks after a tool call.
 */
export interface PostExecutionResult {
  /** Whether all post-execution checks passed. */
  passed: boolean;
  /** Violations detected in the tool's output. */
  violations: Array<{
    ruleId: string;
    description: string;
    violation: string;
  }>;
}

// ---------------------------------------------------------------------------
// Human-in-the-loop types
// ---------------------------------------------------------------------------

/**
 * Risk level for human review handoffs.
 *
 * @exam Domain 1.4 — The exam tests whether you understand that risk
 * assessment should influence the handoff process: HIGH risk items
 * need faster SLAs and more context.
 */
export type RiskLevel = "low" | "medium" | "high" | "critical";

/**
 * A structured handoff for human review.
 *
 * CRITICAL EXAM CONCEPT: The handoff must be SELF-CONTAINED. The human
 * reviewer does NOT have access to the full conversation transcript.
 * Everything they need to make a decision must be in this object:
 *   - What happened (context)
 *   - What the system recommends (recommendation)
 *   - Why it was flagged (riskLevel + ruleId)
 *   - What the options are (the reviewer can approve, reject, or modify)
 *
 * If the handoff is missing context, the reviewer either makes a blind
 * decision (dangerous) or has to reconstruct the context (slow and expensive).
 *
 * @exam Domain 1.4 — Structured handoff for human-in-the-loop review.
 */
export interface StructuredHandoff {
  /** Unique ID for tracking this handoff through the review queue. */
  handoffId: string;
  /** The rule that triggered the handoff. */
  ruleId: string;
  /** When the handoff was created. */
  timestamp: string;
  /** Risk assessment for prioritising the review queue. */
  riskLevel: RiskLevel;
  /**
   * Self-contained context summary. The reviewer sees ONLY this — not
   * the full transcript. Include all relevant facts, amounts, entities.
   */
  context: string;
  /** The system's recommendation (approve, reject, modify with specifics). */
  recommendation: string;
  /** The tool call that triggered the review (name + params). */
  triggeredBy: {
    toolName: string;
    params: Record<string, unknown>;
  };
  /** Current status in the review pipeline. */
  status: "pending" | "approved" | "rejected" | "modified";
  /** Reviewer's decision and notes (populated after review). */
  reviewerNotes?: string;
}

// ---------------------------------------------------------------------------
// WorkflowEnforcer class
// ---------------------------------------------------------------------------

/**
 * Central enforcement engine that evaluates workflow rules against tool calls.
 *
 * The enforcer maintains two categories of rules:
 *   1. PROGRAMMATIC rules — evaluated via check functions, provide guarantees.
 *   2. PROMPT-BASED rules — converted to system prompt text, provide guidance.
 *
 * @exam Domain 1.4 — Workflow Enforcement
 *
 * WHY SEPARATE THEM?
 * Because mixing them creates false confidence. If you put "never allow
 * transactions over $10K" in the prompt AND in code, a junior developer
 * might think removing the code is safe because "the prompt handles it".
 * By explicitly categorising rules, the codebase documents which guarantees
 * are hard (code) and which are soft (prompt).
 *
 * @example
 * ```ts
 * const enforcer = new WorkflowEnforcer();
 *
 * // Programmatic: ALWAYS blocks transactions > $10K
 * enforcer.registerRule(createFinancialLimitRule(10_000));
 *
 * // Prompt-based: suggests concise formatting
 * enforcer.registerRule(createToneGuidanceRule());
 *
 * // Before a tool call:
 * const result = await enforcer.enforceBeforeToolCall("transfer_funds", { amount: 50000 });
 * if (!result.allowed) {
 *   // Blocked by programmatic rule — guaranteed enforcement
 * }
 *
 * // Get prompt guidance for system prompt injection:
 * const guidance = enforcer.getPromptGuidance();
 * // → Inject into the system prompt for soft enforcement
 * ```
 */
export class WorkflowEnforcer {
  private rules: Map<string, WorkflowRule> = new Map();
  private humanReviewQueue: StructuredHandoff[] = [];

  /**
   * Post-execution check functions registered for output validation.
   * These run AFTER a tool call completes to validate the result.
   */
  private postChecks: Array<{
    ruleId: string;
    description: string;
    check: (
      toolName: string,
      result: unknown,
    ) => RuleCheckResult | Promise<RuleCheckResult>;
  }> = [];

  // -----------------------------------------------------------------------
  // Rule registration
  // -----------------------------------------------------------------------

  /**
   * Register a workflow rule.
   *
   * Programmatic rules must have a `check` function.
   * Prompt-based rules must have `promptGuidance` text.
   *
   * @throws If a programmatic rule is missing its check function.
   * @throws If a prompt-based rule is missing its guidance text.
   */
  registerRule(rule: WorkflowRule): void {
    if (rule.enforcement === "programmatic" && !rule.check) {
      throw new Error(
        `Programmatic rule "${rule.ruleId}" must have a check function. ` +
          `Programmatic rules are code-level guarantees — they need executable logic.`,
      );
    }

    if (rule.enforcement === "prompt_based" && !rule.promptGuidance) {
      throw new Error(
        `Prompt-based rule "${rule.ruleId}" must have promptGuidance text. ` +
          `Prompt-based rules work by injecting instructions into the system prompt.`,
      );
    }

    this.rules.set(rule.ruleId, rule);
  }

  /**
   * Register a post-execution check that validates tool output.
   *
   * Unlike pre-execution checks (which evaluate inputs), post-execution
   * checks evaluate outputs — useful for detecting PII in responses,
   * validating output schemas, etc.
   */
  registerPostCheck(
    ruleId: string,
    description: string,
    check: (
      toolName: string,
      result: unknown,
    ) => RuleCheckResult | Promise<RuleCheckResult>,
  ): void {
    this.postChecks.push({ ruleId, description, check });
  }

  /**
   * Remove a rule by ID.
   */
  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  /**
   * Get all registered rules.
   */
  getRules(): WorkflowRule[] {
    return [...this.rules.values()];
  }

  // -----------------------------------------------------------------------
  // Pre-execution enforcement
  // -----------------------------------------------------------------------

  /**
   * Enforce all PROGRAMMATIC rules before a tool call executes.
   *
   * EXAM CONCEPT: This method runs deterministic checks. Every registered
   * programmatic rule's check function executes. If any rule with
   * `onViolation: 'block'` fails, the tool call is NOT allowed.
   *
   * Rules with `onViolation: 'human_review'` create a StructuredHandoff
   * and add it to the review queue. The tool call is blocked until the
   * human reviewer approves it.
   *
   * Rules with `onViolation: 'warn'` log the violation but allow the call.
   *
   * Prompt-based rules are SKIPPED here — they don't have check functions.
   * They're enforced via getPromptGuidance() injection into the system prompt.
   *
   * @param toolName - The tool about to be called.
   * @param params - The parameters Claude is passing to the tool.
   * @returns Enforcement result indicating whether the call is allowed.
   */
  async enforceBeforeToolCall(
    toolName: string,
    params: Record<string, unknown>,
  ): Promise<EnforcementResult> {
    const result: EnforcementResult = {
      allowed: true,
      violations: [],
      humanReviewItems: [],
    };

    // Only evaluate PROGRAMMATIC rules — prompt-based rules don't have checks.
    const programmaticRules = [...this.rules.values()].filter(
      (r) => r.enforcement === "programmatic" && r.check,
    );

    for (const rule of programmaticRules) {
      const checkResult = await rule.check!(toolName, params);

      if (!checkResult.passed) {
        const violation = {
          ruleId: rule.ruleId,
          description: rule.description,
          violation: checkResult.violation ?? "Rule check failed",
          action: rule.onViolation,
        };

        result.violations.push(violation);

        if (rule.onViolation === "block") {
          // Hard block — the tool call CANNOT proceed.
          result.allowed = false;
        } else if (rule.onViolation === "human_review") {
          // Route to human review — block until approved.
          result.allowed = false;
          const handoff = this.createHandoff(rule, toolName, params, checkResult);
          result.humanReviewItems.push(handoff);
          this.humanReviewQueue.push(handoff);
        }
        // 'warn' — log but allow
      }
    }

    return result;
  }

  // -----------------------------------------------------------------------
  // Post-execution enforcement
  // -----------------------------------------------------------------------

  /**
   * Run post-execution checks after a tool call completes.
   *
   * Useful for detecting PII in outputs, validating response schemas,
   * or flagging suspicious results that passed pre-execution checks but
   * produced problematic output.
   *
   * @param toolName - The tool that was called.
   * @param result - The tool's output.
   * @returns Post-execution result with any violations detected.
   */
  async enforceAfterToolCall(
    toolName: string,
    result: unknown,
  ): Promise<PostExecutionResult> {
    const postResult: PostExecutionResult = {
      passed: true,
      violations: [],
    };

    for (const postCheck of this.postChecks) {
      const checkResult = await postCheck.check(toolName, result);

      if (!checkResult.passed) {
        postResult.passed = false;
        postResult.violations.push({
          ruleId: postCheck.ruleId,
          description: postCheck.description,
          violation: checkResult.violation ?? "Post-execution check failed",
        });
      }
    }

    return postResult;
  }

  // -----------------------------------------------------------------------
  // Prompt guidance (for prompt-based rules)
  // -----------------------------------------------------------------------

  /**
   * Collect all prompt-based rules into a single guidance block.
   *
   * This text should be injected into the system prompt. It provides
   * SOFT enforcement — the model will follow these instructions most
   * of the time, but they are NOT guaranteed.
   *
   * @exam Domain 1.4 — Prompt-based rules are probabilistic. The guidance
   * text here is a best-effort instruction, not a contract. For anything
   * that MUST be enforced, use a programmatic rule instead.
   *
   * @returns A string of prompt guidance text, or empty string if no prompt rules exist.
   */
  getPromptGuidance(): string {
    const promptRules = [...this.rules.values()].filter(
      (r) => r.enforcement === "prompt_based" && r.promptGuidance,
    );

    if (promptRules.length === 0) return "";

    const lines = [
      "## Workflow Guidance (follow these preferences where reasonable):",
      "",
    ];

    for (const rule of promptRules) {
      lines.push(`- [${rule.ruleId}] ${rule.promptGuidance}`);
    }

    return lines.join("\n");
  }

  // -----------------------------------------------------------------------
  // Human-in-the-loop queue management
  // -----------------------------------------------------------------------

  /**
   * Get all pending items in the human review queue.
   */
  getPendingReviews(): StructuredHandoff[] {
    return this.humanReviewQueue.filter((h) => h.status === "pending");
  }

  /**
   * Process a human reviewer's decision on a handoff.
   *
   * @param handoffId - The handoff to resolve.
   * @param decision - The reviewer's decision.
   * @param notes - Optional notes from the reviewer.
   * @returns The updated handoff, or undefined if not found.
   */
  resolveHandoff(
    handoffId: string,
    decision: "approved" | "rejected" | "modified",
    notes?: string,
  ): StructuredHandoff | undefined {
    const handoff = this.humanReviewQueue.find(
      (h) => h.handoffId === handoffId,
    );

    if (!handoff) return undefined;

    handoff.status = decision;
    handoff.reviewerNotes = notes;
    return handoff;
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /**
   * Create a structured handoff for human review.
   *
   * The handoff is SELF-CONTAINED — the reviewer gets all the context
   * they need without access to the conversation transcript.
   */
  private createHandoff(
    rule: WorkflowRule,
    toolName: string,
    params: Record<string, unknown>,
    checkResult: RuleCheckResult,
  ): StructuredHandoff {
    // Assess risk based on the rule and violation details.
    const riskLevel = this.assessRisk(rule, params);

    return {
      handoffId: `hitl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ruleId: rule.ruleId,
      timestamp: new Date().toISOString(),
      riskLevel,
      context:
        `Tool "${toolName}" was called with parameters that violate rule ` +
        `"${rule.ruleId}" (${rule.description}). ` +
        `Violation: ${checkResult.violation ?? "Check failed"}. ` +
        `Parameters: ${JSON.stringify(params, null, 2)}`,
      recommendation: this.buildRecommendation(rule, params),
      triggeredBy: { toolName, params },
      status: "pending",
    };
  }

  /**
   * Assess risk level based on the rule and parameters.
   */
  private assessRisk(
    rule: WorkflowRule,
    params: Record<string, unknown>,
  ): RiskLevel {
    // Financial rules with large amounts are higher risk.
    if (rule.ruleId.startsWith("fin-")) {
      const amount =
        typeof params["amount"] === "number" ? params["amount"] : 0;
      if (amount > 100_000) return "critical";
      if (amount > 50_000) return "high";
      if (amount > 10_000) return "medium";
      return "low";
    }

    // PII rules are always high risk (regulatory exposure).
    if (rule.ruleId.startsWith("pii-")) return "high";

    // Regulatory compliance rules are critical.
    if (rule.ruleId.startsWith("reg-")) return "critical";

    return "medium";
  }

  /**
   * Build a recommendation string for the human reviewer.
   */
  private buildRecommendation(
    rule: WorkflowRule,
    params: Record<string, unknown>,
  ): string {
    if (rule.onViolation === "block") {
      return (
        `RECOMMEND REJECT: This violates rule "${rule.ruleId}" which is ` +
        `configured to block. Override only with documented justification.`
      );
    }

    return (
      `REVIEW REQUIRED: Rule "${rule.ruleId}" flagged this for human review. ` +
      `Evaluate the parameters and approve, reject, or modify as appropriate.`
    );
  }
}

// ---------------------------------------------------------------------------
// Example rules — demonstrating exam concepts
// ---------------------------------------------------------------------------

/**
 * PROGRAMMATIC RULE: Financial transaction limit.
 *
 * @exam Domain 1.4 — This is the canonical example of why programmatic
 * enforcement exists. A prompt instruction like "don't allow transfers
 * over $10K" might be ignored if the model is coerced via prompt injection
 * or simply makes a mistake. This code-level check CANNOT be bypassed.
 *
 * @param limitAmount - Maximum allowed transaction amount.
 * @param requireApprovalAbove - Optional: amounts above this threshold
 *   route to human review instead of hard blocking.
 */
export function createFinancialLimitRule(
  limitAmount: number,
  requireApprovalAbove?: number,
): WorkflowRule {
  return {
    ruleId: "fin-txn-limit",
    description: `Block financial transactions exceeding $${limitAmount.toLocaleString()}`,
    enforcement: "programmatic",
    onViolation: requireApprovalAbove ? "human_review" : "block",
    check: (toolName: string, params: Record<string, unknown>) => {
      // Only applies to financial tools.
      const financialTools = new Set([
        "transfer_funds",
        "process_payment",
        "issue_refund",
        "create_invoice",
      ]);

      if (!financialTools.has(toolName)) {
        return { passed: true };
      }

      const amount = params["amount"];
      if (typeof amount !== "number") {
        return { passed: true };
      }

      const threshold = requireApprovalAbove ?? limitAmount;
      if (amount > threshold) {
        return {
          passed: false,
          violation:
            `Transaction amount $${amount.toLocaleString()} exceeds limit ` +
            `of $${threshold.toLocaleString()}. ` +
            (requireApprovalAbove
              ? "Routing to human approval queue."
              : "Transaction blocked."),
        };
      }

      return { passed: true };
    },
  };
}

/**
 * PROGRAMMATIC RULE: PII detection and redaction.
 *
 * @exam Domain 1.4 — PII handling MUST be programmatic. A prompt saying
 * "redact SSNs" is probabilistic — the model might miss one, especially
 * in large outputs. This code-level check uses regex patterns that
 * ALWAYS catch the patterns they're designed for.
 *
 * Defence in depth: even if the model tries to output PII, this check
 * catches it deterministically.
 */
export function createPiiDetectionRule(): WorkflowRule {
  // Common PII patterns (US-centric for this example).
  const PII_PATTERNS = [
    { name: "SSN", pattern: /\b\d{3}-\d{2}-\d{4}\b/ },
    { name: "Credit Card", pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/ },
    { name: "Email", pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b/i },
    { name: "Phone (US)", pattern: /\b\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/ },
  ];

  return {
    ruleId: "pii-detect",
    description: "Detect and block tool calls containing PII in parameters",
    enforcement: "programmatic",
    onViolation: "block",
    check: (_toolName: string, params: Record<string, unknown>) => {
      const serialised = JSON.stringify(params);
      const detectedTypes: string[] = [];

      for (const { name, pattern } of PII_PATTERNS) {
        if (pattern.test(serialised)) {
          detectedTypes.push(name);
        }
      }

      if (detectedTypes.length > 0) {
        return {
          passed: false,
          violation:
            `PII detected in tool parameters: ${detectedTypes.join(", ")}. ` +
            `Redact all personally identifiable information before proceeding.`,
        };
      }

      return { passed: true };
    },
  };
}

/**
 * PROGRAMMATIC RULE: Regulatory compliance — audit trail enforcement.
 *
 * @exam Domain 1.4 — In regulated industries (finance, healthcare), every
 * data-modifying operation must produce an audit record. This rule ensures
 * that any tool call to a write/update/delete endpoint includes an
 * `auditReason` parameter. Without it, the operation is blocked.
 *
 * This is a hard compliance requirement — it cannot be a prompt suggestion.
 */
export function createRegulatoryComplianceRule(): WorkflowRule {
  return {
    ruleId: "reg-audit-trail",
    description: "Require audit trail metadata for all data-modifying operations",
    enforcement: "programmatic",
    onViolation: "block",
    check: (toolName: string, params: Record<string, unknown>) => {
      // Identify data-modifying tools by naming convention.
      const isModifying =
        toolName.startsWith("create_") ||
        toolName.startsWith("update_") ||
        toolName.startsWith("delete_") ||
        toolName.startsWith("modify_");

      if (!isModifying) {
        return { passed: true };
      }

      if (!params["auditReason"] || typeof params["auditReason"] !== "string") {
        return {
          passed: false,
          violation:
            `Data-modifying tool "${toolName}" requires an "auditReason" parameter ` +
            `for regulatory compliance. Include a string explaining why this ` +
            `operation is being performed.`,
        };
      }

      if ((params["auditReason"] as string).length < 10) {
        return {
          passed: false,
          violation:
            `Audit reason must be at least 10 characters. Provided: ` +
            `"${params["auditReason"]}". Please provide a meaningful explanation.`,
        };
      }

      return { passed: true };
    },
  };
}

/**
 * PROMPT-BASED RULE: Tone and style guidance.
 *
 * @exam Domain 1.4 — This is fine as a prompt-based rule because tone
 * violations are not catastrophic. If the model is slightly more formal
 * than requested, no compliance law is broken. Prompt-based enforcement
 * is appropriate for PREFERENCES, not REQUIREMENTS.
 */
export function createToneGuidanceRule(): WorkflowRule {
  return {
    ruleId: "style-tone",
    description: "Guide the model toward a professional but approachable tone",
    enforcement: "prompt_based",
    onViolation: "warn",
    promptGuidance:
      "Use a professional but approachable tone. Avoid jargon where possible. " +
      "When explaining technical concepts, use analogies. Address the user directly.",
  };
}

/**
 * PROMPT-BASED RULE: Response length suggestions.
 *
 * @exam Domain 1.4 — Response length is a preference, not a compliance
 * requirement. The model might produce slightly longer or shorter responses
 * and that's acceptable. Programmatic enforcement of length would require
 * truncating responses, which could destroy important information.
 */
export function createResponseLengthRule(): WorkflowRule {
  return {
    ruleId: "style-length",
    description: "Suggest concise responses under 300 words for simple queries",
    enforcement: "prompt_based",
    onViolation: "warn",
    promptGuidance:
      "For straightforward questions, aim for responses under 300 words. " +
      "For complex topics, use structured sections with headers. " +
      "Always prioritise clarity over brevity.",
  };
}

/**
 * PROMPT-BASED RULE: Optional formatting preferences.
 *
 * @exam Domain 1.4 — Formatting is inherently flexible. Markdown, bullet
 * points, or prose are all acceptable depending on context. This is a
 * textbook case for prompt-based guidance.
 */
export function createFormattingPreferenceRule(): WorkflowRule {
  return {
    ruleId: "style-formatting",
    description: "Suggest consistent formatting with markdown and structured output",
    enforcement: "prompt_based",
    onViolation: "warn",
    promptGuidance:
      "Use markdown formatting for structured output. Use bullet points for lists " +
      "of 3+ items. Use code blocks with language tags for code snippets. " +
      "Use tables for comparative data when appropriate.",
  };
}
