import "server-only";
import { notFound, redirect } from "next/navigation";
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

/**
 * El usuario de la sesión si es admin (profiles.role = 'admin', con is_admin() de la BD), o null.
 * Para las Server Actions de administración: si da null, la acción no hace nada. Las sesiones
 * anónimas nunca son admin.
 */
export async function getAdminUser(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  if (!user || user.isAnonymous) return null;
  return (await isAdmin()) ? user : null;
}

async function isAdmin(): Promise<boolean> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.rpc("is_admin");
  if (error) throw error;
  return data === true;
}

/**
 * Para el layout y las páginas de /admin. Sin sesión → Ingresar (vuelve a `path`). Con sesión pero
 * sin ser admin → 404, para no revelar que la administración existe. No reemplaza la verificación
 * de cada Server Action (getAdminUser): el layout no protege las acciones.
 */
export async function requireAdmin(path = "/admin"): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || user.isAnonymous) redirect(`/ingresar?volver=${encodeURIComponent(path)}`);
  if (!(await isAdmin())) notFound();
  return user;
}
