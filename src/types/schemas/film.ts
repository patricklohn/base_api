import { z } from 'zod';
import { tFilmSelectable, eFilmCategory } from '@database/db/model';

/** Colunas expostas do filme: fonte única do schema de saída e do `select` do service. */
export const filmSchema = z
  .object({
    uuid: z.string(),
    title: z.string(),
    category: z.enum(eFilmCategory),
    episode: z.number().int().nullable().meta({ description: 'Episódio da saga (1 a 9); nulo nos derivados' }),
    director: z.string(),
    release_date: z.string().meta({ description: 'Data de lançamento (AAAA-MM-DD)', example: '1977-05-25' }),
    created_at: z.date(),
    updated_at: z.date(),
  })
  .meta({ id: 'Film' }) satisfies z.ZodType<Omit<tFilmSelectable, 'organization_uuid' | 'deleted_at'>>;

export const FILM_COLUMNS = filmSchema.keyof().options;

export type tFilmColumn = (typeof FILM_COLUMNS)[number];
