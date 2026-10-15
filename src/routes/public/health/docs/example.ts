import { z } from 'zod';

// ─── GET /health/ping ─────────────────────────────────────────────────────────

export const pingExampleSchema = z.object({
  success: z.literal(true),
  result: z.object({
    message: z.literal('pong'),
  }),
});

// ─── GET /health/ready ────────────────────────────────────────────────────────

export const readyExampleSchema = z.object({
  success: z.literal(true),
  result: z.object({
    database: z.literal('up'),
  }),
});
