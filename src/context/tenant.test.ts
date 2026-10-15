import { DummyDriver, Kysely, PostgresAdapter, PostgresIntrospector, PostgresQueryCompiler } from 'kysely';
import { describe, expect, it } from 'vitest';

import { DB, eServiceAccountRole } from '@database/db/model';

import { TenantScope } from './tenant';

// Kysely sem conexão: só compila o SQL
const db = new Kysely<DB>({
  dialect: {
    createAdapter: () => new PostgresAdapter(),
    createDriver: () => new DummyDriver(),
    createIntrospector: (instance) => new PostgresIntrospector(instance),
    createQueryCompiler: () => new PostgresQueryCompiler(),
  },
});

const admin = new TenantScope({
  accountUuid: 'conta-1',
  role: eServiceAccountRole.admin,
  organizationUuid: 'organizacao-1',
});

const viewer = new TenantScope({
  accountUuid: 'conta-2',
  role: eServiceAccountRole.viewer,
  organizationUuid: 'organizacao-1',
});

describe('TenantScope', () => {
  it('expõe o role pelos getters', () => {
    expect(admin.isAdmin).toBe(true);
    expect(admin.isViewer).toBe(false);
    expect(viewer.isViewer).toBe(true);
  });

  describe('values', () => {
    it('sobrescreve o organization_uuid vindo do client', () => {
      expect(admin.values('actor', { organization_uuid: 'outra', name: 'Mark Hamill' })).toEqual({
        organization_uuid: 'organizacao-1',
        name: 'Mark Hamill',
      });
    });
  });

  describe('where', () => {
    it('filtra pela organização e por deleted_at, com a coluna qualificada pela tabela', () => {
      const query = db.selectFrom('actor').selectAll().where(viewer.where('actor')).compile();

      expect(query.sql).toContain('("actor"."organization_uuid" = $1 and "actor"."deleted_at" is null)');
      expect(query.parameters).toEqual(['organizacao-1']);
    });

    it('funciona também em update', () => {
      const query = db
        .updateTable('planet')
        .set({ name: 'Alderaan' })
        .where('uuid', '=', 'x')
        .where(admin.where('planet'))
        .compile();

      expect(query.sql).toContain('"planet"."organization_uuid" = $3');
    });
  });
});
