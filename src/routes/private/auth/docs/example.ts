import { z } from 'zod';
import { eOrganizationStatus, eServiceAccountRole } from '@database/db/model';

// ─── GET /auth/me ────────────────────────────────────────────────────────────

export const meExampleSchema = z.object({
  success: z.literal(true),
  result: z.object({
    role: z.enum(eServiceAccountRole),
    organization: z.object({
      uuid: z.string(),
      name: z.string(),
      document: z.string(),
      status: z.enum(eOrganizationStatus),
    }),
    service_account: z.object({
      uuid: z.string(),
      name: z.string(),
      client_id: z.string(),
    }),
  }),
});
