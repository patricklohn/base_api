import { DB } from './model';
import { Kysely, PostgresDialect } from 'kysely';
import { pool } from '@/configs/db';

type tTransactionTrx = Kysely<DB>;

const db = new Kysely<DB>({
  dialect: new PostgresDialect({
    pool,
  }),
});

export { db, tTransactionTrx };
