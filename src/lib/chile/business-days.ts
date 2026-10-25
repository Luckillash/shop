import { BUSINESS_TIME_ZONE } from "@/lib/format/dates";

// Días hábiles en Chile (lunes a viernes sin feriados) para las fechas de entrega del checkout.
// Se trabaja con fechas de calendario de Santiago ("2026-10-24"), no con horas: así el cambio de
// horario de abril y septiembre no corre las fechas (trampa 37).

/**
 * Feriados nacionales 2026 y 2027 (Ley 2.977 y modificaciones), con los traslados ya aplicados:
 * San Pedro y San Pablo y Encuentro de Dos Mundos al lunes más cercano (Ley 19.668), Pueblos
 * Indígenas el día del solsticio (Ley 21.357), viernes 17 de septiembre cuando el 18 y el 19 caen
 * sábado y domingo (Ley 20.983). Verificados el 2026-10-24 contra la prensa y Buk; sin feriados
 * regionales (7 de junio en Arica, 20 de agosto en Chillán). Agregar cada año (B31).
 */
export const HOLIDAYS: readonly string[] = [
  // 2026
  "2026-01-01", "2026-04-03", "2026-04-04", "2026-05-01", "2026-05-21", "2026-06-21",
  "2026-06-29", "2026-07-16", "2026-08-15", "2026-09-18", "2026-09-19", "2026-10-12",
  "2026-10-31", "2026-11-01", "2026-12-08", "2026-12-25",
  // 2027
  "2027-01-01", "2027-03-26", "2027-03-27", "2027-05-01", "2027-05-21", "2027-06-21",
  "2027-06-28", "2027-07-16", "2027-08-15", "2027-09-17", "2027-09-18", "2027-09-19", "2027-10-11",
  "2027-10-31", "2027-11-01", "2027-12-08", "2027-12-25",
];

/** "2026-10-24" */
export type CalendarDate = string;

const ymd = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: BUSINESS_TIME_ZONE,
});

const hour = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: BUSINESS_TIME_ZONE });

/** Fecha de calendario en Santiago para un instante */
export function santiagoDate(now: Date): CalendarDate {
  return ymd.format(now);
}

/** Hora (0–23) en Santiago */
export function santiagoHour(now: Date): number {
  return Number(hour.format(now)) % 24;
}

function toUtcNoon(date: CalendarDate): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

function fromUtc(date: Date): CalendarDate {
  return date.toISOString().slice(0, 10);
}

export function isBusinessDay(date: CalendarDate, holidays: readonly string[] = HOLIDAYS): boolean {
  const weekday = toUtcNoon(date).getUTCDay();
  return weekday !== 0 && weekday !== 6 && !holidays.includes(date);
}

/** El n-ésimo día hábil después de `date` (n ≥ 1; `date` no cuenta) */
export function addBusinessDays(date: CalendarDate, n: number, holidays: readonly string[] = HOLIDAYS): CalendarDate {
  const cursor = toUtcNoon(date);
  let left = n;
  while (left > 0) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (isBusinessDay(fromUtc(cursor), holidays)) left--;
  }
  return fromUtc(cursor);
}

/**
 * Instante para formatear la fecha con formatDeliveryDay (que usa la zona de Santiago):
 * el mediodía UTC cae el mismo día en Chile con o sin horario de verano.
 */
export function calendarDateToDate(date: CalendarDate): Date {
  return toUtcNoon(date);
}
