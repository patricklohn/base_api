import { z } from 'zod';

import { createPaginationSchemas, planetSchema } from '@/types/schemas';

export const planetResponseSchema = z.object({
  success: z.literal(true),
  result: planetSchema,
});

export const { listQuerySchema, searchBodySchema, paginatedResponseSchema } = createPaginationSchemas({
  name: 'Planet',
  rowSchema: planetSchema,
  filterableColumns: ['uuid', 'name', 'region', 'climate', 'terrain', 'created_at', 'updated_at'],
  sortableColumns: ['created_at', 'updated_at', 'name', 'region', 'uuid'],
  conditionExample: {
    type: 'and',
    conditions: [
      { column: 'region', operator: 'in', value: ['outer_rim', 'mid_rim'] },
      { column: 'climate', operator: 'is not', value: null },
    ],
  },
});

export interface iListQuerySchema extends z.infer<typeof listQuerySchema> {}
export interface iSearchBodySchema extends z.infer<typeof searchBodySchema> {}
