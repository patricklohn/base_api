import { z } from 'zod';
import { tCharacterSelectable, eCharacterAffiliation } from '@database/db/model';

/** Colunas expostas do personagem: fonte única do schema de saída e do `select` do service. */
export const characterSchema = z
  .object({
    uuid: z.string(),
    planet_uuid: z.string().nullable().meta({ description: 'Planeta natal (relação 1:N com Planet)' }),
    name: z.string(),
    species: z.string(),
    affiliation: z.enum(eCharacterAffiliation),
    is_force_sensitive: z.boolean(),
    created_at: z.date(),
    updated_at: z.date(),
  })
  .meta({ id: 'Character' }) satisfies z.ZodType<Omit<tCharacterSelectable, 'organization_uuid' | 'deleted_at'>>;

export const CHARACTER_COLUMNS = characterSchema.keyof().options;

export type tCharacterColumn = (typeof CHARACTER_COLUMNS)[number];
