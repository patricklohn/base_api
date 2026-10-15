import { z } from 'zod';
import { parseArgs } from 'node:util';
import { db } from '@database/db/kysely';
import { OrganizationService } from '@services/organization';
import { documentSchema } from '@/types/schemas';

// documentSchema valida CPF/CNPJ (inclusive alfanumérico) e devolve o documento sem máscara
const argSchema = z.object({
  name: z.string().trim().min(3, 'Nome muito curto').max(255),
  document: documentSchema,
});

/**
 * Cria uma organização e a primeira credencial dela (role `admin`).
 *
 * @example
 * pnpm function-organization:create --name "Rebel Alliance" --document "11.222.333/0001-81"
 */
async function run() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      name: { type: 'string' },
      document: { type: 'string' },
    },
    strict: true,
  });

  const parsed = argSchema.safeParse(values);

  if (!parsed.success) {
    console.error('❌ Parâmetros inválidos ou ausentes:');
    console.error(z.flattenError(parsed.error).fieldErrors);
    console.info('\n💡 Exemplo de uso:');
    console.info('pnpm function-organization:create --name "Rebel Alliance" --document "11.222.333/0001-81"');
    process.exit(1);
  }

  const { name, document } = parsed.data;

  try {
    console.info(`⏳ Cadastrando ${name} (${document})...`);

    const organization = await OrganizationService.register({ name, document });

    console.info('\n✅ Organização criada com sucesso! Que a Força esteja com você.');
    console.info('──────────────────────────────────────────────────────');
    console.info(`UUID:          ${organization.uuid}`);
    console.info('Role:          admin');
    console.info(`Client ID:     ${organization.credentials.client_id}`);
    console.info(`Client Secret: ${organization.credentials.client_secret}`);
    console.info('──────────────────────────────────────────────────────');
    console.warn('⚠️  Guarde o Client Secret com segurança, ele não será exibido novamente.\n');
  } finally {
    // Garante que o pool fecha e o Node.js encerra sem travar o terminal
    await db.destroy();
  }
}

run().catch((err) => {
  console.error('\n❌ Falha ao criar a organização:', err.message ?? err);
  process.exit(1);
});
