/**
 * Padrão de commit do projeto (ver .claude/skills/backend-node-pk/references/conventions.md).
 * Descrição em português, por isso a caixa do texto não é validada. O corpo pode ter parágrafos sem quebra de linha.
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', ['feat', 'fix', 'refactor', 'docs', 'test', 'chore', 'ci']],
    'subject-case': [0],
    'header-max-length': [2, 'always', 72],
    'body-max-line-length': [0],
    'footer-max-line-length': [0],
  },
};
