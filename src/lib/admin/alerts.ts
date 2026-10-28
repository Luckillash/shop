import type { BadgeTone } from "@/components/ui/badge";

// Alertas de pago (template AdminAlertas; payment_alerts, D-020): qué pasó y qué hacer con cada una.
// Los textos de refund_failed, paid_after_cancel y double_payment son los del artboard, con la
// pasarela del intento; amount_mismatch no está en el diseño (propuesta). Puro.

export type AlertKind = "refund_failed" | "paid_after_cancel" | "double_payment" | "amount_mismatch";

export type AlertCopy = {
  label: string;
  tone: BadgeTone;
  title: string;
  what: string;
  todo: string;
};

const GATEWAY: Record<string, string> = { webpay: "Webpay Plus", flow: "Flow" };

/** El panel donde se revisa el pago: *el panel de Flow* / *Transbank* */
function panel(provider: string | null): string {
  if (provider === "webpay") return "el panel de Transbank";
  if (provider === "flow") return "el panel de Flow";
  return "el panel de la pasarela";
}

export function alertCopy(kind: string, provider: string | null): AlertCopy {
  const gateway = (provider && GATEWAY[provider]) ?? "la pasarela";
  switch (kind) {
    case "refund_failed":
      return {
        label: "Reembolso fallido",
        tone: "danger",
        title: "No pudimos devolver el pago",
        what: `El reembolso en ${gateway} respondió con un error. El cliente todavía tiene el cargo.`,
        todo: `Vuelve a intentar el reembolso desde el pedido. Si falla otra vez, hazlo a mano en ${panel(provider)} y avísale al cliente por correo. Después marca la alerta como resuelta.`,
      };
    case "paid_after_cancel":
      return {
        label: "Pago después de anular",
        tone: "warning",
        title: "El pago llegó con el pedido ya anulado",
        what: `El pedido ya estaba anulado y los productos habían vuelto al stock cuando ${gateway} confirmó el pago. La tienda lo reembolsó y le envió al cliente el correo Te devolvimos el pago.`,
        todo: `Confirma en ${panel(provider)} que el reembolso figura como completado. Si el cliente escribe, puede volver a comprar.`,
      };
    case "double_payment":
      return {
        label: "Pago doble",
        tone: "warning",
        title: "Dos pagos aprobados para el mismo pedido",
        what: "El cliente pagó dos veces el mismo pedido. Se dejó el primer pago y el segundo se reembolsó automáticamente.",
        todo: `Revisa en ${panel(provider)} que el segundo pago esté devuelto. El pedido sigue su curso normal.`,
      };
    case "amount_mismatch":
      return {
        label: "Monto distinto",
        tone: "warning",
        title: "El pago no coincide con el pedido",
        what: `${gateway} confirmó un monto o una orden distintos a los del intento. No se marcó como pagado y se intentó devolver.`,
        todo: `Revisa el pago en ${panel(provider)} y confirma que se devolvió. Si el cliente escribe, que vuelva a pagar desde el pedido.`,
      };
    default:
      return { label: "Alerta", tone: "warning", title: "Alerta de pago", what: "Revisa el pago en la pasarela.", todo: "Revisa el pedido y la pasarela." };
  }
}

/** Título del `Notice` de la lista de pedidos: *3 alertas de pago sin resolver* */
export function openAlertsTitle(count: number): string {
  return count === 1 ? "1 alerta de pago sin resolver" : `${count} alertas de pago sin resolver`;
}

/** *1 reembolso fallido y 2 pagos después de anular* (el texto del `Notice`, propuesta) */
export function openAlertsSummary(kinds: string[]): string {
  const counts = new Map<string, number>();
  for (const kind of kinds) counts.set(kind, (counts.get(kind) ?? 0) + 1);
  const PLURAL: Record<string, [string, string]> = {
    refund_failed: ["reembolso fallido", "reembolsos fallidos"],
    paid_after_cancel: ["pago después de anular", "pagos después de anular"],
    double_payment: ["pago doble", "pagos dobles"],
    amount_mismatch: ["pago con un monto distinto", "pagos con un monto distinto"],
  };
  const parts = [...counts].map(([kind, n]) => {
    const [one, many] = PLURAL[kind] ?? ["alerta", "alertas"];
    return `${n} ${n === 1 ? one : many}`;
  });
  if (parts.length === 0) return "";
  const text = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} y ${parts.at(-1)}`;
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}
