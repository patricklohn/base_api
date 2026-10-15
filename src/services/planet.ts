// context
import { TenantScope } from '@context/tenant';

// rules
import { PlanetRules } from '@rules/planet';

// schema
import { iCreateBodySchema, iUpdateBodySchema } from '@routes/private/planet/docs';

// sql
import { db } from '@database/db/kysely';

// service
import { BaseService } from './base-service';
import { AuditLogService } from './audit-log';

// types
import { PLANET_COLUMNS, tPlanetColumn } from '@/types/schemas';

const TABLE_NAME = 'planet';

/** Casos de uso do planeta, sempre restritos à organização autenticada. */
export class PlanetService extends BaseService<typeof TABLE_NAME, tPlanetColumn> {
  private readonly rules: PlanetRules;

  /**
   * @param scope - escopo da credencial autenticada (`request.tenant`)
   */
  constructor(scope: TenantScope) {
    super({ table_name: TABLE_NAME, scope, columns: PLANET_COLUMNS });
    this.rules = new PlanetRules(scope);
  }

  /**
   * Cadastra um planeta.
   *
   * @param data - dados validados do body
   * @throws {ServiceError} 409 `PLANET_NAME_DUPLICITY`
   */
  async create(data: iCreateBodySchema) {
    return db.transaction().execute(async (trx) => {
      await this.rules.assertNameIsFree({ trx, name: data.name });

      const planet = await trx
        .insertInto(TABLE_NAME)
        .values(this.scope.values(TABLE_NAME, data))
        .returning(this.columns)
        .executeTakeFirstOrThrow();

      await AuditLogService.record({
        trx,
        scope: this.scope,
        action: 'planet.create',
        entity: TABLE_NAME,
        entityUuid: planet.uuid,
      });

      return planet;
    });
  }

  /**
   * Atualiza parcialmente um planeta da organização.
   *
   * @param uuid - planeta a atualizar
   * @param data - campos validados do body (ao menos um)
   * @throws {ServiceError} 404 `PLANET_NOT_FOUND` | 409 `PLANET_NAME_DUPLICITY`
   */
  async update(uuid: string, data: iUpdateBodySchema) {
    return db.transaction().execute(async (trx) => {
      if (data.name) {
        await this.rules.assertNameIsFree({ trx, name: data.name, ignoreUuid: uuid });
      }

      const planet = await trx
        .updateTable(TABLE_NAME)
        .set(data)
        .where('uuid', '=', uuid)
        .where(this.scope.where(TABLE_NAME))
        .returning(this.columns)
        .executeTakeFirst();

      if (!planet) {
        throw this.notFound();
      }

      await AuditLogService.record({
        trx,
        scope: this.scope,
        action: 'planet.update',
        entity: TABLE_NAME,
        entityUuid: planet.uuid,
        metadata: { fields: Object.keys(data) },
      });

      return planet;
    });
  }

  /**
   * Remove (soft delete) um planeta da organização.
   *
   * @param uuid - planeta a remover
   * @throws {ServiceError} 404 `PLANET_NOT_FOUND` | 409 `PLANET_IN_USE`
   */
  async remove(uuid: string) {
    await db.transaction().execute(async (trx) => {
      await this.rules.assertHasNoResident({ trx, uuid });

      const planet = await trx
        .updateTable(TABLE_NAME)
        .set({ deleted_at: new Date() })
        .where('uuid', '=', uuid)
        .where(this.scope.where(TABLE_NAME))
        .returning('uuid')
        .executeTakeFirst();

      if (!planet) {
        throw this.notFound();
      }

      await AuditLogService.record({
        trx,
        scope: this.scope,
        action: 'planet.delete',
        entity: TABLE_NAME,
        entityUuid: planet.uuid,
      });
    });
  }

  /**
   * Consulta um planeta da organização.
   *
   * @param uuid - planeta a consultar
   * @throws {ServiceError} 404 `PLANET_NOT_FOUND`
   */
  async findById(uuid: string) {
    const planet = await db
      .selectFrom(TABLE_NAME)
      .select(this.columns)
      .where('uuid', '=', uuid)
      .where(this.scope.where(TABLE_NAME))
      .executeTakeFirst();

    if (!planet) {
      throw this.notFound();
    }

    return planet;
  }
}
