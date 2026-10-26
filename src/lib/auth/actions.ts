"use server";

import { headers } from "next/headers";
import { syncUserCart } from "@/lib/cart/server";
import { sanitizeLines } from "@/lib/cart/snapshot";
import { normalizeEmail, type FieldErrors } from "@/lib/checkout/validation";
import { asAddress, isOrderId } from "@/lib/payments/order-view";
import { getRedis } from "@/lib/redis";
import {
  clientIp,
  createRateLimiter,
  GUEST_RATE_LIMIT,
  LOGIN_RATE_LIMIT,
  RESET_RATE_LIMIT,
  SIGNUP_RATE_LIMIT,
} from "@/lib/rate-limit";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { CartItem } from "@/store/cart-store";
import {
  canCreateAccountFrom,
  GUEST_ACCOUNT_MESSAGES,
  GUEST_ACCOUNT_NEXT,
  guestAccountName,
  validateGuestAccount,
} from "./guest-account";
import {
  AUTH_MESSAGES,
  safeNext,
  validateLogin,
  validateNewPassword,
  validateResetRequest,
  validateSignup,
} from "./validation";

// Ingresar, Crear cuenta y Comprar como invitado (D-008). Las sesiones se guardan en cookies con
// @supabase/ssr: por eso son Server Actions (un Server Component no puede escribir cookies, trampa 9).
// Al entrar, el carro del cliente se fusiona con el guardado en cart_items (D-018) y se devuelve
// el resultado para reemplazar el store.

const rateLimiter = createRateLimiter(getRedis);

export type AuthState =
  | { status: "idle" }
  | { status: "error"; message?: string; errors: FieldErrors; email?: string; name?: string }
  | { status: "signed-in"; items: CartItem[]; next: string }
  | { status: "confirm-email"; email: string };

function parseCart(formData: FormData) {
  try {
    return sanitizeLines(JSON.parse(String(formData.get("cart") ?? "[]")));
  } catch {
    return [];
  }
}

async function requestIp(): Promise<string> {
  return clientIp(await headers());
}

/**
 * Enlace de los correos de Supabase Auth: /auth/confirm con el destino en ?volver=. Las plantillas
 * de los correos lo usan como {{ .RedirectTo }}&token_hash=…, así que siempre debe llevar su
 * propia query (sin Origin, que las Server Actions siempre traen, cae en NEXT_PUBLIC_SITE_URL).
 * Tiene que estar en Redirect URLs de Supabase o Auth lo reemplaza por la Site URL.
 */
async function confirmUrl(next: string): Promise<string | undefined> {
  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  return origin ? `${origin}/auth/confirm?volver=${encodeURIComponent(next)}` : undefined;
}

// Fusiona el carro con el guardado. Si falla, la sesión ya existe: se entra igual con el carro local
async function signedIn(
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
  userId: string,
  formData: FormData,
  next: string,
  merge: boolean,
): Promise<AuthState> {
  const lines = parseCart(formData);
  try {
    const synced = await syncUserCart(supabase, userId, lines, { merge });
    return { status: "signed-in", items: synced.items, next };
  } catch (error) {
    console.error("[auth] syncUserCart", error);
    return { status: "signed-in", items: [], next };
  }
}

/** Ingresar con correo y contraseña */
export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const parsed = validateLogin({ email, password: formData.get("password") });
  if (!parsed.ok) return { status: "error", errors: parsed.errors, email };

  const ip = await requestIp();
  if (await rateLimiter.isLimited(LOGIN_RATE_LIMIT, ip)) {
    return { status: "error", message: AUTH_MESSAGES.rateLimited, errors: {}, email };
  }

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    if (error?.code === "email_not_confirmed") {
      return { status: "error", message: AUTH_MESSAGES.emailNotConfirmed, errors: {}, email };
    }
    if (error && error.code !== "invalid_credentials") console.error("[auth] signIn", error);
    await rateLimiter.hit(LOGIN_RATE_LIMIT, ip);
    return {
      status: "error",
      message: error?.code === "invalid_credentials" ? AUTH_MESSAGES.wrongCredentials : AUTH_MESSAGES.generic,
      errors: {},
      email,
    };
  }

  return signedIn(supabase, data.user.id, formData, safeNext(formData.get("next")), true);
}

/** Crear cuenta. Con la confirmación de correo activada, Supabase no devuelve sesión hasta confirmar */
export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const name = String(formData.get("name") ?? "");
  const parsed = validateSignup({
    name,
    email,
    password: formData.get("password"),
    newsletter: formData.get("newsletter"),
  });
  if (!parsed.ok) return { status: "error", errors: parsed.errors, email, name };

  const ip = await requestIp();
  if (await rateLimiter.isLimited(SIGNUP_RATE_LIMIT, ip)) {
    return { status: "error", message: AUTH_MESSAGES.rateLimited, errors: {}, email, name };
  }
  await rateLimiter.hit(SIGNUP_RATE_LIMIT, ip);

  const next = safeNext(formData.get("next"));
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.name, newsletter: parsed.data.newsletter },
      emailRedirectTo: await confirmUrl(next),
    },
  });

  if (error) {
    if (error.code === "weak_password") {
      return { status: "error", errors: { password: AUTH_MESSAGES.newPassword }, email, name };
    }
    if (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit") {
      return { status: "error", message: AUTH_MESSAGES.rateLimited, errors: {}, email, name };
    }
    console.error("[auth] signUp", error);
    return { status: "error", message: AUTH_MESSAGES.generic, errors: {}, email, name };
  }

  // Sin sesión: hay que confirmar el correo. Supabase responde igual si el correo ya existía,
  // así que el mensaje no revela qué correos tienen cuenta
  if (!data.session || !data.user) return { status: "confirm-email", email: parsed.data.email };
  return signedIn(supabase, data.user.id, formData, next, true);
}

/** *Comprar como invitado*: sesión anónima de Supabase (D-008). Requiere activarla en Supabase Auth */
export async function startGuestCheckout(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createSupabaseServer();
  const { data: current } = await supabase.auth.getClaims();
  if (current?.claims.sub) return signedIn(supabase, current.claims.sub, formData, "/checkout", true);

  const ip = await requestIp();
  if (await rateLimiter.isLimited(GUEST_RATE_LIMIT, ip)) {
    return { status: "error", message: AUTH_MESSAGES.rateLimited, errors: {} };
  }
  await rateLimiter.hit(GUEST_RATE_LIMIT, ip);

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) {
    console.error("[auth] signInAnonymously", error);
    const disabled = error?.code === "anonymous_provider_disabled";
    return { status: "error", message: disabled ? AUTH_MESSAGES.guestUnavailable : AUTH_MESSAGES.generic, errors: {} };
  }
  return signedIn(supabase, data.user.id, formData, "/checkout", false);
}

/** Cerrar sesión. El cliente vacía su carro después (estado-del-cliente.md) */
export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
}

// ----- ¿Olvidaste tu contraseña? -----

export type ResetRequestState =
  | { status: "idle" }
  | { status: "error"; message?: string; errors: FieldErrors; email: string }
  | { status: "sent"; email: string };

/** Ruta a la que vuelve el enlace del correo, después de /auth/confirm */
const NEW_PASSWORD_PATH = "/ingresar/nueva-contrasena";

/**
 * Envía el correo para crear una contraseña nueva. Responde siempre lo mismo (exista o no la
 * cuenta) para no revelar qué correos están registrados. El enlace pasa por /auth/confirm, que
 * crea la sesión de recuperación, y llega a /ingresar/nueva-contrasena.
 */
export async function requestPasswordReset(_prev: ResetRequestState, formData: FormData): Promise<ResetRequestState> {
  const email = String(formData.get("email") ?? "");
  const parsed = validateResetRequest({ email });
  if (!parsed.ok) return { status: "error", errors: parsed.errors, email };

  const ip = await requestIp();
  if (await rateLimiter.isLimited(RESET_RATE_LIMIT, ip)) {
    return { status: "error", message: AUTH_MESSAGES.rateLimited, errors: {}, email };
  }
  await rateLimiter.hit(RESET_RATE_LIMIT, ip);

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: await confirmUrl(NEW_PASSWORD_PATH),
  });

  if (error) {
    if (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit") {
      return { status: "error", message: AUTH_MESSAGES.rateLimited, errors: {}, email };
    }
    // Cualquier otro error (correo inexistente, SMTP) se registra, pero la respuesta es la misma
    console.error("[auth] resetPasswordForEmail", error);
  }
  return { status: "sent", email: parsed.data.email };
}

export type NewPasswordState =
  | { status: "idle" }
  | { status: "error"; message?: string; errors: FieldErrors }
  | { status: "updated" };

/** Guarda la contraseña nueva. Requiere la sesión que crea el enlace del correo (o una sesión normal) */
export async function updatePassword(_prev: NewPasswordState, formData: FormData): Promise<NewPasswordState> {
  const parsed = validateNewPassword({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.ok) return { status: "error", errors: parsed.errors };

  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims.sub || data.claims.is_anonymous === true) {
    return { status: "error", message: AUTH_MESSAGES.resetExpired, errors: {} };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return { status: "error", errors: { password: AUTH_MESSAGES.samePassword } };
    if (error.code === "weak_password") return { status: "error", errors: { password: AUTH_MESSAGES.newPassword } };
    if (error.code === "session_expired" || error.code === "session_not_found") {
      return { status: "error", message: AUTH_MESSAGES.resetExpired, errors: {} };
    }
    console.error("[auth] updatePassword", error);
    return { status: "error", message: AUTH_MESSAGES.generic, errors: {} };
  }
  return { status: "updated" };
}

// ----- Invitado que crea su cuenta desde la Confirmación (7.2, D-027) -----

export type GuestAccountState =
  | { status: "idle" }
  | { status: "error"; message?: string; errors: FieldErrors; emailTaken?: string }
  | { status: "sent"; email: string };

export type ResendState = { status: "idle" } | { status: "error"; message: string } | { status: "resent" };

/** Enlace del correo de confirmación: /auth/confirm crea la sesión y lleva a Mis pedidos */
function guestAccountRedirect(): Promise<string | undefined> {
  return confirmUrl(GUEST_ACCOUNT_NEXT);
}

/**
 * Convierte la sesión anónima en una cuenta con el correo del pedido y la contraseña del
 * formulario (updateUser sobre la misma sesión, así que se conserva el user_id con sus pedidos,
 * su dirección y su carro). Supabase guarda la contraseña y envía un correo para confirmar la
 * dirección; hasta abrirlo, el usuario sigue siendo anónimo (mailer_autoconfirm desactivado).
 * El correo sale siempre del pedido, nunca del formulario. Si ya tiene una cuenta, no se fusionan
 * los pedidos: se le pide ingresar.
 */
export async function createGuestAccount(_prev: GuestAccountState, formData: FormData): Promise<GuestAccountState> {
  const parsed = validateGuestAccount({ password: formData.get("password"), newsletter: formData.get("newsletter") });
  if (!parsed.ok) return { status: "error", errors: parsed.errors };

  const orderId = formData.get("order");
  const notEligible: GuestAccountState = { status: "error", message: GUEST_ACCOUNT_MESSAGES.notEligible, errors: {} };
  if (!isOrderId(orderId)) return notEligible;

  const supabase = await createSupabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId || claims.claims.is_anonymous !== true) return notEligible;

  const ip = await requestIp();
  if (await rateLimiter.isLimited(SIGNUP_RATE_LIMIT, ip)) {
    return { status: "error", message: GUEST_ACCOUNT_MESSAGES.rateLimited, errors: {} };
  }

  // Pedido propio y pagado: el RLS solo deja ver lo propio, y se filtra además por user_id
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("status, contact_email, shipping_address")
    .eq("id", orderId)
    .eq("user_id", userId)
    .maybeSingle();
  if (orderError) console.error("[auth] createGuestAccount: pedido", orderError);
  const email = normalizeEmail(order?.contact_email);
  if (!order || !email || !canCreateAccountFrom(order.status)) return notEligible;

  await rateLimiter.hit(SIGNUP_RATE_LIMIT, ip);
  const name = guestAccountName(asAddress(order.shipping_address));
  const { error } = await supabase.auth.updateUser(
    { email, password: parsed.data.password, data: { full_name: name, newsletter: parsed.data.newsletter } },
    { emailRedirectTo: await guestAccountRedirect() },
  );

  if (error) {
    if (error.code === "email_exists") return { status: "error", errors: {}, emailTaken: email };
    if (error.code === "weak_password") return { status: "error", errors: { password: GUEST_ACCOUNT_MESSAGES.password } };
    console.error("[auth] createGuestAccount", error.code, error.message);
    const mail = error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit" ||
      error.code === "email_address_invalid" || error.code === "email_address_not_authorized";
    return { status: "error", message: mail ? GUEST_ACCOUNT_MESSAGES.emailUnavailable : GUEST_ACCOUNT_MESSAGES.generic, errors: {} };
  }

  // El invitado no escribió su nombre: se usa el destinatario del pedido (menú *Hola, <nombre>*)
  if (name) {
    const { error: profileError } = await supabase.from("profiles").update({ full_name: name }).eq("id", userId).is("full_name", null);
    if (profileError) console.error("[auth] createGuestAccount: perfil", profileError);
  }
  return { status: "sent", email };
}

/** *Reenviar el correo*: repite updateUser con el correo pendiente (Supabase genera un enlace nuevo) */
export async function resendGuestAccountEmail(): Promise<ResendState> {
  const supabase = await createSupabaseServer();
  const { data, error: userError } = await supabase.auth.getUser();
  const email = data.user?.is_anonymous ? data.user.new_email : null;
  if (userError || !email) return { status: "error", message: GUEST_ACCOUNT_MESSAGES.notEligible };

  const ip = await requestIp();
  if (await rateLimiter.isLimited(SIGNUP_RATE_LIMIT, ip)) return { status: "error", message: GUEST_ACCOUNT_MESSAGES.rateLimited };
  await rateLimiter.hit(SIGNUP_RATE_LIMIT, ip);

  const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: await guestAccountRedirect() });
  if (error) {
    console.error("[auth] resendGuestAccountEmail", error.code, error.message);
    return { status: "error", message: GUEST_ACCOUNT_MESSAGES.emailUnavailable };
  }
  return { status: "resent" };
}
