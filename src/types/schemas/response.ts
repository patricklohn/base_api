import { z } from 'zod';

/**
 * Envelope de erro produzido pelo error handler global.
 * `loose` aceita campos extras (ex.: `stack` em development) sem quebrar a serialização.
 */
export const errorExampleSchema = z
  .object({
    success: z.literal(false),
    error: z
      .object({
        code: z.string(),
        message: z.string(),
      })
      .loose(),
  })
  .meta({ id: 'ErrorResponse' });

/** Respostas de erro comuns, para espalhar no `response` do schema de cada rota. */
export const BASE_RESPONSE = {
  400: errorExampleSchema,
  401: errorExampleSchema,
  403: errorExampleSchema,
  404: errorExampleSchema,
  409: errorExampleSchema,
  422: errorExampleSchema,
};
