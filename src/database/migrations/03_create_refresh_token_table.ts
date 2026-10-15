import { Kysely, sql } from 'kysely';

/**
 * Cria a tabela `refresh_token`: tokens opacos de longa duração que trocam por um novo access token sem reenviar o
 * `client_secret` (uso típico: frontend que não deve guardar o segredo).
 *
 * - Só o hash sha256 do token é gravado (`token_hash`); o valor em texto puro existe apenas na resposta.
 * - Rotação: cada uso revoga o token (`revoked_at`) e aponta para o sucessor (`replaced_by_uuid`).
 * - `family_uuid` agrupa a cadeia de rotações de um mesmo login: reutilizar um token já rotacionado revoga a
 *   família inteira (detecção de roubo).
 * - Não tem `deleted_at`: token não é apagado, é revogado.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('refresh_token')
    .addColumn('uuid', 'uuid', (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn('service_account_uuid', 'uuid', (col) =>
      col.notNull().references('service_account.uuid').onDelete('cascade')
    )
    .addColumn('family_uuid', 'uuid', (col) => col.notNull())
    .addColumn('token_hash', 'char(64)', (col) => col.notNull())
    .addColumn('expires_at', 'timestamptz', (col) => col.notNull())
    .addColumn('revoked_at', 'timestamptz')
    .addColumn('replaced_by_uuid', 'uuid', (col) => col.references('refresh_token.uuid').onDelete('set null'))
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addUniqueConstraint('refresh_token_token_hash_unique', ['token_hash'])
    .execute();

  await db.schema
    .createIndex('refresh_token_service_account_uuid_idx')
    .on('refresh_token')
    .column('service_account_uuid')
    .execute();

  await db.schema.createIndex('refresh_token_family_uuid_idx').on('refresh_token').column('family_uuid').execute();

  await sql`
    CREATE TRIGGER refresh_token_set_updated_at
    BEFORE UPDATE ON refresh_token
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('refresh_token').ifExists().cascade().execute();
}
