import { beforeEach, describe, expect, test } from "vitest";
import { CART_STORAGE_VERSION, clampToStock, migrateCart, useCartStore, type CartItem } from "./cart-store";

const taza: Omit<CartItem, "quantity"> = {
  variantId: "v-arena",
  productId: "p-taza",
  slug: "taza-de-gres-esmaltado",
  name: "Taza de gres esmaltado",
  variantName: "Color: Arena",
  image: null,
  unitPrice: 12490,
  compareAt: null,
  maxQuantity: 5,
};

const vela = { ...taza, variantId: "v-vela", productId: "p-vela", name: "Vela de soya", variantName: null };

beforeEach(() => {
  useCartStore.setState({ items: [], couponCode: null });
});

describe("useCartStore", () => {
  test("addItem agrega N unidades y suma si la variante ya está, con tope en el stock", () => {
    const { addItem } = useCartStore.getState();
    addItem(taza, 2);
    addItem(taza, 2);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].quantity).toBe(4);
    addItem(taza, 3);
    expect(useCartStore.getState().items[0].quantity).toBe(5);
  });

  test("addItem actualiza precio y máximo con los datos más nuevos", () => {
    const { addItem } = useCartStore.getState();
    addItem(taza, 1);
    addItem({ ...taza, unitPrice: 11990, maxQuantity: 2 }, 5);
    expect(useCartStore.getState().items[0]).toMatchObject({ unitPrice: 11990, quantity: 2 });
  });

  test("setQuantity ajusta a [1, maxQuantity]", () => {
    const { addItem, setQuantity } = useCartStore.getState();
    addItem(taza, 1);
    setQuantity("v-arena", 9);
    expect(useCartStore.getState().items[0].quantity).toBe(5);
    setQuantity("v-arena", 0);
    expect(useCartStore.getState().items[0].quantity).toBe(1);
  });

  test("removeItem y restoreItem (Deshacer) vuelven a dejar el ítem en su lugar", () => {
    const { addItem, removeItem, restoreItem } = useCartStore.getState();
    addItem(taza, 2);
    addItem(vela, 1);
    const removed = useCartStore.getState().items[0];
    removeItem("v-arena");
    expect(useCartStore.getState().items.map((i) => i.variantId)).toEqual(["v-vela"]);
    restoreItem(removed, 0);
    expect(useCartStore.getState().items.map((i) => i.variantId)).toEqual(["v-arena", "v-vela"]);
    restoreItem(removed, 0);
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  test("clear vacía los ítems y el cupón", () => {
    const { addItem, setCouponCode, clear } = useCartStore.getState();
    addItem(taza);
    setCouponCode("BIENVENIDA10");
    clear();
    expect(useCartStore.getState()).toMatchObject({ items: [], couponCode: null });
  });
});

test("clampToStock respeta el tope de 99 y nunca baja de 1", () => {
  expect(clampToStock(150, 500)).toBe(99);
  expect(clampToStock(3, 0)).toBe(1);
  expect(clampToStock(2.7, 10)).toBe(2);
});

test("migrateCart descarta los carros de la versión 0 (ítems sin variantId)", () => {
  const old = { items: [{ id: "v1", name: "Taza", price: 12490, quantity: 1 }] };
  expect(migrateCart(old, 0)).toEqual({ items: [], couponCode: null });
  const current = { items: [{ ...taza, quantity: 1 }], couponCode: null };
  expect(migrateCart(current, CART_STORAGE_VERSION)).toBe(current);
});
