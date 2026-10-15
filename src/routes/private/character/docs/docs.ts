import { z } from 'zod';
import { createBodySchema, updateBodySchema, uuidParamsSchema } from './validation';
import {
  characterResponseSchema,
  characterDetailResponseSchema,
  listQuerySchema,
  searchBodySchema,
  paginatedResponseSchema,
} from './example';
import { BASE_RESPONSE } from '@/types/schemas';

const TAGS = ['Character'];
const SECURITY = [{ bearerAuth: [] }];

// ─── POST /character ─────────────────────────────────────────────────────────

export const createSchema = {
  tags: TAGS,
  summary: 'Cadastra um personagem',
  description:
    'Cria o personagem na organização autenticada (role `admin`). O `planet_uuid`, se informado, precisa ser um planeta da organização (422).',
  security: SECURITY,
  body: createBodySchema,
  response: {
    201: characterResponseSchema,
    ...BASE_RESPONSE,
  },
} as const;

// ─── PATCH /character/:uuid ──────────────────────────────────────────────────

export const updateSchema = {
  tags: TAGS,
  summary: 'Atualiza parcialmente um personagem',
  description: 'Envie `planet_uuid: null` para desvincular o planeta natal.',
  security: SECURITY,
  params: uuidParamsSchema,
  body: updateBodySchema,
  response: {
    200: characterResponseSchema,
    ...BASE_RESPONSE,
  },
} as const;

// ─── DELETE /character/:uuid ─────────────────────────────────────────────────

export const deleteSchema = {
  tags: TAGS,
  summary: 'Remove um personagem',
  description: 'Soft delete (role `admin`). Personagem presente em algum elenco não pode ser removido (409).',
  security: SECURITY,
  params: uuidParamsSchema,
  response: {
    204: z.null().describe('Personagem removido'),
    ...BASE_RESPONSE,
  },
} as const;

// ─── GET /character/:uuid ────────────────────────────────────────────────────

export const findByIdSchema = {
  tags: TAGS,
  summary: 'Consulta um personagem',
  description: 'Inclui o planeta natal resolvido em `homeworld`.',
  security: SECURITY,
  params: uuidParamsSchema,
  response: {
    200: characterDetailResponseSchema,
    ...BASE_RESPONSE,
  },
} as const;

// ─── GET /character ──────────────────────────────────────────────────────────

export const findAllSchema = {
  tags: TAGS,
  summary: 'Lista personagens (paginado)',
  description:
    '`condition` é opcional e vai como JSON URL-encoded. Para os habitantes de um planeta, filtre por `planet_uuid`. Ver docs/pagination.md.',
  security: SECURITY,
  querystring: listQuerySchema,
  response: {
    200: paginatedResponseSchema,
    ...BASE_RESPONSE,
  },
} as const;

// ─── POST /character/search ──────────────────────────────────────────────────

export const searchSchema = {
  tags: TAGS,
  summary: 'Busca personagens com filtros (paginado)',
  description: 'Mesma listagem do GET, com `condition` no body. Ver docs/pagination.md.',
  security: SECURITY,
  body: searchBodySchema,
  response: {
    200: paginatedResponseSchema,
    ...BASE_RESPONSE,
  },
} as const;
