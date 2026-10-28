import { describe, expect, test } from "vitest";
import {
  actionSummary,
  filterCounts,
  matchesSearch,
  needsAction,
  nextStepLabel,
  parseFilter,
  parseShown,
  paymentLabel,
  pendingRefund,
  rowNote,
  shippingLabel,
  sortOrders,
  type AdminListOrder,
  type AdminOrderPayment,
} from "./order-list";

const payment = (over: Partial<AdminOrderPayment> = {}): AdminOrderPayment => ({
  provider: "webpay",
  status: "paid",
  amount: 43960,
  updated_at: "2026-10-25T13:14:00Z",
  raw_response: { result: { payment_type_code: "VD", installments_number: 0 } },
  ...over,
});

const order = (over: Partial<AdminListOrder> = {}): AdminListOrder => ({
  order_number: 1041,
  contact_email: "camila.rojas@correo.cl",
  status: "paid",
  payment_method: "webpay",
  shipping_method: "standard",
  shipping_address: { city: "Providencia", region: "Metropolitana de Santiago", recipient_name: "Camila Rojas" },
  total: 43960,
  placed_at: "2026-10-25T13:12:00Z",
  paid_at: "2026-10-25T13:14:00Z",
  shipped_at: null,
  delivered_at: null,
  cancelled_at: null,
  expires_at: "2026-10-27T13:12:00Z",
  cancel_reason: null,
  cancel_note: null,
  carrier: null,
  tracking_number: null,
  payments: [payment()],
  ...over,
});

const now = new Date("2026-10-25T18:00:00Z");

describe("filtros y conteos", () => {
  const orders = [
    order({ status: "pending", payment_method: "transfer", paid_at: null, payments: [payment({ provider: "transfer", status: "pending" })] }),
    order({ status: "pending", payment_method: "flow", paid_at: null, payments: [] }),
    order({ status: "paid" }),
    order({ status: "processing" }),
    order({ status: "shipped" }),
    order({ status: "delivered" }),
    order({ status: "cancelled", cancel_reason: "vencio", paid_at: null, payments: [] }),
    // 1042: anulado con el pago sin devolver
    order({ status: "cancelled", cancel_reason: "tienda" }),
    order({ status: "refunded", payments: [payment({ status: "refunded" })] }),
  ];

  test("cuenta cada chip; *Necesitan una acción* incluye los pagos por devolver", () => {
    expect(filterCounts(orders)).toEqual({
      accion: 5,
      transferencia: 1,
      preparar: 1,
      preparacion: 1,
      camino: 1,
      entregados: 1,
      anulados: 3,
      todos: 9,
    });
  });

  test("un pago pendiente con tarjeta o Flow no necesita una acción del admin", () => {
    expect(needsAction(orders[1])).toBe(false);
  });

  test("filtro desconocido → Necesitan una acción", () => {
    expect(parseFilter("camino")).toBe("camino");
    expect(parseFilter("x")).toBe("accion");
    expect(parseFilter(undefined)).toBe("accion");
  });

  test("Ver más: múltiplos de la página, con tope", () => {
    expect(parseShown(undefined)).toBe(20);
    expect(parseShown("25")).toBe(40);
    expect(parseShown("-3")).toBe(20);
    expect(parseShown("99999")).toBe(500);
  });

  test("Necesitan una acción va del más antiguo al más nuevo; el resto al revés", () => {
    const a = { placed_at: "2026-10-24T10:00:00Z" };
    const b = { placed_at: "2026-10-25T10:00:00Z" };
    expect(sortOrders([b, a], "accion")).toEqual([a, b]);
    expect(sortOrders([a, b], "todos")).toEqual([b, a]);
  });
});

describe("búsqueda", () => {
  test("por número, con o sin N.º, y por el comienzo", () => {
    expect(matchesSearch(order(), "1041")).toBe(true);
    expect(matchesSearch(order(), "N.º 1041")).toBe(true);
    expect(matchesSearch(order(), "#104")).toBe(true);
    expect(matchesSearch(order(), "1042")).toBe(false);
  });

  test("por correo, sin distinguir mayúsculas", () => {
    expect(matchesSearch(order(), "Camila.Rojas")).toBe(true);
    expect(matchesSearch(order(), "diego")).toBe(false);
    expect(matchesSearch(order(), "  ")).toBe(true);
  });
});

describe("textos de la fila", () => {
  test("resumen del día", () => {
    expect(actionSummary(now, 4)).toBe("Domingo 25 de octubre · 4 pedidos necesitan una acción");
    expect(actionSummary(now, 1)).toBe("Domingo 25 de octubre · 1 pedido necesita una acción");
    expect(actionSummary(now, 0)).toBe("Domingo 25 de octubre · Ningún pedido necesita una acción");
  });

  test("siguiente paso según el estado, con el retiro en tienda", () => {
    expect(nextStepLabel(order({ status: "pending", payment_method: "transfer" }))).toBe("Confirmar pago");
    expect(nextStepLabel(order({ status: "paid" }))).toBe("Empezar a preparar");
    expect(nextStepLabel(order({ status: "processing" }))).toBe("Marcar como enviado");
    expect(nextStepLabel(order({ status: "processing", shipping_method: "pickup" }))).toBe("Marcar como listo");
    expect(nextStepLabel(order({ status: "shipped", shipping_method: "pickup" }))).toBe("Marcar como retirado");
    expect(nextStepLabel(order({ status: "cancelled" }))).toBe("Devolver el pago");
    expect(nextStepLabel(order({ status: "delivered" }))).toBeNull();
  });

  test("medio de pago y despacho", () => {
    expect(paymentLabel(order())).toBe("Webpay Plus · tarjeta de débito");
    expect(paymentLabel(order({ payment_method: "transfer", payments: [] }))).toBe("Transferencia");
    expect(shippingLabel(order())).toBe("Despacho a domicilio · Providencia");
    expect(shippingLabel(order({ shipping_method: "pickup" }))).toBe("Retiro en tienda Local Tajamar");
  });

  test("nota bajo el estado", () => {
    expect(rowNote(order({ status: "pending", payment_method: "transfer" }), now)).toBe("Vence el martes 27 de octubre a las 10:12");
    expect(rowNote(order({ status: "paid" }), now)).toBe("Pagado el domingo 25 de octubre a las 10:14");
    expect(rowNote(order({ status: "shipped", carrier: "Starken", tracking_number: "9845 1230 7716" }), now)).toBe("Starken · 9845 1230 7716");
    expect(rowNote(order({ status: "cancelled", cancel_reason: "tienda" }), now)).toBe("Anulado por la tienda · falta devolver $43.960");
    expect(
      rowNote(order({ status: "cancelled", cancel_reason: "vencio", payments: [payment({ status: "refunded" })] }), now),
    ).toBe("Venció · pago devuelto");
    expect(rowNote(order({ status: "refunded", payments: [payment({ status: "refunded" })] }), now)).toBe("Devuelto el domingo 25 de octubre");
  });

  test("pago por devolver solo en un anulado", () => {
    expect(pendingRefund(order({ status: "cancelled" }))?.provider).toBe("webpay");
    expect(pendingRefund(order({ status: "paid" }))).toBeNull();
    expect(pendingRefund(order({ status: "cancelled", payments: [payment({ status: "refunded" })] }))).toBeNull();
  });
});
