import * as path from 'path';
import { promises as fs } from 'fs';
import { Migrator, FileMigrationProvider } from 'kysely';
import { db } from './kysely';

const MIGRATION_SCHEMA = 'kysely';

async function migrateDown() {
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
  let results: Awaited<ReturnType<typeof migrator.migrateDown>>['results'];

  try {
    ({ error, results } = await migrator.migrateDown());

    if (!results || results.length === 0) {
      console.info('ℹ️  Nenhuma migration para reverter');
    }

    results?.forEach((it) => {
      if (it.status === 'Success') {
        console.info(`✅ rollback "${it.migrationName}" executado com sucesso`);
      } else if (it.status === 'Error') {
        console.error(`❌ falha ao reverter migration "${it.migrationName}"`);
      } else if (it.status === 'NotExecuted') {
        console.warn(`⏭️  rollback "${it.migrationName}" não executado (migration anterior falhou)`);
      }
    });

    if (error) {
      console.error('❌ Falha ao reverter migration');
      console.error(error);
    }
  } finally {
    await db.destroy();
  }

  if (error) process.exit(1);
}

migrateDown();
