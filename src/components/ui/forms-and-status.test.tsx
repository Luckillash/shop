import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { cartLabel } from "@/components/layout/cart-link";
import { Notice } from "./notice";
import { ratingLabel } from "./rating";
import { Select } from "./select";
import { TextField } from "./text-field";

describe("TextField", () => {
  test("el error marca aria-invalid y se asocia con aria-describedby", () => {
    render(<TextField label="RUT" error="Revisa el dígito verificador." hint="Para tu boleta" />);
    const input = screen.getByLabelText("RUT");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const describedBy = input.getAttribute("aria-describedby")!.split(" ");
    expect(describedBy).toHaveLength(2);
    expect(document.getElementById(describedBy[0])!.textContent).toBe("Revisa el dígito verificador.");
  });
});

describe("Select", () => {
  test("muestra el placeholder como opción inicial deshabilitada", () => {
    render(<Select label="Región" placeholder="Elige tu región" options={[{ value: "rm", label: "Metropolitana" }]} />);
    const select = screen.getByLabelText("Región") as HTMLSelectElement;
    expect(select.value).toBe("");
    expect((select.options[0] as HTMLOptionElement).disabled).toBe(true);
  });
});

describe("Notice", () => {
  test("danger usa role=alert y el resto role=status", () => {
    render(<Notice tone="danger">Tu pago fue rechazado</Notice>);
    expect(screen.getByRole("alert").textContent).toContain("Tu pago fue rechazado");
    render(<Notice tone="success">Agregaste la taza al carro</Notice>);
    expect(screen.getByRole("status")).toBeDefined();
  });
});

describe("textos accesibles", () => {
  test("valoración", () => {
    expect(ratingLabel(4.6, 128)).toBe("4,6 de 5 estrellas, 128 opiniones");
    expect(ratingLabel(4, 1)).toBe("4,0 de 5 estrellas, 1 opinión");
  });

  test("carro del header", () => {
    expect(cartLabel(0)).toBe("Carro");
    expect(cartLabel(1)).toBe("Carro, 1 producto");
    expect(cartLabel(3)).toBe("Carro, 3 productos");
  });
});
