import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { db } from '@database/db/kysely';
import { eOrganizationStatus, eServiceAccountStatus } from '@database/db/model';
import { closeTestApp, createOrganization, createTestApp, login } from '@tests/helpers';

describe('auth (integração)', () => {
  let app: FastifyInstance;
  let organization: Awaited<ReturnType<typeof createOrganization>>;

  beforeAll(async () => {
    app = await createTestApp();
    organization = await createOrganization('Ordem Jedi', '45.723.174/0001-10');
  });

  afterAll(() => closeTestApp(app));

  const postLogin = (payload: object) => app.inject({ method: 'POST', url: '/api/v1/auth/login', payload });

  it('login com credencial válida devolve token com role admin', async () => {
    const response = await postLogin({ client_id: organization.client_id, client_secret: organization.client_secret });

    expect(response.statusCode).toBe(200);
    expect(response.json().result).toMatchObject({ role: 'admin', access_token: expect.any(String) });
  });

  it('secret errado e client_id inexistente recebem o mesmo 401', async () => {
    const wrongSecret = await postLogin({ client_id: organization.client_id, client_secret: 'errado' });
    const unknownId = await postLogin({ client_id: 'int_nao_existe', client_secret: 'errado' });

    expect(wrongSecret.statusCode).toBe(401);
    expect(unknownId.statusCode).toBe(401);
    expect(wrongSecret.json()).toEqual(unknownId.json());
  });

  it('GET /auth/me devolve a organização e a credencial', async () => {
    const token = await login(app, organization.client_id, organization.client_secret);
    const response = await app.inject({ url: '/api/v1/auth/me', headers: { authorization: `Bearer ${token}` } });

    expect(response.statusCode).toBe(200);
    expect(response.json().result).toMatchObject({
      role: 'admin',
      organization: { uuid: organization.uuid, name: 'Ordem Jedi' },
      service_account: { client_id: organization.client_id, name: 'Admin' },
    });
  });

  it('organização bloqueada perde o acesso na hora', async () => {
    const blocked = await createOrganization('Trade Federation', '21.536.433/0001-07');
    const token = await login(app, blocked.client_id, blocked.client_secret);

    await db
      .updateTable('organization')
      .set({ status: eOrganizationStatus.blocked })
      .where('uuid', '=', blocked.uuid)
      .execute();

    const me = await app.inject({ url: '/api/v1/auth/me', headers: { authorization: `Bearer ${token}` } });
    expect(me.statusCode).toBe(401);
  });

  it('credencial revogada perde o acesso na hora, mesmo com token ainda válido', async () => {
    const revoked = await createOrganization('Ordem Sith', '11.444.777/0001-61');
    const token = await login(app, revoked.client_id, revoked.client_secret);

    await db
      .updateTable('service_account')
      .set({ status: eServiceAccountStatus.revoked })
      .where('client_id', '=', revoked.client_id)
      .execute();

    const me = await app.inject({ url: '/api/v1/auth/me', headers: { authorization: `Bearer ${token}` } });
    expect(me.statusCode).toBe(401);

    const relogin = await postLogin({ client_id: revoked.client_id, client_secret: revoked.client_secret });
    expect(relogin.statusCode).toBe(401);
  });

  it('ready responde 200 com o banco disponível', async () => {
    const response = await app.inject('/api/v1/health/ready');
    expect(response.json()).toEqual({ success: true, result: { database: 'up' } });
  });
});
