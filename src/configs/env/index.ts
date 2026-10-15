import 'dotenv/config';
import { z } from 'zod';

// z.coerce.boolean() usa Boolean(valor), então a string "false" vira true; este helper evita essa armadilha
const stringBoolean = () => z.enum(['true', 'false']).transform((value) => value === 'true');

/**
 * `TRUST_PROXY` no formato aceito pelo Fastify:
 * - `false`: ignora `X-Forwarded-For` (API exposta diretamente);
 * - número: quantidade de proxies confiáveis à frente da API (ex.: `1`);
 * - lista de IPs/CIDRs separados por vírgula (ex.: `10.0.0.0/8,127.0.0.1`);
 * - `true`: confia em qualquer origem. Só use se o proxy sobrescrever o header.
 */
const trustProxy = () =>
  z
    .string()
    .trim()
    .default('false')
    .transform((value): boolean | number | string[] => {
      if (value === 'true' || value === 'false') {
        return value === 'true';
      }
      if (/^\d+$/.test(value)) {
        return Number(value);
      }
      return value.split(',').map((item) => item.trim());
    });

const envSchema = z.object({
  // Variaveis da aplicação
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  APP_NAME: z.string().default('base_api'),
  APP_VERSION: z.string().default('1.0.0'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3000),
  TRUST_PROXY: trustProxy(),
  // Variaveis do banco de dados
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().default('base_api'),
  // Variaveis do Supabase
  USES_SUPABASE: stringBoolean().default(false),
  SUPABASE_DB_URL: z.string().default(''),
  // Variaveis db
  MAX_DB_CONNECTIONS: z.coerce.number().int().positive().default(50),
  MAX_DB_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  MAX_DB_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  // Variaveis do JWT
  JWT_SECRET: z.string().min(32, { message: 'precisa ter ao menos 32 caracteres (gere com: openssl rand -base64 48)' }),
  JWT_EXPIRES_IN: z.string(),
  // Validade do refresh token (rotacionado a cada uso)
  REFRESH_TOKEN_EXPIRES_DAYS: z.coerce.number().int().positive().default(30),
  // Variaveis CORS e Rate Limit
  ALLOWED_ORIGINS: z.string().optional(),
  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_LOGIN_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_LOGIN_MAX_REQUESTS: z.coerce.number().int().positive().default(10),
  // Variaveis da documentação (Scalar e Swagger UI)
  DISABLE_DOCS: stringBoolean().default(true),
  // Variaveis do Sentry
  SENTRY_DSN: z.string().default(''),
  SENTRY_ENVIRONMENT: z.string().default('development'),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0),
});

export const Env = envSchema.parse(process.env);

/** Documentação (`/docs` e `/documentation`) ativa: só é desligada em produção com `DISABLE_DOCS=true`. */
export const isDocsEnabled = !(Env.NODE_ENV === 'production' && Env.DISABLE_DOCS);
