// context
import { TenantScope } from '@context/tenant';

// errors
import { ServiceError } from '@errors/service-error';

// utils
import { HTTP_STATUS } from '@utils/http-status';

/** Invariantes das credenciais da organização. */
export class ServiceAccountRules {
  /**
   * @param scope - escopo da credencial autenticada
   */
  constructor(private readonly scope: TenantScope) {}

  /**
   * Impede que a credencial revogue a si mesma (a organização ficaria sem o admin que fez a chamada).
   *
   * @param uuid - credencial alvo
   * @throws {ServiceError} 409 `SERVICE_ACCOUNT_SELF_REVOKE`
   */
  assertIsNotSelf(uuid: string) {
    if (uuid === this.scope.accountUuid) {
      throw new ServiceError(
        HTTP_STATUS.conflict,
        'SERVICE_ACCOUNT_SELF_REVOKE',
        'A credencial autenticada não pode revogar a si mesma'
      );
    }
  }
}
