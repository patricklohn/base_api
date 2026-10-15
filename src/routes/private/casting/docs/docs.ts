import { z } from 'zod';
import { createBodySchema, updateBodySchema, uuidParamsSchema } from './validation';
import {
  castingResponseSchema,
  castingDetailResponseSchema,
  listQuerySchema,
  searchBodySchema,
  paginatedResponseSchema,
} from './example';
import { BASE_RESPONSE } from '@/types/schemas';

const TAGS = ['Casting'];
const SECURITY = [{ bearerAuth: [] }];

// ─── POST /casting ───────────────────────────────────────────────────────────

export const createSchema = {
  tags: TAGS,
  summary: 'Adiciona uma participação ao elenco',
  description:
    'Liga um ator a um personagem em um filme (role `admin`). Filme, ator e personagem precisam existir na organização (422); a mesma combinação não se repete (409).',
  security: SECURITY,
  body: createBodySchema,
  response: {
    201: castingResponseSchema,
    ...BASE_RESPONSE,
  },
} as const;

// ─── PATCH /casting/:uuid ────────────────────────────────────────────────────

export const updateSchema = {
  tags: TAGS,
  summary: 'Atualiza parcialmente uma participação',
  security: SECURITY,
  params: uuidParamsSchema,
  body: updateBodySchema,
  response: {
    200: castingResponseSchema,
    ...BASE_RESPONSE,
  },
} as const;

// ─── DELETE /casting/:uuid ───────────────────────────────────────────────────

export const deleteSchema = {
  tags: TAGS,
  summary: 'Remove uma participação',
  description: 'Soft delete (role `admin`).',
  security: SECURITY,
  params: uuidParamsSchema,
  response: {
    204: z.null().describe('Participação removida'),
    ...BASE_RESPONSE,
  },
} as const;

// ─── GET /casting/:uuid ──────────────────────────────────────────────────────

export const findByIdSchema = {
  tags: TAGS,
  summary: 'Consulta uma participação',
  description: 'Inclui filme, ator e personagem resolvidos.',
  security: SECURITY,
  params: uuidParamsSchema,
  response: {
    200: castingDetailResponseSchema,
    ...BASE_RESPONSE,
  },
} as const;

// ─── GET /casting ────────────────────────────────────────────────────────────

export const findAllSchema = {
  tags: TAGS,
  summary: 'Lista participações (paginado)',
  description: '`condition` vai como JSON URL-encoded. Ver docs/pagination.md.',
  security: SECURITY,
  querystring: listQuerySchema,
  response: {
    200: paginatedResponseSchema,
    ...BASE_RESPONSE,
  },
} as const;

// ─── POST /casting/search ────────────────────────────────────────────────────

export const searchSchema = {
  tags: TAGS,
  summary: 'Busca participações com filtros (paginado)',
  description: 'Mesma listagem do GET, com `condition` no body. Ver docs/pagination.md.',
  security: SECURITY,
  body: searchBodySchema,
  response: {
    200: paginatedResponseSchema,
    ...BASE_RESPONSE,
  },
} as const;
