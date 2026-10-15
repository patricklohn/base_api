import type { FastifyRequest } from 'fastify';
import type { iAccessTokenPayload, TenantScope } from '@context/tenant';
import type { eServiceAccountRole } from '@database/db/model';

declare module 'fastify' {
  interface FastifyInstance {
    /** Valida o Bearer token, confere a credencial no banco e preenche `request.tenant`. */
    authenticate: (request: FastifyRequest) => Promise<void>;
    /** Cria um hook que permite a request apenas para os roles informados (403 caso contrário). */
    requireRole: (...roles: eServiceAccountRole[]) => (request: FastifyRequest) => Promise<void>;
    jsonSchemaTransform: unknown;
  }

  interface FastifyRequest {
    /** Escopo de tenant da credencial autenticada (somente em rotas privadas). */
    tenant: TenantScope;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: iAccessTokenPayload;
    user: iAccessTokenPayload & {
      iat: number;
      exp: number;
    };
  }
}
