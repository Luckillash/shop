import { describe, expect, test } from "vitest";
import { METROPOLITAN_REGION } from "@/lib/chile/regions";
import { deliveryEstimate, isExpressAvailable, isShippingMethod, shippingCost, shippingMethodLabel } from "./shipping";

describe("shippingCost (mismas reglas que place_order)", () => {
  test("retiro gratis; express $4.990 aunque pase el umbral, solo en la RM", () => {
    expect(shippingCost("pickup", null, 10000)).toBe(0);
    expect(shippingCost("express", METROPOLITAN_REGION, 50000)).toBe(4990);
    expect(shippingCost("express", null, 10000)).toBe(4990);
    expect(shippingCost("express", "Biobío", 10000)).toBeNull();
  });

  test("isExpressAvailable: RM o sin región todavía", () => {
    expect(isExpressAvailable(METROPOLITAN_REGION)).toBe(true);
    expect(isExpressAvailable(null)).toBe(true);
    expect(isExpressAvailable("Valparaíso")).toBe(false);
  });

  test("domicilio: gratis desde $39.990 después del cupón, si no RM $3.990 y regiones $6.990", () => {
    expect(shippingCost("standard", METROPOLITAN_REGION, 39990)).toBe(0);
    expect(shippingCost("standard", null, 39990)).toBe(0);
    expect(shippingCost("standard", METROPOLITAN_REGION, 39989)).toBe(3990);
    expect(shippingCost("standard", "Valparaíso", 20000)).toBe(6990);
    expect(shippingCost("standard", null, 20000)).toBeNull();
  });
});

describe("deliveryEstimate", () => {
  // Jueves 22 de octubre de 2026 a las 10:00 en Santiago (UTC−3)
  const thursdayMorning = new Date("2026-10-22T13:00:00Z");
  const thursdayAfternoon = new Date("2026-10-22T18:00:00Z");

  test("express antes de las 14:00: llega mañana (texto del diseño)", () => {
    expect(deliveryEstimate("express", null, thursdayMorning)?.label).toBe(
      "Llega mañana, viernes 23 de octubre, si pagas antes de las 14:00",
    );
  });

  test("express después de las 14:00 o en fin de semana: un día hábil más", () => {
    expect(deliveryEstimate("express", null, thursdayAfternoon)?.label).toBe("Llega el lunes 26 de octubre");
    const saturday = new Date("2026-10-24T13:00:00Z");
    expect(deliveryEstimate("express", null, saturday)?.label).toBe("Llega el martes 27 de octubre");
  });

  test("domicilio: RM 2 días hábiles, regiones 5; sin región no hay fecha", () => {
    expect(deliveryEstimate("standard", METROPOLITAN_REGION, thursdayMorning)?.label).toBe("Llega el lunes 26 de octubre");
    expect(deliveryEstimate("standard", "Los Lagos", thursdayMorning)?.label).toBe("Llega el jueves 29 de octubre");
    expect(deliveryEstimate("standard", null, thursdayMorning)).toBeNull();
  });

  test("retiro: desde el día hábil siguiente", () => {
    expect(deliveryEstimate("pickup", null, thursdayMorning)?.label).toBe("Disponible desde el viernes 23 de octubre");
  });
});

test("isShippingMethod y etiquetas", () => {
  expect(isShippingMethod("express")).toBe(true);
  expect(isShippingMethod("drone")).toBe(false);
  expect(shippingMethodLabel("pickup")).toBe("Retiro en tienda Local Tajamar");
});
