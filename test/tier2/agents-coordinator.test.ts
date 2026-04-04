/**
 * Tier 2 — Coordinator Behaviour Tests
 *
 * Tests src/agents/coordinator.ts with mocked spawner and API client:
 * - Task decomposition parsing
 * - Subtask routing to correct agents
 * - Multi-result synthesis
 * - Graceful degradation on subagent failure
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/agents/spawner', () => ({
  spawnSubagent: vi.fn(),
  spawnParallel: vi.fn(),
}));

import { Coordinator } from '../../src/agents/coordinator';
import { spawnParallel } from '../../src/agents/spawner';
import type Anthropic from '@anthropic-ai/sdk';
import type { SubagentDefinition, SpawnResult } from '../../src/agents/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

const mockedSpawnParallel = vi.mocked(spawnParallel);

function textBlock(text: string) {
  return { type: 'text' as const, text, citations: null };
}

function makeSubagentDef(name: string, description: string): SubagentDefinition {
  return {
    name,
    description,
    systemPrompt: `You are the ${name} agent.`,
    tools: [],
    toolRegistry: new Map(),
  };
}

function makeSpawnResult(text: string, input = 10, output = 20): SpawnResult {
  return {
    content: [textBlock(text)],
    iterations: 1,
    tokenUsage: { input, output },
    durationMs: 50,
  };
}

function makeDecomposeResponse(tasks: Array<{ subagentName: string; instruction: string; contextFacts?: string[]; priority?: number }>) {
  return {
    content: [{
      type: 'tool_use' as const,
      id: 'tu_decompose',
      name: 'decompose_task',
      input: {
        tasks: tasks.map((t) => ({
          subagentName: t.subagentName,
          instruction: t.instruction,
          contextFacts: t.contextFacts ?? [],
          priority: t.priority ?? 0,
        })),
      },
    }],
    stop_reason: 'tool_use',
    usage: { input_tokens: 50, output_tokens: 100 },
  };
}

function makeSynthesisResponse(text: string) {
  return {
    content: [textBlock(text)],
    stop_reason: 'end_turn',
    usage: { input_tokens: 30, output_tokens: 40 },
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Coordinator', () => {
  const subagents = [
    makeSubagentDef('researcher', 'Finds information'),
    makeSubagentDef('writer', 'Writes content'),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('decomposes input into subtask array', async () => {
    let callCount = 0;
    const client = {
      messages: {
        create: vi.fn(async () => {
          callCount++;
          if (callCount === 1) {
            // Both tasks at priority 0 → single spawnParallel call
            return makeDecomposeResponse([
              { subagentName: 'researcher', instruction: 'Research climate', priority: 0 },
              { subagentName: 'writer', instruction: 'Write report', priority: 0 },
            ]);
          }
          return makeSynthesisResponse('Combined result');
        }),
      },
    } as unknown as Anthropic;

    // Both tasks in same priority group → one spawnParallel call with 2 results
    mockedSpawnParallel.mockResolvedValueOnce([
      makeSpawnResult('Research done'),
      makeSpawnResult('Report written'),
    ]);

    const coordinator = new Coordinator(client, { model: 'test-model', subagents });
    const result = await coordinator.handle('Write a climate report');

    expect(mockedSpawnParallel).toHaveBeenCalledOnce();
    expect(result.subagentResults).toHaveLength(2);
    expect(result.subagentResults[0].subagentName).toBe('researcher');
    expect(result.subagentResults[1].subagentName).toBe('writer');
  });

  it('routes subtasks to correct agent type', async () => {
    let callCount = 0;
    const client = {
      messages: {
        create: vi.fn(async () => {
          callCount++;
          if (callCount === 1) {
            return makeDecomposeResponse([
              { subagentName: 'researcher', instruction: 'Find data', priority: 0 },
            ]);
          }
          return makeSynthesisResponse('Final answer');
        }),
      },
    } as unknown as Anthropic;

    mockedSpawnParallel.mockResolvedValueOnce([makeSpawnResult('Found data')]);

    const coordinator = new Coordinator(client, { model: 'test-model', subagents });
    await coordinator.handle('Find some data');

    // Verify spawnParallel was called with configs matching the researcher subagent
    const spawnConfigs = mockedSpawnParallel.mock.calls[0][1];
    expect(spawnConfigs).toHaveLength(1);
    expect(spawnConfigs[0].systemPrompt).toBe('You are the researcher agent.');
  });

  it('synthesises multiple results into combined output', async () => {
    let callCount = 0;
    const client = {
      messages: {
        create: vi.fn(async () => {
          callCount++;
          if (callCount === 1) {
            // Both at same priority → one spawnParallel call
            return makeDecomposeResponse([
              { subagentName: 'researcher', instruction: 'Research', priority: 0 },
              { subagentName: 'writer', instruction: 'Write', priority: 0 },
            ]);
          }
          return makeSynthesisResponse('Synthesised final answer');
        }),
      },
    } as unknown as Anthropic;

    // Single call returns both results
    mockedSpawnParallel.mockResolvedValueOnce([
      makeSpawnResult('Research data'),
      makeSpawnResult('Written content'),
    ]);

    const coordinator = new Coordinator(client, { model: 'test-model', subagents });
    const result = await coordinator.handle('Full report');

    expect(result.finalResponse).toEqual([textBlock('Synthesised final answer')]);
    expect(result.subagentResults).toHaveLength(2);
    // Verify synthesis API call received the subagent results
    expect(client.messages.create).toHaveBeenCalledTimes(2); // decompose + synthesise
    expect(result.totalTokenUsage.input).toBeGreaterThan(0);
    expect(result.totalTokenUsage.output).toBeGreaterThan(0);
  });

  it('degrades gracefully when one subagent fails', async () => {
    let callCount = 0;
    const client = {
      messages: {
        create: vi.fn(async () => {
          callCount++;
          if (callCount === 1) {
            return makeDecomposeResponse([
              { subagentName: 'researcher', instruction: 'Research', priority: 0 },
              { subagentName: 'writer', instruction: 'Write', priority: 0 },
            ]);
          }
          return makeSynthesisResponse('Partial result with degradation');
        }),
      },
    } as unknown as Anthropic;

    // One success, one failure (spawnParallel returns error content for failed agents)
    mockedSpawnParallel.mockResolvedValueOnce([
      makeSpawnResult('Research complete'),
      {
        content: [textBlock('Subagent 1 failed: Timeout')],
        iterations: 0,
        tokenUsage: { input: 0, output: 0 },
        durationMs: 0,
      },
    ]);

    const coordinator = new Coordinator(client, { model: 'test-model', subagents });
    const result = await coordinator.handle('Write report');

    // Coordinator still produces a final response despite one failure
    expect(result.finalResponse).toEqual([textBlock('Partial result with degradation')]);
    expect(result.subagentResults).toHaveLength(2);
  });
});
