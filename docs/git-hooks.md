# Hooks de Git

Os hooks rodam localmente com [Husky](https://typicode.github.io/husky/) e são instalados pelo script `prepare` a cada `pnpm install`. Eles fazem o papel do CI enquanto ele não existir ([planejamento/README.md](planejamento/README.md)).

| Hook | Arquivo | O que faz |
| --- | --- | --- |
| `pre-commit` | [.husky/pre-commit](../.husky/pre-commit) | Roda o `lint-staged`, que aplica `prettier --write` só nos `.ts` staged e inclui a formatação no commit. |
| `commit-msg` | [.husky/commit-msg](../.husky/commit-msg) | Valida a mensagem com o `commitlint` ([commitlint.config.mjs](../commitlint.config.mjs)). |
| `pre-push` | [.husky/pre-push](../.husky/pre-push) | Roda `typecheck:fast` e `test` (testes unitários, ver [testing.md](testing.md)) em paralelo e, se os dois passarem, `build:fast`. Se algum falhar, mostra a saída dele e cancela o push. |

## Por que o pre-push usa tsgo

O `typecheck:fast` e o `build:fast` usam o **tsgo** (`@typescript/native-preview`, o TypeScript 7 nativo), cerca de 4 vezes mais rápido que o `tsc`. Junto com o paralelismo, o hook caiu de ~8 s para ~3 s.

| Script | Compilador | Onde é usado |
| --- | --- | --- |
| `typecheck:fast`, `build:fast` | tsgo (preview) | só no `pre-push` |
| `typecheck`, `build` | tsc 5.9 | build de produção, CI e referência em caso de dúvida |

O tsgo ainda é preview e fica com versão fixa no `package.json`. Se ele acusar um erro que o `pnpm typecheck` não acusa, o `tsc` é a referência: atualize o tsgo ou, até lá, use `git push --no-verify` naquele push. Quando o TypeScript 7 sair estável, os scripts `:fast` passam a ser os normais.

## Regras do commit-msg

Seguem o padrão de [README-PATTERNS.md](../README-PATTERNS.md#padrão-de-branch-e-commit):

- formato `tipo(escopo): descrição`, com o escopo opcional;
- tipos aceitos: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `ci`;
- título com até 72 caracteres;
- descrição em português, sem validação de caixa, e corpo sem limite de linha.

O nome da branch (`tipo/contexto-da-demanda`) não é validado por hook. Ele é conferido na revisão do PR.

## Exemplos

```bash
git commit -m "adicionando naves"               # barrado: sem tipo
git commit -m "feature: adiciona naves"         # barrado: tipo inválido
git commit -m "feat(starship): adiciona naves"  # aceito
```

## Situações comuns

- **Hooks não rodam depois de clonar:** rode `pnpm install`, que executa o `prepare`. Confira com `git config core.hooksPath`, que deve responder `.husky/_`.
- **Pular os hooks numa emergência:** `git commit --no-verify` ou `git push --no-verify`. Use só em último caso, porque o código entra sem validação.
- **ESLint:** fica fora dos hooks até o projeto ter `eslint.config.js`.
- **Push lento pela interface (VS Code no Windows, GitHub Desktop):** o projeto está no filesystem do WSL, e o Git do Windows rodando o hook atravessa a ponte `\\wsl$`, que é muito lenta. Faça o push pelo terminal do WSL ou pelo VS Code com a extensão WSL. Para medir: `time sh .husky/pre-push`.
