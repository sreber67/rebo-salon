import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Unit tests (tests/unit) run on their own. Rules and API tests (tests/rules, tests/api)
// need the Firebase emulators and run through `npm run test:emulator`.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      // `server-only` throws outside a React server environment; tests call route handlers directly
      'server-only': path.resolve(import.meta.dirname, 'tests/support/empty.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/rules/**/*.test.ts', 'tests/api/**/*.test.ts'],
    testTimeout: 20000,
    hookTimeout: 30000,
    // Emulator-backed suites share one database, so files run one at a time
    fileParallelism: false,
  },
});
