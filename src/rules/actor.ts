// context
import { TenantScope } from '@context/tenant';

// errors
import { ServiceError } from '@errors/service-error';

// types
import { tTransactionTrx } from '@database/db/kysely';

// utils
import { HTTP_STATUS } from '@utils/http-status';

const TABLE_NAME = 'actor';

/** Invariantes de negócio do ator. Sempre executadas dentro da transação do service. */
export class ActorRules {
  /**
   * @param scope - escopo da credencial autenticada
   */
  constructor(private readonly scope: TenantScope) {}

  /**
   * Garante que o nome não está em uso por outro ator da organização.
   * O índice único parcial no banco cobre a concorrência; esta checagem devolve uma mensagem clara.
   *
   * @param params.trx - transação corrente
   * @param params.name - nome a validar
   * @param params.ignoreUuid - ator que está sendo atualizado (desconsiderado na busca)
   * @throws {ServiceError} 409 `ACTOR_NAME_DUPLICITY`
   */
  async assertNameIsFree({ trx, name, ignoreUuid }: { trx: tTransactionTrx; name: string; ignoreUuid?: string }) {
    let query = trx.selectFrom(TABLE_NAME).select('uuid').where(this.scope.where(TABLE_NAME)).where('name', '=', name);

    // Kysely é imutável: sempre reatribuir
    if (ignoreUuid) {
      query = query.where('uuid', '!=', ignoreUuid);
    }

    if (await query.executeTakeFirst()) {
      throw new ServiceError(HTTP_STATUS.conflict, 'ACTOR_NAME_DUPLICITY', `Já existe um ator com o nome ${name}`);
    }
  }

  /**
   * Garante que o ator não participa de nenhum elenco ativo (pré-condição da remoção).
   *
   * @param params.trx - transação corrente
   * @param params.uuid - ator a remover
   * @throws {ServiceError} 409 `ACTOR_IN_USE`
   */
  async assertIsNotCast({ trx, uuid }: { trx: tTransactionTrx; uuid: string }) {
    const casting = await trx
      .selectFrom('casting')
      .select('uuid')
      .where(this.scope.where('casting'))
      .where('actor_uuid', '=', uuid)
      .executeTakeFirst();

    if (casting) {
      throw new ServiceError(
        HTTP_STATUS.conflict,
        'ACTOR_IN_USE',
        'O ator participa de um elenco: remova as participações antes'
      );
    }
  }
}
