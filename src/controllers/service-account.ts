import type { FastifyRequest, FastifyReply } from 'fastify';

// schema
import {
  iCreateBodySchema,
  iUuidParamsSchema,
  iListQuerySchema,
  iSearchBodySchema,
} from '@routes/private/service-account/docs';

// service
import { ServiceAccountService } from '@services/service-account';

// utils
import { HTTP_STATUS } from '@utils/http-status';

/** Instancia o service com o escopo de tenant da request. */
const serviceFor = (req: FastifyRequest) => new ServiceAccountService(req.tenant);

const create = async (req: FastifyRequest<{ Body: iCreateBodySchema }>, reply: FastifyReply) => {
  const result = await serviceFor(req).create(req.body);
  return reply.status(HTTP_STATUS.created).send({ success: true, result });
};

const findById = async (req: FastifyRequest<{ Params: iUuidParamsSchema }>, reply: FastifyReply) => {
  const result = await serviceFor(req).findById(req.params.uuid);
  return reply.status(HTTP_STATUS.ok).send({ success: true, result });
};

const findAll = async (req: FastifyRequest<{ Querystring: iListQuerySchema }>, reply: FastifyReply) => {
  const result = await serviceFor(req).paginate(req.query);
  return reply.status(HTTP_STATUS.ok).send({ success: true, result });
};

const search = async (req: FastifyRequest<{ Body: iSearchBodySchema }>, reply: FastifyReply) => {
  const result = await serviceFor(req).paginate(req.body);
  return reply.status(HTTP_STATUS.ok).send({ success: true, result });
};

const revoke = async (req: FastifyRequest<{ Params: iUuidParamsSchema }>, reply: FastifyReply) => {
  const result = await serviceFor(req).revoke(req.params.uuid);
  return reply.status(HTTP_STATUS.ok).send({ success: true, result });
};

export const ServiceAccountController = {
  create,
  findById,
  findAll,
  search,
  revoke,
};
