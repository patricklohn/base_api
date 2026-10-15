import type { FastifyInstance } from 'fastify';
import { FilmController } from '@controllers/film';
import { eServiceAccountRole } from '@database/db/model';
import * as docs from './docs';

/** Filmes: leitura para `admin` e `viewer`; escrita num subgrupo exclusivo do `admin`. */
export async function filmRoutes(app: FastifyInstance) {
  app.addHook('preParsing', app.requireRole(eServiceAccountRole.admin, eServiceAccountRole.viewer));

  app.get('/', { schema: docs.findAllSchema }, FilmController.findAll);
  app.post('/search', { schema: docs.searchSchema }, FilmController.search);
  app.get('/:uuid', { schema: docs.findByIdSchema }, FilmController.findById);
  app.get('/:uuid/cast', { schema: docs.castSchema }, FilmController.cast);

  await app.register(async (admin) => {
    admin.addHook('preParsing', admin.requireRole(eServiceAccountRole.admin));

    admin.post('/', { schema: docs.createSchema }, FilmController.create);
    admin.patch('/:uuid', { schema: docs.updateSchema }, FilmController.update);
    admin.delete('/:uuid', { schema: docs.deleteSchema }, FilmController.remove);
  });
}
