import { z } from 'zod';
import { tPlanetSelectable, ePlanetRegion } from '@database/db/model';

/**
 * Colunas expostas do planeta. Fonte única para o schema de saída das rotas
 * e para o `select`/`returning` do service (evita divergência que quebraria a serialização).
 */
export const planetSchema = z
  .object({
    uuid: z.string(),
    name: z.string(),
    region: z.enum(ePlanetRegion),
    climate: z.string().nullable(),
    terrain: z.string().nullable(),
    created_at: z.date(),
    updated_at: z.date(),
  })
  .meta({ id: 'Planet' }) satisfies z.ZodType<Omit<tPlanetSelectable, 'organization_uuid' | 'deleted_at'>>;

export const PLANET_COLUMNS = planetSchema.keyof().options;

export type tPlanetColumn = (typeof PLANET_COLUMNS)[number];
