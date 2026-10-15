import type { FastifyInstance } from 'fastify';
import { AuthController } from '@controllers/auth';
import * as docs from './docs';

/** Rotas da credencial autenticada: disponíveis para todos os roles. */
export async function authPrivateRoutes(app: FastifyInstance) {
  app.get('/me', { schema: docs.meSchema }, AuthController.me);
}
