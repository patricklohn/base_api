import { z } from 'zod';
import { tActorInsertable, tActorUpdatable, eActorStatus } from '@database/db/model';

export const createBodySchema = z.object({
  name: z.string().trim().min(1).max(150).meta({ example: 'Mark Hamill' }),
  birth_date: z.iso.date().nullable().optional().meta({ description: 'AAAA-MM-DD', example: '1951-09-25' }),
  nationality: z.string().trim().min(1).max(100).nullable().optional().meta({ example: 'Estados Unidos' }),
  status: z.enum(eActorStatus).optional().meta({ description: 'Padrão: `active`' }),
}) satisfies z.ZodType<Omit<tActorInsertable, 'organization_uuid'>>;

export const updateBodySchema = createBodySchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: 'Informe ao menos um campo para atualizar',
}) satisfies z.ZodType<tActorUpdatable>;

export const uuidParamsSchema = z.object({
  uuid: z.uuid(),
});

export interface iCreateBodySchema extends z.infer<typeof createBodySchema> {}
export interface iUpdateBodySchema extends z.infer<typeof updateBodySchema> {}
export interface iUuidParamsSchema extends z.infer<typeof uuidParamsSchema> {}
