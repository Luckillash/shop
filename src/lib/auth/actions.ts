"use server";

import { headers } from "next/headers";
import { syncUserCart } from "@/lib/cart/server";
import { sanitizeLines } from "@/lib/cart/snapshot";
import type { FieldErrors } from "@/lib/checkout/validation";
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
  const origin = (await headers()).get("origin");
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.name, newsletter: parsed.data.newsletter },
      emailRedirectTo: origin ? `${origin}/auth/confirm?volver=${encodeURIComponent(next)}` : undefined,
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

  const origin = (await headers()).get("origin");
  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: origin ? `${origin}/auth/confirm?volver=${encodeURIComponent(NEW_PASSWORD_PATH)}` : undefined,
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
