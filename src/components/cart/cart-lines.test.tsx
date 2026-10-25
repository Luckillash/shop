import { beforeEach, expect, test } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useCartStore, type CartItem } from "@/store/cart-store";
import { useCartUi } from "@/store/cart-ui-store";
import { CartLines } from "./cart-lines";

const item: CartItem = {
  variantId: "v1",
  productId: "p1",
  slug: "vela-de-soya",
  name: "Vela de soya en frasco",
  variantName: null,
  image: null,
  unitPrice: 11990,
  compareAt: null,
  quantity: 2,
  maxQuantity: 2,
};

function Lines() {
  return <CartLines items={useCartStore((s) => s.items)} />;
}

beforeEach(() => {
  useCartStore.setState({ items: [item], couponCode: null });
  useCartUi.setState({ removed: null });
});

test("el stepper no pasa del stock y Eliminar ofrece Deshacer", () => {
  render(<Lines />);
  const plus = screen.getByRole("button", { name: "Agregar uno" }) as HTMLButtonElement;
  expect(plus.disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Quitar uno" }));
  expect(useCartStore.getState().items[0].quantity).toBe(1);

  fireEvent.click(screen.getByRole("button", { name: /Eliminar/ }));
  expect(useCartStore.getState().items).toEqual([]);
  expect(screen.getByRole("status").textContent).toContain("Quitaste Vela de soya en frasco del carro");

  fireEvent.click(screen.getByRole("button", { name: "Deshacer" }));
  expect(useCartStore.getState().items).toHaveLength(1);
  expect(screen.queryByRole("button", { name: "Deshacer" })).toBeNull();
});
