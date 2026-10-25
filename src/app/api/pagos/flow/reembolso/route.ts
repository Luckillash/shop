import type { NextRequest } from "next/server";
import { getRefundStatus } from "@/lib/payments/flow";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

// urlCallBack de refund/create (Flow): avisa cuando el reembolso se acepta o se rechaza. Solo trae
// token: el estado sale de refund/getStatus. Se guarda en el intento (raw_response.refund_status);
// si Flow lo rechazó, queda una alerta refund_failed para el admin.

export async function POST(request: NextRequest) {
  let token: string | null = null;
  try {
    const value = (await request.formData()).get("token");
    token = typeof value === "string" && value.trim() ? value.trim() : null;
  } catch {
    token = null;
  }
  if (!token) return new Response("token requerido", { status: 400 });

  try {
    const status = await getRefundStatus(token);
    const admin = createSupabaseAdmin();
    // El token del reembolso quedó en payments.raw_response.refund.token al crearlo
    const { data: payment, error } = await admin
      .from("payments")
      .select("id, order_id, raw_response")
      .eq("provider", "flow")
      .eq("raw_response->refund->>token", token)
      .maybeSingle();
    if (error) throw error;
    if (!payment) {
      console.warn("[flow] reembolso con un token desconocido", status);
      return new Response("ok");
    }
    const raw = payment.raw_response && typeof payment.raw_response === "object" && !Array.isArray(payment.raw_response) ? payment.raw_response : {};
    await admin.from("payments").update({ raw_response: { ...raw, refund_status: status } as Json }).eq("id", payment.id);
    if (status.status === "rejected") {
      await admin.from("payment_alerts").insert({
        order_id: payment.order_id,
        payment_id: payment.id,
        kind: "refund_failed",
        detail: { refund_status: status } as Json,
      });
    }
  } catch (error) {
    console.error("[flow] reembolso", error);
  }
  return new Response("ok");
}
