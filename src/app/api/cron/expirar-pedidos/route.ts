import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { expireOrders } from "@/lib/payments/expire";

// Cron de vencimiento (Vercel Cron cada 10 min, vercel.json). Vercel envía
// Authorization: Bearer ${CRON_SECRET}. En local: curl -H "Authorization: Bearer …".

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const wanted = Buffer.from(`Bearer ${secret}`);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}

async function handle(request: NextRequest) {
  if (!authorized(request)) return Response.json({ error: "No autorizado" }, { status: 401 });
  try {
    const summary = await expireOrders();
    console.info("[cron] expirar-pedidos", summary);
    return Response.json(summary);
  } catch (error) {
    console.error("[cron] expirar-pedidos", error);
    return Response.json({ error: "Falló el cron" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
