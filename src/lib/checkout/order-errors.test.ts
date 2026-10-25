import { expect, test } from "vitest";
import { GENERIC_ORDER_ERROR, orderFailure } from "./order-errors";

test("stock: nombra el producto y pide refrescar el carro (dice carro, no carrito)", () => {
  const failure = orderFailure({ hint: "stock", details: "Taza de gres esmaltado" });
  expect(failure.message).toContain("Taza de gres esmaltado");
  expect(failure.message).not.toContain("carrito");
  expect(failure).toMatchObject({ refreshCart: true, dropCoupon: false });
});

test("cupón: lo quita y usa el mensaje del carro", () => {
  const failure = orderFailure({ hint: "min_order", details: "30000" });
  expect(failure.message).toContain("$30.000");
  expect(failure).toMatchObject({ refreshCart: true, dropCoupon: true });
  expect(orderFailure({ hint: "used" }).message).toContain("Ya usaste este cupón");
});

test("sin hint conocido: mensaje genérico, sin detalles de la BD", () => {
  expect(orderFailure({ hint: null, details: "duplicate key" }).message).toBe(GENERIC_ORDER_ERROR);
  expect(orderFailure({ hint: "address" }).refreshCart).toBe(false);
  expect(orderFailure({ hint: "express_region" }).message).toContain("solo para la Región Metropolitana");
});
