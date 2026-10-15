import { sql, type Expression, type SqlBool } from 'kysely';

// types
import { DB, eServiceAccountRole } from '@database/db/model';

/**
 * Coluna que identifica a organização dona de cada tabela de domínio.
 *
 * Toda tabela nova com dados de tenant deve ser registrada aqui para poder usar o {@link TenantScope}
 * (e, com ele, o `BaseService` e o `Paginator`).
 */
export const TENANT_COLUMNS = {
  service_account: 'organization_uuid',
  planet: 'organization_uuid',
  character: 'organization_uuid',
  actor: 'organization_uuid',
  film: 'organization_uuid',
  casting: 'organization_uuid',
} as const satisfies { [T in keyof DB]?: keyof DB[T] & string };

export type tTenantTable = keyof typeof TENANT_COLUMNS;

type tTenantColumn<T extends tTenantTable> = (typeof TENANT_COLUMNS)[T];

/** Claims gravadas no access token (JWT) emitido no login. */
export interface iAccessTokenPayload {
  /** uuid da `service_account` autenticada */
  sub: string;
  role: eServiceAccountRole;
  organization_uuid: string;
}

/** Identidade da credencial autenticada, usada para montar o {@link TenantScope}. */
export interface iTenantIdentity {
  accountUuid: string;
  role: eServiceAccountRole;
  organizationUuid: string;
  /** Id da request HTTP (`x-request-id`), gravado na auditoria. */
  requestId?: string;
}

/**
 * Escopo de dados da credencial autenticada. É a única fonte do filtro de tenant:
 * services nunca leem `organization_uuid` de body ou params.
 *
 * Disponível em `request.tenant` nas rotas privadas (preenchido por `app.authenticate`).
 *
 * @example
 * db.selectFrom('actor')
 *   .selectAll()
 *   .where('uuid', '=', uuid)
 *   .where(scope.where('actor'));
 */
export class TenantScope {
  readonly accountUuid: string;
  readonly role: eServiceAccountRole;
  readonly organizationUuid: string;
  readonly requestId: string | undefined;

  /**
   * @param identity - dados da `service_account` autenticada
   */
  constructor(identity: iTenantIdentity) {
    this.accountUuid = identity.accountUuid;
    this.role = identity.role;
    this.organizationUuid = identity.organizationUuid;
    this.requestId = identity.requestId;
  }

  /** `true` quando a credencial pode escrever (role `admin`). */
  get isAdmin(): boolean {
    return this.role === eServiceAccountRole.admin;
  }

  /** `true` quando a credencial é somente leitura (role `viewer`). */
  get isViewer(): boolean {
    return this.role === eServiceAccountRole.viewer;
  }

  /**
   * Monta o filtro de tenant para a tabela: organização da credencial e `deleted_at is null`.
   * Funciona em `select`, `update` e `delete`.
   *
   * As colunas são qualificadas pelo nome da tabela, portanto não use alias na tabela filtrada.
   *
   * @param table - tabela registrada em {@link TENANT_COLUMNS}
   * @returns expressão booleana para `.where(...)`
   */
  where(table: tTenantTable): Expression<SqlBool> {
    const ref = (column: string) => sql.ref(`${table}.${column}`);

    return sql<SqlBool>`(${ref(TENANT_COLUMNS[table])} = ${this.organizationUuid} and ${ref('deleted_at')} is null)`;
  }

  /**
   * Injeta a coluna de tenant nos valores de um insert, sobrescrevendo o que vier do client.
   *
   * @param table - tabela registrada em {@link TENANT_COLUMNS}
   * @param data - valores validados vindos da request
   * @returns `data` com a organização preenchida
   *
   * @example
   * trx.insertInto('actor').values(scope.values('actor', body));
   */
  values<T extends tTenantTable, V extends object>(table: T, data: V): V & Record<tTenantColumn<T>, string> {
    return { ...data, [TENANT_COLUMNS[table]]: this.organizationUuid } as V & Record<tTenantColumn<T>, string>;
  }
}
