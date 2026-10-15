# Segurança HTTP

Camadas aplicadas a toda request, na ordem do `buildApp` ([src/server/app.ts](../src/server/app.ts)): **Helmet → CORS → rate limit**, todas antes da documentação e das rotas.

## Helmet (security headers)

[src/configs/fastify/helmet.ts](../src/configs/fastify/helmet.ts)

| Header | Valor |
| --- | --- |
| `Content-Security-Policy` | `default-src 'none'; frame-ancestors 'none'` (a API só responde JSON) |
| `Cross-Origin-Resource-Policy` | `same-site` |
| `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`... | defaults do Helmet |

As rotas de documentação (`/docs` e `/documentation`) ficam **sem CSP**, porque a UI usa scripts e estilos inline. Os outros headers continuam valendo nelas. Para uma nova rota que sirva HTML, inclua o prefixo em `DOCS_ROUTE_PREFIXES`.

## CORS

[src/configs/fastify/cors.ts](../src/configs/fastify/cors.ts)

- `ALLOWED_ORIGINS`: origens de navegador permitidas, separadas por vírgula. `*` libera todas. Sem a env, só `http://localhost:3000`.
- Requests sem `Origin` (servidor a servidor, curl, Postman) sempre passam: o CORS só protege navegadores.
- `credentials: true`: o access token vai no header `Authorization: Bearer`, e o cookie `httpOnly` só leva o refresh token para `/auth/refresh` e `/auth/logout` ([auth.md](auth.md)). Com `ALLOWED_ORIGINS=*` as credenciais ficam desligadas, porque liberar cookies para qualquer origem não é seguro: nesse caso o front usa o `refresh_token` do body.
- Origem não permitida: `403 CORS_ORIGIN_NOT_ALLOWED`.

## Rate limit

[src/configs/fastify/rate-limit.ts](../src/configs/fastify/rate-limit.ts)

- Global por IP: `RATE_LIMIT_MAX_REQUESTS` por `RATE_LIMIT_WINDOW_SECONDS` (100 a cada 60 s).
- Login com contador próprio: `RATE_LIMIT_LOGIN_*` (10 a cada 60 s).
- O IP vem de `request.ip`, que depende de `TRUST_PROXY`. Excedeu: `429 RATE_LIMIT_EXCEEDED`.

## Login

- Resposta genérica (`401 INVALID_CREDENTIALS`) para `client_id` inexistente e para secret errado.
- Quando o `client_id` não existe, o login compara com um hash bcrypt dummy de mesmo custo, para o tempo de resposta não revelar se a credencial existe.
- `JWT_SECRET` precisa ter no mínimo 32 caracteres, senão a API não sobe. Gere com `openssl rand -base64 48`.
- Refresh token: só o hash sha256 fica no banco, é rotacionado a cada uso e a reutilização de um token antigo revoga a sessão. Detalhes em [auth.md](auth.md).

## Segredos em log e Sentry

- O Sentry só recebe erros 5xx, com rota, método e IP. O corpo da request **não** é enviado, porque pode conter `client_secret` ou refresh token ([src/configs/sentry/index.ts](../src/configs/sentry/index.ts)).
- O hash do `client_secret` nunca sai da API: o schema de saída de `service_account` não tem essa coluna.

## Auditoria e retenção

- `audit_log` registra toda escrita (criação, edição e remoção de cada recurso, criação e revogação de credencial) com a credencial, o registro, o `request_id` e metadados sem segredos. A tabela só aceita inserts (trigger).
- Remoção é sempre soft delete (`deleted_at`): o registro some das leituras, mas continua no banco.

## Documentação da API

`/docs` (Scalar) e `/documentation` (Swagger UI e spec JSON/YAML) ficam ativos por padrão. Com `NODE_ENV=production` e `DISABLE_DOCS=true` (default), as duas somem (`404`) e a rota raiz responde `docs: null`. A regra fica em `isDocsEnabled` ([src/configs/env/index.ts](../src/configs/env/index.ts)).

## Health checks

| Rota | Uso | Resposta |
| --- | --- | --- |
| `GET /api/v1/health/ping` | liveness: o processo responde | `200` sempre |
| `GET /api/v1/health/ready` | readiness: o banco responde (`select 1`) | `200`, ou `503 DATABASE_UNAVAILABLE` |

Use `ready` no orquestrador (load balancer, Kubernetes) para tirar a instância do ar quando o banco cair, e `ping` para reiniciar o processo travado.
