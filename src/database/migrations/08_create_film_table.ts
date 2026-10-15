import { Kysely, sql } from 'kysely';

/**
 * Cria a tabela `film`: filmes da saga (`episode` de I a IX) e os derivados (`anthology`, sem episódio).
 */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('film')
    .addColumn('uuid', 'uuid', (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn('organization_uuid', 'uuid', (col) => col.notNull().references('organization.uuid').onDelete('cascade'))
    .addColumn('title', 'varchar(150)', (col) => col.notNull())
    .addColumn('category', 'varchar(30)', (col) =>
      col
        .notNull()
        .defaultTo('skywalker_saga')
        .check(sql`category IN ('skywalker_saga', 'anthology')`)
    )
    .addColumn('episode', 'smallint', (col) => col.check(sql`episode BETWEEN 1 AND 9`))
    .addColumn('director', 'varchar(150)', (col) => col.notNull())
    .addColumn('release_date', 'date', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('deleted_at', 'timestamptz')
    .addUniqueConstraint('film_uuid_organization_unique', ['uuid', 'organization_uuid'])
    // Episódio só existe na saga principal; derivados não têm número
    .addCheckConstraint(
      'film_category_episode_check',
      sql`(category = 'skywalker_saga' AND episode IS NOT NULL) OR (category = 'anthology' AND episode IS NULL)`
    )
    .execute();

  await db.schema
    .createIndex('film_organization_title_unique')
    .on('film')
    .columns(['organization_uuid', 'title'])
    .unique()
    .where(sql.ref('deleted_at'), 'is', null)
    .execute();

  // Cada episódio aparece uma vez por organização
  await db.schema
    .createIndex('film_organization_episode_unique')
    .on('film')
    .columns(['organization_uuid', 'episode'])
    .unique()
    .where(sql<boolean>`deleted_at IS NULL AND episode IS NOT NULL`)
    .execute();

  await sql`
    CREATE TRIGGER film_set_updated_at
    BEFORE UPDATE ON film
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('film').ifExists().cascade().execute();
}
