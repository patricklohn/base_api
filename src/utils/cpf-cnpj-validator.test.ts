import { describe, expect, it } from 'vitest';

import { CnpjValidator, CpfValidator, stripDocumentMask } from './cpf-cnpj-validator';

describe('stripDocumentMask', () => {
  it('remove só os separadores e converte para maiúsculas', () => {
    expect(stripDocumentMask('12.abc.345/01de-35')).toBe('12ABC34501DE35');
    expect(stripDocumentMask('529 982 247 25')).toBe('529 982 247 25');
  });
});

describe('CpfValidator', () => {
  it.each(['529.982.247-25', '52998224725'])('aceita CPF válido: %s', (cpf) => {
    expect(CpfValidator.isValid(cpf)).toBe(true);
  });

  it.each([
    ['DV errado', '529.982.247-26'],
    ['sequência repetida', '111.111.111-11'],
    ['sequência conhecida', '123.456.789-09'],
    ['tamanho errado', '5299822472'],
    ['letra', '5299822472A'],
    ['espaço no meio', '529 982 247 25'],
    ['vazio', ''],
  ])('recusa CPF com %s', (_case, cpf) => {
    expect(CpfValidator.isValid(cpf)).toBe(false);
  });

  it('formata com máscara', () => {
    expect(CpfValidator.format('52998224725')).toBe('529.982.247-25');
  });
});

describe('CnpjValidator', () => {
  it.each(['11.222.333/0001-81', '11222333000181', '12.ABC.345/01DE-35', '12abc34501de35'])(
    'aceita CNPJ válido (numérico ou alfanumérico): %s',
    (cnpj) => {
      expect(CnpjValidator.isValid(cnpj)).toBe(true);
    }
  );

  it.each([
    ['DV errado', '11.222.333/0001-82'],
    ['DV alfanumérico errado', '12.ABC.345/01DE-36'],
    ['sequência repetida', '11111111111111'],
    ['letra no DV', '12ABC34501DE3A'],
    ['tamanho errado', '1122233300018'],
    ['caractere especial', '11222333000_81'],
  ])('recusa CNPJ com %s', (_case, cnpj) => {
    expect(CnpjValidator.isValid(cnpj)).toBe(false);
  });

  it('formata com máscara, inclusive o alfanumérico', () => {
    expect(CnpjValidator.format('11222333000181')).toBe('11.222.333/0001-81');
    expect(CnpjValidator.format('12abc34501de35')).toBe('12.ABC.345/01DE-35');
  });
});
