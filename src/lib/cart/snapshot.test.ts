import { expect, test } from "vitest";
import { sanitizeLines, serverSubtotal, toSnapshot, toSnapshots, type VariantRow } from "./snapshot";

const V1 = "00000000-0000-4000-8000-000000000001";
const V2 = "00000000-0000-4000-8000-000000000002";

const row: VariantRow = {
  id: V1,
  name: "Grande",
  attributes: { talla: "L" },
  price: "32990.00",
  stock: 3,
  is_active: true,
  product: {
    id: "p1",
    slug: "tabla-de-rauli",
    name: "Tabla de raulí para picar",
    base_price: "24990.00",
    compare_at_price: null,
    is_active: true,
    images: [
      { url: "b.jpg", sort_order: 2 },
      { url: "a.jpg", sort_order: 1 },
    ],
  },
};

test("toSnapshot usa el precio de la variante, la primera imagen y la línea de variante", () => {
  expect(toSnapshot(row)).toEqual({
    variantId: V1,
    available: true,
    productId: "p1",
    slug: "tabla-de-rauli",
    name: "Tabla de raulí para picar",
    variantName: "Tamaño: Grande",
    image: "a.jpg",
    unitPrice: 32990,
    compareAt: null,
    stock: 3,
  });
});

test("sin precio propio usa base_price, y compare_at solo si es mayor", () => {
  const snap = toSnapshot({
    ...row,
    price: null,
    attributes: {},
    product: { ...row.product!, compare_at_price: 34990 },
  });
  expect(snap).toMatchObject({ unitPrice: 24990, compareAt: 34990, variantName: null });
});

test("toSnapshots marca como no disponible lo que no volvió de la BD o está inactivo", () => {
  const snaps = toSnapshots([V1, V2], [{ ...row, is_active: false }]);
  expect(snaps).toEqual([
    { variantId: V1, available: false },
    { variantId: V2, available: false },
  ]);
});

test("sanitizeLines descarta ids inválidos, une repetidos y limita la cantidad", () => {
  expect(
    sanitizeLines([
      { variantId: V1, quantity: 2 },
      { variantId: "no-es-uuid", quantity: 1 },
      { variantId: V2, quantity: 500 },
      { variantId: V1, quantity: 3.8 },
      { variantId: V2, quantity: -1 },
      null,
    ]),
  ).toEqual([
    { variantId: V1, quantity: 3 },
    { variantId: V2, quantity: 99 },
  ]);
  expect(sanitizeLines("x")).toEqual([]);
});

test("serverSubtotal usa los precios de la BD y no suma lo que no está disponible", () => {
  const snaps = toSnapshots([V1, V2], [row]);
  expect(
    serverSubtotal(
      [
        { variantId: V1, quantity: 5 },
        { variantId: V2, quantity: 1 },
      ],
      snaps,
    ),
  ).toBe(32990 * 3);
});
