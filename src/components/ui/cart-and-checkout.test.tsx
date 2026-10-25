import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { FreeShippingBar } from "./free-shipping-bar";
import { OrderSummary, orderTotal } from "./order-summary";
import { clampQuantity, QuantityStepper } from "./quantity-stepper";

describe("FreeShippingBar", () => {
  test("dice cuánto falta para el despacho gratis", () => {
    const { container } = render(<FreeShippingBar subtotal={34980} threshold={39990} />);
    expect(container.textContent).toContain("Te faltan $5.010 para el despacho gratis");
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("87");
  });

  test("sobre el umbral, el pedido tiene despacho gratis", () => {
    const { container } = render(<FreeShippingBar subtotal={43960} threshold={39990} />);
    expect(container.textContent).toContain("Tu pedido tiene despacho gratis");
  });
});

describe("QuantityStepper", () => {
  test("se ajusta al rango", () => {
    expect(clampQuantity(5, 1, 3)).toBe(3);
    expect(clampQuantity(0, 1, 3)).toBe(1);
  });

  test("en el mínimo, quitar está deshabilitado; en el máximo, agregar también", () => {
    const onChange = vi.fn();
    render(<QuantityStepper defaultValue={1} max={2} onChange={onChange} />);
    const minus = screen.getByRole("button", { name: "Quitar uno" }) as HTMLButtonElement;
    const plus = screen.getByRole("button", { name: "Agregar uno" }) as HTMLButtonElement;
    expect(minus.disabled).toBe(true);
    fireEvent.click(plus);
    expect(onChange).toHaveBeenLastCalledWith(2);
    expect(plus.disabled).toBe(true);
  });
});

describe("OrderSummary", () => {
  test("total = subtotal − descuento + despacho", () => {
    expect(orderTotal(52970, 5000, 0)).toBe(47970);
    expect(orderTotal(34980, 0, null)).toBe(34980);
  });

  test("despacho por calcular y gratis", () => {
    const { container, rerender } = render(<OrderSummary subtotal={34980} />);
    expect(container.textContent).toContain("Por calcular");
    rerender(<OrderSummary subtotal={52970} discount={5000} shipping={0} />);
    expect(container.textContent).toContain("Gratis");
    expect(container.textContent).toContain("−$5.000");
    expect(container.textContent).toContain("$47.970");
  });
});
