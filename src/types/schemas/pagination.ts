import { z } from 'zod';
import type {
  iConditionGroup,
  tComparisonOperator,
  tListOperator,
  tNullOperator,
  tPatternOperator,
} from '@/types/generics';

export const PAGINATION_DEFAULT_LIMIT = 20;
export const PAGINATION_MAX_LIMIT = 100;
export const CONDITION_MAX_DEPTH = 3;
export const CONDITION_MAX_RULES = 20;
export const CONDITION_MAX_LIST_VALUES = 100;

export const COMPARISON_OPERATORS = ['=', '!=', '>', '<', '>=', '<='] as const satisfies readonly tComparisonOperator[];
export const PATTERN_OPERATORS = [
  'like',
  'not like',
  'ilike',
  'not ilike',
] as const satisfies readonly tPatternOperator[];
export const LIST_OPERATORS = ['in', 'not in'] as const satisfies readonly tListOperator[];
export const NULL_OPERATORS = ['is', 'is not'] as const satisfies readonly tNullOperator[];

/** Opções de {@link createPaginationSchemas}. */
export interface iPaginationSchemaOptions<TColumn extends string, TRow extends z.ZodObject> {
  /** Prefixo PascalCase dos models no OpenAPI (ex.: `Actor` → `ActorCondition`). */
  name: string;
  /** Schema de saída de cada linha (o mesmo usado pelo endpoint de detalhe). */
  rowSchema: TRow;
  /** Colunas aceitas em `condition` (whitelist; nunca inclua colunas sensíveis). */
  filterableColumns: readonly [TColumn, ...TColumn[]];
  /** Colunas aceitas em `order_by_column`; a primeira é o default. */
  sortableColumns: readonly [TColumn, ...TColumn[]];
  /** Exemplo de `condition` exibido na documentação (use colunas reais do módulo). */
  conditionExample: iConditionGroup<TColumn>;
}

export const paginationSchema = z
  .object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    total: z.number().int().min(0),
    total_pages: z.number().int().min(0),
  })
  .meta({ id: 'Pagination' });

/**
 * Converte o `condition` recebido na querystring (JSON URL-encoded) em objeto.
 * JSON inválido segue como string e é rejeitado pela validação com 400.
 */
const parseJsonQuery = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

/**
 * Mede a profundidade e a quantidade de regras de um grupo, para barrar filtros abusivos.
 *
 * @param group - grupo raiz
 * @param depth - nível atual (raiz = 1)
 */
function measureCondition(group: iConditionGroup<string>, depth = 1): { depth: number; rules: number } {
  return group.conditions.reduce(
    (acc, node) => {
      if ('conditions' in node) {
        const child = measureCondition(node, depth + 1);
        return { depth: Math.max(acc.depth, child.depth), rules: acc.rules + child.rules };
      }
      return { ...acc, rules: acc.rules + 1 };
    },
    { depth, rules: 0 }
  );
}

/**
 * Valida os limites de complexidade do `condition` (profundidade e quantidade de regras).
 * Aplicado no objeto da listagem para manter o schema do grupo como model reutilizável no OpenAPI.
 */
function refineConditionComplexity(data: { condition?: iConditionGroup<string> }, ctx: z.RefinementCtx) {
  if (!data.condition) {
    return;
  }

  const { depth, rules } = measureCondition(data.condition);

  if (depth > CONDITION_MAX_DEPTH) {
    ctx.addIssue({
      code: 'custom',
      path: ['condition'],
      message: `condition aceita no máximo ${CONDITION_MAX_DEPTH} níveis de grupos`,
    });
  }
  if (rules > CONDITION_MAX_RULES) {
    ctx.addIssue({
      code: 'custom',
      path: ['condition'],
      message: `condition aceita no máximo ${CONDITION_MAX_RULES} regras`,
    });
  }
}

/**
 * Cria o schema recursivo de `condition` restrito às colunas permitidas,
 * registrado como model `<name>Condition` no OpenAPI.
 *
 * @param column - enum Zod das colunas filtráveis
 * @param name - prefixo do model
 * @param example - exemplo exibido na documentação
 */
function createConditionSchema<TColumn extends string>(
  column: z.ZodType<TColumn>,
  name: string,
  example: iConditionGroup<TColumn>
): z.ZodType<iConditionGroup<TColumn>> {
  const scalar = z.union([z.string(), z.number(), z.boolean()]);

  const rule = z.union([
    z.strictObject({ column, operator: z.enum(COMPARISON_OPERATORS), value: scalar }),
    z.strictObject({ column, operator: z.enum(PATTERN_OPERATORS), value: z.string() }),
    z.strictObject({
      column,
      operator: z.enum(LIST_OPERATORS),
      value: z.array(scalar).min(1).max(CONDITION_MAX_LIST_VALUES),
    }),
    z.strictObject({ column, operator: z.enum(NULL_OPERATORS), value: z.null() }),
    z.strictObject({ column, operator: z.enum(COMPARISON_OPERATORS), compare_column: column }),
  ]);

  const group: z.ZodType<iConditionGroup<TColumn>> = z
    .lazy(() =>
      z.strictObject({
        type: z.enum(['and', 'or']),
        conditions: z.array(z.union([rule, group])).min(1),
      })
    )
    .meta({
      id: `${name}Condition`,
      description: `Grupo de filtros combinados com and/or (máx. ${CONDITION_MAX_DEPTH} níveis e ${CONDITION_MAX_RULES} regras). Ver docs/pagination.md.`,
      example,
    });

  return group;
}

/**
 * Gera os schemas de listagem paginada de um módulo.
 *
 * @param options - nome dos models, schema da linha, whitelists de colunas e exemplo de `condition`
 * @returns
 * - `listQuerySchema`: querystring do `GET /` (`condition` como JSON URL-encoded)
 * - `searchBodySchema`: body do `POST /search` (`condition` como objeto)
 * - `paginatedResponseSchema`: envelope `{ success, result: { rows, pagination } }`
 *
 * @example
 * export const { listQuerySchema, searchBodySchema, paginatedResponseSchema } = createPaginationSchemas({
 *   name: 'Actor',
 *   rowSchema: actorSchema,
 *   filterableColumns: ['name', 'nationality', 'status'],
 *   sortableColumns: ['created_at', 'name'],
 *   conditionExample: { type: 'and', conditions: [{ column: 'status', operator: '=', value: 'active' }] },
 * });
 */
export function createPaginationSchemas<TColumn extends string, TRow extends z.ZodObject>({
  name,
  rowSchema,
  filterableColumns,
  sortableColumns,
  conditionExample,
}: iPaginationSchemaOptions<TColumn, TRow>) {
  const conditionSchema = createConditionSchema(z.enum(filterableColumns), name, conditionExample);

  const baseQuery = {
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(PAGINATION_MAX_LIMIT).default(PAGINATION_DEFAULT_LIMIT),
    order_by_column: z.enum(sortableColumns).default(sortableColumns[0]),
    order_by: z.enum(['asc', 'desc']).default('desc'),
  };

  const searchBodySchema = z
    .object({
      ...baseQuery,
      condition: conditionSchema.optional(),
    })
    .superRefine(refineConditionComplexity);

  // Na querystring o condition trafega como string JSON; a documentação mostra a string de exemplo
  const listQuerySchema = z
    .object({
      ...baseQuery,
      condition: z
        .string()
        .transform(parseJsonQuery)
        .pipe(conditionSchema)
        .optional()
        .meta({
          description: `JSON URL-encoded no formato do model ${name}Condition (o mesmo do body de POST /search)`,
          example: JSON.stringify(conditionExample),
        }),
    })
    .superRefine(refineConditionComplexity);

  const paginatedResponseSchema = z.object({
    success: z.literal(true),
    result: z.object({
      rows: z.array(rowSchema),
      pagination: paginationSchema,
    }),
  });

  return { listQuerySchema, searchBodySchema, paginatedResponseSchema };
}
