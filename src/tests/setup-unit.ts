import { applyTestEnv } from './env';

// Porta 1 recusa conexão na hora: teste unitário que tocar o banco falha rápido em vez de usar o banco de dev
applyTestEnv({
  DB_HOST: '127.0.0.1',
  DB_PORT: '1',
  DB_NAME: 'sem_banco_nos_testes_unitarios',
});
