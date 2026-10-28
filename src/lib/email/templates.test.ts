import { describe, expect, it } from "vitest";
import { METROPOLITAN_REGION } from "@/lib/chile/regions";
import {
  lateRefundEmail,
  orderCancelledEmail,
  orderConfirmedEmail,
  orderLink,
  orderShippedEmail,
  transferInstructionsEmail,
  type EmailOrder,
} from "./templates";

const SITE = "https://audazia.dev";
const LINKS = { order: `${SITE}/cuenta/pedidos/1040`, store: SITE };

// Pagado el domingo 25 de octubre de 2026 a las 16:52 en Chile: en la RM llega el martes 27
function order(overrides: Partial<EmailOrder> = {}): EmailOrder {
  return {
    id: "6f1c2a3b-0000-4000-8000-000000000001",
    order_number: 1040,
    contact_email: "almacen.prueba@mailinator.com",
    status: "paid",
    payment_method: "webpay",
    shipping_method: "standard",
    shipping_address: {
      recipient_name: "Camila Rojas",
      line1: "Av. Providencia 1234",
      line2: "depto. 502",
      city: "Providencia",
      region: METROPOLITAN_REGION,
    },
    subtotal: "43960.00",
    discount_total: "0.00",
    shipping_total: "0.00",
    total: "43960.00",
    placed_at: "2026-10-25T19:52:10Z",
    paid_at: "2026-10-25T19:52:56Z",
    shipped_at: null,
    delivered_at: null,
    cancelled_at: null,
    expires_at: "2026-10-25T20:22:10Z",
    cancel_reason: null,
    cancel_note: null,
    carrier: null,
    tracking_number: null,
    items: [
      { product_name: "Taza de gres esmaltado", variant_name: "Arena", quantity: 2, unit_price: "12490.00", line_total: "24980.00" },
      { product_name: "Vela de soya aroma higuera", variant_name: "200 g", quantity: 1, unit_price: "9990.00", line_total: "9990.00" },
    ],
    payments: [
      {
        provider: "webpay",
        status: "paid",
        amount: "43960.00",
        updated_at: "2026-10-25T19:52:56Z",
        raw_response: { result: { payment_type_code: "VD", installments_number: 0 } },
      },
    ],
    ...overrides,
  };
}

describe("layout", () => {
  it("con viewport, la línea de vista previa y el pie de la tienda", () => {
    const { html } = orderConfirmedEmail(order(), LINKS);
    expect(html).toContain('<meta name="viewport" content="width=device-width, initial-scale=1">');
    expect(html).toContain("Pedido N.º 1040 · Llega el martes 27 de octubre</p>");
    expect(html).toContain("Almacén SpA · RUT 76.543.210-3 · hola@almacen.cl<br>Recibes este correo porque compraste en Almacén.");
    expect(html).toContain("font-family:Georgia,serif");
  });

  it("escapa los datos del pedido", () => {
    const email = orderConfirmedEmail(order({ items: [{ product_name: "<b>x</b>", variant_name: null, quantity: 1, unit_price: 1, line_total: 1 }] }), LINKS);
    expect(email.html).toContain("&lt;b&gt;x&lt;/b&gt; · 1 unidad");
    expect(email.html).not.toContain("<b>x</b>");
  });
});

describe("enlace Ver el pedido", () => {
  it("con cuenta, el Detalle de la cuenta; como invitado, la Confirmación", () => {
    const ref = { id: "abc", order_number: 1040 };
    expect(orderLink(SITE, ref, true)).toBe("https://audazia.dev/cuenta/pedidos/1040");
    expect(orderLink(SITE, ref, false)).toBe("https://audazia.dev/pedido/abc");
  });
});

describe("CorreoConfirmacion", () => {
  it("N.º, título, monto y medio, fecha, productos, despacho y total", () => {
    const email = orderConfirmedEmail(order(), LINKS);
    expect(email.subject).toBe("Pedido N.º 1040 confirmado");
    expect(email.to).toBe("almacen.prueba@mailinator.com");
    expect(email.text).toContain("Gracias, tu pedido está confirmado");
    expect(email.text).toContain("Recibimos tu pago de $43.960 con tarjeta de débito vía Webpay Plus. Ahora lo preparamos y te avisamos cuando salga a despacho.");
    expect(email.text).toContain("Llega el martes 27 de octubre\nEntre las 9:00 y las 20:00 · Av. Providencia 1234, depto. 502, Providencia");
    expect(email.text).toContain("Taza de gres esmaltado · Arena · 2 unidades: $24.980");
    expect(email.text).toContain("Despacho: Gratis");
    expect(email.text).toContain("Total pagado: $43.960");
    expect(email.html).toContain(`href="${LINKS.order}"`);
    expect(email.html).toContain("Ver el pedido</a>");
  });

  it("con descuento y despacho pagado", () => {
    const email = orderConfirmedEmail(order({ discount_total: "1249.00", shipping_total: "3990.00" }), LINKS);
    expect(email.text).toContain("Descuento: −$1.249");
    expect(email.text).toContain("Despacho: $3.990");
  });

  it("retiro en tienda", () => {
    const email = orderConfirmedEmail(order({ shipping_method: "pickup" }), LINKS);
    expect(email.text).toContain("te avisamos cuando esté listo para retirar");
    expect(email.text).toContain("Disponible desde el lunes 26 de octubre");
    expect(email.text).toContain("Retiro: Gratis");
  });
});

describe("CorreoDespacho", () => {
  const shipped = (overrides: Partial<EmailOrder> = {}) =>
    order({ status: "shipped", shipped_at: "2026-10-26T15:00:00Z", carrier: "Starken", tracking_number: "984512307716", ...overrides });
  const NOW = new Date("2026-10-26T15:00:00Z");

  it("transportista, fecha del seguimiento, código y Seguir el envío", () => {
    const email = orderShippedEmail(shipped(), { ...LINKS, hasAccount: true }, NOW);
    expect(email.subject).toBe("Tu pedido N.º 1040 va en camino");
    expect(email.text).toContain("Hola, Camila. Entregamos tu pedido N.º 1040 a Starken. Llega el martes 27 de octubre, entre las 9:00 y las 20:00.");
    expect(email.html).toContain("Pedido N.º 1040 · Llega el martes 27 de octubre</p>");
    expect(email.text).toContain("Código de seguimiento Starken: 984512307716");
    expect(email.html).toContain('href="https://www.starken.cl/seguimiento?codigo=984512307716"');
    expect(email.text).toContain("Lo recibe en\nCamila Rojas · Av. Providencia 1234, depto. 502, Providencia, Metropolitana de Santiago");
    expect(email.text).toContain("Total pagado: $43.960");
    expect(email.html).toContain(`Mis pedidos</a>`);
    expect(email.html).toContain("Los correos de tus pedidos no se pueden desactivar.");
  });

  it("como invitado enlaza a la página del pedido", () => {
    const email = orderShippedEmail(shipped(), { order: `${SITE}/pedido/abc`, store: SITE, hasAccount: false }, NOW);
    expect(email.text).toContain(`Puedes ver el detalle en la página del pedido. ${SITE}/pedido/abc`);
    expect(email.html).not.toContain("Mis pedidos");
  });

  it("con la fecha ya pasada, la línea del seguimiento y sin fecha en el texto", () => {
    const email = orderShippedEmail(shipped(), { ...LINKS, hasAccount: true }, new Date("2026-10-29T15:00:00Z"));
    expect(email.html).toContain("Pedido N.º 1040 · Está en camino</p>");
    expect(email.text).not.toContain("Llega el");
  });

  it("despacho propio: sin Seguir el envío", () => {
    const email = orderShippedEmail(shipped({ carrier: "Almacén", tracking_number: "A-1040" }), { ...LINKS, hasAccount: true }, NOW);
    expect(email.text).toContain("Tu pedido N.º 1040 salió con nuestro despacho.");
    expect(email.text).toContain("Código de seguimiento: A-1040");
    expect(email.html).not.toContain("Seguir el envío");
  });

  it("retiro en tienda: listo para retirar", () => {
    const email = orderShippedEmail(shipped({ shipping_method: "pickup", carrier: null, tracking_number: null }), { ...LINKS, hasAccount: true }, NOW);
    expect(email.subject).toBe("Tu pedido N.º 1040 está listo para retirar");
    expect(email.text).toContain("Tajamar 223, Departamento 302, Las Condes");
    expect(email.html).not.toContain("Seguir el envío");
  });
});

describe("CorreoAnulacion", () => {
  const cancelled = (overrides: Partial<EmailOrder>) =>
    order({ status: "cancelled", cancelled_at: "2026-10-27T09:00:00Z", paid_at: null, payments: [], ...overrides });

  it("vencio: la transferencia no llegó, sin cargo", () => {
    const email = orderCancelledEmail(
      cancelled({ cancel_reason: "vencio", payment_method: "transfer", expires_at: "2026-10-27T01:00:00Z" }),
      LINKS,
    );
    expect(email.subject).toBe("Anulamos tu pedido N.º 1040");
    expect(email.html).toContain("Pedido N.º 1040 · No recibimos la transferencia a tiempo</p>");
    expect(email.text).toContain("Hola, Camila. No recibimos la transferencia antes del lunes 26 de octubre a las 22:00, así que liberamos los productos y anulamos el pedido.");
    expect(email.text).toContain("No hicimos ningún cargo\nSi ya transferiste, escríbenos a hola@almacen.cl con el comprobante");
    expect(email.text).toContain("Taza de gres esmaltado · Arena · 2 unidades: $24.980");
    expect(email.html).toContain(`href="${SITE}"`);
    expect(email.html).toContain("Volver a la tienda</a>");
  });

  it("vencio con tarjeta o Flow", () => {
    const email = orderCancelledEmail(cancelled({ cancel_reason: "vencio" }), LINKS);
    expect(email.text).toContain("El pago no se completó antes del domingo 25 de octubre a las 17:22");
    expect(email.html).toContain("Venció el plazo para pagar</p>");
  });

  it("tienda: la nota es el motivo y el reembolso de Webpay", () => {
    const email = orderCancelledEmail(
      cancelled({
        cancel_reason: "tienda",
        cancel_note: "Tuvimos que anular tu pedido porque se agotó la Taza de gres esmaltado en color Arena. Lo sentimos.",
        paid_at: "2026-10-25T19:52:56Z",
        payments: [{ ...order().payments[0], status: "refunded" }],
      }),
      LINKS,
    );
    expect(email.text).toContain("Hola, Camila. Tuvimos que anular tu pedido porque se agotó la Taza");
    expect(email.text).toContain("Te devolvimos $43.960\nEl reembolso ya está hecho en Webpay Plus. Según tu banco, puede tardar unos días hábiles en verse en tu tarjeta.");
    expect(email.html).toContain("Pedido N.º 1040 · Te devolvimos $43.960</p>");
  });

  it("tienda sin nota ni cobro", () => {
    const email = orderCancelledEmail(cancelled({ cancel_reason: "tienda" }), LINKS);
    expect(email.text).toContain("Tuvimos que anular tu pedido. Lo sentimos.");
    expect(email.text).toContain("No hicimos ningún cargo\nNo tienes nada más que hacer.");
  });

  it("tienda con el reembolso pendiente", () => {
    const email = orderCancelledEmail(cancelled({ cancel_reason: "tienda", paid_at: "2026-10-25T19:52:56Z", payments: order().payments }), LINKS);
    expect(email.text).toContain("Te vamos a devolver $43.960\nLo devolvemos por el mismo medio con el que pagaste.");
  });

  it("transferencia pagada sin devolver: le pide sus datos bancarios (decisión 5)", () => {
    const email = orderCancelledEmail(
      cancelled({
        cancel_reason: "tienda",
        payment_method: "transfer",
        paid_at: "2026-10-25T19:52:56Z",
        payments: [{ ...order().payments[0], provider: "transfer", raw_response: {} }],
      }),
      LINKS,
    );
    expect(email.text).toContain(
      "Te vamos a devolver $43.960\nTe lo devolvemos por transferencia. Escríbenos a hola@almacen.cl con tu banco, el tipo de cuenta, el número de cuenta y tu RUT.",
    );
  });

  it("transferencia ya devuelta", () => {
    const email = orderCancelledEmail(
      cancelled({ cancel_reason: "tienda", payment_method: "transfer", payments: [{ ...order().payments[0], provider: "transfer", status: "refunded" }] }),
      LINKS,
    );
    expect(email.text).toContain("Te devolvimos $43.960\nTe lo devolvimos por transferencia bancaria.");
  });

  it("cliente: como nos pediste, devuelto en Flow", () => {
    const email = orderCancelledEmail(
      cancelled({ cancel_reason: "cliente", payments: [{ ...order().payments[0], provider: "flow", status: "refunded" }] }),
      LINKS,
    );
    expect(email.text).toContain("Hola, Camila. Anulamos el pedido como nos pediste.");
    expect(email.text).toContain("El reembolso ya está hecho en Flow. Según tu banco, puede tardar unos días hábiles en verse en tu cuenta.");
  });
});

describe("correos de la fase 6", () => {
  const base = { to: "cliente@correo.cl", orderNumber: 1007, total: 43960, orderUrl: "https://almacen.cl/pedido/abc" };

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
    expect(email.html).toContain('href="https://almacen.cl/pedido/abc"');
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
