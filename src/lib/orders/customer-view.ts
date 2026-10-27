import { santiagoDate } from "@/lib/chile/business-days";
import { isShippingMethod, shippingMethodLabel, type ShippingMethod } from "@/lib/checkout/shipping";
import { formatCLP } from "@/lib/format/clp";
import { formatDeadline, formatDeliveryDay } from "@/lib/format/dates";
import { STORE } from "@/lib/store";
import type { Database, Json } from "@/types/database";
import { estimatedDelivery, isCancelReason, trackingProgress, TRACKING_STEPS, type OrderStatus } from "./order-status";

// Textos de Mis pedidos y Detalle de pedido (templates MisPedidos y DetallePedido, B24). Puro: lo
// usan las páginas de /cuenta y los tests. El cliente no lee order_events (solo el admin): todo sale
// de las fechas del pedido y de sus intentos de pago.

type PaymentStatus = Database["public"]["Enums"]["payment_status"];

export type CustomerOrderPayment = {
  status: PaymentStatus;
  amount: number | string;
  updated_at: string;
};

export type CustomerOrder = {
  status: OrderStatus;
  payment_method: string | null;
  shipping_method: string | null;
  shipping_address: Json;
  total: number | string;
  placed_at: string;
  paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  expires_at: string | null;
  cancel_reason: string | null;
  cancel_note: string | null;
  payments: CustomerOrderPayment[];
};

const clp = (value: number | string) => formatCLP(Math.round(Number(value)));

function method(order: Pick<CustomerOrder, "shipping_method">): ShippingMethod {
  return isShippingMethod(order.shipping_method) ? order.shipping_method : "standard";
}

/** El reembolso del pedido (B13 o anulación de la tienda): monto y fecha del intento refunded */
function refund(order: CustomerOrder): { amount: string; day: string } | null {
  const payment = order.payments.find((p) => p.status === "refunded");
  if (!payment) return null;
  return { amount: clp(payment.amount), day: formatDeliveryDay(new Date(payment.updated_at)) };
}

/**
 * Motivo de un pedido anulado. Los anulados antes de la M8 no tienen cancel_reason: si se anularon
 * después de su plazo, venció; si no, los anuló la tienda (son las pruebas 1001–1004).
 */
export function cancelReason(order: Pick<CustomerOrder, "cancel_reason" | "expires_at" | "cancelled_at">) {
  if (isCancelReason(order.cancel_reason)) return order.cancel_reason;
  if (order.expires_at && order.cancelled_at && order.cancelled_at >= order.expires_at) return "vencio";
  return "tienda";
}

/**
 * La línea de qué pasó con el pedido (B24), en negrita en la tarjeta de Mis pedidos y como título
 * del aviso en el Detalle cuando no hay seguimiento. Las que no están en el diseño son propuestas
 * (pendientes-del-dueno-fase-7.md): pending con tarjeta o Flow, vencido sin transferencia, motivos
 * `cliente` y `tienda`, y el anulado con el pago devuelto (1030).
 */
export function orderStatusLine(order: CustomerOrder, now: Date): string {
  switch (order.status) {
    case "pending": {
      const deadline = order.expires_at ? new Date(order.expires_at) : null;
      if (deadline && deadline <= now) return "Venció el plazo para pagar. No hicimos ningún cargo";
      if (order.payment_method === "transfer" && deadline) {
        return `Transfiere ${clp(order.total)} hasta el ${formatDeadline(deadline)}`;
      }
      return deadline ? `Paga ${clp(order.total)} hasta el ${formatDeadline(deadline)}` : `Falta pagar ${clp(order.total)}`;
    }
    case "paid":
    case "processing":
    case "shipped": {
      const estimate = estimatedDelivery(order);
      if (!estimate) return shippingMethodLabel(method(order));
      // Una fecha estimada que ya pasó no se muestra: el pedido sigue en camino
      if (order.status === "shipped" && estimate.date < santiagoDate(now)) return "Está en camino";
      return estimate.label;
    }
    case "delivered":
      return order.delivered_at
        ? `${method(order) === "pickup" ? "Retirado" : "Entregado"} el ${formatDeliveryDay(new Date(order.delivered_at))}`
        : method(order) === "pickup"
          ? "Retirado"
          : "Entregado";
    case "refunded": {
      const done = refund(order);
      const day = done?.day ?? (order.cancelled_at ? formatDeliveryDay(new Date(order.cancelled_at)) : null);
      return day ? `Te devolvimos ${done?.amount ?? clp(order.total)} el ${day}` : `Te devolvimos ${clp(order.total)}`;
    }
    case "cancelled": {
      // B13: el pago llegó con el pedido ya anulado y se devolvió (1030)
      const done = refund(order);
      if (done) return `Te devolvimos ${done.amount} el ${done.day}: el pago llegó después del plazo`;
      const reason = cancelReason(order);
      if (reason === "vencio") {
        return order.payment_method === "transfer"
          ? "La transferencia no llegó a tiempo. No hicimos ningún cargo"
          : "Venció el plazo para pagar. No hicimos ningún cargo";
      }
      if (reason === "cliente") return "Anulaste el pedido. No hicimos ningún cargo";
      // Anulado por la tienda: la nota es el texto que ve el cliente (cancel_note)
      if (order.cancel_note?.trim()) return order.cancel_note.trim();
      return order.paid_at
        ? `Anulamos el pedido. Te vamos a devolver ${clp(order.total)}`
        : "Anulamos el pedido. No hicimos ningún cargo";
    }
  }
}

/** *4 productos · Despacho a domicilio* (cuenta las unidades, como el subtotal del pedido) */
export function orderSummaryLine(items: { quantity: number }[], shippingMethod: string | null): string {
  const count = items.reduce((n, item) => n + item.quantity, 0);
  return `${count === 1 ? "1 producto" : `${count} productos`} · ${shippingMethodLabel(method({ shipping_method: shippingMethod }))}`;
}

export type TrackingStepState = "done" | "current" | "pending";

export type TrackingStep = {
  name: string;
  state: TrackingStepState;
  /** "Domingo 25 de octubre", "Estimado: martes 27 de octubre" o null */
  detail: string | null;
};

/** En el retiro en tienda no hay despacho: los pasos 3 y 4 son *Listo para retirar* y *Retirado* (propuesta) */
const PICKUP_STEPS = ["Confirmado", "Preparado", "Listo para retirar", "Retirado"] as const;

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const dayOf = (iso: string | null) => (iso ? capitalize(formatDeliveryDay(new Date(iso))) : null);

/**
 * Los 4 pasos del seguimiento del Detalle. Hechos = trackingProgress(); el último hecho queda como
 * actual mientras dura (Preparado en processing, En camino en shipped), como en el diseño. paid es
 * *Confirmado* (Preparado todavía no empieza). No hay fecha de preparación para el cliente (solo
 * está en order_events): ese paso no la muestra. null = sin seguimiento (pendiente o anulado).
 */
export function trackingTimeline(order: CustomerOrder, now: Date): TrackingStep[] | null {
  const progress = trackingProgress(order.status);
  if (progress === 0) return null;
  const pickup = method(order) === "pickup";
  const names = pickup ? PICKUP_STEPS : TRACKING_STEPS;
  const estimate = estimatedDelivery(order);
  const estimateDay =
    estimate && estimate.date >= santiagoDate(now) ? `Estimado: ${estimate.label.replace(/^(Llega|Disponible desde) el /, "")}` : null;

  return names.map((name, index) => {
    const step = index + 1;
    const state: TrackingStepState =
      step > progress ? "pending" : step === progress && (step === 2 || step === 3) ? "current" : "done";
    let detail: string | null = null;
    if (step === 1) detail = dayOf(order.paid_at ?? order.placed_at);
    if (step === 2 && state === "current") detail = "Lo estamos preparando";
    if (step === 3 && state !== "pending") detail = dayOf(order.shipped_at);
    if (step === 4) detail = state === "done" ? dayOf(order.delivered_at) : estimateDay;
    return { name, state, detail };
  });
}

/**
 * Transportistas (decisión 2, aprobada por el dueño el 26-10-2026). `name` es lo que se guarda en
 * orders.carrier y lo que lee el cliente (*Despacha Starken*); `label`, la opción de *Marcar como
 * enviado* (7.4). El despacho propio se guarda como la tienda (*Despacha Almacén*) y no tiene enlace.
 */
export const CARRIERS = [
  { name: "Starken", label: "Starken" },
  { name: "Chilexpress", label: "Chilexpress" },
  { name: "Blue Express", label: "Blue Express" },
  { name: "Correos de Chile", label: "Correos de Chile" },
  { name: STORE.name, label: "Despacho propio" },
] as const;

/**
 * Página de seguimiento de cada transportista, por orders.carrier. Revisadas el 26-10-2026 en el
 * código de cada sitio: Starken lee `codigo`, Blue Express `n_seguimiento` y Chilexpress la OT en la
 * ruta. Correos de Chile no acepta el código en la URL (y su sitio tiene captcha): se enlaza a su
 * página y el código se copia desde el correo o el Detalle.
 */
const CARRIER_TRACKING: Record<string, (trackingNumber: string) => string> = {
  Starken: (code) => `https://www.starken.cl/seguimiento?codigo=${encodeURIComponent(code)}`,
  Chilexpress: (code) => `https://centrodeayuda.chilexpress.cl/seguimiento/${encodeURIComponent(code)}`,
  "Blue Express": (code) => `https://www.blue.cl/enviar/seguimiento?n_seguimiento=${encodeURIComponent(code)}`,
  "Correos de Chile": () => "https://www.correos.cl/seguimiento-en-linea",
};

/** Enlace de *Seguir el envío*. null = el botón no se muestra */
export function carrierTrackingUrl(carrier: string | null, trackingNumber: string | null): string | null {
  if (!carrier || !trackingNumber) return null;
  return CARRIER_TRACKING[carrier]?.(trackingNumber.replace(/\s+/g, "")) ?? null;
}
