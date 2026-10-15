import { z } from 'zod';
import { createBodySchema, updateBodySchema, uuidParamsSchema } from './validation';
import { planetResponseSchema, listQuerySchema, searchBodySchema, paginatedResponseSchema } from './example';
import { BASE_RESPONSE } from '@/types/schemas';

const TAGS = ['Planet'];
const SECURITY = [{ bearerAuth: [] }];

// ─── POST /planet ────────────────────────────────────────────────────────────

export const createSchema = {
  tags: TAGS,
  summary: 'Cadastra um planeta',
  description: 'Cria o planeta na organização autenticada (role `admin`). O nome é único na organização.',
  security: SECURITY,
  body: createBodySchema,
  response: {
    201: planetResponseSchema,
    ...BASE_RESPONSE,
  },
} as const;

// ─── PATCH /planet/:uuid ─────────────────────────────────────────────────────

export const updateSchema = {
  tags: TAGS,
  summary: 'Atualiza parcialmente um planeta',
  security: SECURITY,
  params: uuidParamsSchema,
  body: updateBodySchema,
  response: {
    200: planetResponseSchema,
    ...BASE_RESPONSE,
  },
} as const;

// ─── DELETE /planet/:uuid ────────────────────────────────────────────────────

export const deleteSchema = {
  tags: TAGS,
  summary: 'Remove um planeta',
  description: 'Soft delete (role `admin`). Planeta natal de algum personagem não pode ser removido (409).',
  security: SECURITY,
  params: uuidParamsSchema,
  response: {
    204: z.null().describe('Planeta removido'),
    ...BASE_RESPONSE,
  },
} as const;

// ─── GET /planet/:uuid ───────────────────────────────────────────────────────

export const findByIdSchema = {
  tags: TAGS,
  summary: 'Consulta um planeta',
  security: SECURITY,
  params: uuidParamsSchema,
  response: {
    200: planetResponseSchema,
    ...BASE_RESPONSE,
  },
} as const;

// ─── GET /planet ─────────────────────────────────────────────────────────────

export const findAllSchema = {
  tags: TAGS,
  summary: 'Lista planetas (paginado)',
  description: '`condition` é opcional e vai como JSON URL-encoded. Ver docs/pagination.md.',
  security: SECURITY,
  querystring: listQuerySchema,
  response: {
    200: paginatedResponseSchema,
    ...BASE_RESPONSE,
  },
} as const;

// ─── POST /planet/search ─────────────────────────────────────────────────────

export const searchSchema = {
  tags: TAGS,
  summary: 'Busca planetas com filtros (paginado)',
  description: 'Mesma listagem do GET, com `condition` no body. Ver docs/pagination.md.',
  security: SECURITY,
  body: searchBodySchema,
  response: {
    200: paginatedResponseSchema,
    ...BASE_RESPONSE,
  },
} as const;
