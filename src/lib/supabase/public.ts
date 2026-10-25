import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { supabasePublishableKey, supabaseUrl } from "./config";

// Cliente sin sesión (rol anon) para leer el catálogo.
// No toca cookies, así que se puede usar dentro de 'use cache'.
export function createSupabasePublic() {
  return createClient<Database>(supabaseUrl(), supabasePublishableKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
