import { jsonBuildObject } from 'kysely/helpers/postgres';

// context
import { TenantScope } from '@context/tenant';

// rules
import { ActorRules } from '@rules/actor';

// schema
import { iCreateBodySchema, iUpdateBodySchema } from '@routes/private/actor/docs';

// sql
import { db } from '@database/db/kysely';

// service
import { BaseService } from './base-service';
import { AuditLogService } from './audit-log';

// types
import { ACTOR_COLUMNS, tActorColumn } from '@/types/schemas';

const TABLE_NAME = 'actor';

/** Casos de uso do ator, sempre restritos à organização autenticada. */
export class ActorService extends BaseService<typeof TABLE_NAME, tActorColumn> {
  private readonly rules: ActorRules;

  /**
   * @param scope - escopo da credencial autenticada (`request.tenant`)
   */
  constructor(scope: TenantScope) {
    super({ table_name: TABLE_NAME, scope, columns: ACTOR_COLUMNS });
    this.rules = new ActorRules(scope);
  }

  /**
   * Cadastra um ator.
   *
   * @param data - dados validados do body
   * @throws {ServiceError} 409 `ACTOR_NAME_DUPLICITY`
   */
  async create(data: iCreateBodySchema) {
    return db.transaction().execute(async (trx) => {
      await this.rules.assertNameIsFree({ trx, name: data.name });

      const actor = await trx
        .insertInto(TABLE_NAME)
        .values(this.scope.values(TABLE_NAME, data))
        .returning(this.columns)
        .executeTakeFirstOrThrow();

      await AuditLogService.record({
        trx,
        scope: this.scope,
        action: 'actor.create',
        entity: TABLE_NAME,
        entityUuid: actor.uuid,
      });

      return actor;
    });
  }

  /**
   * Atualiza parcialmente um ator da organização.
   *
   * @param uuid - ator a atualizar
   * @param data - campos validados do body (ao menos um)
   * @throws {ServiceError} 404 `ACTOR_NOT_FOUND` | 409 `ACTOR_NAME_DUPLICITY`
   */
  async update(uuid: string, data: iUpdateBodySchema) {
    return db.transaction().execute(async (trx) => {
      if (data.name) {
        await this.rules.assertNameIsFree({ trx, name: data.name, ignoreUuid: uuid });
      }

      const actor = await trx
        .updateTable(TABLE_NAME)
        .set(data)
        .where('uuid', '=', uuid)
        .where(this.scope.where(TABLE_NAME))
        .returning(this.columns)
        .executeTakeFirst();

      if (!actor) {
        throw this.notFound();
      }

      await AuditLogService.record({
        trx,
        scope: this.scope,
        action: 'actor.update',
        entity: TABLE_NAME,
        entityUuid: actor.uuid,
        metadata: { fields: Object.keys(data) },
      });

      return actor;
    });
  }

  /**
   * Remove (soft delete) um ator da organização.
   *
   * @param uuid - ator a remover
   * @throws {ServiceError} 404 `ACTOR_NOT_FOUND` | 409 `ACTOR_IN_USE`
   */
  async remove(uuid: string) {
    await db.transaction().execute(async (trx) => {
      await this.rules.assertIsNotCast({ trx, uuid });

      const actor = await trx
        .updateTable(TABLE_NAME)
        .set({ deleted_at: new Date() })
        .where('uuid', '=', uuid)
        .where(this.scope.where(TABLE_NAME))
        .returning('uuid')
        .executeTakeFirst();

      if (!actor) {
        throw this.notFound();
      }

      await AuditLogService.record({
        trx,
        scope: this.scope,
        action: 'actor.delete',
        entity: TABLE_NAME,
        entityUuid: actor.uuid,
      });
    });
  }

  /**
   * Consulta um ator da organização.
   *
   * @param uuid - ator a consultar
   * @throws {ServiceError} 404 `ACTOR_NOT_FOUND`
   */
  async findById(uuid: string) {
    const actor = await db
      .selectFrom(TABLE_NAME)
      .select(this.columns)
      .where('uuid', '=', uuid)
      .where(this.scope.where(TABLE_NAME))
      .executeTakeFirst();

    if (!actor) {
      throw this.notFound();
    }

    return actor;
  }

  /**
   * Filmografia do ator: cada participação com o filme e o personagem, em ordem de lançamento.
   * Exemplo de join entre tabelas do tenant: o filtro vai na `casting`, e as FKs compostas garantem
   * que filme e personagem são da mesma organização.
   *
   * @param uuid - ator
   * @throws {ServiceError} 404 `ACTOR_NOT_FOUND`
   */
  async filmography(uuid: string) {
    await this.findById(uuid);

    return db
      .selectFrom('casting')
      .innerJoin('film', 'film.uuid', 'casting.film_uuid')
      .innerJoin('character', 'character.uuid', 'casting.character_uuid')
      .select((eb) => [
        'casting.uuid as casting_uuid',
        'casting.role_type',
        jsonBuildObject({
          uuid: eb.ref('film.uuid'),
          title: eb.ref('film.title'),
          episode: eb.ref('film.episode'),
          release_date: eb.ref('film.release_date'),
        }).as('film'),
        jsonBuildObject({ uuid: eb.ref('character.uuid'), name: eb.ref('character.name') }).as('character'),
      ])
      .where('casting.actor_uuid', '=', uuid)
      .where(this.scope.where('casting'))
      .where('film.deleted_at', 'is', null)
      .where('character.deleted_at', 'is', null)
      .orderBy('film.release_date', 'asc')
      .orderBy('casting.uuid', 'asc')
      .execute();
  }
}
