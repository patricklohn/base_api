// types
import { tRefreshTokenSelectable } from '@database/db/model';

/** Situação de um refresh token apresentado em `/auth/refresh` ou `/auth/logout`. */
export enum eRefreshTokenState {
  active = 'active',
  not_found = 'not_found',
  expired = 'expired',
  revoked = 'revoked',
  /** Já foi rotacionado e voltou a ser usado: sinal de roubo, a família inteira é revogada. */
  reused = 'reused',
}

/** Invariantes do refresh token. */
export class RefreshTokenRules {
  /**
   * Classifica o token. A reutilização tem prioridade sobre expiração e revogação para que um token roubado e
   * rotacionado sempre derrube a família, mesmo que já tenha vencido.
   *
   * @param token - registro encontrado pelo hash, ou `undefined`
   * @param now - instante de referência
   * @returns situação do token
   *
   * @example
   * RefreshTokenRules.state(token, new Date()) === eRefreshTokenState.active
   */
  static state(
    token: Pick<tRefreshTokenSelectable, 'expires_at' | 'revoked_at' | 'replaced_by_uuid'> | undefined,
    now: Date
  ): eRefreshTokenState {
    if (!token) {
      return eRefreshTokenState.not_found;
    }
    if (token.replaced_by_uuid) {
      return eRefreshTokenState.reused;
    }
    if (token.revoked_at) {
      return eRefreshTokenState.revoked;
    }
    if (token.expires_at.getTime() <= now.getTime()) {
      return eRefreshTokenState.expired;
    }
    return eRefreshTokenState.active;
  }
}
