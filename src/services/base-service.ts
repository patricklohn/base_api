// context
import { TenantScope, tTenantTable } from '@context/tenant';

// errors
import { ServiceError } from '@errors/service-error';

// types
import { iPaginationQuery, tColumnOf } from '@/types/generics';

// utils
import { HTTP_STATUS } from '@utils/http-status';
import { Paginator } from '@utils/paginator';

/**
 * Base dos services de tabelas com tenant. Entrega o escopo da request, a listagem paginada
 * e erros padronizados; as queries específicas ficam no service concreto, sempre com `this.scope.where(...)`.
 *
 * @example
 * class ActorService extends BaseService<'actor', tActorColumn> {
 *   constructor(scope: TenantScope) {
 *     super({ table_name: 'actor', scope, columns: ACTOR_COLUMNS });
 *   }
 * }
 */
export abstract class BaseService<TTable extends tTenantTable, TSelected extends tColumnOf<TTable>> {
  protected readonly tableName: TTable;
  protected readonly scope: TenantScope;
  protected readonly columns: readonly TSelected[];
  private readonly paginator: Paginator<TTable, TSelected>;

  /**
   * @param params.table_name - tabela registrada em `TENANT_COLUMNS`
   * @param params.scope - escopo da credencial autenticada (`request.tenant`)
   * @param params.columns - colunas expostas (iguais às do schema de saída do módulo)
   */
  constructor({
    table_name,
    scope,
    columns,
  }: {
    table_name: TTable;
    scope: TenantScope;
    columns: readonly TSelected[];
  }) {
    this.tableName = table_name;
    this.scope = scope;
    this.columns = columns;
    this.paginator = new Paginator(table_name, scope, columns);
  }

  /**
   * Lista registros do tenant com paginação, ordenação e `condition` opcional.
   * Lista vazia retorna `rows: []` (não é erro).
   *
   * @param query - parâmetros validados pelo schema de paginação do módulo
   */
  async paginate(query: iPaginationQuery<tColumnOf<TTable>>) {
    return this.paginator.paginate(query);
  }

  /**
   * Erro padrão de registro inexistente (ou fora do escopo do tenant).
   *
   * @returns `ServiceError` 404 com código `<TABELA>_NOT_FOUND`
   */
  protected notFound(): ServiceError {
    return new ServiceError(
      HTTP_STATUS.not_found,
      `${this.tableName.toUpperCase()}_NOT_FOUND`,
      'Registro não encontrado'
    );
  }
}
