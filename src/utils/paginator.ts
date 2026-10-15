import type { Expression, ExpressionBuilder, Kysely, Selectable, SqlBool } from 'kysely';

// context
import { TenantScope, tTenantTable } from '@context/tenant';

// sql
import { db } from '@database/db/kysely';

// types
import { DB } from '@database/db/model';
import { iConditionGroup, iPaginatedResult, iPaginationQuery, tColumnOf, tConditionRule } from '@/types/generics';

/**
 * Visão sem tipagem de colunas do banco, usada só para montar queries sobre uma tabela genérica.
 * As colunas aceitas já foram validadas pelas whitelists dos schemas Zod.
 */
type tLooseDB = Record<string, Record<string, unknown>>;
type tLooseExpressionBuilder = ExpressionBuilder<tLooseDB, string>;

/** Linha retornada: apenas as colunas selecionadas da tabela. */
type tPaginatedRow<TTable extends tTenantTable, TSelected extends string> = Pick<
  Selectable<DB[TTable]>,
  Extract<TSelected, keyof Selectable<DB[TTable]>>
>;

/**
 * Converte um nó do `condition` (grupo ou regra) em expressão Kysely.
 * Valores entram como parâmetros (`$1`, `$2`...), nunca concatenados no SQL.
 *
 * @param eb - expression builder da query
 * @param node - grupo `and`/`or` ou regra
 */
function buildCondition(
  eb: tLooseExpressionBuilder,
  node: iConditionGroup<string> | tConditionRule<string>
): Expression<SqlBool> {
  if ('conditions' in node) {
    const expressions = node.conditions.map((child) => buildCondition(eb, child));
    return node.type === 'and' ? eb.and(expressions) : eb.or(expressions);
  }

  if ('compare_column' in node) {
    return eb(eb.ref(node.column), node.operator, eb.ref(node.compare_column));
  }

  return eb(eb.ref(node.column), node.operator, node.value);
}

/**
 * Listagem paginada com filtros dinâmicos, sempre restrita ao escopo de tenant.
 *
 * - Ordena por `order_by_column` e desempata por `uuid` (uuidv7), mantendo as páginas estáveis.
 * - Executa a página e o `count(*)` em paralelo sobre os mesmos filtros.
 *
 * @example
 * const paginator = new Paginator('actor', scope, ['uuid', 'name']);
 * const { rows, pagination } = await paginator.paginate({ page: 1, limit: 20, order_by_column: 'name', order_by: 'asc' });
 */
export class Paginator<TTable extends tTenantTable, TSelected extends tColumnOf<TTable>> {
  /**
   * @param table - tabela registrada em `TENANT_COLUMNS`
   * @param scope - escopo da credencial autenticada
   * @param columns - colunas retornadas em cada linha (iguais às do schema de saída)
   */
  constructor(
    private readonly table: TTable,
    private readonly scope: TenantScope,
    private readonly columns: readonly TSelected[]
  ) {}

  /**
   * Busca uma página de registros.
   *
   * @param query - página, limite, ordenação e `condition` opcional (já validados pelo Zod)
   * @returns linhas da página e metadados de paginação
   */
  async paginate(
    query: iPaginationQuery<tColumnOf<TTable>>
  ): Promise<iPaginatedResult<tPaginatedRow<TTable, TSelected>>> {
    const { page, limit, order_by_column, order_by, condition } = query;
    const looseDb = db as unknown as Kysely<tLooseDB>;

    let baseQuery = looseDb.selectFrom(this.table as string).where(this.scope.where(this.table));

    if (condition) {
      baseQuery = baseQuery.where((eb) => buildCondition(eb, condition));
    }

    let rowsQuery = baseQuery
      .select(this.columns)
      .orderBy(order_by_column, order_by)
      .limit(limit)
      .offset((page - 1) * limit);

    if (order_by_column !== 'uuid') {
      rowsQuery = rowsQuery.orderBy('uuid', order_by);
    }

    const [rows, count] = await Promise.all([
      rowsQuery.execute(),
      baseQuery.select((eb) => eb.fn.countAll<string>().as('total')).executeTakeFirstOrThrow(),
    ]);

    const total = Number(count.total);

    return {
      rows: rows as unknown as tPaginatedRow<TTable, TSelected>[],
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    };
  }
}
