import { NextResponse, type NextRequest } from "next/server";
import { findPaymentByToken, reconcileFlow } from "@/lib/payments/service";

// urlReturn de Flow (navegador). Flow vuelve con el token por POST; se acepta también GET. No se
// espera a la confirmación (puede llegar después): getStatus aquí mismo. 303 al resultado.

async function readToken(request: NextRequest): Promise<string | null> {
  let token = request.nextUrl.searchParams.get("token");
  if (!token && request.method === "POST") {
    try {
      const value = (await request.formData()).get("token");
      token = typeof value === "string" ? value : null;
    } catch {
      token = null;
    }
  }
  return token?.trim() || null;
}

function to(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, process.env.NEXT_PUBLIC_SITE_URL ?? request.url), 303);
}

async function handle(request: NextRequest) {
  const token = await readToken(request);
  if (!token) return to(request, "/pedido/no-encontrado");
  try {
    const payment = await findPaymentByToken("flow", token);
    if (!payment) return to(request, "/pedido/no-encontrado");
    const result = await reconcileFlow(payment);
    if (result.status === "failed") return to(request, `/pedido/${result.orderId}/pago-rechazado`);
    // paid → Confirmación · pending/busy/error → *Estamos confirmando tu pago*, que vuelve a consultar
    return to(request, `/pedido/${result.orderId}`);
  } catch (error) {
    console.error("[flow] retorno", error);
    return to(request, "/pedido/no-encontrado?error=1");
  }
}

export const GET = handle;
export const POST = handle;
