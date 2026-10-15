import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import cookie, { type CookieSerializeOptions } from '@fastify/cookie';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { Env } from '@configs/env';

// context
import type { TenantScope } from '@context/tenant';

// errors
import { ServiceError } from '@errors/service-error';

// service
import { AuthService } from '@services/auth';

// types
import { eServiceAccountRole } from '@database/db/model';

// Utils
import { HTTP_STATUS } from '@/utils';

/** Nome do cookie `httpOnly` que leva o refresh token para clientes de navegador. */
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

/**
 * Opções do cookie do refresh token: inacessível ao JavaScript, só em HTTPS fora do desenvolvimento, nunca enviado
 * por outro site e restrito às rotas de auth.
 */
export const refreshTokenCookieOptions: CookieSerializeOptions = {
  httpOnly: true,
  secure: Env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api/v1/auth',
};

/**
 * Registra o cookie (refresh token), o JWT e os decorators de autorização:
 * - `app.authenticate`: hook `preParsing` das rotas privadas; preenche `request.tenant`.
 * - `app.requireRole(...roles)`: hook `preParsing` que restringe um grupo de rotas (ou uma rota) a determinados roles.
 *
 * `preParsing` (e não `onRequest`) garante que o rate limit da rota rode antes da autenticação.
 *
 * @example
 * app.addHook('preParsing', app.authenticate);
 * app.addHook('preParsing', app.requireRole(eServiceAccountRole.admin, eServiceAccountRole.viewer));
 * app.register(async (admin) => admin.addHook('preParsing', admin.requireRole(eServiceAccountRole.admin)));
 */
export const authPlugin = fp(async (app: FastifyInstance) => {
  await app.register(cookie);

  await app.register(jwt, {
    secret: Env.JWT_SECRET,
    sign: {
      expiresIn: Env.JWT_EXPIRES_IN,
    },
  });

  // Preenchido por `authenticate`; só é lido em rotas privadas
  app.decorateRequest('tenant', null as unknown as TenantScope);

  app.decorate('authenticate', async (request: FastifyRequest) => {
    try {
      await request.jwtVerify();
    } catch {
      throw new ServiceError(HTTP_STATUS.unauthorized, 'UNAUTHORIZED_TOKEN', 'Token inválido ou expirado');
    }

    const scope = await AuthService.resolveScope(request.user.sub, String(request.id));

    if (!scope) {
      throw new ServiceError(HTTP_STATUS.unauthorized, 'UNAUTHORIZED_TOKEN', 'Credencial revogada ou inativa');
    }

    request.tenant = scope;
  });

  app.decorate('requireRole', (...roles: eServiceAccountRole[]) => async (request: FastifyRequest) => {
    if (!roles.includes(request.tenant.role)) {
      throw new ServiceError(HTTP_STATUS.forbidden, 'FORBIDDEN_ROLE', 'Credencial sem permissão para este recurso');
    }
  });
});
