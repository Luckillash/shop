import "server-only";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

// Pedido para las pantallas de resultado del pago (/pedido/[id], pago-rechazado, transferencia).
// Con el cliente del usuario: el RLS de orders y payments solo deja ver lo propio (también al
// invitado, con su sesión anónima). Un pedido ajeno o inexistente devuelve null.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isOrderId(id: unknown): id is string {
  return typeof id === "string" && UUID.test(id);
}

export async function getOrderView(id: string) {
  if (!isOrderId(id)) return null;
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("orders")
    .select(
      `id, order_number, user_id, status, subtotal, discount_total, shipping_total, total, contact_email,
       shipping_method, payment_method, document_type, shipping_address, expires_at, placed_at, paid_at,
       items:order_items(id, product_id, product_name, variant_name, unit_price, quantity),
       payments(id, provider, status, attempt, reference, amount, raw_response, created_at)`,
    )
    .eq("id", id)
    .maybeSingle();
  // Las consultas con sesión se lanzan para que React maneje el aborto del prerender (trampa 58)
  if (error) throw error;
  return data;
}

export type OrderView = NonNullable<Awaited<ReturnType<typeof getOrderView>>>;

export type ShippingAddress = {
  type?: string;
  recipient_name?: string;
  line1?: string;
  line2?: string | null;
  city?: string;
  region?: string;
};

export function asAddress(value: Json): ShippingAddress {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as ShippingAddress) : {};
}

/** "Av. Providencia 1234, depto. 502, Providencia, Región Metropolitana" */
export function addressLine(address: ShippingAddress, withRegion = true): string {
  return [address.line1, address.line2, address.city, withRegion ? address.region : null].filter(Boolean).join(", ");
}
