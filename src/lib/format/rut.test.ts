import { describe, expect, test } from "vitest";
import { cleanRut, formatRut, isValidRut, normalizeRut } from "./rut";

describe("isValidRut", () => {
  test("acepta RUT válidos en cualquier formato", () => {
    expect(isValidRut("11.111.111-1")).toBe(true); // RUT de prueba de Webpay y Flow
    expect(isValidRut("76.543.210-3")).toBe(true); // RUT del diseño
    expect(isValidRut("765432103")).toBe(true);
  });

  test("acepta la K en minúscula o mayúscula", () => {
    // 10.000.013-K: el módulo 11 da 10 → K
    expect(isValidRut("10.000.013-K")).toBe(true);
    expect(isValidRut("10000013-k")).toBe(true);
  });

  test("rechaza un dígito verificador incorrecto", () => {
    expect(isValidRut("11.111.111-2")).toBe(false);
  });

  test("rechaza entradas incompletas o mal formadas", () => {
    expect(isValidRut("")).toBe(false);
    expect(isValidRut("k")).toBe(false);
    expect(isValidRut("1K1-1")).toBe(false);
  });
});

describe("formatos de RUT", () => {
  test("cleanRut deja solo dígitos y K", () => {
    expect(cleanRut("12.345.678-k")).toBe("12345678K");
  });

  test("normalizeRut sirve para guardar", () => {
    expect(normalizeRut("12.345.678-5")).toBe("12345678-5");
  });

  test("formatRut sirve para mostrar", () => {
    expect(formatRut("123456785")).toBe("12.345.678-5");
    expect(formatRut("76543210-3")).toBe("76.543.210-3");
  });
});
