import "server-only";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";

// Lecturas de /admin. Con el cliente del usuario: el RLS deja leer todo solo a un admin (is_admin()),
// así que una sesión que no lo sea recibe 0 filas aunque llegara hasta aquí. La llave secreta solo se
// usa para saber si el cliente tiene cuenta (auth.users), como en los correos (D-028). Las páginas
// llaman antes a requireAdmin(). Las consultas con sesión se lanzan (trampa 58).

const LIST_FIELDS = `id, order_number, status, contact_email, payment_method, shipping_method, shipping_address,
  total, placed_at, paid_at, shipped_at, delivered_at, cancelled_at, expires_at, cancel_reason, cancel_note,
  carrier, tracking_number, payments(provider, status, amount, raw_response, updated_at)`;

/**
 * Todos los pedidos con lo que necesitan la lista, sus conteos y la búsqueda (se filtra en
 * order-list.ts). Alcanza para una tienda chica; con miles de pedidos convendría contar en la BD.
 */
export async function getAdminOrders() {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.from("orders").select(LIST_FIELDS).order("placed_at", { ascending: false }).limit(5000);
  if (error) throw error;
  return data;
}

export type AdminOrderRow = Awaited<ReturnType<typeof getAdminOrders>>[number];

const DETAIL_FIELDS = `id, order_number, user_id, status, contact_email, customer_rut, payment_method, shipping_method,
  shipping_address, document_type, subtotal, discount_total, shipping_total, tax_total, total, placed_at, paid_at,
  shipped_at, delivered_at, cancelled_at, expires_at, cancel_reason, cancel_note, carrier, tracking_number, notes,
  items:order_items(id, product_name, variant_name, sku, unit_price, quantity, line_total, created_at,
    product:products(slug, images:product_images(url, alt, variant_id, sort_order)), variant_id),
  payments(id, provider, status, amount, attempt, reference, raw_response, created_at, updated_at),
  events:order_events(kind, actor, created_at, data)`;

/** El pedido para AdminPedido, o null (número inválido o inexistente) */
export async function getAdminOrder(orderNumber: string) {
  if (!/^\d{1,12}$/.test(orderNumber)) return null;
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("orders")
    .select(DETAIL_FIELDS)
    .eq("order_number", Number(orderNumber))
    .order("created_at", { referencedTable: "order_items" })
    .order("attempt", { referencedTable: "payments", ascending: false })
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type AdminOrder = NonNullable<Awaited<ReturnType<typeof getAdminOrder>>>;

/** *Compró sin cuenta · 1 pedido anterior*: si tiene cuenta y cuántos pedidos hizo antes con ese correo */
export async function getCustomerSummary(order: Pick<AdminOrder, "user_id" | "contact_email" | "placed_at">) {
  const supabase = await createSupabaseServer();
  let previous = 0;
  if (order.contact_email) {
    const { count, error } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("contact_email", order.contact_email)
      .lt("placed_at", order.placed_at);
    if (error) throw error;
    previous = count ?? 0;
  }
  let hasAccount = false;
  if (order.user_id) {
    const { data } = await createSupabaseAdmin().auth.admin.getUserById(order.user_id);
    hasAccount = data.user ? !data.user.is_anonymous : false;
  }
  return { hasAccount, previous };
}

/** Alertas de pago con su pedido y su intento. `resolved` = las resueltas (las más recientes primero) */
export async function getPaymentAlerts(resolved: boolean, limit = 100) {
  const supabase = await createSupabaseServer();
  let query = supabase
    .from("payment_alerts")
    .select("id, kind, detail, created_at, resolved_at, order:orders(order_number), payment:payments(provider, amount, reference, provider_payment_id)")
    .limit(limit);
  query = resolved
    ? query.not("resolved_at", "is", null).order("resolved_at", { ascending: false })
    : query.is("resolved_at", null).order("created_at", { ascending: false });
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export type PaymentAlertRow = Awaited<ReturnType<typeof getPaymentAlerts>>[number];

/** Conteo de alertas sin resolver (el número rojo de AdminHeader) y de resueltas */
export async function getAlertCounts(): Promise<{ open: number; resolved: number }> {
  const supabase = await createSupabaseServer();
  const [open, resolved] = await Promise.all([
    supabase.from("payment_alerts").select("id", { count: "exact", head: true }).is("resolved_at", null),
    supabase.from("payment_alerts").select("id", { count: "exact", head: true }).not("resolved_at", "is", null),
  ]);
  if (open.error) throw open.error;
  if (resolved.error) throw resolved.error;
  return { open: open.count ?? 0, resolved: resolved.count ?? 0 };
}
