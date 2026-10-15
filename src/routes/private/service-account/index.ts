import type { FastifyInstance } from 'fastify';
import { ServiceAccountController } from '@controllers/service-account';
import { eServiceAccountRole } from '@database/db/model';
import * as docs from './docs';

/** Credenciais da organização: exclusivas do role `admin`. */
export async function serviceAccountRoutes(app: FastifyInstance) {
  app.addHook('preParsing', app.requireRole(eServiceAccountRole.admin));

  app.post('/', { schema: docs.createSchema }, ServiceAccountController.create);
  app.get('/', { schema: docs.findAllSchema }, ServiceAccountController.findAll);
  app.post('/search', { schema: docs.searchSchema }, ServiceAccountController.search);
  app.get('/:uuid', { schema: docs.findByIdSchema }, ServiceAccountController.findById);
  app.post('/:uuid/revoke', { schema: docs.revokeSchema }, ServiceAccountController.revoke);
}
