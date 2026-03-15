/**
 * Tier 1 — Few-Shot Examples Tests
 *
 * Tests src/prompts/few-shot.ts:
 * - getFewShotExamples returns examples
 * - Token budget is respected
 * - Unknown task types return empty
 * - formatExamplesAsMessages produces correct structure
 * - getExampleTokenCost sums correctly
 * - getAvailableTaskTypes returns valid types
 *
 * @author Lin Wei, QA Functional — ArchitectAI
 */

import { describe, it, expect } from 'vitest';
import {
  getFewShotExamples,
  formatExamplesAsMessages,
  getExampleTokenCost,
  getAvailableTaskTypes,
} from '../../src/prompts/few-shot';
import type { FewShotExample, FewShotTaskType } from '../../src/prompts/few-shot';

// ─── getFewShotExamples — basic retrieval ───────────────────────────────────

describe('getFewShotExamples — basic retrieval', () => {
  it('returns examples for quiz_presentation', () => {
    const examples = getFewShotExamples('quiz_presentation', 10000);
    expect(examples.length).toBeGreaterThan(0);
  });

  it('returns examples for quiz_feedback', () => {
    const examples = getFewShotExamples('quiz_feedback', 10000);
    expect(examples.length).toBeGreaterThan(0);
  });

  it('returns examples for explanation', () => {
    const examples = getFewShotExamples('explanation', 10000);
    expect(examples.length).toBeGreaterThan(0);
  });

  it('returns examples for assessment', () => {
    const examples = getFewShotExamples('assessment', 10000);
    expect(examples.length).toBeGreaterThan(0);
  });

  it('all returned examples have required fields', () => {
    const examples = getFewShotExamples('quiz_presentation', 10000);
    for (const ex of examples) {
      expect(ex.id).toBeTruthy();
      expect(ex.taskType).toBe('quiz_presentation');
      expect(ex.userMessage).toBeTruthy();
      expect(ex.assistantResponse).toBeTruthy();
      expect(typeof ex.estimatedTokens).toBe('number');
      expect(typeof ex.complexity).toBe('number');
    }
  });

  it('returns examples sorted by complexity (ascending)', () => {
    const examples = getFewShotExamples('quiz_presentation', 10000);
    for (let i = 1; i < examples.length; i++) {
      expect(examples[i].complexity).toBeGreaterThanOrEqual(examples[i - 1].complexity);
    }
  });
});

// ─── getFewShotExamples — token budget ──────────────────────────────────────

describe('getFewShotExamples — token budget', () => {
  it('returns empty array for zero budget', () => {
    const examples = getFewShotExamples('quiz_presentation', 0);
    expect(examples).toEqual([]);
  });

  it('returns empty array for very small budget (1 token)', () => {
    const examples = getFewShotExamples('quiz_presentation', 1);
    expect(examples).toEqual([]);
  });

  it('respects token budget — total cost does not exceed budget', () => {
    const budget = 300;
    const examples = getFewShotExamples('quiz_presentation', budget);
    const totalCost = getExampleTokenCost(examples);
    expect(totalCost).toBeLessThanOrEqual(budget);
  });

  it('large budget returns all available examples', () => {
    const small = getFewShotExamples('quiz_presentation', 100);
    const large = getFewShotExamples('quiz_presentation', 100000);
    expect(large.length).toBeGreaterThanOrEqual(small.length);
  });

  it('default budget is 1000 tokens', () => {
    const examples = getFewShotExamples('quiz_presentation');
    const totalCost = getExampleTokenCost(examples);
    expect(totalCost).toBeLessThanOrEqual(1000);
  });

  it('skips examples exceeding remaining budget', () => {
    // Use budget between smallest and total to test partial selection
    const all = getFewShotExamples('quiz_presentation', 100000);
    if (all.length > 1) {
      const smallest = Math.min(...all.map((e) => e.estimatedTokens));
      const total = getExampleTokenCost(all);
      const midBudget = smallest + Math.floor((total - smallest) / 2);
      const partial = getFewShotExamples('quiz_presentation', midBudget);
      expect(partial.length).toBeGreaterThan(0);
      expect(partial.length).toBeLessThanOrEqual(all.length);
    }
  });
});

// ─── getFewShotExamples — filtering ─────────────────────────────────────────

describe('getFewShotExamples — filtering', () => {
  it('returns empty for unknown task type', () => {
    const examples = getFewShotExamples('nonexistent' as FewShotTaskType, 10000);
    expect(examples).toEqual([]);
  });

  it('respects maxCount option', () => {
    const examples = getFewShotExamples('quiz_presentation', 10000, { maxCount: 1 });
    expect(examples.length).toBeLessThanOrEqual(1);
  });

  it('respects tag filter', () => {
    const examples = getFewShotExamples('quiz_presentation', 10000, {
      tags: ['domain-1'],
    });
    for (const ex of examples) {
      expect(ex.tags).toContain('domain-1');
    }
  });

  it('returns empty when tag filter matches nothing', () => {
    const examples = getFewShotExamples('quiz_presentation', 10000, {
      tags: ['nonexistent-tag-xyz'],
    });
    expect(examples).toEqual([]);
  });

  it('handles multiple tag filters (AND logic)', () => {
    const examples = getFewShotExamples('quiz_presentation', 10000, {
      tags: ['domain-1', 'agentic-loop'],
    });
    for (const ex of examples) {
      expect(ex.tags).toContain('domain-1');
      expect(ex.tags).toContain('agentic-loop');
    }
  });

  it('maxCount of 0 returns empty', () => {
    const examples = getFewShotExamples('quiz_presentation', 10000, { maxCount: 0 });
    expect(examples).toEqual([]);
  });
});

// ─── formatExamplesAsMessages ───────────────────────────────────────────────

describe('formatExamplesAsMessages', () => {
  it('returns empty array for empty input', () => {
    expect(formatExamplesAsMessages([])).toEqual([]);
  });

  it('returns 2 messages per example (user + assistant)', () => {
    const examples = getFewShotExamples('quiz_feedback', 10000);
    if (examples.length > 0) {
      const messages = formatExamplesAsMessages(examples);
      expect(messages.length).toBe(examples.length * 2);
    }
  });

  it('alternates user and assistant roles', () => {
    const examples = getFewShotExamples('quiz_presentation', 10000);
    const messages = formatExamplesAsMessages(examples);
    for (let i = 0; i < messages.length; i++) {
      expect(messages[i].role).toBe(i % 2 === 0 ? 'user' : 'assistant');
    }
  });

  it('user messages contain userMessage from examples', () => {
    const examples = getFewShotExamples('quiz_presentation', 10000);
    const messages = formatExamplesAsMessages(examples);
    for (let i = 0; i < examples.length; i++) {
      expect(messages[i * 2].content).toBe(examples[i].userMessage);
    }
  });

  it('assistant messages contain assistantResponse from examples', () => {
    const examples = getFewShotExamples('quiz_presentation', 10000);
    const messages = formatExamplesAsMessages(examples);
    for (let i = 0; i < examples.length; i++) {
      expect(messages[i * 2 + 1].content).toBe(examples[i].assistantResponse);
    }
  });

  it('message roles are typed correctly', () => {
    const examples = getFewShotExamples('explanation', 10000);
    const messages = formatExamplesAsMessages(examples);
    for (const msg of messages) {
      expect(['user', 'assistant']).toContain(msg.role);
      expect(typeof msg.content).toBe('string');
    }
  });
});

// ─── getExampleTokenCost ────────────────────────────────────────────────────

describe('getExampleTokenCost', () => {
  it('returns 0 for empty array', () => {
    expect(getExampleTokenCost([])).toBe(0);
  });

  it('sums estimatedTokens correctly', () => {
    const examples = getFewShotExamples('quiz_presentation', 10000);
    const expected = examples.reduce((s, e) => s + e.estimatedTokens, 0);
    expect(getExampleTokenCost(examples)).toBe(expected);
  });

  it('returns positive number for non-empty examples', () => {
    const examples = getFewShotExamples('explanation', 10000);
    if (examples.length > 0) {
      expect(getExampleTokenCost(examples)).toBeGreaterThan(0);
    }
  });
});

// ─── getAvailableTaskTypes ──────────────────────────────────────────────────

describe('getAvailableTaskTypes', () => {
  it('returns an array', () => {
    expect(Array.isArray(getAvailableTaskTypes())).toBe(true);
  });

  it('includes quiz_presentation', () => {
    expect(getAvailableTaskTypes()).toContain('quiz_presentation');
  });

  it('includes quiz_feedback', () => {
    expect(getAvailableTaskTypes()).toContain('quiz_feedback');
  });

  it('includes explanation', () => {
    expect(getAvailableTaskTypes()).toContain('explanation');
  });

  it('includes assessment', () => {
    expect(getAvailableTaskTypes()).toContain('assessment');
  });

  it('returns at least 4 task types', () => {
    expect(getAvailableTaskTypes().length).toBeGreaterThanOrEqual(4);
  });
});
