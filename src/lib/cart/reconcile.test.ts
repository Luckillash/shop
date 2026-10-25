import { expect, test } from "vitest";
import type { CartItem } from "@/store/cart-store";
import { cartChanged, reconcileCart, type AvailableSnapshot } from "./reconcile";

const item: CartItem = {
  variantId: "v1",
  productId: "p1",
  slug: "taza-de-gres-esmaltado",
  name: "Taza de gres esmaltado",
  variantName: "Color: Arena",
  image: null,
  unitPrice: 12490,
  compareAt: null,
  quantity: 2,
  maxQuantity: 10,
};

const snap: AvailableSnapshot = {
  variantId: "v1",
  available: true,
  productId: "p1",
  slug: "taza-de-gres-esmaltado",
  name: "Taza de gres esmaltado",
  variantName: "Color: Arena",
  image: null,
  unitPrice: 12490,
  compareAt: null,
  stock: 10,
};

test("sin cambios no hay avisos y el carro queda igual", () => {
  const result = reconcileCart([item], [snap]);
  expect(result.changes).toEqual([]);
  expect(cartChanged([item], result.items)).toBe(false);
});

test("un precio distinto se corrige y se avisa", () => {
  const result = reconcileCart([item], [{ ...snap, unitPrice: 11990 }]);
  expect(result.items[0].unitPrice).toBe(11990);
  expect(result.changes).toEqual(["El precio de Taza de gres esmaltado (Color: Arena) cambió a $11.990."]);
});

test("si queda menos stock que la cantidad, se ajusta la cantidad y el máximo", () => {
  const result = reconcileCart([{ ...item, quantity: 4 }], [{ ...snap, stock: 1 }]);
  expect(result.items[0]).toMatchObject({ quantity: 1, maxQuantity: 1 });
  expect(result.changes[0]).toBe("Solo queda 1 unidad de Taza de gres esmaltado (Color: Arena). Ajustamos la cantidad.");
});

test("agotado o fuera de venta: se quita del carro", () => {
  expect(reconcileCart([item], [{ ...snap, stock: 0 }])).toEqual({
    items: [],
    changes: ["Ya no quedan unidades de Taza de gres esmaltado (Color: Arena). Lo quitamos del carro."],
  });
  expect(reconcileCart([item], [{ variantId: "v1", available: false }]).items).toEqual([]);
});

test("los ítems sin snapshot (agregados mientras tanto) no se tocan", () => {
  const other = { ...item, variantId: "v2" };
  const result = reconcileCart([item, other], [snap]);
  expect(result.items).toEqual([item, other]);
});
