import "server-only";
import { bankDetails, siteUrl } from "@/lib/payments/config";
import { bankRows } from "@/lib/payments/labels";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail, type Email } from "./send";
import {
  lateRefundEmail,
  orderCancelledEmail,
  orderConfirmedEmail,
  orderLink,
  orderShippedEmail,
  transferInstructionsEmail,
  type EmailOrder,
} from "./templates";

// Correos de un pedido: lee el pedido con el cliente admin, arma el correo (templates.ts), lo envía
// (send.ts) y lo deja en el historial (order_events, kind = 'email', D-025). Nunca lanza: el pedido
// no depende del correo. Llamar dentro de after() desde las acciones y las rutas (D-022).

type Admin = ReturnType<typeof createSupabaseAdmin>;

export type OrderEmailKind = "confirmed" | "shipped" | "cancelled" | "transfer" | "late_refund";

/** Quién lo provocó, para el historial. Por defecto el sistema (pasarelas, cron) */
export type EmailActor = { actor: "system" | "admin" | "customer"; actorId?: string | null };

const ORDER_FIELDS = `id, order_number, user_id, status, contact_email, payment_method, shipping_method,
  shipping_address, subtotal, discount_total, shipping_total, total, placed_at, paid_at, shipped_at,
  delivered_at, cancelled_at, expires_at, cancel_reason, cancel_note, carrier, tracking_number,
  items:order_items(product_name, variant_name, quantity, unit_price, line_total, created_at),
  payments(provider, status, amount, raw_response, updated_at)`;

/** Estados en que tiene sentido cada correo: evita, por ejemplo, un *va en camino* de un pedido anulado */
const VALID_STATUS: Record<OrderEmailKind, readonly string[]> = {
  confirmed: ["paid", "processing", "shipped", "delivered"],
  shipped: ["shipped"],
  cancelled: ["cancelled", "refunded"],
  transfer: ["pending"],
  late_refund: ["cancelled", "refunded"],
};

/**
 * ¿El dueño del pedido tiene cuenta? auth.users.is_anonymous con la llave secreta, solo en el
 * servidor: el correo lleva el enlace que corresponde y no se expone nada más (D-028).
 */
async function hasAccount(admin: Admin, userId: string | null): Promise<boolean> {
  if (!userId) return false;
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) return false;
  return !data.user.is_anonymous;
}

async function buildEmail(admin: Admin, order: EmailOrder & { user_id: string | null }, kind: OrderEmailKind): Promise<Email> {
  const site = siteUrl();
  const guestUrl = `${site}/pedido/${order.id}`;
  const total = Math.round(Number(order.total));
  switch (kind) {
    case "confirmed":
    case "shipped": {
      const account = await hasAccount(admin, order.user_id);
      const links = { order: orderLink(site, order, account), store: site, hasAccount: account };
      return kind === "confirmed" ? orderConfirmedEmail(order, links) : orderShippedEmail(order, links, new Date());
    }
    case "cancelled":
      return orderCancelledEmail(order, { order: guestUrl, store: site });
    // La pantalla de la transferencia y la de *Te devolvimos el pago* están en /pedido/<id>,
    // también para quien tiene cuenta
    case "transfer":
      return transferInstructionsEmail({
        to: order.contact_email,
        orderNumber: order.order_number,
        total,
        orderUrl: guestUrl,
        expiresAt: new Date(order.expires_at!),
        bank: bankRows(bankDetails(), total, order.order_number),
      });
    case "late_refund":
      return lateRefundEmail({ to: order.contact_email, orderNumber: order.order_number, total, orderUrl: guestUrl });
  }
}

/** Envía el correo `kind` del pedido. true = enviado y registrado */
export async function sendOrderEmail(orderId: string, kind: OrderEmailKind, by: EmailActor = { actor: "system" }): Promise<boolean> {
  try {
    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from("orders")
      .select(ORDER_FIELDS)
      .eq("id", orderId)
      .order("created_at", { referencedTable: "order_items" })
      .single();
    if (error) throw error;
    if (!data.contact_email) return false;
    if (!VALID_STATUS[kind].includes(data.status)) {
      console.warn(`[email] Pedido ${data.order_number} en ${data.status}: no se envía "${kind}"`);
      return false;
    }
    if (kind === "transfer" && !data.expires_at) return false;

    const email = await buildEmail(admin, { ...data, contact_email: data.contact_email }, kind);
    const resendId = await sendEmail(email);
    if (resendId === null) return false;

    const { error: eventError } = await admin.from("order_events").insert({
      order_id: orderId,
      kind: "email",
      actor: by.actor,
      actor_id: by.actorId ?? null,
      data: { template: kind, subject: email.subject, resend_id: resendId },
    });
    if (eventError) console.error("[email] No se registró el correo en order_events", eventError.message);
    return true;
  } catch (error) {
    console.error(`[email] No se pudo preparar el correo "${kind}" del pedido ${orderId}`, error);
    return false;
  }
}
