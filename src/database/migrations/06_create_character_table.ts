import { Kysely, sql } from 'kysely';

/**
 * Cria a tabela `character`: personagens do universo, com o planeta natal opcional (`planet_uuid`, relação 1:N).
 *
 * A FK composta `(planet_uuid, organization_uuid)` impede apontar para o planeta de outra organização.
 * Com `planet_uuid` nulo a FK não é verificada (MATCH SIMPLE): personagem sem planeta conhecido.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('character')
    .addColumn('uuid', 'uuid', (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn('organization_uuid', 'uuid', (col) => col.notNull().references('organization.uuid').onDelete('cascade'))
    .addColumn('planet_uuid', 'uuid')
    .addColumn('name', 'varchar(100)', (col) => col.notNull())
    .addColumn('species', 'varchar(100)', (col) => col.notNull().defaultTo('Human'))
    .addColumn('affiliation', 'varchar(30)', (col) =>
      col
        .notNull()
        .defaultTo('independent')
        .check(
          sql`affiliation IN ('jedi', 'sith', 'galactic_republic', 'galactic_empire', 'rebel_alliance', 'first_order', 'resistance', 'bounty_hunter', 'independent')`
        )
    )
    .addColumn('is_force_sensitive', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('deleted_at', 'timestamptz')
    .addUniqueConstraint('character_uuid_organization_unique', ['uuid', 'organization_uuid'])
    .addForeignKeyConstraint(
      'character_planet_fk',
      ['planet_uuid', 'organization_uuid'],
      'planet',
      ['uuid', 'organization_uuid'],
      (fk) => fk.onDelete('restrict')
    )
    .execute();

  await db.schema
    .createIndex('character_organization_name_unique')
    .on('character')
    .columns(['organization_uuid', 'name'])
    .unique()
    .where(sql.ref('deleted_at'), 'is', null)
    .execute();

  await db.schema.createIndex('character_planet_uuid_idx').on('character').column('planet_uuid').execute();

  await sql`
    CREATE TRIGGER character_set_updated_at
    BEFORE UPDATE ON "character"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('character').ifExists().cascade().execute();
}
