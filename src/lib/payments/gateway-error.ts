/** Error de una pasarela: red, timeout o una respuesta 4xx/5xx */
export class GatewayError extends Error {
  constructor(
    readonly provider: "webpay" | "flow",
    message: string,
    /** HTTP status; undefined = no hubo respuesta (red o timeout) */
    readonly status?: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "GatewayError";
  }
}

/** Tiempo máximo por llamada. Flow exige responder urlConfirmation en menos de 15 s */
export const GATEWAY_TIMEOUT_MS = 10_000;
