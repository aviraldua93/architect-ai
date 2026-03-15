import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/tier1/**/*.test.ts'],
    testTimeout: 5000,
  },
});
