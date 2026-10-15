# Planejamento e próximos passos

Esta pasta guarda **planos**: o que ainda não existe no código. A documentação do que já funciona fica em `docs/` (ex.: [../pagination.md](../pagination.md)).
Quando um plano for concluído, a parte que descreve o comportamento vira doc em `docs/` e o arquivo ganha o sufixo `-finally` (ex.: `01-git-actions-finally.md`), que fica como registro.

## Ordem recomendada

| # | Assunto | Status | Por que nesta posição |
| --- | --- | --- | --- |
| 1 | CI de Pull Requests (GitHub Actions: typecheck, testes unitários e de integração com Postgres de serviço, build) | Ideia | Mais barato e protege todos os passos seguintes. Hoje o papel é feito pelos hooks locais ([../git-hooks.md](../git-hooks.md)); a remoção de branch mergeada já existe. |
| 2 | ESLint 10 com `eslint.config.js` (flat config) | Ideia | `pnpm lint` está quebrado desde a migração para o ESLint 10; as regras do `.eslintrc.json` precisam ser portadas. |
| 3 | Limpeza de refresh tokens vencidos ou revogados | Ideia | A tabela `refresh_token` só cresce. Uma job (ou rotina no login) apaga as linhas antigas. |
| 4 | Módulos opcionais: upload (`@fastify/multipart`) e jobs agendadas com trava no Postgres | Ideia | Existem no `nota_stack_api`; entram aqui quando um backend derivado precisar. |
| 5 | Deploy (Dockerfile de produção, `instrument.ts` do Sentry via `node --import`, migrations no pipeline) | Futuro | Depende do CI e da escolha de infraestrutura. |

## Convenções desta pasta

- Arquivos numerados na ordem de execução (`NN-assunto.md`), cada um com um bloco **Status / Pré-requisitos** no topo. Ao incluir um passo novo, atualize esta tabela.
- Plano concluído: renomeie com o sufixo `-finally`, troque o status para `✅ concluído em AAAA-MM-DD` e atualize os links. Plano parcial não ganha sufixo.
