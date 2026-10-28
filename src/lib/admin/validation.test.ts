import { describe, expect, test } from "vitest";
import { alertCopy, openAlertsSummary, openAlertsTitle } from "./alerts";
import { cancelPlan, isUuid, parseCancelNote, parseOperationNumber, parseShipment, refundPlan } from "./validation";

describe("N.º de operación", () => {
  test("opcional, sin espacios de más", () => {
    expect(parseOperationNumber(null)).toEqual({ ok: true, value: null });
    expect(parseOperationNumber("   ")).toEqual({ ok: true, value: null });
    expect(parseOperationNumber("  0001 2345  ")).toEqual({ ok: true, value: "0001 2345" });
  });

  test("sin símbolos ni textos largos", () => {
    expect(parseOperationNumber("<script>").ok).toBe(false);
    expect(parseOperationNumber("1".repeat(41)).ok).toBe(false);
  });
});

describe("Marcar como enviado", () => {
  test("transportista de la lista y código obligatorio", () => {
    expect(parseShipment({ carrier: "Starken", tracking: " 9845 1230 7716 " }, false)).toEqual({
      ok: true,
      value: { carrier: "Starken", tracking: "9845 1230 7716" },
    });
    expect(parseShipment({ carrier: "DHL", tracking: "1" }, false)).toEqual({ ok: false, errors: { carrier: "Elige el transportista." } });
    expect(parseShipment({ carrier: "Chilexpress", tracking: "" }, false)).toEqual({
      ok: false,
      errors: { tracking: "Escribe el código de seguimiento." },
    });
  });

  test("despacho propio sin código; retiro en tienda sin transportista", () => {
    expect(parseShipment({ carrier: "Almacén", tracking: "" }, false)).toEqual({ ok: true, value: { carrier: "Almacén", tracking: null } });
    expect(parseShipment({ carrier: "Starken", tracking: "x" }, true)).toEqual({ ok: true, value: { carrier: null, tracking: null } });
  });
});

describe("motivo de la anulación", () => {
  test("las opciones guardan el texto que lee el cliente", () => {
    expect(parseCancelNote("stock", null)).toEqual({ ok: true, value: "Nos quedamos sin stock de un producto del pedido." });
    expect(parseCancelNote("ninguno", "ignorado")).toEqual({ ok: true, value: null });
  });

  test("otro motivo: obligatorio y con tope", () => {
    expect(parseCancelNote("otro", "  Cambio de dirección  ")).toEqual({ ok: true, value: "Cambio de dirección" });
    expect(parseCancelNote("otro", "").ok).toBe(false);
    expect(parseCancelNote("otro", "a".repeat(201)).ok).toBe(false);
    expect(parseCancelNote("inventado", null).ok).toBe(false);
  });
});

describe("qué pasa con el dinero al anular", () => {
  const paid = (provider: string, status: "paid" | "refunded" | "failed" = "paid") => ({
    provider,
    status,
    amount: 47480,
    updated_at: "2026-10-25T13:14:00Z",
    raw_response: null,
  });

  test("pasarela: se reembolsa al anular", () => {
    const plan = cancelPlan({ status: "paid", total: 47480, payments: [paid("webpay")] });
    expect(plan.refund).toBe("gateway");
    expect(plan.confirmLabel).toBe("Anular y reembolsar");
    expect(plan.notice).toContain("Devolveremos $47.480 en Webpay Plus");
  });

  test("transferencia pagada: la devuelve el admin (decisión 5)", () => {
    const plan = cancelPlan({ status: "processing", total: 47480, payments: [paid("transfer")] });
    expect(plan.refund).toBe("transfer");
    expect(plan.notice).toMatch(/^Devuélvele \$47\.480 por transferencia/);
  });

  test("sin pago: nada que devolver", () => {
    expect(cancelPlan({ status: "pending", total: 47480, payments: [paid("transfer", "failed")] }).refund).toBeNull();
  });

  test("reembolso de un pedido ya anulado", () => {
    expect(refundPlan({ status: "cancelled", payments: [paid("flow")] })).toEqual({ kind: "gateway", amount: 47480, gateway: "Flow" });
    expect(refundPlan({ status: "cancelled", payments: [paid("transfer")] })?.kind).toBe("transfer");
    expect(refundPlan({ status: "cancelled", payments: [paid("flow", "refunded")] })).toBeNull();
  });

  test("ids", () => {
    expect(isUuid("6a3c7c51-dc07-46fd-b4c1-5fdc459d9ef7")).toBe(true);
    expect(isUuid("1042")).toBe(false);
  });
});

describe("alertas", () => {
  test("textos con la pasarela del intento", () => {
    const copy = alertCopy("refund_failed", "flow");
    expect(copy.tone).toBe("danger");
    expect(copy.what).toContain("en Flow");
    expect(copy.todo).toContain("el panel de Flow");
    expect(alertCopy("double_payment", "webpay").todo).toContain("Transbank");
  });

  test("resumen del aviso de la lista", () => {
    expect(openAlertsTitle(1)).toBe("1 alerta de pago sin resolver");
    expect(openAlertsTitle(3)).toBe("3 alertas de pago sin resolver");
    expect(openAlertsSummary(["refund_failed", "paid_after_cancel", "paid_after_cancel"])).toBe(
      "1 reembolso fallido y 2 pagos después de anular.",
    );
    expect(openAlertsSummary([])).toBe("");
  });
});
