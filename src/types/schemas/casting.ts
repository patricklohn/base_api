import { z } from 'zod';
import { tCastingSelectable, eCastingRoleType } from '@database/db/model';

/** Colunas expostas do elenco (N:N entre filme, ator e personagem). */
export const castingSchema = z
  .object({
    uuid: z.string(),
    film_uuid: z.string(),
    actor_uuid: z.string(),
    character_uuid: z.string(),
    role_type: z.enum(eCastingRoleType),
    created_at: z.date(),
    updated_at: z.date(),
  })
  .meta({ id: 'Casting' }) satisfies z.ZodType<Omit<tCastingSelectable, 'organization_uuid' | 'deleted_at'>>;

export const CASTING_COLUMNS = castingSchema.keyof().options;

export type tCastingColumn = (typeof CASTING_COLUMNS)[number];

/** Referência resumida de um registro relacionado, usada nos joins (`{ uuid, name }`). */
export const relatedRefSchema = z.object({ uuid: z.string(), name: z.string() });
