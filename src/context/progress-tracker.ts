/**
 * @module context/progress-tracker
 * @description Progress tracking with spaced repetition for ArchitectAI.
 *
 * @exam Domain 5.1 — Optimise Context Windows
 *
 * CRITICAL EXAM CONCEPT (5.1): The progress tracker serves two purposes:
 *
 * 1. PERFORMANCE TRACKING: Per-domain scores over time, identifying weak
 *    areas that need more attention. The 72% threshold matches the actual
 *    exam pass rate.
 *
 * 2. SPACED REPETITION: Questions from weak domains are surfaced more
 *    frequently. This is context-aware scheduling — the agent uses
 *    performance data to decide which questions to prioritise, rather
 *    than random selection.
 *
 * DOMAIN WEIGHTS reflect the exam's scoring distribution:
 *   Domain 1 (Agentic Architecture): 28%
 *   Domain 2 (Tool Design & MCP): 24%
 *   Domain 3 (CLI & Commands): 16%
 *   Domain 4 (Prompt Engineering): 18%
 *   Domain 5 (Context Management): 14%
 *
 * @author Diego Morales, Context Systems Engineer — ArchitectAI
 */

import type { AnswerRecord, DomainScore } from "./session-manager.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** The minimum score to be considered "passing" for a domain. */
const PASS_THRESHOLD = 72;

/** Exam domain weights (percentage of total exam score). */
const DOMAIN_WEIGHTS: Record<number, number> = {
  1: 28,
  2: 24,
  3: 16,
  4: 18,
  5: 14,
};

/** Human-readable domain names. */
const DOMAIN_NAMES: Record<number, string> = {
  1: "Agentic Architecture",
  2: "Tool Design & MCP",
  3: "CLI & Commands",
  4: "Prompt Engineering",
  5: "Context Management",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A weak area identified by the progress tracker.
 */
export interface WeakArea {
  /** Domain number. */
  domain: number;
  /** Human-readable domain name. */
  domainName: string;
  /** Current score percentage. */
  score: number;
  /** How far below the pass threshold. */
  deficit: number;
  /** Recommended number of additional questions to practise. */
  recommendedQuestions: number;
  /** Task statements within this domain that need the most work. */
  weakTaskStatements: string[];
}

/**
 * A readiness summary across all domains.
 */
export interface ReadinessSummary {
  /** Weighted overall score (0–100). */
  overallScore: number;
  /** Whether the student is likely to pass. */
  passReady: boolean;
  /** Per-domain score breakdown. */
  domainScores: Array<DomainScore & {
    domainName: string;
    weight: number;
    weightedScore: number;
    status: "strong" | "passing" | "weak" | "untested";
  }>;
  /** Total questions answered across all domains. */
  totalAnswered: number;
  /** Total correct answers. */
  totalCorrect: number;
  /** Weak areas that need attention. */
  weakAreas: WeakArea[];
}

/**
 * A question recommendation from the spaced repetition system.
 */
export interface QuestionRecommendation {
  /** Domain to pull questions from. */
  domain: number;
  /** Optional task statement focus. */
  taskStatement?: string;
  /** Recommended difficulty level. */
  difficulty: "foundation" | "intermediate" | "advanced";
  /** Why this recommendation was made. */
  reason: string;
  /** Priority score (higher = more urgent). */
  priority: number;
}

// ---------------------------------------------------------------------------
// ProgressTracker
// ---------------------------------------------------------------------------

/**
 * Tracks per-domain scores, identifies weak areas, and provides
 * spaced repetition recommendations.
 *
 * @exam Domain 5.1 — Optimise Context Windows: The progress tracker
 * uses performance data to intelligently select which questions to
 * present next, rather than random selection. This is a form of
 * context optimisation — we use limited interaction time on the
 * areas that will most improve the student's score.
 *
 * @example
 * ```ts
 * const tracker = new ProgressTracker();
 *
 * // Load answer history
 * tracker.loadAnswers(session.answers);
 *
 * // Get readiness summary
 * const summary = tracker.getReadinessSummary();
 *
 * // Get weak areas
 * const weakAreas = tracker.getWeakAreas();
 *
 * // Get next question recommendations
 * const recs = tracker.getRecommendations(3);
 * ```
 */
export class ProgressTracker {
  private answers: AnswerRecord[] = [];

  // -------------------------------------------------------------------------
  // Data loading
  // -------------------------------------------------------------------------

  /**
   * Load answer history into the tracker.
   *
   * @param answers - Array of answer records from the session.
   */
  loadAnswers(answers: AnswerRecord[]): void {
    this.answers = [...answers];
  }

  /**
   * Add a single answer record.
   *
   * @param answer - The answer to record.
   */
  addAnswer(answer: AnswerRecord): void {
    this.answers.push(answer);
  }

  // -------------------------------------------------------------------------
  // Score computation
  // -------------------------------------------------------------------------

  /**
   * Get per-domain scores from the answer history.
   *
   * @returns An array of DomainScore objects, one per domain that has answers.
   */
  getDomainScores(): DomainScore[] {
    const domainMap = new Map<number, { correct: number; total: number }>();

    for (const answer of this.answers) {
      const existing = domainMap.get(answer.domain) ?? { correct: 0, total: 0 };
      existing.total += 1;
      if (answer.correct) existing.correct += 1;
      domainMap.set(answer.domain, existing);
    }

    const scores: DomainScore[] = [];
    for (const [domain, data] of domainMap) {
      scores.push({
        domain,
        correct: data.correct,
        total: data.total,
        score: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
      });
    }

    scores.sort((a, b) => a.domain - b.domain);
    return scores;
  }

  /**
   * Get a comprehensive readiness summary across all domains.
   *
   * @exam Domain 5.1 — The readiness summary provides a weighted
   * assessment that accounts for each domain's exam weight, not
   * just raw scores.
   *
   * @returns A full ReadinessSummary with domain scores, weak areas, and pass readiness.
   */
  getReadinessSummary(): ReadinessSummary {
    const rawScores = this.getDomainScores();
    const scoreMap = new Map(rawScores.map((s) => [s.domain, s]));

    // Build full domain breakdown (including untested domains)
    const domainScores = [1, 2, 3, 4, 5].map((domain) => {
      const raw = scoreMap.get(domain);
      const score = raw?.score ?? 0;
      const weight = DOMAIN_WEIGHTS[domain] ?? 0;
      const weightedScore = (score * weight) / 100;

      let status: "strong" | "passing" | "weak" | "untested";
      if (!raw || raw.total === 0) {
        status = "untested";
      } else if (score >= 80) {
        status = "strong";
      } else if (score >= PASS_THRESHOLD) {
        status = "passing";
      } else {
        status = "weak";
      }

      return {
        domain,
        domainName: DOMAIN_NAMES[domain] ?? `Domain ${domain}`,
        correct: raw?.correct ?? 0,
        total: raw?.total ?? 0,
        score,
        weight,
        weightedScore: Math.round(weightedScore * 10) / 10,
        status,
      };
    });

    const overallScore = Math.round(
      domainScores.reduce((sum, d) => sum + d.weightedScore, 0),
    );

    const totalAnswered = this.answers.length;
    const totalCorrect = this.answers.filter((a) => a.correct).length;

    const weakAreas = this.getWeakAreas();

    return {
      overallScore,
      passReady: overallScore >= PASS_THRESHOLD,
      domainScores,
      totalAnswered,
      totalCorrect,
      weakAreas,
    };
  }

  // -------------------------------------------------------------------------
  // Weak area identification
  // -------------------------------------------------------------------------

  /**
   * Identify domains below the 72% pass threshold.
   *
   * @exam Domain 5.1 — Weak area identification drives the spaced
   * repetition system. Domains below 72% get more practice questions.
   *
   * @returns An array of WeakArea objects for domains below threshold.
   */
  getWeakAreas(): WeakArea[] {
    const scores = this.getDomainScores();
    const weakAreas: WeakArea[] = [];

    for (const score of scores) {
      if (score.score < PASS_THRESHOLD) {
        const weakTaskStatements = this.getWeakTaskStatements(score.domain);
        const deficit = PASS_THRESHOLD - score.score;

        // Recommend more questions proportional to the deficit
        const recommendedQuestions = Math.max(
          3,
          Math.ceil(deficit / 10) * 2,
        );

        weakAreas.push({
          domain: score.domain,
          domainName: DOMAIN_NAMES[score.domain] ?? `Domain ${score.domain}`,
          score: score.score,
          deficit,
          recommendedQuestions,
          weakTaskStatements,
        });
      }
    }

    // Also flag untested domains as weak
    const testedDomains = new Set(scores.map((s) => s.domain));
    for (let d = 1; d <= 5; d++) {
      if (!testedDomains.has(d)) {
        weakAreas.push({
          domain: d,
          domainName: DOMAIN_NAMES[d] ?? `Domain ${d}`,
          score: 0,
          deficit: PASS_THRESHOLD,
          recommendedQuestions: 5,
          weakTaskStatements: [],
        });
      }
    }

    // Sort by deficit (most urgent first)
    weakAreas.sort((a, b) => b.deficit - a.deficit);
    return weakAreas;
  }

  /**
   * Find task statements within a domain where the student is weakest.
   */
  private getWeakTaskStatements(domain: number): string[] {
    const taskMap = new Map<string, { correct: number; total: number }>();

    for (const answer of this.answers) {
      if (answer.domain !== domain) continue;
      const existing = taskMap.get(answer.taskStatement) ?? { correct: 0, total: 0 };
      existing.total += 1;
      if (answer.correct) existing.correct += 1;
      taskMap.set(answer.taskStatement, existing);
    }

    const weakTasks: string[] = [];
    for (const [task, data] of taskMap) {
      const score = data.total > 0 ? (data.correct / data.total) * 100 : 0;
      if (score < PASS_THRESHOLD) {
        weakTasks.push(task);
      }
    }

    return weakTasks.sort();
  }

  // -------------------------------------------------------------------------
  // Spaced repetition recommendations
  // -------------------------------------------------------------------------

  /**
   * Get question recommendations based on spaced repetition logic.
   *
   * STRATEGY:
   * 1. Weak domains (below 72%) get highest priority
   * 2. Untested domains get medium priority
   * 3. Domains near the threshold (72–80%) get lower priority
   * 4. Strong domains (80%+) get minimal review allocation
   *
   * Within a domain, we recommend the difficulty level that matches
   * the student's current performance:
   *   - Score < 40%: foundation (build basics)
   *   - Score 40–70%: intermediate (bridge gaps)
   *   - Score > 70%: advanced (push to mastery)
   *
   * @exam Domain 5.1 — Spaced repetition is a context optimisation
   * technique: we allocate limited study time to the areas with the
   * highest marginal return.
   *
   * @param count - Number of recommendations to return. Defaults to 5.
   * @returns Prioritised question recommendations.
   */
  getRecommendations(count: number = 5): QuestionRecommendation[] {
    const summary = this.getReadinessSummary();
    const recommendations: QuestionRecommendation[] = [];

    // 1. Recommendations from weak areas (highest priority)
    for (const weak of summary.weakAreas) {
      const difficulty = this.recommendDifficulty(weak.score);

      // Recommend specific task statements if we have data
      if (weak.weakTaskStatements.length > 0) {
        for (const task of weak.weakTaskStatements) {
          recommendations.push({
            domain: weak.domain,
            taskStatement: task,
            difficulty,
            reason: `Task ${task} in ${weak.domainName} is below ${PASS_THRESHOLD}%. Focus here for maximum score improvement.`,
            priority: 100 - weak.score, // Lower score = higher priority
          });
        }
      } else {
        recommendations.push({
          domain: weak.domain,
          difficulty,
          reason: `${weak.domainName} is at ${weak.score}%, ${weak.deficit} points below the ${PASS_THRESHOLD}% pass threshold.`,
          priority: 100 - weak.score,
        });
      }
    }

    // 2. Borderline domains (72–80%) get review recommendations
    for (const ds of summary.domainScores) {
      if (ds.status === "passing") {
        recommendations.push({
          domain: ds.domain,
          difficulty: "advanced",
          reason: `${ds.domainName} is at ${ds.score}% — above threshold but not secure. Advanced questions will solidify knowledge.`,
          priority: 30,
        });
      }
    }

    // Sort by priority (descending) and take the requested count
    recommendations.sort((a, b) => b.priority - a.priority);
    return recommendations.slice(0, count);
  }

  /**
   * Recommend a difficulty level based on the student's current score.
   */
  private recommendDifficulty(
    score: number,
  ): "foundation" | "intermediate" | "advanced" {
    if (score < 40) return "foundation";
    if (score < 70) return "intermediate";
    return "advanced";
  }

  // -------------------------------------------------------------------------
  // Analytics
  // -------------------------------------------------------------------------

  /**
   * Get recent answer history, optionally filtered by domain.
   *
   * @param domain - Optional domain filter.
   * @param limit - Maximum number of records to return. Defaults to 20.
   * @returns Recent answer records, newest first.
   */
  getHistory(domain?: number, limit: number = 20): AnswerRecord[] {
    let filtered = [...this.answers];

    if (domain !== undefined) {
      filtered = filtered.filter((a) => a.domain === domain);
    }

    // Return newest first
    return filtered.reverse().slice(0, limit);
  }

  /**
   * Get the total number of answers recorded.
   */
  getTotalAnswered(): number {
    return this.answers.length;
  }

  /**
   * Get the overall accuracy percentage.
   */
  getOverallAccuracy(): number {
    if (this.answers.length === 0) return 0;
    const correct = this.answers.filter((a) => a.correct).length;
    return Math.round((correct / this.answers.length) * 100);
  }
}
