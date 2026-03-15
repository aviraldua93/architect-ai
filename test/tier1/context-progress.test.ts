/**
 * Tier 1 — Progress Tracker Tests
 *
 * Tests src/context/progress-tracker.ts:
 * - ProgressTracker domain scoring
 * - Weak area detection at 72% threshold
 * - Spaced repetition recommendations
 * - Readiness summary computation
 * - Analytics methods
 *
 * @author Rashid Mbeki, Senior QA — ArchitectAI
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProgressTracker } from '../../src/context/progress-tracker';
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

function makeAnswers(domain: number, correct: number, incorrect: number): AnswerRecord[] {
  const answers: AnswerRecord[] = [];
  for (let i = 0; i < correct; i++) {
    answers.push(makeAnswer({ domain, correct: true, questionId: `d${domain}-q${i}` }));
  }
  for (let i = 0; i < incorrect; i++) {
    answers.push(makeAnswer({ domain, correct: false, questionId: `d${domain}-q${correct + i}` }));
  }
  return answers;
}

let tracker: ProgressTracker;

beforeEach(() => {
  tracker = new ProgressTracker();
});

// ─── loadAnswers / addAnswer ────────────────────────────────────────────────

describe('ProgressTracker data loading', () => {
  it('loadAnswers stores answers', () => {
    tracker.loadAnswers([makeAnswer()]);
    expect(tracker.getTotalAnswered()).toBe(1);
  });

  it('loadAnswers replaces previous answers', () => {
    tracker.loadAnswers([makeAnswer(), makeAnswer({ questionId: 'q2' })]);
    tracker.loadAnswers([makeAnswer()]);
    expect(tracker.getTotalAnswered()).toBe(1);
  });

  it('addAnswer appends to existing answers', () => {
    tracker.loadAnswers([makeAnswer()]);
    tracker.addAnswer(makeAnswer({ questionId: 'q2' }));
    expect(tracker.getTotalAnswered()).toBe(2);
  });

  it('starts empty', () => {
    expect(tracker.getTotalAnswered()).toBe(0);
  });
});

// ─── getDomainScores ────────────────────────────────────────────────────────

describe('ProgressTracker.getDomainScores', () => {
  it('returns empty array when no answers', () => {
    expect(tracker.getDomainScores()).toEqual([]);
  });

  it('computes 100% for all correct answers', () => {
    tracker.loadAnswers(makeAnswers(1, 5, 0));
    const scores = tracker.getDomainScores();
    expect(scores).toHaveLength(1);
    expect(scores[0].domain).toBe(1);
    expect(scores[0].score).toBe(100);
    expect(scores[0].correct).toBe(5);
    expect(scores[0].total).toBe(5);
  });

  it('computes 0% for all incorrect answers', () => {
    tracker.loadAnswers(makeAnswers(2, 0, 4));
    const scores = tracker.getDomainScores();
    const d2 = scores.find((s) => s.domain === 2)!;
    expect(d2.score).toBe(0);
  });

  it('computes 50% for half correct', () => {
    tracker.loadAnswers(makeAnswers(3, 2, 2));
    const scores = tracker.getDomainScores();
    const d3 = scores.find((s) => s.domain === 3)!;
    expect(d3.score).toBe(50);
  });

  it('tracks multiple domains independently', () => {
    tracker.loadAnswers([
      ...makeAnswers(1, 3, 0),
      ...makeAnswers(2, 1, 3),
    ]);
    const scores = tracker.getDomainScores();
    expect(scores).toHaveLength(2);
    const d1 = scores.find((s) => s.domain === 1)!;
    const d2 = scores.find((s) => s.domain === 2)!;
    expect(d1.score).toBe(100);
    expect(d2.score).toBe(25);
  });

  it('returns scores sorted by domain number', () => {
    tracker.loadAnswers([
      ...makeAnswers(5, 1, 0),
      ...makeAnswers(1, 1, 0),
      ...makeAnswers(3, 1, 0),
    ]);
    const scores = tracker.getDomainScores();
    const domains = scores.map((s) => s.domain);
    expect(domains).toEqual([1, 3, 5]);
  });
});

// ─── getWeakAreas ───────────────────────────────────────────────────────────

describe('ProgressTracker.getWeakAreas', () => {
  it('returns all 5 domains as weak when no answers', () => {
    const weakAreas = tracker.getWeakAreas();
    expect(weakAreas).toHaveLength(5);
    for (const wa of weakAreas) {
      expect(wa.score).toBe(0);
      expect(wa.deficit).toBe(72);
    }
  });

  it('identifies domain below 72% as weak', () => {
    tracker.loadAnswers(makeAnswers(1, 2, 3)); // 40%
    const weakAreas = tracker.getWeakAreas();
    const d1 = weakAreas.find((w) => w.domain === 1);
    expect(d1).toBeDefined();
    expect(d1!.score).toBe(40);
    expect(d1!.deficit).toBe(32);
  });

  it('does NOT flag domain at exactly 72% as weak', () => {
    // 72% requires careful construction: e.g. 18 correct out of 25
    tracker.loadAnswers(makeAnswers(1, 18, 7)); // 72%
    const weakAreas = tracker.getWeakAreas();
    const d1 = weakAreas.find((w) => w.domain === 1);
    expect(d1).toBeUndefined();
  });

  it('flags domain at 71% as weak', () => {
    // 5 correct out of 7 = ~71.4% rounds to 71
    tracker.loadAnswers(makeAnswers(1, 5, 2));
    const weakAreas = tracker.getWeakAreas();
    const d1 = weakAreas.find((w) => w.domain === 1);
    expect(d1).toBeDefined();
  });

  it('includes untested domains as weak', () => {
    tracker.loadAnswers(makeAnswers(1, 10, 0)); // 100% — strong
    const weakAreas = tracker.getWeakAreas();
    const untestedDomains = weakAreas.filter((w) => w.score === 0);
    expect(untestedDomains.length).toBe(4); // domains 2-5 untested
  });

  it('weak areas have recommendedQuestions >= 3', () => {
    tracker.loadAnswers(makeAnswers(1, 1, 3)); // 25%
    const weakAreas = tracker.getWeakAreas();
    for (const wa of weakAreas) {
      expect(wa.recommendedQuestions).toBeGreaterThanOrEqual(3);
    }
  });

  it('weak areas include domain name', () => {
    tracker.loadAnswers(makeAnswers(2, 1, 3)); // 25%
    const weakAreas = tracker.getWeakAreas();
    const d2 = weakAreas.find((w) => w.domain === 2);
    expect(d2?.domainName).toBeTruthy();
  });

  it('sorts by deficit (most urgent first)', () => {
    tracker.loadAnswers([
      ...makeAnswers(1, 3, 1), // 75% — above threshold
      ...makeAnswers(2, 1, 3), // 25% — large deficit
      ...makeAnswers(3, 2, 1), // 67% — small deficit
    ]);
    const weakAreas = tracker.getWeakAreas();
    for (let i = 1; i < weakAreas.length; i++) {
      expect(weakAreas[i].deficit).toBeLessThanOrEqual(weakAreas[i - 1].deficit);
    }
  });

  it('identifies weak task statements within domain', () => {
    tracker.loadAnswers([
      makeAnswer({ domain: 1, taskStatement: '1.1', correct: false, questionId: 'q1' }),
      makeAnswer({ domain: 1, taskStatement: '1.1', correct: false, questionId: 'q2' }),
      makeAnswer({ domain: 1, taskStatement: '1.2', correct: true, questionId: 'q3' }),
      makeAnswer({ domain: 1, taskStatement: '1.2', correct: true, questionId: 'q4' }),
    ]);
    const weakAreas = tracker.getWeakAreas();
    const d1 = weakAreas.find((w) => w.domain === 1);
    expect(d1?.weakTaskStatements).toContain('1.1');
  });
});

// ─── getReadinessSummary ────────────────────────────────────────────────────

describe('ProgressTracker.getReadinessSummary', () => {
  it('returns a summary even with no answers', () => {
    const summary = tracker.getReadinessSummary();
    expect(summary.overallScore).toBe(0);
    expect(summary.passReady).toBe(false);
    expect(summary.domainScores).toHaveLength(5);
    expect(summary.totalAnswered).toBe(0);
  });

  it('always returns 5 domain scores', () => {
    tracker.loadAnswers(makeAnswers(1, 5, 0));
    const summary = tracker.getReadinessSummary();
    expect(summary.domainScores).toHaveLength(5);
  });

  it('marks untested domains as "untested"', () => {
    const summary = tracker.getReadinessSummary();
    for (const ds of summary.domainScores) {
      expect(ds.status).toBe('untested');
    }
  });

  it('marks domain >=80% as "strong"', () => {
    tracker.loadAnswers(makeAnswers(1, 9, 1)); // 90%
    const summary = tracker.getReadinessSummary();
    const d1 = summary.domainScores.find((d) => d.domain === 1)!;
    expect(d1.status).toBe('strong');
  });

  it('marks domain 72-79% as "passing"', () => {
    tracker.loadAnswers(makeAnswers(1, 3, 1)); // 75%
    const summary = tracker.getReadinessSummary();
    const d1 = summary.domainScores.find((d) => d.domain === 1)!;
    expect(d1.status).toBe('passing');
  });

  it('marks domain <72% as "weak"', () => {
    tracker.loadAnswers(makeAnswers(1, 1, 3)); // 25%
    const summary = tracker.getReadinessSummary();
    const d1 = summary.domainScores.find((d) => d.domain === 1)!;
    expect(d1.status).toBe('weak');
  });

  it('computes weighted overall score', () => {
    // Domain 1 = 100%, weight 28% → 28
    // All others = 0%, weighted 0
    tracker.loadAnswers(makeAnswers(1, 10, 0));
    const summary = tracker.getReadinessSummary();
    expect(summary.overallScore).toBe(28); // 100 * 28 / 100
  });

  it('passReady is true when overallScore >= 72', () => {
    // Need high scores across weighted domains
    tracker.loadAnswers([
      ...makeAnswers(1, 10, 0), // 100%
      ...makeAnswers(2, 10, 0), // 100%
      ...makeAnswers(3, 10, 0), // 100%
      ...makeAnswers(4, 10, 0), // 100%
      ...makeAnswers(5, 10, 0), // 100%
    ]);
    const summary = tracker.getReadinessSummary();
    expect(summary.passReady).toBe(true);
    expect(summary.overallScore).toBe(100);
  });

  it('includes totalAnswered and totalCorrect', () => {
    tracker.loadAnswers([
      ...makeAnswers(1, 3, 2), // 5 total, 3 correct
      ...makeAnswers(2, 1, 1), // 2 total, 1 correct
    ]);
    const summary = tracker.getReadinessSummary();
    expect(summary.totalAnswered).toBe(7);
    expect(summary.totalCorrect).toBe(4);
  });

  it('domain scores include domain name and weight', () => {
    const summary = tracker.getReadinessSummary();
    for (const ds of summary.domainScores) {
      expect(ds.domainName).toBeTruthy();
      expect(ds.weight).toBeGreaterThan(0);
    }
  });

  it('domain weights sum to 100', () => {
    const summary = tracker.getReadinessSummary();
    const totalWeight = summary.domainScores.reduce((s, d) => s + d.weight, 0);
    expect(totalWeight).toBe(100);
  });
});

// ─── getRecommendations (spaced repetition) ─────────────────────────────────

describe('ProgressTracker.getRecommendations', () => {
  it('returns recommendations for weak domains', () => {
    tracker.loadAnswers(makeAnswers(1, 1, 3)); // 25% — weak
    const recs = tracker.getRecommendations();
    expect(recs.length).toBeGreaterThan(0);
    const d1Rec = recs.find((r) => r.domain === 1);
    expect(d1Rec).toBeDefined();
  });

  it('recommends foundation difficulty for very low scores', () => {
    tracker.loadAnswers(makeAnswers(2, 1, 4)); // 20%
    const recs = tracker.getRecommendations();
    const d2Rec = recs.find((r) => r.domain === 2);
    expect(d2Rec?.difficulty).toBe('foundation');
  });

  it('recommends intermediate difficulty for mid-range scores', () => {
    tracker.loadAnswers(makeAnswers(3, 3, 2)); // 60%
    const recs = tracker.getRecommendations();
    const d3Rec = recs.find((r) => r.domain === 3);
    expect(d3Rec?.difficulty).toBe('intermediate');
  });

  it('recommends advanced for borderline passing domains', () => {
    tracker.loadAnswers(makeAnswers(4, 3, 1)); // 75% — passing, not strong
    const recs = tracker.getRecommendations();
    const d4Rec = recs.find((r) => r.domain === 4);
    if (d4Rec) {
      expect(d4Rec.difficulty).toBe('advanced');
    }
  });

  it('respects count parameter', () => {
    tracker.loadAnswers(makeAnswers(1, 1, 3));
    const recs = tracker.getRecommendations(2);
    expect(recs.length).toBeLessThanOrEqual(2);
  });

  it('defaults to 5 recommendations', () => {
    const recs = tracker.getRecommendations();
    expect(recs.length).toBeLessThanOrEqual(5);
  });

  it('recommendations are sorted by priority (highest first)', () => {
    tracker.loadAnswers([
      ...makeAnswers(1, 1, 3), // 25%
      ...makeAnswers(2, 2, 1), // 67%
    ]);
    const recs = tracker.getRecommendations(10);
    for (let i = 1; i < recs.length; i++) {
      expect(recs[i].priority).toBeLessThanOrEqual(recs[i - 1].priority);
    }
  });

  it('each recommendation has a reason string', () => {
    tracker.loadAnswers(makeAnswers(1, 1, 3));
    const recs = tracker.getRecommendations();
    for (const rec of recs) {
      expect(rec.reason).toBeTruthy();
      expect(typeof rec.reason).toBe('string');
    }
  });

  it('recommends untested domains', () => {
    // Load only domain 1 — domains 2-5 are untested
    tracker.loadAnswers(makeAnswers(1, 10, 0));
    const recs = tracker.getRecommendations(10);
    const untestedRecs = recs.filter((r) => r.domain !== 1);
    expect(untestedRecs.length).toBeGreaterThan(0);
  });
});

// ─── getHistory ─────────────────────────────────────────────────────────────

describe('ProgressTracker.getHistory', () => {
  it('returns empty array when no answers', () => {
    expect(tracker.getHistory()).toEqual([]);
  });

  it('returns answers in reverse order (newest first)', () => {
    tracker.loadAnswers([
      makeAnswer({ questionId: 'q1', timestamp: '2024-01-01T00:00:00Z' }),
      makeAnswer({ questionId: 'q2', timestamp: '2024-01-02T00:00:00Z' }),
    ]);
    const history = tracker.getHistory();
    expect(history[0].questionId).toBe('q2');
  });

  it('respects domain filter', () => {
    tracker.loadAnswers([
      makeAnswer({ domain: 1 }),
      makeAnswer({ domain: 2, questionId: 'q2' }),
    ]);
    const history = tracker.getHistory(1);
    expect(history).toHaveLength(1);
    expect(history[0].domain).toBe(1);
  });

  it('respects limit parameter', () => {
    tracker.loadAnswers(makeAnswers(1, 10, 0));
    const history = tracker.getHistory(undefined, 3);
    expect(history).toHaveLength(3);
  });

  it('defaults to 20 limit', () => {
    tracker.loadAnswers(makeAnswers(1, 25, 0));
    const history = tracker.getHistory();
    expect(history).toHaveLength(20);
  });
});

// ─── Analytics helpers ──────────────────────────────────────────────────────

describe('ProgressTracker analytics', () => {
  it('getTotalAnswered returns 0 when empty', () => {
    expect(tracker.getTotalAnswered()).toBe(0);
  });

  it('getTotalAnswered returns correct count', () => {
    tracker.loadAnswers(makeAnswers(1, 3, 2));
    expect(tracker.getTotalAnswered()).toBe(5);
  });

  it('getOverallAccuracy returns 0 when empty', () => {
    expect(tracker.getOverallAccuracy()).toBe(0);
  });

  it('getOverallAccuracy returns correct percentage', () => {
    tracker.loadAnswers(makeAnswers(1, 3, 1)); // 75%
    expect(tracker.getOverallAccuracy()).toBe(75);
  });

  it('getOverallAccuracy returns 100 for all correct', () => {
    tracker.loadAnswers(makeAnswers(1, 5, 0));
    expect(tracker.getOverallAccuracy()).toBe(100);
  });

  it('getOverallAccuracy returns 0 for all incorrect', () => {
    tracker.loadAnswers(makeAnswers(1, 0, 5));
    expect(tracker.getOverallAccuracy()).toBe(0);
  });
});
