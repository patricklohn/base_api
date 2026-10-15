import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import { Client } from 'pg';

import { TEST_DB_NAME } from './env';

/** Conexão administrativa (banco `postgres`) com as credenciais do `.env`. */
const adminClient = () =>
  new Client({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? '',
    database: 'postgres',
  });

/** Executa um comando no banco `postgres` (create/drop database não rodam dentro de transação). */
async function runAdmin(statement: string) {
  const client = adminClient();
  await client.connect();
  try {
    await client.query(statement);
  } finally {
    await client.end();
  }
}

/**
 * Recria o banco de teste do zero e aplica as migrations antes da suíte de integração.
 * Retorna o teardown, que apaga o banco no fim.
 */
export default async function setup() {
  try {
    await runAdmin(`drop database if exists ${TEST_DB_NAME} with (force)`);
    await runAdmin(`create database ${TEST_DB_NAME}`);
  } catch (error) {
    throw new Error(`Postgres indisponível para os testes de integração (suba com pnpm docker:dev): ${error}`, {
      cause: error,
    });
  }

  execFileSync('pnpm', ['-s', 'migrate:latest'], {
    env: { ...process.env, DB_NAME: TEST_DB_NAME },
    stdio: 'pipe',
  });

  return async () => {
    await runAdmin(`drop database if exists ${TEST_DB_NAME} with (force)`);
  };
}
