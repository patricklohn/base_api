import { z } from 'zod';

import { createPaginationSchemas, serviceAccountSchema } from '@/types/schemas';

export const serviceAccountResponseSchema = z.object({
  success: z.literal(true),
  result: serviceAccountSchema,
});

export const createResponseSchema = z.object({
  success: z.literal(true),
  result: serviceAccountSchema.extend({
    credentials: z.object({
      client_id: z.string(),
      client_secret: z.string(),
    }),
  }),
});

export const { listQuerySchema, searchBodySchema, paginatedResponseSchema } = createPaginationSchemas({
  name: 'ServiceAccount',
  rowSchema: serviceAccountSchema,
  filterableColumns: ['uuid', 'name', 'role', 'client_id', 'status', 'last_used_at', 'created_at'],
  sortableColumns: ['created_at', 'name', 'last_used_at', 'uuid'],
  conditionExample: {
    type: 'and',
    conditions: [
      { column: 'status', operator: '=', value: 'active' },
      { column: 'role', operator: '=', value: 'viewer' },
    ],
  },
});

export interface iListQuerySchema extends z.infer<typeof listQuerySchema> {}
export interface iSearchBodySchema extends z.infer<typeof searchBodySchema> {}
