import { meExampleSchema } from './example';
import { BASE_RESPONSE } from '@/types/schemas';

// ─── GET /auth/me ────────────────────────────────────────────────────────────

export const meSchema = {
  tags: ['Auth'],
  summary: 'Consulta a credencial autenticada',
  description: 'Retorna o role, a credencial e a organização autenticada (somente dados não sensíveis).',
  security: [{ bearerAuth: [] }],
  response: {
    200: meExampleSchema,
    ...BASE_RESPONSE,
  },
} as const;
