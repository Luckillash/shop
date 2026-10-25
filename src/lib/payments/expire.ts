import "server-only";
import { revalidateTag } from "next/cache";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { reconcileFlow, reconcileWebpay } from "./service";

// Cron de vencimiento (06-implementacion/pago-transferencia.md): anula con cancel_order los
// pedidos pending con expires_at vencido, de cualquier medio. Antes consulta la pasarela del
// intento pending (el usuario pudo pagar y cerrar el navegador): si está pagado, lo registra.
// Idempotente: un pedido que ya no está pending no se vuelve a tocar.

const BATCH = 50;

export type ExpireSummary = { checked: number; cancelled: number; recovered: number; skipped: number };

export async function expireOrders(now = new Date()): Promise<ExpireSummary> {
  const admin = createSupabaseAdmin();
  const { data: orders, error } = await admin
    .from("orders")
    .select("id, order_number, payments(*), items:order_items(product_id)")
    .eq("status", "pending")
    .lt("expires_at", now.toISOString())
    .order("expires_at", { ascending: true })
    .limit(BATCH);
  if (error) throw error;

  const summary: ExpireSummary = { checked: orders.length, cancelled: 0, recovered: 0, skipped: 0 };

  for (const order of orders) {
    let paid = false;
    let busy = false;
    for (const payment of order.payments.filter((p) => p.status === "pending")) {
      const result =
        payment.provider === "webpay"
          ? await reconcileWebpay(payment, { final: true })
          : payment.provider === "flow"
            ? await reconcileFlow(payment, { final: true })
            : null;
      if (result?.status === "paid") paid = true;
      // Otro proceso lo está confirmando o la pasarela no respondió: se reintenta en la próxima pasada
      if (result?.status === "busy" || result?.status === "error") busy = true;
    }
    if (paid) {
      summary.recovered++;
      continue;
    }
    if (busy) {
      summary.skipped++;
      continue;
    }

    // Transferencias (y lo que quede pending): failed sin pasar por la pasarela
    const { error: failError } = await admin
      .from("payments")
      .update({ status: "failed" })
      .eq("order_id", order.id)
      .eq("status", "pending");
    if (failError) throw failError;

    // service_role: auth.uid() es null = staff. Si el pedido ya cambió de estado, falla y se ignora
    const { error: cancelError } = await admin.rpc("cancel_order", { p_order_id: order.id });
    if (cancelError) {
      console.warn(`[cron] pedido ${order.order_number} no se anuló:`, cancelError.message);
      summary.skipped++;
      continue;
    }
    summary.cancelled++;
    for (const productId of new Set(order.items.map((i) => i.product_id).filter(Boolean))) {
      revalidateTag(`stock:${productId}`, "max");
    }
  }
  if (summary.cancelled > 0) revalidateTag("products", "max");
  return summary;
}
