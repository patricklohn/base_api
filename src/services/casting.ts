import { jsonBuildObject } from 'kysely/helpers/postgres';

// context
import { TenantScope } from '@context/tenant';

// rules
import { CastingRules } from '@rules/casting';

// schema
import { iCreateBodySchema, iUpdateBodySchema } from '@routes/private/casting/docs';

// sql
import { db } from '@database/db/kysely';

// service
import { BaseService } from './base-service';
import { AuditLogService } from './audit-log';

// types
import { CASTING_COLUMNS, tCastingColumn } from '@/types/schemas';

const TABLE_NAME = 'casting';

/** Casos de uso do elenco (N:N entre filme, ator e personagem), sempre restritos à organização autenticada. */
export class CastingService extends BaseService<typeof TABLE_NAME, tCastingColumn> {
  private readonly rules: CastingRules;

  /**
   * @param scope - escopo da credencial autenticada (`request.tenant`)
   */
  constructor(scope: TenantScope) {
    super({ table_name: TABLE_NAME, scope, columns: CASTING_COLUMNS });
    this.rules = new CastingRules(scope);
  }

  /**
   * Adiciona uma participação ao elenco.
   *
   * @param data - dados validados do body
   * @throws {ServiceError} 422 `CASTING_*_NOT_FOUND` | 409 `CASTING_DUPLICITY`
   */
  async create(data: iCreateBodySchema) {
    return db.transaction().execute(async (trx) => {
      await this.rules.assertReferencesExist({ trx, references: data });
      await this.rules.assertIsUnique({ trx, casting: data });

      const casting = await trx
        .insertInto(TABLE_NAME)
        .values(this.scope.values(TABLE_NAME, data))
        .returning(this.columns)
        .executeTakeFirstOrThrow();

      await AuditLogService.record({
        trx,
        scope: this.scope,
        action: 'casting.create',
        entity: TABLE_NAME,
        entityUuid: casting.uuid,
      });

      return casting;
    });
  }

  /**
   * Atualiza parcialmente uma participação. A unicidade é validada sobre a combinação final
   * (registro atual + campos enviados), lida com `FOR UPDATE` para não correr com outra edição.
   *
   * @param uuid - participação a atualizar
   * @param data - campos validados do body (ao menos um)
   * @throws {ServiceError} 404 `CASTING_NOT_FOUND` | 422 `CASTING_*_NOT_FOUND` | 409 `CASTING_DUPLICITY`
   */
  async update(uuid: string, data: iUpdateBodySchema) {
    return db.transaction().execute(async (trx) => {
      const current = await trx
        .selectFrom(TABLE_NAME)
        .select(['film_uuid', 'actor_uuid', 'character_uuid'])
        .where('uuid', '=', uuid)
        .where(this.scope.where(TABLE_NAME))
        .forUpdate()
        .executeTakeFirst();

      if (!current) {
        throw this.notFound();
      }

      await this.rules.assertReferencesExist({ trx, references: data });
      await this.rules.assertIsUnique({ trx, casting: { ...current, ...data }, ignoreUuid: uuid });

      const casting = await trx
        .updateTable(TABLE_NAME)
        .set(data)
        .where('uuid', '=', uuid)
        .where(this.scope.where(TABLE_NAME))
        .returning(this.columns)
        .executeTakeFirstOrThrow();

      await AuditLogService.record({
        trx,
        scope: this.scope,
        action: 'casting.update',
        entity: TABLE_NAME,
        entityUuid: casting.uuid,
        metadata: { fields: Object.keys(data) },
      });

      return casting;
    });
  }

  /**
   * Remove (soft delete) uma participação.
   *
   * @param uuid - participação a remover
   * @throws {ServiceError} 404 `CASTING_NOT_FOUND`
   */
  async remove(uuid: string) {
    await db.transaction().execute(async (trx) => {
      const casting = await trx
        .updateTable(TABLE_NAME)
        .set({ deleted_at: new Date() })
        .where('uuid', '=', uuid)
        .where(this.scope.where(TABLE_NAME))
        .returning('uuid')
        .executeTakeFirst();

      if (!casting) {
        throw this.notFound();
      }

      await AuditLogService.record({
        trx,
        scope: this.scope,
        action: 'casting.delete',
        entity: TABLE_NAME,
        entityUuid: casting.uuid,
      });
    });
  }

  /**
   * Consulta uma participação com filme, ator e personagem resolvidos.
   *
   * @param uuid - participação a consultar
   * @throws {ServiceError} 404 `CASTING_NOT_FOUND`
   */
  async findById(uuid: string) {
    const casting = await db
      .selectFrom(TABLE_NAME)
      .innerJoin('film', 'film.uuid', 'casting.film_uuid')
      .innerJoin('actor', 'actor.uuid', 'casting.actor_uuid')
      .innerJoin('character', 'character.uuid', 'casting.character_uuid')
      .select(this.columns.map((column) => `casting.${column}` as const))
      .select((eb) => [
        jsonBuildObject({ uuid: eb.ref('film.uuid'), title: eb.ref('film.title') }).as('film'),
        jsonBuildObject({ uuid: eb.ref('actor.uuid'), name: eb.ref('actor.name') }).as('actor'),
        jsonBuildObject({ uuid: eb.ref('character.uuid'), name: eb.ref('character.name') }).as('character'),
      ])
      .where('casting.uuid', '=', uuid)
      .where(this.scope.where(TABLE_NAME))
      .executeTakeFirst();

    if (!casting) {
      throw this.notFound();
    }

    return casting;
  }
}
