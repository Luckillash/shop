import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { cleanupAnonymousUsers } from "@/lib/auth/anon-cleanup";
import { expireOrders } from "@/lib/payments/expire";

// Cron diario (Vercel Cron, vercel.json: diario en Hobby; cada 10 min con Pro). Vercel envía
// Authorization: Bearer ${CRON_SECRET}. En local: curl -H "Authorization: Bearer …".
// Dos trabajos independientes: vencer pedidos y, desde la 7.8 (D-033), limpiar invitados sin
// pedidos. Si uno falla, el otro corre igual y la respuesta es 500 con el error de ese trabajo.

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const wanted = Buffer.from(`Bearer ${secret}`);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}

async function runJob<T>(name: string, job: () => Promise<T>): Promise<T | { error: string }> {
  try {
    const summary = await job();
    console.info(`[cron] ${name}`, summary);
    return summary;
  } catch (error) {
    console.error(`[cron] ${name}`, error);
    return { error: "Falló el trabajo" };
  }
}

async function handle(request: NextRequest) {
  if (!authorized(request)) return Response.json({ error: "No autorizado" }, { status: 401 });
  const expire = await runJob("expirar-pedidos", () => expireOrders());
  const anonymous = await runJob("limpiar-anonimos", () => cleanupAnonymousUsers());
  const failed = "error" in expire || "error" in anonymous;
  return Response.json({ expire, anonymous }, { status: failed ? 500 : 200 });
}

export const GET = handle;
export const POST = handle;
