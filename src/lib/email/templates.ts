import { santiagoDate } from "@/lib/chile/business-days";
import { isShippingMethod, shippingMethodLabel, type ShippingMethod } from "@/lib/checkout/shipping";
import { formatCLP } from "@/lib/format/clp";
import { formatDeadline } from "@/lib/format/dates";
import { addressLine, asAddress } from "@/lib/orders/address";
import { cancelReason, carrierTrackingUrl, orderStatusLine, type CustomerOrder, type CustomerOrderPayment } from "@/lib/orders/customer-view";
import { estimatedDelivery } from "@/lib/orders/order-status";
import { GATEWAY_NAMES, paidWithLabel } from "@/lib/payments/labels";
import { STORE } from "@/lib/store";
import type { Json } from "@/types/database";
import type { Email } from "./send";

// Correos de los pedidos (04-diseno/templates.md#correos: CorreoConfirmacion, CorreoDespacho y
// CorreoAnulacion). Funciones puras para poder probarlas; el envío y los datos están en send.ts y
// order-emails.ts. Estilos en línea, colores en hex y fuentes del sistema: los clientes de correo no
// cargan variables ni Google Fonts, y Outlook no entiende flex (los bloques se separan con margen).
// Las plantillas de Supabase Auth (supabase/templates/) usan el mismo layout: si cambia, cambiarlas.

const COLOR = {
  page: "#f7f5f0",
  card: "#ffffff",
  text: "#1b1a17",
  muted: "#5c564d",
  line: "#dcd5c9",
  promo: "#efe4cf",
  neutral: "#ece8df",
  brand: "#1f5a44",
  success: "#0b6b55",
} as const;

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

// ----- Piezas del layout -----

type LayoutOptions = {
  subject: string;
  /** Línea chica sobre la tarjeta (*Pedido N.º 10482 · Llega el martes 27 de octubre*); la bandeja la muestra como vista previa */
  preview: string;
  /** Bloques de la tarjeta, debajo del logo, separados por 24 px */
  blocks: string[];
  /** Frase extra del pie (*Los correos de tus pedidos no se pueden desactivar.*) */
  footerNote?: string;
};

/**
 * Página 640 px del artboard: fondo crema, tarjeta blanca de 560 px con el logo en Georgia y el pie
 * con los datos de la tienda. `viewport` para que en el móvil no se vea al ancho de escritorio; en
 * pantallas angostas los márgenes bajan (los clientes que no leen <style> quedan con los de escritorio).
 */
export function layout({ subject, preview, blocks, footerNote }: LayoutOptions): string {
  const body = blocks.map((block) => `<div style="margin:24px 0 0">${block}</div>`).join("");
  const footer = `${escapeHtml(STORE.legalName)} · RUT ${escapeHtml(STORE.rut)} · ${escapeHtml(STORE.contactEmail)}<br>Recibes este correo porque compraste en ${escapeHtml(STORE.name)}.${footerNote ? ` ${escapeHtml(footerNote)}` : ""}`;
  return [
    `<!doctype html><html lang="es-CL"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(subject)}</title>`,
    `<style>@media (max-width:480px){.page{padding:24px 12px!important}.card{padding:24px 20px!important}}</style></head>`,
    `<body style="margin:0;padding:0;background:${COLOR.page}">`,
    `<div class="page" style="padding:32px 40px;background:${COLOR.page};color:${COLOR.text};font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px">`,
    `<div style="max-width:560px;margin:0 auto">`,
    `<p style="margin:0 0 16px;font-size:12px;line-height:16px;color:${COLOR.muted}">${escapeHtml(preview)}</p>`,
    `<div class="card" style="padding:32px;border-radius:12px;background:${COLOR.card}">`,
    `<p style="margin:0;font-family:Georgia,serif;font-size:22px;line-height:28px;font-weight:700">${escapeHtml(STORE.name)}</p>`,
    body,
    `</div>`,
    `<p style="margin:24px 0 0;font-size:12px;line-height:18px;color:${COLOR.muted}">${footer}</p>`,
    `</div></div></body></html>`,
  ].join("");
}

/** N.º en monoespaciada (opcional), título y bajada. `intro` ya viene en HTML */
function heading(title: string, intro: string, eyebrow?: string): string {
  return [
    eyebrow ? `<p style="margin:0 0 8px;font-family:'Courier New',monospace;font-size:12px;line-height:16px;color:${COLOR.muted}">${escapeHtml(eyebrow)}</p>` : "",
    // Sin cortar *N.º 1041* entre dos líneas en el móvil
    `<h1 style="margin:0;font-size:24px;line-height:30px;font-weight:700">${escapeHtml(title).replace("N.º ", "N.º&nbsp;")}</h1>`,
    `<p style="margin:8px 0 0">${intro}</p>`,
  ].join("");
}

/** Caja de color con su contenido (HTML) */
function box(background: string, content: string): string {
  return `<div style="padding:20px;border-radius:8px;background:${background}">${content}</div>`;
}

function strongLine(text: string): string {
  return `<p style="margin:0;font-weight:700">${escapeHtml(text)}</p>`;
}

function mutedLine(html: string, margin = "4px 0 0"): string {
  return `<p style="margin:${margin};color:${COLOR.muted}">${html}</p>`;
}

function button(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 24px;border-radius:8px;background:${COLOR.brand};color:#ffffff;font-weight:700;text-decoration:none">${escapeHtml(label)}</a>`;
}

function link(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="color:${COLOR.brand};font-weight:700">${escapeHtml(label)}</a>`;
}

type Row = { label: string; value: string; strong?: boolean; total?: boolean; mutedLabel?: boolean; valueColor?: string };

/** Productos y totales: una fila por línea con borde arriba, el monto a la derecha */
function table(rows: Row[], muted = false): string {
  const cell = `padding:12px 0;border-top:1px solid ${COLOR.line}`;
  const body = rows
    .map((row) => {
      const label = `${cell};${row.strong ? "font-weight:700" : row.mutedLabel ? `color:${COLOR.muted}` : ""}`;
      const value = `${cell};text-align:right;white-space:nowrap;padding-left:16px;${muted ? "" : "font-weight:700;"}${row.total ? "font-size:18px;" : ""}${row.valueColor ? `color:${row.valueColor}` : ""}`;
      return `<tr><td style="${label}">${escapeHtml(row.label)}</td><td style="${value}">${escapeHtml(row.value)}</td></tr>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px;line-height:20px${muted ? `;color:${COLOR.muted}` : ""}">${body}</table>`;
}

// ----- Datos del pedido -----

export type EmailOrderItem = {
  product_name: string;
  variant_name: string | null;
  quantity: number;
  unit_price: number | string;
  line_total: number | string | null;
};

export type EmailOrderPayment = CustomerOrderPayment & { provider: string; raw_response: Json };

/** El pedido como lo leen los correos (order-emails.ts). Incluye lo que usa orderStatusLine */
export type EmailOrder = Omit<CustomerOrder, "payments"> & {
  id: string;
  order_number: number;
  contact_email: string;
  subtotal: number | string;
  discount_total: number | string;
  shipping_total: number | string;
  carrier: string | null;
  tracking_number: string | null;
  items: EmailOrderItem[];
  payments: EmailOrderPayment[];
};

/** URL absolutas de los botones */
export type EmailLinks = {
  /** *Ver el pedido*: /cuenta/pedidos/<n> con cuenta o /pedido/<id> si es invitado (orderLink) */
  order: string;
  /** *Volver a la tienda* */
  store: string;
};

/**
 * Enlace al pedido. Con cuenta (auth.users.is_anonymous false), el Detalle de la cuenta (D-026);
 * el invitado, la Confirmación con su sesión anónima. Un invitado que no confirmó el correo de su
 * cuenta (D-027) sigue siendo anónimo.
 */
export function orderLink(siteUrl: string, order: { id: string; order_number: number }, hasAccount: boolean): string {
  return hasAccount ? `${siteUrl}/cuenta/pedidos/${order.order_number}` : `${siteUrl}/pedido/${order.id}`;
}

const clp = (value: number | string) => formatCLP(Math.round(Number(value)));

function method(order: Pick<EmailOrder, "shipping_method">): ShippingMethod {
  return isShippingMethod(order.shipping_method) ? order.shipping_method : "standard";
}

function firstName(order: EmailOrder): string | null {
  return asAddress(order.shipping_address).recipient_name?.trim().split(/\s+/)[0] || null;
}

const hello = (order: EmailOrder) => {
  const name = firstName(order);
  return name ? `Hola, ${name}. ` : "";
};

/** *Taza de gres esmaltado · Arena · 2 unidades* */
function itemRows(order: EmailOrder): Row[] {
  return order.items.map((item) => ({
    label: [item.product_name, item.variant_name, item.quantity === 1 ? "1 unidad" : `${item.quantity} unidades`].filter(Boolean).join(" · "),
    value: clp(item.line_total ?? Number(item.unit_price) * item.quantity),
  }));
}

function itemLines(rows: Row[]): string {
  return rows.map((row) => `${row.label}: ${row.value}`).join("\n");
}

/** La fecha estimada si todavía no pasa (como el seguimiento del Detalle) */
function upcomingDelivery(order: EmailOrder, now: Date) {
  const estimate = estimatedDelivery(order);
  return estimate && estimate.date >= santiagoDate(now) ? estimate : null;
}

// ----- Pedido confirmado (CorreoConfirmacion) -----

export function orderConfirmedEmail(order: EmailOrder, links: EmailLinks): Email {
  const pickup = method(order) === "pickup";
  const paid = order.payments.find((p) => p.status === "paid");
  const paidWith = paid ? paidWithLabel(paid.provider, paid.raw_response) : "el medio elegido";
  const total = clp(order.total);
  const delivery = estimatedDelivery(order)?.label ?? shippingMethodLabel(method(order));
  const next = pickup ? "te avisamos cuando esté listo para retirar" : "te avisamos cuando salga a despacho";
  const where = pickup
    ? `${STORE.pickup.hours} · ${STORE.pickup.address}`
    : `Entre las 9:00 y las 20:00 · ${addressLine(asAddress(order.shipping_address), false)}`;
  const shipping = Number(order.shipping_total);
  const discount = Number(order.discount_total);
  const rows: Row[] = [
    ...itemRows(order),
    ...(discount > 0 ? [{ label: "Descuento", value: clp(-discount), mutedLabel: true, valueColor: COLOR.success }] : []),
    { label: pickup ? "Retiro" : "Despacho", value: shipping === 0 ? "Gratis" : clp(shipping), mutedLabel: true, valueColor: shipping === 0 ? COLOR.success : COLOR.text },
    { label: "Total pagado", value: total, strong: true, total: true },
  ];
  const subject = `Pedido N.º ${order.order_number} confirmado`;
  const intro = `Recibimos tu pago de ${total} con ${paidWith}. Ahora lo preparamos y ${next}.`;
  const returns = "Cambias o devuelves sin costo hasta 30 días después de recibirlo.";

  return {
    to: order.contact_email,
    subject,
    text: [
      `Pedido N.º ${order.order_number}`,
      "Gracias, tu pedido está confirmado",
      intro,
      `${delivery}\n${where}`,
      itemLines(rows),
      `Ver el pedido: ${links.order}`,
      returns,
    ].join("\n\n"),
    html: layout({
      subject,
      preview: `Pedido N.º ${order.order_number} · ${delivery}`,
      blocks: [
        heading(
          "Gracias, tu pedido está confirmado",
          `Recibimos tu pago de <strong>${total}</strong> con ${escapeHtml(paidWith)}. Ahora lo preparamos y ${next}.`,
          `Pedido N.º ${order.order_number}`,
        ),
        box(COLOR.promo, strongLine(delivery) + mutedLine(escapeHtml(where))),
        table(rows),
        button(links.order, "Ver el pedido"),
        mutedLine(escapeHtml(returns), "0"),
      ],
    }),
  };
}

// ----- Pedido en camino (CorreoDespacho) -----

/**
 * Lo dispara *Marcar como enviado* (7.4). La línea de arriba es la misma del seguimiento
 * (orderStatusLine: *Llega el …* o *Está en camino* si la fecha pasó). En el retiro en tienda,
 * shipped es *Listo para retirar* (trackingTimeline): el correo avisa que puede retirarlo (propuesta).
 */
export function orderShippedEmail(order: EmailOrder, links: EmailLinks & { hasAccount: boolean }, now: Date): Email {
  const pickup = method(order) === "pickup";
  const address = asAddress(order.shipping_address);
  const total = clp(order.total);
  const rows: Row[] = [...itemRows(order), { label: "Total pagado", value: total, strong: true, total: true }];
  const status = orderStatusLine(order, now);
  const estimate = upcomingDelivery(order, now);
  const ownDelivery = order.carrier === STORE.name;
  const trackingUrl = carrierTrackingUrl(order.carrier, order.tracking_number);
  const footerNote = "Los correos de tus pedidos no se pueden desactivar.";
  const accountLink = links.hasAccount ? link(links.order, "Mis pedidos") : link(links.order, "la página del pedido");
  const accountText = links.hasAccount ? "Puedes ver el pedido en Mis pedidos." : "Puedes ver el detalle en la página del pedido.";

  if (pickup) {
    const subject = `Tu pedido N.º ${order.order_number} está listo para retirar`;
    const intro = `Tu pedido N.º ${order.order_number} ya está en la tienda ${STORE.pickup.name}. ${STORE.pickup.instructions}`;
    return {
      to: order.contact_email,
      subject,
      text: [
        "Tu pedido está listo para retirar",
        `${hello(order)}${intro}`,
        `Lo retiras en\n${STORE.pickup.address}\n${STORE.pickup.hours}`,
        itemLines(rows),
        `${accountText} ${links.order}`,
      ].join("\n\n"),
      html: layout({
        subject,
        preview: `Pedido N.º ${order.order_number} · ${status}`,
        footerNote,
        blocks: [
          heading("Tu pedido está listo para retirar", escapeHtml(`${hello(order)}${intro}`)),
          box(COLOR.promo, strongLine(STORE.pickup.address) + mutedLine(escapeHtml(STORE.pickup.hours))),
          table(rows),
          mutedLine(`Puedes ver ${links.hasAccount ? "el pedido en" : "el detalle en"} ${accountLink}.`, "0"),
        ],
      }),
    };
  }

  const handedTo = ownDelivery
    ? `Tu pedido N.º ${order.order_number} salió con nuestro despacho.`
    : order.carrier
      ? `Entregamos tu pedido N.º ${order.order_number} a ${order.carrier}.`
      : `Tu pedido N.º ${order.order_number} salió a despacho.`;
  const day = estimate ? estimate.label.replace(/^Llega el /, "") : null;
  const when = day ? ` Llega el <strong>${escapeHtml(day)}</strong>, entre las 9:00 y las 20:00.` : "";
  const whenText = day ? ` Llega el ${day}, entre las 9:00 y las 20:00.` : "";
  const recipient = [address.recipient_name, addressLine(address)].filter(Boolean).join(" · ");
  const trackingLabel = `Código de seguimiento${order.carrier && !ownDelivery ? ` ${order.carrier}` : ""}`;
  const trackingBlock = order.tracking_number
    ? box(
        COLOR.promo,
        [
          `<p style="margin:0;font-size:13px;line-height:18px;color:${COLOR.muted}">${escapeHtml(trackingLabel)}</p>`,
          `<p style="margin:4px 0 0;font-family:'Courier New',monospace;font-size:20px;line-height:26px;font-weight:700;letter-spacing:0.04em">${escapeHtml(order.tracking_number)}</p>`,
          trackingUrl ? `<div style="margin:12px 0 0">${button(trackingUrl, "Seguir el envío")}</div>` : "",
        ].join(""),
      )
    : null;
  const subject = `Tu pedido N.º ${order.order_number} va en camino`;

  return {
    to: order.contact_email,
    subject,
    text: [
      "Tu pedido va en camino",
      `${hello(order)}${handedTo}${whenText}`,
      order.tracking_number ? `${trackingLabel}: ${order.tracking_number}${trackingUrl ? `\nSeguir el envío: ${trackingUrl}` : ""}` : null,
      `Lo recibe en\n${recipient}`,
      itemLines(rows),
      `${accountText} ${links.order}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
    html: layout({
      subject,
      preview: `Pedido N.º ${order.order_number} · ${status}`,
      footerNote,
      blocks: [
        heading("Tu pedido va en camino", `${escapeHtml(`${hello(order)}${handedTo}`)}${when}`),
        ...(trackingBlock ? [trackingBlock] : []),
        `<p style="margin:0;font-size:13px;line-height:18px;font-weight:700">Lo recibe en</p>${mutedLine(escapeHtml(recipient))}`,
        table(rows),
        mutedLine(`Puedes ver ${links.hasAccount ? "el pedido en" : "el detalle en"} ${accountLink}.`, "0"),
      ],
    }),
  };
}

// ----- Pedido anulado (CorreoAnulacion, tweak motivo) -----

/** Qué pasó con el dinero: devuelto (intento refunded), por devolver (pagado) o sin cargo */
function cancelMoney(order: EmailOrder): { title: string; text: string } {
  const refunded = order.payments.find((p) => p.status === "refunded");
  if (refunded) {
    const amount = clp(refunded.amount);
    const text =
      refunded.provider === "webpay"
        ? `El reembolso ya está hecho en ${GATEWAY_NAMES.webpay}. Según tu banco, puede tardar unos días hábiles en verse en tu tarjeta.`
        : refunded.provider === "flow"
          ? `El reembolso ya está hecho en ${GATEWAY_NAMES.flow}. Según tu banco, puede tardar unos días hábiles en verse en tu cuenta.`
          : "Te lo devolvimos por transferencia bancaria.";
    return { title: `Te devolvimos ${amount}`, text };
  }
  const paid = order.payments.find((p) => p.status === "paid");
  if (paid || order.paid_at) {
    return { title: `Te vamos a devolver ${clp(paid?.amount ?? order.total)}`, text: "Lo devolvemos por el mismo medio con el que pagaste." };
  }
  return {
    title: "No hicimos ningún cargo",
    text:
      order.payment_method === "transfer"
        ? `Si ya transferiste, escríbenos a ${STORE.contactEmail} con el comprobante y te devolvemos el monto completo.`
        : "No tienes nada más que hacer.",
  };
}

/**
 * Los 3 motivos del artboard. `tienda` usa cancel_note si la hay (el mismo texto que ve el cliente
 * en Mis pedidos). Por vencimiento, el cron lo envía solo a las transferencias (decisión 6a); el
 * texto para tarjeta o Flow queda por si se usa.
 */
export function orderCancelledEmail(order: EmailOrder, links: EmailLinks): Email {
  const reason = cancelReason(order);
  const transfer = order.payment_method === "transfer";
  const deadline = order.expires_at ? formatDeadline(new Date(order.expires_at)) : null;
  const money = cancelMoney(order);
  let motive: string;
  let preview: string;
  if (reason === "vencio") {
    motive = transfer
      ? `No recibimos la transferencia ${deadline ? `antes del ${deadline}` : "a tiempo"}, así que liberamos los productos y anulamos el pedido.`
      : `El pago no se completó ${deadline ? `antes del ${deadline}` : "a tiempo"}, así que liberamos los productos y anulamos el pedido.`;
    preview = transfer ? "No recibimos la transferencia a tiempo" : "Venció el plazo para pagar";
  } else if (reason === "cliente") {
    motive = "Anulamos el pedido como nos pediste.";
    preview = money.title;
  } else {
    motive = order.cancel_note?.trim() || "Tuvimos que anular tu pedido. Lo sentimos.";
    preview = money.title;
  }
  const rows = itemRows(order);
  const subject = `Anulamos tu pedido N.º ${order.order_number}`;
  const help = `Si tienes dudas, escríbenos a ${STORE.contactEmail}.`;

  return {
    to: order.contact_email,
    subject,
    text: [subject, `${hello(order)}${motive}`, `${money.title}\n${money.text}`, itemLines(rows), `Volver a la tienda: ${links.store}`, help].join("\n\n"),
    html: layout({
      subject,
      preview: `Pedido N.º ${order.order_number} · ${preview}`,
      blocks: [
        heading(subject, escapeHtml(`${hello(order)}${motive}`)),
        box(COLOR.neutral, strongLine(money.title) + mutedLine(escapeHtml(money.text))),
        table(rows, true),
        button(links.store, "Volver a la tienda"),
        mutedLine(`Si tienes dudas, escríbenos a ${link(`mailto:${STORE.contactEmail}`, STORE.contactEmail)}.`, "0"),
      ],
    }),
  };
}

// ----- Correos de la fase 6 (sin artboard propio: mismo layout) -----

export type OrderEmailData = {
  to: string;
  orderNumber: number;
  total: number;
  /** URL absoluta de la página del pedido */
  orderUrl: string;
};

export type BankLines = { label: string; value: string }[];

export function transferInstructionsEmail(data: OrderEmailData & { expiresAt: Date; bank: BankLines }): Email {
  const deadline = formatDeadline(data.expiresAt);
  const intro = `Transfiere ${formatCLP(data.total)} hasta el ${deadline} para confirmar tu pedido.`;
  const message = `Escribe «Pedido ${data.orderNumber}» en el mensaje de la transferencia. Si no la recibimos a tiempo, liberamos los productos y anulamos el pedido sin costo para ti.`;
  const rows = data.bank.map((row) => `${row.label}: ${row.value}`);
  const subject = `Datos para transferir · Pedido N.º ${data.orderNumber}`;
  return {
    to: data.to,
    subject,
    text: [intro, rows.join("\n"), message, `Detalle del pedido: ${data.orderUrl}`].join("\n\n"),
    html: layout({
      subject,
      preview: `Pedido N.º ${data.orderNumber} · Transfiere hasta el ${deadline}`,
      blocks: [
        heading(`Transfiere ${formatCLP(data.total)} para confirmar tu pedido`, escapeHtml(intro), `Pedido N.º ${data.orderNumber}`),
        box(COLOR.promo, rows.map((r, i) => `<p style="margin:${i ? "4px" : "0"} 0 0">${escapeHtml(r)}</p>`).join("")),
        mutedLine(escapeHtml(message), "0"),
        button(data.orderUrl, "Ver el pedido"),
      ],
    }),
  };
}

/** B13: el pago llegó con el pedido ya anulado y se devolvió */
export function lateRefundEmail(data: OrderEmailData): Email {
  const lines = [
    `Recibimos tu pago de ${formatCLP(data.total)} después de que venció el plazo del pedido N.º ${data.orderNumber}, y ya habíamos liberado los productos.`,
    "Te devolvimos el pago completo. Según tu banco, puede tardar unos días hábiles en verse en tu cuenta.",
    `Si tienes dudas, escríbenos a ${STORE.contactEmail}.`,
  ];
  const subject = `Te devolvimos el pago del pedido N.º ${data.orderNumber}`;
  return {
    to: data.to,
    subject,
    text: lines.join("\n\n"),
    html: layout({
      subject,
      preview: `Pedido N.º ${data.orderNumber} · Te devolvimos ${formatCLP(data.total)}`,
      blocks: [heading("Te devolvimos el pago", escapeHtml(lines[0])), box(COLOR.neutral, mutedLine(escapeHtml(lines[1]), "0")), mutedLine(escapeHtml(lines[2]), "0")],
    }),
  };
}

