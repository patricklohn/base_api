import { z } from 'zod';
import { tActorSelectable, eActorStatus } from '@database/db/model';

/** Colunas expostas do ator: fonte única do schema de saída e do `select` do service. */
export const actorSchema = z
  .object({
    uuid: z.string(),
    name: z.string(),
    birth_date: z.string().nullable().meta({ description: 'Data de nascimento (AAAA-MM-DD)', example: '1951-09-25' }),
    nationality: z.string().nullable(),
    status: z.enum(eActorStatus),
    created_at: z.date(),
    updated_at: z.date(),
  })
  .meta({ id: 'Actor' }) satisfies z.ZodType<Omit<tActorSelectable, 'organization_uuid' | 'deleted_at'>>;

export const ACTOR_COLUMNS = actorSchema.keyof().options;

export type tActorColumn = (typeof ACTOR_COLUMNS)[number];
