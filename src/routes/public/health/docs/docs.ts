import { pingExampleSchema, readyExampleSchema } from './example';
import { errorExampleSchema } from '@/types/schemas';

// ─── GET /health/ping ─────────────────────────────────────────────────────────

export const pingSchema = {
  tags: ['Health'],
  summary: 'Ping the API',
  description: 'Teste de liveness da API — sem dependências externas verificadas.',
  response: {
    200: pingExampleSchema,
  },
} as const;

// ─── GET /health/ready ────────────────────────────────────────────────────────

export const readySchema = {
  tags: ['Health'],
  summary: 'Readiness da API',
  description:
    'Verifica se a API consegue consultar o banco (`select 1`). Responde 503 se o banco estiver indisponível.',
  response: {
    200: readyExampleSchema,
    503: errorExampleSchema,
  },
} as const;
