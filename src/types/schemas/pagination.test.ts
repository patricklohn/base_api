import { z } from 'zod';
import { describe, expect, it } from 'vitest';

import {
  CONDITION_MAX_DEPTH,
  CONDITION_MAX_RULES,
  PAGINATION_DEFAULT_LIMIT,
  PAGINATION_MAX_LIMIT,
  createPaginationSchemas,
} from './pagination';

const { listQuerySchema, searchBodySchema } = createPaginationSchemas({
  name: 'PaginationTest',
  rowSchema: z.object({ name: z.string() }),
  filterableColumns: ['name', 'status', 'created_at', 'updated_at'],
  sortableColumns: ['created_at', 'name'],
  conditionExample: { type: 'and', conditions: [{ column: 'status', operator: '=', value: 'active' }] },
});

const rule = { column: 'name', operator: '=', value: 'x' } as const;

/** Grupo aninhado com `depth` níveis. */
const nested = (depth: number): object =>
  depth === 1 ? { type: 'and', conditions: [rule] } : { type: 'and', conditions: [nested(depth - 1)] };

describe('createPaginationSchemas', () => {
  it('aplica os defaults de página, limite e ordenação', () => {
    expect(searchBodySchema.parse({})).toEqual({
      page: 1,
      limit: PAGINATION_DEFAULT_LIMIT,
      order_by_column: 'created_at',
      order_by: 'desc',
    });
  });

  it(`recusa limit acima de ${PAGINATION_MAX_LIMIT} e coluna de ordenação fora da whitelist`, () => {
    expect(searchBodySchema.safeParse({ limit: PAGINATION_MAX_LIMIT + 1 }).success).toBe(false);
    expect(searchBodySchema.safeParse({ order_by_column: 'status' }).success).toBe(false);
  });

  it('aceita condition aninhado com and/or e os operadores válidos', () => {
    const condition = {
      type: 'or',
      conditions: [
        { column: 'name', operator: 'ilike', value: '%ltda%' },
        {
          type: 'and',
          conditions: [
            { column: 'status', operator: 'in', value: ['active', 'pending'] },
            { column: 'status', operator: 'is not', value: null },
            { column: 'updated_at', operator: '>', compare_column: 'created_at' },
          ],
        },
      ],
    };

    expect(searchBodySchema.safeParse({ condition }).success).toBe(true);
  });

  it.each([
    ['coluna fora da whitelist', { column: 'organization_uuid', operator: '=', value: 'x' }],
    ['in sem array', { column: 'name', operator: 'in', value: 'x' }],
    ['in com array vazio', { column: 'name', operator: 'in', value: [] }],
    ['is com valor diferente de null', { column: 'name', operator: 'is', value: 'x' }],
    ['like com número', { column: 'name', operator: 'like', value: 1 }],
    ['campo extra', { column: 'name', operator: '=', value: 'x', raw: 'drop table' }],
    ['compare_column fora da whitelist', { column: 'name', operator: '=', compare_column: 'organization_uuid' }],
  ])('recusa regra com %s', (_case, invalidRule) => {
    expect(searchBodySchema.safeParse({ condition: { type: 'and', conditions: [invalidRule] } }).success).toBe(false);
  });

  it(`aceita até ${CONDITION_MAX_DEPTH} níveis e recusa o seguinte`, () => {
    expect(searchBodySchema.safeParse({ condition: nested(CONDITION_MAX_DEPTH) }).success).toBe(true);

    const result = searchBodySchema.safeParse({ condition: nested(CONDITION_MAX_DEPTH + 1) });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain(`${CONDITION_MAX_DEPTH} níveis`);
  });

  it(`aceita até ${CONDITION_MAX_RULES} regras e recusa a seguinte`, () => {
    const withRules = (total: number) => ({ type: 'and', conditions: Array.from({ length: total }, () => rule) });

    expect(searchBodySchema.safeParse({ condition: withRules(CONDITION_MAX_RULES) }).success).toBe(true);
    expect(searchBodySchema.safeParse({ condition: withRules(CONDITION_MAX_RULES + 1) }).success).toBe(false);
  });

  it('GET: lê o condition como JSON da querystring e recusa JSON inválido', () => {
    const condition = JSON.stringify({ type: 'and', conditions: [rule] });

    expect(listQuerySchema.parse({ condition, limit: '10' })).toMatchObject({
      limit: 10,
      condition: { type: 'and', conditions: [rule] },
    });
    expect(listQuerySchema.safeParse({ condition: '{nao-e-json' }).success).toBe(false);
  });
});
