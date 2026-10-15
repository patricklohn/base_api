import { Kysely, sql } from 'kysely';

/**
 * Cria a tabela `casting`: quem interpretou qual personagem em qual filme (N:N entre `actor`, `character` e `film`).
 *
 * As três FKs compostas `(<entidade>_uuid, organization_uuid)` impedem misturar registros de organizações diferentes.
 * Um mesmo personagem pode ter vários atores no mesmo filme (ex.: Darth Vader: corpo e voz).
 */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('casting')
    .addColumn('uuid', 'uuid', (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn('organization_uuid', 'uuid', (col) => col.notNull().references('organization.uuid').onDelete('cascade'))
    .addColumn('film_uuid', 'uuid', (col) => col.notNull())
    .addColumn('actor_uuid', 'uuid', (col) => col.notNull())
    .addColumn('character_uuid', 'uuid', (col) => col.notNull())
    .addColumn('role_type', 'varchar(30)', (col) =>
      col
        .notNull()
        .defaultTo('main')
        .check(sql`role_type IN ('main', 'supporting', 'voice', 'cameo')`)
    )
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('deleted_at', 'timestamptz')
    .addForeignKeyConstraint('casting_film_fk', ['film_uuid', 'organization_uuid'], 'film', [
      'uuid',
      'organization_uuid',
    ])
    .addForeignKeyConstraint('casting_actor_fk', ['actor_uuid', 'organization_uuid'], 'actor', [
      'uuid',
      'organization_uuid',
    ])
    .addForeignKeyConstraint('casting_character_fk', ['character_uuid', 'organization_uuid'], 'character', [
      'uuid',
      'organization_uuid',
    ])
    .execute();

  await db.schema
    .createIndex('casting_film_actor_character_unique')
    .on('casting')
    .columns(['organization_uuid', 'film_uuid', 'actor_uuid', 'character_uuid'])
    .unique()
    .where(sql.ref('deleted_at'), 'is', null)
    .execute();

  await db.schema.createIndex('casting_actor_uuid_idx').on('casting').column('actor_uuid').execute();
  await db.schema.createIndex('casting_character_uuid_idx').on('casting').column('character_uuid').execute();

  await sql`
    CREATE TRIGGER casting_set_updated_at
    BEFORE UPDATE ON casting
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('casting').ifExists().cascade().execute();
}
