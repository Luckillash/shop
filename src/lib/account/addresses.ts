import { shippingFieldError, type FieldErrors, type ShippingField, type Validation } from "@/lib/checkout/validation";
import { METROPOLITAN_REGION } from "@/lib/chile/regions";
import { formatChileanMobile, normalizeChileanMobile } from "@/lib/format/phone";

// Direcciones guardadas (7.5, D-030). Los campos y las validaciones son los del paso Despacho del
// checkout (shippingFieldError): así una dirección guardada aquí siempre sirve para comprar.

export const MAX_ADDRESSES = 10;
export const MAX_LABEL = 40;

export type AddressRow = {
  id: string;
  label: string | null;
  recipient_name: string;
  phone: string | null;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  is_default: boolean;
};

export type AddressField = "label" | "firstName" | "lastName" | "phone" | "region" | "commune" | "street";

/** Orden del formulario (artboard Direcciones) */
export const ADDRESS_FIELDS: AddressField[] = ["label", "phone", "firstName", "lastName", "region", "commune", "street"];

export type AddressValues = Record<AddressField | "apartment", string> & { isDefault: boolean };

export const EMPTY_ADDRESS: AddressValues = {
  label: "",
  firstName: "",
  lastName: "",
  phone: "",
  region: "",
  commune: "",
  street: "",
  apartment: "",
  isDefault: false,
};

/** Columnas de addresses que escribe la acción (sin user_id ni is_default) */
export type AddressData = {
  label: string | null;
  recipient_name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string;
  country: "CL";
};

export const ADDRESS_MESSAGES = {
  label: `Usa un nombre de hasta ${MAX_LABEL} caracteres, por ejemplo Casa u Oficina.`,
  /** El del checkout dice *…para calcular la fecha de entrega*, que aquí no aplica */
  commune: "Elige la comuna.",
  limit: `Puedes guardar hasta ${MAX_ADDRESSES} direcciones. Elimina una para agregar otra.`,
  notFound: "No encontramos esa dirección. Recarga la página y vuelve a intentarlo.",
  generic: "No pudimos guardar la dirección. Vuelve a intentarlo.",
  deleteFailed: "No pudimos eliminar la dirección. Vuelve a intentarlo.",
  added: "Guardamos la dirección.",
  updated: "Guardamos los cambios de la dirección.",
  deleted: "Eliminamos la dirección.",
  madeDefault: "Listo: es tu dirección principal.",
} as const;

function text(value: unknown, max = 120): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "";
}

const SHIPPING_FIELD: Partial<Record<AddressField, ShippingField>> = {
  firstName: "firstName",
  lastName: "lastName",
  phone: "phone",
  region: "region",
  commune: "commune",
  street: "street",
};

/** Error de un campo, con las mismas reglas del checkout (despacho a domicilio) */
export function addressFieldError(field: AddressField, input: Partial<Record<AddressField, unknown>>): string | null {
  if (field === "label") {
    return typeof input.label === "string" && input.label.trim().length > MAX_LABEL ? ADDRESS_MESSAGES.label : null;
  }
  const error = shippingFieldError(SHIPPING_FIELD[field]!, { ...input, method: "standard" });
  return error && field === "commune" ? ADDRESS_MESSAGES.commune : error;
}

export function validateAddress(
  input: Partial<Record<AddressField | "apartment", unknown>>,
): Validation<AddressData, AddressField> {
  const errors: FieldErrors<AddressField> = {};
  for (const field of ADDRESS_FIELDS) {
    const error = addressFieldError(field, input);
    if (error) errors[field] = error;
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      label: text(input.label, MAX_LABEL) || null,
      recipient_name: `${text(input.firstName)} ${text(input.lastName)}`,
      phone: normalizeChileanMobile(text(input.phone))!,
      line1: text(input.street),
      line2: text(input.apartment) || null,
      city: text(input.commune),
      region: text(input.region),
      country: "CL",
    },
  };
}

/** Valores para editar una dirección. El nombre se separa como en el checkout (primera palabra) */
export function addressValues(row: AddressRow): AddressValues {
  const [firstName = "", ...rest] = row.recipient_name.trim().split(/\s+/);
  return {
    label: row.label ?? "",
    firstName,
    lastName: rest.join(" "),
    phone: row.phone ? formatChileanMobile(row.phone) : "",
    region: row.region ?? "",
    commune: row.city,
    street: row.line1,
    apartment: row.line2 ?? "",
    isDefault: row.is_default,
  };
}

/** Título de la tarjeta: el nombre que le dio el cliente o, si no tiene (las del checkout), la comuna */
export function addressTitle(row: Pick<AddressRow, "label" | "city">): string {
  return row.label?.trim() || row.city;
}

/** Líneas de la tarjeta: destinatario, calle, comuna y región, teléfono */
export function addressLines(row: AddressRow): string[] {
  const region = row.region === METROPOLITAN_REGION ? "Región Metropolitana" : row.region;
  return [
    row.recipient_name,
    row.line2 ? `${row.line1}, ${row.line2}` : row.line1,
    region ? `${row.city}, ${region}` : row.city,
    row.phone ? formatChileanMobile(row.phone) : null,
  ].filter((line): line is string => Boolean(line));
}

/** La principal primero; después, las más recientes (la consulta ya viene por fecha) */
export function sortAddresses<T extends Pick<AddressRow, "is_default">>(rows: T[]): T[] {
  return [...rows].sort((a, b) => Number(b.is_default) - Number(a.is_default));
}
