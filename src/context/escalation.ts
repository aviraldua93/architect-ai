/**
 * @module context/escalation
 * @description Escalation patterns for adaptive study assistance.
 *
 * @exam Domain 5.2 — Escalation Patterns (Tier 1 → Tier 2 → Tier 3)
 *
 * CRITICAL EXAM CONCEPT (5.2): Escalation in an agent system means
 * transitioning from a simpler handling tier to a more capable one when
 * the current tier cannot adequately serve the user. In ArchitectAI:
 *
 *   TIER 1 — Standard study flow: Quiz questions, simple explanations,
 *   progress tracking. Handles ~80% of interactions.
 *
 *   TIER 2 — Adaptive assistance: The student is stuck on a concept
 *   despite multiple attempts. The agent switches to a deeper
 *   explanation mode with more context, analogies, and code examples.
 *
 *   TIER 3 — Expert intervention: The student has persistent
 *   misconceptions that adaptive assistance hasn't resolved.
 *   The agent flags the situation for human review or generates
 *   a comprehensive diagnostic report.
 *
 * ESCALATION TRIGGERS:
 *   - Repeated incorrect answers in the same domain/task
 *   - Low confidence scores alongside correct answers (guessing)
 *   - Declining performance trend (getting worse, not better)
 *   - Student explicitly expressing confusion or frustration
 *
 * ANTI-PATTERN: Escalating too eagerly wastes resources and can
 * frustrate students who just need one more attempt. Escalating
 * too late leaves students stuck and disengaged.
 *
 * @author Diego Morales, Context Systems Engineer — ArchitectAI
 */

import type { AnswerRecord } from "./session-manager.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Minimum number of answers in a domain before escalation is considered.
 * We need enough data to detect a pattern — not just a single wrong answer.
 */
const MIN_ANSWERS_FOR_ESCALATION = 3;

/**
 * If the student gets this many consecutive wrong answers in the same
 * domain, escalate to Tier 2.
 */
const CONSECUTIVE_WRONG_THRESHOLD = 3;

/**
 * If the student's score in a domain drops by this many percentage points
 * over their last N answers, escalate to Tier 2.
 */
const DECLINING_TREND_THRESHOLD = 20;

/**
 * Number of recent answers to consider for trend analysis.
 */
const TREND_WINDOW_SIZE = 5;

/**
 * If Tier 2 assistance doesn't improve scores after this many additional
 * answers, escalate to Tier 3.
 */
const TIER_3_ESCALATION_THRESHOLD = 5;

/**
 * Confidence threshold: if the user reports confidence below this value
 * despite answering correctly, they may be guessing.
 */
const GUESSING_CONFIDENCE_THRESHOLD = 0.3;

/**
 * Minimum confidence for an assessment to be considered reliable.
 *
 * @exam Domain 5.2 — Confidence calibration: if the student's
 * self-reported confidence is consistently very different from their
 * actual performance, the assessment may not be reliable.
 */
const RELIABLE_CONFIDENCE_THRESHOLD = 0.5;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The escalation tier.
 */
export type EscalationTier = 1 | 2 | 3;

/**
 * The reason for escalation.
 */
export type EscalationReason =
  | "consecutive_wrong_answers"
  | "declining_performance"
  | "low_confidence_correct"
  | "persistent_weakness"
  | "tier_2_insufficient";

/**
 * Structured escalation context passed to the next tier's handler.
 *
 * @exam Domain 5.2 — Escalation data must be structured so the
 * receiving tier can understand WHY escalation occurred and WHAT
 * specific help the student needs.
 */
export interface EscalationContext {
  /** The tier we're escalating TO. */
  targetTier: EscalationTier;
  /** The tier we're escalating FROM. */
  sourceTier: EscalationTier;
  /** Why escalation was triggered. */
  reason: EscalationReason;
  /** Human-readable explanation of the escalation trigger. */
  explanation: string;
  /** The domain that triggered escalation. */
  domain: number;
  /** Optional: specific task statement(s) causing difficulty. */
  taskStatements?: string[];
  /** The student's recent answer history in this domain. */
  recentAnswers: AnswerRecord[];
  /** The student's current score in this domain. */
  currentScore: number;
  /** Recommended actions for the receiving tier. */
  recommendedActions: string[];
  /** Confidence data if available. */
  confidenceData?: {
    averageConfidence: number;
    isReliable: boolean;
    calibrationGap: number;
  };
}

/**
 * Result of an escalation check.
 */
export interface EscalationCheckResult {
  /** Whether escalation should occur. */
  shouldEscalate: boolean;
  /** The escalation context (present if shouldEscalate is true). */
  context?: EscalationContext;
}

// ---------------------------------------------------------------------------
// Escalation detection
// ---------------------------------------------------------------------------

/**
 * Determine whether a study session should escalate from the current tier.
 *
 * This function analyses the student's recent performance and detects
 * patterns that indicate they need more help than the current tier provides.
 *
 * @exam Domain 5.2 — Escalation detection uses multiple signals:
 *   - Consecutive wrong answers (immediate frustration signal)
 *   - Declining trend (getting worse despite practice)
 *   - Low confidence with correct answers (guessing, not learning)
 *   - Persistent weakness after Tier 2 (needs expert intervention)
 *
 * @param answers - The student's answer history.
 * @param currentTier - The current escalation tier (1, 2, or 3).
 * @param domain - The domain to check for escalation.
 * @returns An EscalationCheckResult with the decision and context.
 *
 * @example
 * ```ts
 * const result = shouldEscalate(session.answers, 1, 2);
 * if (result.shouldEscalate && result.context) {
 *   // Switch to Tier 2 handling
 *   console.log(`Escalating: ${result.context.explanation}`);
 * }
 * ```
 */
export function shouldEscalate(
  answers: AnswerRecord[],
  currentTier: EscalationTier,
  domain: number,
): EscalationCheckResult {
  // Filter to the relevant domain
  const domainAnswers = answers.filter((a) => a.domain === domain);

  // Not enough data to decide
  if (domainAnswers.length < MIN_ANSWERS_FOR_ESCALATION) {
    return { shouldEscalate: false };
  }

  // Already at Tier 3 — no further escalation possible
  if (currentTier >= 3) {
    return { shouldEscalate: false };
  }

  const currentScore = computeScore(domainAnswers);

  // Check Tier 1 → Tier 2 triggers
  if (currentTier === 1) {
    // Check for consecutive wrong answers
    const consecutiveWrong = getConsecutiveWrongCount(domainAnswers);
    if (consecutiveWrong >= CONSECUTIVE_WRONG_THRESHOLD) {
      return {
        shouldEscalate: true,
        context: createEscalationContext({
          targetTier: 2,
          sourceTier: 1,
          reason: "consecutive_wrong_answers",
          domain,
          domainAnswers,
          currentScore,
          explanation:
            `Student has answered ${consecutiveWrong} consecutive questions incorrectly ` +
            `in Domain ${domain}. Standard quiz mode is not effective — switching to ` +
            `adaptive assistance with deeper explanations.`,
        }),
      };
    }

    // Check for declining performance trend
    if (hasDeclinedPerformance(domainAnswers)) {
      return {
        shouldEscalate: true,
        context: createEscalationContext({
          targetTier: 2,
          sourceTier: 1,
          reason: "declining_performance",
          domain,
          domainAnswers,
          currentScore,
          explanation:
            `Student's performance in Domain ${domain} is declining despite practice. ` +
            `Score has dropped by more than ${DECLINING_TREND_THRESHOLD}% over the last ` +
            `${TREND_WINDOW_SIZE} answers. Switching to adaptive assistance.`,
        }),
      };
    }

    // Check for guessing pattern (correct answers with very low confidence)
    if (hasGuessingPattern(domainAnswers)) {
      return {
        shouldEscalate: true,
        context: createEscalationContext({
          targetTier: 2,
          sourceTier: 1,
          reason: "low_confidence_correct",
          domain,
          domainAnswers,
          currentScore,
          explanation:
            `Student is answering correctly in Domain ${domain} but reporting very low ` +
            `confidence (below ${GUESSING_CONFIDENCE_THRESHOLD * 100}%). This suggests ` +
            `guessing rather than understanding. Switching to explanatory mode.`,
        }),
      };
    }
  }

  // Check Tier 2 → Tier 3 triggers
  if (currentTier === 2) {
    // If performance hasn't improved after additional Tier 2 practice
    if (domainAnswers.length >= TIER_3_ESCALATION_THRESHOLD + MIN_ANSWERS_FOR_ESCALATION) {
      const recentAnswers = domainAnswers.slice(-TIER_3_ESCALATION_THRESHOLD);
      const recentScore = computeScore(recentAnswers);

      if (recentScore < currentScore || recentScore < 50) {
        return {
          shouldEscalate: true,
          context: createEscalationContext({
            targetTier: 3,
            sourceTier: 2,
            reason: "tier_2_insufficient",
            domain,
            domainAnswers,
            currentScore: recentScore,
            explanation:
              `Adaptive assistance (Tier 2) has not improved performance in Domain ${domain}. ` +
              `Score remains at ${recentScore}% after ${TIER_3_ESCALATION_THRESHOLD} additional ` +
              `questions. Escalating to expert diagnostic mode.`,
          }),
        };
      }
    }
  }

  return { shouldEscalate: false };
}

// ---------------------------------------------------------------------------
// Escalation context builder
// ---------------------------------------------------------------------------

/**
 * Create a structured escalation context with all data the receiving
 * tier needs to provide effective assistance.
 *
 * @exam Domain 5.2 — Escalation context must be COMPLETE. The receiving
 * tier should not need to query additional data to understand the
 * student's situation. This is analogous to the subagent isolation
 * principle (Domain 1.2): everything needed is passed explicitly.
 */
export function createEscalationContext(params: {
  targetTier: EscalationTier;
  sourceTier: EscalationTier;
  reason: EscalationReason;
  domain: number;
  domainAnswers: AnswerRecord[];
  currentScore: number;
  explanation: string;
}): EscalationContext {
  const {
    targetTier,
    sourceTier,
    reason,
    domain,
    domainAnswers,
    currentScore,
    explanation,
  } = params;

  // Identify weak task statements
  const taskStatements = getWeakTaskStatements(domainAnswers);

  // Get recent answers for context
  const recentAnswers = domainAnswers.slice(-TREND_WINDOW_SIZE);

  // Build recommended actions based on the escalation reason
  const recommendedActions = getRecommendedActions(targetTier, reason);

  // Compute confidence data if available
  const confidenceData = computeConfidenceData(domainAnswers, currentScore);

  return {
    targetTier,
    sourceTier,
    reason,
    explanation,
    domain,
    taskStatements: taskStatements.length > 0 ? taskStatements : undefined,
    recentAnswers,
    currentScore,
    recommendedActions,
    confidenceData: confidenceData ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Internal detection helpers
// ---------------------------------------------------------------------------

/**
 * Count consecutive wrong answers at the end of the answer list.
 */
function getConsecutiveWrongCount(answers: AnswerRecord[]): number {
  let count = 0;
  for (let i = answers.length - 1; i >= 0; i--) {
    if (!answers[i]!.correct) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

/**
 * Detect a declining performance trend.
 *
 * Compares the score of the first half of the trend window to the second half.
 * If the second half is significantly worse, the trend is declining.
 */
function hasDeclinedPerformance(answers: AnswerRecord[]): boolean {
  if (answers.length < TREND_WINDOW_SIZE) return false;

  const recent = answers.slice(-TREND_WINDOW_SIZE);
  const mid = Math.floor(recent.length / 2);
  const firstHalf = recent.slice(0, mid);
  const secondHalf = recent.slice(mid);

  const firstScore = computeScore(firstHalf);
  const secondScore = computeScore(secondHalf);

  return firstScore - secondScore >= DECLINING_TREND_THRESHOLD;
}

/**
 * Detect a guessing pattern: correct answers with very low confidence.
 */
function hasGuessingPattern(answers: AnswerRecord[]): boolean {
  const answersWithConfidence = answers.filter(
    (a) => a.confidence !== undefined,
  );

  if (answersWithConfidence.length < MIN_ANSWERS_FOR_ESCALATION) return false;

  const recentWithConfidence = answersWithConfidence.slice(-MIN_ANSWERS_FOR_ESCALATION);
  const guessingCount = recentWithConfidence.filter(
    (a) => a.correct && (a.confidence ?? 1) < GUESSING_CONFIDENCE_THRESHOLD,
  ).length;

  // If more than half of recent correct answers show low confidence → guessing
  return guessingCount >= Math.ceil(recentWithConfidence.length / 2);
}

/**
 * Compute score as a percentage from a set of answers.
 */
function computeScore(answers: AnswerRecord[]): number {
  if (answers.length === 0) return 0;
  const correct = answers.filter((a) => a.correct).length;
  return Math.round((correct / answers.length) * 100);
}

/**
 * Find task statements where the student performs poorly.
 */
function getWeakTaskStatements(answers: AnswerRecord[]): string[] {
  const taskMap = new Map<string, { correct: number; total: number }>();

  for (const answer of answers) {
    const existing = taskMap.get(answer.taskStatement) ?? { correct: 0, total: 0 };
    existing.total += 1;
    if (answer.correct) existing.correct += 1;
    taskMap.set(answer.taskStatement, existing);
  }

  const weak: string[] = [];
  for (const [task, data] of taskMap) {
    const score = data.total > 0 ? (data.correct / data.total) * 100 : 0;
    if (score < 72 && data.total >= 2) {
      weak.push(task);
    }
  }

  return weak.sort();
}

/**
 * Get recommended actions based on escalation tier and reason.
 */
function getRecommendedActions(
  targetTier: EscalationTier,
  reason: EscalationReason,
): string[] {
  if (targetTier === 2) {
    switch (reason) {
      case "consecutive_wrong_answers":
        return [
          "Switch to explanatory mode — explain the concept before asking more questions",
          "Use codebase references to show concrete implementations",
          "Break down the concept into smaller sub-concepts",
          "Present easier questions first to rebuild confidence",
        ];
      case "declining_performance":
        return [
          "Review previously answered questions and identify misconceptions",
          "Present the concept from a different angle or with different analogies",
          "Reduce difficulty level temporarily to rebuild foundation",
          "Provide worked examples before resuming questions",
        ];
      case "low_confidence_correct":
        return [
          "Ask the student to explain WHY they chose each answer (not just which)",
          "Provide deeper explanations even for correct answers",
          "Connect concepts to the codebase to build concrete understanding",
          "Use Socratic questioning to verify genuine understanding",
        ];
      default:
        return [
          "Provide more detailed explanations with code references",
          "Adjust difficulty level to match the student's current capability",
        ];
    }
  }

  if (targetTier === 3) {
    return [
      "Generate a comprehensive diagnostic report of the student's misconceptions",
      "Identify the specific knowledge gaps preventing progress",
      "Create a targeted mini-lesson for the weakest concepts",
      "Consider recommending external resources or study materials",
      "Flag for potential human tutor review if available",
    ];
  }

  return [];
}

/**
 * Compute confidence calibration data from answers.
 */
function computeConfidenceData(
  answers: AnswerRecord[],
  actualScore: number,
): {
  averageConfidence: number;
  isReliable: boolean;
  calibrationGap: number;
} | null {
  const answersWithConfidence = answers.filter(
    (a) => a.confidence !== undefined,
  );

  if (answersWithConfidence.length === 0) return null;

  const avgConfidence =
    answersWithConfidence.reduce((sum, a) => sum + (a.confidence ?? 0), 0) /
    answersWithConfidence.length;

  const confidenceAsPercent = avgConfidence * 100;
  const calibrationGap = confidenceAsPercent - actualScore;
  const isReliable =
    avgConfidence >= RELIABLE_CONFIDENCE_THRESHOLD &&
    Math.abs(calibrationGap) < 25;

  return {
    averageConfidence: Math.round(avgConfidence * 100) / 100,
    isReliable,
    calibrationGap: Math.round(calibrationGap),
  };
}
