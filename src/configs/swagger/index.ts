import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';
import { jsonSchemaTransform, jsonSchemaTransformObject } from '@configs/fastify/zod';

import { Env, isDocsEnabled } from '@configs/env';

export const swaggerPlugin = fp(async (app: FastifyInstance) => {
  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: Env.APP_NAME ?? 'Fastify API',
        description: textDescription,
        version: Env.APP_VERSION ?? '1.0.0',
        // contact: {
        //   name: 'API Support',
        //   email: Env.SUPPORT_EMAIL ?? 'support@example.com',
        // },
      },
      servers: [
        {
          url: `http://localhost:${Env.PORT ?? 3000}`,
          description: 'Local development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      tags: [
        { name: 'Health', description: 'Rotas de teste e usabilidade da API' },
        { name: 'Auth', description: 'Login, refresh token e consulta da credencial' },
        { name: 'Service Account', description: 'Credenciais da organização (role admin)' },
        { name: 'Planet', description: 'Planetas da galáxia (leitura: admin e viewer; escrita: admin)' },
        { name: 'Character', description: 'Personagens e o planeta natal (1:N com Planet)' },
        { name: 'Actor', description: 'Atores e a filmografia (N:N com Film e Character via Casting)' },
        { name: 'Film', description: 'Filmes da saga e o elenco' },
        { name: 'Casting', description: 'Elenco: quem interpretou qual personagem em qual filme' },
      ],
    },
    transform: jsonSchemaTransform,
    // Publica em components.schemas (seção "Models") os schemas Zod registrados com `.meta({ id })`
    transformObject: jsonSchemaTransformObject,
  });

  // Com a documentação desligada (ver isDocsEnabled), a spec continua gerada, mas sem nenhuma rota pública
  if (!isDocsEnabled) {
    return;
  }

  // Expõe /documentation/json e /documentation/yaml para consumo pelo Scalar
  await app.register(swaggerUi, {
    routePrefix: '/documentation',
  });
});

const textDescription = `
Documentação da API gerada automaticamente pelo Fastify/Swagger.

Backend base (padrão backend-node-pk) com autenticação por credenciais, isolamento por organização,
paginação com filtros dinâmicos e um domínio de exemplo do universo Star Wars.

Que a Força esteja com você.
`;
