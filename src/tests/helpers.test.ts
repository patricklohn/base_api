import { describe, expect, it } from 'vitest';

import { CnpjValidator } from '@utils/cpf-cnpj-validator';

import { randomCnpj } from './helpers';

describe('randomCnpj', () => {
  it('gera CNPJs válidos', () => {
    for (let i = 0; i < 50; i++) {
      expect(CnpjValidator.isValid(randomCnpj())).toBe(true);
    }
  });
});
