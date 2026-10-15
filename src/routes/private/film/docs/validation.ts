import { z } from 'zod';
import { tFilmInsertable, tFilmUpdatable, eFilmCategory } from '@database/db/model';

const filmBodySchema = z.object({
  title: z.string().trim().min(1).max(150).meta({ example: 'A New Hope' }),
  category: z.enum(eFilmCategory).optional().meta({ description: 'Padrão: `skywalker_saga`' }),
  episode: z.number().int().min(1).max(9).nullable().optional().meta({
    description: 'Obrigatório na `skywalker_saga` (1 a 9); ausente ou `null` nos derivados (`anthology`)',
    example: 4,
  }),
  director: z.string().trim().min(1).max(150).meta({ example: 'George Lucas' }),
  release_date: z.iso.date().meta({ description: 'AAAA-MM-DD', example: '1977-05-25' }),
});

/**
 * Episódio só existe na saga principal. No PATCH a mesma regra é garantida pelo CHECK
 * `film_category_episode_check` do banco (422 `CHECK_VIOLATION`).
 */
export const createBodySchema = filmBodySchema.refine(
  (data) => ((data.category ?? eFilmCategory.skywalker_saga) === eFilmCategory.anthology) === (data.episode == null),
  { message: 'Filmes da skywalker_saga exigem episode; filmes anthology não têm episode', path: ['episode'] }
) satisfies z.ZodType<Omit<tFilmInsertable, 'organization_uuid'>>;

export const updateBodySchema = filmBodySchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: 'Informe ao menos um campo para atualizar',
}) satisfies z.ZodType<tFilmUpdatable>;

export const uuidParamsSchema = z.object({
  uuid: z.uuid(),
});

export interface iCreateBodySchema extends z.infer<typeof createBodySchema> {}
export interface iUpdateBodySchema extends z.infer<typeof updateBodySchema> {}
export interface iUuidParamsSchema extends z.infer<typeof uuidParamsSchema> {}
