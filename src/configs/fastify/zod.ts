import fp from 'fastify-plugin';
import {
  jsonSchemaTransform,
  jsonSchemaTransformObject,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import type { FastifyInstance } from 'fastify';

/**
 * Substitui os validadores de JSON Schema padrão do Fastify pelo Zod.
 * Com este plugin, esquemas de rota definidos com `z.object(...)` funcionam nativamente.
 *
 * Também configura a transformação utilizada pelo @fastify/swagger para ler esquemas do Zod.
 */
export const zodPlugin = fp(async (app: FastifyInstance) => {
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Expoem a transformação para que a configuração do Swagger possa detectá-la.
  app.decorate('jsonSchemaTransform', jsonSchemaTransform);
});

// exporta para uso no Swagger
export { jsonSchemaTransform, jsonSchemaTransformObject };
