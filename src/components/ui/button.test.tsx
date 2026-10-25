import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Button } from "./button";

describe("Button", () => {
  test("por defecto es type=button", () => {
    render(<Button>Ver carro</Button>);
    expect(screen.getByRole("button", { name: "Ver carro" }).getAttribute("type")).toBe("button");
  });

  test("en espera marca aria-busy, no dispara onClick y no envía formularios", () => {
    const onClick = vi.fn();
    render(
      <Button type="submit" loading onClick={onClick}>
        Pagando
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Pagando" });
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.getAttribute("type")).toBe("button");
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  test("con href se renderiza como enlace", () => {
    render(<Button href="/carro">Ir a pagar</Button>);
    expect(screen.getByRole("link", { name: "Ir a pagar" }).getAttribute("href")).toBe("/carro");
  });
});
