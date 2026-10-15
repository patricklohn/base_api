import { describe, expect, it } from 'vitest';

import { eRefreshTokenState, RefreshTokenRules } from './refresh-token';

const NOW = new Date('2026-10-15T12:00:00Z');

const token = (overrides: Partial<Parameters<typeof RefreshTokenRules.state>[0]> = {}) => ({
  expires_at: new Date('2026-11-14T12:00:00Z'),
  revoked_at: null,
  replaced_by_uuid: null,
  ...overrides,
});

describe('RefreshTokenRules.state', () => {
  it('token inexistente é not_found', () => {
    expect(RefreshTokenRules.state(undefined, NOW)).toBe(eRefreshTokenState.not_found);
  });

  it('token válido e não revogado é active', () => {
    expect(RefreshTokenRules.state(token(), NOW)).toBe(eRefreshTokenState.active);
  });

  it('token vencido é expired, inclusive no instante exato da expiração', () => {
    expect(RefreshTokenRules.state(token({ expires_at: NOW }), NOW)).toBe(eRefreshTokenState.expired);
  });

  it('token revogado sem sucessor (logout) é revoked', () => {
    expect(RefreshTokenRules.state(token({ revoked_at: NOW }), NOW)).toBe(eRefreshTokenState.revoked);
  });

  it('token rotacionado é reused, mesmo vencido', () => {
    const rotated = token({ revoked_at: NOW, replaced_by_uuid: 'b', expires_at: new Date('2026-01-01T00:00:00Z') });
    expect(RefreshTokenRules.state(rotated, NOW)).toBe(eRefreshTokenState.reused);
  });
});
