import { z } from 'zod';
import { createBodySchema, updateBodySchema, uuidParamsSchema } from './validation';
import {
  actorResponseSchema,
  filmographyResponseSchema,
  listQuerySchema,
  searchBodySchema,
  paginatedResponseSchema,
} from './example';
import { BASE_RESPONSE } from '@/types/schemas';

const TAGS = ['Actor'];
const SECURITY = [{ bearerAuth: [] }];

// ─── POST /actor ─────────────────────────────────────────────────────────────

export const createSchema = {
  tags: TAGS,
  summary: 'Cadastra um ator',
  description: 'Cria o ator na organização autenticada (role `admin`). O nome é único na organização.',
  security: SECURITY,
  body: createBodySchema,
  response: {
    201: actorResponseSchema,
    ...BASE_RESPONSE,
  },
} as const;

// ─── PATCH /actor/:uuid ──────────────────────────────────────────────────────

export const updateSchema = {
  tags: TAGS,
  summary: 'Atualiza parcialmente um ator',
  description: 'Atualiza apenas os campos enviados (role `admin`).',
  security: SECURITY,
  params: uuidParamsSchema,
  body: updateBodySchema,
  response: {
    200: actorResponseSchema,
    ...BASE_RESPONSE,
  },
} as const;

// ─── DELETE /actor/:uuid ─────────────────────────────────────────────────────

export const deleteSchema = {
  tags: TAGS,
  summary: 'Remove um ator',
  description: 'Soft delete (role `admin`). Ator com participação em algum elenco não pode ser removido (409).',
  security: SECURITY,
  params: uuidParamsSchema,
  response: {
    204: z.null().describe('Ator removido'),
    ...BASE_RESPONSE,
  },
} as const;

// ─── GET /actor/:uuid ────────────────────────────────────────────────────────

export const findByIdSchema = {
  tags: TAGS,
  summary: 'Consulta um ator',
  security: SECURITY,
  params: uuidParamsSchema,
  response: {
    200: actorResponseSchema,
    ...BASE_RESPONSE,
  },
} as const;

// ─── GET /actor/:uuid/filmography ────────────────────────────────────────────

export const filmographySchema = {
  tags: TAGS,
  summary: 'Filmografia do ator',
  description: 'Filmes e personagens do ator (join `casting` × `film` × `character`), em ordem de lançamento.',
  security: SECURITY,
  params: uuidParamsSchema,
  response: {
    200: filmographyResponseSchema,
    ...BASE_RESPONSE,
  },
} as const;

// ─── GET /actor ──────────────────────────────────────────────────────────────

export const findAllSchema = {
  tags: TAGS,
  summary: 'Lista atores (paginado)',
  description:
    'Lista paginada dos atores da organização. `condition` é opcional e vai como JSON URL-encoded. Ver docs/pagination.md.',
  security: SECURITY,
  querystring: listQuerySchema,
  response: {
    200: paginatedResponseSchema,
    ...BASE_RESPONSE,
  },
} as const;

// ─── POST /actor/search ──────────────────────────────────────────────────────

export const searchSchema = {
  tags: TAGS,
  summary: 'Busca atores com filtros (paginado)',
  description:
    'Mesma listagem do GET, com `condition` no body (indicado para filtros grandes ou aninhados). Ver docs/pagination.md.',
  security: SECURITY,
  body: searchBodySchema,
  response: {
    200: paginatedResponseSchema,
    ...BASE_RESPONSE,
  },
} as const;
