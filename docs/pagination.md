# Paginação e filtros dinâmicos (`condition`)

Toda listagem da API segue o mesmo contrato, em duas formas equivalentes:

| Forma | Quando usar | Onde vão os parâmetros |
| --- | --- | --- |
| `GET /<recurso>` | Listagens simples, links compartilháveis, filtros curtos | querystring (`condition` como JSON URL-encoded) |
| `POST /<recurso>/search` | Filtros grandes ou aninhados | body JSON (`condition` como objeto) |

Na documentação interativa (`/docs`), o formato completo do filtro aparece em **Models → `ActorCondition`** (e nos equivalentes de cada recurso), já com um exemplo preenchido. Os exemplos usam `/api/v1/actor`. Todas as consultas já são restritas à organização do token: não é preciso, nem possível, filtrar por `organization_uuid`.

| Recurso | Colunas filtráveis | Ordenação (a 1ª é o default) |
| --- | --- | --- |
| `/api/v1/actor` | `uuid`, `name`, `birth_date`, `nationality`, `status`, `created_at`, `updated_at` | `created_at`, `updated_at`, `name`, `birth_date`, `uuid` |
| `/api/v1/character` | `uuid`, `planet_uuid`, `name`, `species`, `affiliation`, `is_force_sensitive`, `created_at`, `updated_at` | `created_at`, `updated_at`, `name`, `species`, `affiliation`, `uuid` |
| `/api/v1/planet` | `uuid`, `name`, `region`, `climate`, `terrain`, `created_at`, `updated_at` | `created_at`, `updated_at`, `name`, `region`, `uuid` |
| `/api/v1/film` | `uuid`, `title`, `category`, `episode`, `director`, `release_date`, `created_at`, `updated_at` | `release_date`, `episode`, `title`, `created_at`, `updated_at`, `uuid` |
| `/api/v1/casting` | `uuid`, `film_uuid`, `actor_uuid`, `character_uuid`, `role_type`, `created_at`, `updated_at` | `created_at`, `updated_at`, `role_type`, `uuid` |
| `/api/v1/service-account` (admin) | `uuid`, `name`, `role`, `client_id`, `status`, `last_used_at`, `created_at` | `created_at`, `name`, `last_used_at`, `uuid` |

---

## 1. Parâmetros

| Campo | Tipo | Default | Regras |
| --- | --- | --- | --- |
| `page` | inteiro | `1` | `>= 1` |
| `limit` | inteiro | `20` | `1` a `100` |
| `order_by_column` | string | 1ª coluna ordenável do recurso | whitelist do recurso |
| `order_by` | `asc` \| `desc` | `desc` | — |
| `condition` | objeto (grupo) | — | opcional; ver seção 2 |

A ordenação sempre desempata por `uuid` (uuidv7, crescente no tempo), então a mesma consulta nunca repete nem pula registros entre páginas.

## 2. Estrutura do `condition`

O `condition` é sempre um **grupo**. Um grupo combina regras e outros grupos com `and` ou `or`:

```jsonc
{
  "type": "and",            // "and" | "or"
  "conditions": [            // 1 ou mais itens: regras e/ou grupos
    { "column": "status", "operator": "=", "value": "active" },
    { "type": "or", "conditions": [ /* ... */ ] }
  ]
}
```

### 2.1 Regras e operadores

| Operadores | Formato do `value` | Exemplo |
| --- | --- | --- |
| `=` `!=` `>` `<` `>=` `<=` | string, número ou boolean | `{ "column": "episode", "operator": "=", "value": 4 }` |
| `like` `not like` `ilike` `not ilike` | string com `%` / `_` | `{ "column": "name", "operator": "ilike", "value": "%skywalker%" }` |
| `in` `not in` | array não vazio (máx. 100) | `{ "column": "status", "operator": "in", "value": ["active", "retired"] }` |
| `is` `is not` | `null` | `{ "column": "birth_date", "operator": "is not", "value": null }` |
| `=` `!=` `>` `<` `>=` `<=` contra outra coluna | `compare_column` no lugar de `value` | `{ "column": "updated_at", "operator": ">", "compare_column": "created_at" }` |

- `ilike` não diferencia maiúsculas de minúsculas, `like` diferencia.
- Datas vão como string ISO 8601: `"2026-10-01"` ou `"2026-10-01T12:00:00Z"`.
- Os valores são enviados como parâmetros do SQL, nunca concatenados.

### 2.2 Limites

| Limite | Valor | Erro |
| --- | --- | --- |
| Níveis de grupo (a raiz conta 1) | 3 | 400 |
| Regras no total | 20 | 400 |
| Itens em `in` / `not in` | 100 | 400 |
| Coluna fora da whitelist, operador incompatível com o `value` ou campo extra | — | 400 |
| Operador incompatível com o tipo da coluna (ex.: `>` em texto vs número inválido) | — | 400 `INVALID_VALUE` / `INVALID_OPERATOR` |

## 3. Exemplos

### 3.1 Sem filtro

```http
GET /api/v1/actor?page=1&limit=20&order_by_column=name&order_by=asc
Authorization: Bearer <token>
```

### 3.2 Um filtro simples

Atores na ativa:

```json
{ "type": "and", "conditions": [{ "column": "status", "operator": "=", "value": "active" }] }
```

GET: o JSON vai URL-encoded no parâmetro `condition`. Com curl, use `-G` + `--data-urlencode`:

```bash
curl -G "http://localhost:3000/api/v1/actor" \
  -H "Authorization: Bearer $TOKEN" \
  --data-urlencode 'limit=50' \
  --data-urlencode 'condition={"type":"and","conditions":[{"column":"status","operator":"=","value":"active"}]}'
```

URL resultante:

```
/api/v1/actor?limit=50&condition=%7B%22type%22%3A%22and%22%2C%22conditions%22%3A%5B%7B%22column%22%3A%22status%22%2C%22operator%22%3A%22%3D%22%2C%22value%22%3A%22active%22%7D%5D%7D
```

No front/SDK:

```ts
const params = new URLSearchParams({ limit: '50', condition: JSON.stringify(condition) });
await fetch(`/api/v1/actor?${params}`, { headers: { Authorization: `Bearer ${token}` } });
```

POST:

```http
POST /api/v1/actor/search
Authorization: Bearer <token>
Content-Type: application/json

{
  "limit": 50,
  "condition": { "type": "and", "conditions": [{ "column": "status", "operator": "=", "value": "active" }] }
}
```

### 3.3 Várias condições (AND)

Atores britânicos nascidos entre 1940 e 1950:

```json
{
  "type": "and",
  "conditions": [
    { "column": "nationality", "operator": "=", "value": "Reino Unido" },
    { "column": "birth_date", "operator": ">=", "value": "1940-01-01" },
    { "column": "birth_date", "operator": "<", "value": "1950-01-01" }
  ]
}
```

### 3.4 Alternativas (OR) dentro de AND

Na ativa **e** (nome contém "hamill" **ou** nascidos antes de 1950):

```json
{
  "type": "and",
  "conditions": [
    { "column": "status", "operator": "=", "value": "active" },
    {
      "type": "or",
      "conditions": [
        { "column": "name", "operator": "ilike", "value": "%hamill%" },
        { "column": "birth_date", "operator": "<", "value": "1950-01-01" }
      ]
    }
  ]
}
```

SQL equivalente (o filtro de tenant é sempre adicionado):

```sql
WHERE (actor.organization_uuid = $1 AND actor.deleted_at IS NULL)
  AND (status = $2 AND (name ILIKE $3 OR birth_date < $4))
```

### 3.5 Exclusões, nulos e comparação entre colunas

Personagens sensíveis à Força que não são Sith, com planeta natal conhecido (`POST /api/v1/character/search`):

```json
{
  "type": "and",
  "conditions": [
    { "column": "is_force_sensitive", "operator": "=", "value": true },
    { "column": "affiliation", "operator": "!=", "value": "sith" },
    { "column": "planet_uuid", "operator": "is not", "value": null }
  ]
}
```

Atores editados depois do cadastro:

```json
{ "type": "and", "conditions": [{ "column": "updated_at", "operator": ">", "compare_column": "created_at" }] }
```

### 3.6 Três níveis (máximo)

Filmes da trilogia original **ou** derivados lançados depois de 2015 (`POST /api/v1/film/search`):

```json
{
  "type": "or",
  "conditions": [
    {
      "type": "and",
      "conditions": [
        { "column": "episode", "operator": ">=", "value": 4 },
        { "column": "episode", "operator": "<=", "value": 6 }
      ]
    },
    {
      "type": "and",
      "conditions": [
        { "column": "category", "operator": "=", "value": "anthology" },
        {
          "type": "or",
          "conditions": [{ "column": "release_date", "operator": ">=", "value": "2015-01-01" }]
        }
      ]
    }
  ]
}
```

## 4. Resposta

```json
{
  "success": true,
  "result": {
    "rows": [
      {
        "uuid": "01a13dbf-5fe3-79b5-93f9-d129b2d6f460",
        "name": "Mark Hamill",
        "birth_date": "1951-09-25",
        "nationality": "Estados Unidos",
        "status": "active",
        "created_at": "2026-10-15T04:08:34.528Z",
        "updated_at": "2026-10-15T04:08:34.528Z"
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 1, "total_pages": 1 }
  }
}
```

Lista vazia retorna `200` com `rows: []` e `total: 0`.

## 5. Erros

```json
{ "success": false, "error": { "code": "FST_ERR_VALIDATION", "message": "body/condition/conditions/0 Invalid input" } }
```

| Situação | Status |
| --- | --- |
| Parâmetro inválido, coluna fora da whitelist, limites excedidos, JSON de `condition` malformado | 400 |
| Token ausente, inválido ou credencial revogada | 401 |
| Role sem acesso ao recurso | 403 |
