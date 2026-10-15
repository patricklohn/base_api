# base_api

Backend base e projeto de portfólio no padrão **backend-node-pk** (o mesmo do `nota_stack_api`), sem core de negócio: autenticação por credenciais, isolamento por organização, paginação com filtros dinâmicos, documentação automática e testes, sobre um domínio de exemplo do universo Star Wars. Serve de ponto de partida para novos backends.

Uma **organização** (`organization`) é o tenant. As credenciais ficam em `service_account` (`client_id`/`client_secret`, `role` = `admin` | `viewer`). O login (`POST /api/v1/auth/login`) emite um JWT com o role e um refresh token rotativo.

| Role | Pode |
| --- | --- |
| `admin` | ler e escrever todos os recursos da organização; criar e revogar credenciais |
| `viewer` | só ler |

Domínio de exemplo (`docs/domain.md`): `planet` 1:N `character`; `actor`, `character` e `film` ligados N:N por `casting`.

## Padrão

Siga [README-PATTERNS.md](../README-PATTERNS.md) em qualquer alteração de código. Para um módulo novo, use `actor` como modelo (seção "Criando um módulo novo").

Neste projeto:
- **Tenant:** `organization_uuid`, sempre via `request.tenant` (`TenantScope`, `src/context/tenant.ts`). Toda tabela de domínio entra em `TENANT_COLUMNS`.
- **Roles:** leitura no grupo com `requireRole(admin, viewer)`; escrita num subgrupo encapsulado com `requireRole(admin)`.
- **Migrations:** o projeto não está em produção, então o banco sobe limpo. Tabela nova ganha migration nova (`NN_create_<tabela>_table.ts`); mudança em tabela existente vai no `createTable` da migration original, **sem** `ALTER TABLE`.
- **Testes:** Vitest (`docs/testing.md`). Código novo vem com teste: unitário ao lado do arquivo e, em rota, integração com outra organização → 404 e `viewer` → 403 na escrita.
- **Fora do escopo por ora:** mudanças no ESLint.
- **Git:** branches e commits em português, Conventional Commits (`README-PATTERNS.md`). Os hooks do Husky validam a mensagem e rodam typecheck, testes e build no push (`docs/git-hooks.md`).

## Comandos

Node 24 (`.nvmrc`, `engine-strict`) e pnpm 11 (`packageManager`): use `nvm use` antes de instalar.

```bash
pnpm docker:dev          # Postgres 18 local (infra/dev)
pnpm migrate:latest && pnpm migrate:seed 1_star_wars
pnpm server:dev          # API em watch (docs em /docs)
pnpm typecheck           # tsc 5.9 (referência); typecheck:fast/build:fast usam tsgo e rodam no pre-push
pnpm test                # unitários, sem banco
pnpm test:integration    # rotas contra banco descartável (base_api_test)
pnpm migrate:types       # depois de mexer em migration: revise o diff do model.ts
pnpm function-organization:create --name "..." --document "..."
pnpm function-service-account:regenerate-secret --client_id "adm_..."
```

Nunca logue nem envie ao Sentry o `client_secret` ou refresh tokens.
