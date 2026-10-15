import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { api, closeTestApp, createOrganization, createTestApp, login } from '@tests/helpers';

describe('film, casting e filmografia (integração, relação N:N)', () => {
  let app: FastifyInstance;
  let call: ReturnType<ReturnType<typeof api>>;
  let callAsOther: typeof call;
  const ids: Record<string, string> = {};

  const create = async (resource: string, body: object) => {
    const response = await call('POST', `/${resource}`, body);
    expect(response.statusCode).toBe(201);
    return response.json().result.uuid as string;
  };

  beforeAll(async () => {
    app = await createTestApp();
    const lucasfilm = await createOrganization('Lucasfilm');
    const other = await createOrganization('Outra Galáxia');
    call = api(app)(await login(app, lucasfilm.client_id, lucasfilm.client_secret));
    callAsOther = api(app)(await login(app, other.client_id, other.client_secret));

    ids.newHope = await create('film', {
      title: 'A New Hope',
      episode: 4,
      director: 'George Lucas',
      release_date: '1977-05-25',
    });
    ids.empire = await create('film', {
      title: 'The Empire Strikes Back',
      episode: 5,
      director: 'Irvin Kershner',
      release_date: '1980-05-21',
    });
    ids.hamill = await create('actor', { name: 'Mark Hamill' });
    ids.prowse = await create('actor', { name: 'David Prowse' });
    ids.jones = await create('actor', { name: 'James Earl Jones' });
    ids.luke = await create('character', { name: 'Luke Skywalker' });
    ids.vader = await create('character', { name: 'Darth Vader', affiliation: 'sith' });
  });

  afterAll(() => closeTestApp(app));

  describe('film', () => {
    it('exige episode na saga e proíbe nos derivados (400)', async () => {
      const base = { director: 'Gareth Edwards', release_date: '2016-12-16' };

      expect((await call('POST', '/film', { ...base, title: 'Sem episódio' })).statusCode).toBe(400);
      expect(
        (await call('POST', '/film', { ...base, title: 'Rogue One', category: 'anthology', episode: 3 })).statusCode
      ).toBe(400);
      expect((await call('POST', '/film', { ...base, title: 'Rogue One', category: 'anthology' })).statusCode).toBe(
        201
      );
    });

    it('recusa título e episódio repetidos (409)', async () => {
      const base = { director: 'x', release_date: '2000-01-01' };

      const title = await call('POST', '/film', { ...base, title: 'A New Hope', episode: 9 });
      expect(title.json().error.code).toBe('FILM_TITLE_DUPLICITY');

      const episode = await call('POST', '/film', { ...base, title: 'Outro título', episode: 4 });
      expect(episode.json().error.code).toBe('FILM_EPISODE_DUPLICITY');
    });

    it('PATCH que quebra a regra da saga vira 422 pelo CHECK do banco', async () => {
      const response = await call('PATCH', `/film/${ids.empire}`, { category: 'anthology' });

      expect(response.statusCode).toBe(422);
      expect(response.json().error.code).toBe('CHECK_VIOLATION');
    });
  });

  describe('casting', () => {
    it('liga ator, personagem e filme; o mesmo personagem pode ter dois atores (corpo e voz)', async () => {
      ids.castLuke = await create('casting', {
        film_uuid: ids.newHope,
        actor_uuid: ids.hamill,
        character_uuid: ids.luke,
      });
      await create('casting', {
        film_uuid: ids.newHope,
        actor_uuid: ids.prowse,
        character_uuid: ids.vader,
        role_type: 'supporting',
      });
      await create('casting', {
        film_uuid: ids.newHope,
        actor_uuid: ids.jones,
        character_uuid: ids.vader,
        role_type: 'voice',
      });
      await create('casting', { film_uuid: ids.empire, actor_uuid: ids.hamill, character_uuid: ids.luke });
    });

    it('recusa a mesma combinação (409) e referências inexistentes (422)', async () => {
      const duplicated = await call('POST', '/casting', {
        film_uuid: ids.newHope,
        actor_uuid: ids.hamill,
        character_uuid: ids.luke,
      });
      expect(duplicated.statusCode).toBe(409);

      const unknownActor = await call('POST', '/casting', {
        film_uuid: ids.newHope,
        actor_uuid: '01960000-0000-7000-8000-000000000000',
        character_uuid: ids.luke,
      });
      expect(unknownActor.statusCode).toBe(422);
      expect(unknownActor.json().error.code).toBe('CASTING_ACTOR_NOT_FOUND');
    });

    it('detalhe traz filme, ator e personagem resolvidos', async () => {
      const result = (await call('GET', `/casting/${ids.castLuke}`)).json().result;

      expect(result).toMatchObject({
        role_type: 'main',
        film: { uuid: ids.newHope, title: 'A New Hope' },
        actor: { uuid: ids.hamill, name: 'Mark Hamill' },
        character: { uuid: ids.luke, name: 'Luke Skywalker' },
      });
    });

    it('elenco do filme vem com os principais primeiro', async () => {
      const cast = (await call('GET', `/film/${ids.newHope}/cast`)).json().result;

      expect(
        cast.map((item: { role_type: string; actor: { name: string } }) => [item.role_type, item.actor.name])
      ).toEqual([
        ['main', 'Mark Hamill'],
        ['supporting', 'David Prowse'],
        ['voice', 'James Earl Jones'],
      ]);
    });

    it('filmografia do ator vem em ordem de lançamento', async () => {
      const filmography = (await call('GET', `/actor/${ids.hamill}/filmography`)).json().result;

      expect(filmography.map((item: { film: { episode: number } }) => item.film.episode)).toEqual([4, 5]);
      expect(filmography[0]).toMatchObject({
        character: { name: 'Luke Skywalker' },
        film: { release_date: '1977-05-25' },
      });
    });

    it('ator, personagem e filme com elenco não podem ser removidos (409)', async () => {
      expect((await call('DELETE', `/actor/${ids.hamill}`)).json().error.code).toBe('ACTOR_IN_USE');
      expect((await call('DELETE', `/character/${ids.luke}`)).json().error.code).toBe('CHARACTER_IN_USE');
      expect((await call('DELETE', `/film/${ids.newHope}`)).json().error.code).toBe('FILM_IN_USE');
    });

    it('remover a participação libera o ator para remoção', async () => {
      const temp = await create('actor', { name: 'Figurante' });
      const casting = await create('casting', { film_uuid: ids.empire, actor_uuid: temp, character_uuid: ids.vader });

      expect((await call('DELETE', `/casting/${casting}`)).statusCode).toBe(204);
      expect((await call('DELETE', `/actor/${temp}`)).statusCode).toBe(204);
    });

    it('não liga registros de outra organização (422) nem enxerga o elenco dela (404)', async () => {
      const foreignActor = (await callAsOther('POST', '/actor', { name: 'Clone' })).json().result.uuid;

      const response = await call('POST', '/casting', {
        film_uuid: ids.newHope,
        actor_uuid: foreignActor,
        character_uuid: ids.luke,
      });
      expect(response.statusCode).toBe(422);
      expect((await callAsOther('GET', `/casting/${ids.castLuke}`)).statusCode).toBe(404);
      expect((await callAsOther('GET', `/film/${ids.newHope}/cast`)).statusCode).toBe(404);
    });
  });
});
