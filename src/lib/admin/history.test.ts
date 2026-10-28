import { describe, expect, test } from "vitest";
import { orderHistory, type HistoryEvent } from "./history";

const base = {
  placed_at: "2026-10-25T13:12:00Z",
  paid_at: null as string | null,
  shipped_at: null as string | null,
  delivered_at: null as string | null,
  cancelled_at: null as string | null,
  expires_at: "2026-10-27T13:12:00Z",
  shipping_method: "standard",
  carrier: null as string | null,
  tracking_number: null as string | null,
  cancel_reason: null as string | null,
  cancel_note: null as string | null,
  payments: [] as { provider: string; status: "paid" | "refunded" | "pending" | "failed" | "authorized"; amount: number; updated_at: string; raw_response: null }[],
};

const event = (kind: string, created_at: string, actor = "system", data: HistoryEvent["data"] = {}): HistoryEvent => ({ kind, actor, created_at, data });

describe("historial con eventos (M8)", () => {
  test("de lo más nuevo a lo más antiguo, con actor y correos", () => {
    const history = orderHistory({ ...base, paid_at: "2026-10-25T13:14:00Z", shipped_at: "2026-10-26T15:05:00Z" }, [
      event("placed", "2026-10-25T13:12:00Z", "customer"),
      event("paid", "2026-10-25T13:14:00Z", "system", { provider: "webpay", reference: "1041-1" }),
      event("email", "2026-10-25T13:14:01Z", "system", { template: "confirmed", subject: "Pedido N.º 1041 confirmado" }),
      event("processing", "2026-10-25T18:30:00Z", "admin"),
      event("shipped", "2026-10-26T15:05:00Z", "admin", { carrier: "Starken", tracking_number: "9845 1230 7716" }),
    ]);
    expect(history.map((h) => `${h.what} · ${h.who}`)).toEqual([
      "Enviado con Starken · 9845 1230 7716 · Administración",
      "Empezó la preparación · Administración",
      "Correo de pedido confirmado · Sistema",
      "Pago recibido en Webpay Plus · Sistema",
      "Pedido creado · Cliente",
    ]);
  });

  test("transferencia confirmada con el N.º de operación, anulación con nota y reembolso", () => {
    const history = orderHistory({ ...base, payment_method: "transfer", cancel_reason: "tienda" } as typeof base, [
      event("paid", "2026-10-25T14:00:00Z", "admin", { provider: "transfer", operation_number: "000123" }),
      event("cancelled", "2026-10-26T11:20:00Z", "admin", { reason: "tienda", note: "Sin stock" }),
      event("refund", "2026-10-26T11:21:00Z", "admin", { provider: "transfer", amount: 43960, manual: true }),
      event("refunded", "2026-10-26T11:21:00Z", "admin"),
      event("alert_resolved", "2026-10-26T12:00:00Z", "admin", { alert_kind: "refund_failed" }),
    ]);
    expect(history.map((h) => h.what)).toEqual([
      "Alerta resuelta: reembolso fallido",
      "Reembolsado",
      "Devolución por transferencia de $43.960",
      "Anulado por la tienda · «Sin stock»",
      "Transferencia confirmada · N.º de operación 000123",
      "Pedido creado",
    ]);
  });

  test("retiro en tienda: listo para retirar y retirado", () => {
    const history = orderHistory({ ...base, shipping_method: "pickup" }, [
      event("placed", "2026-10-25T13:12:00Z", "customer"),
      event("shipped", "2026-10-26T10:00:00Z", "admin", { carrier: null }),
      event("delivered", "2026-10-26T16:00:00Z", "admin"),
      event("email", "2026-10-26T10:00:01Z", "admin", { template: "shipped" }),
    ]);
    expect(history.slice(0, 3).map((h) => h.what)).toEqual(["Retirado", "Correo de listo para retirar", "Listo para retirar"]);
  });
});

describe("pedidos sin eventos (1001–1036)", () => {
  test("se arma con las fechas del pedido y los pagos devueltos", () => {
    const history = orderHistory(
      {
        ...base,
        expires_at: "2026-10-21T21:17:00Z",
        cancelled_at: "2026-10-21T21:30:00Z",
        payments: [{ provider: "flow", status: "refunded", amount: 11980, updated_at: "2026-10-21T21:35:00Z", raw_response: null }],
      },
      [],
    );
    expect(history).toEqual([
      { at: "2026-10-21T21:35:00Z", what: "Pago de $11.980 devuelto en Flow", who: null },
      { at: "2026-10-21T21:30:00Z", what: "Anulado: venció el plazo para pagar", who: "Sistema" },
      { at: "2026-10-25T13:12:00Z", what: "Pedido creado", who: "Cliente" },
    ].sort((a, b) => b.at.localeCompare(a.at)));
  });

  test("con fechas de pago y despacho, sin actor conocido para el envío", () => {
    const history = orderHistory(
      {
        ...base,
        paid_at: "2026-10-25T13:14:00Z",
        shipped_at: "2026-10-26T15:05:00Z",
        carrier: "Chilexpress",
        tracking_number: "1234567890",
        payments: [{ provider: "flow", status: "paid", amount: 16480, updated_at: "2026-10-25T13:14:00Z", raw_response: null }],
      },
      [event("email", "2026-10-26T15:06:00Z", "admin", { template: "shipped" })],
    );
    expect(history.map((h) => [h.what, h.who])).toEqual([
      ["Correo de despacho", "Administración"],
      ["Enviado con Chilexpress · 1234567890", null],
      ["Pago recibido en Flow", "Sistema"],
      ["Pedido creado", "Cliente"],
    ]);
  });
});
