import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.spec.js'],
    globalSetup: ['./tests/integration/global-setup.js'],
    testTimeout: 15000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
});
