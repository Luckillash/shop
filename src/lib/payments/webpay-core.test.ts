import { describe, expect, it } from "vitest";
import { isApproved, matchesAttempt, parseWebpayReturn, webpayCardLabel, webpayOutcome, type WebpayResult } from "./webpay-core";

const ORDER_ID = "6f1c2ada-9906-48b3-8f91-c8dca4cb5b55";
const expected = { amount: 43960, reference: "1007-1", orderId: ORDER_ID };

function result(overrides: Partial<WebpayResult> = {}): WebpayResult {
  return {
    vci: "TSY",
    amount: 43960,
    status: "AUTHORIZED",
    buy_order: "1007-1",
    session_id: ORDER_ID,
    response_code: 0,
    payment_type_code: "VD",
    installments_number: 0,
    ...overrides,
  };
}

describe("parseWebpayReturn", () => {
  it("con solo token_ws hace commit", () => {
    expect(parseWebpayReturn(new URLSearchParams("token_ws=abc"))).toEqual({ kind: "commit", token: "abc" });
  });

  it("con TBK_TOKEN es abortado aunque venga token_ws (trampa 27)", () => {
    const params = new URLSearchParams("token_ws=abc&TBK_TOKEN=def&TBK_ORDEN_COMPRA=1007-1&TBK_ID_SESION=s");
    expect(parseWebpayReturn(params)).toEqual({ kind: "aborted", token: "def", buyOrder: "1007-1", sessionId: "s" });
  });

  it("con solo la orden y la sesión es timeout", () => {
    const params = new URLSearchParams("TBK_ORDEN_COMPRA=1007-2&TBK_ID_SESION=s");
    expect(parseWebpayReturn(params)).toEqual({ kind: "timeout", buyOrder: "1007-2", sessionId: "s" });
  });

  it("sin parámetros (o vacíos) es inválido", () => {
    expect(parseWebpayReturn(new URLSearchParams(""))).toEqual({ kind: "invalid" });
    expect(parseWebpayReturn(new URLSearchParams("token_ws=%20"))).toEqual({ kind: "invalid" });
  });
});

describe("isApproved", () => {
  it("exige response_code 0 y AUTHORIZED (HTTP 200 no basta, trampa 26)", () => {
    expect(isApproved({ response_code: 0, status: "AUTHORIZED" })).toBe(true);
    expect(isApproved({ response_code: -1, status: "FAILED" })).toBe(false);
    expect(isApproved({ response_code: -1, status: "AUTHORIZED" })).toBe(false);
    expect(isApproved({ response_code: 0, status: "REVERSED" })).toBe(false);
  });
});

describe("matchesAttempt", () => {
  it("compara monto, buy_order y session_id (trampa 36)", () => {
    expect(matchesAttempt(result(), expected)).toBe(true);
    expect(matchesAttempt(result({ amount: 100 }), expected)).toBe(false);
    expect(matchesAttempt(result({ buy_order: "1007-2" }), expected)).toBe(false);
    expect(matchesAttempt(result({ session_id: "otro" }), expected)).toBe(false);
  });
});

describe("webpayOutcome", () => {
  it("aprobado y coincide → paid", () => {
    expect(webpayOutcome(result(), expected)).toEqual({ status: "paid" });
  });

  it("aprobado con otro monto → mismatch (se reembolsa)", () => {
    expect(webpayOutcome(result({ amount: 1 }), expected)).toEqual({ status: "mismatch" });
  });

  it("rechazado → failed", () => {
    expect(webpayOutcome(result({ response_code: -1, status: "FAILED" }), expected)).toEqual({ status: "failed", reason: "rejected" });
  });

  it("INITIALIZED sigue pendiente, salvo que el pedido haya vencido", () => {
    expect(webpayOutcome(result({ status: "INITIALIZED", response_code: -1 }), expected)).toEqual({ status: "pending" });
    expect(webpayOutcome(result({ status: "INITIALIZED", response_code: -1 }), expected, true)).toEqual({ status: "failed", reason: "expired" });
  });
});

describe("webpayCardLabel", () => {
  it("nombra el tipo de tarjeta según payment_type_code", () => {
    expect(webpayCardLabel("VD")).toBe("tarjeta de débito");
    expect(webpayCardLabel("VN")).toBe("tarjeta de crédito");
    expect(webpayCardLabel("VP")).toBe("tarjeta de prepago");
    expect(webpayCardLabel("NC", 3)).toBe("tarjeta de crédito en 3 cuotas");
    expect(webpayCardLabel(undefined)).toBe("tarjeta");
  });
});
