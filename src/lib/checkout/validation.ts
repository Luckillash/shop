import { isCommuneOf, isRegion } from "@/lib/chile/regions";
import { isValidChileanMobile, normalizeChileanMobile } from "@/lib/format/phone";
import { cleanRut, isValidRut, normalizeRut } from "@/lib/format/rut";
import { isExpressAvailable, isShippingMethod, type ShippingMethod } from "./shipping";

// Validación de los 3 pasos del checkout. La usan las Server Actions (la que vale) y el cliente
// (al salir de cada campo). Los mensajes dicen la solución, no el diagnóstico
// (04-diseno/estados-y-mensajes.md#errores-de-formulario).

export type FieldErrors<K extends string = string> = Partial<Record<K, string>>;

export type Validation<T, K extends string> = { ok: true; data: T } | { ok: false; errors: FieldErrors<K> };

export const MESSAGES = {
  email: "Escribe tu correo, por ejemplo nombre@correo.cl.",
  firstName: "Escribe tu nombre.",
  lastName: "Escribe tu apellido.",
  rutEmpty: "Escribe tu RUT, por ejemplo 12.345.678-5.",
  rut: "Revisa el dígito verificador: es el número o la K después del guion.",
  phone: "Faltan dígitos. Escribe los 9 números de tu celular, por ejemplo +56 9 1234 5678.",
  region: "Elige tu región.",
  commune: "Elige la comuna para calcular la fecha de entrega.",
  streetEmpty: "Escribe la calle y el número, por ejemplo Av. Providencia 1234.",
  streetNumber: "Agrega el número de la calle, por ejemplo Av. Providencia 1234.",
  method: "Elige cómo quieres recibir tu pedido.",
  expressRegion: "El despacho express es solo para la Región Metropolitana. Elige despacho a domicilio o retiro en tienda.",
  paymentMethod: "Elige cómo quieres pagar.",
  businessName: "Escribe la razón social de la empresa, tal como aparece en el SII.",
  businessRutEmpty: "Escribe el RUT de la empresa, por ejemplo 76.543.210-3.",
  activity: "Escribe el giro de la empresa, tal como aparece en el SII.",
  terms: "Acepta los términos para poder pagar.",
} as const;

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
const MAX_TEXT = 120;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, MAX_TEXT) : "";
}

export function normalizeEmail(value: unknown): string | null {
  const email = text(value).toLowerCase();
  return EMAIL.test(email) ? email : null;
}

/** "Revisa N datos para continuar" */
export function errorSummary(count: number, action: "continuar" | "pagar"): string {
  return `Revisa ${count} ${count === 1 ? "dato" : "datos"} para ${action}`;
}

function rutError(value: string, emptyMessage: string): string | null {
  if (!cleanRut(value)) return emptyMessage;
  return isValidRut(value) ? null : MESSAGES.rut;
}

// ----- Paso 1 · Contacto -----

export type ContactField = "email";

export function validateContact(input: { email: unknown }): Validation<{ email: string }, ContactField> {
  const email = normalizeEmail(input.email);
  return email ? { ok: true, data: { email } } : { ok: false, errors: { email: MESSAGES.email } };
}

// ----- Paso 2 · Despacho -----

export type ShippingField =
  | "firstName"
  | "lastName"
  | "rut"
  | "phone"
  | "region"
  | "commune"
  | "street"
  | "method";

/** Orden de los campos en el formulario: el resumen de errores los enlaza en este orden */
export const SHIPPING_FIELDS: ShippingField[] = [
  "firstName",
  "lastName",
  "rut",
  "phone",
  "region",
  "commune",
  "street",
  "method",
];

export type ShippingInput = Partial<Record<ShippingField | "apartment", unknown>>;

export type ShippingData = {
  method: ShippingMethod;
  firstName: string;
  lastName: string;
  /** "12345678-5" */
  rut: string;
  /** "+56912345678" */
  phone: string;
  /** null en retiro en tienda */
  address: { region: string; commune: string; street: string; apartment: string | null } | null;
};

/** Error de un solo campo (al salir del campo, en el cliente) */
export function shippingFieldError(field: ShippingField, input: ShippingInput): string | null {
  const value = text(input[field]);
  switch (field) {
    case "firstName":
      return value ? null : MESSAGES.firstName;
    case "lastName":
      return value ? null : MESSAGES.lastName;
    case "rut":
      return rutError(value, MESSAGES.rutEmpty);
    case "phone":
      return isValidChileanMobile(value) ? null : MESSAGES.phone;
    case "method":
      if (!isShippingMethod(value)) return MESSAGES.method;
      return value === "express" && !isExpressAvailable(text(input.region) || null) ? MESSAGES.expressRegion : null;
    default:
      break;
  }
  // La dirección no se pide para el retiro en tienda
  if (input.method === "pickup") return null;
  switch (field) {
    case "region":
      return isRegion(value) ? null : MESSAGES.region;
    case "commune":
      return isCommuneOf(text(input.region), value) ? null : MESSAGES.commune;
    case "street":
      if (!value) return MESSAGES.streetEmpty;
      return /\d/.test(value) ? null : MESSAGES.streetNumber;
  }
  return null;
}

export function validateShipping(input: ShippingInput): Validation<ShippingData, ShippingField> {
  const errors: FieldErrors<ShippingField> = {};
  for (const field of SHIPPING_FIELDS) {
    const error = shippingFieldError(field, input);
    if (error) errors[field] = error;
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const method = input.method as ShippingMethod;
  return {
    ok: true,
    data: {
      method,
      firstName: text(input.firstName),
      lastName: text(input.lastName),
      rut: normalizeRut(text(input.rut)),
      phone: normalizeChileanMobile(text(input.phone))!,
      address:
        method === "pickup"
          ? null
          : {
              region: text(input.region),
              commune: text(input.commune),
              street: text(input.street),
              apartment: text(input.apartment) || null,
            },
    },
  };
}

// ----- Paso 3 · Pago -----

export const PAYMENT_METHODS = ["webpay", "flow", "transfer"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type PaymentField = "paymentMethod" | "businessName" | "businessRut" | "activity" | "terms";

export const PAYMENT_FIELDS: PaymentField[] = ["paymentMethod", "businessName", "businessRut", "activity", "terms"];

export type PaymentInput = Partial<Record<PaymentField | "documentType", unknown>>;

export type PaymentData = {
  paymentMethod: PaymentMethod;
  documentType: "boleta" | "factura";
  /** Solo con factura */
  invoice: { business_name: string; rut: string; activity: string } | null;
};

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === "string" && (PAYMENT_METHODS as readonly string[]).includes(value);
}

export function validatePayment(input: PaymentInput): Validation<PaymentData, PaymentField> {
  const errors: FieldErrors<PaymentField> = {};
  const factura = input.documentType === "factura";

  if (!isPaymentMethod(input.paymentMethod)) errors.paymentMethod = MESSAGES.paymentMethod;
  if (factura) {
    if (!text(input.businessName)) errors.businessName = MESSAGES.businessName;
    const rut = rutError(text(input.businessRut), MESSAGES.businessRutEmpty);
    if (rut) errors.businessRut = rut;
    if (!text(input.activity)) errors.activity = MESSAGES.activity;
  }
  // Checkbox: llega "on" (FormData) o true
  if (input.terms !== "on" && input.terms !== true) errors.terms = MESSAGES.terms;

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: {
      paymentMethod: input.paymentMethod as PaymentMethod,
      documentType: factura ? "factura" : "boleta",
      invoice: factura
        ? {
            business_name: text(input.businessName),
            rut: normalizeRut(text(input.businessRut)),
            activity: text(input.activity),
          }
        : null,
    },
  };
}
