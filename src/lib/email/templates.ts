import { formatCLP } from "@/lib/format/clp";
import { formatDeadline } from "@/lib/format/dates";
import { STORE } from "@/lib/store";
import type { Email } from "./send";

// Textos de los correos (sin diseño propio: siguen la voz de la tienda, de tú y sin exclamaciones).
// Funciones puras para poder probarlas; el envío está en send.ts.

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function layout(title: string, paragraphs: string[]): string {
  const body = paragraphs.map((p) => `<p style="margin:0 0 16px">${p}</p>`).join("");
  return `<!doctype html><html lang="es-CL"><body style="margin:0;padding:24px;background:#f7f5f0;color:#1d1b17;font-family:Arial,sans-serif;font-size:15px;line-height:22px"><div style="max-width:560px;margin:0 auto;padding:24px;background:#fff;border-radius:12px"><p style="margin:0 0 16px;font-size:20px;font-weight:700">${escapeHtml(STORE.name)}</p><h1 style="margin:0 0 16px;font-size:22px;line-height:28px">${escapeHtml(title)}</h1>${body}<p style="margin:24px 0 0;color:#6b665c;font-size:13px">${escapeHtml(STORE.legalName)} · RUT ${escapeHtml(STORE.rut)} · ${escapeHtml(STORE.contactEmail)}</p></div></body></html>`;
}

export type OrderEmailData = {
  to: string;
  orderNumber: number;
  total: number;
  /** URL absoluta de la página del pedido */
  orderUrl: string;
};

export function orderConfirmedEmail(data: OrderEmailData & { paidWith: string }): Email {
  const subject = `Pedido N.º ${data.orderNumber} confirmado`;
  const lines = [
    `Recibimos tu pago de ${formatCLP(data.total)} con ${data.paidWith}.`,
    "Ahora preparamos tu pedido y te avisamos cuando salga a despacho.",
    `Puedes ver el detalle en ${data.orderUrl}`,
  ];
  return {
    to: data.to,
    subject,
    text: [`Gracias, tu pedido está confirmado`, ...lines].join("\n\n"),
    html: layout("Gracias, tu pedido está confirmado", [
      escapeHtml(lines[0]),
      escapeHtml(lines[1]),
      `<a href="${escapeHtml(data.orderUrl)}" style="color:#1f5a44;font-weight:600">Ver el pedido</a>`,
    ]),
  };
}

export type BankLines = { label: string; value: string }[];

export function transferInstructionsEmail(data: OrderEmailData & { expiresAt: Date; bank: BankLines }): Email {
  const deadline = formatDeadline(data.expiresAt);
  const intro = `Transfiere ${formatCLP(data.total)} hasta el ${deadline} para confirmar tu pedido.`;
  const message = `Escribe «Pedido ${data.orderNumber}» en el mensaje de la transferencia. Si no la recibimos a tiempo, liberamos los productos y anulamos el pedido sin costo para ti.`;
  const rows = data.bank.map((row) => `${row.label}: ${row.value}`);
  return {
    to: data.to,
    subject: `Datos para transferir · Pedido N.º ${data.orderNumber}`,
    text: [intro, rows.join("\n"), message, `Detalle del pedido: ${data.orderUrl}`].join("\n\n"),
    html: layout(`Transfiere ${formatCLP(data.total)} para confirmar tu pedido`, [
      escapeHtml(intro),
      rows.map((r) => escapeHtml(r)).join("<br>"),
      escapeHtml(message),
      `<a href="${escapeHtml(data.orderUrl)}" style="color:#1f5a44;font-weight:600">Ver el pedido</a>`,
    ]),
  };
}

/** B13: el pago llegó con el pedido ya anulado y se devolvió */
export function lateRefundEmail(data: OrderEmailData): Email {
  const lines = [
    `Recibimos tu pago de ${formatCLP(data.total)} después de que venció el plazo del pedido N.º ${data.orderNumber}, y ya habíamos liberado los productos.`,
    "Te devolvimos el pago completo. Según tu banco, puede tardar unos días hábiles en verse en tu cuenta.",
    `Si tienes dudas, escríbenos a ${STORE.contactEmail}.`,
  ];
  return {
    to: data.to,
    subject: `Te devolvimos el pago del pedido N.º ${data.orderNumber}`,
    text: lines.join("\n\n"),
    html: layout("Te devolvimos el pago", lines.map(escapeHtml)),
  };
}
