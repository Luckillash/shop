import { expect, test } from "vitest";
import { countsAsFailedAttempt, couponFailureReason, couponMessage, normalizeCouponCode } from "./coupon";

test("normalizeCouponCode recorta, pasa a mayúsculas y rechaza lo que no puede ser un código", () => {
  expect(normalizeCouponCode("  bienvenida10 ")).toBe("BIENVENIDA10");
  expect(normalizeCouponCode("DESCUENTO-5000")).toBe("DESCUENTO-5000");
  expect(normalizeCouponCode("")).toBeNull();
  expect(normalizeCouponCode("con espacio")).toBeNull();
  expect(normalizeCouponCode("x".repeat(41))).toBeNull();
  expect(normalizeCouponCode(42)).toBeNull();
});

test("el hint de validate_coupon elige el mensaje; uno desconocido es un error genérico", () => {
  expect(couponFailureReason("min_order")).toBe("min_order");
  expect(couponFailureReason(undefined)).toBe("error");
  expect(couponFailureReason("42501")).toBe("error");
  expect(couponMessage("min_order", 30000)).toBe(
    "Este cupón es para compras desde $30.000. Agrega productos para usarlo.",
  );
  expect(couponMessage("invalid")).toContain("no es válido o ya venció");
});

test("solo los códigos inexistentes cuentan para el rate limiting", () => {
  expect(countsAsFailedAttempt("invalid")).toBe(true);
  expect(countsAsFailedAttempt("min_order")).toBe(false);
  expect(countsAsFailedAttempt("error")).toBe(false);
});
