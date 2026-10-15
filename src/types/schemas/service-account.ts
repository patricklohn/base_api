import { z } from 'zod';
import { tServiceAccountSelectable, eServiceAccountRole, eServiceAccountStatus } from '@database/db/model';

/**
 * Colunas expostas da credencial. O hash do `client_secret` nunca sai da API.
 * Fonte única para o schema de saída das rotas e para o `select`/`returning` do service.
 */
export const serviceAccountSchema = z
  .object({
    uuid: z.string(),
    name: z.string(),
    role: z.enum(eServiceAccountRole),
    client_id: z.string(),
    status: z.enum(eServiceAccountStatus),
    last_used_at: z.date().nullable(),
    created_at: z.date(),
    updated_at: z.date(),
  })
  .meta({ id: 'ServiceAccount' }) satisfies z.ZodType<
  Omit<tServiceAccountSelectable, 'organization_uuid' | 'client_secret_hash' | 'deleted_at'>
>;

export const SERVICE_ACCOUNT_COLUMNS = serviceAccountSchema.keyof().options;

export type tServiceAccountColumn = (typeof SERVICE_ACCOUNT_COLUMNS)[number];
