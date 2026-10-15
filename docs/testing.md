# Testes

Vitest, com dois projetos definidos em [vitest.config.ts](../vitest.config.ts).

| Comando | Projeto | Precisa de banco | Quando roda |
| --- | --- | --- | --- |
| `pnpm test` | `unit` | não | no `pre-push`, em paralelo com o typecheck ([git-hooks.md](git-hooks.md)) |
| `pnpm test:watch` | `unit` | não | enquanto você desenvolve |
| `pnpm test:integration` | `integration` | sim (`pnpm docker:dev`) | antes de abrir PR que mexa em rota, service ou migration |

## Onde ficam

- Ao lado do arquivo testado: `tenant.ts` → `tenant.test.ts`.
- Testes que usam banco terminam em `.integration.test.ts` e ficam junto da rota (ex.: `src/routes/private/actor/actor.integration.test.ts`).
- Apoio em `src/tests/`: `env.ts` (ambiente fixo), setups de cada projeto, `global-setup-integration.ts` e `helpers.ts` (`createTestApp`, `createOrganization`, `login`, `createViewerToken`, `api` e `randomCnpj`).

## Ambiente

Os setups aplicam valores fixos antes de qualquer import do `Env`: `NODE_ENV=test`, `LOG_LEVEL=silent`, `JWT_SECRET` fictício, `ALLOWED_ORIGINS=http://localhost:3001`. O `.env` local não interfere neles.

- **Unitários:** o banco aponta para `127.0.0.1:1`, que recusa conexão. Um teste unitário que consultar o banco por engano falha na hora, em vez de usar o banco de dev.
- **Integração:** usa host, porta, usuário e senha do `.env`, mas sempre o banco `base_api_test`. O global setup apaga esse banco se existir, cria de novo, roda `pnpm migrate:latest` e o apaga no fim. Os arquivos rodam um de cada vez e compartilham o banco, então cada arquivo cria organizações próprias (`createOrganization` sem documento gera um CNPJ aleatório válido).

## Escrevendo testes

```ts
import { describe, expect, it } from 'vitest';
```

- **Função pura:** importe e teste direto (ex.: `cpf-cnpj-validator.test.ts`).
- **SQL do Kysely sem banco:** compile a query com um `Kysely` de `DummyDriver` (ex.: `tenant.test.ts`).
- **HTTP sem banco:** `buildApp()` + `app.inject(...)` para o que responde antes de consultar o banco: headers, CORS, validação, 401 (ex.: `src/server/app.test.ts`).
- **HTTP com banco:** `createTestApp`, `createOrganization`, `login` e `createViewerToken` de `@tests/helpers`. Feche com `closeTestApp(app)` no `afterAll`.

```ts
const rebels = await createOrganization('Rebel Alliance');
const token = await login(app, rebels.client_id, rebels.client_secret);
const call = api(app)(token);

const created = await call('POST', '/actor', { name: 'Mark Hamill' });
expect(created.statusCode).toBe(201);
```

Toda rota nova deve ter ao menos, na integração: caminho feliz, **outra organização recebe 404**, `viewer` recebe 403 na escrita, sem token 401, duplicidade 409 e validação 400.
