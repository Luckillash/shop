import "server-only";
import { greetingName } from "@/lib/account/profile";
import { createSupabaseServer } from "@/lib/supabase/server";

// Pedidos de la cuenta (/cuenta/pedidos). Con el cliente del usuario: el RLS de orders solo deja ver
// los propios. Además se filtra por user_id, porque el RLS de un admin deja ver todos y su cuenta
// debe mostrar solo los suyos. Las consultas con sesión se lanzan (trampa 58).

const ORDER_FIELDS = `id, order_number, status, payment_method, shipping_method, shipping_address, document_type,
  subtotal, discount_total, shipping_total, total, placed_at, paid_at, shipped_at, delivered_at, cancelled_at,
  expires_at, cancel_reason, cancel_note, carrier, tracking_number,
  items:order_items(id, variant_id, product_name, variant_name, unit_price, quantity,
    product:products(slug, images:product_images(url, alt, variant_id, sort_order))),
  payments(provider, status, amount, attempt, raw_response, updated_at)`;

/** Tope de la lista: no hay paginación en el diseño */
export const ORDERS_LIMIT = 50;

export async function getMyOrders(userId: string) {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_FIELDS)
    .eq("user_id", userId)
    .order("placed_at", { ascending: false })
    .limit(ORDERS_LIMIT);
  if (error) throw error;
  return data;
}

/** El pedido por su número, si es del usuario. Un número ajeno, inválido o inexistente da null */
export async function getMyOrder(userId: string, orderNumber: string) {
  if (!/^\d{1,12}$/.test(orderNumber)) return null;
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_FIELDS)
    .eq("user_id", userId)
    .eq("order_number", Number(orderNumber))
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type AccountOrder = Awaited<ReturnType<typeof getMyOrders>>[number];
export type AccountOrderItem = AccountOrder["items"][number];

/** La foto de la línea: la de su variante o la primera del producto */
export function itemImage(item: AccountOrderItem): { url: string; alt: string } | null {
  const images = [...(item.product?.images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const image = images.find((i) => i.variant_id === item.variant_id) ?? images[0];
  return image ? { url: image.url, alt: image.alt ?? item.product_name } : null;
}

/** El nombre de pila para *Hola, Camila* (first_name o, si no está, full_name; 7.5). null sin nombre */
export async function getFirstName(userId: string): Promise<string | null> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.from("profiles").select("first_name, full_name").eq("id", userId).maybeSingle();
  if (error) throw error;
  return greetingName(data);
}
