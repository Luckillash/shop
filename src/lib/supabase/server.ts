import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { supabasePublishableKey, supabaseUrl } from "./config";

// Cliente con la sesión del usuario (cookies). Uno por request: Server Components,
// Server Actions y Route Handlers. No usar dentro de 'use cache'.
// Para verificar quién es el usuario: supabase.auth.getClaims() (no getSession()).
// connection(): los datos del usuario son de la petición. Sin esto, el prerender en tiempo de
// ejecución (partialPrefetching) corre getClaims(), que usa Date.now(), y Next lo rechaza.
export async function createSupabaseServer() {
  await connection();
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Un Server Component no puede escribir cookies: proxy.ts refresca la sesión
        }
      },
    },
  });
}
