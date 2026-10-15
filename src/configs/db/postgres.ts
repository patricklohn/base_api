import { Pool } from 'pg';
import { Env } from '../env';

export const postgresPool = new Pool({
  host: Env.DB_HOST,
  port: Env.DB_PORT,
  user: Env.DB_USER,
  password: Env.DB_PASSWORD,
  database: Env.DB_NAME,
  max: Env.MAX_DB_CONNECTIONS,
  connectionTimeoutMillis: Env.MAX_DB_CONNECTION_TIMEOUT_MS,
  idleTimeoutMillis: Env.MAX_DB_IDLE_TIMEOUT_MS,
});
