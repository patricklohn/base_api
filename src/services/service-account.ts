// encrypt
import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';

// context
import { TenantScope } from '@context/tenant';

// errors
import { ServiceError } from '@errors/service-error';

// rules
import { ServiceAccountRules } from '@rules/service-account';

// schema
import { iCreateBodySchema } from '@routes/private/service-account/docs';

// service
import { BaseService } from './base-service';
import { AuditLogService } from './audit-log';
import { RefreshTokenService } from './refresh-token';

// sql
import { db, tTransactionTrx } from '@database/db/kysely';

// types
import { eServiceAccountRole, eServiceAccountStatus } from '@database/db/model';
import { SERVICE_ACCOUNT_COLUMNS, tServiceAccountColumn } from '@/types/schemas';

// utils
import { HTTP_STATUS } from '@utils/http-status';

/** Custo do bcrypt dos `client_secret`. O login usa o mesmo custo no hash dummy. */
export const SALT_ROUNDS = 12;
const TABLE_NAME = 'service_account';

const CLIENT_ID_PREFIX: Record<eServiceAccountRole, string> = {
  [eServiceAccountRole.admin]: 'adm',
  [eServiceAccountRole.viewer]: 'vwr',
};

/** Dados da credencial a criar. */
export interface iServiceAccountOwner {
  organization_uuid: string;
  role: eServiceAccountRole;
  name: string;
}

/** Credencial em texto puro: só existe no retorno da criação/regeneração, nunca é persistida. */
export interface iServiceAccountCredentials {
  uuid: string;
  client_id: string;
  client_secret: string;
}

/**
 * Gestão das credenciais de acesso (`service_account`).
 *
 * - Métodos estáticos: uso interno (CLI, seeds e outros services), sem escopo de request.
 * - Instância: rotas `/service-account`, sempre restritas à organização autenticada.
 */
export class ServiceAccountService extends BaseService<typeof TABLE_NAME, tServiceAccountColumn> {
  private readonly rules: ServiceAccountRules;

  /**
   * @param scope - escopo da credencial autenticada (`request.tenant`)
   */
  constructor(scope: TenantScope) {
    super({ table_name: TABLE_NAME, scope, columns: SERVICE_ACCOUNT_COLUMNS });
    this.rules = new ServiceAccountRules(scope);
  }

  /**
   * Gera o `client_id`, com prefixo do role para facilitar identificação em logs.
   *
   * @param role - role da credencial
   * @returns ex.: `adm_3f9a...` ou `vwr_8c1d...`
   */
  private static generateClientId(role: eServiceAccountRole) {
    return `${CLIENT_ID_PREFIX[role]}_${randomBytes(16).toString('hex')}`;
  }

  /** Gera um `client_secret` aleatório de 256 bits (hex). */
  private static generateClientSecret() {
    return randomBytes(32).toString('hex');
  }

  /**
   * Cria uma credencial para a organização.
   *
   * @param params.trx - transação da operação que criou a organização (ou da rota)
   * @param params.owner - organização, role e nome da credencial
   * @returns credencial com o `client_secret` em texto puro (única vez em que ele é exposto)
   */
  static async createCredentials({
    trx,
    owner,
  }: {
    trx: tTransactionTrx;
    owner: iServiceAccountOwner;
  }): Promise<iServiceAccountCredentials> {
    const client_id = this.generateClientId(owner.role);
    const client_secret = this.generateClientSecret();
    const client_secret_hash = await bcrypt.hash(client_secret, SALT_ROUNDS);

    const account = await trx
      .insertInto(TABLE_NAME)
      .values({ ...owner, client_id, client_secret_hash })
      .returning('uuid')
      .executeTakeFirstOrThrow();

    return { uuid: account.uuid, client_id, client_secret };
  }

  /**
   * Gera um novo `client_secret` para a credencial, revogando o anterior e os refresh tokens dela imediatamente.
   *
   * @param client_id - credencial a ser regenerada
   * @returns credencial com o novo `client_secret` em texto puro
   * @throws {ServiceError} 404 `SERVICE_ACCOUNT_NOT_FOUND`
   */
  static async regenerateSecret(client_id: string): Promise<iServiceAccountCredentials> {
    const client_secret = this.generateClientSecret();
    const client_secret_hash = await bcrypt.hash(client_secret, SALT_ROUNDS);

    const account = await db.transaction().execute(async (trx) => {
      const updated = await trx
        .updateTable(TABLE_NAME)
        .set({ client_secret_hash })
        .where('client_id', '=', client_id)
        .where('status', '=', eServiceAccountStatus.active)
        .where('deleted_at', 'is', null)
        .returning('uuid')
        .executeTakeFirst();

      if (updated) {
        await RefreshTokenService.revokeAllForAccount({ trx, accountUuid: updated.uuid });
      }
      return updated;
    });

    if (!account) {
      throw new ServiceError(HTTP_STATUS.not_found, 'SERVICE_ACCOUNT_NOT_FOUND', 'Credencial não encontrada');
    }

    return { uuid: account.uuid, client_id, client_secret };
  }

  /**
   * Cria uma credencial na organização autenticada (ex.: um `viewer` para o frontend).
   *
   * @param data - nome e role validados do body
   * @returns credencial criada + `client_secret` em texto puro
   */
  async create(data: iCreateBodySchema) {
    return db.transaction().execute(async (trx) => {
      const { uuid, client_id, client_secret } = await ServiceAccountService.createCredentials({
        trx,
        owner: this.scope.values(TABLE_NAME, data),
      });

      await AuditLogService.record({
        trx,
        scope: this.scope,
        action: 'service_account.create',
        entity: TABLE_NAME,
        entityUuid: uuid,
        metadata: { client_id, role: data.role },
      });

      const account = await trx
        .selectFrom(TABLE_NAME)
        .select(this.columns)
        .where('uuid', '=', uuid)
        .executeTakeFirstOrThrow();

      return { ...account, credentials: { client_id, client_secret } };
    });
  }

  /**
   * Consulta uma credencial da organização.
   *
   * @param uuid - credencial a consultar
   * @throws {ServiceError} 404 `SERVICE_ACCOUNT_NOT_FOUND`
   */
  async findById(uuid: string) {
    const account = await db
      .selectFrom(TABLE_NAME)
      .select(this.columns)
      .where('uuid', '=', uuid)
      .where(this.scope.where(TABLE_NAME))
      .executeTakeFirst();

    if (!account) {
      throw this.notFound();
    }

    return account;
  }

  /**
   * Revoga uma credencial da organização: o login e os tokens dela deixam de valer na hora.
   * Idempotente para credenciais já revogadas.
   *
   * @param uuid - credencial a revogar
   * @throws {ServiceError} 404 `SERVICE_ACCOUNT_NOT_FOUND` | 409 `SERVICE_ACCOUNT_SELF_REVOKE`
   */
  async revoke(uuid: string) {
    this.rules.assertIsNotSelf(uuid);

    return db.transaction().execute(async (trx) => {
      const account = await trx
        .updateTable(TABLE_NAME)
        .set({ status: eServiceAccountStatus.revoked })
        .where('uuid', '=', uuid)
        .where(this.scope.where(TABLE_NAME))
        .returning(this.columns)
        .executeTakeFirst();

      if (!account) {
        throw this.notFound();
      }

      await RefreshTokenService.revokeAllForAccount({ trx, accountUuid: account.uuid });
      await AuditLogService.record({
        trx,
        scope: this.scope,
        action: 'service_account.revoke',
        entity: TABLE_NAME,
        entityUuid: account.uuid,
      });

      return account;
    });
  }
}
