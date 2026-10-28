"use server";

import { refresh } from "next/cache";
import { AUTH_MESSAGES } from "@/lib/auth/validation";
import type { FieldErrors } from "@/lib/checkout/validation";
import { getRedis } from "@/lib/redis";
import { createRateLimiter, PASSWORD_RATE_LIMIT } from "@/lib/rate-limit";
import { accountClient } from "@/lib/wishlist/server";
import { ADDRESS_MESSAGES, MAX_ADDRESSES, validateAddress } from "./addresses";
import { PROFILE_MESSAGES, validatePasswordChange, validateProfile } from "./profile";

// Direcciones y Datos personales (7.5, D-030). Cada acción verifica que la sesión sea de una cuenta
// normal (no invitado), usa el cliente del usuario (RLS) y filtra además por user_id: así nunca toca
// una fila ajena, tampoco con la sesión de un admin. La entrada se valida aquí, no en el navegador.
// Después de escribir, refresh(): las páginas de la cuenta se renderizan en cada petición.

const rateLimiter = createRateLimiter(getRedis);

const SESSION_EXPIRED = "Tu sesión se cerró. Ingresa de nuevo para guardar los cambios.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

// ----- Direcciones -----

export type AddressState =
  | { status: "idle" }
  | { status: "error"; errors: FieldErrors; message?: string }
  | { status: "saved"; message: string };

export type AddressActionResult = { ok: true; message: string } | { ok: false; message: string };

/** Agregar o editar (con `id`) una dirección. *Usar como dirección principal* la marca como is_default */
export async function saveAddress(_prev: AddressState, formData: FormData): Promise<AddressState> {
  const parsed = validateAddress({
    label: formData.get("label"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
    region: formData.get("region"),
    commune: formData.get("commune"),
    street: formData.get("street"),
    apartment: formData.get("apartment"),
  });
  if (!parsed.ok) return { status: "error", errors: parsed.errors };

  const account = await accountClient();
  if (!account) return { status: "error", errors: {}, message: SESSION_EXPIRED };
  const { supabase, userId } = account;
  const makeDefault = formData.get("isDefault") === "on";
  const id = formData.get("id");

  try {
    if (id) {
      if (!isId(id)) return { status: "error", errors: {}, message: ADDRESS_MESSAGES.notFound };
      // Desmarcar la principal no deja al cliente sin una: para cambiarla se marca otra
      const { data, error } = await supabase
        .from("addresses")
        .update(makeDefault ? { ...parsed.data, is_default: true } : parsed.data)
        .eq("id", id)
        .eq("user_id", userId)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) return { status: "error", errors: {}, message: ADDRESS_MESSAGES.notFound };
      refresh();
      return { status: "saved", message: ADDRESS_MESSAGES.updated };
    }

    const existing = await supabase.from("addresses").select("is_default").eq("user_id", userId);
    if (existing.error) throw existing.error;
    if (existing.data.length >= MAX_ADDRESSES) return { status: "error", errors: {}, message: ADDRESS_MESSAGES.limit };
    // La primera dirección es la principal aunque no se marque
    const isDefault = makeDefault || !existing.data.some((a) => a.is_default);
    const { error } = await supabase.from("addresses").insert({ ...parsed.data, user_id: userId, is_default: isDefault });
    if (error) throw error;
    refresh();
    return { status: "saved", message: ADDRESS_MESSAGES.added };
  } catch (error) {
    console.error("[account] saveAddress", error);
    return { status: "error", errors: {}, message: ADDRESS_MESSAGES.generic };
  }
}

/** *Usar como principal*: el trigger ensure_single_default_address desmarca las demás */
export async function setDefaultAddress(id: string): Promise<AddressActionResult> {
  const account = await accountClient();
  if (!account) return { ok: false, message: SESSION_EXPIRED };
  if (!isId(id)) return { ok: false, message: ADDRESS_MESSAGES.notFound };
  const { data, error } = await account.supabase
    .from("addresses")
    .update({ is_default: true })
    .eq("id", id)
    .eq("user_id", account.userId)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("[account] setDefaultAddress", error);
    return { ok: false, message: ADDRESS_MESSAGES.generic };
  }
  if (!data) return { ok: false, message: ADDRESS_MESSAGES.notFound };
  refresh();
  return { ok: true, message: ADDRESS_MESSAGES.madeDefault };
}

/**
 * Eliminar. Los pedidos no cambian: guardaron una copia de la dirección (orders.shipping_address).
 * Si era la principal, la más reciente de las que quedan pasa a serlo (propuesta, D-030).
 */
export async function deleteAddress(id: string): Promise<AddressActionResult> {
  const account = await accountClient();
  if (!account) return { ok: false, message: SESSION_EXPIRED };
  if (!isId(id)) return { ok: false, message: ADDRESS_MESSAGES.notFound };
  const { supabase, userId } = account;

  const { data, error } = await supabase
    .from("addresses")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("is_default")
    .maybeSingle();
  if (error) {
    console.error("[account] deleteAddress", error);
    return { ok: false, message: ADDRESS_MESSAGES.deleteFailed };
  }
  if (!data) return { ok: false, message: ADDRESS_MESSAGES.notFound };

  if (data.is_default) {
    const next = await supabase
      .from("addresses")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (next.data) {
      const promoted = await supabase.from("addresses").update({ is_default: true }).eq("id", next.data.id).eq("user_id", userId);
      if (promoted.error) console.error("[account] deleteAddress: nueva principal", promoted.error);
    } else if (next.error) {
      console.error("[account] deleteAddress: nueva principal", next.error);
    }
  }
  refresh();
  return { ok: true, message: ADDRESS_MESSAGES.deleted };
}

// ----- Datos personales -----

export type ProfileState =
  | { status: "idle" }
  | { status: "error"; errors: FieldErrors; message?: string }
  | { status: "saved" };

/** Nombre, apellido, teléfono y RUT (opcional, decisión 7a). El checkout lo precarga y no lo escribe */
export async function saveProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const parsed = validateProfile({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
    rut: formData.get("rut"),
  });
  if (!parsed.ok) return { status: "error", errors: parsed.errors };

  const account = await accountClient();
  if (!account) return { status: "error", errors: {}, message: SESSION_EXPIRED };
  // Solo columnas editables: el grant por columna de M10 rechaza el resto (role, fechas)
  const { error } = await account.supabase.from("profiles").update(parsed.data).eq("id", account.userId);
  if (error) {
    console.error("[account] saveProfile", error);
    return { status: "error", errors: {}, message: PROFILE_MESSAGES.generic };
  }
  refresh();
  return { status: "saved" };
}

export type PasswordState =
  | { status: "idle" }
  | { status: "error"; errors: FieldErrors; message?: string }
  | { status: "changed" };

/**
 * Contraseña nueva (artboard: un solo campo). updateUser con la sesión actual; si Supabase pide
 * reautenticación (*Secure password change*), se le pide volver a ingresar. Después se cierran las
 * demás sesiones, como dice el artboard.
 */
export async function changePassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const parsed = validatePasswordChange({ password: formData.get("password") });
  if (!parsed.ok) return { status: "error", errors: parsed.errors };

  const account = await accountClient();
  if (!account) return { status: "error", errors: {}, message: SESSION_EXPIRED };
  const { supabase, userId } = account;

  if (await rateLimiter.isLimited(PASSWORD_RATE_LIMIT, userId)) {
    return { status: "error", errors: {}, message: AUTH_MESSAGES.rateLimited };
  }
  await rateLimiter.hit(PASSWORD_RATE_LIMIT, userId);

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return { status: "error", errors: { password: PROFILE_MESSAGES.samePassword } };
    if (error.code === "weak_password") return { status: "error", errors: { password: PROFILE_MESSAGES.password } };
    if (error.code === "reauthentication_needed" || error.code === "reauthentication_not_valid") {
      return { status: "error", errors: {}, message: PROFILE_MESSAGES.reauthenticate };
    }
    if (error.code === "session_expired" || error.code === "session_not_found") {
      return { status: "error", errors: {}, message: SESSION_EXPIRED };
    }
    console.error("[account] changePassword", error.code, error.message);
    return { status: "error", errors: {}, message: PROFILE_MESSAGES.generic };
  }

  const { error: signOutError } = await supabase.auth.signOut({ scope: "others" });
  if (signOutError) console.error("[account] changePassword: cerrar las demás sesiones", signOutError.code, signOutError.message);
  return { status: "changed" };
}

export type NewsletterResult = { ok: true; optedInAt: string | null } | { ok: false; message: string };

/**
 * *Correos de la tienda* (decisión 7b): activa con la fecha de ahora (la pone la BD,
 * stamp_newsletter_opt_in) o la vacía. No se envía nada hasta elegir un proveedor (7c).
 */
export async function setNewsletter(optIn: boolean): Promise<NewsletterResult> {
  const account = await accountClient();
  if (!account) return { ok: false, message: SESSION_EXPIRED };
  const { data, error } = await account.supabase
    .from("profiles")
    .update({ newsletter_opt_in_at: optIn === true ? new Date().toISOString() : null })
    .eq("id", account.userId)
    .select("newsletter_opt_in_at")
    .maybeSingle();
  if (error || !data) {
    console.error("[account] setNewsletter", error);
    return { ok: false, message: PROFILE_MESSAGES.generic };
  }
  return { ok: true, optedInAt: data.newsletter_opt_in_at };
}
