import type { BadgeTone } from "@/components/ui/badge";
import type { IconName } from "@/components/ui/icon";
import { calendarDateToDate, type CalendarDate } from "@/lib/chile/business-days";
import { deliveryEstimate, isShippingMethod } from "@/lib/checkout/shipping";
import { formatDeliveryDay } from "@/lib/format/dates";
import type { Database, Json } from "@/types/database";

// Estados del pedido para la cuenta y la administración (05-dominio/ciclo-de-vida-del-pedido.md,
// mapa FlujoPostcompra del canvas). Puro: lo usan las páginas, las Server Actions y los tests.

export type OrderStatus = Database["public"]["Enums"]["order_status"];

export type StatusBadge = { label: string; tone: BadgeTone; icon: IconName };

const CUSTOMER_BADGES: Record<OrderStatus, StatusBadge> = {
  pending: { label: "Pago pendiente", tone: "warning", icon: "alert" },
  paid: { label: "En preparación", tone: "neutral", icon: "info" },
  processing: { label: "En preparación", tone: "neutral", icon: "info" },
  shipped: { label: "En camino", tone: "new", icon: "truck" },
  delivered: { label: "Entregado", tone: "success", icon: "check" },
  cancelled: { label: "Anulado", tone: "danger", icon: "close" },
  refunded: { label: "Reembolsado", tone: "neutral", icon: "returns" },
};

/** Badge de Mis pedidos y Detalle de pedido: el cliente ve *En preparación* en paid y processing */
export function customerStatusBadge(status: OrderStatus): StatusBadge {
  return CUSTOMER_BADGES[status];
}

/**
 * Badge de la administración: pending es *Transferencia por confirmar* (o *Pago pendiente* con
 * tarjeta o Flow) y paid es *Por preparar* (decisión 1 de la fase 7, aprobada).
 */
export function adminStatusBadge(status: OrderStatus, paymentMethod: string | null): StatusBadge {
  if (status === "pending") {
    return paymentMethod === "transfer"
      ? { label: "Transferencia por confirmar", tone: "warning", icon: "alert" }
      : CUSTOMER_BADGES.pending;
  }
  if (status === "paid") return { label: "Por preparar", tone: "neutral", icon: "info" };
  return CUSTOMER_BADGES[status];
}

/**
 * Transiciones que puede hacer la administración (la BD no las restringe). pending → paid solo al
 * confirmar una transferencia (con tarjeta o Flow lo hace la pasarela). → cancelled con
 * cancel_order, que no acepta shipped ni delivered. cancelled → refunded solo si el pedido se
 * cobró (paid_at): lo comprueba la acción.
 */
const ADMIN_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["paid", "cancelled"],
  paid: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: ["refunded"],
  refunded: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ADMIN_TRANSITIONS[from].includes(to);
}

export function isCancellable(status: OrderStatus): boolean {
  return canTransition(status, "cancelled");
}

/** La acción primary de la tarjeta *Siguiente paso* de AdminPedido. null = nada pendiente */
export type AdminNextStep = "confirm_transfer" | "start_preparing" | "mark_shipped" | "mark_delivered";

export function adminNextStep(status: OrderStatus, paymentMethod: string | null): AdminNextStep | null {
  switch (status) {
    case "pending":
      return paymentMethod === "transfer" ? "confirm_transfer" : null;
    case "paid":
      return "start_preparing";
    case "processing":
      return "mark_shipped";
    case "shipped":
      return "mark_delivered";
    default:
      return null;
  }
}

/** Los 4 pasos del seguimiento del Detalle de pedido */
export const TRACKING_STEPS = ["Confirmado", "Preparado", "En camino", "Entregado"] as const;

/** Cuántos pasos del seguimiento están hechos. 0 = sin seguimiento (pendiente o anulado) */
export function trackingProgress(status: OrderStatus): number {
  switch (status) {
    case "paid":
      return 1;
    case "processing":
      return 2;
    case "shipped":
      return 3;
    case "delivered":
      return 4;
    default:
      return 0;
  }
}

/** Motivo de anulación (orders.cancel_reason, tweak `motivo` de CorreoAnulacion) */
export const CANCEL_REASONS = ["vencio", "tienda", "cliente"] as const;
export type CancelReason = (typeof CANCEL_REASONS)[number];

export function isCancelReason(value: unknown): value is CancelReason {
  return typeof value === "string" && (CANCEL_REASONS as readonly string[]).includes(value);
}

export type OrderDeliveryFields = {
  shipping_method: string | null;
  shipping_address: Json;
  placed_at: string;
  paid_at: string | null;
};

export type OrderDelivery = {
  date: CalendarDate;
  /** "Llega el martes 27 de octubre" · "Disponible desde el martes 27 de octubre" (retiro) */
  label: string;
};

function addressRegion(address: Json): string | null {
  if (!address || typeof address !== "object" || Array.isArray(address)) return null;
  return typeof address.region === "string" ? address.region : null;
}

/**
 * Fecha de entrega estimada de un pedido (B25). No se guarda: se calcula con los plazos por zona
 * desde paid_at (o placed_at si todavía no se paga), igual que la Confirmación, así coincide con
 * la que vio el cliente. Sin el "mañana" relativo del checkout: el pedido se mira días después.
 * null = falta la región.
 */
export function estimatedDelivery(order: OrderDeliveryFields): OrderDelivery | null {
  const method = isShippingMethod(order.shipping_method) ? order.shipping_method : "standard";
  const estimate = deliveryEstimate(method, addressRegion(order.shipping_address), new Date(order.paid_at ?? order.placed_at));
  if (!estimate) return null;
  const day = formatDeliveryDay(calendarDateToDate(estimate.date));
  return { date: estimate.date, label: method === "pickup" ? `Disponible desde el ${day}` : `Llega el ${day}` };
}
