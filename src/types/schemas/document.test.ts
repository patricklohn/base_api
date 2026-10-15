import { describe, expect, it } from 'vitest';

import { cnpjSchema, cpfSchema, documentSchema } from './document';

describe('schemas de documento', () => {
  it('devolve o documento normalizado (sem máscara, maiúsculas)', () => {
    expect(documentSchema.parse(' 11.222.333/0001-81 ')).toBe('11222333000181');
    expect(documentSchema.parse('529.982.247-25')).toBe('52998224725');
    expect(documentSchema.parse('12.abc.345/01de-35')).toBe('12ABC34501DE35');
  });

  it('documentSchema recusa documento inválido com mensagem própria', () => {
    const result = documentSchema.safeParse('11.222.333/0001-82');
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('CPF ou CNPJ inválido');
  });

  it('cpfSchema aceita só CPF e cnpjSchema só CNPJ', () => {
    expect(cpfSchema.safeParse('529.982.247-25').success).toBe(true);
    expect(cpfSchema.safeParse('11.222.333/0001-81').success).toBe(false);
    expect(cnpjSchema.safeParse('11.222.333/0001-81').success).toBe(true);
    expect(cnpjSchema.safeParse('529.982.247-25').success).toBe(false);
  });

  it('recusa entrada com mais de 20 caracteres antes de normalizar', () => {
    expect(documentSchema.safeParse('1'.repeat(21)).success).toBe(false);
  });
});
