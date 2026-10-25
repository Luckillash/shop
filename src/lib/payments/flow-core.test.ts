import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { flowOutcome, matchesFlowAttempt, signFlowParams, type FlowStatus } from "./flow-core";

const expected = { amount: 27470, reference: "1004-1" };

function status(overrides: Partial<FlowStatus> = {}): FlowStatus {
  return { flowOrder: 123, commerceOrder: "1004-1", status: 2, amount: 27470, ...overrides };
}

describe("signFlowParams", () => {
  it("firma nombre+valor ordenados por nombre, sin s (ejemplo de la documentación)", () => {
    const params = { apiKey: "XXXX-XXXX-XXXX", currency: "CLP", amount: "5000", s: "ignorada" };
    const wanted = createHmac("sha256", "secreto").update("amount5000apiKeyXXXX-XXXX-XXXXcurrencyCLP").digest("hex");
    expect(signFlowParams(params, "secreto")).toBe(wanted);
  });

  it("ordena distinguiendo mayúsculas, como sort() de PHP (urlCallBack, trampa 35)", () => {
    const params = { urlCallback: "b", urlCallBack: "a" };
    const wanted = createHmac("sha256", "k").update("urlCallBackaurlCallbackb").digest("hex");
    expect(signFlowParams(params, "k")).toBe(wanted);
  });
});

describe("flowOutcome", () => {
  it("2 = pagada si coinciden monto y orden", () => {
    expect(flowOutcome(status(), expected)).toEqual({ status: "paid" });
    expect(flowOutcome(status({ status: "2", amount: "27470" }), expected)).toEqual({ status: "paid" });
  });

  it("pagada con otro monto u otra orden → mismatch (trampa 36)", () => {
    expect(flowOutcome(status({ amount: 350 }), expected)).toEqual({ status: "mismatch" });
    expect(flowOutcome(status({ commerceOrder: "1004-2" }), expected)).toEqual({ status: "mismatch" });
  });

  it("3 rechazada y 4 anulada → failed", () => {
    expect(flowOutcome(status({ status: 3 }), expected)).toEqual({ status: "failed", reason: "rejected" });
    expect(flowOutcome(status({ status: 4 }), expected)).toEqual({ status: "failed", reason: "aborted" });
  });

  it("1 sigue pendiente, salvo con el pedido vencido", () => {
    expect(flowOutcome(status({ status: 1 }), expected)).toEqual({ status: "pending" });
    expect(flowOutcome(status({ status: 1 }), expected, true)).toEqual({ status: "failed", reason: "expired" });
  });

  it("matchesFlowAttempt redondea montos que llegan como string", () => {
    expect(matchesFlowAttempt({ amount: "27470.00", commerceOrder: "1004-1" }, expected)).toBe(true);
  });
});
