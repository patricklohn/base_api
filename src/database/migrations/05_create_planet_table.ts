import { Kysely, sql } from 'kysely';

/**
 * Cria a tabela `planet`: planetas da galáxia, pertencentes a uma organização.
 *
 * A unique `(uuid, organization_uuid)` é alvo das FKs compostas das tabelas filhas (ex.: `character.planet_uuid`):
 * garante no banco que um personagem nunca aponte para o planeta de outra organização.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('planet')
    .addColumn('uuid', 'uuid', (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn('organization_uuid', 'uuid', (col) => col.notNull().references('organization.uuid').onDelete('cascade'))
    .addColumn('name', 'varchar(100)', (col) => col.notNull())
    .addColumn('region', 'varchar(30)', (col) =>
      col
        .notNull()
        .defaultTo('unknown_regions')
        .check(sql`region IN ('core_worlds', 'inner_rim', 'mid_rim', 'outer_rim', 'wild_space', 'unknown_regions')`)
    )
    .addColumn('climate', 'varchar(100)')
    .addColumn('terrain', 'varchar(100)')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('deleted_at', 'timestamptz')
    .addUniqueConstraint('planet_uuid_organization_unique', ['uuid', 'organization_uuid'])
    .execute();

  // Nome único por organização entre planetas ativos; também serve de índice para o filtro de tenant
  await db.schema
    .createIndex('planet_organization_name_unique')
    .on('planet')
    .columns(['organization_uuid', 'name'])
    .unique()
    .where(sql.ref('deleted_at'), 'is', null)
    .execute();

  await sql`
    CREATE TRIGGER planet_set_updated_at
    BEFORE UPDATE ON planet
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('planet').ifExists().cascade().execute();
}
