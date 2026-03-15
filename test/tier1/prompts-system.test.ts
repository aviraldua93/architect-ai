/**
 * Tier 1 — System Prompts Tests
 *
 * Tests src/prompts/system-prompts.ts:
 * - All prompts are non-empty strings
 * - Contain expected behavioural constraints
 * - Have output format specifications
 * - getSystemPrompt() retrieval
 * - SYSTEM_PROMPTS registry
 *
 * @author Lin Wei, QA Functional — ArchitectAI
 */

import { describe, it, expect } from 'vitest';
import {
  QUIZ_SYSTEM_PROMPT,
  EXPLAINER_SYSTEM_PROMPT,
  ASSESSOR_SYSTEM_PROMPT,
  getSystemPrompt,
  SYSTEM_PROMPTS,
} from '../../src/prompts/system-prompts';
import type { AgentRole } from '../../src/prompts/system-prompts';

// ─── QUIZ_SYSTEM_PROMPT ─────────────────────────────────────────────────────

describe('QUIZ_SYSTEM_PROMPT', () => {
  it('is a non-empty string', () => {
    expect(typeof QUIZ_SYSTEM_PROMPT).toBe('string');
    expect(QUIZ_SYSTEM_PROMPT.length).toBeGreaterThan(0);
  });

  it('defines the Quiz Agent role', () => {
    expect(QUIZ_SYSTEM_PROMPT).toContain('Quiz Agent');
  });

  it('contains NEVER reveal answers constraint', () => {
    expect(QUIZ_SYSTEM_PROMPT).toContain('NEVER');
    expect(QUIZ_SYSTEM_PROMPT.toLowerCase()).toContain('reveal');
  });

  it('contains ALWAYS constraint', () => {
    expect(QUIZ_SYSTEM_PROMPT).toContain('ALWAYS');
  });

  it('references question_bank_query tool', () => {
    expect(QUIZ_SYSTEM_PROMPT).toContain('question_bank_query');
  });

  it('references progress_tracker tool', () => {
    expect(QUIZ_SYSTEM_PROMPT).toContain('progress_tracker');
  });

  it('references codebase_search tool', () => {
    expect(QUIZ_SYSTEM_PROMPT).toContain('codebase_search');
  });

  it('specifies output format for questions', () => {
    expect(QUIZ_SYSTEM_PROMPT).toContain('Output Format');
  });

  it('contains options A through D', () => {
    expect(QUIZ_SYSTEM_PROMPT).toContain('A)');
    expect(QUIZ_SYSTEM_PROMPT).toContain('B)');
    expect(QUIZ_SYSTEM_PROMPT).toContain('C)');
    expect(QUIZ_SYSTEM_PROMPT).toContain('D)');
  });

  it('mentions evaluation criteria', () => {
    expect(QUIZ_SYSTEM_PROMPT).toContain('Evaluation Criteria');
  });

  it('mentions weak areas surfacing', () => {
    expect(QUIZ_SYSTEM_PROMPT.toLowerCase()).toContain('weak area');
  });
});

// ─── EXPLAINER_SYSTEM_PROMPT ────────────────────────────────────────────────

describe('EXPLAINER_SYSTEM_PROMPT', () => {
  it('is a non-empty string', () => {
    expect(typeof EXPLAINER_SYSTEM_PROMPT).toBe('string');
    expect(EXPLAINER_SYSTEM_PROMPT.length).toBeGreaterThan(0);
  });

  it('defines the Explainer Agent role', () => {
    expect(EXPLAINER_SYSTEM_PROMPT).toContain('Explainer Agent');
  });

  it('requires code citations', () => {
    expect(EXPLAINER_SYSTEM_PROMPT.toLowerCase()).toContain('cite');
  });

  it('specifies ALWAYS include file path', () => {
    expect(EXPLAINER_SYSTEM_PROMPT).toContain('file path');
  });

  it('has layered explanation structure', () => {
    expect(EXPLAINER_SYSTEM_PROMPT).toContain('Simple');
    expect(EXPLAINER_SYSTEM_PROMPT).toContain('Detailed');
    expect(EXPLAINER_SYSTEM_PROMPT).toContain('Advanced');
  });

  it('mentions codebase_search as primary tool', () => {
    expect(EXPLAINER_SYSTEM_PROMPT).toContain('codebase_search');
  });

  it('mentions NOT using progress_tracker', () => {
    expect(EXPLAINER_SYSTEM_PROMPT).toContain('progress_tracker');
  });

  it('contains output format specification', () => {
    expect(EXPLAINER_SYSTEM_PROMPT).toContain('Output Format');
  });

  it('specifies citation format', () => {
    expect(EXPLAINER_SYSTEM_PROMPT).toContain('Citation Format');
  });

  it('mentions 500 word limit', () => {
    expect(EXPLAINER_SYSTEM_PROMPT).toContain('500');
  });

  it('mentions evaluation criteria', () => {
    expect(EXPLAINER_SYSTEM_PROMPT).toContain('Evaluation Criteria');
  });
});

// ─── ASSESSOR_SYSTEM_PROMPT ─────────────────────────────────────────────────

describe('ASSESSOR_SYSTEM_PROMPT', () => {
  it('is a non-empty string', () => {
    expect(typeof ASSESSOR_SYSTEM_PROMPT).toBe('string');
    expect(ASSESSOR_SYSTEM_PROMPT.length).toBeGreaterThan(0);
  });

  it('defines the Assessor Agent role', () => {
    expect(ASSESSOR_SYSTEM_PROMPT).toContain('Assessor Agent');
  });

  it('references 72% threshold', () => {
    expect(ASSESSOR_SYSTEM_PROMPT).toContain('72%');
  });

  it('contains domain weights', () => {
    expect(ASSESSOR_SYSTEM_PROMPT).toContain('28%');
    expect(ASSESSOR_SYSTEM_PROMPT).toContain('24%');
    expect(ASSESSOR_SYSTEM_PROMPT).toContain('16%');
    expect(ASSESSOR_SYSTEM_PROMPT).toContain('18%');
    expect(ASSESSOR_SYSTEM_PROMPT).toContain('14%');
  });

  it('mentions overconfidence detection', () => {
    expect(ASSESSOR_SYSTEM_PROMPT.toLowerCase()).toContain('overconfidence');
  });

  it('mentions underconfidence detection', () => {
    expect(ASSESSOR_SYSTEM_PROMPT.toLowerCase()).toContain('underconfidence');
  });

  it('references progress_tracker tool', () => {
    expect(ASSESSOR_SYSTEM_PROMPT).toContain('progress_tracker');
  });

  it('contains NEVER inflate scores constraint', () => {
    expect(ASSESSOR_SYSTEM_PROMPT).toContain('NEVER');
    expect(ASSESSOR_SYSTEM_PROMPT.toLowerCase()).toContain('inflate');
  });

  it('specifies readiness assessment output format', () => {
    expect(ASSESSOR_SYSTEM_PROMPT).toContain('Readiness Assessment');
  });

  it('mentions study plan output', () => {
    expect(ASSESSOR_SYSTEM_PROMPT).toContain('Study Plan');
  });

  it('mentions confidence calibration section', () => {
    expect(ASSESSOR_SYSTEM_PROMPT).toContain('Confidence Calibration');
  });

  it('contains evaluation criteria', () => {
    expect(ASSESSOR_SYSTEM_PROMPT).toContain('Evaluation Criteria');
  });
});

// ─── getSystemPrompt ────────────────────────────────────────────────────────

describe('getSystemPrompt', () => {
  it('returns quiz prompt for "quiz" role', () => {
    expect(getSystemPrompt('quiz')).toBe(QUIZ_SYSTEM_PROMPT);
  });

  it('returns explainer prompt for "explainer" role', () => {
    expect(getSystemPrompt('explainer')).toBe(EXPLAINER_SYSTEM_PROMPT);
  });

  it('returns assessor prompt for "assessor" role', () => {
    expect(getSystemPrompt('assessor')).toBe(ASSESSOR_SYSTEM_PROMPT);
  });

  it('throws for unknown role', () => {
    expect(() => getSystemPrompt('unknown' as AgentRole)).toThrow();
  });

  it('returned prompts are the same object references', () => {
    expect(getSystemPrompt('quiz')).toBe(QUIZ_SYSTEM_PROMPT);
  });
});

// ─── SYSTEM_PROMPTS registry ────────────────────────────────────────────────

describe('SYSTEM_PROMPTS', () => {
  it('has quiz key', () => {
    expect(SYSTEM_PROMPTS['quiz']).toBeDefined();
  });

  it('has explainer key', () => {
    expect(SYSTEM_PROMPTS['explainer']).toBeDefined();
  });

  it('has assessor key', () => {
    expect(SYSTEM_PROMPTS['assessor']).toBeDefined();
  });

  it('maps quiz to QUIZ_SYSTEM_PROMPT', () => {
    expect(SYSTEM_PROMPTS['quiz']).toBe(QUIZ_SYSTEM_PROMPT);
  });

  it('maps explainer to EXPLAINER_SYSTEM_PROMPT', () => {
    expect(SYSTEM_PROMPTS['explainer']).toBe(EXPLAINER_SYSTEM_PROMPT);
  });

  it('maps assessor to ASSESSOR_SYSTEM_PROMPT', () => {
    expect(SYSTEM_PROMPTS['assessor']).toBe(ASSESSOR_SYSTEM_PROMPT);
  });

  it('has exactly 3 entries', () => {
    expect(Object.keys(SYSTEM_PROMPTS)).toHaveLength(3);
  });

  it('all values are non-empty strings', () => {
    for (const value of Object.values(SYSTEM_PROMPTS)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(100);
    }
  });
});

// ─── Cross-prompt constraints ───────────────────────────────────────────────

describe('Cross-prompt consistency', () => {
  const allPrompts = [QUIZ_SYSTEM_PROMPT, EXPLAINER_SYSTEM_PROMPT, ASSESSOR_SYSTEM_PROMPT];

  it('all prompts define a role section', () => {
    for (const prompt of allPrompts) {
      expect(prompt).toContain('Your Role');
    }
  });

  it('all prompts have behavioural constraints', () => {
    for (const prompt of allPrompts) {
      expect(prompt).toContain('Behavioural Constraints');
    }
  });

  it('all prompts have tool usage guidance', () => {
    for (const prompt of allPrompts) {
      expect(prompt).toContain('Tool Usage');
    }
  });

  it('all prompts have output format', () => {
    for (const prompt of allPrompts) {
      expect(prompt).toContain('Output Format');
    }
  });

  it('all prompts have evaluation criteria', () => {
    for (const prompt of allPrompts) {
      expect(prompt).toContain('Evaluation Criteria');
    }
  });
});
