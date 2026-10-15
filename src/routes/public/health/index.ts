import type { FastifyInstance } from 'fastify';
import { HealthController } from '@controllers/health';
import * as docs from './docs';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/ping', { schema: docs.pingSchema }, HealthController.ping);
  app.get('/ready', { schema: docs.readySchema }, HealthController.ready);
}
