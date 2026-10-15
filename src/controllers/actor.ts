import type { FastifyRequest, FastifyReply } from 'fastify';

// schema
import {
  iCreateBodySchema,
  iUpdateBodySchema,
  iUuidParamsSchema,
  iListQuerySchema,
  iSearchBodySchema,
} from '@routes/private/actor/docs';

// service
import { ActorService } from '@services/actor';

// utils
import { HTTP_STATUS } from '@utils/http-status';

/** Instancia o service com o escopo de tenant da request. */
const serviceFor = (req: FastifyRequest) => new ActorService(req.tenant);

const create = async (req: FastifyRequest<{ Body: iCreateBodySchema }>, reply: FastifyReply) => {
  const result = await serviceFor(req).create(req.body);
  return reply.status(HTTP_STATUS.created).send({ success: true, result });
};

const update = async (
  req: FastifyRequest<{ Body: iUpdateBodySchema; Params: iUuidParamsSchema }>,
  reply: FastifyReply
) => {
  const result = await serviceFor(req).update(req.params.uuid, req.body);
  return reply.status(HTTP_STATUS.ok).send({ success: true, result });
};

const remove = async (req: FastifyRequest<{ Params: iUuidParamsSchema }>, reply: FastifyReply) => {
  await serviceFor(req).remove(req.params.uuid);
  return reply.status(HTTP_STATUS.no_content).send();
};

const findById = async (req: FastifyRequest<{ Params: iUuidParamsSchema }>, reply: FastifyReply) => {
  const result = await serviceFor(req).findById(req.params.uuid);
  return reply.status(HTTP_STATUS.ok).send({ success: true, result });
};

const filmography = async (req: FastifyRequest<{ Params: iUuidParamsSchema }>, reply: FastifyReply) => {
  const result = await serviceFor(req).filmography(req.params.uuid);
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

export const ActorController = {
  create,
  update,
  remove,
  findById,
  filmography,
  findAll,
  search,
};
