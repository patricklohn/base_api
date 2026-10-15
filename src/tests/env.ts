/** Banco descartável dos testes de integração: criado e apagado pelo `global-setup-integration.ts`. */
export const TEST_DB_NAME = 'base_api_test';

/**
 * Valores fixos dos testes, aplicados antes de qualquer import do `Env`.
 * Como o dotenv não sobrescreve variáveis já definidas, o `.env` local não interfere neles.
 */
export function applyTestEnv(overrides: Record<string, string> = {}) {
  Object.assign(process.env, {
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    JWT_SECRET: 'test-secret-com-pelo-menos-32-caracteres',
    JWT_EXPIRES_IN: '15m',
    ALLOWED_ORIGINS: 'http://localhost:3001',
    SENTRY_DSN: '',
    ...overrides,
  });
}
