import { z } from 'zod';
import { loginBodySchema, refreshTokenBodySchema } from './validation';
import { loginExampleSchema, refreshExampleSchema } from './example';
import { BASE_RESPONSE } from '@/types/schemas';

// ─── POST /auth/login ────────────────────────────────────────────────────────

export const loginSchema = {
  tags: ['Auth'],
  summary: 'Autentica uma credencial',
  description:
    'Recebe client_id e client_secret e retorna um access token JWT com o role da credencial ' +
    'e um refresh token. O refresh token também vai no cookie httpOnly `refresh_token` (restrito a /api/v1/auth).',
  body: loginBodySchema,
  response: {
    200: loginExampleSchema,
    ...BASE_RESPONSE,
  },
} as const;

// ─── POST /auth/refresh ──────────────────────────────────────────────────────

export const refreshSchema = {
  tags: ['Auth'],
  summary: 'Renova o access token',
  description:
    'Troca o refresh token (body ou cookie `refresh_token`) por um novo access token e um novo refresh token. ' +
    'O token usado deixa de valer; reutilizá-lo revoga a sessão inteira.',
  body: refreshTokenBodySchema,
  response: {
    200: refreshExampleSchema,
    ...BASE_RESPONSE,
  },
} as const;

// ─── POST /auth/logout ───────────────────────────────────────────────────────

export const logoutSchema = {
  tags: ['Auth'],
  summary: 'Encerra a sessão',
  description:
    'Revoga o refresh token (body ou cookie `refresh_token`) e os demais da mesma sessão e apaga o cookie. ' +
    'Idempotente: token desconhecido ou já revogado também responde 204.',
  body: refreshTokenBodySchema,
  response: {
    204: z.null().describe('Sessão encerrada'),
    ...BASE_RESPONSE,
  },
} as const;
