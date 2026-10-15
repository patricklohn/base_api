# Autenticação: access token e refresh token

Credenciais, roles, isolamento por organização e o ciclo dos tokens.

## Credenciais e roles

- Cada organização tem uma ou mais credenciais em `service_account` (`client_id` + hash bcrypt do `client_secret`).
- A primeira (`admin`) nasce com a organização (`pnpm function-organization:create` ou o seed). As demais são criadas pela API: `POST /api/v1/service-account` (só `admin`), e o `client_secret` aparece **uma única vez**, na resposta da criação.
- `client_id` tem o prefixo do role: `adm_...` ou `vwr_...`.

| Role | Pode |
| --- | --- |
| `admin` | ler e escrever todos os recursos da organização e gerenciar as credenciais |
| `viewer` | só ler (`GET` e `POST /search`); escrita responde `403 FORBIDDEN_ROLE` |

- `POST /api/v1/service-account/:uuid/revoke` revoga a credencial: login, access token e refresh tokens dela param de valer na hora (a credencial é revalidada no banco a cada request). A credencial autenticada não pode revogar a si mesma (`409 SERVICE_ACCOUNT_SELF_REVOKE`).
- Organização com `status` diferente de `active` derruba todas as credenciais dela.
- O JWT leva `{ sub, role, organization_uuid }`, mas o banco prevalece sobre as claims: o `TenantScope` é montado com o que está gravado.

## Rotas

| Rota | Autenticação | Faz |
| --- | --- | --- |
| `POST /api/v1/auth/login` | `client_id` + `client_secret` | Devolve o access token (JWT, `JWT_EXPIRES_IN`) e um refresh token (`REFRESH_TOKEN_EXPIRES_DAYS`, padrão 30 dias) |
| `POST /api/v1/auth/refresh` | refresh token | Troca o refresh token por um par novo (rotação) |
| `POST /api/v1/auth/logout` | refresh token | Revoga a sessão e apaga o cookie (`204`, idempotente) |
| `GET /api/v1/auth/me` | access token | Dados da credencial autenticada |

O refresh token vai **no body** (`refresh_token`) e **no cookie** `refresh_token` (`httpOnly`, `SameSite=Strict`, `Secure` em produção, `path=/api/v1/auth`). Em `/refresh` e `/logout` o body tem prioridade e, se não vier, vale o cookie.

```json
{
  "success": true,
  "result": {
    "access_token": "eyJ...",
    "token_type": "Bearer",
    "expires_in": "60m",
    "refresh_token": "q3Jx...",
    "refresh_token_expires_at": "2026-11-14T12:00:00.000Z",
    "role": "admin"
  }
}
```

## Qual cliente usa o quê

- **Sistema (servidor a servidor):** não precisa do refresh token. Quando o access token expira, ele faz login de novo com o `client_secret`, que já guarda. Pode ignorar o campo e o cookie.
- **Frontend no navegador:** a pessoa digita `client_id`/`client_secret` só na tela de login. O front guarda o access token **em memória** e renova com `POST /auth/refresh` usando `credentials: 'include'`, sem body: o cookie `httpOnly` leva o refresh token e o `client_secret` nunca é salvo no navegador. A origem do front precisa estar em `ALLOWED_ORIGINS` (sem `*`, que desliga os cookies; ver [security.md](security.md#cors)).
- **App mobile/desktop:** usa o `refresh_token` do body e guarda no armazenamento seguro do sistema.

Como o cookie é `SameSite=Strict`, ele só é enviado quando o front está no mesmo site da API (ex.: `app.exemplo.com.br` → `api.exemplo.com.br`). Um front em outro domínio usa o `refresh_token` do body.

## Rotação e detecção de roubo

[src/services/auth.ts](../src/services/auth.ts) (`AuthService.refresh`), [src/services/refresh-token.ts](../src/services/refresh-token.ts), [src/rules/refresh-token.ts](../src/rules/refresh-token.ts).

- Tabela `refresh_token`: só o hash sha256 do token é gravado. O valor em texto puro é opaco (384 bits em base64url) e só aparece na resposta.
- Cada login começa uma **família** (`family_uuid`). Cada `/refresh` revoga o token usado, aponta para o sucessor (`replaced_by_uuid`) e emite o novo na mesma família. A linha fica travada (`FOR UPDATE`) durante a troca.
- **Reutilizar** um token já rotacionado revoga a família inteira: não dá para saber se quem chegou primeiro foi o dono ou o ladrão, então os dois precisam fazer login de novo.
- O `/refresh` também confere a credencial no banco (credencial e organização ativas). Credencial inativa revoga a família.
- `pnpm function-service-account:regenerate-secret` e a revogação pela API revoga todos os refresh tokens da credencial.
- Toda falha responde `401 REFRESH_TOKEN_INVALID`, com a mesma mensagem, sem revelar o motivo.

Duas abas do front renovando ao mesmo tempo com o mesmo token disparam a detecção de reutilização. O front deve centralizar a renovação (uma promise compartilhada ou um lock entre abas).

## Pendências

- Limpeza dos tokens vencidos ou revogados (uma job que apaga as linhas antigas): ver [planejamento/README.md](planejamento/README.md).
