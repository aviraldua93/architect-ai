/**
 * Tier 1 — System Prompt Snapshot Tests
 *
 * Snapshot tests for all exported prompt constants in
 * src/prompts/system-prompts.ts. Any prompt change will
 * require an explicit snapshot update (--update-snapshots).
 */

import { describe, it, expect } from 'vitest';
import {
  QUIZ_SYSTEM_PROMPT,
  EXPLAINER_SYSTEM_PROMPT,
  ASSESSOR_SYSTEM_PROMPT,
  SYSTEM_PROMPTS,
} from '../../src/prompts/system-prompts';

describe('System Prompt Snapshots', () => {
  it('QUIZ_SYSTEM_PROMPT matches snapshot', () => {
    expect(QUIZ_SYSTEM_PROMPT).toMatchSnapshot();
  });

  it('EXPLAINER_SYSTEM_PROMPT matches snapshot', () => {
    expect(EXPLAINER_SYSTEM_PROMPT).toMatchSnapshot();
  });

  it('ASSESSOR_SYSTEM_PROMPT matches snapshot', () => {
    expect(ASSESSOR_SYSTEM_PROMPT).toMatchSnapshot();
  });

  it('SYSTEM_PROMPTS record matches snapshot', () => {
    expect(SYSTEM_PROMPTS).toMatchSnapshot();
  });
});
