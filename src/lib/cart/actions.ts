"use server";

import { headers } from "next/headers";
import { getRedis } from "@/lib/redis";
import { clientIp, COUPON_RATE_LIMIT, createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { CartItem } from "@/store/cart-store";
import {
  couponFailureReason,
  couponMessage,
  countsAsFailedAttempt,
  normalizeCouponCode,
  type CouponResult,
} from "./coupon";
import type { CartSnapshot } from "./reconcile";
import { loadSnapshots, syncUserCart } from "./server";
import { sanitizeLines, serverSubtotal } from "./snapshot";

// Acciones del carro. Sin sesión el carro vive solo en Zustand y refreshCart/applyCoupon solo leen.
// Con sesión, syncCart escribe cart_items (D-018); el checkout lo llama antes de place_order.

const rateLimiter = createRateLimiter(getRedis);

// Usuario de la sesión, verificado (getClaims). null sin sesión: el límite por usuario
// del cupón lo revisa place_order.
async function sessionUserId(): Promise<string | null> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getClaims();
  return data?.claims.sub ?? null;
}

async function checkCoupon(code: string, subtotal: number, ip: string): Promise<CouponResult> {
  if (await rateLimiter.isLimited(COUPON_RATE_LIMIT, ip)) {
    return { ok: false, reason: "rate_limited", message: couponMessage("rate_limited") };
  }

  // validate_coupon solo se puede ejecutar con service_role (ver ecommerce_schema.sql, M3)
  const { data, error } = await createSupabaseAdmin().rpc("validate_coupon", {
    p_code: code,
    p_subtotal: subtotal,
    p_user_id: (await sessionUserId()) ?? undefined,
  });

  if (error) {
    const reason = couponFailureReason(error.hint);
    if (reason === "error") console.error("[cart] validate_coupon", error);
    if (countsAsFailedAttempt(reason)) await rateLimiter.hit(COUPON_RATE_LIMIT, ip);
    const minOrder = reason === "min_order" ? Number(error.details) || undefined : undefined;
    return { ok: false, reason, message: couponMessage(reason, minOrder) };
  }

  const row = data[0];
  if (!row) return { ok: false, reason: "error", message: couponMessage("error") };
  return {
    ok: true,
    coupon: { code: row.code, discount: Math.round(Number(row.discount)), description: row.description },
  };
}

export type CartRefresh = {
  snapshots: CartSnapshot[];
  /** null si no se pidió un cupón */
  coupon: CouponResult | null;
};

/**
 * Precios y stock actuales de las variantes del carro y, si hay un cupón guardado, su descuento
 * con el subtotal calculado en el servidor. No escribe nada.
 */
export async function refreshCart(lines: unknown, couponCode: unknown): Promise<CartRefresh> {
  const clean = sanitizeLines(lines);
  const snapshots = await loadSnapshots(clean.map((l) => l.variantId));
  const code = couponCode == null ? null : normalizeCouponCode(couponCode);

  if (couponCode == null) return { snapshots, coupon: null };
  if (!code) return { snapshots, coupon: { ok: false, reason: "invalid", message: couponMessage("invalid") } };

  const ip = clientIp(await headers());
  return { snapshots, coupon: await checkCoupon(code, serverSubtotal(clean, snapshots), ip) };
}

/** *Aplicar cupón*: valida el código contra el subtotal del servidor, con rate limiting por IP */
export async function applyCoupon(code: unknown, lines: unknown): Promise<CouponResult> {
  const ip = clientIp(await headers());
  const normalized = normalizeCouponCode(code);

  if (!normalized) {
    if (await rateLimiter.isLimited(COUPON_RATE_LIMIT, ip)) {
      return { ok: false, reason: "rate_limited", message: couponMessage("rate_limited") };
    }
    await rateLimiter.hit(COUPON_RATE_LIMIT, ip);
    return { ok: false, reason: "invalid", message: couponMessage("invalid") };
  }

  const clean = sanitizeLines(lines);
  const snapshots = await loadSnapshots(clean.map((l) => l.variantId));
  return checkCoupon(normalized, serverSubtotal(clean, snapshots), ip);
}

export type CartSync = { ok: true; items: CartItem[] } | { ok: false };

/**
 * Reemplaza cart_items del usuario con el carro del cliente, ajustado al stock, y devuelve los ítems
 * corregidos para el store. Sin sesión no hace nada (el carro sigue solo en el cliente).
 */
export async function syncCart(lines: unknown): Promise<CartSync> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return { ok: false };
  const synced = await syncUserCart(supabase, userId, sanitizeLines(lines));
  return { ok: true, items: synced.items };
}
