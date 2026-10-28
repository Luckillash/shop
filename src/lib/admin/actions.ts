"use server";

import { refresh, revalidateTag } from "next/cache";
import { after } from "next/server";
import { getAdminUser } from "@/lib/auth/session";
import { sendOrderEmail } from "@/lib/email/order-emails";
import { formatCLP } from "@/lib/format/clp";
import { canTransition, isCancellable, type OrderStatus } from "@/lib/orders/order-status";
import { refundOrderPayment } from "@/lib/payments/service";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";
import { pendingRefund } from "./order-list";
import { cancelPlan, isUuid, parseCancelNote, parseOperationNumber, parseShipment, type ShipmentErrors } from "./validation";

// Acciones de /admin (AdminPedido, AdminAnularPedido, AdminAlertas). Cada una: getAdminUser() (el
// layout no protege las acciones, D-025), vuelve a leer el pedido, valida la transición con
// canTransition y la entrada en el servidor, y escribe con una función SQL de la M9 que indica al
// admin como actor del historial en la misma transacción. Los montos salen de la BD. Los correos van
// en after() (D-022), después del reembolso, para que la anulación diga *Te devolvimos $X*.

export type AdminActionState =
  | { status: "idle" }
  | { status: "done"; message: string; tone?: "success" | "warning" }
  | { status: "error"; message: string; errors?: ShipmentErrors & { operation?: string; note?: string } };

const SESSION = "Tu sesión de administración terminó. Vuelve a ingresar para seguir.";
const STALE = "El pedido cambió mientras lo mirabas. Recarga la página para ver cómo quedó.";
const FAILED = "No pudimos guardar el cambio. Vuelve a intentarlo en unos minutos.";

const GATEWAY: Record<string, string> = { webpay: "Webpay Plus", flow: "Flow" };

async function readOrder(orderId: string) {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("orders")
    .select("id, status, payment_method, shipping_method, total, paid_at, items:order_items(product_id), payments(provider, status, amount, updated_at, raw_response)")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** La sesión es admin y el id es un pedido. Lo que devuelve null o un string es el error a mostrar */
async function start(formData: FormData) {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, error: SESSION } as const;
  const orderId = formData.get("orderId");
  if (!isUuid(orderId)) return { ok: false, error: STALE } as const;
  const order = await readOrder(orderId);
  if (!order) return { ok: false, error: STALE } as const;
  return { ok: true, admin, order } as const;
}

function rpcFailure(error: { message: string; hint?: string | null }, label: string): AdminActionState {
  if (error.hint === "stale" || error.hint === "transition" || error.hint === "not_found") return { status: "error", message: STALE };
  if (error.hint === "forbidden") return { status: "error", message: SESSION };
  console.error(`[admin] ${label}`, error);
  return { status: "error", message: FAILED };
}

const clp = (value: number | string) => formatCLP(Math.round(Number(value)));

// ----- Confirmar pago recibido (transferencia) -----

export async function confirmTransfer(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const ctx = await start(formData);
  if (!ctx.ok) return { status: "error", message: ctx.error };
  const { admin, order } = ctx;

  const operation = parseOperationNumber(formData.get("operation"));
  if (!operation.ok) return { status: "error", message: operation.error, errors: { operation: operation.error } };
  if (order.payment_method !== "transfer" || !canTransition(order.status, "paid")) return { status: "error", message: STALE };

  const { data: state, error } = await createSupabaseAdmin().rpc("admin_confirm_transfer", {
    p_order_id: order.id,
    p_admin_id: admin.id,
    p_operation: operation.value ?? undefined,
  });
  if (error) return rpcFailure(error, "confirmar transferencia");
  if (state !== "paid") return { status: "error", message: STALE };

  after(() => sendOrderEmail(order.id, "confirmed", { actor: "admin", actorId: admin.id }));
  refresh();
  return { status: "done", message: "Listo: confirmamos el pago y el pedido quedó por preparar. Le enviamos al cliente el correo de pedido confirmado." };
}

// ----- Empezar a preparar · Marcar como enviado · Marcar como entregado -----

async function advance(formData: FormData, to: Extract<OrderStatus, "processing" | "shipped" | "delivered">): Promise<AdminActionState> {
  const ctx = await start(formData);
  if (!ctx.ok) return { status: "error", message: ctx.error };
  const { admin, order } = ctx;
  if (!canTransition(order.status, to)) return { status: "error", message: STALE };

  let carrier: string | null = null;
  let tracking: string | null = null;
  if (to === "shipped") {
    const shipment = parseShipment({ carrier: formData.get("carrier"), tracking: formData.get("tracking") }, order.shipping_method === "pickup");
    if (!shipment.ok) return { status: "error", message: "Revisa los datos del envío.", errors: shipment.errors };
    ({ carrier, tracking } = shipment.value);
  }

  const { error } = await createSupabaseAdmin().rpc("admin_advance_order", {
    p_order_id: order.id,
    p_admin_id: admin.id,
    p_from: order.status,
    p_to: to,
    p_carrier: carrier ?? undefined,
    p_tracking: tracking ?? undefined,
  });
  if (error) return rpcFailure(error, `pasar a ${to}`);

  // En el retiro en tienda, shipped es *Listo para retirar* y el correo cambia solo (D-028)
  if (to === "shipped") after(() => sendOrderEmail(order.id, "shipped", { actor: "admin", actorId: admin.id }));
  refresh();
  const pickup = order.shipping_method === "pickup";
  const message =
    to === "processing"
      ? "Listo: el pedido quedó en preparación."
      : to === "shipped"
        ? pickup
          ? "Listo: le avisamos al cliente por correo que puede retirarlo."
          : "Listo: el pedido quedó en camino. Le enviamos al cliente el correo con el seguimiento."
        : pickup
          ? "Listo: el pedido quedó retirado."
          : "Listo: el pedido quedó entregado.";
  return { status: "done", message };
}

export async function startPreparing(_prev: AdminActionState, formData: FormData) {
  return advance(formData, "processing");
}

export async function markShipped(_prev: AdminActionState, formData: FormData) {
  return advance(formData, "shipped");
}

export async function markDelivered(_prev: AdminActionState, formData: FormData) {
  return advance(formData, "delivered");
}

// ----- Anular el pedido (AdminAnularPedido) -----

function revalidateStock(items: { product_id: string | null }[]) {
  for (const productId of new Set(items.map((i) => i.product_id).filter(Boolean))) revalidateTag(`stock:${productId}`, "max");
  revalidateTag("products", "max");
}

/** Reembolso en la pasarela y, si sale bien, Anulado → Reembolsado. false = falló (alerta refund_failed) */
async function refundAndMark(orderId: string, adminId: string): Promise<boolean> {
  if (!(await refundOrderPayment(orderId, adminId))) return false;
  const { error } = await createSupabaseAdmin().rpc("admin_mark_refunded", { p_order_id: orderId, p_admin_id: adminId, p_manual: false });
  if (error) console.error("[admin] marcar reembolsado", error);
  return true;
}

export async function cancelOrder(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const ctx = await start(formData);
  if (!ctx.ok) return { status: "error", message: ctx.error };
  const { admin, order } = ctx;
  if (!isCancellable(order.status)) return { status: "error", message: STALE };

  const note = parseCancelNote(formData.get("motive"), formData.get("note"));
  if (!note.ok) return { status: "error", message: note.error, errors: { note: note.error } };
  const notify = formData.get("notify") === "on";
  const plan = cancelPlan(order);

  const { error } = await createSupabaseAdmin().rpc("admin_cancel_order", {
    p_order_id: order.id,
    p_admin_id: admin.id,
    p_from: order.status,
    p_note: note.value ?? undefined,
  });
  if (error) return rpcFailure(error, "anular");
  revalidateStock(order.items);

  let result: AdminActionState = { status: "done", message: "Listo: anulamos el pedido y los productos volvieron al stock." };
  if (plan.refund === "gateway") {
    const paid = order.payments.find((p) => p.status === "paid");
    const gateway = GATEWAY[paid?.provider ?? ""] ?? "la pasarela";
    result = (await refundAndMark(order.id, admin.id))
      ? { status: "done", message: `Listo: anulamos el pedido y devolvimos ${clp(plan.amount)} en ${gateway}.` }
      : {
          status: "done",
          tone: "warning",
          message: `Anulamos el pedido, pero el reembolso en ${gateway} falló y quedó una alerta de pago. Vuelve a intentarlo desde aquí.`,
        };
  } else if (plan.refund === "transfer") {
    result = {
      status: "done",
      tone: "warning",
      message: `Anulamos el pedido. Devuélvele ${clp(plan.amount)} por transferencia y después marca Ya devolví el dinero.`,
    };
  }

  // Después del reembolso: el correo lee el intento ya devuelto (*Te devolvimos $X*)
  if (notify) after(() => sendOrderEmail(order.id, "cancelled", { actor: "admin", actorId: admin.id }));
  refresh();
  return result;
}

// ----- Devolver el pago de un pedido ya anulado -----

/** En la pasarela: el 1042, o un reembolso que falló al anular (alerta refund_failed) */
export async function refundCancelledOrder(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const ctx = await start(formData);
  if (!ctx.ok) return { status: "error", message: ctx.error };
  const { admin, order } = ctx;
  const owed = pendingRefund(order);
  if (!owed || owed.provider === "transfer" || !canTransition(order.status, "refunded")) return { status: "error", message: STALE };

  const gateway = GATEWAY[owed.provider] ?? "la pasarela";
  const done = await refundAndMark(order.id, admin.id);
  refresh();
  return done
    ? { status: "done", message: `Listo: devolvimos ${clp(owed.amount)} en ${gateway} y el pedido quedó reembolsado.` }
    : {
        status: "error",
        message: `El reembolso en ${gateway} falló y quedó una alerta de pago con la respuesta de ${gateway}. Vuelve a intentarlo más tarde, o hazlo a mano en su panel y marca la alerta como resuelta.`,
      };
}

/** Transferencia que el admin devolvió a mano (decisión 5): Anulado → Reembolsado */
export async function markTransferRefunded(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const ctx = await start(formData);
  if (!ctx.ok) return { status: "error", message: ctx.error };
  const { admin, order } = ctx;
  const owed = pendingRefund(order);
  if (!owed || owed.provider !== "transfer" || !canTransition(order.status, "refunded")) return { status: "error", message: STALE };

  const { error } = await createSupabaseAdmin().rpc("admin_mark_refunded", { p_order_id: order.id, p_admin_id: admin.id, p_manual: true });
  if (error) return rpcFailure(error, "marcar transferencia devuelta");
  refresh();
  return { status: "done", message: "Listo: el pedido quedó reembolsado." };
}

// ----- Alertas de pago -----

export async function resolveAlert(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const admin = await getAdminUser();
  if (!admin) return { status: "error", message: SESSION };
  const alertId = formData.get("alertId");
  if (!isUuid(alertId)) return { status: "error", message: FAILED };

  const { data, error } = await createSupabaseAdmin().rpc("admin_resolve_alert", { p_alert_id: alertId, p_admin_id: admin.id });
  if (error) return rpcFailure(error, "resolver alerta");
  refresh();
  return data ? { status: "done", message: "Alerta resuelta." } : { status: "error", message: "Esta alerta ya estaba resuelta. Recarga la página." };
}
