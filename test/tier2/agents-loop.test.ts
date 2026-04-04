/**
 * Tier 2 — Agentic Loop Behaviour Tests
 *
 * Tests src/agents/loop.ts with mocked Anthropic client:
 * - end_turn termination
 * - maxIterations safety cap
 * - tool_use block processing
 * - unknown stop_reason handling
 * - conversation history accumulation
 * - API error propagation
 */

import { describe, it, expect, vi } from 'vitest';
import { runAgenticLoop } from '../../src/agents/loop';
import type {
  AgenticLoopConfig,
  ToolImplementation,
  ToolRegistry,
} from '../../src/agents/types';
import type Anthropic from '@anthropic-ai/sdk';

// ─── Helpers ────────────────────────────────────────────────────────────────

function createMockClient(responses: (Record<string, unknown> | Error)[]) {
  let callIndex = 0;
  return {
    messages: {
      create: vi.fn(async () => {
        const resp = responses[callIndex++];
        if (resp instanceof Error) throw resp;
        return resp;
      }),
    },
  } as unknown as Anthropic;
}

function mockResponse(
  stopReason: string,
  content: unknown[],
  inputTokens = 10,
  outputTokens = 20,
) {
  return {
    content,
    stop_reason: stopReason,
    usage: { input_tokens: inputTokens, output_tokens: outputTokens },
  };
}

function textBlock(text: string) {
  return { type: 'text' as const, text, citations: null };
}

function toolUseBlock(id: string, name: string, input: Record<string, unknown>) {
  return { type: 'tool_use' as const, id, name, input };
}

function makeTool(name: string, executeFn?: (input: Record<string, unknown>) => Promise<unknown>): ToolImplementation {
  return {
    name,
    definition: { name, description: name, input_schema: { type: 'object' as const, properties: {} } },
    execute: executeFn ?? (async () => 'ok'),
  };
}

// ─── Base config ────────────────────────────────────────────────────────────

const baseConfig: AgenticLoopConfig = {
  model: 'claude-sonnet-4-20250514',
  systemPrompt: 'You are a test agent.',
  tools: [],
  toolRegistry: new Map(),
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('runAgenticLoop', () => {
  it('terminates on end_turn stop_reason', async () => {
    const client = createMockClient([
      mockResponse('end_turn', [textBlock('Done!')]),
    ]);

    const result = await runAgenticLoop(client, baseConfig, 'Hello');

    expect(result.iterations).toBe(1);
    expect(result.finalContent).toEqual([textBlock('Done!')]);
    expect(result.totalTokens).toEqual({ input: 10, output: 20 });
  });

  it('respects maxIterations cap', async () => {
    const tool = makeTool('noop');
    const registry: ToolRegistry = new Map([['noop', tool]]);
    const responses = Array.from({ length: 3 }, () =>
      mockResponse('tool_use', [toolUseBlock('tu_1', 'noop', {})]),
    );
    const client = createMockClient(responses);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await runAgenticLoop(
      client,
      { ...baseConfig, maxIterations: 3, toolRegistry: registry, tools: [tool.definition] },
      'Loop forever',
    );

    expect(result.iterations).toBe(3);
    expect(result.finalContent[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining('safety cap'),
    });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Safety cap reached'));
    warnSpy.mockRestore();
  });

  it('processes tool_use blocks and continues', async () => {
    const executeSpy = vi.fn(async () => ({ found: true }));
    const tool = makeTool('search', executeSpy);
    const registry: ToolRegistry = new Map([['search', tool]]);

    const client = createMockClient([
      mockResponse('tool_use', [toolUseBlock('tu_1', 'search', { q: 'test' })]),
      mockResponse('end_turn', [textBlock('Here is the answer.')]),
    ]);

    const result = await runAgenticLoop(
      client,
      { ...baseConfig, toolRegistry: registry, tools: [tool.definition] },
      'Find something',
    );

    expect(result.iterations).toBe(2);
    expect(result.finalContent).toEqual([textBlock('Here is the answer.')]);
    expect(executeSpy).toHaveBeenCalledOnce();
    expect(executeSpy).toHaveBeenCalledWith({ q: 'test' });
  });

  it('handles unknown stop_reason gracefully', async () => {
    const client = createMockClient([
      mockResponse('some_new_reason', [textBlock('Unexpected')]),
    ]);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await runAgenticLoop(client, baseConfig, 'Test');

    expect(result.iterations).toBe(1);
    expect(result.finalContent).toEqual([textBlock('Unexpected')]);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unrecognised stop_reason'),
    );
    warnSpy.mockRestore();
  });

  it('accumulates history correctly across iterations', async () => {
    const tool = makeTool('echo', async () => 'echoed');
    const registry: ToolRegistry = new Map([['echo', tool]]);

    const client = createMockClient([
      mockResponse('tool_use', [toolUseBlock('tu_1', 'echo', { msg: 'hi' })]),
      mockResponse('end_turn', [textBlock('Final')]),
    ]);

    const result = await runAgenticLoop(
      client,
      { ...baseConfig, toolRegistry: registry, tools: [tool.definition] },
      'Start',
    );

    // user message + assistant tool_use + user tool_result = 3 entries
    expect(result.conversationHistory).toHaveLength(3);
    expect(result.conversationHistory[0]).toEqual({ role: 'user', content: 'Start' });
    expect(result.conversationHistory[1]).toMatchObject({ role: 'assistant' });
    expect(result.conversationHistory[2]).toMatchObject({ role: 'user' });

    // Verify tool_result is in the third entry
    const toolResultContent = result.conversationHistory[2].content as unknown[];
    expect(toolResultContent[0]).toMatchObject({
      type: 'tool_result',
      tool_use_id: 'tu_1',
    });

    // Tokens accumulate across both iterations
    expect(result.totalTokens).toEqual({ input: 20, output: 40 });
  });

  it('throws on API error', async () => {
    const client = createMockClient([
      new Error('API rate limit exceeded'),
    ]);

    await expect(
      runAgenticLoop(client, baseConfig, 'Fail'),
    ).rejects.toThrow('API rate limit exceeded');
  });
});
