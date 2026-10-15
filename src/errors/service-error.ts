// Erro de negócio genérico: statusCode/code seguem o contrato lido pelo error handler global (src/configs/fastify/error.ts)
export class ServiceError extends Error {
  statusCode: number;
  code: string;
  /** Dados extras do erro, devolvidos dentro de `error` na resposta (nunca segredos). */
  details?: Record<string, unknown>;

  /**
   * @param statusCode - status HTTP da resposta
   * @param code - código estável do erro (ex.: `NOT_FOUND`)
   * @param message - mensagem ao client (em erros 5xx o handler responde uma mensagem genérica)
   * @param options - `cause` com o erro original, que vai para o log; `details` com dados extras para o client
   */
  constructor(
    statusCode: number,
    code: string,
    message: string,
    options?: ErrorOptions & { details?: Record<string, unknown> }
  ) {
    super(message, options);
    this.statusCode = statusCode;
    this.code = code;
    this.details = options?.details;
  }
}
