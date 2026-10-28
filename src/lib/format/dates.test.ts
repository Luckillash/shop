import { describe, expect, test } from "vitest";
import { formatDayMonth, formatDeadline, formatDeliveryDay, formatFullDate, formatLongDate, formatShortDateTime, formatTime } from "./dates";

// Las fechas se fijan en UTC; las funciones las muestran en hora de Chile
describe("fechas en America/Santiago", () => {
  test("día de entrega sin coma, como en el diseño", () => {
    expect(formatDeliveryDay(new Date("2026-10-24T15:00:00Z"))).toBe(
      "sábado 24 de octubre",
    );
  });

  test("convierte desde UTC aunque cambie el día", () => {
    // 01:00 UTC del domingo 25 = 22:00 del sábado 24 en Chile (UTC-3)
    const date = new Date("2026-10-25T01:00:00Z");
    expect(formatTime(date)).toBe("22:00");
    expect(formatDeadline(date)).toBe("sábado 24 de octubre a las 22:00");
  });

  test("usa el horario de invierno (UTC-4)", () => {
    // 1 de julio: Chile continental está en UTC-4
    expect(formatTime(new Date("2026-07-01T18:00:00Z"))).toBe("14:00");
  });

  test("fecha de compra con año", () => {
    // 01:00 UTC del 1 de enero de 2027 = 22:00 del jueves 31 de diciembre de 2026 en Chile (UTC-3)
    const date = new Date("2027-01-01T01:00:00Z");
    expect(formatLongDate(date)).toBe("31 de diciembre de 2026");
    expect(formatFullDate(date)).toBe("jueves 31 de diciembre de 2026");
  });
});

describe("fecha corta de la administración", () => {
  test("día de la semana y mes abreviados, con la hora de Chile", () => {
    // 13:12 UTC del domingo 25 de octubre = 10:12 en Chile
    expect(formatShortDateTime(new Date("2026-10-25T13:12:00Z"))).toBe("Dom 25 oct · 10:12");
  });
});

test("formatDayMonth: día y mes en hora de Chile (Escribe tu opinión)", () => {
  expect(formatDayMonth(new Date("2026-10-16T15:00:00Z"))).toBe("16 de octubre");
  expect(formatDayMonth(new Date("2026-10-17T00:30:00Z"))).toBe("16 de octubre");
});
