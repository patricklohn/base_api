import { createBodySchema, uuidParamsSchema } from './validation';
import {
  createResponseSchema,
  serviceAccountResponseSchema,
  listQuerySchema,
  searchBodySchema,
  paginatedResponseSchema,
} from './example';
import { BASE_RESPONSE } from '@/types/schemas';

const TAGS = ['Service Account'];
const SECURITY = [{ bearerAuth: [] }];

// ─── POST /service-account ───────────────────────────────────────────────────

export const createSchema = {
  tags: TAGS,
  summary: 'Cria uma credencial',
  description:
    'Cria uma credencial (`admin` ou `viewer`) na organização autenticada. O `client_secret` é exibido somente nesta resposta.',
  security: SECURITY,
  body: createBodySchema,
  response: {
    201: createResponseSchema,
    ...BASE_RESPONSE,
  },
} as const;

// ─── GET /service-account/:uuid ──────────────────────────────────────────────

export const findByIdSchema = {
  tags: TAGS,
  summary: 'Consulta uma credencial',
  security: SECURITY,
  params: uuidParamsSchema,
  response: {
    200: serviceAccountResponseSchema,
    ...BASE_RESPONSE,
  },
} as const;

// ─── GET /service-account ────────────────────────────────────────────────────

export const findAllSchema = {
  tags: TAGS,
  summary: 'Lista credenciais (paginado)',
  description: 'Lista paginada das credenciais da organização. `condition` vai como JSON URL-encoded.',
  security: SECURITY,
  querystring: listQuerySchema,
  response: {
    200: paginatedResponseSchema,
    ...BASE_RESPONSE,
  },
} as const;

// ─── POST /service-account/search ────────────────────────────────────────────

export const searchSchema = {
  tags: TAGS,
  summary: 'Busca credenciais com filtros (paginado)',
  description: 'Mesma listagem do GET, com `condition` no body. Ver docs/pagination.md.',
  security: SECURITY,
  body: searchBodySchema,
  response: {
    200: paginatedResponseSchema,
    ...BASE_RESPONSE,
  },
} as const;

// ─── POST /service-account/:uuid/revoke ──────────────────────────────────────

export const revokeSchema = {
  tags: TAGS,
  summary: 'Revoga uma credencial',
  description:
    'O login, o access token e os refresh tokens da credencial deixam de valer na hora. A credencial autenticada não pode revogar a si mesma (409).',
  security: SECURITY,
  params: uuidParamsSchema,
  response: {
    200: serviceAccountResponseSchema,
    ...BASE_RESPONSE,
  },
} as const;
