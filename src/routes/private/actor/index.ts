import type { FastifyInstance } from 'fastify';
import { ActorController } from '@controllers/actor';
import { eServiceAccountRole } from '@database/db/model';
import * as docs from './docs';

/** Atores: leitura para `admin` e `viewer`; escrita num subgrupo exclusivo do `admin`. */
export async function actorRoutes(app: FastifyInstance) {
  app.addHook('preParsing', app.requireRole(eServiceAccountRole.admin, eServiceAccountRole.viewer));

  app.get('/', { schema: docs.findAllSchema }, ActorController.findAll);
  app.post('/search', { schema: docs.searchSchema }, ActorController.search);
  app.get('/:uuid', { schema: docs.findByIdSchema }, ActorController.findById);
  app.get('/:uuid/filmography', { schema: docs.filmographySchema }, ActorController.filmography);

  await app.register(async (admin) => {
    admin.addHook('preParsing', admin.requireRole(eServiceAccountRole.admin));

    admin.post('/', { schema: docs.createSchema }, ActorController.create);
    admin.patch('/:uuid', { schema: docs.updateSchema }, ActorController.update);
    admin.delete('/:uuid', { schema: docs.deleteSchema }, ActorController.remove);
  });
}
