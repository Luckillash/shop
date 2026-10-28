import { greetingName } from "@/lib/account/profile";
import { MESSAGES } from "@/lib/checkout/validation";
import { formatDayMonth } from "@/lib/format/dates";

// Reseñas (7.6, D-031). Puro: lo usan la Server Action (la que vale), el modal y la Ficha.
// La BD decide la elegibilidad (política «reviews: compradores crean») y la firma (trigger
// set_review_author, M11); estas funciones repiten sus reglas solo para mostrarlas antes.

export const TITLE_MAX = 80;
export const BODY_MIN = 20;
export const BODY_MAX = 2000;
export const NAME_MAX = 80;

/** Calificación en palabras del artboard EscribirResena */
export const RATING_WORDS = ["Mala", "Regular", "Buena", "Muy buena", "Excelente"] as const;

export const REVIEW_MESSAGES = {
  rating: "Elige de 1 a 5 estrellas.",
  bodyShort: `Escribe al menos ${BODY_MIN} caracteres.`,
  bodyLong: `Tu opinión puede tener hasta ${BODY_MAX} caracteres.`,
  titleLong: `Usa hasta ${TITLE_MAX} caracteres en el título.`,
  firstName: MESSAGES.firstName,
  notEligible: "Puedes opinar cuando recibas este producto.",
  duplicate: "Ya publicaste una opinión de este producto. Puedes editarla desde su ficha.",
  rateLimited: "Publicaste varias opiniones seguidas. Espera unos minutos y vuelve a intentarlo.",
  sessionExpired: "Tu sesión se cerró. Ingresa de nuevo para publicar tu opinión.",
  generic: "No pudimos publicar tu opinión. Vuelve a intentarlo.",
  load: "No pudimos revisar tu compra. Vuelve a intentarlo.",
} as const;

export type ReviewField = "rating" | "title" | "body" | "firstName";

export type ReviewData = {
  rating: number;
  title: string | null;
  body: string;
  /** Solo si la cuenta no tiene nombre y el modal lo pidió */
  firstName: string | null;
};

export type ReviewValidation =
  | { ok: true; data: ReviewData }
  | { ok: false; errors: Partial<Record<ReviewField, string>> };

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Caracteres como los cuenta char_length de Postgres (un emoji es uno, no dos) */
export function charCount(text: string): number {
  return [...text].length;
}

/** "4" → 4; cualquier otra cosa que no sea un entero de 1 a 5 → null */
export function parseRating(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(clean(value));
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

/** "4 de 5 · Muy buena" */
export function ratingWords(rating: number): string {
  return `${rating} de 5 · ${RATING_WORDS[rating - 1]}`;
}

/**
 * Valida el formulario del modal. El texto conserva sus saltos de línea; el título y el nombre
 * se normalizan a un espacio. `needsName`: la cuenta no tiene nombre (decisión 3b).
 */
export function validateReview(
  input: { rating: unknown; title: unknown; body: unknown; firstName?: unknown },
  needsName: boolean,
): ReviewValidation {
  const errors: Partial<Record<ReviewField, string>> = {};
  const rating = parseRating(input.rating);
  const title = clean(input.title).replace(/\s+/g, " ");
  const body = clean(input.body).replace(/\r\n/g, "\n");
  const firstName = clean(input.firstName).replace(/\s+/g, " ");

  if (rating == null) errors.rating = REVIEW_MESSAGES.rating;
  if (charCount(title) > TITLE_MAX) errors.title = REVIEW_MESSAGES.titleLong;
  if (charCount(body) < BODY_MIN) errors.body = REVIEW_MESSAGES.bodyShort;
  else if (charCount(body) > BODY_MAX) errors.body = REVIEW_MESSAGES.bodyLong;
  if (needsName && (!firstName || charCount(firstName) > NAME_MAX)) errors.firstName = REVIEW_MESSAGES.firstName;

  if (Object.keys(errors).length > 0 || rating == null) return { ok: false, errors };
  return { ok: true, data: { rating, title: title || null, body, firstName: needsName ? firstName : null } };
}

/** Pedido entregado con el producto, como lo lee la acción (orders + order_items) */
export type DeliveredOrder = {
  placed_at: string;
  delivered_at: string | null;
  shipping_method: string | null;
  shipping_address: unknown;
  variant_name: string | null;
};

function isPickup(order: Pick<DeliveredOrder, "shipping_method" | "shipping_address">): boolean {
  const address = order.shipping_address as { type?: unknown } | null;
  return order.shipping_method === "pickup" || address?.type === "pickup";
}

/** Comuna de la firma: la del despacho; null en el retiro en tienda */
export function orderCommune(order: Pick<DeliveredOrder, "shipping_method" | "shipping_address">): string | null {
  if (isPickup(order)) return null;
  const city = (order.shipping_address as { city?: unknown } | null)?.city;
  return typeof city === "string" && city.trim() ? city.trim() : null;
}

/** El entregado más reciente (como el trigger: delivered_at, o placed_at si no tiene) */
export function latestDelivered<T extends Pick<DeliveredOrder, "placed_at" | "delivered_at">>(orders: readonly T[]): T | null {
  const time = (o: T) => Date.parse(o.delivered_at ?? o.placed_at);
  return orders.reduce<T | null>((best, o) => {
    if (!best) return o;
    const diff = time(o) - time(best);
    return diff > 0 || (diff === 0 && Date.parse(o.placed_at) > Date.parse(best.placed_at)) ? o : best;
  }, null);
}

/** Nombre de la firma: la misma regla que el saludo (greetingName) y que el trigger */
export function signatureName(profile: { first_name: string | null; full_name: string | null } | null): string | null {
  return greetingName(profile);
}

/** "Camila · Providencia", o solo "Camila" en el retiro en tienda */
export function reviewSignature(name: string | null, commune: string | null): string {
  return [name, commune].filter(Boolean).join(" · ");
}

/** Texto bajo el campo del modal: dice con qué firma se publica */
export function signatureHint(name: string | null, commune: string | null): string {
  const shown = reviewSignature(name || "tu nombre", commune);
  return commune
    ? `Mínimo ${BODY_MIN} caracteres. Se publica con tu nombre y comuna: ${shown}.`
    : `Mínimo ${BODY_MIN} caracteres. Se publica con tu nombre: ${shown}.`;
}

/** "Color: Pino · La compraste el 16 de octubre" (sin variante si es la única) */
export function purchaseLine(variantLabel: string | null, variantName: string | null, placedAt: string): string {
  const bought = `La compraste el ${formatDayMonth(new Date(placedAt))}`;
  const variant = variantName && variantName !== "Única" ? `${variantLabel ? `${variantLabel}: ` : ""}${variantName}` : null;
  return [variant, bought].filter(Boolean).join(" · ");
}

/** "Basado en 1 opinión" / "Basado en 12 opiniones" */
export function reviewCountLabel(count: number): string {
  return count === 1 ? "Basado en 1 opinión" : `Basado en ${count} opiniones`;
}

/** "4,6" */
export function formatAverage(average: number): string {
  return average.toFixed(1).replace(".", ",");
}

/** Ingresar y volver a las opiniones de la Ficha */
export function reviewLoginHref(productPath: string): string {
  return `/ingresar?${new URLSearchParams({ volver: `${productPath}#opiniones` }).toString()}`;
}

/** Lo que responde getReviewEligibility al abrir el modal */
export type ReviewEligibility =
  | { status: "signin" }
  | {
      status: "guest";
      /** Pedido con el que el invitado puede crear su cuenta (7.2), o null si no tiene */
      account: { orderId: string; orderNumber: number; email: string; pendingEmail: string | null } | null;
    }
  | { status: "not_delivered" }
  | {
      status: "eligible";
      /** null si ya opinó y el pedido dejó de estar entregado */
      purchase: { variantName: string | null; placedAt: string } | null;
      /** null: la cuenta no tiene nombre y el modal lo pide */
      name: string | null;
      commune: string | null;
      /** La opinión que ya publicó (se edita) */
      review: { rating: number; title: string | null; body: string } | null;
    }
  | { status: "error" };

export type ReviewState =
  | { status: "idle" }
  | { status: "error"; errors: Partial<Record<ReviewField, string>>; message?: string }
  | { status: "saved"; mode: "created" | "updated" };

/** Error de PostgREST/Postgres → qué decirle a la persona */
export function reviewErrorState(error: { code?: string; message?: string }): ReviewState {
  if (error.code === "23505") return { status: "error", errors: {}, message: REVIEW_MESSAGES.duplicate };
  if (error.code === "42501") return { status: "error", errors: {}, message: REVIEW_MESSAGES.notEligible };
  if (error.message?.includes("review_author_name_missing")) {
    return { status: "error", errors: { firstName: REVIEW_MESSAGES.firstName } };
  }
  if (error.code === "23514") {
    return error.message?.includes("title")
      ? { status: "error", errors: { title: REVIEW_MESSAGES.titleLong } }
      : { status: "error", errors: { body: REVIEW_MESSAGES.bodyShort } };
  }
  return { status: "error", errors: {}, message: REVIEW_MESSAGES.generic };
}
