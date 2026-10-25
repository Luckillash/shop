import { describe, expect, it } from "vitest";
import {
  bankRows,
  paidWithLabel,
  redirectingLine,
  rejectionCause,
  rejectionCopy,
  retryLabel,
} from "./labels";

describe("textos de pago", () => {
  it("línea de estado al ir a la pasarela (texto del diseño)", () => {
    expect(redirectingLine("webpay", 43960)).toBe(
      "Te estamos llevando a Webpay Plus para pagar $43.960. No cierres ni actualices esta página.",
    );
    expect(redirectingLine("flow", 43960)).toContain("a Flow para pagar $43.960");
  });

  it("Pago rechazado (Webpay) y no completado (Flow) con los textos del diseño", () => {
    const webpay = rejectionCopy("webpay", "rejected");
    expect(webpay.title).toBe("Tu pago fue rechazado");
    expect(webpay.cause).toBe("El banco no autorizó la compra en Webpay Plus. No hicimos ningún cargo a tu tarjeta.");
    expect(webpay.steps.map((s) => s.title)).toEqual(["Prueba con otra tarjeta", "Revisa con tu banco", "Paga por transferencia"]);

    const flow = rejectionCopy("flow", "aborted");
    expect(flow.title).toBe("Tu pago en Flow no se completó");
    expect(flow.cause).toBe("El pago se canceló o se acabó el tiempo para completarlo en Flow. No hicimos ningún cargo.");
    expect(flow.steps[0].title).toBe("Vuelve a intentarlo en Flow");
  });

  it("abortado y error de conexión en Webpay (propuestas, B14)", () => {
    expect(rejectionCopy("webpay", "aborted").cause).toBe("Cancelaste el pago en Webpay Plus. No hicimos ningún cargo.");
    expect(rejectionCopy("webpay", "gateway_error").cause).toContain("No pudimos conectar con Webpay Plus");
  });

  it("rejectionCause lee shop_reason de raw_response", () => {
    expect(rejectionCause({ shop_reason: "aborted" })).toBe("aborted");
    expect(rejectionCause({ shop_reason: "timeout" })).toBe("timeout");
    expect(rejectionCause({ result: { response_code: -1 } })).toBe("rejected");
    expect(rejectionCause(null)).toBe("rejected");
  });

  it("botón de Elige cómo pagar", () => {
    expect(retryLabel("webpay", "webpay", 43960)).toBe("Reintentar pago $43.960");
    expect(retryLabel("flow", "webpay", 43960)).toBe("Pagar $43.960");
    expect(retryLabel("transfer", "webpay", 43960)).toBe("Ver datos para transferir");
  });

  it("Pagado con … según la pasarela", () => {
    expect(paidWithLabel("webpay", { result: { payment_type_code: "VD", installments_number: 0 } })).toBe(
      "tarjeta de débito vía Webpay Plus",
    );
    expect(paidWithLabel("flow", { result: { paymentData: { media: "Webpay" } } })).toBe("Webpay vía Flow");
    expect(paidWithLabel("flow", null)).toBe("Flow");
    expect(paidWithLabel("transfer", null)).toBe("transferencia bancaria");
  });

  it("datos para transferir: monto exacto y mensaje con el número de pedido", () => {
    const rows = bankRows(
      { bank: "Banco de Chile", accountType: "Cuenta corriente", accountNumber: "00-123-45678-09", holder: "Almacén SpA", rut: "76.543.210-3", email: "pagos@almacen.cl" },
      43960,
      1007,
    );
    expect(rows.find((r) => r.id === "monto")).toMatchObject({ value: "$43.960", copy: "43960" });
    expect(rows.find((r) => r.id === "numero")?.copy).toBe("001234567809");
    expect(rows.find((r) => r.id === "mensaje")?.value).toBe("Pedido 1007");
  });
});
