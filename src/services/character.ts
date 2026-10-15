import { jsonObjectFrom } from 'kysely/helpers/postgres';

// context
import { TenantScope } from '@context/tenant';

// rules
import { CharacterRules } from '@rules/character';

// schema
import { iCreateBodySchema, iUpdateBodySchema } from '@routes/private/character/docs';

// sql
import { db } from '@database/db/kysely';

// service
import { BaseService } from './base-service';
import { AuditLogService } from './audit-log';

// types
import { CHARACTER_COLUMNS, tCharacterColumn } from '@/types/schemas';

const TABLE_NAME = 'character';

/** Casos de uso do personagem, sempre restritos à organização autenticada. */
export class CharacterService extends BaseService<typeof TABLE_NAME, tCharacterColumn> {
  private readonly rules: CharacterRules;

  /**
   * @param scope - escopo da credencial autenticada (`request.tenant`)
   */
  constructor(scope: TenantScope) {
    super({ table_name: TABLE_NAME, scope, columns: CHARACTER_COLUMNS });
    this.rules = new CharacterRules(scope);
  }

  /**
   * Cadastra um personagem.
   *
   * @param data - dados validados do body
   * @throws {ServiceError} 409 `CHARACTER_NAME_DUPLICITY` | 422 `CHARACTER_PLANET_NOT_FOUND`
   */
  async create(data: iCreateBodySchema) {
    return db.transaction().execute(async (trx) => {
      await this.rules.assertNameIsFree({ trx, name: data.name });

      if (data.planet_uuid) {
        await this.rules.assertPlanetExists({ trx, planetUuid: data.planet_uuid });
      }

      const character = await trx
        .insertInto(TABLE_NAME)
        .values(this.scope.values(TABLE_NAME, data))
        .returning(this.columns)
        .executeTakeFirstOrThrow();

      await AuditLogService.record({
        trx,
        scope: this.scope,
        action: 'character.create',
        entity: TABLE_NAME,
        entityUuid: character.uuid,
      });

      return character;
    });
  }

  /**
   * Atualiza parcialmente um personagem da organização.
   *
   * @param uuid - personagem a atualizar
   * @param data - campos validados do body (ao menos um)
   * @throws {ServiceError} 404 `CHARACTER_NOT_FOUND` | 409 `CHARACTER_NAME_DUPLICITY` | 422 `CHARACTER_PLANET_NOT_FOUND`
   */
  async update(uuid: string, data: iUpdateBodySchema) {
    return db.transaction().execute(async (trx) => {
      if (data.name) {
        await this.rules.assertNameIsFree({ trx, name: data.name, ignoreUuid: uuid });
      }

      if (data.planet_uuid) {
        await this.rules.assertPlanetExists({ trx, planetUuid: data.planet_uuid });
      }

      const character = await trx
        .updateTable(TABLE_NAME)
        .set(data)
        .where('uuid', '=', uuid)
        .where(this.scope.where(TABLE_NAME))
        .returning(this.columns)
        .executeTakeFirst();

      if (!character) {
        throw this.notFound();
      }

      await AuditLogService.record({
        trx,
        scope: this.scope,
        action: 'character.update',
        entity: TABLE_NAME,
        entityUuid: character.uuid,
        metadata: { fields: Object.keys(data) },
      });

      return character;
    });
  }

  /**
   * Remove (soft delete) um personagem da organização.
   *
   * @param uuid - personagem a remover
   * @throws {ServiceError} 404 `CHARACTER_NOT_FOUND` | 409 `CHARACTER_IN_USE`
   */
  async remove(uuid: string) {
    await db.transaction().execute(async (trx) => {
      await this.rules.assertIsNotCast({ trx, uuid });

      const character = await trx
        .updateTable(TABLE_NAME)
        .set({ deleted_at: new Date() })
        .where('uuid', '=', uuid)
        .where(this.scope.where(TABLE_NAME))
        .returning('uuid')
        .executeTakeFirst();

      if (!character) {
        throw this.notFound();
      }

      await AuditLogService.record({
        trx,
        scope: this.scope,
        action: 'character.delete',
        entity: TABLE_NAME,
        entityUuid: character.uuid,
      });
    });
  }

  /**
   * Consulta um personagem da organização com o planeta natal resolvido (`homeworld`).
   * Exemplo de relação 1:N: subquery `jsonObjectFrom` no lugar de um join que duplicaria colunas.
   *
   * @param uuid - personagem a consultar
   * @throws {ServiceError} 404 `CHARACTER_NOT_FOUND`
   */
  async findById(uuid: string) {
    const character = await db
      .selectFrom(TABLE_NAME)
      .select(this.columns)
      .select((eb) =>
        jsonObjectFrom(
          eb
            .selectFrom('planet')
            .select(['planet.uuid', 'planet.name'])
            .whereRef('planet.uuid', '=', 'character.planet_uuid')
            .where('planet.deleted_at', 'is', null)
        ).as('homeworld')
      )
      .where('uuid', '=', uuid)
      .where(this.scope.where(TABLE_NAME))
      .executeTakeFirst();

    if (!character) {
      throw this.notFound();
    }

    return character;
  }
}
