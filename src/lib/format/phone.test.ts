import { describe, expect, test } from "vitest";
import {
  formatChileanMobile,
  isValidChileanMobile,
  normalizeChileanMobile,
} from "./phone";

describe("celular chileno", () => {
  test("normaliza a E.164 con o sin prefijo", () => {
    expect(normalizeChileanMobile("+56 9 1234 5678")).toBe("+56912345678");
    expect(normalizeChileanMobile("912345678")).toBe("+56912345678");
    expect(normalizeChileanMobile("56912345678")).toBe("+56912345678");
  });

  test("rechaza números incompletos o que no son celulares", () => {
    expect(isValidChileanMobile("9 1234 567")).toBe(false);
    expect(isValidChileanMobile("221234567")).toBe(false);
    expect(normalizeChileanMobile("12345")).toBeNull();
  });

  test("formatea para mostrar y deja intacto lo inválido", () => {
    expect(formatChileanMobile("56912345678")).toBe("+56 9 1234 5678");
    expect(formatChileanMobile("123")).toBe("123");
  });
});
