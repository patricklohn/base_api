import { sql } from 'kysely';

// errors
import { ServiceError } from '@errors/service-error';

// sql
import { db } from '@database/db/kysely';

// utils
import { HTTP_STATUS } from '@utils/http-status';

export class HealthService {
  // ─── GET /health/ping ───────────────────────────────────────────────────────

  static ping() {
    return { message: 'pong' } as const;
  }

  // ─── GET /health/ready ──────────────────────────────────────────────────────

  /**
   * Readiness: confirma que o banco responde.
   *
   * @throws {ServiceError} 503 `DATABASE_UNAVAILABLE` se a consulta falhar
   */
  static async ready() {
    try {
      await sql`select 1`.execute(db);
    } catch (error) {
      throw new ServiceError(HTTP_STATUS.service_unavailable, 'DATABASE_UNAVAILABLE', 'Banco de dados indisponível', {
        cause: error,
      });
    }

    return { database: 'up' } as const;
  }
}
