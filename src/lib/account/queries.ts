import "server-only";
import { createSupabaseServer } from "@/lib/supabase/server";
import { sortAddresses, type AddressRow } from "./addresses";
import type { ProfileRow } from "./profile";

// Lecturas de Direcciones, Favoritos y Datos personales (7.5). Con el cliente del usuario (RLS) y
// filtrando además por user_id: el RLS de un admin deja ver las filas de todos (D-026). Las
// consultas con sesión se lanzan (trampa 58).

export async function getMyAddresses(userId: string): Promise<AddressRow[]> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("addresses")
    .select("id, label, recipient_name, phone, line1, line2, city, region, is_default")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return sortAddresses(data);
}

export async function getMyProfile(userId: string): Promise<ProfileRow | null> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, first_name, last_name, phone, rut, newsletter_opt_in_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Ids de los productos guardados, del más reciente al más antiguo */
export async function getMyWishlistIds(userId: string): Promise<string[]> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("wishlist_items")
    .select("product_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map((row) => row.product_id);
}
