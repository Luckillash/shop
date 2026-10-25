import "server-only";
import { createSupabaseServer } from "@/lib/supabase/server";

// Usuario de la sesión, verificado con getClaims() (valida el JWT; no getSession(), trampa 43).
// Lee cookies: úsalo dentro de <Suspense> o en Server Actions, nunca en 'use cache'.

export type SessionUser = {
  id: string;
  /** null en las sesiones anónimas (compra como invitado, D-008) */
  email: string | null;
  isAnonymous: boolean;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const isAnonymous = claims.is_anonymous === true;
  return { id: claims.sub, email: isAnonymous ? null : (claims.email ?? null), isAnonymous };
}
