import { z } from 'zod';
import { tCastingInsertable, tCastingUpdatable, eCastingRoleType } from '@database/db/model';

export const createBodySchema = z.object({
  film_uuid: z.uuid(),
  actor_uuid: z.uuid(),
  character_uuid: z.uuid(),
  role_type: z.enum(eCastingRoleType).optional().meta({ description: 'Padrão: `main`' }),
}) satisfies z.ZodType<Omit<tCastingInsertable, 'organization_uuid'>>;

export const updateBodySchema = createBodySchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: 'Informe ao menos um campo para atualizar',
}) satisfies z.ZodType<tCastingUpdatable>;

export const uuidParamsSchema = z.object({
  uuid: z.uuid(),
});

export interface iCreateBodySchema extends z.infer<typeof createBodySchema> {}
export interface iUpdateBodySchema extends z.infer<typeof updateBodySchema> {}
export interface iUuidParamsSchema extends z.infer<typeof uuidParamsSchema> {}
