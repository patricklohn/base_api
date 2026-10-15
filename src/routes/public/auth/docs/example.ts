import { z } from 'zod';
import { eServiceAccountRole } from '@database/db/model';

// ─── POST /auth/login ────────────────────────────────────────────────────────

export const loginExampleSchema = z.object({
  success: z.literal(true),
  result: z.object({
    access_token: z.string(),
    token_type: z.literal('Bearer'),
    expires_in: z.string(),
    refresh_token: z.string(),
    refresh_token_expires_at: z.date(),
    role: z.enum(eServiceAccountRole),
  }),
});

// ─── POST /auth/refresh ──────────────────────────────────────────────────────

export const refreshExampleSchema = loginExampleSchema;
