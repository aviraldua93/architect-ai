/**
 * Tier 2 — Hook Behaviour Tests
 *
 * Tests src/agents/hooks.ts:
 * - Hook execution order preserved in pipeline
 * - PostToolUse hooks receive and transform results
 * - Pipeline composition with pre + post hooks
 * - Hook failure doesn't crash (blocked calls return structured errors)
 */

import { describe, it, expect } from 'vitest';
import {
  createTimestampNormalisationHook,
  createStatusCodeNormalisationHook,
  createThresholdGuardHook,
  createToolBlocklistHook,
  createHookPipeline,
} from '../../src/agents/hooks';
import type { HookContext } from '../../src/agents/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeHookContext(overrides: Partial<HookContext> = {}): HookContext {
  return {
    toolName: 'test_tool',
    toolInput: {},
    toolResult: {},
    conversationHistory: [],
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Hook execution order', () => {
  it('pipeline preserves pre-hook order', () => {
    const hook1 = createThresholdGuardHook('transfer', 'amount', 100);
    const hook2 = createToolBlocklistHook(new Set(['delete_all']), 'Blocked');
    const pipeline = createHookPipeline([hook1, hook2], []);

    expect(pipeline.preToolUse).toHaveLength(2);
    expect(pipeline.preToolUse[0].name).toBe('threshold-guard-transfer');
    expect(pipeline.preToolUse[1].name).toBe('tool-blocklist');
  });

  it('pipeline preserves post-hook order', () => {
    const hook1 = createTimestampNormalisationHook();
    const hook2 = createStatusCodeNormalisationHook();
    const pipeline = createHookPipeline([], [hook1, hook2]);

    expect(pipeline.postToolUse).toHaveLength(2);
    expect(pipeline.postToolUse[0].name).toBe('timestamp-normalisation');
    expect(pipeline.postToolUse[1].name).toBe('status-code-normalisation');
  });

  it('post hooks execute sequentially transforming results', () => {
    const tsHook = createTimestampNormalisationHook(['created_at']);
    const scHook = createStatusCodeNormalisationHook();

    const input = { created_at: 1700000000, status: 200 };
    let result: unknown = input;

    // Simulate sequential execution
    const ctx1 = makeHookContext({ toolResult: result });
    if (tsHook.shouldRun(ctx1)) result = tsHook.execute(ctx1);

    const ctx2 = makeHookContext({ toolResult: result });
    if (scHook.shouldRun(ctx2)) result = scHook.execute(ctx2);

    const final = result as Record<string, unknown>;
    expect(typeof final.created_at).toBe('string'); // normalised to ISO
    expect(final.status).toBe('200 OK');
  });
});

describe('PostToolUse receives result', () => {
  it('timestamp hook normalises Unix seconds to ISO 8601', () => {
    const hook = createTimestampNormalisationHook(['created_at']);
    const ctx = makeHookContext({
      toolResult: { created_at: 1700000000, name: 'test' },
    });

    expect(hook.shouldRun(ctx)).toBe(true);
    const result = hook.execute(ctx) as Record<string, unknown>;
    expect(typeof result.created_at).toBe('string');
    expect(result.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.name).toBe('test'); // non-timestamp fields untouched
  });

  it('status code hook normalises numeric codes', () => {
    const hook = createStatusCodeNormalisationHook();
    const ctx = makeHookContext({
      toolResult: { status: 404, data: null },
    });

    expect(hook.shouldRun(ctx)).toBe(true);
    const result = hook.execute(ctx) as Record<string, unknown>;
    expect(result.status).toBe('404 Not Found');
  });

  it('status code hook skips when no status field', () => {
    const hook = createStatusCodeNormalisationHook();
    const ctx = makeHookContext({ toolResult: { data: 'hello' } });

    expect(hook.shouldRun(ctx)).toBe(false);
  });
});

describe('Pipeline composition', () => {
  it('creates pipeline with both pre and post hooks', () => {
    const pipeline = createHookPipeline(
      [
        createThresholdGuardHook('pay', 'amount', 500),
        createToolBlocklistHook(new Set(['rm'])),
      ],
      [
        createTimestampNormalisationHook(),
        createStatusCodeNormalisationHook(),
      ],
    );

    expect(pipeline.preToolUse).toHaveLength(2);
    expect(pipeline.postToolUse).toHaveLength(2);
  });

  it('creates empty pipeline with defaults', () => {
    const pipeline = createHookPipeline();

    expect(pipeline.preToolUse).toEqual([]);
    expect(pipeline.postToolUse).toEqual([]);
  });
});

describe('Hook failure resilience', () => {
  it('threshold guard blocks amounts above threshold', () => {
    const hook = createThresholdGuardHook('transfer', 'amount', 1000);

    expect(hook.shouldRun('transfer', { amount: 5000 })).toBe(true);
    const result = hook.validate('transfer', { amount: 5000 });
    expect(result).toMatchObject({ allowed: false, reason: expect.stringContaining('exceeds threshold') });
  });

  it('threshold guard allows amounts below threshold', () => {
    const hook = createThresholdGuardHook('transfer', 'amount', 1000);
    const result = hook.validate('transfer', { amount: 500 });
    expect(result).toMatchObject({ allowed: true });
  });

  it('threshold guard rejects non-numeric amounts', () => {
    const hook = createThresholdGuardHook('transfer', 'amount', 1000);
    const result = hook.validate('transfer', { amount: '5000' });
    expect(result).toMatchObject({ allowed: false, reason: expect.stringContaining('not a number') });
  });

  it('blocklist hook blocks listed tools', () => {
    const hook = createToolBlocklistHook(new Set(['danger']), 'Not allowed');

    expect(hook.shouldRun('danger', {})).toBe(true);
    expect(hook.validate('danger', {})).toMatchObject({ allowed: false, reason: 'Not allowed' });
  });

  it('blocklist hook ignores unlisted tools', () => {
    const hook = createToolBlocklistHook(new Set(['danger']));
    expect(hook.shouldRun('safe_tool', {})).toBe(false);
  });
});
