import "server-only";
import { createSupabasePublic } from "@/lib/supabase/public";
import type { createSupabaseServer } from "@/lib/supabase/server";
import type { CartItem } from "@/store/cart-store";
import { clampToSnapshots, mergeLines, toCartItems } from "./merge";
import type { CartSnapshot } from "./reconcile";
import { toSnapshots, type VariantRow } from "./snapshot";
import type { CartLine } from "./totals";

// Lectura y escritura del carro en la BD (cart_items). No es un archivo "use server": lo usan las
// acciones del carro, del login y del checkout después de verificar la sesión.

type UserClient = Awaited<ReturnType<typeof createSupabaseServer>>;

/** Precios y stock actuales. Sin caché: tienen que ser los de ahora */
export async function loadSnapshots(variantIds: string[]): Promise<CartSnapshot[]> {
  if (variantIds.length === 0) return [];
  const { data, error } = await createSupabasePublic()
    .from("product_variants")
    .select(
      `id, name, attributes, price, stock, is_active,
       product:products(id, slug, name, base_price, compare_at_price, is_active,
         images:product_images(url, sort_order))`,
    )
    .in("id", variantIds);

  if (error) throw error;
  return toSnapshots(variantIds, data as VariantRow[]);
}

// El trigger handle_new_user crea el carro al registrarse (también para las sesiones anónimas)
async function cartId(supabase: UserClient, userId: string): Promise<string> {
  const { data, error } = await supabase.from("carts").select("id").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (data) return data.id;
  const created = await supabase.from("carts").insert({ user_id: userId }).select("id").single();
  if (created.error) throw created.error;
  return created.data.id;
}

async function readStoredLines(supabase: UserClient, id: string): Promise<CartLine[]> {
  const { data, error } = await supabase
    .from("cart_items")
    .select("variant_id, quantity")
    .eq("cart_id", id)
    .order("created_at");
  if (error) throw error;
  return data.map((row) => ({ variantId: row.variant_id, quantity: row.quantity }));
}

// Upsert de las líneas y borrado del resto: cart_items nunca queda vacío a medio camino
async function writeLines(supabase: UserClient, id: string, lines: CartLine[]): Promise<void> {
  const keep = lines.map((l) => l.variantId);
  let remove = supabase.from("cart_items").delete().eq("cart_id", id);
  if (keep.length > 0) remove = remove.not("variant_id", "in", `(${keep.join(",")})`);
  const removed = await remove;
  if (removed.error) throw removed.error;

  if (lines.length === 0) return;
  const { error } = await supabase.from("cart_items").upsert(
    lines.map((l) => ({ cart_id: id, variant_id: l.variantId, quantity: l.quantity })),
    { onConflict: "cart_id,variant_id" },
  );
  if (error) throw error;
}

export type SyncedCart = {
  /** Lo que quedó en cart_items */
  lines: CartLine[];
  snapshots: CartSnapshot[];
  /** Para reemplazar el carro del cliente */
  items: CartItem[];
};

/**
 * Escribe en cart_items el carro del cliente, ajustado al stock. Con `merge` (al iniciar sesión)
 * antes lo fusiona con lo que ya tenía guardado ese usuario. `lines` ya viene saneado.
 */
export async function syncUserCart(
  supabase: UserClient,
  userId: string,
  lines: CartLine[],
  { merge = false }: { merge?: boolean } = {},
): Promise<SyncedCart> {
  const id = await cartId(supabase, userId);
  const wanted = merge ? mergeLines(lines, await readStoredLines(supabase, id)) : lines;
  const snapshots = await loadSnapshots(wanted.map((l) => l.variantId));
  const clamped = clampToSnapshots(wanted, snapshots);
  await writeLines(supabase, id, clamped);
  return { lines: clamped, snapshots, items: toCartItems(clamped, snapshots) };
}
