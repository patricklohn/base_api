import { sql } from 'kysely';
import { jsonBuildObject } from 'kysely/helpers/postgres';

// context
import { TenantScope } from '@context/tenant';

// rules
import { FilmRules } from '@rules/film';

// schema
import { iCreateBodySchema, iUpdateBodySchema } from '@routes/private/film/docs';

// sql
import { db } from '@database/db/kysely';

// service
import { BaseService } from './base-service';
import { AuditLogService } from './audit-log';

// types
import { FILM_COLUMNS, tFilmColumn } from '@/types/schemas';

const TABLE_NAME = 'film';

/** Casos de uso do filme, sempre restritos à organização autenticada. */
export class FilmService extends BaseService<typeof TABLE_NAME, tFilmColumn> {
  private readonly rules: FilmRules;

  /**
   * @param scope - escopo da credencial autenticada (`request.tenant`)
   */
  constructor(scope: TenantScope) {
    super({ table_name: TABLE_NAME, scope, columns: FILM_COLUMNS });
    this.rules = new FilmRules(scope);
  }

  /**
   * Cadastra um filme.
   *
   * @param data - dados validados do body
   * @throws {ServiceError} 409 `FILM_TITLE_DUPLICITY` | 409 `FILM_EPISODE_DUPLICITY`
   */
  async create(data: iCreateBodySchema) {
    return db.transaction().execute(async (trx) => {
      await this.rules.assertIsUnique({ trx, title: data.title, episode: data.episode });

      const film = await trx
        .insertInto(TABLE_NAME)
        .values(this.scope.values(TABLE_NAME, data))
        .returning(this.columns)
        .executeTakeFirstOrThrow();

      await AuditLogService.record({
        trx,
        scope: this.scope,
        action: 'film.create',
        entity: TABLE_NAME,
        entityUuid: film.uuid,
      });

      return film;
    });
  }

  /**
   * Atualiza parcialmente um filme da organização.
   *
   * @param uuid - filme a atualizar
   * @param data - campos validados do body (ao menos um)
   * @throws {ServiceError} 404 `FILM_NOT_FOUND` | 409 `FILM_TITLE_DUPLICITY` | 409 `FILM_EPISODE_DUPLICITY`
   */
  async update(uuid: string, data: iUpdateBodySchema) {
    return db.transaction().execute(async (trx) => {
      await this.rules.assertIsUnique({ trx, title: data.title, episode: data.episode, ignoreUuid: uuid });

      const film = await trx
        .updateTable(TABLE_NAME)
        .set(data)
        .where('uuid', '=', uuid)
        .where(this.scope.where(TABLE_NAME))
        .returning(this.columns)
        .executeTakeFirst();

      if (!film) {
        throw this.notFound();
      }

      await AuditLogService.record({
        trx,
        scope: this.scope,
        action: 'film.update',
        entity: TABLE_NAME,
        entityUuid: film.uuid,
        metadata: { fields: Object.keys(data) },
      });

      return film;
    });
  }

  /**
   * Remove (soft delete) um filme da organização.
   *
   * @param uuid - filme a remover
   * @throws {ServiceError} 404 `FILM_NOT_FOUND` | 409 `FILM_IN_USE`
   */
  async remove(uuid: string) {
    await db.transaction().execute(async (trx) => {
      await this.rules.assertHasNoCast({ trx, uuid });

      const film = await trx
        .updateTable(TABLE_NAME)
        .set({ deleted_at: new Date() })
        .where('uuid', '=', uuid)
        .where(this.scope.where(TABLE_NAME))
        .returning('uuid')
        .executeTakeFirst();

      if (!film) {
        throw this.notFound();
      }

      await AuditLogService.record({
        trx,
        scope: this.scope,
        action: 'film.delete',
        entity: TABLE_NAME,
        entityUuid: film.uuid,
      });
    });
  }

  /**
   * Consulta um filme da organização.
   *
   * @param uuid - filme a consultar
   * @throws {ServiceError} 404 `FILM_NOT_FOUND`
   */
  async findById(uuid: string) {
    const film = await db
      .selectFrom(TABLE_NAME)
      .select(this.columns)
      .where('uuid', '=', uuid)
      .where(this.scope.where(TABLE_NAME))
      .executeTakeFirst();

    if (!film) {
      throw this.notFound();
    }

    return film;
  }

  /**
   * Elenco do filme: papéis principais primeiro, depois coadjuvantes, vozes e participações.
   *
   * @param uuid - filme
   * @throws {ServiceError} 404 `FILM_NOT_FOUND`
   */
  async cast(uuid: string) {
    await this.findById(uuid);

    return db
      .selectFrom('casting')
      .innerJoin('actor', 'actor.uuid', 'casting.actor_uuid')
      .innerJoin('character', 'character.uuid', 'casting.character_uuid')
      .select((eb) => [
        'casting.uuid as casting_uuid',
        'casting.role_type',
        jsonBuildObject({ uuid: eb.ref('actor.uuid'), name: eb.ref('actor.name') }).as('actor'),
        jsonBuildObject({ uuid: eb.ref('character.uuid'), name: eb.ref('character.name') }).as('character'),
      ])
      .where('casting.film_uuid', '=', uuid)
      .where(this.scope.where('casting'))
      .where('actor.deleted_at', 'is', null)
      .where('character.deleted_at', 'is', null)
      .orderBy(
        sql`array_position(array['main', 'supporting', 'voice', 'cameo']::varchar[], ${sql.ref('casting.role_type')})`
      )
      .orderBy('actor.name', 'asc')
      .execute();
  }
}
