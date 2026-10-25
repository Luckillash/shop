import { describe, expect, it } from "vitest";
import { latestAttempt, orderScreen, screenPath, type ScreenOrder } from "./screen";

const NOW = new Date("2026-10-25T15:00:00Z");
const LATER = "2026-10-25T15:30:00Z";
const EARLIER = "2026-10-25T14:30:00Z";

function order(overrides: Partial<ScreenOrder> = {}): ScreenOrder {
  return { status: "pending", expires_at: LATER, payments: [], ...overrides };
}

describe("orderScreen", () => {
  it("pagado (o más adelante) → Confirmación", () => {
    for (const status of ["paid", "processing", "shipped", "delivered"]) {
      expect(orderScreen(order({ status }), NOW)).toBe("confirmed");
    }
  });

  it("transferencia pendiente dentro de plazo → Transferencia pendiente", () => {
    const payments = [{ provider: "transfer", status: "pending", attempt: 1 }];
    expect(orderScreen(order({ payments }), NOW)).toBe("transfer");
    expect(orderScreen(order({ payments, expires_at: EARLIER }), NOW)).toBe("expired");
  });

  it("Webpay o Flow pendiente → Estamos confirmando tu pago (aunque haya vencido: el cron decide)", () => {
    expect(orderScreen(order({ payments: [{ provider: "flow", status: "pending", attempt: 1 }] }), NOW)).toBe("confirming");
    expect(
      orderScreen(order({ expires_at: EARLIER, payments: [{ provider: "webpay", status: "pending", attempt: 1 }] }), NOW),
    ).toBe("confirming");
  });

  it("el último intento falló → Pago rechazado; fuera de plazo → vencido", () => {
    const payments = [
      { provider: "webpay", status: "failed", attempt: 1 },
      { provider: "flow", status: "failed", attempt: 2 },
    ];
    expect(orderScreen(order({ payments }), NOW)).toBe("rejected");
    expect(orderScreen(order({ payments, expires_at: EARLIER }), NOW)).toBe("expired");
  });

  it("decide por el intento más reciente, no por el orden del arreglo", () => {
    const payments = [
      { provider: "transfer", status: "pending", attempt: 2 },
      { provider: "webpay", status: "failed", attempt: 1 },
    ];
    expect(orderScreen(order({ payments }), NOW)).toBe("transfer");
  });

  it("anulado → vencido; con un pago devuelto → reembolsado (B13)", () => {
    expect(orderScreen(order({ status: "cancelled" }), NOW)).toBe("expired");
    const payments = [{ provider: "webpay", status: "refunded", attempt: 1 }];
    expect(orderScreen(order({ status: "cancelled", payments }), NOW)).toBe("refunded");
  });

  it("sin intentos y dentro de plazo → Pago rechazado (la pasarela no respondió al crear)", () => {
    expect(orderScreen(order(), NOW)).toBe("rejected");
  });
});

describe("latestAttempt y screenPath", () => {
  it("latestAttempt devuelve null sin intentos", () => {
    expect(latestAttempt([])).toBeNull();
  });

  it("cada pantalla tiene su URL", () => {
    expect(screenPath("abc", "rejected")).toBe("/pedido/abc/pago-rechazado");
    expect(screenPath("abc", "transfer")).toBe("/pedido/abc/transferencia");
    expect(screenPath("abc", "confirmed")).toBe("/pedido/abc");
  });
});
