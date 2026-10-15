import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { api, closeTestApp, createOrganization, createTestApp, login } from '@tests/helpers';

describe('planet e character (integração, relação 1:N)', () => {
  let app: FastifyInstance;
  let call: ReturnType<ReturnType<typeof api>>;
  let callAsOther: typeof call;
  let tatooine: { uuid: string };
  let otherPlanet: { uuid: string };

  beforeAll(async () => {
    app = await createTestApp();
    const jedi = await createOrganization('Jedi Order');
    const sith = await createOrganization('Sith Order');
    call = api(app)(await login(app, jedi.client_id, jedi.client_secret));
    callAsOther = api(app)(await login(app, sith.client_id, sith.client_secret));

    tatooine = (await call('POST', '/planet', { name: 'Tatooine', region: 'outer_rim', climate: 'árido' })).json()
      .result;
    otherPlanet = (await callAsOther('POST', '/planet', { name: 'Korriban' })).json().result;
  });

  afterAll(() => closeTestApp(app));

  it('planeta: cria com defaults, recusa nome duplicado e região inválida', async () => {
    const naboo = await call('POST', '/planet', { name: 'Naboo' });
    expect(naboo.statusCode).toBe(201);
    expect(naboo.json().result).toMatchObject({ region: 'unknown_regions', climate: null });

    expect((await call('POST', '/planet', { name: 'Tatooine' })).statusCode).toBe(409);
    expect((await call('POST', '/planet', { name: 'Hoth', region: 'galaxia-distante' })).statusCode).toBe(400);
  });

  it('personagem com planeta natal: o detalhe traz o homeworld resolvido', async () => {
    const luke = (
      await call('POST', '/character', {
        name: 'Luke Skywalker',
        planet_uuid: tatooine.uuid,
        affiliation: 'jedi',
        is_force_sensitive: true,
      })
    ).json().result;

    const detail = (await call('GET', `/character/${luke.uuid}`)).json().result;
    expect(detail).toMatchObject({
      species: 'Human',
      planet_uuid: tatooine.uuid,
      homeworld: { uuid: tatooine.uuid, name: 'Tatooine' },
    });
  });

  it('personagem sem planeta: homeworld nulo', async () => {
    const obiwan = (await call('POST', '/character', { name: 'Obi-Wan Kenobi', affiliation: 'jedi' })).json().result;
    expect((await call('GET', `/character/${obiwan.uuid}`)).json().result.homeworld).toBeNull();
  });

  it('recusa planeta de outra organização ou inexistente (422)', async () => {
    const response = await call('POST', '/character', { name: 'Darth Maul', planet_uuid: otherPlanet.uuid });

    expect(response.statusCode).toBe(422);
    expect(response.json().error.code).toBe('CHARACTER_PLANET_NOT_FOUND');
    expect(
      (await call('POST', '/character', { name: 'Darth Maul', planet_uuid: '01960000-0000-7000-8000-000000000000' }))
        .statusCode
    ).toBe(422);
  });

  it('lista os habitantes de um planeta filtrando por planet_uuid', async () => {
    const condition = { type: 'and', conditions: [{ column: 'planet_uuid', operator: '=', value: tatooine.uuid }] };
    const rows = (await call('POST', '/character/search', { condition })).json().result.rows;

    expect(rows.map((row: { name: string }) => row.name)).toEqual(['Luke Skywalker']);
  });

  it('planeta com habitantes não pode ser removido (409); sem habitantes, sim (204)', async () => {
    const blocked = await call('DELETE', `/planet/${tatooine.uuid}`);
    expect(blocked.statusCode).toBe(409);
    expect(blocked.json().error.code).toBe('PLANET_IN_USE');

    const alderaan = (await call('POST', '/planet', { name: 'Alderaan' })).json().result;
    expect((await call('DELETE', `/planet/${alderaan.uuid}`)).statusCode).toBe(204);
  });

  it('desvincula o planeta com planet_uuid null', async () => {
    const leia = (await call('POST', '/character', { name: 'Leia Organa', planet_uuid: tatooine.uuid })).json().result;
    const response = await call('PATCH', `/character/${leia.uuid}`, { planet_uuid: null });

    expect(response.json().result.planet_uuid).toBeNull();
  });

  it('outra organização recebe 404 no planeta e no personagem', async () => {
    expect((await callAsOther('GET', `/planet/${tatooine.uuid}`)).statusCode).toBe(404);
    expect((await callAsOther('PATCH', `/planet/${tatooine.uuid}`, { name: 'x' })).statusCode).toBe(404);
  });
});
