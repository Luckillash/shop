// Limpieza de invitados (fase 7.8, D-033): lógica pura, sin la BD. La llama el cron diario con
// delete_stale_anonymous_users (M13), que es la que decide quién se borra.

/** Días sin actividad para borrar un invitado sin pedidos */
export const ANON_CLEANUP_INACTIVE_DAYS = 30;
/** Tope por ejecución: cabe de sobra en el tiempo de una función de Hobby */
export const ANON_CLEANUP_LIMIT = 500;

export type AnonCleanupSummary = { checked: number; deleted: number; dryRun: boolean };

/**
 * Solo borra con ANON_CLEANUP_ENABLED=true (decisión del dueño, 28-10-2026): sin la variable, o con
 * cualquier otro valor, el cron solo cuenta los candidatos. Así se puede desplegar sin borrar nada.
 */
export function anonCleanupEnabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

/** El jsonb { checked, deleted } de la función; si no tiene esa forma, es un error */
export function parseCleanupResult(data: unknown, dryRun: boolean): AnonCleanupSummary {
  if (typeof data === "object" && data !== null) {
    const { checked, deleted } = data as Record<string, unknown>;
    if (Number.isInteger(checked) && Number.isInteger(deleted)) {
      return { checked: checked as number, deleted: deleted as number, dryRun };
    }
  }
  throw new Error(`delete_stale_anonymous_users devolvió algo inesperado: ${JSON.stringify(data)}`);
}
