import { z } from 'zod';
import { tServiceAccountInsertable, eServiceAccountRole } from '@database/db/model';

export const createBodySchema = z.object({
  name: z.string().trim().min(1).max(100).meta({ example: 'Frontend do Holocron' }),
  role: z.enum(eServiceAccountRole).meta({ description: '`admin` lê e escreve; `viewer` só lê' }),
}) satisfies z.ZodType<Pick<tServiceAccountInsertable, 'name' | 'role'>>;

export const uuidParamsSchema = z.object({
  uuid: z.uuid(),
});

export interface iCreateBodySchema extends z.infer<typeof createBodySchema> {}
export interface iUuidParamsSchema extends z.infer<typeof uuidParamsSchema> {}
