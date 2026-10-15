import { z } from 'zod';

import { eCastingRoleType } from '@database/db/model';
import { actorSchema, createPaginationSchemas, relatedRefSchema } from '@/types/schemas';

export const actorResponseSchema = z.object({
  success: z.literal(true),
  result: actorSchema,
});

/** Um papel do ator: o filme, o personagem e o tipo de participação. */
export const filmographyItemSchema = z
  .object({
    casting_uuid: z.string(),
    role_type: z.enum(eCastingRoleType),
    film: z.object({
      uuid: z.string(),
      title: z.string(),
      episode: z.number().nullable(),
      release_date: z.string(),
    }),
    character: relatedRefSchema,
  })
  .meta({ id: 'FilmographyItem' });

export const filmographyResponseSchema = z.object({
  success: z.literal(true),
  result: z.array(filmographyItemSchema),
});

export const { listQuerySchema, searchBodySchema, paginatedResponseSchema } = createPaginationSchemas({
  name: 'Actor',
  rowSchema: actorSchema,
  filterableColumns: ['uuid', 'name', 'birth_date', 'nationality', 'status', 'created_at', 'updated_at'],
  sortableColumns: ['created_at', 'updated_at', 'name', 'birth_date', 'uuid'],
  conditionExample: {
    type: 'and',
    conditions: [
      { column: 'status', operator: '=', value: 'active' },
      {
        type: 'or',
        conditions: [
          { column: 'name', operator: 'ilike', value: '%hamill%' },
          { column: 'birth_date', operator: '<', value: '1950-01-01' },
        ],
      },
    ],
  },
});

export interface iListQuerySchema extends z.infer<typeof listQuerySchema> {}
export interface iSearchBodySchema extends z.infer<typeof searchBodySchema> {}
