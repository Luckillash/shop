// Qué pantalla corresponde a un pedido según su estado y sus intentos de pago
// (04-diseno/estados-y-mensajes.md, «Mapeo resultado → pantalla»). Puro, para probarlo.

export type OrderScreen =
  /** Confirmación */
  | "confirmed"
  /** Transferencia pendiente */
  | "transfer"
  /** Pago rechazado (Webpay) o no completado (Flow), con *Elige cómo pagar* */
  | "rejected"
  /** El usuario volvió de la pasarela pero el resultado no está: *Estamos confirmando tu pago* */
  | "confirming"
  /** Anulado por vencimiento (o por el cliente): el stock ya se liberó */
  | "expired"
  /** Pago aprobado después de anularse el pedido y devuelto (B13) */
  | "refunded";

export type ScreenOrder = {
  status: string;
  expires_at: string | null;
  payments: { provider: string; status: string; attempt: number | null }[];
};

const PAID = new Set(["paid", "processing", "shipped", "delivered"]);

/** Último intento (attempt más alto) */
export function latestAttempt<T extends { attempt: number | null }>(payments: T[]): T | null {
  return payments.reduce<T | null>((best, p) => (!best || (p.attempt ?? 0) > (best.attempt ?? 0) ? p : best), null);
}

export function orderScreen(order: ScreenOrder, now: Date): OrderScreen {
  if (PAID.has(order.status)) return "confirmed";
  if (order.status === "cancelled" || order.status === "refunded") {
    return order.payments.some((p) => p.status === "refunded") ? "refunded" : "expired";
  }

  const latest = latestAttempt(order.payments);
  const expired = order.expires_at !== null && new Date(order.expires_at).getTime() <= now.getTime();
  if (latest?.status === "pending") return latest.provider === "transfer" ? (expired ? "expired" : "transfer") : "confirming";
  // Sin intento pendiente y fuera de plazo: ya no se puede reintentar (el cron lo anulará)
  if (expired) return "expired";
  return "rejected";
}

/** URL de cada pantalla */
export function screenPath(orderId: string, screen: OrderScreen): string {
  if (screen === "rejected") return `/pedido/${orderId}/pago-rechazado`;
  if (screen === "transfer") return `/pedido/${orderId}/transferencia`;
  return `/pedido/${orderId}`;
}
