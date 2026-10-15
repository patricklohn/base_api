import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { api, closeTestApp, createOrganization, createTestApp, login } from '@tests/helpers';

describe('service-account (integração)', () => {
  let app: FastifyInstance;
  let call: ReturnType<ReturnType<typeof api>>;
  let callAsOther: typeof call;
  let adminUuid: string;

  beforeAll(async () => {
    app = await createTestApp();
    const council = await createOrganization('Jedi Council');
    const other = await createOrganization('Mandalore');
    const token = await login(app, council.client_id, council.client_secret);
    call = api(app)(token);
    callAsOther = api(app)(await login(app, other.client_id, other.client_secret));
    adminUuid = (await call('GET', '/auth/me')).json().result.service_account.uuid;
  });

  afterAll(() => closeTestApp(app));

  it('cria um viewer com client_id vwr_ e devolve o secret uma única vez', async () => {
    const response = await call('POST', '/service-account', { name: 'Holocron Web', role: 'viewer' });

    expect(response.statusCode).toBe(201);
    const result = response.json().result;
    expect(result.credentials.client_id).toMatch(/^vwr_/);
    expect(result).not.toHaveProperty('client_secret_hash');

    const read = (await call('GET', `/service-account/${result.uuid}`)).json().result;
    expect(read).not.toHaveProperty('credentials');
  });

  it('viewer não gerencia credenciais (403)', async () => {
    const { credentials } = (await call('POST', '/service-account', { name: 'Padawan', role: 'viewer' })).json().result;
    const viewer = api(app)(await login(app, credentials.client_id, credentials.client_secret));

    expect((await viewer('GET', '/service-account')).statusCode).toBe(403);
  });

  it('revogar derruba o login e o token na hora', async () => {
    const { uuid, credentials } = (await call('POST', '/service-account', { name: 'Droid', role: 'viewer' })).json()
      .result;
    const token = await login(app, credentials.client_id, credentials.client_secret);

    const revoked = await call('POST', `/service-account/${uuid}/revoke`);
    expect(revoked.json().result.status).toBe('revoked');

    expect((await api(app)(token)('GET', '/actor')).statusCode).toBe(401);
    await expect(login(app, credentials.client_id, credentials.client_secret)).rejects.toThrow('401');
  });

  it('não revoga a si mesma (409) nem credenciais de outra organização (404)', async () => {
    expect((await call('POST', `/service-account/${adminUuid}/revoke`)).statusCode).toBe(409);
    expect((await callAsOther('POST', `/service-account/${adminUuid}/revoke`)).statusCode).toBe(404);
  });

  it('lista com filtro por role', async () => {
    const condition = encodeURIComponent(
      JSON.stringify({ type: 'and', conditions: [{ column: 'role', operator: '=', value: 'admin' }] })
    );
    const rows = (await call('GET', `/service-account?condition=${condition}`)).json().result.rows;

    expect(rows.map((row: { uuid: string }) => row.uuid)).toEqual([adminUuid]);
  });
});
