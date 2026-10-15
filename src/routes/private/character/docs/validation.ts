import { z } from 'zod';
import { tCharacterInsertable, tCharacterUpdatable, eCharacterAffiliation } from '@database/db/model';

export const createBodySchema = z.object({
  name: z.string().trim().min(1).max(100).meta({ example: 'Luke Skywalker' }),
  planet_uuid: z.uuid().nullable().optional().meta({ description: 'Planeta natal da mesma organização' }),
  species: z.string().trim().min(1).max(100).optional().meta({ description: 'Padrão: `Human`', example: 'Human' }),
  affiliation: z.enum(eCharacterAffiliation).optional().meta({ description: 'Padrão: `independent`' }),
  is_force_sensitive: z.boolean().optional().meta({ description: 'Sente a Força? Padrão: `false`' }),
}) satisfies z.ZodType<Omit<tCharacterInsertable, 'organization_uuid'>>;

export const updateBodySchema = createBodySchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: 'Informe ao menos um campo para atualizar',
}) satisfies z.ZodType<tCharacterUpdatable>;

export const uuidParamsSchema = z.object({
  uuid: z.uuid(),
});

export interface iCreateBodySchema extends z.infer<typeof createBodySchema> {}
export interface iUpdateBodySchema extends z.infer<typeof updateBodySchema> {}
export interface iUuidParamsSchema extends z.infer<typeof uuidParamsSchema> {}
