import { buildApp } from './app';
import type { FastifyInstance } from 'fastify';

import { Env } from '@configs/env';

const PORT = Number(Env.PORT ?? 3333);
const HOST = Env.HOST ?? '0.0.0.0';

let app: FastifyInstance;

// ─── Start ────────────────────────────────────────────────────────────────────

export async function start() {
  app = await buildApp();

  try {
    await app.listen({ port: PORT, host: HOST });

    app.log.info('⚡ Inicialização da API concluída com sucesso!');
    app.log.info(`📡 URL Local:      http://localhost:${PORT}`);
    app.log.info(`🌐 Acesso na Rede: http://${HOST}:${PORT}`);
    app.log.info(`📖 Documentação:   http://${HOST}:${PORT}/docs`);
  } catch (err) {
    app.log.error(err, '🚨 Falha ao iniciar o servidor');
    process.exit(1);
  }
}

// ─── Graceful shutdown ────────────────────────────────────────────────────────

async function shutdown(signal: string) {
  if (!app) return process.exit(0);

  app.log.warn(`⚠️  [${signal}] Sinal recebido. Iniciando encerramento seguro...`);

  try {
    await app.close();
    app.log.info('🛑 Servidor finalizou todas as conexões. Até logo!');
    process.exit(0);
  } catch (err) {
    app.log.error(err, '💥 Erro durante o encerramento');
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
