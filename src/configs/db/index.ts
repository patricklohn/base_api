import { types } from 'pg';
import { Env } from '../env';
import { postgresPool } from './postgres';
import { supabasePool } from './supabase';

export { postgresPool } from './postgres';
export { supabasePool } from './supabase';

// `date` volta como texto `AAAA-MM-DD`: sem conversão para Date no fuso local, que pode mudar o dia (ex.: competência)
types.setTypeParser(types.builtins.DATE, (value) => value);

// Alterna entre Postgres local e Supabase apenas para fins didáticos (ver USES_SUPABASE)
export const pool = Env.USES_SUPABASE ? supabasePool : postgresPool;
