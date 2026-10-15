# Padrões do Projeto

Este arquivo lista todos os padrões que devem ser seguidos ao mexer neste repositório — da estrutura de pastas até o uso de cada tecnologia. É o complemento "sério" do [README.md](README.md), que mantém o tom descontraído.

## Stack fixa

Node 24 (`.nvmrc` + `engines` + `engine-strict`) · pnpm via `packageManager` · TypeScript strict (ES2024) · Fastify 5 · `fastify-type-provider-zod` + Zod 4 · Kysely + `pg` · PostgreSQL 18 (`uuidv7()`) · `@fastify/jwt` · Pino · Sentry · Swagger + Scalar · Vitest.
Não troque nenhuma dessas peças sem uma decisão explícita. Não use Prisma, Knex, TypeORM, Express ou class-validator.

## Estrutura de pastas

Cada pasta em `src/` tem uma responsabilidade única:

| Pasta | Responsabilidade | Pode importar | Não pode |
| --- | --- | --- | --- |
| `server/` | `app.ts` (`buildApp`, ordem dos plugins), `bootstrap.ts` (listen + graceful shutdown), `index.ts` | `configs`, `routes` | regra de negócio |
| `configs/` | setup: `env/`, `db/`, `fastify/*` (auth, helmet, cors, rate-limit, zod, error, logger), `swagger/`, `scalar/`, `sentry/` | `env`, libs | services (exceto o `AuthService` no plugin de auth) |
| `routes/` | `public/` e `private/` (hook `authenticate` no escopo do grupo). Cada módulo tem `index.ts` + `docs/{docs,validation,example,index}.ts` | controllers, `types/schemas` | db, services |
| `controllers/` | adapta HTTP ↔ service: lê `req`, instancia o service com `req.tenant`, escolhe o status, monta o envelope | services, tipos dos schemas | db, regra de negócio |
| `services/` | casos de uso; abre transação; orquestra rules + db + auditoria | db, rules, errors | `FastifyRequest/Reply` |
| `rules/` | invariantes que dependem do banco (duplicidade, registro em uso, referência existente), recebendo `trx` | db (via `trx`), errors | abrir transação própria |
| `context/` | `tenant.ts`: `TenantScope`, `TENANT_COLUMNS`, `iAccessTokenPayload` | model | services |
| `database/` | `db/kysely.ts`, `db/model.ts`, `db/codegen.ts`, `db/migrate*.ts`, `db/seeds.ts`, `migrations/`, `seeds/` | `configs/db` | — |
| `functions/` | CLIs pontuais (`tsx src/functions/<modulo>/<acao>.ts`), com args validados por Zod e `db.destroy()` no `finally` | services | — |
| `errors/` | `ServiceError` | — | — |
| `types/` | augmentations (`fastify.d.ts`), genéricos (`generics.d.ts`) e `schemas/` Zod reutilizáveis (resposta, paginação, documento, schema de cada entidade + `XXX_COLUMNS`) | model | — |
| `utils/` | helpers (`HTTP_STATUS`, `Paginator`, `CpfValidator`/`CnpjValidator`) | db, context | estado global |
| `tests/` | ambiente, setups e helpers dos testes | tudo | — |

Aliases (`tsconfig.paths`): `@/*`, `@configs/*`, `@controllers/*`, `@services/*`, `@rules/*`, `@routes/*`, `@database/*`, `@errors/*`, `@utils/*`, `@context/*`, `@functions/*`, `@types/*`, `@tests/*`. No build, o `tsc-alias` resolve os caminhos.

## Fluxo de uma request

```
routes/<public|private>/<modulo>/index.ts   → registra a rota { schema } + requireRole no grupo
  docs/validation.ts                        → Zod de entrada + interfaces i*
  docs/example.ts                           → envelopes de saída + createPaginationSchemas
  docs/docs.ts                              → objeto schema Fastify (tags, security, body, response)
controllers/<modulo>.ts                     → new XService(req.tenant); status + envelope
services/<modulo>.ts                        → extends BaseService; transação; rules; queries com scope; auditoria
rules/<modulo>.ts                           → invariantes via trx
types/schemas/<entidade>.ts                 → schema da entidade + COLUMNS (fonte única de select e saída)
```

### Ordem dos plugins em `buildApp`

1. Sentry
2. Zod (validator + serializer)
3. **Error handler + not found, antes de qualquer `register`**: cada contexto filho copia o handler do pai no momento do registro.
4. Segurança: helmet → cors → rate-limit (antes do Swagger, para valerem também em `/documentation`)
5. Swagger (antes das rotas, para capturar os schemas)
6. Auth (`authenticate`, `requireRole`, `decorateRequest('tenant')`)
7. Rotas
8. Scalar (depois das rotas)
9. Hook `onResponse` de log (com `disableRequestLogging: true`)

## Convenções de nomenclatura (ESLint aplica isso automaticamente)

| Símbolo | Formato | Exemplo |
| --- | --- | --- |
| variável / função / método | `camelCase` | `findById`, `generateClientId` |
| constante de módulo | `UPPER_CASE` permitido | `TABLE_NAME`, `SALT_ROUNDS`, `HTTP_STATUS` |
| booleano | prefixo `is` / `has` / `should` | `isAdmin`, `is_force_sensitive` |
| classe | `PascalCase` + sufixo da camada | `ActorService`, `ActorRules` |
| interface | prefixo `i` | `iCreateBodySchema`, `iPaginatedResult` |
| type alias | prefixo `t` | `tTenantTable`, `tActorInsertable` |
| enum | prefixo `e` | `eActorStatus`, `eServiceAccountRole` |
| parâmetro | `camelCase` ou `snake_case` (dados do PG) | `table_name`, `organizationUuid` |

- Tabelas, arquivos, classes e tipos sempre **no singular** (`actor`, `ActorService`), mesmo a tabela tendo vários registros.
- Objetos exportados por controller: `export const ActorController = { create, update, ... }`, com o nome do módulo.
- Arquivos em `kebab-case.ts` em `controllers/`, `services/`, `rules/`, `errors/`, com o nome do módulo no singular.
- Imports agrupados com comentário: `// context`, `// rules`, `// schema`, `// sql`, `// service`, `// types`, `// utils`, `// errors`.
- Funções e classes documentadas com JSDoc (o que faz, `@param`, `@returns`, `@throws {ServiceError} <status> <CODE>`, `@example` quando ajuda); sem comentários de histórico de edição.
- Código, nomes, arquivos e códigos de erro em inglês; mensagens ao usuário, comentários e docs em português.

## Padrão de rotas

- Prefixo `/api/v1`. Recurso no singular e em kebab-case: `/actor`, `/service-account`.
- `POST /` cria (201) · `GET /:uuid` lê (200) · `PATCH /:uuid` atualiza parcial (200) · `DELETE /:uuid` faz soft delete (204) · `GET /` lista paginada com querystring · `POST /search` busca com `condition` no body (200). Declare `/search` antes de `/:uuid`.
- Params de id sempre `z.uuid()`. `security: [{ bearerAuth: [] }]` em todo schema de rota privada. `tags` com o nome do módulo, registrada no Swagger.
- `response` inclui o código de sucesso + `...BASE_RESPONSE` (400, 401, 403, 404, 409, 422).
- Cada grupo de rota segue o quarteto `index.ts`, `docs/docs.ts`, `docs/validation.ts`, `docs/example.ts` (+ barrel `docs/index.ts`).

## Padrão de autenticação e tenant

- Credenciais (`client_id` + `client_secret`) ficam em `service_account`, com `role` = `admin` | `viewer`. O JWT carrega `sub`, `role` e `organization_uuid`.
- A cada request a credencial é revalidada no banco e vira `request.tenant` (`TenantScope`). Revogação e bloqueio valem na hora.
- Toda query em tabela de domínio usa o escopo: `.where(this.scope.where('tabela'))` em select/update/delete e `.values(this.scope.values('tabela', data))` em insert. O tenant nunca vem de body/params.
- Registro de outra organização responde **404** (não revela que existe).
- Roles por grupo: `app.addHook('preParsing', app.requireRole(...))`. Escrita restrita a `admin` fica num subgrupo encapsulado:

  ```ts
  app.addHook('preParsing', app.requireRole(eServiceAccountRole.admin, eServiceAccountRole.viewer));
  app.get('/', { schema: docs.findAllSchema }, ActorController.findAll);

  await app.register(async (admin) => {
    admin.addHook('preParsing', admin.requireRole(eServiceAccountRole.admin));
    admin.post('/', { schema: docs.createSchema }, ActorController.create);
  });
  ```

- Hooks de auth em `preParsing` (não `onRequest`), para o rate limit da rota rodar antes.
- No banco: FK composta `(<pai>_uuid, organization_uuid)` impede vínculo cruzado entre organizações.

## Padrão de paginação

`GET /<recurso>` (querystring) e `POST /<recurso>/search` (body) com `page`, `limit` (máx. 100), `order_by_column`, `order_by` e o filtro dinâmico `condition`, sempre com whitelist de colunas por módulo. Ver [docs/pagination.md](docs/pagination.md).

## Padrão de erros

- Erros de domínio lançam `ServiceError(statusCode, code, message)` ([src/errors/service-error.ts](src/errors/service-error.ts)), com `CODE` em `UPPER_SNAKE` prefixado pela entidade: `ACTOR_NOT_FOUND`, `ACTOR_NAME_DUPLICITY`, `PLANET_IN_USE`.
- O handler central ([src/configs/fastify/error.ts](src/configs/fastify/error.ts)) converte qualquer erro no envelope:
  ```json
  { "success": false, "error": { "code": "...", "message": "..." } }
  ```
- 5xx: mensagem genérica ("Internal server error"), logado como `error`, sem stack fora de `NODE_ENV=development`. 4xx: mensagem real, logado como `warn`.
- Erros do PostgreSQL causados pelo input viram 4xx: `23505 → 409`, `23503 → 422`, `23514 → 422`, `22P02/22007/42883 → 400`.

## Padrão de resposta (envelope)

```json
{ "success": true, "result": { ... } }
```

Listagens paginadas: `{ "success": true, "result": { "rows": [...], "pagination": { "page", "limit", "total", "total_pages" } } }`. Lista vazia é 200 com `rows: []`.

O schema de saída usa `success: z.literal(true)` e as colunas do `select`/`returning` vêm de `XXX_COLUMNS`, derivado do schema da entidade: se faltar campo, o serializer quebra com 500.

## Padrão de configuração (env)

- Toda variável de ambiente passa pelo schema Zod em [src/configs/env/index.ts](src/configs/env/index.ts) e é acessada só pelo objeto `Env`, nunca `process.env` direto.
- Variável nova entra no schema **e** no `.env-example` (e em `infra/dev/.env-example`, se o `docker-compose.yml` usar). Variável obrigatória nova entra também em `applyTestEnv` (`src/tests/env.ts`).
- Segredos nunca são commitados. Variável sem uso sai do schema.

## Padrão de banco de dados

- Kysely é o único query builder. **Kysely é imutável:** sempre reatribua (`query = query.where(...)`).
- Tabelas no singular, em `snake_case`. PK `uuid` com `uuidv7()`. Toda tabela tem `created_at`, `updated_at` (trigger `set_updated_at`, nunca pelo código) e `deleted_at` (soft delete).
- Enum de domínio: `varchar` + `CHECK` na migration + `enum eX` no `model.ts`.
- Unicidade de negócio: índice único **parcial** `WHERE deleted_at IS NULL`, com `organization_uuid` como primeira coluna (`<tabela>_<colunas>_unique`).
- Migrations `NN_create_<tabela>_table.ts` (número com dois dígitos), com `up` e `down`. Enquanto o projeto não estiver em produção, mudança em tabela existente vai na migration original; depois, sempre migration nova.
- Depois de mexer em migration: `pnpm migrate:types` e revise o diff do `model.ts`. Tabela nova entra em `REQUIRED_TABLES` do `codegen.ts`.
- Operações com mais de uma escrita, ou check-then-write, rodam em `db.transaction()`, e as rules recebem `trx`.
- Toda escrita de domínio grava em `audit_log` (`AuditLogService.record`, dentro da mesma transação). Nunca grave segredos em `metadata`.
- A escolha entre Postgres local e Supabase (`USES_SUPABASE`) é um exemplo didático de troca de implementação via env flag.

## Criando um módulo novo

Use `actor` como modelo (é o módulo mais completo). Exemplo com `starship`:

1. Migration `src/database/migrations/10_create_starship_table.ts`: `uuid`, `organization_uuid`, campos, CHECKs, timestamps, unique `(uuid, organization_uuid)` se outra tabela for referenciá-la, unique parcial, trigger `updated_at`, `down`.
2. `pnpm migrate:latest && pnpm migrate:types`; inclua a tabela em `REQUIRED_TABLES` e revise o `model.ts` (enums, `tStarshipInsertable/Updatable/Selectable`).
3. Registre a tabela em `TENANT_COLUMNS` (`src/context/tenant.ts`) e em `tAuditEntity` (`src/services/audit-log.ts`).
4. `src/types/schemas/starship.ts`: schema + `STARSHIP_COLUMNS` + `tStarshipColumn`, exportados em `src/types/schemas/index.ts`.
5. `routes/private/starship/docs/`: `validation.ts` (com `satisfies z.ZodType<Insertable/Updateable>`), `example.ts` (`createPaginationSchemas`), `docs.ts` e o barrel.
6. `rules/starship.ts`, `services/starship.ts` (estendendo `BaseService<'starship', tStarshipColumn>`) e `controllers/starship.ts`.
7. `routes/private/starship/index.ts` com `requireRole`, registrado em `routes/private/index.ts`; tag `Starship` no Swagger.
8. Testes: regra pura com unitário ao lado do arquivo e `starship.integration.test.ts` com caminho feliz, **outra organização recebe 404**, `viewer` recebe 403 na escrita, sem token 401, duplicidade 409 e validação 400.
9. `pnpm typecheck && pnpm test && pnpm test:integration`.

## Padrão de branch e commit

Em português, no padrão Conventional Commits:

- **Branch** = a demanda: `tipo/contexto-da-demanda`, em kebab-case e sem acentos (ex.: `feat/crud-de-naves`). Uma branch por demanda, a partir da `main`. Nomes reservados: `main`, `master`, `develop`, `homolog`, `staging`, `production`, `release/*`.
- **Commit** = cada etapa: `tipo(escopo): descrição`, verbo no presente, minúsculo, sem ponto final, até 72 caracteres (ex.: `feat(starship): adiciona rotas de cadastro e listagem`).
- **Tipos:** `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `ci`. **Escopo:** o módulo em kebab-case (`actor`, `auth`, `pagination`, `database`).
- Quebra de contrato: `!` depois do tipo/escopo (`feat(auth)!: exige role no token`).
- O `commitlint` barra mensagens fora do padrão e o `pre-push` roda typecheck, testes unitários e build ([docs/git-hooks.md](docs/git-hooks.md)).

## Padrão de documentação

- `docs/`: documentação do que **já existe**.
- `docs/planejamento/`: planos e próximos passos, numerados na ordem de execução (`NN-assunto.md`). Quando um plano é concluído, o comportamento vira doc em `docs/` e o arquivo ganha o sufixo `-finally`. O README não promete o que o código ainda não entrega.

## Checklist de revisão

- 🔴 Toda query de domínio usa `scope.where`/`scope.values`; o tenant nunca vem do client; outra organização recebe 404; nenhum segredo em log, Sentry ou resposta; filtros só com whitelist.
- 🟠 Colunas do `select` iguais às do schema de saída; escritas múltiplas em transação; unicidade garantida por índice parcial; migration com `down`, trigger e CHECKs; código novo com teste.
- 🟡 Quarteto de arquivos da rota; nomes no padrão; JSDoc; `satisfies` contra o `model.ts`; envelope `{ success, result }`; `Env` no lugar de `process.env`; sem `any` fora de migrations/seeds; sem `console.log` fora de CLIs.
