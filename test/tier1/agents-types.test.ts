/**
 * Tier 1 — Agent Module Export Verification
 *
 * Verifies that all agent modules export the expected interfaces,
 * classes, and functions. Catches: broken imports, missing exports,
 * renamed symbols, or accidental deletions.
 */

import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const AGENTS = join(__dirname, '..', '..', 'src', 'agents');

describe('Agent Module Exports', () => {

  // ── src/agents/types.ts ──────────────────────────────────────
  describe('src/agents/types.ts', () => {
    it('file exists', () => {
      expect(existsSync(join(AGENTS, 'types.ts'))).toBe(true);
    });

    it('imports cleanly and has expected type-related exports', async () => {
      const mod = await import(join(AGENTS, 'types.ts'));
      // types.ts re-exports Anthropic SDK types and defines interfaces.
      // At runtime, only value exports (not pure type exports) are visible.
      // We verify the module loads without errors — that's the key check.
      expect(mod).toBeDefined();
    });
  });

  // ── src/agents/loop.ts ───────────────────────────────────────
  describe('src/agents/loop.ts', () => {
    it('file exists', () => {
      expect(existsSync(join(AGENTS, 'loop.ts'))).toBe(true);
    });

    it('exports runAgenticLoop', async () => {
      const mod = await import(join(AGENTS, 'loop.ts'));
      expect(typeof mod.runAgenticLoop).toBe('function');
    });
  });

  // ── src/agents/coordinator.ts ────────────────────────────────
  describe('src/agents/coordinator.ts', () => {
    it('file exists', () => {
      expect(existsSync(join(AGENTS, 'coordinator.ts'))).toBe(true);
    });

    it('exports Coordinator class', async () => {
      const mod = await import(join(AGENTS, 'coordinator.ts'));
      expect(mod.Coordinator).toBeDefined();
      expect(typeof mod.Coordinator).toBe('function'); // classes are functions
    });
  });

  // ── src/agents/spawner.ts ────────────────────────────────────
  describe('src/agents/spawner.ts', () => {
    it('file exists', () => {
      expect(existsSync(join(AGENTS, 'spawner.ts'))).toBe(true);
    });

    it('exports spawnSubagent', async () => {
      const mod = await import(join(AGENTS, 'spawner.ts'));
      expect(typeof mod.spawnSubagent).toBe('function');
    });

    it('exports spawnParallel', async () => {
      const mod = await import(join(AGENTS, 'spawner.ts'));
      expect(typeof mod.spawnParallel).toBe('function');
    });
  });

  // ── src/agents/hooks.ts ──────────────────────────────────────
  describe('src/agents/hooks.ts', () => {
    it('file exists', () => {
      expect(existsSync(join(AGENTS, 'hooks.ts'))).toBe(true);
    });

    it('exports createHookPipeline', async () => {
      const mod = await import(join(AGENTS, 'hooks.ts'));
      expect(typeof mod.createHookPipeline).toBe('function');
    });

    it('exports createTimestampNormalisationHook', async () => {
      const mod = await import(join(AGENTS, 'hooks.ts'));
      expect(typeof mod.createTimestampNormalisationHook).toBe('function');
    });

    it('exports createStatusCodeNormalisationHook', async () => {
      const mod = await import(join(AGENTS, 'hooks.ts'));
      expect(typeof mod.createStatusCodeNormalisationHook).toBe('function');
    });

    it('exports createThresholdGuardHook', async () => {
      const mod = await import(join(AGENTS, 'hooks.ts'));
      expect(typeof mod.createThresholdGuardHook).toBe('function');
    });

    it('exports createToolBlocklistHook', async () => {
      const mod = await import(join(AGENTS, 'hooks.ts'));
      expect(typeof mod.createToolBlocklistHook).toBe('function');
    });
  });
});
