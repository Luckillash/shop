import type { NextRequest } from "next/server";
import { findPaymentByToken, reconcileFlow } from "@/lib/payments/service";

// urlConfirmation de Flow (servidor a servidor, 06-implementacion/pagos-flow.md). Llega solo el
// token por POST form-urlencoded: el estado real sale de getStatus (trampa 33). Hay que responder
// 200 en menos de 15 s: getStatus tiene un timeout de 10 s y los correos van en after().
// Idempotente: si Flow la repite y el intento ya está paid, no hace nada.

export async function POST(request: NextRequest) {
  let token: string | null = null;
  try {
    const form = await request.formData();
    const value = form.get("token");
    token = typeof value === "string" && value.trim() ? value.trim() : null;
  } catch {
    token = null;
  }
  if (!token) return new Response("token requerido", { status: 400 });

  try {
    const payment = await findPaymentByToken("flow", token);
    // Un token que no es nuestro: 200 para que Flow no siga reintentando
    if (!payment) {
      console.warn("[flow] confirmación con un token desconocido");
      return new Response("ok");
    }
    const result = await reconcileFlow(payment);
    // error: Flow no respondió getStatus. 503 para que lo reintente
    if (result.status === "error") return new Response("reintentar", { status: 503 });
    return new Response("ok");
  } catch (error) {
    console.error("[flow] confirmación", error);
    return new Response("error", { status: 500 });
  }
}
