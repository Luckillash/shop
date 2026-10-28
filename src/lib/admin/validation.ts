import { formatCLP } from "@/lib/format/clp";
import { CARRIERS } from "@/lib/orders/customer-view";
import { STORE } from "@/lib/store";
import { pendingRefund, type AdminListOrder } from "./order-list";

// Entradas de las acciones de la administración (Server Actions de src/lib/admin/actions.ts): se
// validan aquí, en el servidor. Montos y estados nunca vienen del formulario: salen del pedido.
// Puro: lo usan las acciones, los formularios (límites) y los tests.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

const str = (value: FormDataEntryValue | null | undefined) => (typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "");

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

/** N.º de operación de la cartola (opcional): letras, números, espacios y guiones */
export const OPERATION_MAX = 40;

export function parseOperationNumber(value: FormDataEntryValue | null): Parsed<string | null> {
  const operation = str(value);
  if (!operation) return { ok: true, value: null };
  if (operation.length > OPERATION_MAX) return { ok: false, error: `Usa ${OPERATION_MAX} caracteres como máximo.` };
  if (!/^[\p{L}\d][\p{L}\d -]*$/u.test(operation)) return { ok: false, error: "Escribe solo letras y números, sin símbolos." };
  return { ok: true, value: operation };
}

export const TRACKING_MAX = 40;

export type Shipment = { carrier: string | null; tracking: string | null };
export type ShipmentErrors = { carrier?: string; tracking?: string };

/**
 * *Marcar como enviado*: el transportista es uno de CARRIERS (se guarda su `name`) y el código es
 * obligatorio salvo con el despacho propio. En el retiro en tienda no hay transportista.
 */
export function parseShipment(
  input: { carrier: FormDataEntryValue | null; tracking: FormDataEntryValue | null },
  pickup: boolean,
): { ok: true; value: Shipment } | { ok: false; errors: ShipmentErrors } {
  if (pickup) return { ok: true, value: { carrier: null, tracking: null } };
  const carrier = CARRIERS.find((c) => c.name === str(input.carrier));
  const tracking = str(input.tracking);
  const errors: ShipmentErrors = {};
  if (!carrier) errors.carrier = "Elige el transportista.";
  if (!tracking && carrier?.name !== STORE.name) errors.tracking = "Escribe el código de seguimiento.";
  else if (tracking.length > TRACKING_MAX) errors.tracking = `Usa ${TRACKING_MAX} caracteres como máximo.`;
  else if (tracking && !/^[\p{L}\d][\p{L}\d -]*$/u.test(tracking)) errors.tracking = "Escribe solo letras y números, como en la etiqueta.";
  if (errors.carrier || errors.tracking) return { ok: false, errors };
  return { ok: true, value: { carrier: carrier!.name, tracking: tracking || null } };
}

/**
 * Motivos de *Anular pedido*. El texto es el que lee el cliente en el correo y en Mis pedidos
 * (orders.cancel_note); sin motivo, el correo dice *Tuvimos que anular tu pedido. Lo sentimos.*
 * Las frases son propuestas: el artboard muestra opciones escritas para el admin.
 */
export const CANCEL_MOTIVES = [
  { id: "stock", label: "No hay stock de un producto", note: "Nos quedamos sin stock de un producto del pedido." },
  { id: "direccion", label: "No se puede despachar a esa dirección", note: "No podemos despachar a la dirección del pedido." },
  { id: "cliente", label: "Lo pidió el cliente", note: "Anulamos el pedido como nos pediste." },
  { id: "otro", label: "Otro motivo", note: null },
  { id: "ninguno", label: "Sin motivo", note: null },
] as const;

export type CancelMotive = (typeof CANCEL_MOTIVES)[number]["id"];

export const NOTE_MAX = 200;

export function parseCancelNote(motive: FormDataEntryValue | null, other: FormDataEntryValue | null): Parsed<string | null> {
  const option = CANCEL_MOTIVES.find((m) => m.id === motive);
  if (!option) return { ok: false, error: "Elige el motivo." };
  if (option.id !== "otro") return { ok: true, value: option.note };
  const note = str(other);
  if (!note) return { ok: false, error: "Escribe el motivo que va a leer el cliente." };
  if (note.length > NOTE_MAX) return { ok: false, error: `Usa ${NOTE_MAX} caracteres como máximo.` };
  return { ok: true, value: note };
}

const GATEWAY: Record<string, string> = { webpay: "Webpay Plus", flow: "Flow" };

export type CancelPlan = {
  /** gateway = se reembolsa en la pasarela al anular; transfer = el admin devuelve a mano (decisión 5) */
  refund: "gateway" | "transfer" | null;
  amount: number;
  /** El texto del `Notice warning` *Esto no se puede deshacer* */
  notice: string;
  confirmLabel: string;
  /** *Diego Muñoz · $47.480 · Pagado con Webpay Plus* (bajo el título del modal) */
  paidWith: string;
};

/** Qué pasa con el dinero si se anula: sale del pedido (estado e intentos), nunca del formulario */
export function cancelPlan(order: Pick<AdminListOrder, "status" | "total" | "payments">): CancelPlan {
  const paid = order.payments.find((p) => p.status === "paid");
  const amount = Math.round(Number(paid?.amount ?? order.total));
  const money = formatCLP(amount);
  if (!paid) {
    return {
      refund: null,
      amount,
      notice: "Los productos volverán al stock. No hay nada que devolver: el pedido no está pagado.",
      confirmLabel: "Anular pedido",
      paidWith: `${formatCLP(Math.round(Number(order.total)))} · Sin pagar`,
    };
  }
  if (paid.provider === "transfer") {
    return {
      refund: "transfer",
      amount,
      notice: `Devuélvele ${money} por transferencia. Los productos volverán al stock. Cuando hagas la transferencia, marca Ya devolví el dinero en el pedido.`,
      confirmLabel: "Anular pedido",
      paidWith: `${money} · Pagado por transferencia`,
    };
  }
  const gateway = GATEWAY[paid.provider] ?? "la pasarela";
  return {
    refund: "gateway",
    amount,
    notice: `Devolveremos ${money} en ${gateway} y los productos volverán al stock. El reembolso puede tardar unos días hábiles en verse en ${paid.provider === "webpay" ? "la tarjeta" : "la cuenta"}.`,
    confirmLabel: "Anular y reembolsar",
    paidWith: `${money} · Pagado con ${gateway}`,
  };
}

/** Lo que el modal de reembolso de un pedido ya anulado puede hacer (1042, reembolso fallido) */
export function refundPlan(order: Pick<AdminListOrder, "status" | "payments">): { kind: "gateway" | "transfer"; amount: number; gateway: string } | null {
  const owed = pendingRefund(order);
  if (!owed) return null;
  return {
    kind: owed.provider === "transfer" ? "transfer" : "gateway",
    amount: Math.round(Number(owed.amount)),
    gateway: GATEWAY[owed.provider] ?? "transferencia",
  };
}
