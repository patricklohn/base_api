import { z } from 'zod';

import { castingSchema, createPaginationSchemas, relatedRefSchema } from '@/types/schemas';

export const castingResponseSchema = z.object({
  success: z.literal(true),
  result: castingSchema,
});

/** Detalhe da participação: os uuids + filme, ator e personagem resolvidos (join N:N). */
export const castingDetailResponseSchema = z.object({
  success: z.literal(true),
  result: castingSchema.extend({
    film: z.object({ uuid: z.string(), title: z.string() }),
    actor: relatedRefSchema,
    character: relatedRefSchema,
  }),
});

export const { listQuerySchema, searchBodySchema, paginatedResponseSchema } = createPaginationSchemas({
  name: 'Casting',
  rowSchema: castingSchema,
  filterableColumns: ['uuid', 'film_uuid', 'actor_uuid', 'character_uuid', 'role_type', 'created_at', 'updated_at'],
  sortableColumns: ['created_at', 'updated_at', 'role_type', 'uuid'],
  conditionExample: {
    type: 'and',
    conditions: [{ column: 'role_type', operator: 'in', value: ['main', 'voice'] }],
  },
});

export interface iListQuerySchema extends z.infer<typeof listQuerySchema> {}
export interface iSearchBodySchema extends z.infer<typeof searchBodySchema> {}
