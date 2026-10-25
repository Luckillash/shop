import { expect, test } from "vitest";
import type { CartItem } from "@/store/cart-store";
import { cartCount, cartSubtotal, productsLabel, shippingPreview, toCartLines } from "./totals";

const base = {
  productId: "p",
  slug: "s",
  name: "n",
  variantName: null,
  image: null,
  compareAt: null,
  maxQuantity: 10,
};
const items: CartItem[] = [
  { ...base, variantId: "a", unitPrice: 12490, quantity: 2 },
  { ...base, variantId: "b", unitPrice: 9990, quantity: 1 },
];

test("subtotal, conteo y líneas para el servidor (sin precios)", () => {
  expect(cartSubtotal(items)).toBe(34970);
  expect(cartCount(items)).toBe(3);
  expect(toCartLines(items)).toEqual([
    { variantId: "a", quantity: 2 },
    { variantId: "b", quantity: 1 },
  ]);
});

test("el despacho es gratis desde $39.990; bajo eso queda por calcular", () => {
  expect(shippingPreview(39990)).toBe(0);
  expect(shippingPreview(39989)).toBeNull();
});

test("productsLabel", () => {
  expect(productsLabel(1)).toBe("1 producto");
  expect(productsLabel(3)).toBe("3 productos");
});
