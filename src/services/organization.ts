// errors
import { ServiceError } from '@errors/service-error';

// sql
import { db } from '@database/db/kysely';

// service
import { ServiceAccountService } from './service-account';

// types
import { eServiceAccountRole } from '@database/db/model';

// utils
import { HTTP_STATUS } from '@utils/http-status';

const TABLE_NAME = 'organization';

/** Cadastro de organizações (executado via CLI em `src/functions/organization` e pelo seed). */
export class OrganizationService {
  /**
   * Cria a organização e a primeira credencial dela (`service_account` com role `admin`).
   *
   * @param params.name - nome da organização
   * @param params.document - CPF/CNPJ sem máscara
   * @returns organização criada + credencial com `client_secret` em texto puro
   * @throws {ServiceError} 409 `ORGANIZATION_DOCUMENT_DUPLICITY`
   */
  static async register({ name, document }: { name: string; document: string }) {
    return db.transaction().execute(async (trx) => {
      const existing = await trx
        .selectFrom(TABLE_NAME)
        .select('uuid')
        .where('document', '=', document)
        .where('deleted_at', 'is', null)
        .executeTakeFirst();

      if (existing) {
        throw new ServiceError(
          HTTP_STATUS.conflict,
          'ORGANIZATION_DOCUMENT_DUPLICITY',
          'Já existe uma organização cadastrada com esse documento'
        );
      }

      const organization = await trx
        .insertInto(TABLE_NAME)
        .values({ name, document })
        .returning(['uuid', 'name', 'document'])
        .executeTakeFirstOrThrow();

      const credentials = await ServiceAccountService.createCredentials({
        trx,
        owner: { organization_uuid: organization.uuid, role: eServiceAccountRole.admin, name: 'Admin' },
      });

      return { ...organization, credentials };
    });
  }
}
