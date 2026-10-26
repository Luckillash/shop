import type { FieldErrors } from "@/lib/checkout/validation";
import { AUTH_MESSAGES, MIN_PASSWORD_LENGTH } from "./validation";

// Invitado que crea su cuenta desde la Confirmación (7.2, template ConfirmacionCrearCuenta, D-027).
// La cuenta es la misma sesión anónima con correo y contraseña (updateUser): conserva el user_id
// y por lo tanto sus pedidos, su dirección y su carro. Con la confirmación de correo activada,
// el usuario sigue siendo anónimo hasta abrir el enlace del correo. Puro, para probarlo.

/** Ruta a la que lleva el enlace del correo, después de /auth/confirm */
export const GUEST_ACCOUNT_NEXT = "/cuenta/pedidos";

/** Estados del pedido desde los que se puede crear la cuenta: los de la Confirmación (pagado) */
const CONVERTIBLE = new Set(["paid", "processing", "shipped", "delivered"]);

export function canCreateAccountFrom(status: string): boolean {
  return CONVERTIBLE.has(status);
}

export const GUEST_ACCOUNT_MESSAGES = {
  password: AUTH_MESSAGES.newPassword,
  /** Sesión que ya no es anónima, pedido ajeno, inexistente o sin pagar */
  notEligible: "No pudimos crear tu cuenta desde este pedido. Recarga la página y vuelve a intentarlo.",
  /** Supabase no pudo enviar el correo (límite de envíos del proyecto o de la dirección) */
  emailUnavailable: "No pudimos enviarte el correo para confirmar tu cuenta. Vuelve a intentarlo en unos minutos.",
  rateLimited: AUTH_MESSAGES.rateLimited,
  generic: AUTH_MESSAGES.generic,
} as const;

/** Aviso cuando el correo del pedido ya tiene una cuenta: no se fusionan los pedidos (privacidad) */
export function emailTakenText(email: string) {
  return {
    title: `Ya hay una cuenta con ${email}`,
    body: "Ingresa con ella para tus próximas compras. Este pedido no se suma a esa cuenta, pero tienes el detalle en tu correo.",
  };
}

/** Aviso después de pedir la cuenta, mientras no se confirme el correo (también al recargar) */
export function emailSentText(email: string) {
  return {
    title: "Revisa tu correo para terminar",
    body: `Te enviamos un correo a ${email} para confirmar tu cuenta. Cuando abras el enlace, vas a ver este pedido en Mis pedidos. Si no lo ves, revisa la carpeta de spam.`,
  };
}

export type GuestAccountField = "password";

/** Solo la contraseña y la casilla: el correo es siempre el del pedido, nunca el del formulario */
export function validateGuestAccount(input: { password: unknown; newsletter?: unknown }) {
  const password = typeof input.password === "string" ? input.password : "";
  if (password.length < MIN_PASSWORD_LENGTH) {
    const errors: FieldErrors<GuestAccountField> = { password: GUEST_ACCOUNT_MESSAGES.password };
    return { ok: false as const, errors };
  }
  return { ok: true as const, data: { password, newsletter: input.newsletter === "on" || input.newsletter === true } };
}

/**
 * Nombre para profiles.full_name: el destinatario del pedido (despacho o retiro). El invitado no
 * escribió otro nombre en el checkout. Hasta 80 caracteres, como Crear cuenta.
 */
export function guestAccountName(address: { recipient_name?: unknown } | null | undefined): string | null {
  const name = typeof address?.recipient_name === "string" ? address.recipient_name.trim().replace(/\s+/g, " ") : "";
  return name ? name.slice(0, 80) : null;
}

/**
 * Qué muestra la Confirmación sobre la cuenta:
 * - `form`: invitado dueño del pedido → *Guarda tus datos para la próxima compra*
 * - `sent`: invitado que ya pidió la cuenta y no confirma el correo → *Revisa tu correo para terminar*
 * - `account`: cuenta normal dueña del pedido → *Ver estado del pedido* (B38)
 * - `none`: sin sesión o pedido ajeno (un admin que lo abre): nada
 */
export type GuestAccountView = "form" | "sent" | "account" | "none";

export function guestAccountView(input: {
  isAnonymous: boolean | null;
  ownsOrder: boolean;
  pendingEmail: string | null;
}): GuestAccountView {
  if (input.isAnonymous === null || !input.ownsOrder) return "none";
  if (!input.isAnonymous) return "account";
  return input.pendingEmail ? "sent" : "form";
}

/** *Ver estado del pedido*: el Detalle de pedido de la cuenta (D-026) */
export function orderStatusHref(orderNumber: number): string {
  return `/cuenta/pedidos/${orderNumber}`;
}
