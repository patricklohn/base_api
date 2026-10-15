import { z } from 'zod';
import { parseArgs } from 'node:util';
import { db } from '@database/db/kysely';
import { ServiceAccountService } from '@services/service-account';

const argSchema = z.object({
  client_id: z.string().trim().min(1, 'Informe o client_id da credencial'),
});

/**
 * Regenera o `client_secret` de uma credencial (admin ou viewer), revogando o anterior.
 *
 * @example
 * pnpm function-service-account:regenerate-secret --client_id "adm_3f9a..."
 */
async function run() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      client_id: { type: 'string' },
    },
    strict: true,
  });

  const parsed = argSchema.safeParse(values);

  if (!parsed.success) {
    console.error('❌ Parâmetros inválidos ou ausentes:');
    console.error(z.flattenError(parsed.error).fieldErrors);
    console.info('\n💡 Exemplo de uso:');
    console.info('pnpm function-service-account:regenerate-secret --client_id "adm_3f9a..."\n');
    process.exit(1);
  }

  const { client_id } = parsed.data;

  try {
    console.info(`⏳ Regenerando o client_secret da credencial ${client_id}...`);

    const credentials = await ServiceAccountService.regenerateSecret(client_id);

    console.info('\n✅ Credencial regenerada com sucesso!');
    console.info('──────────────────────────────────────────────────────');
    console.info(`Client ID:     ${credentials.client_id}`);
    console.info(`Client Secret: ${credentials.client_secret}`);
    console.info('──────────────────────────────────────────────────────');
    console.warn('⚠️  O Client Secret anterior foi revogado. Atualize a integração com este novo secret.\n');
  } finally {
    await db.destroy();
  }
}

run().catch((err) => {
  console.error('\n❌ Falha ao regenerar client_secret:', err.message ?? err);
  process.exit(1);
});
