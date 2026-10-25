import { expect, test } from "vitest";
import { clampToSnapshots, mergeLines, toCartItems } from "./merge";
import type { AvailableSnapshot, CartSnapshot } from "./reconcile";

const snap = (variantId: string, stock: number): AvailableSnapshot => ({
  variantId,
  available: true,
  productId: `p-${variantId}`,
  slug: "taza",
  name: "Taza",
  variantName: null,
  image: null,
  unitPrice: 12490,
  compareAt: null,
  stock,
});

test("mergeLines: la cantidad mayor por variante, primero el orden del cliente", () => {
  expect(
    mergeLines(
      [
        { variantId: "a", quantity: 1 },
        { variantId: "b", quantity: 3 },
      ],
      [
        { variantId: "c", quantity: 2 },
        { variantId: "a", quantity: 4 },
        { variantId: "b", quantity: 1 },
      ],
    ),
  ).toEqual([
    { variantId: "a", quantity: 4 },
    { variantId: "b", quantity: 3 },
    { variantId: "c", quantity: 2 },
  ]);
});

test("clampToSnapshots: quita lo no disponible o agotado y ajusta al stock", () => {
  const snapshots: CartSnapshot[] = [snap("a", 2), snap("b", 0), { variantId: "c", available: false }, snap("d", 500)];
  expect(
    clampToSnapshots(
      [
        { variantId: "a", quantity: 5 },
        { variantId: "b", quantity: 1 },
        { variantId: "c", quantity: 1 },
        { variantId: "d", quantity: 120 },
        { variantId: "e", quantity: 1 },
      ],
      snapshots,
    ),
  ).toEqual([
    { variantId: "a", quantity: 2 },
    { variantId: "d", quantity: 99 },
  ]);
});

test("toCartItems arma los ítems del store con los datos de la BD", () => {
  expect(toCartItems([{ variantId: "a", quantity: 2 }], [snap("a", 3)])).toEqual([
    {
      variantId: "a",
      productId: "p-a",
      slug: "taza",
      name: "Taza",
      variantName: null,
      image: null,
      unitPrice: 12490,
      compareAt: null,
      quantity: 2,
      maxQuantity: 3,
    },
  ]);
});
