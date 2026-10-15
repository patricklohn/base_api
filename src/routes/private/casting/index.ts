import type { FastifyInstance } from 'fastify';
import { CastingController } from '@controllers/casting';
import { eServiceAccountRole } from '@database/db/model';
import * as docs from './docs';

/** Elenco: leitura para `admin` e `viewer`; escrita num subgrupo exclusivo do `admin`. */
export async function castingRoutes(app: FastifyInstance) {
  app.addHook('preParsing', app.requireRole(eServiceAccountRole.admin, eServiceAccountRole.viewer));

  app.get('/', { schema: docs.findAllSchema }, CastingController.findAll);
  app.post('/search', { schema: docs.searchSchema }, CastingController.search);
  app.get('/:uuid', { schema: docs.findByIdSchema }, CastingController.findById);

  await app.register(async (admin) => {
    admin.addHook('preParsing', admin.requireRole(eServiceAccountRole.admin));

    admin.post('/', { schema: docs.createSchema }, CastingController.create);
    admin.patch('/:uuid', { schema: docs.updateSchema }, CastingController.update);
    admin.delete('/:uuid', { schema: docs.deleteSchema }, CastingController.remove);
  });
}
