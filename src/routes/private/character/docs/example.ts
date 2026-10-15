import { z } from 'zod';

import { characterSchema, createPaginationSchemas, relatedRefSchema } from '@/types/schemas';

export const characterResponseSchema = z.object({
  success: z.literal(true),
  result: characterSchema,
});

/** Detalhe do personagem: os campos dele + o planeta natal resolvido (join 1:N). */
export const characterDetailResponseSchema = z.object({
  success: z.literal(true),
  result: characterSchema.extend({
    homeworld: relatedRefSchema.nullable().meta({ description: 'Planeta natal (`null` quando desconhecido)' }),
  }),
});

export const { listQuerySchema, searchBodySchema, paginatedResponseSchema } = createPaginationSchemas({
  name: 'Character',
  rowSchema: characterSchema,
  filterableColumns: [
    'uuid',
    'planet_uuid',
    'name',
    'species',
    'affiliation',
    'is_force_sensitive',
    'created_at',
    'updated_at',
  ],
  sortableColumns: ['created_at', 'updated_at', 'name', 'species', 'affiliation', 'uuid'],
  conditionExample: {
    type: 'and',
    conditions: [
      { column: 'is_force_sensitive', operator: '=', value: true },
      { column: 'affiliation', operator: 'in', value: ['jedi', 'sith'] },
    ],
  },
});

export interface iListQuerySchema extends z.infer<typeof listQuerySchema> {}
export interface iSearchBodySchema extends z.infer<typeof searchBodySchema> {}
