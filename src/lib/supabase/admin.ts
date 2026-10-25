import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { supabaseUrl } from "./config";

// Cliente con la llave secreta: SALTA RLS y auth.uid() es null.
// Solo para pasarelas de pago, crons y administración, nunca con IDs del cliente sin verificar.
export function createSupabaseAdmin() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Falta la variable de entorno SUPABASE_SECRET_KEY (ver .env.example)");
  }
  return createClient<Database>(supabaseUrl(), secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
