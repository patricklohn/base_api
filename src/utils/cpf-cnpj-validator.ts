/**
 * Validação e formatação de CPF e CNPJ (inclusive o CNPJ alfanumérico da IN RFB nº 2.229/2024).
 *
 * Os documentos são sempre tratados sem máscara e em maiúsculas: aceite a entrada com ou sem máscara,
 * normalize com {@link stripDocumentMask} e grave o valor normalizado.
 */

const MASK_SEPARATORS_REGEX = /[./-]/g;
const REPEATED_CHAR_REGEX = /^(.)\1+$/;

/**
 * Remove apenas os separadores de máscara (`.`, `/`, `-`) e converte para maiúsculas.
 * Qualquer outro caractere permanece e faz a validação falhar.
 *
 * @param value - documento com ou sem máscara
 * @returns documento normalizado
 *
 * @example
 * stripDocumentMask('12.abc.345/01de-35'); // '12ABC34501DE35'
 */
export const stripDocumentMask = (value: string): string =>
  (value ?? '').replace(MASK_SEPARATORS_REGEX, '').toUpperCase();

// ─── CPF ───────────────────────────────────────────────────────────────────────

const CPF_REGEX = /^\d{11}$/;
const CPF_BLACKLIST = ['12345678909'];

/**
 * Dígito verificador do CPF (módulo 11, pesos decrescentes a partir de `tamanho + 1`).
 *
 * @param digits - 9 dígitos (calcula o 1º DV) ou 10 dígitos (calcula o 2º DV)
 */
const cpfVerifierDigit = (digits: string): number => {
  const modulus = digits.length + 1;
  const sum = digits.split('').reduce((acc, digit, index) => acc + Number(digit) * (modulus - index), 0);
  const mod = sum % 11;
  return mod < 2 ? 0 : 11 - mod;
};

/**
 * Valida um CPF.
 *
 * @param value - CPF com ou sem máscara
 * @returns `true` quando tem 11 dígitos, não é sequência repetida/conhecida e os DVs conferem
 *
 * @example
 * isValid('529.982.247-25'); // true
 */
const cpfIsValid = (value: string): boolean => {
  const cpf = stripDocumentMask(value);

  if (!CPF_REGEX.test(cpf) || REPEATED_CHAR_REGEX.test(cpf) || CPF_BLACKLIST.includes(cpf)) {
    return false;
  }

  const base = cpf.slice(0, 9);
  const dv1 = cpfVerifierDigit(base);
  const dv2 = cpfVerifierDigit(base + dv1);

  return `${dv1}${dv2}` === cpf.slice(-2);
};

/**
 * Aplica a máscara `000.000.000-00`.
 *
 * @param value - CPF com ou sem máscara
 * @returns CPF formatado, ou o valor normalizado se não tiver 11 dígitos
 */
const cpfFormat = (value: string): string =>
  stripDocumentMask(value).replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');

export const CpfValidator = {
  isValid: cpfIsValid,
  format: cpfFormat,
};

// ─── CNPJ (numérico e alfanumérico) ────────────────────────────────────────────

// 12 posições alfanuméricas (raiz + ordem) + 2 DVs numéricos
const CNPJ_REGEX = /^[A-Z\d]{12}\d{2}$/;
// Cada caractere vale (charCode - charCode('0')): dígitos 0–9, letras A=17 … Z=42
const CNPJ_CHAR_BASE = '0'.charCodeAt(0);
const CNPJ_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

/**
 * Dígito verificador do CNPJ (módulo 11), válido para CNPJ numérico e alfanumérico.
 *
 * @param base - 12 caracteres (calcula o 1º DV) ou 13 caracteres (calcula o 2º DV)
 */
const cnpjVerifierDigit = (base: string): number => {
  const offset = CNPJ_WEIGHTS.length - base.length;
  const sum = base
    .split('')
    .reduce((acc, char, index) => acc + (char.charCodeAt(0) - CNPJ_CHAR_BASE) * CNPJ_WEIGHTS[offset + index], 0);
  const mod = sum % 11;
  return mod < 2 ? 0 : 11 - mod;
};

/**
 * Valida um CNPJ numérico ou alfanumérico.
 *
 * @param value - CNPJ com ou sem máscara (letras maiúsculas ou minúsculas)
 * @returns `true` quando tem o formato correto, não é sequência repetida e os DVs conferem
 *
 * @example
 * isValid('11.222.333/0001-81'); // true
 * isValid('12.ABC.345/01DE-35'); // true (alfanumérico)
 */
const cnpjIsValid = (value: string): boolean => {
  const cnpj = stripDocumentMask(value);

  if (!CNPJ_REGEX.test(cnpj) || REPEATED_CHAR_REGEX.test(cnpj)) {
    return false;
  }

  const base = cnpj.slice(0, 12);
  const dv1 = cnpjVerifierDigit(base);
  const dv2 = cnpjVerifierDigit(base + dv1);

  return `${dv1}${dv2}` === cnpj.slice(-2);
};

/**
 * Aplica a máscara `00.000.000/0000-00` (letras em maiúsculas no alfanumérico).
 *
 * @param value - CNPJ com ou sem máscara
 * @returns CNPJ formatado, ou o valor normalizado se não tiver o formato esperado
 */
const cnpjFormat = (value: string): string =>
  stripDocumentMask(value).replace(/^([A-Z\d]{2})([A-Z\d]{3})([A-Z\d]{3})([A-Z\d]{4})(\d{2})$/, '$1.$2.$3/$4-$5');

export const CnpjValidator = {
  isValid: cnpjIsValid,
  format: cnpjFormat,
};
