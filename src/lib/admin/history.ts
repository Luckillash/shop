import { formatCLP } from "@/lib/format/clp";
import { cancelReason } from "@/lib/orders/customer-view";
import type { Json } from "@/types/database";
import { alertCopy } from "./alerts";
import type { AdminListOrder } from "./order-list";

// Historial de AdminPedido (cuándo, qué, quién). Sale de order_events (M8: el trigger escribe cada
// cambio de estado con su actor; el backend, los correos, los reembolsos y las alertas resueltas).
// Los pedidos anteriores a la M8 (1001–1036) no tienen eventos: lo que falte se arma con las fechas
// del pedido y los intentos de pago (D-025). Puro: lo usan la página y los tests.

export type HistoryEvent = { kind: string; actor: string; created_at: string; data: Json };

export type HistoryEntry = {
  at: string;
  what: string;
  /** null = no se sabe (pedidos sin eventos) */
  who: string | null;
};

const WHO: Record<string, string> = { customer: "Cliente", admin: "Administración", system: "Sistema" };

const PROVIDER: Record<string, string> = { webpay: "Webpay Plus", flow: "Flow", transfer: "transferencia" };

const EMAIL: Record<string, string> = {
  confirmed: "Correo de pedido confirmado",
  shipped: "Correo de despacho",
  cancelled: "Correo de anulación",
  transfer: "Correo con los datos para transferir",
  late_refund: "Correo de pago devuelto",
};

function asObject(value: Json | null | undefined): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

const text = (value: Json | undefined) => (typeof value === "string" && value.trim() ? value.trim() : null);

const clp = (value: Json | number | string | undefined) => formatCLP(Math.round(Number(value ?? 0)));

type Order = Pick<
  AdminListOrder,
  "placed_at" | "paid_at" | "shipped_at" | "delivered_at" | "cancelled_at" | "expires_at" | "shipping_method" | "carrier" | "tracking_number" | "cancel_reason" | "cancel_note" | "payments"
>;

function paidText(provider: string | null, operation: string | null): string {
  if (provider === "transfer") return operation ? `Transferencia confirmada · N.º de operación ${operation}` : "Transferencia confirmada";
  return provider && PROVIDER[provider] ? `Pago recibido en ${PROVIDER[provider]}` : "Pago recibido";
}

function shippedText(order: Order, carrier: string | null, tracking: string | null): string {
  if (order.shipping_method === "pickup") return "Listo para retirar";
  if (!carrier) return "Enviado";
  return tracking ? `Enviado con ${carrier} · ${tracking}` : `Enviado con ${carrier}`;
}

function cancelledText(reason: string, note: string | null): string {
  if (reason === "vencio") return "Anulado: venció el plazo para pagar";
  if (reason === "cliente") return "Anulado por el cliente";
  return note ? `Anulado por la tienda · «${note}»` : "Anulado por la tienda";
}

function refundText(provider: string | null, amount: Json | number | string | undefined, manual: boolean): string {
  if (manual || provider === "transfer") return `Devolución por transferencia de ${clp(amount)}`;
  return `Pago de ${clp(amount)} devuelto en ${provider && PROVIDER[provider] ? PROVIDER[provider] : "la pasarela"}`;
}

function eventText(order: Order, event: HistoryEvent): string {
  const data = asObject(event.data);
  switch (event.kind) {
    case "placed":
      return "Pedido creado";
    case "pending":
      return "Volvió a pago pendiente";
    case "paid":
      return paidText(text(data.provider), text(data.operation_number));
    case "processing":
      return "Empezó la preparación";
    case "shipped":
      return shippedText(order, text(data.carrier), text(data.tracking_number));
    case "delivered":
      return order.shipping_method === "pickup" ? "Retirado" : "Entregado";
    case "cancelled":
      return cancelledText(text(data.reason) ?? cancelReason(order), text(data.note));
    case "refunded":
      return "Reembolsado";
    case "refund":
      return refundText(text(data.provider), data.amount, data.manual === true);
    case "alert_resolved":
      return `Alerta resuelta: ${alertCopy(text(data.alert_kind) ?? "", null).label.toLowerCase()}`;
    case "email": {
      const template = text(data.template);
      if (template === "shipped" && order.shipping_method === "pickup") return "Correo de listo para retirar";
      return (template && EMAIL[template]) ?? `Correo «${text(data.subject) ?? "sin asunto"}»`;
    }
    default:
      return event.kind;
  }
}

/**
 * Las entradas del historial, de la más nueva a la más antigua. Cada fecha del pedido sin su evento
 * (pedido creado, pagado, enviado, entregado, anulado) y cada pago devuelto sin su evento `refund`
 * se agregan desde el pedido, sin actor conocido salvo el que se deduce (el motivo de la anulación).
 */
export function orderHistory(order: Order, events: HistoryEvent[]): HistoryEntry[] {
  const entries: HistoryEntry[] = events.map((event) => ({
    at: event.created_at,
    what: eventText(order, event),
    who: WHO[event.actor] ?? null,
  }));
  const has = (kind: string) => events.some((e) => e.kind === kind);

  if (!has("placed")) entries.push({ at: order.placed_at, what: "Pedido creado", who: "Cliente" });
  if (order.paid_at && !has("paid")) {
    const paid = order.payments.find((p) => p.status === "paid" || p.status === "refunded");
    entries.push({ at: order.paid_at, what: paidText(paid?.provider ?? null, null), who: paid?.provider === "transfer" ? null : "Sistema" });
  }
  if (order.shipped_at && !has("shipped")) {
    entries.push({ at: order.shipped_at, what: shippedText(order, order.carrier, order.tracking_number), who: null });
  }
  if (order.delivered_at && !has("delivered")) {
    entries.push({ at: order.delivered_at, what: order.shipping_method === "pickup" ? "Retirado" : "Entregado", who: null });
  }
  if (order.cancelled_at && !has("cancelled")) {
    const reason = cancelReason(order);
    entries.push({
      at: order.cancelled_at,
      what: cancelledText(reason, order.cancel_note?.trim() || null),
      who: reason === "vencio" ? "Sistema" : reason === "cliente" ? "Cliente" : null,
    });
  }
  if (!has("refund")) {
    for (const payment of order.payments.filter((p) => p.status === "refunded")) {
      entries.push({ at: payment.updated_at, what: refundText(payment.provider, payment.amount, false), who: null });
    }
  }

  // Estable: con la misma hora, lo que se registró después va primero
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => b.entry.at.localeCompare(a.entry.at) || b.index - a.index)
    .map(({ entry }) => entry);
}
