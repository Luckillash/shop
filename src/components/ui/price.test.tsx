import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { discountPercent, Price } from "./price";

describe("Price", () => {
  test("precio normal sin oferta", () => {
    const { container } = render(<Price amount={12490} />);
    expect(container.textContent).toBe("$12.490");
    expect(container.querySelector("s")).toBeNull();
  });

  test("en oferta anuncia los dos precios y muestra el descuento", () => {
    const { container } = render(<Price amount={39990} compareAt={52990} />);
    expect(container.textContent).toContain("Precio oferta $39.990");
    expect(container.textContent).toContain("Precio normal $52.990");
    expect(screen.getByText("−25%")).toBeDefined();
  });

  test("showDiscount=false oculta la insignia", () => {
    render(<Price amount={39990} compareAt={52990} showDiscount={false} />);
    expect(screen.queryByText("−25%")).toBeNull();
  });

  test("un compareAt menor o igual no es oferta", () => {
    const { container } = render(<Price amount={10000} compareAt={9000} />);
    expect(container.querySelector("s")).toBeNull();
  });

  test("discountPercent redondea", () => {
    expect(discountPercent(27990, 34990)).toBe(20);
  });
});
