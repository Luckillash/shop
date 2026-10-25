"use server";

import { getRedis } from "@/lib/redis";
import { createRateLimiter, PAYMENT_RATE_LIMIT } from "@/lib/rate-limit";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";
import { isPaymentProvider } from "./labels";
import { latestAttempt, orderScreen, type OrderScreen } from "./screen";
import { reconcileFlow } from "./service";
import { startPaymentOrRedirect, type PaymentStart } from "./start";

// Reintentar el pago o cambiar de medio sobre el mismo pedido (checkout-y-pedidos.md, «Reintentar»)
// y volver a consultar un pago que quedó pendiente. Cada acción verifica la sesión y que el pedido
// sea del usuario con su propio cliente (RLS); recién entonces usa el cliente admin.

const rateLimiter = createRateLimiter(getRedis);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type RetryState = { status: "idle" } | PaymentStart;

/** El pedido es del usuario de la sesión (o null). El RLS de orders filtra los ajenos */
async function ownOrder(orderId: string): Promise<{ userId: string } | null> {
  if (!UUID.test(orderId)) return null;
  const supabase = await createSupabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return null;
  const { data, error } = await supabase.from("orders").select("id").eq("id", orderId).maybeSingle();
  if (error) throw error;
  return data ? { userId } : null;
}

export async function retryPayment(_prev: RetryState, formData: FormData): Promise<RetryState> {
  const orderId = String(formData.get("orderId") ?? "");
  const method = formData.get("paymentMethod");
  if (!isPaymentProvider(method)) return { status: "error", message: "Elige cómo quieres pagar." };

  const owner = await ownOrder(orderId);
  if (!owner) return { status: "error", message: "Tu sesión terminó. Vuelve a ingresar para pagar este pedido." };

  if (await rateLimiter.isLimited(PAYMENT_RATE_LIMIT, owner.userId)) {
    return { status: "error", message: "Hiciste muchos intentos seguidos. Espera unos minutos y vuelve a intentarlo." };
  }
  await rateLimiter.hit(PAYMENT_RATE_LIMIT, owner.userId);

  return startPaymentOrRedirect(orderId, method);
}

/**
 * *Estamos confirmando tu pago*: vuelve a preguntar a Flow por el último intento (Webpay no: su
 * commit solo lo hace el retorno, y un commit antes de pagar lo rechaza). Devuelve la pantalla.
 */
export async function checkPayment(orderId: string): Promise<OrderScreen | null> {
  if (!(await ownOrder(orderId))) return null;
  const admin = createSupabaseAdmin();
  const { data: order, error } = await admin
    .from("orders")
    .select("status, expires_at, payments(*)")
    .eq("id", orderId)
    .single();
  if (error) throw error;

  const latest = latestAttempt(order.payments);
  if (latest?.provider === "flow" && latest.status === "pending") {
    await reconcileFlow(latest);
    const { data: fresh, error: freshError } = await admin
      .from("orders")
      .select("status, expires_at, payments(provider, status, attempt)")
      .eq("id", orderId)
      .single();
    if (freshError) throw freshError;
    return orderScreen(fresh, new Date());
  }
  return orderScreen(order, new Date());
}
