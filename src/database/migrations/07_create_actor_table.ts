import { Kysely, sql } from 'kysely';

/**
 * Cria a tabela `actor`: atores e atrizes que deram vida aos personagens.
 * A ligação com filmes e personagens fica na `casting` (relação N:N).
 */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('actor')
    .addColumn('uuid', 'uuid', (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn('organization_uuid', 'uuid', (col) => col.notNull().references('organization.uuid').onDelete('cascade'))
    .addColumn('name', 'varchar(150)', (col) => col.notNull())
    .addColumn('birth_date', 'date')
    .addColumn('nationality', 'varchar(100)')
    .addColumn('status', 'varchar(30)', (col) =>
      col
        .notNull()
        .defaultTo('active')
        .check(sql`status IN ('active', 'retired', 'in_memoriam')`)
    )
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('deleted_at', 'timestamptz')
    .addUniqueConstraint('actor_uuid_organization_unique', ['uuid', 'organization_uuid'])
    .execute();

  await db.schema
    .createIndex('actor_organization_name_unique')
    .on('actor')
    .columns(['organization_uuid', 'name'])
    .unique()
    .where(sql.ref('deleted_at'), 'is', null)
    .execute();

  await sql`
    CREATE TRIGGER actor_set_updated_at
    BEFORE UPDATE ON actor
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('actor').ifExists().cascade().execute();
}
