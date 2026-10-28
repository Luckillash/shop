import "server-only";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import {
  ANON_CLEANUP_INACTIVE_DAYS,
  ANON_CLEANUP_LIMIT,
  anonCleanupEnabled,
  parseCleanupResult,
  type AnonCleanupSummary,
} from "./anon-cleanup-core";

// Limpieza de invitados (fase 7.8, D-033): borra los usuarios anónimos sin pedidos y sin actividad
// desde hace 30 días, hasta 500 por ejecución, en una sola transacción de la BD. Nunca toca cuentas
// con correo, admins ni a quien tenga pedidos (lo garantiza delete_stale_anonymous_users, M13).
export async function cleanupAnonymousUsers(): Promise<AnonCleanupSummary> {
  const dryRun = !anonCleanupEnabled(process.env.ANON_CLEANUP_ENABLED);
  const { data, error } = await createSupabaseAdmin().rpc("delete_stale_anonymous_users", {
    p_inactive_days: ANON_CLEANUP_INACTIVE_DAYS,
    p_limit: ANON_CLEANUP_LIMIT,
    p_dry_run: dryRun,
  });
  if (error) throw error;
  return parseCleanupResult(data, dryRun);
}
