import { z } from 'zod';
import { createBodySchema, updateBodySchema, uuidParamsSchema } from './validation';
import {
  filmResponseSchema,
  castResponseSchema,
  listQuerySchema,
  searchBodySchema,
  paginatedResponseSchema,
} from './example';
import { BASE_RESPONSE } from '@/types/schemas';

const TAGS = ['Film'];
const SECURITY = [{ bearerAuth: [] }];

// ─── POST /film ──────────────────────────────────────────────────────────────

export const createSchema = {
  tags: TAGS,
  summary: 'Cadastra um filme',
  description:
    'Cria o filme na organização autenticada (role `admin`). Título e episódio são únicos na organização (409).',
  security: SECURITY,
  body: createBodySchema,
  response: {
    201: filmResponseSchema,
    ...BASE_RESPONSE,
  },
} as const;

// ─── PATCH /film/:uuid ───────────────────────────────────────────────────────

export const updateSchema = {
  tags: TAGS,
  summary: 'Atualiza parcialmente um filme',
  description: 'Mudar `category` sem ajustar `episode` viola a regra da saga e responde 422 `CHECK_VIOLATION`.',
  security: SECURITY,
  params: uuidParamsSchema,
  body: updateBodySchema,
  response: {
    200: filmResponseSchema,
    ...BASE_RESPONSE,
  },
} as const;

// ─── DELETE /film/:uuid ──────────────────────────────────────────────────────

export const deleteSchema = {
  tags: TAGS,
  summary: 'Remove um filme',
  description: 'Soft delete (role `admin`). Filme com elenco cadastrado não pode ser removido (409).',
  security: SECURITY,
  params: uuidParamsSchema,
  response: {
    204: z.null().describe('Filme removido'),
    ...BASE_RESPONSE,
  },
} as const;

// ─── GET /film/:uuid ─────────────────────────────────────────────────────────

export const findByIdSchema = {
  tags: TAGS,
  summary: 'Consulta um filme',
  security: SECURITY,
  params: uuidParamsSchema,
  response: {
    200: filmResponseSchema,
    ...BASE_RESPONSE,
  },
} as const;

// ─── GET /film/:uuid/cast ────────────────────────────────────────────────────

export const castSchema = {
  tags: TAGS,
  summary: 'Elenco do filme',
  description: 'Atores e personagens do filme (join `casting` × `actor` × `character`), principais primeiro.',
  security: SECURITY,
  params: uuidParamsSchema,
  response: {
    200: castResponseSchema,
    ...BASE_RESPONSE,
  },
} as const;

// ─── GET /film ───────────────────────────────────────────────────────────────

export const findAllSchema = {
  tags: TAGS,
  summary: 'Lista filmes (paginado)',
  description: 'Ordenação padrão por `release_date`. `condition` vai como JSON URL-encoded. Ver docs/pagination.md.',
  security: SECURITY,
  querystring: listQuerySchema,
  response: {
    200: paginatedResponseSchema,
    ...BASE_RESPONSE,
  },
} as const;

// ─── POST /film/search ───────────────────────────────────────────────────────

export const searchSchema = {
  tags: TAGS,
  summary: 'Busca filmes com filtros (paginado)',
  description: 'Mesma listagem do GET, com `condition` no body. Ver docs/pagination.md.',
  security: SECURITY,
  body: searchBodySchema,
  response: {
    200: paginatedResponseSchema,
    ...BASE_RESPONSE,
  },
} as const;
