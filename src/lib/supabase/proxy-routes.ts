// Qué rutas revisa el proxy en la carga directa (src/lib/supabase/proxy.ts). Lógica pura, con tests.
// Las páginas son de prerender parcial: sin el proxy, su redirect o su 404 salen con 200 (trampa 75).

export type GuardedRoute =
  | { kind: "order-detail"; orderNumber: string }
  | { kind: "admin" }
  | { kind: "account" }
  | null;

const ORDER_DETAIL = /^\/cuenta\/pedidos\/([^/]+)\/?$/;
const ADMIN = /^\/admin(\/|$)/;
const ACCOUNT = /^\/cuenta(\/|$)/;

/**
 * order-detail: también busca el pedido (D-026). admin: también revisa el rol (D-029). account: el
 * resto de /cuenta/* (7.8, D-033), que solo necesita una sesión no anónima y no cuesta otra consulta.
 */
export function guardedRoute(pathname: string): GuardedRoute {
  const orderNumber = ORDER_DETAIL.exec(pathname)?.[1];
  if (orderNumber !== undefined) return { kind: "order-detail", orderNumber };
  if (ADMIN.test(pathname)) return { kind: "admin" };
  if (ACCOUNT.test(pathname)) return { kind: "account" };
  return null;
}

/** true si la sesión no sirve para la cuenta: sin sesión o invitado (D-008) */
export function needsLogin(claims: { sub?: string; is_anonymous?: boolean } | undefined): boolean {
  return !claims?.sub || claims.is_anonymous === true;
}

/**
 * /ingresar?volver=<ruta y query>. La ruta sale de la URL pedida (siempre del mismo sitio); Ingresar
 * igual la valida con safeNext antes de usarla.
 */
export function loginPath(pathname: string, search = ""): string {
  return `/ingresar?${new URLSearchParams({ volver: pathname + search })}`;
}
