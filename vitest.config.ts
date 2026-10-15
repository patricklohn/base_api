import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

/**
 * Dois projetos:
 * - `unit`: sem banco, roda no pre-push (`pnpm test`);
 * - `integration`: rotas contra um banco descartável criado e apagado pela própria suíte (`pnpm test:integration`).
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts'],
          exclude: ['src/**/*.integration.test.ts'],
          setupFiles: ['src/tests/setup-unit.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['src/**/*.integration.test.ts'],
          setupFiles: ['src/tests/setup-integration.ts'],
          globalSetup: ['src/tests/global-setup-integration.ts'],
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
