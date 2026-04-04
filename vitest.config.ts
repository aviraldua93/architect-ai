import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/tier1/**/*.test.ts', 'test/tier2/**/*.test.ts'],
    testTimeout: 5000,
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/index.ts',
        'src/tools/tool-choice-demo.ts',
        'src/prompts/batch-api-demo.ts',
      ],
      all: true,
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 55,
        statements: 60,
      },
    },
  },
});
