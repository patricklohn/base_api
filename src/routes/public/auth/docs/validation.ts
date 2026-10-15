import { z } from 'zod';
import { tServiceAccountInsertable } from '@database/db/model';

// ─── POST /auth/login ────────────────────────────────────────────────────────

export const loginBodySchema = z.object({
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
}) satisfies z.ZodType<Pick<tServiceAccountInsertable, 'client_id'>>;

export interface iLoginBodySchema extends z.infer<typeof loginBodySchema> {}

// ─── POST /auth/refresh · POST /auth/logout ──────────────────────────────────

// Opcional: clientes de navegador mandam o token no cookie httpOnly e o body pode vir vazio (o Fastify entrega `null`)
export const refreshTokenBodySchema = z
  .object({
    refresh_token: z.string().min(1).optional(),
  })
  .nullish();

export type tRefreshTokenBodySchema = z.infer<typeof refreshTokenBodySchema>;
