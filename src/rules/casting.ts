// context
import { TenantScope } from '@context/tenant';

// errors
import { ServiceError } from '@errors/service-error';

// types
import { tTransactionTrx } from '@database/db/kysely';

// utils
import { HTTP_STATUS } from '@utils/http-status';

const TABLE_NAME = 'casting';

/** Tabelas referenciadas pela participação e o código de erro de cada uma. */
const REFERENCES = {
  film_uuid: { table: 'film', code: 'CASTING_FILM_NOT_FOUND', label: 'Filme' },
  actor_uuid: { table: 'actor', code: 'CASTING_ACTOR_NOT_FOUND', label: 'Ator' },
  character_uuid: { table: 'character', code: 'CASTING_CHARACTER_NOT_FOUND', label: 'Personagem' },
} as const;

type tCastingReferences = Partial<Record<keyof typeof REFERENCES, string>>;

/** Invariantes de negócio do elenco. Sempre executadas dentro da transação do service. */
export class CastingRules {
  /**
   * @param scope - escopo da credencial autenticada
   */
  constructor(private readonly scope: TenantScope) {}

  /**
   * Garante que filme, ator e personagem informados existem na organização e não foram removidos.
   * As FKs compostas já barram registros de outra organização; esta checagem cobre o soft delete
   * e diz qual referência falhou.
   *
   * @param params.trx - transação corrente
   * @param params.references - uuids enviados no body (os ausentes são ignorados)
   * @throws {ServiceError} 422 `CASTING_FILM_NOT_FOUND` | `CASTING_ACTOR_NOT_FOUND` | `CASTING_CHARACTER_NOT_FOUND`
   */
  async assertReferencesExist({ trx, references }: { trx: tTransactionTrx; references: tCastingReferences }) {
    for (const [column, { table, code, label }] of Object.entries(REFERENCES)) {
      const uuid = references[column as keyof typeof REFERENCES];

      if (!uuid) {
        continue;
      }

      const found = await trx
        .selectFrom(table)
        .select('uuid')
        .where('uuid', '=', uuid)
        .where(this.scope.where(table))
        .executeTakeFirst();

      if (!found) {
        throw new ServiceError(HTTP_STATUS.unprocessable_entity, code, `${label} não encontrado na organização`);
      }
    }
  }

  /**
   * Garante que a combinação filme + ator + personagem ainda não está no elenco.
   *
   * @param params.trx - transação corrente
   * @param params.casting - combinação final (já mesclada com o registro atual no update)
   * @param params.ignoreUuid - participação que está sendo atualizada
   * @throws {ServiceError} 409 `CASTING_DUPLICITY`
   */
  async assertIsUnique({
    trx,
    casting,
    ignoreUuid,
  }: {
    trx: tTransactionTrx;
    casting: { film_uuid: string; actor_uuid: string; character_uuid: string };
    ignoreUuid?: string;
  }) {
    let query = trx
      .selectFrom(TABLE_NAME)
      .select('uuid')
      .where(this.scope.where(TABLE_NAME))
      .where('film_uuid', '=', casting.film_uuid)
      .where('actor_uuid', '=', casting.actor_uuid)
      .where('character_uuid', '=', casting.character_uuid);

    if (ignoreUuid) {
      query = query.where('uuid', '!=', ignoreUuid);
    }

    if (await query.executeTakeFirst()) {
      throw new ServiceError(
        HTTP_STATUS.conflict,
        'CASTING_DUPLICITY',
        'Esse ator já interpreta esse personagem nesse filme'
      );
    }
  }
}
