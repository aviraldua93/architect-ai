/**
 * Tier 1 — Tool Definitions Tests
 *
 * Tests all tool definitions in src/tools/definitions.ts:
 * - questionBankTool, progressTrackerTool, codebaseSearchTool
 * - Zod schema validation (happy path + edge cases)
 * - toAnthropicToolDefinition converter
 * - ALL_TOOL_DEFINITIONS registry
 *
 * @author Catherine Park, Senior QA Engineer — ArchitectAI
 */

import { describe, it, expect } from 'vitest';
import {
  QuestionBankInputSchema,
  ProgressTrackerInputSchema,
  CodebaseSearchInputSchema,
  questionBankTool,
  progressTrackerTool,
  codebaseSearchTool,
  toAnthropicToolDefinition,
  ALL_TOOL_DEFINITIONS,
} from '../../src/tools/definitions';

// ─── QuestionBankInputSchema ────────────────────────────────────────────────

describe('QuestionBankInputSchema', () => {
  it('accepts valid full input', () => {
    const result = QuestionBankInputSchema.safeParse({
      domain: 3,
      taskStatement: '3.1',
      difficulty: 'advanced',
      count: 10,
      excludeIds: ['q1', 'q2'],
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty object (all fields optional except count with default)', () => {
    const result = QuestionBankInputSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.count).toBe(5); // default
    }
  });

  it('applies default count of 5', () => {
    const result = QuestionBankInputSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.count).toBe(5);
    }
  });

  it('rejects domain below 1', () => {
    const result = QuestionBankInputSchema.safeParse({ domain: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects domain above 5', () => {
    const result = QuestionBankInputSchema.safeParse({ domain: 6 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer domain', () => {
    const result = QuestionBankInputSchema.safeParse({ domain: 2.5 });
    expect(result.success).toBe(false);
  });

  it('rejects invalid taskStatement format', () => {
    const result = QuestionBankInputSchema.safeParse({ taskStatement: 'abc' });
    expect(result.success).toBe(false);
  });

  it('accepts valid taskStatement format "2.1"', () => {
    const result = QuestionBankInputSchema.safeParse({ taskStatement: '2.1' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid difficulty value', () => {
    const result = QuestionBankInputSchema.safeParse({ difficulty: 'expert' });
    expect(result.success).toBe(false);
  });

  it('accepts "foundation" difficulty', () => {
    const result = QuestionBankInputSchema.safeParse({ difficulty: 'foundation' });
    expect(result.success).toBe(true);
  });

  it('accepts "intermediate" difficulty', () => {
    const result = QuestionBankInputSchema.safeParse({ difficulty: 'intermediate' });
    expect(result.success).toBe(true);
  });

  it('accepts "advanced" difficulty', () => {
    const result = QuestionBankInputSchema.safeParse({ difficulty: 'advanced' });
    expect(result.success).toBe(true);
  });

  it('rejects count below 1', () => {
    const result = QuestionBankInputSchema.safeParse({ count: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects count above 20', () => {
    const result = QuestionBankInputSchema.safeParse({ count: 21 });
    expect(result.success).toBe(false);
  });

  it('accepts count of 1 (min boundary)', () => {
    const result = QuestionBankInputSchema.safeParse({ count: 1 });
    expect(result.success).toBe(true);
  });

  it('accepts count of 20 (max boundary)', () => {
    const result = QuestionBankInputSchema.safeParse({ count: 20 });
    expect(result.success).toBe(true);
  });

  it('accepts excludeIds as empty array', () => {
    const result = QuestionBankInputSchema.safeParse({ excludeIds: [] });
    expect(result.success).toBe(true);
  });

  it('rejects excludeIds with non-string elements', () => {
    const result = QuestionBankInputSchema.safeParse({ excludeIds: [123] });
    expect(result.success).toBe(false);
  });
});

// ─── ProgressTrackerInputSchema ─────────────────────────────────────────────

describe('ProgressTrackerInputSchema', () => {
  it('accepts get_summary action', () => {
    const result = ProgressTrackerInputSchema.safeParse({ action: 'get_summary' });
    expect(result.success).toBe(true);
  });

  it('accepts record_answer with required fields', () => {
    const result = ProgressTrackerInputSchema.safeParse({
      action: 'record_answer',
      questionId: 'd1-q01',
      correct: true,
    });
    expect(result.success).toBe(true);
  });

  it('accepts get_weak_areas action', () => {
    const result = ProgressTrackerInputSchema.safeParse({ action: 'get_weak_areas' });
    expect(result.success).toBe(true);
  });

  it('accepts get_history with domain filter', () => {
    const result = ProgressTrackerInputSchema.safeParse({
      action: 'get_history',
      domain: 2,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid action', () => {
    const result = ProgressTrackerInputSchema.safeParse({ action: 'invalid_action' });
    expect(result.success).toBe(false);
  });

  it('rejects missing action', () => {
    const result = ProgressTrackerInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('accepts confidence between 0 and 1', () => {
    const result = ProgressTrackerInputSchema.safeParse({
      action: 'record_answer',
      questionId: 'q1',
      correct: false,
      confidence: 0.75,
    });
    expect(result.success).toBe(true);
  });

  it('rejects confidence above 1', () => {
    const result = ProgressTrackerInputSchema.safeParse({
      action: 'record_answer',
      confidence: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it('rejects confidence below 0', () => {
    const result = ProgressTrackerInputSchema.safeParse({
      action: 'record_answer',
      confidence: -0.1,
    });
    expect(result.success).toBe(false);
  });

  it('accepts confidence of 0 (min boundary)', () => {
    const result = ProgressTrackerInputSchema.safeParse({
      action: 'record_answer',
      confidence: 0,
    });
    expect(result.success).toBe(true);
  });

  it('accepts confidence of 1 (max boundary)', () => {
    const result = ProgressTrackerInputSchema.safeParse({
      action: 'record_answer',
      confidence: 1,
    });
    expect(result.success).toBe(true);
  });
});

// ─── CodebaseSearchInputSchema ──────────────────────────────────────────────

describe('CodebaseSearchInputSchema', () => {
  it('accepts valid query', () => {
    const result = CodebaseSearchInputSchema.safeParse({ query: 'agentic loop stop condition' });
    expect(result.success).toBe(true);
  });

  it('applies default maxResults of 3', () => {
    const result = CodebaseSearchInputSchema.safeParse({ query: 'test query' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.maxResults).toBe(3);
    }
  });

  it('applies default includeComments of true', () => {
    const result = CodebaseSearchInputSchema.safeParse({ query: 'test query' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.includeComments).toBe(true);
    }
  });

  it('rejects query shorter than 3 characters', () => {
    const result = CodebaseSearchInputSchema.safeParse({ query: 'ab' });
    expect(result.success).toBe(false);
  });

  it('rejects query longer than 200 characters', () => {
    const result = CodebaseSearchInputSchema.safeParse({ query: 'x'.repeat(201) });
    expect(result.success).toBe(false);
  });

  it('accepts query at 3-char boundary', () => {
    const result = CodebaseSearchInputSchema.safeParse({ query: 'abc' });
    expect(result.success).toBe(true);
  });

  it('accepts query at 200-char boundary', () => {
    const result = CodebaseSearchInputSchema.safeParse({ query: 'x'.repeat(200) });
    expect(result.success).toBe(true);
  });

  it('rejects maxResults below 1', () => {
    const result = CodebaseSearchInputSchema.safeParse({ query: 'test', maxResults: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects maxResults above 10', () => {
    const result = CodebaseSearchInputSchema.safeParse({ query: 'test', maxResults: 11 });
    expect(result.success).toBe(false);
  });

  it('accepts optional filePattern', () => {
    const result = CodebaseSearchInputSchema.safeParse({
      query: 'test query',
      filePattern: 'src/agents/*.ts',
    });
    expect(result.success).toBe(true);
  });

  it('accepts includeComments set to false', () => {
    const result = CodebaseSearchInputSchema.safeParse({
      query: 'test query',
      includeComments: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.includeComments).toBe(false);
    }
  });
});

// ─── Tool definition structure ──────────────────────────────────────────────

describe('Tool definition objects', () => {
  for (const tool of [questionBankTool, progressTrackerTool, codebaseSearchTool]) {
    describe(tool.name, () => {
      it('has a non-empty name', () => {
        expect(tool.name).toBeTruthy();
        expect(typeof tool.name).toBe('string');
      });

      it('has a non-empty description', () => {
        expect(tool.description).toBeTruthy();
        expect(tool.description.length).toBeGreaterThan(10);
      });

      it('has an input_schema that is a Zod schema', () => {
        expect(tool.input_schema).toBeDefined();
        expect(typeof tool.input_schema.safeParse).toBe('function');
      });
    });
  }

  it('questionBankTool has name "question_bank_query"', () => {
    expect(questionBankTool.name).toBe('question_bank_query');
  });

  it('progressTrackerTool has name "progress_tracker"', () => {
    expect(progressTrackerTool.name).toBe('progress_tracker');
  });

  it('codebaseSearchTool has name "codebase_search"', () => {
    expect(codebaseSearchTool.name).toBe('codebase_search');
  });
});

// ─── toAnthropicToolDefinition ──────────────────────────────────────────────

describe('toAnthropicToolDefinition', () => {
  it('converts questionBankTool to Anthropic format', () => {
    const result = toAnthropicToolDefinition(questionBankTool);
    expect(result.name).toBe('question_bank_query');
    expect(typeof result.description).toBe('string');
    expect(typeof result.input_schema).toBe('object');
  });

  it('produces input_schema with type "object"', () => {
    const result = toAnthropicToolDefinition(questionBankTool);
    expect(result.input_schema['type']).toBe('object');
  });

  it('produces input_schema with properties', () => {
    const result = toAnthropicToolDefinition(questionBankTool);
    expect(result.input_schema['properties']).toBeDefined();
  });

  it('preserves tool name in conversion', () => {
    for (const tool of ALL_TOOL_DEFINITIONS) {
      const converted = toAnthropicToolDefinition(tool);
      expect(converted.name).toBe(tool.name);
    }
  });

  it('preserves tool description in conversion', () => {
    for (const tool of ALL_TOOL_DEFINITIONS) {
      const converted = toAnthropicToolDefinition(tool);
      expect(converted.description).toBe(tool.description);
    }
  });

  it('converts progressTrackerTool with action as required field', () => {
    const result = toAnthropicToolDefinition(progressTrackerTool);
    const required = result.input_schema['required'] as string[];
    expect(required).toContain('action');
  });

  it('converts codebaseSearchTool with query as required', () => {
    const result = toAnthropicToolDefinition(codebaseSearchTool);
    const required = result.input_schema['required'] as string[];
    expect(required).toContain('query');
  });

  it('does not include optional fields in required array for questionBankTool', () => {
    const result = toAnthropicToolDefinition(questionBankTool);
    const required = result.input_schema['required'] as string[] | undefined;
    // All questionBank fields are optional or defaulted
    expect(required).toBeUndefined();
  });

  it('produces JSON-serializable output', () => {
    for (const tool of ALL_TOOL_DEFINITIONS) {
      const converted = toAnthropicToolDefinition(tool);
      const json = JSON.stringify(converted);
      const parsed = JSON.parse(json);
      expect(parsed.name).toBe(tool.name);
    }
  });
});

// ─── ALL_TOOL_DEFINITIONS ───────────────────────────────────────────────────

describe('ALL_TOOL_DEFINITIONS', () => {
  it('contains exactly 3 tools', () => {
    expect(ALL_TOOL_DEFINITIONS).toHaveLength(3);
  });

  it('has unique tool names', () => {
    const names = ALL_TOOL_DEFINITIONS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('includes all three expected tools', () => {
    const names = ALL_TOOL_DEFINITIONS.map((t) => t.name);
    expect(names).toContain('question_bank_query');
    expect(names).toContain('progress_tracker');
    expect(names).toContain('codebase_search');
  });
});
