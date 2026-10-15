import { applyTestEnv, TEST_DB_NAME } from './env';

// DB_HOST/DB_PORT/DB_USER/DB_PASSWORD continuam vindo do .env (Postgres de dev, via pnpm docker:dev)
applyTestEnv({
  DB_NAME: TEST_DB_NAME,
  RATE_LIMIT_MAX_REQUESTS: '10000',
  RATE_LIMIT_LOGIN_MAX_REQUESTS: '10000',
});
