import { Kysely, sql } from 'kysely';

/**
 * Cria a tabela `audit_log`: registro das ações sensíveis (quem, o quê, quando, `request_id`).
 *
 * Só recebe inserts: não tem `updated_at`/`deleted_at` e um trigger barra `UPDATE` e `DELETE`.
 * Nunca grave segredos em `metadata` (`client_secret`, tokens).
 */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('audit_log')
    .addColumn('uuid', 'uuid', (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn('organization_uuid', 'uuid', (col) => col.notNull().references('organization.uuid'))
    .addColumn('service_account_uuid', 'uuid')
    .addColumn('action', 'varchar(100)', (col) => col.notNull())
    .addColumn('entity', 'varchar(50)', (col) => col.notNull())
    .addColumn('entity_uuid', 'uuid')
    .addColumn('request_id', 'varchar(100)')
    .addColumn('metadata', 'jsonb', (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex('audit_log_organization_created_at_idx')
    .on('audit_log')
    .columns(['organization_uuid', 'created_at'])
    .execute();
  await db.schema.createIndex('audit_log_entity_idx').on('audit_log').columns(['entity', 'entity_uuid']).execute();

  await sql`
    CREATE OR REPLACE FUNCTION audit_log_append_only() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'audit_log só aceita inserts' USING ERRCODE = 'P0001';
    END;
    $$ LANGUAGE plpgsql;
  `.execute(db);

  await sql`
    CREATE TRIGGER audit_log_append_only
    BEFORE UPDATE OR DELETE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION audit_log_append_only();
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('audit_log').ifExists().cascade().execute();
  await sql`DROP FUNCTION IF EXISTS audit_log_append_only()`.execute(db);
}
