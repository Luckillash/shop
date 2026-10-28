import { MIN_PASSWORD_LENGTH } from "@/lib/auth/validation";
import { MESSAGES, type FieldErrors, type Validation } from "@/lib/checkout/validation";
import { formatChileanMobile, isValidChileanMobile, normalizeChileanMobile } from "@/lib/format/phone";
import { cleanRut, formatRut, isValidRut, normalizeRut } from "@/lib/format/rut";

// Datos personales (7.5, D-030): nombre, apellido, teléfono y RUT opcional (decisión 7a).
// Puro: lo usan la Server Action (la que vale) y el formulario (al salir de cada campo).

export const MAX_NAME = 80;

/** Fila de profiles que necesita la cuenta */
export type ProfileRow = {
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  rut: string | null;
  newsletter_opt_in_at: string | null;
};

export type ProfileField = "firstName" | "lastName" | "phone" | "rut";

export const PROFILE_FIELDS: ProfileField[] = ["firstName", "lastName", "phone", "rut"];

export type ProfileValues = Record<ProfileField, string>;

export type ProfileData = {
  first_name: string;
  last_name: string | null;
  full_name: string;
  /** "+56912345678" o null */
  phone: string | null;
  /** "12345678-5" o null */
  rut: string | null;
};

export const PROFILE_MESSAGES = {
  firstName: MESSAGES.firstName,
  phone: MESSAGES.phone,
  rut: MESSAGES.rut,
  saved: "Guardamos tus cambios.",
  generic: "No pudimos guardar tus cambios. Vuelve a intentarlo.",
  password: `Usa al menos ${MIN_PASSWORD_LENGTH} caracteres en tu contraseña.`,
  samePassword: "Usa una contraseña distinta a la actual.",
  passwordChanged: "Cambiamos tu contraseña. Cerramos tu sesión en los demás dispositivos.",
  reauthenticate: "Por seguridad, vuelve a ingresar con tu contraseña actual y cámbiala de nuevo.",
  newsletterOn: "Listo: te vamos a escribir con novedades y ofertas.",
  newsletterOff: "Listo: ya no te vamos a escribir con novedades.",
} as const;

function text(value: unknown, max = MAX_NAME): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "";
}

/** "Camila" + "Rojas" → "Camila Rojas" (full_name, que usan el saludo y los pedidos) */
export function fullNameOf(firstName: string, lastName: string | null): string {
  return [firstName, lastName].filter(Boolean).join(" ");
}

/** Error de un campo; los opcionales vacíos están bien */
export function profileFieldError(field: ProfileField, values: Partial<Record<ProfileField, unknown>>): string | null {
  const value = text(values[field]);
  switch (field) {
    case "firstName":
      return value ? null : PROFILE_MESSAGES.firstName;
    case "lastName":
      return null;
    case "phone":
      return !value || isValidChileanMobile(value) ? null : PROFILE_MESSAGES.phone;
    case "rut":
      return !cleanRut(value) || isValidRut(value) ? null : PROFILE_MESSAGES.rut;
  }
}

export function validateProfile(input: Partial<Record<ProfileField, unknown>>): Validation<ProfileData, ProfileField> {
  const errors: FieldErrors<ProfileField> = {};
  for (const field of PROFILE_FIELDS) {
    const error = profileFieldError(field, input);
    if (error) errors[field] = error;
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const firstName = text(input.firstName);
  const lastName = text(input.lastName) || null;
  const rut = cleanRut(text(input.rut));
  return {
    ok: true,
    data: {
      first_name: firstName,
      last_name: lastName,
      full_name: fullNameOf(firstName, lastName),
      phone: normalizeChileanMobile(text(input.phone)),
      rut: rut ? normalizeRut(rut) : null,
    },
  };
}

/**
 * Valores del formulario. Si la cuenta todavía no separó nombre y apellido (Crear cuenta y la
 * conversión del invitado guardan solo full_name), la primera palabra es el nombre y el resto el
 * apellido: el cliente lo corrige y al guardar quedan separados.
 */
export function profileValues(row: Omit<ProfileRow, "newsletter_opt_in_at"> | null): ProfileValues {
  const [first = "", ...rest] = (row?.full_name ?? "").trim().split(/\s+/).filter(Boolean);
  const separated = row?.first_name != null;
  return {
    firstName: separated ? (row?.first_name ?? "") : first,
    lastName: separated ? (row?.last_name ?? "") : rest.join(" "),
    phone: row?.phone ? formatChileanMobile(row.phone) : "",
    rut: row?.rut ? formatRut(row.rut) : "",
  };
}

/** Nombre del saludo *Hola, Camila*: first_name o la primera palabra de full_name */
export function greetingName(row: Pick<ProfileRow, "first_name" | "full_name"> | null): string | null {
  const first = row?.first_name?.trim();
  if (first) return first.split(/\s+/)[0];
  return row?.full_name?.trim().split(/\s+/)[0] || null;
}

/** Contraseña nueva de Datos personales: un solo campo, mínimo 8 caracteres (artboard) */
export function validatePasswordChange(input: { password: unknown }) {
  const password = typeof input.password === "string" ? input.password : "";
  return password.length >= MIN_PASSWORD_LENGTH
    ? { ok: true as const, data: { password } }
    : { ok: false as const, errors: { password: PROFILE_MESSAGES.password } };
}
