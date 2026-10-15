import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';

// context
import { TenantScope, iAccessTokenPayload } from '@context/tenant';

// errors
import { ServiceError } from '@errors/service-error';

// rules
import { eRefreshTokenState } from '@rules/refresh-token';

// service
import { SALT_ROUNDS } from '@services/service-account';
import { iIssuedRefreshToken, RefreshTokenService } from '@services/refresh-token';

// sql
import { db, tTransactionTrx } from '@database/db/kysely';

// types
import { eOrganizationStatus, eServiceAccountStatus } from '@database/db/model';

// utils
import { HTTP_STATUS } from '@utils/http-status';

/**
 * Query base das credenciais aptas a autenticar: credencial ativa e organização ativa, ambas sem soft delete.
 */
const activeAccountQuery = (trx: tTransactionTrx = db) =>
  trx
    .selectFrom('service_account')
    .innerJoin('organization', 'organization.uuid', 'service_account.organization_uuid')
    .select(['service_account.uuid', 'service_account.role', 'service_account.organization_uuid'])
    .where('service_account.status', '=', eServiceAccountStatus.active)
    .where('service_account.deleted_at', 'is', null)
    .where('organization.status', '=', eOrganizationStatus.active)
    .where('organization.deleted_at', 'is', null);

let dummyHash: Promise<string> | undefined;

/**
 * Hash bcrypt de um valor aleatório, com o mesmo custo dos `client_secret`. O login compara com ele
 * quando o `client_id` não existe, para o tempo de resposta não revelar se a credencial existe.
 */
const getDummyHash = () => (dummyHash ??= bcrypt.hash(randomUUID(), SALT_ROUNDS));

/** Autenticação das credenciais (`service_account`) das organizações. */
export class AuthService {
  /**
   * Valida `client_id` + `client_secret` e devolve as claims do access token.
   * A resposta de erro é genérica para não revelar se o `client_id` existe.
   *
   * @param params.client_id - identificador público da credencial
   * @param params.client_secret - segredo em texto puro
   * @returns payload a ser assinado no JWT
   * @throws {ServiceError} 401 `INVALID_CREDENTIALS`
   */
  static async login({
    client_id,
    client_secret,
  }: {
    client_id: string;
    client_secret: string;
  }): Promise<iAccessTokenPayload> {
    const account = await activeAccountQuery()
      .select('service_account.client_secret_hash')
      .where('service_account.client_id', '=', client_id)
      .executeTakeFirst();

    const hash = account?.client_secret_hash ?? (await getDummyHash());
    const isValid = await bcrypt.compare(client_secret, hash);

    if (!account || !isValid) {
      throw new ServiceError(HTTP_STATUS.unauthorized, 'INVALID_CREDENTIALS', 'client_id ou client_secret inválidos');
    }

    await db
      .updateTable('service_account')
      .set({ last_used_at: new Date() })
      .where('uuid', '=', account.uuid)
      .execute();

    return { sub: account.uuid, role: account.role, organization_uuid: account.organization_uuid };
  }

  /**
   * Troca um refresh token por um novo par de tokens (rotação). O token usado é revogado e aponta para o sucessor.
   * Reutilizar um token já rotacionado revoga a família inteira; credencial revogada ou inativa também derruba a
   * família. A resposta de erro é sempre a mesma, para não revelar o motivo.
   *
   * @param refreshToken - refresh token em texto puro
   * @returns claims do novo access token e o novo refresh token
   * @throws {ServiceError} 401 `REFRESH_TOKEN_INVALID`
   */
  static async refresh(refreshToken: string): Promise<{ payload: iAccessTokenPayload; refresh: iIssuedRefreshToken }> {
    // Sem throw dentro da transação: a revogação da família precisa ser gravada antes do 401
    const result = await db.transaction().execute(async (trx) => {
      const { row, state } = await RefreshTokenService.findForUpdate(trx, refreshToken);

      if (!row || state !== eRefreshTokenState.active) {
        if (row && state === eRefreshTokenState.reused) {
          await RefreshTokenService.revokeFamily(trx, row.family_uuid);
        }
        return undefined;
      }

      const account = await activeAccountQuery(trx)
        .where('service_account.uuid', '=', row.service_account_uuid)
        .executeTakeFirst();

      if (!account) {
        await RefreshTokenService.revokeFamily(trx, row.family_uuid);
        return undefined;
      }

      const refresh = await RefreshTokenService.issue({ trx, accountUuid: account.uuid, familyUuid: row.family_uuid });
      await RefreshTokenService.markRotated(trx, row.uuid, refresh.uuid);

      const payload: iAccessTokenPayload = {
        sub: account.uuid,
        role: account.role,
        organization_uuid: account.organization_uuid,
      };

      return { payload, refresh };
    });

    if (!result) {
      throw new ServiceError(HTTP_STATUS.unauthorized, 'REFRESH_TOKEN_INVALID', 'Refresh token inválido ou expirado');
    }

    return result;
  }

  /**
   * Monta o escopo de tenant da credencial do token. Consulta o banco a cada request para que
   * revogação ou bloqueio tenham efeito imediato; os dados do banco prevalecem sobre as claims.
   *
   * @param accountUuid - `sub` do token
   * @param requestId - id da request, gravado na auditoria
   * @returns escopo de tenant, ou `undefined` se a credencial não puder mais autenticar
   */
  static async resolveScope(accountUuid: string, requestId?: string): Promise<TenantScope | undefined> {
    const account = await activeAccountQuery().where('service_account.uuid', '=', accountUuid).executeTakeFirst();

    if (!account) {
      return undefined;
    }

    return new TenantScope({
      accountUuid: account.uuid,
      role: account.role,
      organizationUuid: account.organization_uuid,
      requestId,
    });
  }

  /**
   * Dados não sensíveis da credencial autenticada e da organização dela.
   *
   * @param scope - escopo da request
   */
  static async me(scope: TenantScope) {
    const [organization, account] = await Promise.all([
      db
        .selectFrom('organization')
        .select(['uuid', 'name', 'document', 'status'])
        .where('uuid', '=', scope.organizationUuid)
        .executeTakeFirstOrThrow(),
      db
        .selectFrom('service_account')
        .select(['uuid', 'name', 'client_id'])
        .where('uuid', '=', scope.accountUuid)
        .where(scope.where('service_account'))
        .executeTakeFirstOrThrow(),
    ]);

    return { role: scope.role, organization, service_account: account };
  }
}
