// Zona horaria del negocio: fechas de entrega y límites de pago se muestran en hora de Chile
export const BUSINESS_TIME_ZONE = "America/Santiago";

const day = new Intl.DateTimeFormat("es-CL", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: BUSINESS_TIME_ZONE,
});

const time = new Intl.DateTimeFormat("es-CL", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: BUSINESS_TIME_ZONE,
});

// "jueves 24 de octubre" (Intl agrega una coma tras el día de la semana; el diseño no la usa)
export function formatDeliveryDay(date: Date): string {
  return day.format(date).replace(",", "");
}

// "22:00"
export function formatTime(date: Date): string {
  return time.format(date);
}

// "sábado 24 de octubre a las 22:00"
export function formatDeadline(date: Date): string {
  return `${formatDeliveryDay(date)} a las ${formatTime(date)}`;
}

const longDate = new Intl.DateTimeFormat("es-CL", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: BUSINESS_TIME_ZONE,
});

const weekday = new Intl.DateTimeFormat("es-CL", { weekday: "long", timeZone: BUSINESS_TIME_ZONE });

const dayMonth = new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "long", timeZone: BUSINESS_TIME_ZONE });

// "16 de octubre" (Escribe tu opinión: *La compraste el …*)
export function formatDayMonth(date: Date): string {
  return dayMonth.format(date);
}

// "25 de octubre de 2026" (Mis pedidos: *Comprado el …*)
export function formatLongDate(date: Date): string {
  return longDate.format(date);
}

// "domingo 25 de octubre de 2026" (Detalle de pedido)
export function formatFullDate(date: Date): string {
  return `${weekday.format(date)} ${longDate.format(date)}`;
}

const shortParts = new Intl.DateTimeFormat("es-CL", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: BUSINESS_TIME_ZONE,
});

// "Dom 25 oct · 10:12" (historial y lista de la administración)
export function formatShortDateTime(date: Date): string {
  const parts = Object.fromEntries(shortParts.formatToParts(date).map((p) => [p.type, p.value]));
  const weekdayName = (parts.weekday ?? "").replace(".", "");
  const monthName = (parts.month ?? "").replace(".", "");
  return `${weekdayName.charAt(0).toUpperCase()}${weekdayName.slice(1)} ${parts.day} ${monthName} · ${formatTime(date)}`;
}
