// context
import { TenantScope } from '@context/tenant';

// errors
import { ServiceError } from '@errors/service-error';

// types
import { tTransactionTrx } from '@database/db/kysely';

// utils
import { HTTP_STATUS } from '@utils/http-status';

const TABLE_NAME = 'film';

/** Invariantes de negócio do filme. Sempre executadas dentro da transação do service. */
export class FilmRules {
  /**
   * @param scope - escopo da credencial autenticada
   */
  constructor(private readonly scope: TenantScope) {}

  /**
   * Garante que título e episódio não estão em uso por outro filme da organização.
   *
   * @param params.trx - transação corrente
   * @param params.title - título a validar (quando enviado)
   * @param params.episode - episódio a validar (quando enviado)
   * @param params.ignoreUuid - filme que está sendo atualizado (desconsiderado na busca)
   * @throws {ServiceError} 409 `FILM_TITLE_DUPLICITY` | 409 `FILM_EPISODE_DUPLICITY`
   */
  async assertIsUnique({
    trx,
    title,
    episode,
    ignoreUuid,
  }: {
    trx: tTransactionTrx;
    title?: string;
    episode?: number | null;
    ignoreUuid?: string;
  }) {
    let query = trx.selectFrom(TABLE_NAME).select(['title', 'episode']).where(this.scope.where(TABLE_NAME));

    if (ignoreUuid) {
      query = query.where('uuid', '!=', ignoreUuid);
    }

    query = query.where((eb) =>
      eb.or([...(title ? [eb('title', '=', title)] : []), ...(episode != null ? [eb('episode', '=', episode)] : [])])
    );

    const existing = title || episode != null ? await query.executeTakeFirst() : undefined;

    if (existing && title && existing.title === title) {
      throw new ServiceError(HTTP_STATUS.conflict, 'FILM_TITLE_DUPLICITY', `Já existe um filme com o título ${title}`);
    }
    if (existing) {
      throw new ServiceError(HTTP_STATUS.conflict, 'FILM_EPISODE_DUPLICITY', `O episódio ${episode} já foi cadastrado`);
    }
  }

  /**
   * Garante que o filme não tem elenco ativo (pré-condição da remoção).
   *
   * @param params.trx - transação corrente
   * @param params.uuid - filme a remover
   * @throws {ServiceError} 409 `FILM_IN_USE`
   */
  async assertHasNoCast({ trx, uuid }: { trx: tTransactionTrx; uuid: string }) {
    const casting = await trx
      .selectFrom('casting')
      .select('uuid')
      .where(this.scope.where('casting'))
      .where('film_uuid', '=', uuid)
      .executeTakeFirst();

    if (casting) {
      throw new ServiceError(HTTP_STATUS.conflict, 'FILM_IN_USE', 'O filme tem elenco cadastrado: remova-o antes');
    }
  }
}
