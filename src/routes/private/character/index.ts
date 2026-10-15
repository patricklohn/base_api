import type { FastifyInstance } from 'fastify';
import { CharacterController } from '@controllers/character';
import { eServiceAccountRole } from '@database/db/model';
import * as docs from './docs';

/** Personagens: leitura para `admin` e `viewer`; escrita num subgrupo exclusivo do `admin`. */
export async function characterRoutes(app: FastifyInstance) {
  app.addHook('preParsing', app.requireRole(eServiceAccountRole.admin, eServiceAccountRole.viewer));

  app.get('/', { schema: docs.findAllSchema }, CharacterController.findAll);
  app.post('/search', { schema: docs.searchSchema }, CharacterController.search);
  app.get('/:uuid', { schema: docs.findByIdSchema }, CharacterController.findById);

  await app.register(async (admin) => {
    admin.addHook('preParsing', admin.requireRole(eServiceAccountRole.admin));

    admin.post('/', { schema: docs.createSchema }, CharacterController.create);
    admin.patch('/:uuid', { schema: docs.updateSchema }, CharacterController.update);
    admin.delete('/:uuid', { schema: docs.deleteSchema }, CharacterController.remove);
  });
}
