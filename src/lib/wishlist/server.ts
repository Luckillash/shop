import "server-only";
import { createSupabaseServer } from "@/lib/supabase/server";
import { isProductId } from "./state";

type Supabase = Awaited<ReturnType<typeof createSupabaseServer>>;

/** Sesión de una cuenta normal (no invitado) con su cliente, o null: los favoritos son solo con cuenta (B23) */
export async function accountClient(): Promise<{ supabase: Supabase; userId: string } | null> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId || data.claims.is_anonymous === true) return null;
  return { supabase, userId };
}

/**
 * Guarda o quita un favorito con el cliente del usuario (RLS «wishlist: dueño») y su user_id.
 * Un producto inexistente falla por la llave foránea. Devuelve false si falló.
 */
export async function writeWishlist(supabase: Supabase, userId: string, productId: unknown, wishlisted: boolean) {
  if (!isProductId(productId)) return false;
  const { error } = wishlisted
    ? await supabase
        .from("wishlist_items")
        .upsert({ user_id: userId, product_id: productId }, { onConflict: "user_id,product_id", ignoreDuplicates: true })
    : await supabase.from("wishlist_items").delete().eq("user_id", userId).eq("product_id", productId);
  if (error) {
    console.error("[wishlist] write", error.code, error.message);
    return false;
  }
  return true;
}
