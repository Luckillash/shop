"use server";

import { accountClient, writeWishlist } from "./server";
import type { WishlistSnapshot } from "./state";

// Favoritos (7.5, D-030). Las páginas del catálogo son estáticas: el corazón llama a estas acciones
// después de hidratar. No se invalida ningún tag del catálogo (los favoritos no cambian la página);
// /cuenta/favoritos se renderiza en cada petición.

/** Los favoritos de la cuenta, o signedIn: false sin sesión o con la de un invitado */
export async function getWishlistState(): Promise<WishlistSnapshot> {
  const account = await accountClient();
  if (!account) return { signedIn: false };
  const { data, error } = await account.supabase
    .from("wishlist_items")
    .select("product_id")
    .eq("user_id", account.userId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[wishlist] getWishlistState", error.code, error.message);
    return { signedIn: true, ids: [] };
  }
  return { signedIn: true, ids: data.map((row) => row.product_id) };
}

export type WishlistResult = { status: "ok" } | { status: "signin" } | { status: "error" };

/** Guarda (true) o quita (false) un producto. Sin cuenta → signin: el cliente lleva a Ingresar */
export async function setWishlisted(productId: string, wishlisted: boolean): Promise<WishlistResult> {
  const account = await accountClient();
  if (!account) return { status: "signin" };
  const ok = await writeWishlist(account.supabase, account.userId, productId, wishlisted === true);
  return ok ? { status: "ok" } : { status: "error" };
}
