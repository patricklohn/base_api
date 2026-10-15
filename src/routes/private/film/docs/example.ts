import { z } from 'zod';

import { eCastingRoleType } from '@database/db/model';
import { createPaginationSchemas, filmSchema, relatedRefSchema } from '@/types/schemas';

export const filmResponseSchema = z.object({
  success: z.literal(true),
  result: filmSchema,
});

/** Um integrante do elenco do filme. */
export const castMemberSchema = z
  .object({
    casting_uuid: z.string(),
    role_type: z.enum(eCastingRoleType),
    actor: relatedRefSchema,
    character: relatedRefSchema,
  })
  .meta({ id: 'CastMember' });

export const castResponseSchema = z.object({
  success: z.literal(true),
  result: z.array(castMemberSchema),
});

export const { listQuerySchema, searchBodySchema, paginatedResponseSchema } = createPaginationSchemas({
  name: 'Film',
  rowSchema: filmSchema,
  filterableColumns: ['uuid', 'title', 'category', 'episode', 'director', 'release_date', 'created_at', 'updated_at'],
  sortableColumns: ['release_date', 'episode', 'title', 'created_at', 'updated_at', 'uuid'],
  conditionExample: {
    type: 'and',
    conditions: [
      { column: 'category', operator: '=', value: 'skywalker_saga' },
      { column: 'episode', operator: '>=', value: 4 },
      { column: 'episode', operator: '<=', value: 6 },
    ],
  },
});

export interface iListQuerySchema extends z.infer<typeof listQuerySchema> {}
export interface iSearchBodySchema extends z.infer<typeof searchBodySchema> {}
