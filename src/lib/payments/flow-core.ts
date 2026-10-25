import { createHmac } from "node:crypto";
import type { AttemptOutcome, ExpectedAttempt } from "./webpay-core";

// Reglas de Flow que no dependen de la red (06-implementacion/pagos-flow.md). Sin "server-only"
// para poder probarlas; el cliente HTTP está en flow.ts.

/** PaymentStatus de payment/getStatus. Varios números pueden llegar como string */
export type FlowStatus = {
  flowOrder: number | string;
  commerceOrder: string;
  requestDate?: string;
  /** 1 pendiente · 2 pagada · 3 rechazada · 4 anulada */
  status: number | string;
  subject?: string;
  currency?: string;
  amount: number | string;
  payer?: string;
  optional?: unknown;
  paymentData?: {
    date?: string | null;
    media?: string | null;
    amount?: number | string | null;
    currency?: string | null;
    fee?: number | string | null;
  } | null;
};

/**
 * Firma s: HMAC-SHA256 (hex) de nombre+valor de todos los parámetros ordenados por nombre, con
 * los valores crudos (sin URL-encoding) y sin s. El orden distingue mayúsculas (trampa 35).
 */
export function signFlowParams(params: Record<string, string>, secretKey: string): string {
  const toSign = Object.keys(params)
    .filter((key) => key !== "s")
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .map((key) => key + params[key])
    .join("");
  return createHmac("sha256", secretKey).update(toSign).digest("hex");
}

/** La orden de Flow corresponde al intento esperado (trampa 36) */
export function matchesFlowAttempt(status: Pick<FlowStatus, "amount" | "commerceOrder">, expected: Pick<ExpectedAttempt, "amount" | "reference">): boolean {
  return Math.round(Number(status.amount)) === Math.round(expected.amount) && status.commerceOrder === expected.reference;
}

/** getStatus → intento. 2 = pagada; 3 y 4 = no completada; 1 = sigue pendiente (salvo `final`) */
export function flowOutcome(status: FlowStatus, expected: Pick<ExpectedAttempt, "amount" | "reference">, final = false): AttemptOutcome {
  const code = Number(status.status);
  if (code === 2) return matchesFlowAttempt(status, expected) ? { status: "paid" } : { status: "mismatch" };
  if (code === 3) return { status: "failed", reason: "rejected" };
  if (code === 4) return { status: "failed", reason: "aborted" };
  return final ? { status: "failed", reason: "expired" } : { status: "pending" };
}
