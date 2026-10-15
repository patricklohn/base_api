import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { db } from '@database/db/kysely';
import { api, closeTestApp, createOrganization, createTestApp, createViewerToken, login } from '@tests/helpers';

const mark = { name: 'Mark Hamill', birth_date: '1951-09-25', nationality: 'Estados Unidos' };

describe('actor (integração)', () => {
  let app: FastifyInstance;
  let call: ReturnType<ReturnType<typeof api>>;
  let callAsOther: typeof call;
  let callAsViewer: typeof call;
  let organizationUuid: string;
  let markUuid: string;

  beforeAll(async () => {
    app = await createTestApp();
    const rebels = await createOrganization('Rebel Alliance');
    const empire = await createOrganization('Galactic Empire');
    organizationUuid = rebels.uuid;

    const token = await login(app, rebels.client_id, rebels.client_secret);
    call = api(app)(token);
    callAsOther = api(app)(await login(app, empire.client_id, empire.client_secret));
    callAsViewer = api(app)(await createViewerToken(app, token));

    const created = await call('POST', '/actor', {
      ...mark,
      organization_uuid: '00000000-0000-0000-0000-000000000000',
    });
    expect(created.statusCode).toBe(201);
    markUuid = created.json().result.uuid;

    await call('POST', '/actor', { name: 'Carrie Fisher', birth_date: '1956-10-21', status: 'in_memoriam' });
    await call('POST', '/actor', { name: 'Harrison Ford', birth_date: '1942-07-13' });
  });

  afterAll(() => closeTestApp(app));

  describe('cadastro', () => {
    it('ignora o organization_uuid do body e grava na organização do token', async () => {
      const actor = await db
        .selectFrom('actor')
        .select('organization_uuid')
        .where('uuid', '=', markUuid)
        .executeTakeFirst();
      expect(actor?.organization_uuid).toBe(organizationUuid);
    });

    it('devolve o ator com status padrão e sem colunas internas', async () => {
      const result = (await call('GET', `/actor/${markUuid}`)).json().result;

      expect(result).toMatchObject({ ...mark, status: 'active' });
      expect(result).not.toHaveProperty('organization_uuid');
      expect(result).not.toHaveProperty('deleted_at');
    });

    it('recusa nome duplicado na mesma organização (409) e permite em outra', async () => {
      const duplicated = await call('POST', '/actor', mark);
      expect(duplicated.statusCode).toBe(409);
      expect(duplicated.json().error.code).toBe('ACTOR_NAME_DUPLICITY');

      expect((await callAsOther('POST', '/actor', mark)).statusCode).toBe(201);
    });

    it.each([
      ['nome vazio', { name: '' }],
      ['data inválida', { name: 'Ewan McGregor', birth_date: '31/03/1971' }],
      ['status inexistente', { name: 'Ewan McGregor', status: 'jedi' }],
    ])('recusa %s (400)', async (_case, body) => {
      expect((await call('POST', '/actor', body)).statusCode).toBe(400);
    });
  });

  describe('edição e remoção', () => {
    it('atualiza parcialmente e o trigger muda o updated_at', async () => {
      const before = (await call('GET', `/actor/${markUuid}`)).json().result;
      const response = await call('PATCH', `/actor/${markUuid}`, { nationality: 'EUA' });

      expect(response.statusCode).toBe(200);
      expect(response.json().result.nationality).toBe('EUA');
      expect(new Date(response.json().result.updated_at) > new Date(before.updated_at)).toBe(true);
    });

    it('recusa PATCH vazio (400) e nome de outro ator (409)', async () => {
      expect((await call('PATCH', `/actor/${markUuid}`, {})).statusCode).toBe(400);
      expect((await call('PATCH', `/actor/${markUuid}`, { name: 'Harrison Ford' })).statusCode).toBe(409);
    });

    it('remove com soft delete: some das leituras, mas o nome volta a ficar livre', async () => {
      const temp = (await call('POST', '/actor', { name: 'Stormtrooper Extra' })).json().result;

      expect((await call('DELETE', `/actor/${temp.uuid}`)).statusCode).toBe(204);
      expect((await call('GET', `/actor/${temp.uuid}`)).statusCode).toBe(404);
      expect((await call('DELETE', `/actor/${temp.uuid}`)).statusCode).toBe(404);
      expect((await call('POST', '/actor', { name: 'Stormtrooper Extra' })).statusCode).toBe(201);
    });
  });

  describe('isolamento entre organizações', () => {
    it('outra organização recebe 404 ao ler, editar ou remover', async () => {
      expect((await callAsOther('GET', `/actor/${markUuid}`)).statusCode).toBe(404);
      expect((await callAsOther('PATCH', `/actor/${markUuid}`, { name: 'Invasor' })).statusCode).toBe(404);
      expect((await callAsOther('DELETE', `/actor/${markUuid}`)).statusCode).toBe(404);
      expect((await callAsOther('GET', `/actor/${markUuid}/filmography`)).statusCode).toBe(404);
    });

    it('a listagem da outra organização não mostra os atores daqui', async () => {
      const rows = (await callAsOther('GET', '/actor')).json().result.rows as { uuid: string }[];
      expect(rows.some((row) => row.uuid === markUuid)).toBe(false);
    });
  });

  describe('roles', () => {
    it('viewer lê, mas recebe 403 ao escrever', async () => {
      expect((await callAsViewer('GET', `/actor/${markUuid}`)).statusCode).toBe(200);
      expect((await callAsViewer('GET', '/actor')).statusCode).toBe(200);

      const forbidden = await callAsViewer('POST', '/actor', { name: 'Padawan' });
      expect(forbidden.statusCode).toBe(403);
      expect(forbidden.json().error.code).toBe('FORBIDDEN_ROLE');
      expect((await callAsViewer('PATCH', `/actor/${markUuid}`, { name: 'x' })).statusCode).toBe(403);
      expect((await callAsViewer('DELETE', `/actor/${markUuid}`)).statusCode).toBe(403);
    });

    it('sem token responde 401', async () => {
      expect((await app.inject({ url: '/api/v1/actor' })).statusCode).toBe(401);
    });
  });

  describe('paginação', () => {
    it('GET filtra com condition em JSON na querystring', async () => {
      const condition = encodeURIComponent(
        JSON.stringify({ type: 'and', conditions: [{ column: 'status', operator: '=', value: 'in_memoriam' }] })
      );
      const rows = (await call('GET', `/actor?condition=${condition}`)).json().result.rows;

      expect(rows.map((row: { name: string }) => row.name)).toEqual(['Carrie Fisher']);
    });

    it('POST /search aceita grupos aninhados e ordena por data', async () => {
      const response = await call('POST', '/actor/search', {
        order_by_column: 'birth_date',
        order_by: 'asc',
        condition: {
          type: 'or',
          conditions: [
            { column: 'name', operator: 'ilike', value: '%ford%' },
            { column: 'birth_date', operator: '>=', value: '1951-01-01' },
          ],
        },
      });

      expect(response.json().result.rows.map((row: { name: string }) => row.name)).toEqual([
        'Harrison Ford',
        'Mark Hamill',
        'Carrie Fisher',
      ]);
    });

    it('pagina com total correto e recusa coluna fora da whitelist', async () => {
      const page = (await call('GET', '/actor?limit=2&page=1')).json().result;
      expect(page.rows).toHaveLength(2);
      expect(page.pagination).toMatchObject({ page: 1, limit: 2, total: 4, total_pages: 2 });

      const badColumn = await call('POST', '/actor/search', {
        condition: { type: 'and', conditions: [{ column: 'organization_uuid', operator: '=', value: 'x' }] },
      });
      expect(badColumn.statusCode).toBe(400);
    });
  });
});
