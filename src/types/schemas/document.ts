import { z } from 'zod';
import { CnpjValidator, CpfValidator, stripDocumentMask } from '@utils/cpf-cnpj-validator';

/**
 * Schemas Zod de documentos. Aceitam o valor com ou sem máscara e devolvem o documento
 * **normalizado** (sem máscara, maiúsculas), que é o formato gravado no banco.
 * Use nas validações das rotas (`docs/validation.ts`) e nos scripts de `src/functions`.
 *
 * @example
 * z.object({ document: documentSchema }).parse({ document: '11.222.333/0001-81' }); // { document: '11222333000181' }
 */

const documentInput = () => z.string().trim().max(20).transform(stripDocumentMask);

/** CPF válido (11 dígitos). */
export const cpfSchema = documentInput()
  .refine(CpfValidator.isValid, { message: 'CPF inválido' })
  .meta({ description: 'CPF com ou sem máscara (gravado sem máscara)', example: '529.982.247-25' });

/** CNPJ válido, numérico ou alfanumérico (14 caracteres). */
export const cnpjSchema = documentInput().refine(CnpjValidator.isValid, { message: 'CNPJ inválido' }).meta({
  description: 'CNPJ numérico ou alfanumérico, com ou sem máscara (gravado sem máscara)',
  example: '11.222.333/0001-81',
});

/** CPF ou CNPJ válido. */
export const documentSchema = documentInput()
  .refine((value) => CpfValidator.isValid(value) || CnpjValidator.isValid(value), {
    message: 'CPF ou CNPJ inválido',
  })
  .meta({
    description: 'CPF ou CNPJ (numérico ou alfanumérico), com ou sem máscara (gravado sem máscara)',
    example: '11.222.333/0001-81',
  });
