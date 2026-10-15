import type { FastifyInstance } from 'fastify';
import { PlanetController } from '@controllers/planet';
import { eServiceAccountRole } from '@database/db/model';
import * as docs from './docs';

/** Planetas: leitura para `admin` e `viewer`; escrita num subgrupo exclusivo do `admin`. */
export async function planetRoutes(app: FastifyInstance) {
  app.addHook('preParsing', app.requireRole(eServiceAccountRole.admin, eServiceAccountRole.viewer));

  app.get('/', { schema: docs.findAllSchema }, PlanetController.findAll);
  app.post('/search', { schema: docs.searchSchema }, PlanetController.search);
  app.get('/:uuid', { schema: docs.findByIdSchema }, PlanetController.findById);

  await app.register(async (admin) => {
    admin.addHook('preParsing', admin.requireRole(eServiceAccountRole.admin));

    admin.post('/', { schema: docs.createSchema }, PlanetController.create);
    admin.patch('/:uuid', { schema: docs.updateSchema }, PlanetController.update);
    admin.delete('/:uuid', { schema: docs.deleteSchema }, PlanetController.remove);
  });
}
