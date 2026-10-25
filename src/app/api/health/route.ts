import { connection } from "next/server";
import { getRedis } from "@/lib/redis";

export async function GET() {
  await connection();
  try {
    const redis = await getRedis();
    const pong = await redis.ping();
    return Response.json({ redis: pong });
  } catch (error) {
    return Response.json(
      { redis: "unavailable", error: describeError(error) },
      { status: 503 },
    );
  }
}

// Sin servidor, node-redis rechaza con un ReconnectStrategyError (mensaje vacío) que envuelve
// el error del socket: un AggregateError, también vacío, con los intentos por IPv6 e IPv4.
// Se revisa por forma porque son clases de otras librerías.
function describeError(error: unknown): string {
  const e = error as { message?: unknown; errors?: unknown; socketError?: unknown; originalError?: unknown };
  if (Array.isArray(e?.errors) && e.errors.length > 0) return e.errors.map(describeError).join("; ");
  const wrapped = e?.socketError ?? e?.originalError;
  if (wrapped && wrapped !== error) return describeError(wrapped);
  return typeof e?.message === "string" && e.message ? e.message : String(error);
}
