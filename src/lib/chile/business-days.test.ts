import { expect, test } from "vitest";
import { formatDeliveryDay } from "@/lib/format/dates";
import { addBusinessDays, calendarDateToDate, isBusinessDay, santiagoDate, santiagoHour } from "./business-days";

test("fin de semana y feriados no son hábiles", () => {
  expect(isBusinessDay("2026-10-23")).toBe(true); // viernes
  expect(isBusinessDay("2026-10-24")).toBe(false); // sábado
  expect(isBusinessDay("2026-10-12")).toBe(false); // Encuentro de Dos Mundos (lunes)
  expect(isBusinessDay("2026-09-18")).toBe(false);
  // Ley 20.983: el 18 y el 19 de septiembre de 2027 caen sábado y domingo
  expect(isBusinessDay("2027-09-17")).toBe(false);
  expect(addBusinessDays("2027-09-16", 1)).toBe("2027-09-20");
});

test("addBusinessDays salta fines de semana y feriados", () => {
  expect(addBusinessDays("2026-10-23", 1)).toBe("2026-10-26");
  expect(addBusinessDays("2026-10-09", 1)).toBe("2026-10-13");
  expect(addBusinessDays("2026-10-30", 1)).toBe("2026-11-02");
  expect(addBusinessDays("2026-10-22", 5)).toBe("2026-10-29");
  expect(addBusinessDays("2026-12-31", 1, [])).toBe("2027-01-01");
  expect(addBusinessDays("2026-12-31", 1)).toBe("2027-01-04");
});

test("fecha y hora en Santiago, no en UTC", () => {
  // 02:30 UTC del viernes = 23:30 del jueves en Chile (UTC−3 en octubre)
  const now = new Date("2026-10-23T02:30:00Z");
  expect(santiagoDate(now)).toBe("2026-10-22");
  expect(santiagoHour(now)).toBe(23);
  // Invierno (UTC−4)
  expect(santiagoHour(new Date("2026-07-01T14:00:00Z"))).toBe(10);
});

test("calendarDateToDate se formatea el mismo día con o sin horario de verano", () => {
  expect(formatDeliveryDay(calendarDateToDate("2026-10-26"))).toBe("lunes 26 de octubre");
  expect(formatDeliveryDay(calendarDateToDate("2026-07-01"))).toBe("miércoles 1 de julio");
});
