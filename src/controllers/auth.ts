import type { FastifyRequest, FastifyReply } from 'fastify';

// env
import { Env } from '@configs/env';
import { REFRESH_TOKEN_COOKIE, refreshTokenCookieOptions } from '@configs/fastify/auth';

// context
import type { iAccessTokenPayload } from '@context/tenant';

// schema
import { iLoginBodySchema, tRefreshTokenBodySchema } from '@routes/public/auth/docs';

// service
import { AuthService } from '@services/auth';
import { iIssuedRefreshToken, RefreshTokenService } from '@services/refresh-token';

// errors
import { ServiceError } from '@errors/service-error';

// utils
import { HTTP_STATUS } from '@utils/http-status';

/**
 * Assina o access token, grava o refresh token no cookie httpOnly e responde o par de tokens.
 *
 * @param reply - resposta da request
 * @param payload - claims do access token
 * @param refresh - refresh token recém-emitido
 */
const sendTokens = async (reply: FastifyReply, payload: iAccessTokenPayload, refresh: iIssuedRefreshToken) => {
  const access_token = await reply.jwtSign(payload);

  reply.setCookie(REFRESH_TOKEN_COOKIE, refresh.refresh_token, {
    ...refreshTokenCookieOptions,
    expires: refresh.expires_at,
  });

  return reply.status(HTTP_STATUS.ok).send({
    success: true,
    result: {
      access_token,
      token_type: 'Bearer',
      expires_in: Env.JWT_EXPIRES_IN,
      refresh_token: refresh.refresh_token,
      refresh_token_expires_at: refresh.expires_at,
      role: payload.role,
    },
  });
};

/** Refresh token do body ou, na falta dele, do cookie httpOnly. */
const refreshTokenOf = (req: FastifyRequest<{ Body: tRefreshTokenBodySchema }>) =>
  req.body?.refresh_token ?? req.cookies[REFRESH_TOKEN_COOKIE];

const login = async (req: FastifyRequest<{ Body: iLoginBodySchema }>, reply: FastifyReply) => {
  const payload = await AuthService.login(req.body);
  const refresh = await RefreshTokenService.issue({ accountUuid: payload.sub });
  return sendTokens(reply, payload, refresh);
};

const refresh = async (req: FastifyRequest<{ Body: tRefreshTokenBodySchema }>, reply: FastifyReply) => {
  const token = refreshTokenOf(req);

  if (!token) {
    throw new ServiceError(HTTP_STATUS.unauthorized, 'REFRESH_TOKEN_INVALID', 'Refresh token inválido ou expirado');
  }

  const result = await AuthService.refresh(token);
  return sendTokens(reply, result.payload, result.refresh);
};

const logout = async (req: FastifyRequest<{ Body: tRefreshTokenBodySchema }>, reply: FastifyReply) => {
  const token = refreshTokenOf(req);

  if (token) {
    await RefreshTokenService.revoke(token);
  }

  reply.clearCookie(REFRESH_TOKEN_COOKIE, refreshTokenCookieOptions);
  return reply.status(HTTP_STATUS.no_content).send();
};

const me = async (req: FastifyRequest, reply: FastifyReply) => {
  const result = await AuthService.me(req.tenant);
  return reply.status(HTTP_STATUS.ok).send({ success: true, result });
};

export const AuthController = {
  login,
  refresh,
  logout,
  me,
};
