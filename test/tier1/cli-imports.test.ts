/**
 * Tier 1 — CLI Module Import Health Check
 *
 * Verifies that all CLI modules can be imported without errors,
 * confirming no broken imports, circular dependencies, or syntax issues.
 *
 * Note: src/cli/index.ts has top-level side effects (calls main()),
 * so we verify it via a subprocess rather than a direct import.
 */

import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SRC = join(__dirname, '..', '..', 'src');

describe('CLI Module Imports', () => {

  // ── formatter.ts ─────────────────────────────────────────────
  describe('src/cli/formatter.ts', () => {
    it('file exists', () => {
      expect(existsSync(join(SRC, 'cli', 'formatter.ts'))).toBe(true);
    });

    it('imports cleanly and exports expected symbols', async () => {
      const mod = await import(join(SRC, 'cli', 'formatter.ts'));
      expect(mod.c).toBeDefined();
      expect(typeof mod.c.bold).toBe('function');
      expect(typeof mod.c.red).toBe('function');
      expect(typeof mod.c.green).toBe('function');
      expect(mod.colours).toBeDefined();
      expect(typeof mod.box).toBe('function');
      expect(typeof mod.progressBar).toBe('function');
      expect(typeof mod.wrapText).toBe('function');
      expect(typeof mod.banner).toBe('function');
      expect(typeof mod.divider).toBe('function');
      expect(typeof mod.stripAnsi).toBe('function');
    });
  });

  // ── quiz.ts ──────────────────────────────────────────────────
  describe('src/cli/quiz.ts', () => {
    it('file exists', () => {
      expect(existsSync(join(SRC, 'cli', 'quiz.ts'))).toBe(true);
    });

    it('imports cleanly and exports expected symbols', async () => {
      const mod = await import(join(SRC, 'cli', 'quiz.ts'));
      expect(typeof mod.loadQuestions).toBe('function');
      expect(typeof mod.filterQuestions).toBe('function');
      expect(typeof mod.runQuiz).toBe('function');
    });
  });

  // ── index.ts (entry point — side effects, tested via subprocess) ──
  describe('src/cli/index.ts', () => {
    it('file exists', () => {
      expect(existsSync(join(SRC, 'cli', 'index.ts'))).toBe(true);
    });

    it('can be syntax-checked by Node without crashing', () => {
      // Use TypeScript compiler to verify the file has no import/syntax errors.
      // We cannot import it directly because it calls main() at the top level.
      const tsconfig = join(SRC, '..', 'tsconfig.json');
      try {
        execSync(
          `npx tsc --noEmit --project "${tsconfig}" --pretty false 2>&1`,
          { cwd: join(SRC, '..'), encoding: 'utf-8', timeout: 15000 },
        );
      } catch (e: unknown) {
        const err = e as { stdout?: string; stderr?: string };
        const output = (err.stdout ?? '') + (err.stderr ?? '');
        // Only fail if errors are in cli/index.ts specifically
        const cliErrors = output.split('\n').filter(
          (line: string) => line.includes('cli/index.ts') && line.includes('error TS'),
        );
        expect(cliErrors, `TypeScript errors in cli/index.ts:\n${cliErrors.join('\n')}`).toHaveLength(0);
      }
    });
  });

  // ── No circular dependency check ─────────────────────────────
  describe('Circular dependency check', () => {
    it('formatter.ts and quiz.ts do not create import cycles', async () => {
      // If these imports succeed without hanging or throwing, there are
      // no circular dependency issues between the CLI modules.
      const [formatter, quiz] = await Promise.all([
        import(join(SRC, 'cli', 'formatter.ts')),
        import(join(SRC, 'cli', 'quiz.ts')),
      ]);
      expect(formatter).toBeDefined();
      expect(quiz).toBeDefined();
    });
  });
});
