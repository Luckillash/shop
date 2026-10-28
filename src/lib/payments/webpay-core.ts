// Reglas de Webpay Plus que no dependen de la red (06-implementacion/pagos-webpay-plus.md).
// Sin "server-only" para poder probarlas; el cliente HTTP está en webpay.ts.

/** Respuesta de commit y status (TransactionResult) */
export type WebpayResult = {
  vci?: string;
  amount: number;
  status: string;
  buy_order: string;
  session_id: string;
  card_detail?: { card_number?: string } | null;
  accounting_date?: string;
  transaction_date?: string;
  authorization_code?: string;
  payment_type_code?: string;
  response_code: number;
  installments_amount?: number;
  installments_number?: number;
  balance?: number;
};

/** Lo que llega a return_url, por query (GET) o por body form-urlencoded (POST) */
export type WebpayReturn =
  /** Flujo normal (aprobado o rechazado): hay que hacer commit */
  | { kind: "commit"; token: string }
  /** Anulado en el formulario, o error y "volver al sitio": NUNCA commit (trampa 27) */
  | { kind: "aborted"; token: string; buyOrder: string | null; sessionId: string | null }
  /** Se acabó el tiempo del formulario: llegan solo la orden y la sesión, sin token */
  | { kind: "timeout"; buyOrder: string; sessionId: string | null }
  | { kind: "invalid" };

function param(params: URLSearchParams, name: string): string | null {
  const value = params.get(name)?.trim();
  return value ? value : null;
}

export function parseWebpayReturn(params: URLSearchParams): WebpayReturn {
  const tokenWs = param(params, "token_ws");
  const tbkToken = param(params, "TBK_TOKEN");
  const buyOrder = param(params, "TBK_ORDEN_COMPRA");
  const sessionId = param(params, "TBK_ID_SESION");

  // TBK_TOKEN gana aunque también venga token_ws
  if (tbkToken) return { kind: "aborted", token: tbkToken, buyOrder, sessionId };
  if (tokenWs) return { kind: "commit", token: tokenWs };
  if (buyOrder) return { kind: "timeout", buyOrder, sessionId };
  return { kind: "invalid" };
}

/** HTTP 200 no es aprobado (trampa 26) */
export function isApproved(result: Pick<WebpayResult, "response_code" | "status">): boolean {
  return result.response_code === 0 && result.status === "AUTHORIZED";
}

export type ExpectedAttempt = {
  /** CLP entero (orders.total) */
  amount: number;
  /** payments.reference = buy_order */
  reference: string;
  /** orders.id = session_id */
  orderId: string;
};

/** El resultado corresponde al intento que esperábamos (trampa 36) */
export function matchesAttempt(result: Pick<WebpayResult, "amount" | "buy_order" | "session_id">, expected: ExpectedAttempt): boolean {
  return (
    Math.round(Number(result.amount)) === Math.round(expected.amount) &&
    result.buy_order === expected.reference &&
    result.session_id === expected.orderId
  );
}

export type AttemptOutcome =
  | { status: "paid" }
  | { status: "failed"; reason: FailureReason }
  /** El usuario todavía no termina en la pasarela: no se toca el intento */
  | { status: "pending" }
  /** Aprobado, pero el monto o la orden no coinciden: se reembolsa y se alerta */
  | { status: "mismatch" };

export type FailureReason = "rejected" | "aborted" | "timeout" | "expired" | "gateway_error";

/**
 * Resultado de commit o status → intento. `final`: el pedido venció (cron), así que un intento que
 * sigue INITIALIZED se da por fallido en vez de esperar.
 */
export function webpayOutcome(result: WebpayResult, expected: ExpectedAttempt, final = false): AttemptOutcome {
  if (isApproved(result)) return matchesAttempt(result, expected) ? { status: "paid" } : { status: "mismatch" };
  if (result.status === "INITIALIZED") return final ? { status: "failed", reason: "expired" } : { status: "pending" };
  return { status: "failed", reason: "rejected" };
}

/** "tarjeta de débito", "tarjeta de crédito en 3 cuotas"… para *Pagado con … vía Webpay Plus* */
export function webpayCardLabel(paymentTypeCode: string | undefined, installments = 0): string {
  switch (paymentTypeCode) {
    case "VD":
      return "tarjeta de débito";
    case "VP":
      return "tarjeta de prepago";
    case "VN":
      return "tarjeta de crédito";
    case "S2":
    case "SI":
    case "NC":
    case "VC":
      return installments > 1 ? `tarjeta de crédito en ${installments} cuotas` : "tarjeta de crédito en cuotas";
    default:
      return "tarjeta";
  }
}

/**
 * ¿La transacción ya está devuelta completa? (status después de un reembolso que no respondió a
 * tiempo: Transbank puede procesarlo igual, 7.4). Anulada sin saldo o reversada.
 */
export function isFullyRefunded(result: Pick<WebpayResult, "status" | "balance">): boolean {
  if (result.status === "REVERSED") return true;
  return result.status === "NULLIFIED" && (result.balance ?? 0) === 0;
}
