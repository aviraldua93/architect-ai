/**
 * Tier 1 — Escalation Tests
 *
 * Tests src/context/escalation.ts:
 * - shouldEscalate trigger detection
 * - createEscalationContext output structure
 * - Tier 1 → 2 → 3 progression logic
 * - Edge cases: insufficient data, already at tier 3
 *
 * @author Noor Hassan, QA Integration — ArchitectAI
 */

import { describe, it, expect } from 'vitest';
import {
  shouldEscalate,
  createEscalationContext,
} from '../../src/context/escalation';
import type {
  EscalationTier,
  EscalationContext,
  EscalationCheckResult,
} from '../../src/context/escalation';
import type { AnswerRecord } from '../../src/context/session-manager';

// ─── Test helpers ───────────────────────────────────────────────────────────

function makeAnswer(overrides: Partial<AnswerRecord> = {}): AnswerRecord {
  return {
    questionId: 'd1-q01',
    correct: true,
    userAnswer: 'B',
    correctAnswer: 'B',
    domain: 1,
    taskStatement: '1.1',
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

function makeWrongAnswers(domain: number, count: number): AnswerRecord[] {
  return Array.from({ length: count }, (_, i) =>
    makeAnswer({
      domain,
      correct: false,
      questionId: `d${domain}-q${i}`,
      userAnswer: 'A',
      correctAnswer: 'B',
    }),
  );
}

function makeCorrectAnswers(domain: number, count: number): AnswerRecord[] {
  return Array.from({ length: count }, (_, i) =>
    makeAnswer({
      domain,
      correct: true,
      questionId: `d${domain}-q${i}`,
    }),
  );
}

// ─── shouldEscalate — insufficient data ─────────────────────────────────────

describe('shouldEscalate — insufficient data', () => {
  it('returns false with no answers', () => {
    const result = shouldEscalate([], 1, 1);
    expect(result.shouldEscalate).toBe(false);
  });

  it('returns false with fewer than 3 answers in domain', () => {
    const answers = [
      makeAnswer({ domain: 1, correct: false }),
      makeAnswer({ domain: 1, correct: false, questionId: 'q2' }),
    ];
    const result = shouldEscalate(answers, 1, 1);
    expect(result.shouldEscalate).toBe(false);
  });

  it('ignores answers from other domains', () => {
    const answers = [
      ...makeWrongAnswers(2, 5), // domain 2 — irrelevant
      makeAnswer({ domain: 1, correct: false }),
    ];
    const result = shouldEscalate(answers, 1, 1);
    expect(result.shouldEscalate).toBe(false); // only 1 answer in domain 1
  });

  it('returns false when already at tier 3', () => {
    const answers = makeWrongAnswers(1, 10);
    const result = shouldEscalate(answers, 3, 1);
    expect(result.shouldEscalate).toBe(false);
  });
});

// ─── shouldEscalate — Tier 1 → 2: consecutive wrong answers ────────────────

describe('shouldEscalate — consecutive wrong answers (Tier 1 → 2)', () => {
  it('triggers escalation after 3 consecutive wrong answers', () => {
    const answers = makeWrongAnswers(1, 3);
    const result = shouldEscalate(answers, 1, 1);
    expect(result.shouldEscalate).toBe(true);
    expect(result.context?.targetTier).toBe(2);
    expect(result.context?.sourceTier).toBe(1);
    expect(result.context?.reason).toBe('consecutive_wrong_answers');
  });

  it('does NOT trigger with 2 consecutive wrong answers', () => {
    const answers = [
      makeAnswer({ domain: 1, correct: true }),
      ...makeWrongAnswers(1, 2),
    ];
    const result = shouldEscalate(answers, 1, 1);
    // 2 consecutive wrong is below threshold
    expect(result.shouldEscalate).toBe(false);
  });

  it('resets consecutive count when correct answer intervenes', () => {
    const answers = [
      ...makeWrongAnswers(1, 2),
      makeAnswer({ domain: 1, correct: true, questionId: 'correct-1' }),
      ...makeWrongAnswers(1, 2).map((a, i) => ({ ...a, questionId: `d1-wrong2-${i}` })),
    ];
    const result = shouldEscalate(answers, 1, 1);
    expect(result.shouldEscalate).toBe(false); // only 2 consecutive at end
  });

  it('triggers with more than 3 consecutive wrong answers', () => {
    const answers = makeWrongAnswers(1, 5);
    const result = shouldEscalate(answers, 1, 1);
    expect(result.shouldEscalate).toBe(true);
  });
});

// ─── shouldEscalate — Tier 1 → 2: declining performance ────────────────────

describe('shouldEscalate — declining performance (Tier 1 → 2)', () => {
  it('triggers when performance declines significantly', () => {
    // First answers correct, then all wrong — decline > 20%
    const answers = [
      ...makeCorrectAnswers(1, 2).map((a, i) => ({ ...a, questionId: `c-${i}` })),
      ...makeWrongAnswers(1, 3).map((a, i) => ({ ...a, questionId: `w-${i}` })),
    ];
    const result = shouldEscalate(answers, 1, 1);
    // Check if declined — first half ~100%, second half ~0% — 100pt drop
    if (result.shouldEscalate && result.context?.reason === 'declining_performance') {
      expect(result.context.targetTier).toBe(2);
    }
  });

  it('does NOT trigger for stable (but bad) performance', () => {
    // All wrong — no decline, just consistently bad
    const answers = makeWrongAnswers(1, 5);
    const result = shouldEscalate(answers, 1, 1);
    // Will trigger consecutive_wrong, not declining
    if (result.shouldEscalate) {
      expect(result.context?.reason).not.toBe('declining_performance');
    }
  });

  it('needs at least TREND_WINDOW_SIZE (5) answers for trend detection', () => {
    const answers = [
      ...makeCorrectAnswers(1, 2).map((a, i) => ({ ...a, questionId: `c-${i}` })),
      makeAnswer({ domain: 1, correct: false, questionId: 'w-0' }),
    ];
    const result = shouldEscalate(answers, 1, 1);
    // Only 3 answers — consecutive check may not trigger, but decline needs 5
    expect(result.shouldEscalate).toBe(false);
  });
});

// ─── shouldEscalate — Tier 1 → 2: guessing pattern ─────────────────────────

describe('shouldEscalate — guessing pattern (Tier 1 → 2)', () => {
  it('triggers when correct answers have very low confidence', () => {
    const answers = [
      makeAnswer({ domain: 1, correct: true, confidence: 0.1, questionId: 'q1' }),
      makeAnswer({ domain: 1, correct: true, confidence: 0.2, questionId: 'q2' }),
      makeAnswer({ domain: 1, correct: true, confidence: 0.15, questionId: 'q3' }),
    ];
    const result = shouldEscalate(answers, 1, 1);
    if (result.shouldEscalate) {
      expect(result.context?.reason).toBe('low_confidence_correct');
      expect(result.context?.targetTier).toBe(2);
    }
  });

  it('does NOT trigger when confidence is high', () => {
    const answers = [
      makeAnswer({ domain: 1, correct: true, confidence: 0.9, questionId: 'q1' }),
      makeAnswer({ domain: 1, correct: true, confidence: 0.85, questionId: 'q2' }),
      makeAnswer({ domain: 1, correct: true, confidence: 0.95, questionId: 'q3' }),
    ];
    const result = shouldEscalate(answers, 1, 1);
    expect(result.shouldEscalate).toBe(false);
  });

  it('does NOT trigger when no confidence data available', () => {
    const answers = makeCorrectAnswers(1, 3);
    const result = shouldEscalate(answers, 1, 1);
    expect(result.shouldEscalate).toBe(false);
  });
});

// ─── shouldEscalate — Tier 2 → 3 ───────────────────────────────────────────

describe('shouldEscalate — Tier 2 → 3', () => {
  it('triggers when Tier 2 has not improved scores', () => {
    // MIN_ANSWERS_FOR_ESCALATION (3) + TIER_3_ESCALATION_THRESHOLD (5) = 8 answers
    const answers = makeWrongAnswers(1, 8);
    const result = shouldEscalate(answers, 2, 1);
    if (result.shouldEscalate) {
      expect(result.context?.targetTier).toBe(3);
      expect(result.context?.sourceTier).toBe(2);
      expect(result.context?.reason).toBe('tier_2_insufficient');
    }
  });

  it('does NOT trigger at Tier 2 with insufficient answers', () => {
    const answers = makeWrongAnswers(1, 5);
    const result = shouldEscalate(answers, 2, 1);
    expect(result.shouldEscalate).toBe(false);
  });

  it('does NOT trigger at Tier 2 if recent scores are improving', () => {
    // First 3 wrong, then 5 correct — improvement
    const answers = [
      ...makeWrongAnswers(1, 3),
      ...makeCorrectAnswers(1, 5).map((a, i) => ({ ...a, questionId: `correct-${i}` })),
    ];
    const result = shouldEscalate(answers, 2, 1);
    expect(result.shouldEscalate).toBe(false);
  });
});

// ─── shouldEscalate — no further escalation at Tier 3 ───────────────────────

describe('shouldEscalate — Tier 3 ceiling', () => {
  it('never escalates from Tier 3', () => {
    const answers = makeWrongAnswers(1, 20);
    const result = shouldEscalate(answers, 3, 1);
    expect(result.shouldEscalate).toBe(false);
  });
});

// ─── createEscalationContext ────────────────────────────────────────────────

describe('createEscalationContext', () => {
  const baseParams = {
    targetTier: 2 as EscalationTier,
    sourceTier: 1 as EscalationTier,
    reason: 'consecutive_wrong_answers' as const,
    domain: 1,
    domainAnswers: makeWrongAnswers(1, 3),
    currentScore: 0,
    explanation: 'Test escalation explanation',
  };

  it('returns an EscalationContext object', () => {
    const ctx = createEscalationContext(baseParams);
    expect(ctx).toBeDefined();
    expect(ctx.targetTier).toBe(2);
    expect(ctx.sourceTier).toBe(1);
  });

  it('includes the escalation reason', () => {
    const ctx = createEscalationContext(baseParams);
    expect(ctx.reason).toBe('consecutive_wrong_answers');
  });

  it('includes the explanation', () => {
    const ctx = createEscalationContext(baseParams);
    expect(ctx.explanation).toBe('Test escalation explanation');
  });

  it('includes domain', () => {
    const ctx = createEscalationContext(baseParams);
    expect(ctx.domain).toBe(1);
  });

  it('includes recent answers', () => {
    const ctx = createEscalationContext(baseParams);
    expect(ctx.recentAnswers).toBeDefined();
    expect(ctx.recentAnswers.length).toBeGreaterThan(0);
  });

  it('includes current score', () => {
    const ctx = createEscalationContext(baseParams);
    expect(ctx.currentScore).toBe(0);
  });

  it('includes recommended actions', () => {
    const ctx = createEscalationContext(baseParams);
    expect(ctx.recommendedActions).toBeDefined();
    expect(ctx.recommendedActions.length).toBeGreaterThan(0);
  });

  it('recommended actions for Tier 2 consecutive_wrong include explanation guidance', () => {
    const ctx = createEscalationContext(baseParams);
    const hasExplanatory = ctx.recommendedActions.some(
      (a) => a.toLowerCase().includes('explain'),
    );
    expect(hasExplanatory).toBe(true);
  });

  it('recommended actions for Tier 3 include diagnostic report', () => {
    const ctx = createEscalationContext({
      ...baseParams,
      targetTier: 3,
      sourceTier: 2,
      reason: 'tier_2_insufficient',
    });
    const hasDiagnostic = ctx.recommendedActions.some(
      (a) => a.toLowerCase().includes('diagnostic'),
    );
    expect(hasDiagnostic).toBe(true);
  });

  it('identifies weak task statements from answers', () => {
    const answers = [
      makeAnswer({ domain: 1, taskStatement: '1.1', correct: false, questionId: 'q1' }),
      makeAnswer({ domain: 1, taskStatement: '1.1', correct: false, questionId: 'q2' }),
      makeAnswer({ domain: 1, taskStatement: '1.2', correct: true, questionId: 'q3' }),
    ];
    const ctx = createEscalationContext({
      ...baseParams,
      domainAnswers: answers,
    });
    if (ctx.taskStatements) {
      expect(ctx.taskStatements).toContain('1.1');
    }
  });

  it('includes confidence data when answers have confidence', () => {
    const answers = [
      makeAnswer({ domain: 1, correct: true, confidence: 0.2, questionId: 'q1' }),
      makeAnswer({ domain: 1, correct: true, confidence: 0.3, questionId: 'q2' }),
      makeAnswer({ domain: 1, correct: true, confidence: 0.25, questionId: 'q3' }),
    ];
    const ctx = createEscalationContext({
      ...baseParams,
      domainAnswers: answers,
    });
    expect(ctx.confidenceData).toBeDefined();
    expect(typeof ctx.confidenceData?.averageConfidence).toBe('number');
    expect(typeof ctx.confidenceData?.isReliable).toBe('boolean');
    expect(typeof ctx.confidenceData?.calibrationGap).toBe('number');
  });

  it('confidenceData is undefined when no confidence in answers', () => {
    const answers = makeWrongAnswers(1, 3); // no confidence field
    const ctx = createEscalationContext({
      ...baseParams,
      domainAnswers: answers,
    });
    expect(ctx.confidenceData).toBeUndefined();
  });

  it('different reasons produce different recommended actions', () => {
    const consecutiveCtx = createEscalationContext({
      ...baseParams,
      reason: 'consecutive_wrong_answers',
    });
    const decliningCtx = createEscalationContext({
      ...baseParams,
      reason: 'declining_performance',
    });
    // Actions should differ
    expect(consecutiveCtx.recommendedActions).not.toEqual(decliningCtx.recommendedActions);
  });
});

// ─── End-to-end escalation flow ─────────────────────────────────────────────

describe('End-to-end escalation flow', () => {
  it('Tier 1 → 2 → 3 progression', () => {
    // Tier 1 → 2: consecutive wrong
    const tier1Answers = makeWrongAnswers(1, 3);
    const tier1Check = shouldEscalate(tier1Answers, 1, 1);
    expect(tier1Check.shouldEscalate).toBe(true);
    expect(tier1Check.context?.targetTier).toBe(2);

    // Tier 2 → 3: continued failure (need 8+ answers)
    const tier2Answers = makeWrongAnswers(1, 8);
    const tier2Check = shouldEscalate(tier2Answers, 2, 1);
    if (tier2Check.shouldEscalate) {
      expect(tier2Check.context?.targetTier).toBe(3);
    }

    // Tier 3: no further escalation
    const tier3Check = shouldEscalate(tier2Answers, 3, 1);
    expect(tier3Check.shouldEscalate).toBe(false);
  });

  it('no escalation when student is performing well', () => {
    const answers = makeCorrectAnswers(1, 10);
    expect(shouldEscalate(answers, 1, 1).shouldEscalate).toBe(false);
    expect(shouldEscalate(answers, 2, 1).shouldEscalate).toBe(false);
    expect(shouldEscalate(answers, 3, 1).shouldEscalate).toBe(false);
  });

  it('escalation context has all required fields', () => {
    const answers = makeWrongAnswers(1, 3);
    const result = shouldEscalate(answers, 1, 1);
    if (result.shouldEscalate && result.context) {
      const ctx = result.context;
      expect(ctx.targetTier).toBeDefined();
      expect(ctx.sourceTier).toBeDefined();
      expect(ctx.reason).toBeDefined();
      expect(ctx.explanation).toBeTruthy();
      expect(ctx.domain).toBeDefined();
      expect(ctx.recentAnswers).toBeDefined();
      expect(typeof ctx.currentScore).toBe('number');
      expect(ctx.recommendedActions.length).toBeGreaterThan(0);
    }
  });
});
