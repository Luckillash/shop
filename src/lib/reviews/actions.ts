"use server";

import { refresh, revalidateTag, updateTag } from "next/cache";
import { fullNameOf } from "@/lib/account/profile";
import { canCreateAccountFrom } from "@/lib/auth/guest-account";
import { getPendingEmail } from "@/lib/auth/session";
import { getRedis } from "@/lib/redis";
import { createRateLimiter, REVIEW_RATE_LIMIT } from "@/lib/rate-limit";
import { createSupabaseServer } from "@/lib/supabase/server";
import { isProductId } from "@/lib/wishlist/state";
import {
  latestDelivered,
  orderCommune,
  REVIEW_MESSAGES,
  reviewErrorState,
  signatureName,
  validateReview,
  type ReviewEligibility,
  type ReviewState,
} from "./review";

// Reseñas (7.6, D-031). La Ficha es estática (◐): el modal pregunta la elegibilidad al abrirse,
// después de hidratar. Las acciones usan el cliente del usuario: el RLS decide quién puede opinar
// (pedido entregado, sin invitados) y el trigger set_review_author pone la firma. Al publicar,
// updateTag del producto (la persona ve su opinión al instante) y revalidateTag de los listados.

const rateLimiter = createRateLimiter(getRedis);

/** Qué muestra el modal: Ingresar, crear la cuenta del invitado, sin pedido entregado o el formulario */
export async function getReviewEligibility(productId: string): Promise<ReviewEligibility> {
  if (!isProductId(productId)) return { status: "error" };
  const supabase = await createSupabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return { status: "signin" };

  try {
    if (claims.claims.is_anonymous === true) {
      // El invitado crea su cuenta con el correo de su último pedido pagado (7.2) y opina después
      const { data: orders, error } = await supabase
        .from("orders")
        .select("id, order_number, status, contact_email")
        .eq("user_id", userId)
        .order("placed_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      const order = orders.find((o) => o.contact_email && canCreateAccountFrom(o.status));
      if (!order?.contact_email) return { status: "guest", account: null };
      return {
        status: "guest",
        account: { orderId: order.id, orderNumber: order.order_number, email: order.contact_email, pendingEmail: await getPendingEmail() },
      };
    }

    const [profile, delivered, review] = await Promise.all([
      supabase.from("profiles").select("first_name, full_name").eq("id", userId).maybeSingle(),
      supabase
        .from("orders")
        .select("placed_at, delivered_at, shipping_method, shipping_address, order_items!inner(product_id, variant_name)")
        .eq("user_id", userId)
        .eq("status", "delivered")
        .eq("order_items.product_id", productId),
      supabase.from("reviews").select("rating, title, body").eq("user_id", userId).eq("product_id", productId).maybeSingle(),
    ]);
    if (profile.error) throw profile.error;
    if (delivered.error) throw delivered.error;
    if (review.error) throw review.error;

    const orders = delivered.data.map((o) => ({ ...o, variant_name: o.order_items[0]?.variant_name ?? null }));
    const latest = latestDelivered(orders);
    if (!latest && !review.data) return { status: "not_delivered" };
    return {
      status: "eligible",
      purchase: latest ? { variantName: latest.variant_name, placedAt: latest.placed_at } : null,
      name: signatureName(profile.data),
      commune: latest ? orderCommune(latest) : null,
      review: review.data ? { rating: review.data.rating, title: review.data.title, body: review.data.body ?? "" } : null,
    };
  } catch (error) {
    console.error("[reviews] getReviewEligibility", error);
    return { status: "error" };
  }
}

/**
 * Publica la opinión, o la edita si ya existe (una por usuario y producto). Si la cuenta no tiene
 * nombre, el modal lo pide y se guarda en el perfil antes (grant por columna de M10).
 */
export async function publishReview(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const productId = formData.get("productId");
  if (!isProductId(productId)) return { status: "error", errors: {}, message: REVIEW_MESSAGES.generic };
  const needsName = formData.has("firstName");
  const parsed = validateReview(
    { rating: formData.get("rating"), title: formData.get("title"), body: formData.get("body"), firstName: formData.get("firstName") },
    needsName,
  );
  if (!parsed.ok) return { status: "error", errors: parsed.errors };

  const supabase = await createSupabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return { status: "error", errors: {}, message: REVIEW_MESSAGES.sessionExpired };
  if (claims.claims.is_anonymous === true) return { status: "error", errors: {}, message: REVIEW_MESSAGES.notEligible };

  if (await rateLimiter.isLimited(REVIEW_RATE_LIMIT, userId)) {
    return { status: "error", errors: {}, message: REVIEW_MESSAGES.rateLimited };
  }
  await rateLimiter.hit(REVIEW_RATE_LIMIT, userId);

  const { rating, title, body, firstName } = parsed.data;
  try {
    // Solo si de verdad no tiene nombre: no pisa uno que ya exista
    if (firstName) {
      const { error } = await supabase
        .from("profiles")
        .update({ first_name: firstName, full_name: fullNameOf(firstName, null) })
        .eq("id", userId)
        .is("first_name", null)
        .is("full_name", null);
      if (error) throw error;
    }

    const existing = await supabase.from("reviews").select("id").eq("user_id", userId).eq("product_id", productId).maybeSingle();
    if (existing.error) throw existing.error;
    const { error } = existing.data
      ? await supabase.from("reviews").update({ rating, title, body }).eq("id", existing.data.id).eq("user_id", userId)
      : await supabase.from("reviews").insert({ product_id: productId, rating, title, body });
    if (error) {
      console.error("[reviews] publishReview", error.code, error.message);
      return reviewErrorState(error);
    }

    updateTag(`reviews:${productId}`);
    // Promedio y conteo de los listados (product_catalog): se actualizan en la próxima visita
    revalidateTag("products", "max");
    refresh();
    return { status: "saved", mode: existing.data ? "updated" : "created" };
  } catch (error) {
    console.error("[reviews] publishReview", error);
    return { status: "error", errors: {}, message: REVIEW_MESSAGES.generic };
  }
}
