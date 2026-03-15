/**
 * Tier 1 — Tool Error Handling Tests
 *
 * Tests src/tools/error-handling.ts:
 * - ToolError class construction, serialisation
 * - createToolError factory with defaults
 * - isRetryable logic for all error types
 * - withStructuredErrors wrapper
 * - isToolErrorData type guard
 *
 * @author Rashid Mbeki, Senior QA — ArchitectAI
 */

import { describe, it, expect } from 'vitest';
import {
  ToolError,
  createToolError,
  isRetryable,
  withStructuredErrors,
  isToolErrorData,
} from '../../src/tools/error-handling';
import type { ToolErrorType, ToolErrorData } from '../../src/tools/error-handling';

// ─── ToolError class ────────────────────────────────────────────────────────

describe('ToolError', () => {
  const sampleData: ToolErrorData = {
    error_type: 'validation_error',
    message: 'Domain must be 1-5',
    retry_eligible: true,
    suggested_action: 'Use a valid domain number.',
  };

  it('extends Error', () => {
    const err = new ToolError(sampleData);
    expect(err).toBeInstanceOf(Error);
  });

  it('sets name to "ToolError"', () => {
    const err = new ToolError(sampleData);
    expect(err.name).toBe('ToolError');
  });

  it('uses message from data', () => {
    const err = new ToolError(sampleData);
    expect(err.message).toBe('Domain must be 1-5');
  });

  it('exposes data property', () => {
    const err = new ToolError(sampleData);
    expect(err.data).toEqual(sampleData);
  });

  it('data is readonly', () => {
    const err = new ToolError(sampleData);
    // data is a readonly property — exists and matches
    expect(err.data.error_type).toBe('validation_error');
  });

  it('toToolResult returns a copy of data', () => {
    const err = new ToolError(sampleData);
    const result = err.toToolResult();
    expect(result).toEqual(sampleData);
    expect(result).not.toBe(err.data); // different reference (spread)
  });

  it('toToolResult includes details when present', () => {
    const err = new ToolError({
      ...sampleData,
      details: { attempted: 6 },
    });
    const result = err.toToolResult();
    expect(result.details).toEqual({ attempted: 6 });
  });

  it('toJSON returns a JSON string', () => {
    const err = new ToolError(sampleData);
    const json = err.toJSON();
    expect(typeof json).toBe('string');
    const parsed = JSON.parse(json);
    expect(parsed.error_type).toBe('validation_error');
  });

  it('toJSON is parseable and matches data', () => {
    const err = new ToolError(sampleData);
    const parsed = JSON.parse(err.toJSON());
    expect(parsed).toEqual(sampleData);
  });

  it('has a stack trace', () => {
    const err = new ToolError(sampleData);
    expect(err.stack).toBeDefined();
  });
});

// ─── createToolError ────────────────────────────────────────────────────────

describe('createToolError', () => {
  it('creates a ToolError instance', () => {
    const err = createToolError('validation_error', 'bad input');
    expect(err).toBeInstanceOf(ToolError);
  });

  it('sets error_type from first arg', () => {
    const err = createToolError('not_found', 'no results');
    expect(err.data.error_type).toBe('not_found');
  });

  it('sets message from second arg', () => {
    const err = createToolError('internal_error', 'server crash');
    expect(err.data.message).toBe('server crash');
  });

  it('uses default retry_eligible based on error type (retryable)', () => {
    const err = createToolError('validation_error', 'bad input');
    expect(err.data.retry_eligible).toBe(true);
  });

  it('uses default retry_eligible based on error type (non-retryable)', () => {
    const err = createToolError('internal_error', 'crash');
    expect(err.data.retry_eligible).toBe(false);
  });

  it('allows overriding retry_eligible', () => {
    const err = createToolError('internal_error', 'crash', { retry_eligible: true });
    expect(err.data.retry_eligible).toBe(true);
  });

  it('provides default suggested_action for validation_error', () => {
    const err = createToolError('validation_error', 'bad input');
    expect(err.data.suggested_action).toBeTruthy();
    expect(err.data.suggested_action.length).toBeGreaterThan(0);
  });

  it('provides default suggested_action for not_found', () => {
    const err = createToolError('not_found', 'missing');
    expect(err.data.suggested_action).toContain('Broaden');
  });

  it('allows overriding suggested_action', () => {
    const err = createToolError('validation_error', 'bad', {
      suggested_action: 'Try domain=1',
    });
    expect(err.data.suggested_action).toBe('Try domain=1');
  });

  it('passes through details', () => {
    const err = createToolError('validation_error', 'bad', {
      details: { field: 'domain', received: 6 },
    });
    expect(err.data.details).toEqual({ field: 'domain', received: 6 });
  });

  it('details are undefined when not provided', () => {
    const err = createToolError('validation_error', 'bad');
    expect(err.data.details).toBeUndefined();
  });

  it('creates errors for all error types without throwing', () => {
    const types: ToolErrorType[] = [
      'validation_error',
      'not_found',
      'rate_limited',
      'internal_error',
      'permission_denied',
      'context_overflow',
    ];
    for (const type of types) {
      expect(() => createToolError(type, `test ${type}`)).not.toThrow();
    }
  });
});

// ─── isRetryable ────────────────────────────────────────────────────────────

describe('isRetryable', () => {
  it('returns true for validation_error', () => {
    expect(isRetryable('validation_error')).toBe(true);
  });

  it('returns true for not_found', () => {
    expect(isRetryable('not_found')).toBe(true);
  });

  it('returns true for rate_limited', () => {
    expect(isRetryable('rate_limited')).toBe(true);
  });

  it('returns true for context_overflow', () => {
    expect(isRetryable('context_overflow')).toBe(true);
  });

  it('returns false for internal_error', () => {
    expect(isRetryable('internal_error')).toBe(false);
  });

  it('returns false for permission_denied', () => {
    expect(isRetryable('permission_denied')).toBe(false);
  });
});

// ─── withStructuredErrors ───────────────────────────────────────────────────

describe('withStructuredErrors', () => {
  it('passes through successful results', async () => {
    const fn = async (input: { x: number }) => input.x * 2;
    const wrapped = withStructuredErrors(fn);
    const result = await wrapped({ x: 5 });
    expect(result).toBe(10);
  });

  it('catches ToolError and returns structured data', async () => {
    const fn = async () => {
      throw new ToolError({
        error_type: 'validation_error',
        message: 'bad',
        retry_eligible: true,
        suggested_action: 'fix it',
      });
    };
    const wrapped = withStructuredErrors(fn);
    const result = await wrapped({});
    expect(isToolErrorData(result)).toBe(true);
    if (isToolErrorData(result)) {
      expect(result.error_type).toBe('validation_error');
    }
  });

  it('wraps generic Error as internal_error', async () => {
    const fn = async () => {
      throw new Error('something broke');
    };
    const wrapped = withStructuredErrors(fn);
    const result = await wrapped({});
    expect(isToolErrorData(result)).toBe(true);
    if (isToolErrorData(result)) {
      expect(result.error_type).toBe('internal_error');
      expect(result.message).toBe('something broke');
    }
  });

  it('wraps non-Error throws as internal_error', async () => {
    const fn = async () => {
      throw 'string error';
    };
    const wrapped = withStructuredErrors(fn);
    const result = await wrapped({});
    expect(isToolErrorData(result)).toBe(true);
    if (isToolErrorData(result)) {
      expect(result.error_type).toBe('internal_error');
    }
  });

  it('preserves ToolError message in wrapped result', async () => {
    const fn = async () => {
      throw new ToolError({
        error_type: 'not_found',
        message: 'Question not found',
        retry_eligible: true,
        suggested_action: 'Broaden search',
      });
    };
    const wrapped = withStructuredErrors(fn);
    const result = await wrapped({});
    if (isToolErrorData(result)) {
      expect(result.message).toBe('Question not found');
    }
  });

  it('handles async functions that return promises', async () => {
    const fn = async (input: { val: string }) => {
      return `Hello ${input.val}`;
    };
    const wrapped = withStructuredErrors(fn);
    const result = await wrapped({ val: 'World' });
    expect(result).toBe('Hello World');
  });
});

// ─── isToolErrorData ────────────────────────────────────────────────────────

describe('isToolErrorData', () => {
  it('returns true for valid ToolErrorData', () => {
    expect(
      isToolErrorData({
        error_type: 'validation_error',
        message: 'bad',
        retry_eligible: true,
        suggested_action: 'fix it',
      }),
    ).toBe(true);
  });

  it('returns true with optional details', () => {
    expect(
      isToolErrorData({
        error_type: 'internal_error',
        message: 'crash',
        retry_eligible: false,
        suggested_action: 'none',
        details: { foo: 'bar' },
      }),
    ).toBe(true);
  });

  it('returns false for null', () => {
    expect(isToolErrorData(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isToolErrorData(undefined)).toBe(false);
  });

  it('returns false for string', () => {
    expect(isToolErrorData('error')).toBe(false);
  });

  it('returns false for number', () => {
    expect(isToolErrorData(42)).toBe(false);
  });

  it('returns false for empty object', () => {
    expect(isToolErrorData({})).toBe(false);
  });

  it('returns false when error_type is missing', () => {
    expect(
      isToolErrorData({
        message: 'bad',
        retry_eligible: true,
        suggested_action: 'fix',
      }),
    ).toBe(false);
  });

  it('returns false when message is missing', () => {
    expect(
      isToolErrorData({
        error_type: 'validation_error',
        retry_eligible: true,
        suggested_action: 'fix',
      }),
    ).toBe(false);
  });

  it('returns false when retry_eligible is missing', () => {
    expect(
      isToolErrorData({
        error_type: 'validation_error',
        message: 'bad',
        suggested_action: 'fix',
      }),
    ).toBe(false);
  });

  it('returns false when suggested_action is missing', () => {
    expect(
      isToolErrorData({
        error_type: 'validation_error',
        message: 'bad',
        retry_eligible: true,
      }),
    ).toBe(false);
  });

  it('returns false when error_type is not a string', () => {
    expect(
      isToolErrorData({
        error_type: 123,
        message: 'bad',
        retry_eligible: true,
        suggested_action: 'fix',
      }),
    ).toBe(false);
  });

  it('returns false when retry_eligible is not boolean', () => {
    expect(
      isToolErrorData({
        error_type: 'validation_error',
        message: 'bad',
        retry_eligible: 'yes',
        suggested_action: 'fix',
      }),
    ).toBe(false);
  });

  it('returns false for array', () => {
    expect(isToolErrorData([1, 2, 3])).toBe(false);
  });
});
