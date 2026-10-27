import { describe, expect, it } from "vitest";
import { METROPOLITAN_REGION } from "@/lib/chile/regions";
import { carrierTrackingUrl, orderStatusLine, orderSummaryLine, trackingTimeline, type CustomerOrder } from "./customer-view";

// Domingo 25 de octubre de 2026, 16:52 en Chile (UTC-3): como el pedido 1020
const PAID = "2026-10-25T19:52:56Z";
const NOW = new Date("2026-10-26T12:00:00Z");

function order(overrides: Partial<CustomerOrder> = {}): CustomerOrder {
  return {
    status: "paid",
    payment_method: "webpay",
    shipping_method: "standard",
    shipping_address: { region: METROPOLITAN_REGION, city: "Providencia" },
    total: "21970.00",
    placed_at: "2026-10-25T19:52:10Z",
    paid_at: PAID,
    shipped_at: null,
    delivered_at: null,
    cancelled_at: null,
    expires_at: "2026-10-25T20:22:10Z",
    cancel_reason: null,
    cancel_note: null,
    payments: [],
    ...overrides,
  };
}

const pending = (overrides: Partial<CustomerOrder>) => order({ status: "pending", paid_at: null, ...overrides });
const cancelled = (overrides: Partial<CustomerOrder>) =>
  order({ status: "cancelled", paid_at: null, cancelled_at: "2026-10-25T20:30:00Z", ...overrides });

describe("línea de estado de Mis pedidos (B24)", () => {
  it("pendiente con transferencia: monto y plazo, como en el diseño", () => {
    const line = orderStatusLine(
      pending({ payment_method: "transfer", total: "24980", expires_at: "2026-10-27T13:12:00Z" }),
      NOW,
    );
    expect(line).toBe("Transfiere $24.980 hasta el martes 27 de octubre a las 10:12");
  });

  it("pendiente con tarjeta o Flow (propuesta) y vencido sin anular todavía", () => {
    expect(orderStatusLine(pending({ expires_at: "2026-10-26T12:30:00Z" }), NOW)).toBe(
      "Paga $21.970 hasta el lunes 26 de octubre a las 09:30",
    );
    expect(orderStatusLine(pending({ payment_method: "flow" }), NOW)).toBe(
      "Venció el plazo para pagar. No hicimos ningún cargo",
    );
  });

  it("en preparación y en camino: la fecha estimada desde el pago (B25)", () => {
    expect(orderStatusLine(order(), NOW)).toBe("Llega el martes 27 de octubre");
    expect(orderStatusLine(order({ status: "processing" }), NOW)).toBe("Llega el martes 27 de octubre");
    expect(orderStatusLine(order({ status: "shipped", shipped_at: "2026-10-26T15:00:00Z" }), NOW)).toBe(
      "Llega el martes 27 de octubre",
    );
    expect(orderStatusLine(order({ shipping_method: "pickup" }), NOW)).toBe("Disponible desde el lunes 26 de octubre");
  });

  it("en camino con la fecha estimada ya pasada", () => {
    expect(orderStatusLine(order({ status: "shipped" }), new Date("2026-10-29T12:00:00Z"))).toBe("Está en camino");
  });

  it("entregado y retirado", () => {
    const delivered = { status: "delivered" as const, delivered_at: "2026-10-27T18:00:00Z" };
    expect(orderStatusLine(order(delivered), NOW)).toBe("Entregado el martes 27 de octubre");
    expect(orderStatusLine(order({ ...delivered, shipping_method: "pickup" }), NOW)).toBe("Retirado el martes 27 de octubre");
  });

  it("reembolsado: monto y fecha del intento devuelto", () => {
    const line = orderStatusLine(
      order({
        status: "refunded",
        cancelled_at: "2026-10-27T13:00:00Z",
        payments: [{ status: "refunded", amount: "19990.00", updated_at: "2026-10-28T13:00:00Z" }],
      }),
      NOW,
    );
    expect(line).toBe("Te devolvimos $19.990 el miércoles 28 de octubre");
  });

  it("anulado porque venció: el texto del diseño con transferencia y la propuesta con tarjeta", () => {
    expect(orderStatusLine(cancelled({ cancel_reason: "vencio", payment_method: "transfer" }), NOW)).toBe(
      "La transferencia no llegó a tiempo. No hicimos ningún cargo",
    );
    expect(orderStatusLine(cancelled({ cancel_reason: "vencio" }), NOW)).toBe(
      "Venció el plazo para pagar. No hicimos ningún cargo",
    );
  });

  it("anulado por el cliente o por la tienda (propuestas), con la nota de la tienda si la hay", () => {
    expect(orderStatusLine(cancelled({ cancel_reason: "cliente" }), NOW)).toBe("Anulaste el pedido. No hicimos ningún cargo");
    expect(orderStatusLine(cancelled({ cancel_reason: "tienda" }), NOW)).toBe("Anulamos el pedido. No hicimos ningún cargo");
    expect(orderStatusLine(cancelled({ cancel_reason: "tienda", cancel_note: " Se agotó la Manta de lino. " }), NOW)).toBe(
      "Se agotó la Manta de lino.",
    );
    expect(orderStatusLine(cancelled({ cancel_reason: "tienda", paid_at: PAID }), NOW)).toBe(
      "Anulamos el pedido. Te vamos a devolver $21.970",
    );
  });

  it("anulados antes de la M8 (sin motivo): vencido si se anuló después del plazo", () => {
    expect(orderStatusLine(cancelled({ payment_method: "transfer" }), NOW)).toBe(
      "La transferencia no llegó a tiempo. No hicimos ningún cargo",
    );
    expect(orderStatusLine(cancelled({ cancelled_at: "2026-10-25T20:00:00Z" }), NOW)).toBe(
      "Anulamos el pedido. No hicimos ningún cargo",
    );
  });

  it("anulado con el pago devuelto (B13, pedido 1030)", () => {
    const line = orderStatusLine(
      cancelled({ payments: [{ status: "refunded", amount: "11980.00", updated_at: "2026-10-25T20:06:30Z" }] }),
      NOW,
    );
    expect(line).toBe("Te devolvimos $11.980 el domingo 25 de octubre: el pago llegó después del plazo");
  });
});

describe("resumen de la tarjeta", () => {
  it("cuenta las unidades y nombra el despacho", () => {
    expect(orderSummaryLine([{ quantity: 2 }, { quantity: 2 }], "standard")).toBe("4 productos · Despacho a domicilio");
    expect(orderSummaryLine([{ quantity: 1 }], "pickup")).toBe("1 producto · Retiro en tienda Local Tajamar");
  });
});

describe("seguimiento del Detalle", () => {
  it("sin seguimiento si está pendiente o anulado", () => {
    expect(trackingTimeline(pending({}), NOW)).toBeNull();
    expect(trackingTimeline(cancelled({}), NOW)).toBeNull();
    expect(trackingTimeline(order({ status: "refunded" }), NOW)).toBeNull();
  });

  it("pagado: solo Confirmado, con la entrega estimada al final", () => {
    expect(trackingTimeline(order(), NOW)).toEqual([
      { name: "Confirmado", state: "done", detail: "Domingo 25 de octubre" },
      { name: "Preparado", state: "pending", detail: null },
      { name: "En camino", state: "pending", detail: null },
      { name: "Entregado", state: "pending", detail: "Estimado: martes 27 de octubre" },
    ]);
  });

  it("en preparación: Preparado es el paso actual", () => {
    const steps = trackingTimeline(order({ status: "processing" }), NOW)!;
    expect(steps.map((s) => s.state)).toEqual(["done", "current", "pending", "pending"]);
    expect(steps[1].detail).toBe("Lo estamos preparando");
  });

  it("en camino: En camino es el paso actual, con la fecha de salida (DetallePedido)", () => {
    const steps = trackingTimeline(order({ status: "shipped", shipped_at: "2026-10-26T15:00:00Z" }), NOW)!;
    expect(steps.map((s) => s.state)).toEqual(["done", "done", "current", "pending"]);
    expect(steps[2].detail).toBe("Lunes 26 de octubre");
    expect(steps[3].detail).toBe("Estimado: martes 27 de octubre");
  });

  it("entregado: todos hechos, con la fecha de entrega", () => {
    const steps = trackingTimeline(
      order({ status: "delivered", shipped_at: "2026-10-26T15:00:00Z", delivered_at: "2026-10-27T18:00:00Z" }),
      NOW,
    )!;
    expect(steps.every((s) => s.state === "done")).toBe(true);
    expect(steps[3].detail).toBe("Martes 27 de octubre");
  });

  it("retiro en tienda: pasos de retiro", () => {
    expect(trackingTimeline(order({ shipping_method: "pickup" }), NOW)!.map((s) => s.name)).toEqual([
      "Confirmado",
      "Preparado",
      "Listo para retirar",
      "Retirado",
    ]);
  });

  it("sin la estimación si ya pasó", () => {
    const steps = trackingTimeline(order({ status: "shipped" }), new Date("2026-10-29T12:00:00Z"))!;
    expect(steps[3].detail).toBeNull();
  });
});

describe("Seguir el envío", () => {
  it("la página de cada transportista con el código (decisión 2)", () => {
    expect(carrierTrackingUrl("Starken", "9845 1230 7716")).toBe("https://www.starken.cl/seguimiento?codigo=984512307716");
    expect(carrierTrackingUrl("Chilexpress", "1234567890")).toBe("https://centrodeayuda.chilexpress.cl/seguimiento/1234567890");
    expect(carrierTrackingUrl("Blue Express", "BX123")).toBe("https://www.blue.cl/enviar/seguimiento?n_seguimiento=BX123");
    expect(carrierTrackingUrl("Correos de Chile", "1234567890123")).toBe("https://www.correos.cl/seguimiento-en-linea");
  });

  it("sin enlace en el despacho propio, sin código o con un transportista desconocido", () => {
    expect(carrierTrackingUrl("Almacén", "A-1")).toBeNull();
    expect(carrierTrackingUrl("Starken", null)).toBeNull();
    expect(carrierTrackingUrl("Otro", "1")).toBeNull();
    expect(carrierTrackingUrl(null, null)).toBeNull();
  });
});
