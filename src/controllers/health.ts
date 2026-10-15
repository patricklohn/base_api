import type { FastifyRequest, FastifyReply } from 'fastify';
import { HealthService } from '@services/health';
import { HTTP_STATUS } from '@utils/http-status';

const ping = async (_req: FastifyRequest, reply: FastifyReply) => {
  const result = HealthService.ping();
  return reply.status(HTTP_STATUS.ok).send({ success: true, result });
};

const ready = async (_req: FastifyRequest, reply: FastifyReply) => {
  const result = await HealthService.ready();
  return reply.status(HTTP_STATUS.ok).send({ success: true, result });
};

export const HealthController = {
  ping,
  ready,
};
