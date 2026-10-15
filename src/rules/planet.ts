// context
import { TenantScope } from '@context/tenant';

// errors
import { ServiceError } from '@errors/service-error';

// types
import { tTransactionTrx } from '@database/db/kysely';

// utils
import { HTTP_STATUS } from '@utils/http-status';

const TABLE_NAME = 'planet';

/** Invariantes de negócio do planeta. Sempre executadas dentro da transação do service. */
export class PlanetRules {
  /**
   * @param scope - escopo da credencial autenticada
   */
  constructor(private readonly scope: TenantScope) {}

  /**
   * Garante que o nome não está em uso por outro planeta da organização.
   *
   * @param params.trx - transação corrente
   * @param params.name - nome a validar
   * @param params.ignoreUuid - planeta que está sendo atualizado (desconsiderado na busca)
   * @throws {ServiceError} 409 `PLANET_NAME_DUPLICITY`
   */
  async assertNameIsFree({ trx, name, ignoreUuid }: { trx: tTransactionTrx; name: string; ignoreUuid?: string }) {
    let query = trx.selectFrom(TABLE_NAME).select('uuid').where(this.scope.where(TABLE_NAME)).where('name', '=', name);

    if (ignoreUuid) {
      query = query.where('uuid', '!=', ignoreUuid);
    }

    if (await query.executeTakeFirst()) {
      throw new ServiceError(HTTP_STATUS.conflict, 'PLANET_NAME_DUPLICITY', `Já existe um planeta com o nome ${name}`);
    }
  }

  /**
   * Garante que nenhum personagem ativo tem o planeta como planeta natal (pré-condição da remoção).
   *
   * @param params.trx - transação corrente
   * @param params.uuid - planeta a remover
   * @throws {ServiceError} 409 `PLANET_IN_USE`
   */
  async assertHasNoResident({ trx, uuid }: { trx: tTransactionTrx; uuid: string }) {
    const resident = await trx
      .selectFrom('character')
      .select('uuid')
      .where(this.scope.where('character'))
      .where('planet_uuid', '=', uuid)
      .executeTakeFirst();

    if (resident) {
      throw new ServiceError(
        HTTP_STATUS.conflict,
        'PLANET_IN_USE',
        'O planeta é o planeta natal de algum personagem: altere os personagens antes'
      );
    }
  }
}
