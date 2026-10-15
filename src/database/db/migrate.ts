import * as path from 'path';
import { promises as fs } from 'fs';
import { Migrator, FileMigrationProvider } from 'kysely';
import { db } from './kysely';
function logMigrationHint(error: unknown) {
  const dbError = error as { code?: string; message?: string };

  if (dbError?.code === '28P01') {
    console.error(
      'Dica: falha de autenticacao no PostgreSQL. Confira DB_USER/DB_PASSWORD no .env e, se usar Docker, recrie o volume do banco quando trocar credenciais.'
    );
    return;
  }

  // if (dbError?.code === '42704' || dbError?.message?.toLowerCase().includes('uuid_generate_v7')) {
  //   console.error(
  //     'Dica: extensao pg_uuidv7 nao encontrada. Suba o Postgres pela imagem dockerfile-postgres deste projeto.'
  //   );
  //   return;
  // }

  // if (dbError?.code === '58P01' || dbError?.message?.toLowerCase().includes('postgis')) {
  //   console.error('Dica: extensao PostGIS nao encontrada. Garanta que seu Postgres tenha postgis habilitado.');
  //   return;
  // }
}

const MIGRATION_SCHEMA = 'kysely';

async function migrateToLatest() {
  await db.schema.createSchema(MIGRATION_SCHEMA).ifNotExists().execute();
  await db.schema.createSchema('public').ifNotExists().execute();

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, '../migrations'),
    }),
    migrationTableSchema: MIGRATION_SCHEMA,
  });

  let error: unknown;
  let results: Awaited<ReturnType<typeof migrator.migrateToLatest>>['results'];

  try {
    ({ error, results } = await migrator.migrateToLatest());

    if (!results || results.length === 0) {
      console.info('ℹ️  Nenhuma migration pendente');
    }

    results?.forEach((it) => {
      if (it.status === 'Success') {
        console.info(`✅ migration "${it.migrationName}" executada com sucesso`);
      } else if (it.status === 'Error') {
        console.error(`❌ falha ao executar migration "${it.migrationName}"`);
      } else if (it.status === 'NotExecuted') {
        console.warn(`⏭️  migration "${it.migrationName}" não executada (migration anterior falhou)`);
      }
    });

    if (error) {
      console.error('❌ Falha ao rodar migrations');
      console.error(error);
      logMigrationHint(error);
    }
  } finally {
    await db.destroy();
  }

  if (error) {
    process.exit(1);
  }
}

migrateToLatest();
