import { db } from './kysely';
import { DB } from './model';
import { Kysely } from 'kysely';
import * as path from 'path';

type SeedModule = { default: (db: Kysely<DB>) => Promise<void> };

async function runSeed() {
  const seedNames = process.argv.slice(2);

  if (seedNames.length === 0) {
    console.error('❌ Informe ao menos um seed. Ex: pnpm migrate:seed 1_star_wars');
    process.exit(1);
  }

  try {
    for (const seedName of seedNames) {
      const seedPath = path.join(__dirname, `../seeds/${seedName}.ts`);

      let seedModule: SeedModule;

      try {
        seedModule = await import(seedPath);
      } catch {
        console.error(`❌ Seed "${seedName}" não encontrado em: ${seedPath}`);
        process.exit(1);
      }

      if (typeof seedModule.default !== 'function') {
        console.error(`❌ Seed "${seedName}" não exporta uma função default`);
        process.exit(1);
      }

      console.info(`🌱 Rodando seed: ${seedName}`);
      await seedModule.default(db);
      console.info(`✅ Seed "${seedName}" concluído`);
    }
  } finally {
    await db.destroy();
  }
}

runSeed().catch((err) => {
  console.error('❌ Falha ao rodar seed:', err);
  process.exit(1);
});
