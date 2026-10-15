import { z } from 'zod';
import { tPlanetInsertable, tPlanetUpdatable, ePlanetRegion } from '@database/db/model';

export const createBodySchema = z.object({
  name: z.string().trim().min(1).max(100).meta({ example: 'Tatooine' }),
  region: z.enum(ePlanetRegion).optional().meta({ description: 'Região da galáxia (padrão: `unknown_regions`)' }),
  climate: z.string().trim().min(1).max(100).nullable().optional().meta({ example: 'árido' }),
  terrain: z.string().trim().min(1).max(100).nullable().optional().meta({ example: 'deserto' }),
}) satisfies z.ZodType<Omit<tPlanetInsertable, 'organization_uuid'>>;

export const updateBodySchema = createBodySchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: 'Informe ao menos um campo para atualizar',
}) satisfies z.ZodType<tPlanetUpdatable>;

export const uuidParamsSchema = z.object({
  uuid: z.uuid(),
});

export interface iCreateBodySchema extends z.infer<typeof createBodySchema> {}
export interface iUpdateBodySchema extends z.infer<typeof updateBodySchema> {}
export interface iUuidParamsSchema extends z.infer<typeof uuidParamsSchema> {}
