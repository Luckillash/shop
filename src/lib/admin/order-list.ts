import { isShippingMethod, shippingMethodLabel } from "@/lib/checkout/shipping";
import { formatCLP } from "@/lib/format/clp";
import { formatDeadline, formatDeliveryDay } from "@/lib/format/dates";
import { asAddress } from "@/lib/orders/address";
import { cancelReason, orderStatusLine, type CustomerOrder } from "@/lib/orders/customer-view";
import { adminNextStep, estimatedDelivery } from "@/lib/orders/order-status";
import { paidWithLabel } from "@/lib/payments/labels";
import type { Json } from "@/types/database";

// Lista de pedidos de la administración (template AdminPedidos): filtros con su conteo, búsqueda,
// la nota bajo el estado y el botón del siguiente paso. Puro: lo usan la página y los tests.

export type AdminOrderPayment = CustomerOrder["payments"][number] & { provider: string; raw_response: Json };

/** El pedido como lo lee la lista (también el Detalle: es un subconjunto) */
export type AdminListOrder = Omit<CustomerOrder, "payments"> & {
  order_number: number;
  contact_email: string | null;
  carrier: string | null;
  tracking_number: string | null;
  payments: AdminOrderPayment[];
};

export const ADMIN_FILTERS = [
  { id: "accion", label: "Necesitan una acción" },
  { id: "transferencia", label: "Transferencia por confirmar" },
  { id: "preparar", label: "Por preparar" },
  { id: "preparacion", label: "En preparación" },
  { id: "camino", label: "En camino" },
  { id: "entregados", label: "Entregados" },
  { id: "anulados", label: "Anulados" },
  { id: "todos", label: "Todos" },
] as const;

export type AdminFilter = (typeof ADMIN_FILTERS)[number]["id"];

export function parseFilter(value: unknown): AdminFilter {
  return ADMIN_FILTERS.some((f) => f.id === value) ? (value as AdminFilter) : "accion";
}

/** Pedidos por página: *Ver más pedidos* suma otros tantos (?mostrar=40) */
export const PAGE_SIZE = 20;
const MAX_SHOWN = 500;

export function parseShown(value: unknown): number {
  const n = typeof value === "string" ? Number.parseInt(value, 10) : NaN;
  if (!Number.isFinite(n) || n <= PAGE_SIZE) return PAGE_SIZE;
  return Math.min(Math.ceil(n / PAGE_SIZE) * PAGE_SIZE, MAX_SHOWN);
}

/**
 * Un pedido anulado con un pago que todavía no se devuelve: la pasarela (por ejemplo, un reembolso
 * fallido o el 1042) o una transferencia que el admin devuelve a mano (decisión 5). null = nada.
 */
export function pendingRefund(order: Pick<AdminListOrder, "status" | "payments">): AdminOrderPayment | null {
  if (order.status !== "cancelled") return null;
  return order.payments.find((p) => p.status === "paid") ?? null;
}

export function needsAction(order: AdminListOrder): boolean {
  return adminNextStep(order.status, order.payment_method) !== null || pendingRefund(order) !== null;
}

export function matchesFilter(order: AdminListOrder, filter: AdminFilter): boolean {
  switch (filter) {
    case "accion":
      return needsAction(order);
    case "transferencia":
      return order.status === "pending" && order.payment_method === "transfer";
    case "preparar":
      return order.status === "paid";
    case "preparacion":
      return order.status === "processing";
    case "camino":
      return order.status === "shipped";
    case "entregados":
      return order.status === "delivered";
    case "anulados":
      return order.status === "cancelled" || order.status === "refunded";
    case "todos":
      return true;
  }
}

export function filterCounts(orders: AdminListOrder[]): Record<AdminFilter, number> {
  const counts = Object.fromEntries(ADMIN_FILTERS.map((f) => [f.id, 0])) as Record<AdminFilter, number>;
  for (const order of orders) {
    for (const { id } of ADMIN_FILTERS) if (matchesFilter(order, id)) counts[id]++;
  }
  return counts;
}

/** Búsqueda por N.º (*1041*, *N.º 1041*, *#1041*: también el comienzo del número) o por correo */
export function matchesSearch(order: Pick<AdminListOrder, "order_number" | "contact_email">, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const number = q.replace(/^(n\.?\s*º?|#)\s*/, "");
  if (/^\d+$/.test(number)) return String(order.order_number).startsWith(number);
  return (order.contact_email ?? "").toLowerCase().includes(q);
}

/**
 * Para la lista: la de *Necesitan una acción* va del más antiguo al más nuevo (se atiende en orden,
 * como dice el caption del artboard); las demás, del más nuevo al más antiguo.
 */
export function sortOrders<T extends Pick<AdminListOrder, "placed_at">>(orders: T[], filter: AdminFilter): T[] {
  const sign = filter === "accion" ? 1 : -1;
  return [...orders].sort((a, b) => sign * a.placed_at.localeCompare(b.placed_at));
}

/** *Martes 27 de octubre · 4 pedidos necesitan una acción* */
export function actionSummary(today: Date, count: number): string {
  const day = formatDeliveryDay(today);
  const text =
    count === 0 ? "Ningún pedido necesita una acción" : count === 1 ? "1 pedido necesita una acción" : `${count} pedidos necesitan una acción`;
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} · ${text}`;
}

const pickup = (order: Pick<AdminListOrder, "shipping_method">) => order.shipping_method === "pickup";

/** Texto del botón *Siguiente paso* de la fila. null = *Nada pendiente* */
export function nextStepLabel(order: AdminListOrder): string | null {
  switch (adminNextStep(order.status, order.payment_method)) {
    case "confirm_transfer":
      return "Confirmar pago";
    case "start_preparing":
      return "Empezar a preparar";
    case "mark_shipped":
      return pickup(order) ? "Marcar como listo" : "Marcar como enviado";
    case "mark_delivered":
      return pickup(order) ? "Marcar como retirado" : "Marcar como entregado";
    default:
      return pendingRefund(order) ? "Devolver el pago" : null;
  }
}

const clp = (value: number | string) => formatCLP(Math.round(Number(value)));

/** *Webpay Plus · tarjeta de débito*: el medio con que se pagó o, sin pago, el que eligió */
export function paymentLabel(order: Pick<AdminListOrder, "payment_method" | "payments">): string {
  const paid = order.payments.find((p) => p.status === "paid" || p.status === "refunded");
  if (paid && paid.provider !== "transfer") {
    const label = paidWithLabel(paid.provider, paid.raw_response);
    const [media, gateway] = label.split(" vía ");
    return gateway ? `${gateway} · ${media}` : label;
  }
  if (order.payment_method === "transfer") return "Transferencia";
  if (order.payment_method === "webpay") return "Webpay Plus";
  if (order.payment_method === "flow") return "Flow";
  return "Sin medio de pago";
}

/** *Despacho a domicilio · Providencia* · *Retiro en tienda* */
export function shippingLabel(order: Pick<AdminListOrder, "shipping_method" | "shipping_address">): string {
  const method = isShippingMethod(order.shipping_method) ? order.shipping_method : "standard";
  const commune = asAddress(order.shipping_address).city;
  return method === "pickup" || !commune ? shippingMethodLabel(method) : `${shippingMethodLabel(method)} · ${commune}`;
}

/** La línea gris bajo el `Badge` de la fila (propuestas para lo que el artboard no muestra) */
export function rowNote(order: AdminListOrder, now: Date): string {
  switch (order.status) {
    case "pending": {
      if (!order.expires_at) return "Sin plazo";
      const deadline = new Date(order.expires_at);
      return `${deadline <= now ? "Venció" : "Vence"} el ${formatDeadline(deadline)}`;
    }
    case "paid":
      return order.paid_at ? `Pagado el ${formatDeadline(new Date(order.paid_at))}` : "Pagado";
    case "processing":
      return estimatedDelivery(order)?.label ?? shippingLabel(order);
    case "shipped":
      if (pickup(order)) return "Listo para retirar";
      if (order.carrier) return order.tracking_number ? `${order.carrier} · ${order.tracking_number}` : order.carrier;
      return orderStatusLine(order, now);
    case "delivered":
      return orderStatusLine(order, now);
    case "refunded": {
      const refunded = order.payments.find((p) => p.status === "refunded");
      const at = refunded?.updated_at ?? order.cancelled_at;
      return at ? `Devuelto el ${formatDeliveryDay(new Date(at))}` : "Devuelto";
    }
    case "cancelled": {
      const reason = cancelReason(order);
      const base = reason === "vencio" ? "Venció" : reason === "cliente" ? "Lo anuló el cliente" : "Anulado por la tienda";
      const owed = pendingRefund(order);
      if (owed) return `${base} · falta devolver ${clp(owed.amount)}`;
      return order.payments.some((p) => p.status === "refunded") ? `${base} · pago devuelto` : base;
    }
  }
}
