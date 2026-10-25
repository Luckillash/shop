import "server-only";
import { webpayConfig } from "./config";
import { GATEWAY_TIMEOUT_MS, GatewayError } from "./gateway-error";
import type { WebpayResult } from "./webpay-core";

// Cliente REST de Webpay Plus v1.2 (sin SDK): JSON con Tbk-Api-Key-Id / Tbk-Api-Key-Secret.
// Sin webhooks: el resultado llega con el navegador a /api/pagos/webpay/retorno.

async function call<T>(method: "GET" | "POST" | "PUT", path: string, body?: unknown): Promise<T> {
  const config = webpayConfig();
  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}${path}`, {
      method,
      headers: {
        "Tbk-Api-Key-Id": config.commerceCode,
        "Tbk-Api-Key-Secret": config.apiKey,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(GATEWAY_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    throw new GatewayError("webpay", `Webpay no respondió: ${(error as Error).message}`);
  }
  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok) {
    const message = (data as { error_message?: string } | null)?.error_message ?? response.statusText;
    throw new GatewayError("webpay", `Webpay ${method} ${path}: ${response.status} ${message}`, response.status, data);
  }
  return data as T;
}

/** amount entero en CLP; buyOrder ≤ 26 (trampa 30); sessionId ≤ 61 */
export function createTransaction(input: { buyOrder: string; sessionId: string; amount: number; returnUrl: string }) {
  return call<{ token: string; url: string }>("POST", "/transactions", {
    buy_order: input.buyOrder,
    session_id: input.sessionId,
    amount: Math.round(input.amount),
    return_url: input.returnUrl,
  });
}

/** Solo una vez por token (trampa 29). Repetido → 422 "Transaction with invalid state" */
export function commitTransaction(token: string) {
  return call<WebpayResult>("PUT", `/transactions/${encodeURIComponent(token)}`);
}

/** Disponible 7 días desde la creación */
export function getTransactionStatus(token: string) {
  return call<WebpayResult>("GET", `/transactions/${encodeURIComponent(token)}`);
}

/** Reversa (< 3 h, total) o anulación (hasta 90 días): Transbank decide según el plazo */
export function refundTransaction(token: string, amount: number) {
  return call<{ type: string; response_code?: number; nullified_amount?: number; balance?: number }>(
    "POST",
    `/transactions/${encodeURIComponent(token)}/refunds`,
    { amount: Math.round(amount) },
  );
}
