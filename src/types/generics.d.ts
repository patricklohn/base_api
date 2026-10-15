import { DB } from '@database/db/model';

export type tTableName = keyof DB;
export type tColumnOf<T extends tTableName> = keyof DB[T] & string;

// ─── Filtros dinâmicos (condition) ─────────────────────────────────────────────

export type tComparisonOperator = '=' | '!=' | '>' | '<' | '>=' | '<=';
export type tPatternOperator = 'like' | 'not like' | 'ilike' | 'not ilike';
export type tListOperator = 'in' | 'not in';
export type tNullOperator = 'is' | 'is not';
export type tConditionOperator = tComparisonOperator | tPatternOperator | tListOperator | tNullOperator;
export type tConditionScalar = string | number | boolean;

/** Regra (folha) do filtro: compara uma coluna com um valor ou com outra coluna. */
export type tConditionRule<TColumn extends string> =
  | { column: TColumn; operator: tComparisonOperator; value: tConditionScalar }
  | { column: TColumn; operator: tPatternOperator; value: string }
  | { column: TColumn; operator: tListOperator; value: tConditionScalar[] }
  | { column: TColumn; operator: tNullOperator; value: null }
  | { column: TColumn; operator: tComparisonOperator; compare_column: TColumn };

/** Grupo do filtro: combina regras e outros grupos com `and`/`or`. */
export interface iConditionGroup<TColumn extends string> {
  type: 'and' | 'or';
  conditions: Array<tConditionRule<TColumn> | iConditionGroup<TColumn>>;
}

// ─── Paginação ─────────────────────────────────────────────────────────────────

export type tOrderDirection = 'asc' | 'desc';

/** Parâmetros de listagem paginada (GET querystring ou POST /search body). */
export interface iPaginationQuery<TColumn extends string> {
  page: number;
  limit: number;
  order_by_column: TColumn;
  order_by: tOrderDirection;
  condition?: iConditionGroup<TColumn>;
}

export interface iPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface iPaginatedResult<TRow> {
  rows: TRow[];
  pagination: iPagination;
}
