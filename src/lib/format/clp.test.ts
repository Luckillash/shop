import { describe, expect, test } from "vitest";
import { formatCLP } from "./clp";

describe("formatCLP", () => {
  test("usa punto de miles y no deja espacio tras el signo", () => {
    expect(formatCLP(43960)).toBe("$43.960");
    expect(formatCLP(12490)).toBe("$12.490");
  });

  test("redondea a pesos enteros", () => {
    expect(formatCLP(1299.5)).toBe("$1.300");
    expect(formatCLP(1299.4)).toBe("$1.299");
  });

  test("montos bajo mil y cero", () => {
    expect(formatCLP(990)).toBe("$990");
    expect(formatCLP(0)).toBe("$0");
    expect(formatCLP(-0.4)).toBe("$0");
  });

  test("los descuentos usan el signo menos tipográfico", () => {
    expect(formatCLP(-5000)).toBe("−$5.000");
  });
});
