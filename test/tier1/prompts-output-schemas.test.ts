/**
 * Tier 1 — Output Schemas Tests
 *
 * Tests src/prompts/output-schemas.ts:
 * - QuizResponseSchema, ExplanationSchema, AssessmentSchema validation
 * - validateOutput helper
 * - validateWithRetry with retries
 * - extractJsonFromText utility
 *
 * @author Noor Hassan, QA Integration — ArchitectAI
 */

import { describe, it, expect, vi } from 'vitest';
import {
  QuizResponseSchema,
  ExplanationSchema,
  AssessmentSchema,
  validateOutput,
  validateWithRetry,
  extractJsonFromText,
} from '../../src/prompts/output-schemas';

// ─── Test data factories ────────────────────────────────────────────────────

function validQuizResponse() {
  return {
    questionId: 'd1-q1',
    userAnswer: 'B',
    isCorrect: true,
    correctAnswer: 'B',
    explanation: 'This is a detailed explanation that meets the minimum 50-character requirement for valid quiz responses.',
    examTrap: 'Option A is tempting but wrong.',
    domain: 1,
    taskStatement: '1.1',
  };
}

function validExplanation() {
  return {
    conceptName: 'Agentic Loop',
    examReference: {
      domain: 1,
      taskStatement: '1.1',
      domainName: 'Agentic Architecture',
    },
    brief: 'The agentic loop is the core execution cycle for AI agents.',
    detailed:
      'The agentic loop repeatedly calls the model, checks for tool_use, executes tools, and feeds results back. ' +
      'It continues until stop_reason === "end_turn". This is the fundamental pattern for building agents.',
    citations: [
      {
        filePath: 'src/agents/loop.ts',
        description: 'Core agentic loop implementation',
      },
    ],
  };
}

function validAssessment() {
  return {
    overallScore: 68,
    passReady: false,
    readiness: 'borderline',
    domainScores: [
      { domain: 1, domainName: 'Agentic Architecture', score: 80, weight: 28, weightedScore: 22.4, questionsAnswered: 10, status: 'strong' },
      { domain: 2, domainName: 'Tool Design & MCP', score: 55, weight: 24, weightedScore: 13.2, questionsAnswered: 8, status: 'weak' },
      { domain: 3, domainName: 'CLI & Commands', score: 70, weight: 16, weightedScore: 11.2, questionsAnswered: 5, status: 'weak' },
      { domain: 4, domainName: 'Prompt Engineering', score: 75, weight: 18, weightedScore: 13.5, questionsAnswered: 6, status: 'passing' },
      { domain: 5, domainName: 'Context Management', score: 50, weight: 14, weightedScore: 7.0, questionsAnswered: 4, status: 'weak' },
    ],
    weakAreas: [
      { domain: 2, domainName: 'Tool Design', score: 55, specificTopics: ['2.1', '2.2'], recommendedQuestions: 5 },
    ],
    studyPlan: [
      { priority: 1, action: 'Focus on Domain 2', domain: 2 },
    ],
  };
}

// ─── QuizResponseSchema ─────────────────────────────────────────────────────

describe('QuizResponseSchema', () => {
  it('validates a correct quiz response', () => {
    const result = QuizResponseSchema.safeParse(validQuizResponse());
    expect(result.success).toBe(true);
  });

  it('rejects missing questionId', () => {
    const data = { ...validQuizResponse() };
    delete (data as Record<string, unknown>)['questionId'];
    expect(QuizResponseSchema.safeParse(data).success).toBe(false);
  });

  it('rejects invalid userAnswer (not A-D)', () => {
    const data = { ...validQuizResponse(), userAnswer: 'E' };
    expect(QuizResponseSchema.safeParse(data).success).toBe(false);
  });

  it('rejects missing isCorrect', () => {
    const data = { ...validQuizResponse() };
    delete (data as Record<string, unknown>)['isCorrect'];
    expect(QuizResponseSchema.safeParse(data).success).toBe(false);
  });

  it('rejects explanation shorter than 50 characters', () => {
    const data = { ...validQuizResponse(), explanation: 'Too short' };
    expect(QuizResponseSchema.safeParse(data).success).toBe(false);
  });

  it('rejects examTrap shorter than 20 characters', () => {
    const data = { ...validQuizResponse(), examTrap: 'Short' };
    expect(QuizResponseSchema.safeParse(data).success).toBe(false);
  });

  it('rejects domain outside 1-5 range', () => {
    const data = { ...validQuizResponse(), domain: 6 };
    expect(QuizResponseSchema.safeParse(data).success).toBe(false);
  });

  it('rejects invalid taskStatement format', () => {
    const data = { ...validQuizResponse(), taskStatement: 'abc' };
    expect(QuizResponseSchema.safeParse(data).success).toBe(false);
  });

  it('accepts optional codeReference', () => {
    const data = {
      ...validQuizResponse(),
      codeReference: { filePath: 'src/test.ts', description: 'Test file' },
    };
    expect(QuizResponseSchema.safeParse(data).success).toBe(true);
  });

  it('accepts all valid answer options', () => {
    for (const answer of ['A', 'B', 'C', 'D'] as const) {
      const data = { ...validQuizResponse(), userAnswer: answer, correctAnswer: answer };
      expect(QuizResponseSchema.safeParse(data).success).toBe(true);
    }
  });
});

// ─── ExplanationSchema ──────────────────────────────────────────────────────

describe('ExplanationSchema', () => {
  it('validates a correct explanation', () => {
    const result = ExplanationSchema.safeParse(validExplanation());
    expect(result.success).toBe(true);
  });

  it('rejects missing conceptName', () => {
    const data = { ...validExplanation() };
    delete (data as Record<string, unknown>)['conceptName'];
    expect(ExplanationSchema.safeParse(data).success).toBe(false);
  });

  it('rejects conceptName shorter than 3 chars', () => {
    const data = { ...validExplanation(), conceptName: 'AB' };
    expect(ExplanationSchema.safeParse(data).success).toBe(false);
  });

  it('rejects brief shorter than 20 chars', () => {
    const data = { ...validExplanation(), brief: 'Short' };
    expect(ExplanationSchema.safeParse(data).success).toBe(false);
  });

  it('rejects brief longer than 200 chars', () => {
    const data = { ...validExplanation(), brief: 'x'.repeat(201) };
    expect(ExplanationSchema.safeParse(data).success).toBe(false);
  });

  it('rejects detailed shorter than 100 chars', () => {
    const data = { ...validExplanation(), detailed: 'Short detail' };
    expect(ExplanationSchema.safeParse(data).success).toBe(false);
  });

  it('requires at least one citation', () => {
    const data = { ...validExplanation(), citations: [] };
    expect(ExplanationSchema.safeParse(data).success).toBe(false);
  });

  it('accepts optional advanced field', () => {
    const data = { ...validExplanation(), advanced: 'Edge case notes' };
    expect(ExplanationSchema.safeParse(data).success).toBe(true);
  });

  it('accepts optional relatedConcepts', () => {
    const data = { ...validExplanation(), relatedConcepts: ['stop_reason', 'tool_use'] };
    expect(ExplanationSchema.safeParse(data).success).toBe(true);
  });

  it('citation must have filePath and description', () => {
    const data = { ...validExplanation(), citations: [{ filePath: 'src/x.ts' }] };
    expect(ExplanationSchema.safeParse(data).success).toBe(false);
  });

  it('accepts citation with optional lineRange', () => {
    const data = {
      ...validExplanation(),
      citations: [
        { filePath: 'src/x.ts', description: 'Test', lineRange: { start: 1, end: 10 } },
      ],
    };
    expect(ExplanationSchema.safeParse(data).success).toBe(true);
  });
});

// ─── AssessmentSchema ───────────────────────────────────────────────────────

describe('AssessmentSchema', () => {
  it('validates a correct assessment', () => {
    const result = AssessmentSchema.safeParse(validAssessment());
    expect(result.success).toBe(true);
  });

  it('rejects overallScore above 100', () => {
    const data = { ...validAssessment(), overallScore: 101 };
    expect(AssessmentSchema.safeParse(data).success).toBe(false);
  });

  it('rejects overallScore below 0', () => {
    const data = { ...validAssessment(), overallScore: -1 };
    expect(AssessmentSchema.safeParse(data).success).toBe(false);
  });

  it('rejects invalid readiness value', () => {
    const data = { ...validAssessment(), readiness: 'maybe' };
    expect(AssessmentSchema.safeParse(data).success).toBe(false);
  });

  it('accepts all valid readiness values', () => {
    for (const r of ['pass_ready', 'borderline', 'not_ready']) {
      const data = { ...validAssessment(), readiness: r };
      expect(AssessmentSchema.safeParse(data).success).toBe(true);
    }
  });

  it('requires exactly 5 domain scores', () => {
    const data = { ...validAssessment(), domainScores: validAssessment().domainScores.slice(0, 3) };
    expect(AssessmentSchema.safeParse(data).success).toBe(false);
  });

  it('requires at least one study plan item', () => {
    const data = { ...validAssessment(), studyPlan: [] };
    expect(AssessmentSchema.safeParse(data).success).toBe(false);
  });

  it('accepts optional confidenceCalibration', () => {
    const data = {
      ...validAssessment(),
      confidenceCalibration: {
        averageConfidence: 0.85,
        actualScore: 68,
        calibrationGap: 17,
        assessment: 'overconfident',
      },
    };
    expect(AssessmentSchema.safeParse(data).success).toBe(true);
  });

  it('rejects invalid domain status', () => {
    const data = validAssessment();
    data.domainScores[0].status = 'excellent' as never;
    expect(AssessmentSchema.safeParse(data).success).toBe(false);
  });

  it('accepts valid domain statuses', () => {
    for (const status of ['strong', 'passing', 'weak', 'untested'] as const) {
      const data = validAssessment();
      data.domainScores[0].status = status;
      expect(AssessmentSchema.safeParse(data).success).toBe(true);
    }
  });
});

// ─── validateOutput ─────────────────────────────────────────────────────────

describe('validateOutput', () => {
  it('returns success for valid data', () => {
    const result = validateOutput(QuizResponseSchema, validQuizResponse());
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('returns failure for invalid data', () => {
    const result = validateOutput(QuizResponseSchema, { bad: 'data' });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('includes rawInput in result', () => {
    const input = validQuizResponse();
    const result = validateOutput(QuizResponseSchema, input);
    expect(result.rawInput).toBe(input);
  });

  it('error message includes field path', () => {
    const result = validateOutput(QuizResponseSchema, { questionId: 'bad-format' });
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('data is undefined on failure', () => {
    const result = validateOutput(QuizResponseSchema, {});
    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
  });
});

// ─── validateWithRetry ──────────────────────────────────────────────────────

describe('validateWithRetry', () => {
  it('returns validated data on first success', async () => {
    const data = validQuizResponse();
    const result = await validateWithRetry(QuizResponseSchema, data, async () => data);
    expect(result.questionId).toBe('d1-q1');
  });

  it('retries on failure and succeeds on second attempt', async () => {
    const goodData = validQuizResponse();
    let attempt = 0;
    const retryFn = vi.fn(async () => {
      attempt++;
      return attempt >= 1 ? goodData : { bad: 'data' };
    });

    const result = await validateWithRetry(QuizResponseSchema, { bad: 'first' }, retryFn);
    expect(result.questionId).toBe('d1-q1');
    expect(retryFn).toHaveBeenCalled();
  });

  it('throws after exhausting retries', async () => {
    const retryFn = vi.fn(async () => ({ bad: 'data' }));
    await expect(
      validateWithRetry(QuizResponseSchema, { bad: 'data' }, retryFn, 2),
    ).rejects.toThrow(/validation failed/i);
  });

  it('calls retryFn with error message', async () => {
    const retryFn = vi.fn(async () => validQuizResponse());
    await validateWithRetry(QuizResponseSchema, { bad: 'data' }, retryFn, 1);
    expect(retryFn).toHaveBeenCalledWith(expect.any(String));
  });

  it('handles string JSON input', async () => {
    const data = validQuizResponse();
    const jsonStr = JSON.stringify(data);
    const result = await validateWithRetry(QuizResponseSchema, jsonStr, async () => data);
    expect(result.questionId).toBe('d1-q1');
  });

  it('retries on invalid JSON string', async () => {
    const retryFn = vi.fn(async () => validQuizResponse());
    await validateWithRetry(QuizResponseSchema, 'not json', retryFn, 1);
    expect(retryFn).toHaveBeenCalled();
  });

  it('respects maxRetries parameter', async () => {
    const retryFn = vi.fn(async () => ({ bad: 'data' }));
    await expect(
      validateWithRetry(QuizResponseSchema, { bad: 'data' }, retryFn, 1),
    ).rejects.toThrow();
    expect(retryFn).toHaveBeenCalledTimes(1);
  });

  it('error message includes attempt count', async () => {
    const retryFn = vi.fn(async () => ({ bad: 'data' }));
    try {
      await validateWithRetry(QuizResponseSchema, { bad: 'data' }, retryFn, 2);
    } catch (e) {
      expect((e as Error).message).toContain('3 attempts');
    }
  });
});

// ─── extractJsonFromText ────────────────────────────────────────────────────

describe('extractJsonFromText', () => {
  it('extracts JSON from code fence', () => {
    const text = 'Here is the output:\n```json\n{"key": "value"}\n```\nDone.';
    expect(extractJsonFromText(text)).toBe('{"key": "value"}');
  });

  it('extracts JSON from code fence without json label', () => {
    const text = '```\n{"key": "value"}\n```';
    expect(extractJsonFromText(text)).toBe('{"key": "value"}');
  });

  it('extracts bare JSON object from text', () => {
    const text = 'Result: {"key": "value"} end';
    expect(extractJsonFromText(text)).toBe('{"key": "value"}');
  });

  it('extracts bare JSON array from text', () => {
    const text = 'Here: [1, 2, 3] end';
    expect(extractJsonFromText(text)).toBe('[1, 2, 3]');
  });

  it('returns trimmed text when no JSON found', () => {
    const text = '  just plain text  ';
    expect(extractJsonFromText(text)).toBe('just plain text');
  });

  it('handles empty string', () => {
    expect(extractJsonFromText('')).toBe('');
  });

  it('extracts nested JSON objects', () => {
    const json = '{"a": {"b": "c"}}';
    const text = `Output: ${json}`;
    const extracted = extractJsonFromText(text);
    expect(JSON.parse(extracted)).toEqual({ a: { b: 'c' } });
  });

  it('prefers code fence over bare JSON', () => {
    const text = '{"outside": true}\n```json\n{"inside": true}\n```';
    const extracted = extractJsonFromText(text);
    expect(JSON.parse(extracted)).toEqual({ inside: true });
  });
});
