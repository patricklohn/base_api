import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Env } from '@configs/env';

// rules
import { RefreshTokenRules } from '@rules/refresh-token';

// sql
import { db, tTransactionTrx } from '@database/db/kysely';

const TABLE_NAME = 'refresh_token';
const DAY_MS = 24 * 60 * 60 * 1000;

/** Refresh token recém-emitido: o valor em texto puro só existe aqui, nunca é persistido. */
export interface iIssuedRefreshToken {
  uuid: string;
  refresh_token: string;
  expires_at: Date;
}

/**
 * Emissão, rotação e revogação dos refresh tokens (`refresh_token`).
 * Uso interno: chamado pelo `AuthService` e por CLIs, sem escopo de request.
 */
export class RefreshTokenService {
  /**
   * Hash sha256 (hex) usado para guardar e localizar o token.
   *
   * @param token - refresh token em texto puro
   */
  static hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Emite um refresh token para a credencial.
   *
   * @param params.accountUuid - `service_account` dona do token
   * @param params.familyUuid - cadeia de rotação; sem ela, começa uma família nova (login)
   * @param params.trx - transação corrente (padrão: conexão direta)
   * @returns token em texto puro (opaco, 384 bits em base64url) e validade
   */
  static async issue({
    accountUuid,
    familyUuid = randomUUID(),
    trx = db,
  }: {
    accountUuid: string;
    familyUuid?: string;
    trx?: tTransactionTrx;
  }): Promise<iIssuedRefreshToken> {
    const refresh_token = randomBytes(48).toString('base64url');
    const expires_at = new Date(Date.now() + Env.REFRESH_TOKEN_EXPIRES_DAYS * DAY_MS);

    const row = await trx
      .insertInto(TABLE_NAME)
      .values({
        service_account_uuid: accountUuid,
        family_uuid: familyUuid,
        token_hash: this.hash(refresh_token),
        expires_at,
      })
      .returning('uuid')
      .executeTakeFirstOrThrow();

    return { uuid: row.uuid, refresh_token, expires_at };
  }

  /**
   * Busca o token pelo hash travando a linha até o fim da transação, para que dois usos simultâneos do mesmo token
   * não rotacionem duas vezes.
   *
   * @param trx - transação corrente
   * @param token - refresh token em texto puro
   * @returns registro e situação do token
   */
  static async findForUpdate(trx: tTransactionTrx, token: string) {
    const row = await trx
      .selectFrom(TABLE_NAME)
      .select(['uuid', 'service_account_uuid', 'family_uuid', 'expires_at', 'revoked_at', 'replaced_by_uuid'])
      .where('token_hash', '=', this.hash(token))
      .forUpdate()
      .executeTakeFirst();

    return { row, state: RefreshTokenRules.state(row, new Date()) };
  }

  /**
   * Marca o token como rotacionado, apontando para o sucessor.
   *
   * @param trx - transação corrente
   * @param uuid - token usado
   * @param replacedByUuid - token emitido no lugar dele
   */
  static async markRotated(trx: tTransactionTrx, uuid: string, replacedByUuid: string) {
    await trx
      .updateTable(TABLE_NAME)
      .set({ revoked_at: new Date(), replaced_by_uuid: replacedByUuid })
      .where('uuid', '=', uuid)
      .execute();
  }

  /**
   * Revoga todos os tokens ainda ativos de uma família (logout ou detecção de reutilização).
   *
   * @param trx - transação corrente
   * @param familyUuid - cadeia de rotação
   */
  static async revokeFamily(trx: tTransactionTrx, familyUuid: string) {
    await trx
      .updateTable(TABLE_NAME)
      .set({ revoked_at: new Date() })
      .where('family_uuid', '=', familyUuid)
      .where('revoked_at', 'is', null)
      .execute();
  }

  /**
   * Revoga todos os tokens ainda ativos da credencial (ex.: `client_secret` regenerado).
   *
   * @param params.accountUuid - `service_account`
   * @param params.trx - transação corrente (padrão: conexão direta)
   */
  static async revokeAllForAccount({ accountUuid, trx = db }: { accountUuid: string; trx?: tTransactionTrx }) {
    await trx
      .updateTable(TABLE_NAME)
      .set({ revoked_at: new Date() })
      .where('service_account_uuid', '=', accountUuid)
      .where('revoked_at', 'is', null)
      .execute();
  }

  /**
   * Encerra a sessão do token: revoga a família dele. Idempotente: token desconhecido, vencido ou já revogado
   * não gera erro.
   *
   * @param token - refresh token em texto puro
   */
  static async revoke(token: string) {
    await db.transaction().execute(async (trx) => {
      const { row } = await this.findForUpdate(trx, token);
      if (row) {
        await this.revokeFamily(trx, row.family_uuid);
      }
    });
  }
}
