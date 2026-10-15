import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { Env } from '@/configs/env';

const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } = Env;

if (!DB_USER || !DB_HOST || !DB_PORT || !DB_NAME) {
  console.error('❌ Variáveis de ambiente do banco não encontradas');
  process.exit(1);
}

const DATABASE_URL = `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;

const REQUIRED_TABLES = [
  'organization',
  'service_account',
  'refresh_token',
  'audit_log',
  'planet',
  'character',
  'actor',
  'film',
  'casting',
];
const TABLES = REQUIRED_TABLES.join('|');
const INTERFACE_PREFIX = 'i';
const INDENT = '  ';

const TEMP_FILE = 'src/database/db/model.tmp.ts';
const OUT_FILE = 'src/database/db/model.ts';

console.info('🔄 Gerando models...');

try {
  execSync(`kysely-codegen --dialect=postgres --include-pattern="public.+(${TABLES})" --out-file=${TEMP_FILE}`, {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL },
  });
} catch (err) {
  try {
    rmSync(TEMP_FILE);
  } catch {}
  console.error('❌ Falha ao executar kysely-codegen:', err);
  process.exit(1);
}

const generated = readFileSync(TEMP_FILE, 'utf8');

const missing = REQUIRED_TABLES.filter((t) => !generated.includes(`${t}:`));
if (missing.length > 0) {
  rmSync(TEMP_FILE);
  console.error(`❌ Codegen retornou zero tabelas ou incompleto. Tabelas ausentes: ${missing.join(', ')}`);
  process.exit(1);
}

// ---------- Helpers ----------

function toPascalCase(tableName: string): string {
  return tableName
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
}

function withPrefix(name: string): string {
  return new RegExp(`^${INTERFACE_PREFIX}[A-Z]`).test(name) ? name : `${INTERFACE_PREFIX}${name}`;
}

/** Extrai { fieldName -> tipo (sem ";", sem "?") } de um bloco "export interface X { ... }" */
function extractFieldTypes(blockBody: string): Map<string, { type: string; optional: boolean }> {
  const fields = new Map<string, { type: string; optional: boolean }>();
  blockBody.split('\n').forEach((line) => {
    const m = line.match(/^\s*(\w+)(\??):\s*(.+?);?\s*$/);
    if (m) {
      const [, name, optional, type] = m;
      fields.set(name, { type, optional: optional === '?' });
    }
  });
  return fields;
}

/** Retorna { fullMatch, body, start, end } do bloco de uma interface no texto, ou null se não existir */
function findInterfaceBlock(content: string, name: string) {
  const regex = new RegExp(`export interface ${name} \\{([\\s\\S]*?)\\n\\}`, 'm');
  const match = regex.exec(content);
  if (!match) return null;
  return {
    fullMatch: match[0],
    body: match[1],
    start: match.index,
    end: match.index + match[0].length,
  };
}

/**
 * Faz o patch linha a linha do corpo existente:
 * - campo existente e ainda presente -> mantém a linha exatamente como está (tipo, "?", comentário)
 * - campo existente mas removido no banco -> remove a linha (com aviso)
 * - campo novo -> adiciona no final do bloco
 */
function patchInterfaceBody(
  existingBody: string,
  generatedFields: Map<string, { type: string; optional: boolean }>,
  contextLabel: string
): string {
  const lines = existingBody.split('\n');
  const outLines: string[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const m = line.match(/^(\s*)(\w+)(\??):\s*(.+?);?\s*$/);

    if (!m) {
      if (line.trim() !== '') outLines.push(line);
      continue;
    }

    const fieldName = m[2];

    if (!generatedFields.has(fieldName)) {
      console.warn(`⚠️  [${contextLabel}] Campo "${fieldName}" não existe mais no banco — removido.`);
      continue;
    }

    seen.add(fieldName);
    outLines.push(line); // ignora o gerado: preserva o que foi ajustado à mão
  }

  for (const [fieldName, field] of generatedFields) {
    if (!seen.has(fieldName)) {
      const optionalMark = field.optional ? '?' : '';
      outLines.push(`${INDENT}${fieldName}${optionalMark}: ${field.type}; // TODO: revisar tipo gerado`);
      console.info(`➕ [${contextLabel}] Novo campo "${fieldName}" adicionado.`);
    }
  }

  return outLines.join('\n');
}

// ---------- Fluxo principal ----------

if (!existsSync(OUT_FILE)) {
  // Primeira geração: aplica prefixo e escreve como veio
  let content = generated;

  for (const table of REQUIRED_TABLES) {
    const original = toPascalCase(table);
    const prefixed = withPrefix(original);
    content = content
      .replace(new RegExp(`export interface ${original} \\{`), `export interface ${prefixed} {`)
      .replace(new RegExp(`(\\b${table}:\\s*)${original}\\b`), `$1${prefixed}`);
  }

  writeFileSync(OUT_FILE, content, 'utf8');
  rmSync(TEMP_FILE);
  console.info('✅ model.ts criado pela primeira vez (com prefixo aplicado).');
  process.exit(0);
}

let existingContent = readFileSync(OUT_FILE, 'utf8');

// Extrai as interfaces geradas (com prefixo) e a interface DB gerada
const { interfacesGenerated, dbGenerated } = (() => {
  const interfacesGenerated = new Map<string, Map<string, { type: string; optional: boolean }>>();
  let dbGenerated: Map<string, { type: string; optional: boolean }> | null = null;

  const regex = /export interface (\w+) \{([\s\S]*?)\n\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(generated)) !== null) {
    const [, name, body] = match;
    if (name === 'DB') {
      dbGenerated = extractFieldTypes(body);
    } else {
      interfacesGenerated.set(withPrefix(name), extractFieldTypes(body));
    }
  }

  return { interfacesGenerated, dbGenerated };
})();

// Patch de cada interface de tabela (existente ou nova)
for (const [prefixedName, fields] of interfacesGenerated) {
  const block = findInterfaceBlock(existingContent, prefixedName);

  if (block) {
    const newBody = patchInterfaceBody(block.body, fields, prefixedName);
    const newBlock = `export interface ${prefixedName} {${newBody ? '\n' + newBody : ''}\n}`;
    existingContent = existingContent.slice(0, block.start) + newBlock + existingContent.slice(block.end);
  } else {
    // Tabela nova: insere antes da interface DB (se existir) ou no final do arquivo
    const lines = Array.from(fields.entries()).map(
      ([name, f]) => `${INDENT}${name}${f.optional ? '?' : ''}: ${f.type};`
    );
    const newBlock = `export interface ${prefixedName} {\n${lines.join('\n')}\n}\n\n`;

    const dbBlock = findInterfaceBlock(existingContent, 'DB');
    if (dbBlock) {
      existingContent = existingContent.slice(0, dbBlock.start) + newBlock + existingContent.slice(dbBlock.start);
    } else {
      existingContent = existingContent.trimEnd() + '\n\n' + newBlock;
    }
    console.info(`➕ Nova interface "${prefixedName}" adicionada.`);
  }
}

// Patch da interface DB (referências de tipo também recebem o prefixo)
if (dbGenerated) {
  const dbFieldsFixed = new Map(
    Array.from(dbGenerated.entries()).map(([prop, f]) => [prop, { ...f, type: withPrefix(f.type) }])
  );

  const dbBlock = findInterfaceBlock(existingContent, 'DB');
  if (dbBlock) {
    const newBody = patchInterfaceBody(dbBlock.body, dbFieldsFixed, 'DB');
    const newBlock = `export interface DB {${newBody ? '\n' + newBody : ''}\n}`;
    existingContent = existingContent.slice(0, dbBlock.start) + newBlock + existingContent.slice(dbBlock.end);
  } else {
    const lines = Array.from(dbFieldsFixed.entries()).map(([name, f]) => `${INDENT}${name}: ${f.type};`);
    existingContent = existingContent.trimEnd() + `\n\nexport interface DB {\n${lines.join('\n')}\n}\n`;
  }
}

writeFileSync(OUT_FILE, existingContent, 'utf8');
rmSync(TEMP_FILE);

console.info('✅ model.ts atualizado com sucesso (patch de tipos, ordem manual preservada).');
