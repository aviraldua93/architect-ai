/**
 * Tier 2 — Spawner Behaviour Tests
 *
 * Tests src/agents/spawner.ts with mocked loop:
 * - Parallel spawn with Promise.allSettled semantics
 * - Subagent gets isolated context (enriched message)
 * - Error handling for failed subagents
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/agents/loop', () => ({
  runAgenticLoop: vi.fn(),
}));

import { spawnSubagent, spawnParallel } from '../../src/agents/spawner';
import { runAgenticLoop } from '../../src/agents/loop';
import type { SpawnConfig, AgenticLoopResult } from '../../src/agents/types';
import type Anthropic from '@anthropic-ai/sdk';

// ─── Helpers ────────────────────────────────────────────────────────────────

const mockedRunLoop = vi.mocked(runAgenticLoop);
const mockClient = {} as unknown as Anthropic;

function textBlock(text: string) {
  return { type: 'text' as const, text, citations: null };
}

function makeLoopResult(text: string, iterations = 1): AgenticLoopResult {
  return {
    finalContent: [textBlock(text)],
    conversationHistory: [],
    iterations,
    totalTokens: { input: 10, output: 20 },
  };
}

function makeSpawnConfig(overrides: Partial<SpawnConfig> = {}): SpawnConfig {
  return {
    model: 'test-model',
    systemPrompt: 'You are a test agent.',
    userMessage: 'Do something.',
    tools: [],
    toolRegistry: new Map(),
    context: { facts: ['fact1'] },
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('spawnParallel — Promise.allSettled', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns all results when all subagents succeed', async () => {
    mockedRunLoop
      .mockResolvedValueOnce(makeLoopResult('Result A'))
      .mockResolvedValueOnce(makeLoopResult('Result B'));

    const results = await spawnParallel(mockClient, [
      makeSpawnConfig({ userMessage: 'Task A' }),
      makeSpawnConfig({ userMessage: 'Task B' }),
    ]);

    expect(results).toHaveLength(2);
    expect(results[0].content).toEqual([textBlock('Result A')]);
    expect(results[1].content).toEqual([textBlock('Result B')]);
  });

  it('returns error content for failed subagents without crashing others', async () => {
    mockedRunLoop
      .mockResolvedValueOnce(makeLoopResult('Success'))
      .mockRejectedValueOnce(new Error('Subagent crashed'));

    const results = await spawnParallel(mockClient, [
      makeSpawnConfig({ userMessage: 'Good' }),
      makeSpawnConfig({ userMessage: 'Bad' }),
    ]);

    expect(results).toHaveLength(2);
    // First succeeds
    expect(results[0].content).toEqual([textBlock('Success')]);
    // Second has error content
    expect(results[1].content[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining('failed'),
    });
    expect(results[1].iterations).toBe(0);
    expect(results[1].tokenUsage).toEqual({ input: 0, output: 0 });
  });
});

describe('spawnSubagent — isolated context', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes enriched message with context facts to the loop', async () => {
    mockedRunLoop.mockResolvedValueOnce(makeLoopResult('Done'));

    await spawnSubagent(mockClient, makeSpawnConfig({
      userMessage: 'Analyse data',
      context: {
        facts: ['The dataset has 1000 rows', 'Column A is numeric'],
        sourceUrls: ['https://example.com/data'],
      },
    }));

    expect(mockedRunLoop).toHaveBeenCalledOnce();
    // Third arg is the enriched user message
    const enrichedMessage = mockedRunLoop.mock.calls[0][2];
    expect(enrichedMessage).toContain('The dataset has 1000 rows');
    expect(enrichedMessage).toContain('Column A is numeric');
    expect(enrichedMessage).toContain('https://example.com/data');
    expect(enrichedMessage).toContain('Analyse data');
  });

  it('each subagent gets its own config (no shared state)', async () => {
    mockedRunLoop
      .mockResolvedValueOnce(makeLoopResult('A'))
      .mockResolvedValueOnce(makeLoopResult('B'));

    await spawnParallel(mockClient, [
      makeSpawnConfig({ systemPrompt: 'Agent A prompt', userMessage: 'Task A' }),
      makeSpawnConfig({ systemPrompt: 'Agent B prompt', userMessage: 'Task B' }),
    ]);

    expect(mockedRunLoop).toHaveBeenCalledTimes(2);
    const configA = mockedRunLoop.mock.calls[0][1];
    const configB = mockedRunLoop.mock.calls[1][1];
    expect(configA.systemPrompt).toBe('Agent A prompt');
    expect(configB.systemPrompt).toBe('Agent B prompt');
  });
});

describe('spawnSubagent — error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('propagates loop errors from spawnSubagent', async () => {
    mockedRunLoop.mockRejectedValueOnce(new Error('API timeout'));

    await expect(
      spawnSubagent(mockClient, makeSpawnConfig()),
    ).rejects.toThrow('API timeout');
  });

  it('spawnParallel handles non-Error rejections gracefully', async () => {
    mockedRunLoop
      .mockResolvedValueOnce(makeLoopResult('OK'))
      .mockRejectedValueOnce('string error');

    const results = await spawnParallel(mockClient, [
      makeSpawnConfig(),
      makeSpawnConfig(),
    ]);

    expect(results).toHaveLength(2);
    expect(results[0].content).toEqual([textBlock('OK')]);
    expect(results[1].content[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining('Unknown error'),
    });
  });
});
