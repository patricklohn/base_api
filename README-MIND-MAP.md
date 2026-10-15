# Mapa de usabilidade do sistema

Fluxos atuais de autenticação e acesso da API.

## Autenticação por roles

Todas as credenciais autenticam pelo mesmo endpoint. O role vem da `service_account` e vai no JWT.

```mermaid
flowchart TD
    A["Cliente envia client_id e client_secret<br/>POST /api/v1/auth/login"] --> B{"Body válido (Zod)?"}
    B -- não --> Z1["400 FST_ERR_VALIDATION"]
    B -- sim --> C["AuthService.login()"]
    C --> D{"service_account ativa,<br/>organização ativa<br/>e secret confere?"}
    D -- não --> Z2["401 INVALID_CREDENTIALS"]
    D -- sim --> E["JWT { sub, role, organization_uuid }<br/>+ refresh token"]
    E --> F["200 access_token + refresh_token + role"]
    F --> G["Request com Authorization: Bearer"]
    G --> H["app.authenticate: jwtVerify()"]
    H -- inválido --> Z3["401 UNAUTHORIZED_TOKEN"]
    H -- ok --> I["AuthService.resolveScope(sub)<br/>revalida a credencial no banco"]
    I -- revogada/bloqueada --> Z3
    I -- ok --> J["request.tenant = TenantScope"]
    J --> K{"app.requireRole(...)<br/>role permitido?"}
    K -- não --> Z4["403 FORBIDDEN_ROLE"]
    K -- sim --> L["Controller → Service(req.tenant)"]
    L --> M["Queries com scope.where / scope.values"]
    M --> N{"Registro da organização?"}
    N -- não --> Z5["404 <TABELA>_NOT_FOUND"]
    N -- sim --> O["200/201/204 { success, result }"]
```

## Permissões

| Rota | admin | viewer |
| --- | --- | --- |
| `POST /auth/login`, `/auth/refresh`, `/auth/logout` | ✅ | ✅ |
| `GET /auth/me` | ✅ | ✅ |
| `/service-account` (criar, listar, revogar credenciais) | ✅ | ❌ 403 |
| `GET /<recurso>`, `POST /<recurso>/search`, `GET /<recurso>/:uuid` e as rotas de relação (`/filmography`, `/cast`) | ✅ | ✅ |
| `POST /<recurso>`, `PATCH /<recurso>/:uuid`, `DELETE /<recurso>/:uuid` | ✅ | ❌ 403 |

`<recurso>` = `planet`, `character`, `actor`, `film`, `casting`. Sempre restrito à organização da credencial.

## Cadastro de organização (CLI)

```mermaid
flowchart LR
    A["pnpm function-organization:create --name --document"] --> B["OrganizationService.register()"]
    B --> C["INSERT organization"]
    C --> D["ServiceAccountService.createCredentials(role admin)"]
    D --> E["Exibe client_id + client_secret (uma única vez)"]
    E --> F["Admin cria viewers pela API<br/>POST /api/v1/service-account"]
```

## Relações do domínio de exemplo

```mermaid
flowchart LR
    P["planet"] -- "1:N planeta natal" --> C["character"]
    F["film"] --> K["casting"]
    A["actor"] --> K
    C --> K
    K -- "GET /actor/:uuid/filmography" --> A
    K -- "GET /film/:uuid/cast" --> F
```
