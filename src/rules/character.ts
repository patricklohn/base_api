// context
import { TenantScope } from '@context/tenant';

// errors
import { ServiceError } from '@errors/service-error';

// types
import { tTransactionTrx } from '@database/db/kysely';

// utils
import { HTTP_STATUS } from '@utils/http-status';

const TABLE_NAME = 'character';

/** Invariantes de negócio do personagem. Sempre executadas dentro da transação do service. */
export class CharacterRules {
  /**
   * @param scope - escopo da credencial autenticada
   */
  constructor(private readonly scope: TenantScope) {}

  /**
   * Garante que o nome não está em uso por outro personagem da organização.
   *
   * @param params.trx - transação corrente
   * @param params.name - nome a validar
   * @param params.ignoreUuid - personagem que está sendo atualizado (desconsiderado na busca)
   * @throws {ServiceError} 409 `CHARACTER_NAME_DUPLICITY`
   */
  async assertNameIsFree({ trx, name, ignoreUuid }: { trx: tTransactionTrx; name: string; ignoreUuid?: string }) {
    let query = trx.selectFrom(TABLE_NAME).select('uuid').where(this.scope.where(TABLE_NAME)).where('name', '=', name);

    if (ignoreUuid) {
      query = query.where('uuid', '!=', ignoreUuid);
    }

    if (await query.executeTakeFirst()) {
      throw new ServiceError(
        HTTP_STATUS.conflict,
        'CHARACTER_NAME_DUPLICITY',
        `Já existe um personagem com o nome ${name}`
      );
    }
  }

  /**
   * Garante que o planeta natal existe na organização e não foi removido.
   * A FK composta já barra planeta de outra organização; esta checagem cobre o soft delete
   * e devolve uma mensagem clara.
   *
   * @param params.trx - transação corrente
   * @param params.planetUuid - planeta informado no body
   * @throws {ServiceError} 422 `CHARACTER_PLANET_NOT_FOUND`
   */
  async assertPlanetExists({ trx, planetUuid }: { trx: tTransactionTrx; planetUuid: string }) {
    const planet = await trx
      .selectFrom('planet')
      .select('uuid')
      .where('uuid', '=', planetUuid)
      .where(this.scope.where('planet'))
      .executeTakeFirst();

    if (!planet) {
      throw new ServiceError(
        HTTP_STATUS.unprocessable_entity,
        'CHARACTER_PLANET_NOT_FOUND',
        'Planeta natal não encontrado na organização'
      );
    }
  }

  /**
   * Garante que o personagem não está em nenhum elenco ativo (pré-condição da remoção).
   *
   * @param params.trx - transação corrente
   * @param params.uuid - personagem a remover
   * @throws {ServiceError} 409 `CHARACTER_IN_USE`
   */
  async assertIsNotCast({ trx, uuid }: { trx: tTransactionTrx; uuid: string }) {
    const casting = await trx
      .selectFrom('casting')
      .select('uuid')
      .where(this.scope.where('casting'))
      .where('character_uuid', '=', uuid)
      .executeTakeFirst();

    if (casting) {
      throw new ServiceError(
        HTTP_STATUS.conflict,
        'CHARACTER_IN_USE',
        'O personagem está em um elenco: remova as participações antes'
      );
    }
  }
}
