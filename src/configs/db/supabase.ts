import { Pool } from 'pg';
import { Env } from '../env';

// Supabase expõe apenas uma connection string, então a pool é montada a partir dela
const supabasePool = new Pool({
  connectionString: Env.SUPABASE_DB_URL,
  max: Env.MAX_DB_CONNECTIONS,
  connectionTimeoutMillis: Env.MAX_DB_CONNECTION_TIMEOUT_MS,
  idleTimeoutMillis: Env.MAX_DB_IDLE_TIMEOUT_MS,
  ssl: { rejectUnauthorized: false },
});

export { supabasePool };
