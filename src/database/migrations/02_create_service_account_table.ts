import { Kysely, sql } from 'kysely';

/**
 * Cria a tabela `service_account`: credenciais (`client_id` + hash do `client_secret`) usadas no login.
 *
 * - `role = 'admin'`: lê e escreve todos os recursos da organização e gerencia as credenciais.
 * - `role = 'viewer'`: somente leitura.
 *
 * Uma organização pode ter várias credenciais (uma por sistema/front), revogadas individualmente.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('service_account')
    .addColumn('uuid', 'uuid', (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn('organization_uuid', 'uuid', (col) => col.notNull().references('organization.uuid').onDelete('cascade'))
    .addColumn('name', 'varchar(100)', (col) => col.notNull())
    .addColumn('role', 'varchar(30)', (col) => col.notNull().check(sql`role IN ('admin', 'viewer')`))
    .addColumn('client_id', 'varchar(255)', (col) => col.notNull())
    .addColumn('client_secret_hash', 'varchar(255)', (col) => col.notNull())
    .addColumn('status', 'varchar(30)', (col) =>
      col
        .notNull()
        .defaultTo('active')
        .check(sql`status IN ('active', 'revoked')`)
    )
    .addColumn('last_used_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('deleted_at', 'timestamptz')
    .addUniqueConstraint('service_account_client_id_unique', ['client_id'])
    .execute();

  await db.schema
    .createIndex('service_account_organization_uuid_idx')
    .on('service_account')
    .column('organization_uuid')
    .execute();

  await sql`
    CREATE TRIGGER service_account_set_updated_at
    BEFORE UPDATE ON service_account
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('service_account').ifExists().cascade().execute();
}
