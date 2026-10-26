import {
  addBusinessDays,
  calendarDateToDate,
  isBusinessDay,
  santiagoDate,
  santiagoHour,
  type CalendarDate,
} from "@/lib/chile/business-days";
import { METROPOLITAN_REGION } from "@/lib/chile/regions";
import { formatDeliveryDay } from "@/lib/format/dates";
import { STORE } from "@/lib/store";

// Despacho del checkout (D-011). El monto que vale es el de place_order: estas funciones repiten
// sus reglas solo para mostrar el costo y la fecha antes de crear el pedido.

export const SHIPPING_METHODS = ["standard", "express", "pickup"] as const;
export type ShippingMethod = (typeof SHIPPING_METHODS)[number];

export const SHIPPING_RATES = { metropolitan: 3990, regions: 6990, express: 4990 } as const;

/** Hora límite (Santiago) para que el express salga el mismo día */
export const EXPRESS_CUTOFF_HOUR = 14;

/** El express es solo para la Región Metropolitana (dueño, 2026-10-24). Sin región todavía, se ofrece */
export function isExpressAvailable(region: string | null): boolean {
  return !region || region === METROPOLITAN_REGION;
}

export function isShippingMethod(value: unknown): value is ShippingMethod {
  return typeof value === "string" && (SHIPPING_METHODS as readonly string[]).includes(value);
}

/**
 * Costo en CLP. `base` es el subtotal después del cupón (el umbral del despacho gratis se mide
 * contra él, D-011). null = falta la región para saberlo, o el express fuera de la RM.
 */
export function shippingCost(method: ShippingMethod, region: string | null, base: number): number | null {
  if (method === "pickup") return 0;
  if (method === "express") return isExpressAvailable(region) ? SHIPPING_RATES.express : null;
  if (base >= STORE.freeShippingThreshold) return 0;
  if (!region) return null;
  return region === METROPOLITAN_REGION ? SHIPPING_RATES.metropolitan : SHIPPING_RATES.regions;
}

export type DeliveryEstimate = {
  date: CalendarDate;
  /** "Llega el martes 27 de octubre" */
  label: string;
};

function day(date: CalendarDate): string {
  return formatDeliveryDay(calendarDateToDate(date));
}

/**
 * Fecha estimada si el pago se confirma ahora. Domicilio: el último día del plazo (RM 2 días
 * hábiles, regiones 5). Express: el día hábil siguiente si se paga antes de las 14:00 de un día
 * hábil. Retiro: desde STORE.pickup.readyInBusinessDays días hábiles. null = falta la región.
 */
export function deliveryEstimate(method: ShippingMethod, region: string | null, now: Date): DeliveryEstimate | null {
  const today = santiagoDate(now);

  if (method === "pickup") {
    const date = addBusinessDays(today, STORE.pickup.readyInBusinessDays);
    return { date, label: `Disponible desde el ${day(date)}` };
  }

  if (method === "express") {
    const beforeCutoff = isBusinessDay(today) && santiagoHour(now) < EXPRESS_CUTOFF_HOUR;
    const date = addBusinessDays(beforeCutoff ? today : addBusinessDays(today, 1), 1);
    const tomorrow = santiagoDate(new Date(calendarDateToDate(today).getTime() + 86_400_000));
    if (beforeCutoff && date === tomorrow) {
      return { date, label: `Llega mañana, ${day(date)}, si pagas antes de las ${EXPRESS_CUTOFF_HOUR}:00` };
    }
    return { date, label: `Llega el ${day(date)}` };
  }

  if (!region) return null;
  const date = addBusinessDays(today, region === METROPOLITAN_REGION ? 2 : 5);
  return { date, label: `Llega el ${day(date)}` };
}

/** "Despacho a domicilio" · "Despacho express" · "Retiro en tienda Local Tajamar" */
export function shippingMethodLabel(method: ShippingMethod): string {
  switch (method) {
    case "standard":
      return "Despacho a domicilio";
    case "express":
      return "Despacho express";
    case "pickup":
      return `Retiro en tienda ${STORE.pickup.name}`;
  }
}
