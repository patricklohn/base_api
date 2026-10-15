import { describe, expect, it } from 'vitest';

import { TenantScope } from '@context/tenant';
import { eServiceAccountRole } from '@database/db/model';

import { ServiceAccountRules } from './service-account';

const rules = new ServiceAccountRules(
  new TenantScope({ accountUuid: 'yoda', role: eServiceAccountRole.admin, organizationUuid: 'jedi-council' })
);

describe('ServiceAccountRules.assertIsNotSelf', () => {
  it('recusa revogar a própria credencial com 409', () => {
    expect(() => rules.assertIsNotSelf('yoda')).toThrowError(
      expect.objectContaining({ statusCode: 409, code: 'SERVICE_ACCOUNT_SELF_REVOKE' })
    );
  });

  it('permite revogar outra credencial', () => {
    expect(() => rules.assertIsNotSelf('dooku')).not.toThrow();
  });
});
