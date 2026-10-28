// Favoritos (7.5, D-030): estado del corazón en el navegador. Puro, con tests.
// Las páginas del catálogo son estáticas: el corazón no sabe nada en el servidor y pregunta por
// los favoritos después de hidratar (trampa 62).

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isProductId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

/**
 * - `idle`: todavía no se preguntó (o se cerró/abrió sesión y hay que volver a preguntar)
 * - `loading`: preguntando
 * - `guest`: sin sesión o con la de un invitado: el corazón lleva a Ingresar (B23)
 * - `ready`: cuenta normal; `ids` son sus favoritos
 */
export type WishlistStatus = "idle" | "loading" | "guest" | "ready";

/** Lo que responde la acción getWishlistState */
export type WishlistSnapshot = { signedIn: false } | { signedIn: true; ids: string[] };

/** Parámetro de Ingresar con el producto que se quería guardar */
export const PENDING_FAVORITE_PARAM = "favorito";

/**
 * Ingresar con `volver` (la página donde se tocó el corazón) y el producto pendiente: al ingresar
 * se guarda solo y se vuelve a esa página (propuesta, D-030).
 */
export function wishlistLoginHref(currentPath: string, productId: string): string {
  const params = new URLSearchParams({ volver: currentPath || "/" });
  if (isProductId(productId)) params.set(PENDING_FAVORITE_PARAM, productId);
  return `/ingresar?${params.toString()}`;
}

/** Los ids con el producto agregado (al principio) o quitado */
export function withWishlisted(ids: readonly string[], productId: string, wishlisted: boolean): string[] {
  const rest = ids.filter((id) => id !== productId);
  return wishlisted ? [productId, ...rest] : rest;
}

/**
 * ¿Puede haber una sesión? Las cookies de Supabase (`sb-<proyecto>-auth-token`, también en trozos
 * `.0`, `.1`) no son httpOnly: sin ellas no hay sesión y no hace falta preguntarle al servidor.
 */
export function mayHaveSession(cookies: string): boolean {
  return /(?:^|;\s*)sb-[^=;]+-auth-token(?:\.\d+)?=/.test(cookies);
}

/** "N productos guardados" (Favoritos) */
export function savedCountLabel(count: number): string {
  return count === 1 ? "1 producto guardado" : `${count} productos guardados`;
}
