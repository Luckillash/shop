import { isCommuneOf } from "@/lib/chile/regions";

// Comuna de despacho del visitante (B35): la Ficha la usa para mostrar *Llega el martes 27 de
// octubre a Providencia*. Se guarda en una cookie al completar el paso Despacho del checkout
// (servidor) o al elegirla en la Ficha (navegador). La fecha se calcula en el navegador para que
// la Ficha siga estática; por eso la cookie no es httpOnly (solo lleva región y comuna). Lo que
// viene de la cookie se valida contra la lista oficial.

export const DELIVERY_COMMUNE_COOKIE = "comuna_despacho";

/** Un año */
export const DELIVERY_COMMUNE_MAX_AGE = 60 * 60 * 24 * 365;

export type DeliveryCommune = { region: string; commune: string };

export function serializeDeliveryCommune(value: DeliveryCommune): string {
  return JSON.stringify([value.region, value.commune]);
}

/** null si no hay cookie, si está alterada o si la comuna no tiene despacho */
export function parseDeliveryCommune(raw: string | undefined | null): DeliveryCommune | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length !== 2) return null;
    const [region, commune] = parsed;
    if (typeof region !== "string" || typeof commune !== "string") return null;
    return isCommuneOf(region, commune) ? { region, commune } : null;
  } catch {
    return null;
  }
}

/** Lee la comuna de `document.cookie` (el valor viaja codificado con encodeURIComponent) */
export function readDeliveryCommune(cookieHeader: string): DeliveryCommune | null {
  const entry = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${DELIVERY_COMMUNE_COOKIE}=`));
  if (!entry) return null;
  try {
    return parseDeliveryCommune(decodeURIComponent(entry.slice(DELIVERY_COMMUNE_COOKIE.length + 1)));
  } catch {
    return null;
  }
}

/** Cadena para `document.cookie = …` desde el navegador */
export function deliveryCommuneCookie(value: DeliveryCommune, secure: boolean): string {
  const encoded = encodeURIComponent(serializeDeliveryCommune(value));
  return `${DELIVERY_COMMUNE_COOKIE}=${encoded}; Max-Age=${DELIVERY_COMMUNE_MAX_AGE}; Path=/; SameSite=Lax${secure ? "; Secure" : ""}`;
}
