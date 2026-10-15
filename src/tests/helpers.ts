import type { FastifyInstance, LightMyRequestResponse } from 'fastify';

import { db } from '@database/db/kysely';
import { buildApp } from '@/server/app';
import { OrganizationService } from '@services/organization';

/** App pronto para `inject`. Feche com {@link closeTestApp} no `afterAll`. */
export async function createTestApp() {
  const app = await buildApp();
  await app.ready();
  return app;
}

/** Fecha o app e o pool do banco do arquivo de teste. */
export async function closeTestApp(app: FastifyInstance) {
  await app.close();
  await db.destroy();
}

/** CNPJ numérico aleatório e válido (DVs calculados), para os arquivos de teste não colidirem no banco. */
export function randomCnpj() {
  const digit = (base: number[]) => {
    const weights = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2].slice(13 - base.length);
    const mod = base.reduce((acc, value, index) => acc + value * weights[index], 0) % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const base = [...Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)), 0, 0, 0, 1];
  const dv1 = digit(base);
  return [...base, dv1, digit([...base, dv1])].join('');
}

/**
 * Cadastra uma organização direto pelo service (como o CLI faz) e devolve o uuid e a credencial `admin`.
 *
 * @param name - nome da organização
 * @param document - CPF/CNPJ (padrão: um CNPJ aleatório)
 */
export async function createOrganization(name: string, document: string = randomCnpj()) {
  const { uuid, credentials } = await OrganizationService.register({ name, document });
  return { uuid, client_id: credentials.client_id, client_secret: credentials.client_secret };
}

/** Faz login e devolve o access token. */
export async function login(app: FastifyInstance, client_id: string, client_secret: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { client_id, client_secret },
  });

  if (response.statusCode !== 200) {
    throw new Error(`login falhou (${response.statusCode}): ${response.body}`);
  }

  return response.json().result.access_token as string;
}

/** Cria uma credencial `viewer` pela rota (com o token de um admin) e devolve o access token dela. */
export async function createViewerToken(app: FastifyInstance, adminToken: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/service-account',
    headers: { authorization: `Bearer ${adminToken}` },
    payload: { name: 'Padawan', role: 'viewer' },
  });

  const { client_id, client_secret } = response.json().result.credentials;
  return login(app, client_id, client_secret);
}

/** Atalho de request autenticada: `api(token)('POST', '/actor', body)`. */
export const api =
  (app: FastifyInstance) =>
  (token: string) =>
  (method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, payload?: object): Promise<LightMyRequestResponse> =>
    app.inject({ method, url: `/api/v1${url}`, headers: { authorization: `Bearer ${token}` }, payload });
