import { MESSAGES, normalizeEmail, type FieldErrors } from "@/lib/checkout/validation";

// Validación de Ingresar y Crear cuenta, y del destino después de ingresar (?volver=).

export const MIN_PASSWORD_LENGTH = 8;

export const AUTH_MESSAGES = {
  email: MESSAGES.email,
  password: "Escribe tu contraseña.",
  newPassword: `Usa al menos ${MIN_PASSWORD_LENGTH} caracteres en tu contraseña.`,
  name: MESSAGES.firstName,
  wrongCredentials: "El correo o la contraseña no coinciden. Revísalos y vuelve a intentarlo.",
  emailNotConfirmed: "Confirma tu correo para ingresar: te enviamos un enlace cuando creaste la cuenta.",
  rateLimited: "Hiciste muchos intentos. Espera unos minutos y vuelve a intentarlo.",
  guestUnavailable: "La compra como invitado no está disponible en este momento. Ingresa o crea una cuenta.",
  generic: "No pudimos completar la acción. Vuelve a intentarlo en unos minutos.",
  passwordMismatch: "Las contraseñas no coinciden. Escribe la misma en los dos campos.",
  samePassword: "Usa una contraseña distinta a la anterior.",
  resetSent: "Si hay una cuenta con ese correo, te enviamos un enlace para crear una contraseña nueva. Revisa también la carpeta de spam.",
  resetExpired: "El enlace para cambiar tu contraseña no es válido o ya venció. Pide uno nuevo.",
} as const;

export type LoginField = "email" | "password";
export type SignupField = "name" | "email" | "password";
export type NewPasswordField = "password" | "confirm";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function validateLogin(input: { email: unknown; password: unknown }) {
  const errors: FieldErrors<LoginField> = {};
  const email = normalizeEmail(input.email);
  const password = typeof input.password === "string" ? input.password : "";
  if (!email) errors.email = AUTH_MESSAGES.email;
  if (!password) errors.password = AUTH_MESSAGES.password;
  return email && password ? { ok: true as const, data: { email, password } } : { ok: false as const, errors };
}

export function validateSignup(input: { name: unknown; email: unknown; password: unknown; newsletter?: unknown }) {
  const errors: FieldErrors<SignupField> = {};
  const name = text(input.name).slice(0, 80);
  const email = normalizeEmail(input.email);
  const password = typeof input.password === "string" ? input.password : "";
  if (!name) errors.name = AUTH_MESSAGES.name;
  if (!email) errors.email = AUTH_MESSAGES.email;
  if (password.length < MIN_PASSWORD_LENGTH) errors.password = AUTH_MESSAGES.newPassword;
  if (Object.keys(errors).length > 0) return { ok: false as const, errors };
  return {
    ok: true as const,
    data: { name, email: email!, password, newsletter: input.newsletter === "on" || input.newsletter === true },
  };
}

/** *¿Olvidaste tu contraseña?*: solo el correo */
export function validateResetRequest(input: { email: unknown }) {
  const email = normalizeEmail(input.email);
  return email ? { ok: true as const, data: { email } } : { ok: false as const, errors: { email: AUTH_MESSAGES.email } };
}

/** Contraseña nueva: mínimo 8 caracteres y la misma en los dos campos */
export function validateNewPassword(input: { password: unknown; confirm: unknown }) {
  const errors: FieldErrors<NewPasswordField> = {};
  const password = typeof input.password === "string" ? input.password : "";
  const confirm = typeof input.confirm === "string" ? input.confirm : "";
  if (password.length < MIN_PASSWORD_LENGTH) errors.password = AUTH_MESSAGES.newPassword;
  else if (confirm !== password) errors.confirm = AUTH_MESSAGES.passwordMismatch;
  return Object.keys(errors).length > 0 ? { ok: false as const, errors } : { ok: true as const, data: { password } };
}

/** Solo rutas internas ("/checkout"); cualquier otra cosa (URL externa, "//otro.cl") vuelve al inicio */
export function safeNext(value: unknown, fallback = "/"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
