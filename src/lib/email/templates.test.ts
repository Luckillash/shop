import { describe, expect, it } from "vitest";
import { lateRefundEmail, orderConfirmedEmail, transferInstructionsEmail } from "./templates";

const base = { to: "cliente@correo.cl", orderNumber: 1007, total: 43960, orderUrl: "https://almacen.cl/pedido/abc" };

describe("correos", () => {
  it("confirmación con el monto y el medio", () => {
    const email = orderConfirmedEmail({ ...base, paidWith: "tarjeta de débito vía Webpay Plus" });
    expect(email.subject).toBe("Pedido N.º 1007 confirmado");
    expect(email.text).toContain("Recibimos tu pago de $43.960 con tarjeta de débito vía Webpay Plus.");
    expect(email.html).toContain('href="https://almacen.cl/pedido/abc"');
  });

  it("transferencia con el plazo en hora de Chile y los datos", () => {
    const email = transferInstructionsEmail({
      ...base,
      // 01:00 UTC del 27 = 22:00 del lunes 26 en Santiago (horario de verano, UTC−3)
      expiresAt: new Date("2026-10-27T01:00:00Z"),
      bank: [{ label: "Banco", value: "Banco de Chile" }],
    });
    expect(email.text).toContain("hasta el lunes 26 de octubre a las 22:00");
    expect(email.text).toContain("Banco: Banco de Chile");
    expect(email.text).toContain("«Pedido 1007»");
  });

  it("escapa el HTML de los datos", () => {
    const email = transferInstructionsEmail({ ...base, expiresAt: new Date(), bank: [{ label: "Titular", value: "<b>x</b>" }] });
    expect(email.html).toContain("&lt;b&gt;x&lt;/b&gt;");
    expect(email.html).not.toContain("<b>x</b>");
  });

  it("pago devuelto (B13)", () => {
    expect(lateRefundEmail(base).subject).toBe("Te devolvimos el pago del pedido N.º 1007");
  });
});
