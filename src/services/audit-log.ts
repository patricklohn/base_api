// context
import { TenantScope } from '@context/tenant';

// sql
import { db, tTransactionTrx } from '@database/db/kysely';

/** Entidades auditadas. */
export type tAuditEntity = 'service_account' | 'planet' | 'character' | 'actor' | 'film' | 'casting';

/** Ações registradas na auditoria: `<entidade>.<ação>`. */
export type tAuditAction = `${tAuditEntity}.${'create' | 'update' | 'delete'}` | 'service_account.revoke';

/**
 * Auditoria das ações sensíveis: quem (credencial), o quê, em qual registro, quando e com qual `request_id`.
 * A tabela só aceita inserts. Nunca passe segredos em `metadata`.
 */
export class AuditLogService {
  /**
   * Registra uma ação. Use a transação da operação para o registro só existir se ela for confirmada.
   *
   * @param params.trx - transação corrente (ou a conexão, para registrar fora de transação)
   * @param params.scope - credencial autenticada
   * @param params.action - ação
   * @param params.entity - tabela do registro afetado
   * @param params.entityUuid - registro afetado
   * @param params.metadata - dados não sensíveis da ação
   *
   * @example
   * await AuditLogService.record({ trx, scope, action: 'actor.create', entity: 'actor', entityUuid: actor.uuid });
   */
  static async record({
    trx = db,
    scope,
    action,
    entity,
    entityUuid,
    metadata = {},
  }: {
    trx?: tTransactionTrx;
    scope: TenantScope;
    action: tAuditAction;
    entity: tAuditEntity;
    entityUuid?: string;
    metadata?: Record<string, unknown>;
  }) {
    await trx
      .insertInto('audit_log')
      .values({
        organization_uuid: scope.organizationUuid,
        service_account_uuid: scope.accountUuid,
        action,
        entity,
        entity_uuid: entityUuid ?? null,
        request_id: scope.requestId ?? null,
        metadata: JSON.stringify(metadata),
      })
      .execute();
  }
}
