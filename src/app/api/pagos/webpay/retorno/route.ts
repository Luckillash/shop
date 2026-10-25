import { NextResponse, type NextRequest } from "next/server";
import { parseWebpayReturn } from "@/lib/payments/webpay-core";
import {
  failWebpayAttempt,
  findPaymentByReference,
  findPaymentByToken,
  reconcileWebpay,
} from "@/lib/payments/service";

// return_url de Webpay Plus (06-implementacion/pagos-webpay-plus.md). No hay webhooks: el
// navegador vuelve aquí por GET o por POST (el abortado en integración llega por POST, trampa 28).
// Sin cookies de sesión (el POST viene de otro sitio): todo con el cliente admin y el token.
// Siempre 303: un 307 repetiría el POST en la página del pedido.

async function readParams(request: NextRequest): Promise<URLSearchParams> {
  const params = new URLSearchParams(request.nextUrl.searchParams);
  if (request.method === "POST") {
    const type = request.headers.get("content-type") ?? "";
    if (type.includes("application/x-www-form-urlencoded") || type.includes("multipart/form-data")) {
      const form = await request.formData();
      for (const [key, value] of form) if (typeof value === "string") params.set(key, value);
    }
  }
  return params;
}

function to(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, process.env.NEXT_PUBLIC_SITE_URL ?? request.url), 303);
}

async function handle(request: NextRequest) {
  const params = await readParams(request);
  const parsed = parseWebpayReturn(params);

  try {
    if (parsed.kind === "commit") {
      const payment = await findPaymentByToken("webpay", parsed.token);
      if (!payment) return to(request, "/pedido/no-encontrado");
      // Recarga o doble envío: si ya no está pending, reconcileWebpay no hace commit
      const result = await reconcileWebpay(payment);
      if (result.status === "failed") return to(request, `/pedido/${result.orderId}/pago-rechazado`);
      // paid, refunded (B13), busy (otro proceso confirma) o error: la página del pedido muestra
      // la Confirmación o *Estamos confirmando tu pago*
      return to(request, `/pedido/${result.orderId}`);
    }

    if (parsed.kind === "aborted" || parsed.kind === "timeout") {
      const payment =
        parsed.kind === "aborted"
          ? ((await findPaymentByToken("webpay", parsed.token)) ??
            (parsed.buyOrder ? await findPaymentByReference("webpay", parsed.buyOrder) : null))
          : await findPaymentByReference("webpay", parsed.buyOrder);
      // TBK_ID_SESION es el orderId: si no coincide, no es nuestro intento
      if (!payment || (parsed.sessionId && parsed.sessionId !== payment.order_id)) {
        return to(request, "/pedido/no-encontrado");
      }
      await failWebpayAttempt(payment, parsed.kind, Object.fromEntries(params));
      return to(request, `/pedido/${payment.order_id}/pago-rechazado`);
    }
  } catch (error) {
    console.error("[webpay] retorno", error);
    return to(request, "/pedido/no-encontrado?error=1");
  }

  return to(request, "/pedido/no-encontrado");
}

export const GET = handle;
export const POST = handle;
