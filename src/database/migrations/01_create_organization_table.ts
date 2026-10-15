import { Kysely, sql } from 'kysely';

/**
 * Cria a função `set_updated_at()` (compartilhada pelos triggers de todas as tabelas)
 * e a tabela `organization`, raiz do modelo multi-tenant: todo dado de domínio pertence a uma organização.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `.execute(db);

  await db.schema
    .createTable('organization')
    .addColumn('uuid', 'uuid', (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('document', 'varchar(20)', (col) => col.notNull())
    .addColumn('status', 'varchar(30)', (col) =>
      col
        .notNull()
        .defaultTo('active')
        .check(sql`status IN ('active', 'inactive', 'blocked')`)
    )
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('deleted_at', 'timestamptz')
    .execute();

  // Documento único entre organizações ativas (registros com soft delete não bloqueiam recadastro)
  await db.schema
    .createIndex('organization_document_unique')
    .on('organization')
    .column('document')
    .unique()
    .where(sql.ref('deleted_at'), 'is', null)
    .execute();

  await sql`
    CREATE TRIGGER organization_set_updated_at
    BEFORE UPDATE ON organization
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('organization').ifExists().cascade().execute();
  await sql`DROP FUNCTION IF EXISTS set_updated_at();`.execute(db);
}
