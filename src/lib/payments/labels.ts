import { formatCLP } from "@/lib/format/clp";
import type { Json } from "@/types/database";
import { webpayCardLabel } from "./webpay-core";

// Textos de los medios de pago y de las pantallas de resultado (04-diseno/estados-y-mensajes.md,
// copiados tal cual del template PagoRechazado). Puro: lo usan las páginas, los correos y los tests.

export const PAYMENT_PROVIDERS = ["webpay", "flow", "transfer"] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export function isPaymentProvider(value: unknown): value is PaymentProvider {
  return typeof value === "string" && (PAYMENT_PROVIDERS as readonly string[]).includes(value);
}

/** Opciones de *Medio de pago* (checkout y *Elige cómo pagar*) */
export const PAYMENT_OPTIONS: { value: PaymentProvider; title: string; detail: string }[] = [
  { value: "webpay", title: "Tarjeta de crédito o débito", detail: "Pagarás en Webpay Plus, de forma segura." },
  { value: "flow", title: "Otros medios con Flow", detail: "Pagarás en Flow con el medio que elijas allí." },
  {
    value: "transfer",
    title: "Transferencia bancaria",
    detail: "Te enviamos los datos por correo y reservamos tu pedido por 48 horas.",
  },
];

/** Nombre de la pasarela para la línea de estado: *Te estamos llevando a Webpay Plus…* */
export const GATEWAY_NAMES = { webpay: "Webpay Plus", flow: "Flow" } as const;

/** Línea role="status" mientras se redirige a la pasarela */
export function redirectingLine(provider: "webpay" | "flow", total: number): string {
  return `Te estamos llevando a ${GATEWAY_NAMES[provider]} para pagar ${formatCLP(total)}. No cierres ni actualices esta página.`;
}

function asObject(value: Json | null | undefined): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

/** *Pagado con tarjeta de débito vía Webpay Plus* (sin "Pagado con"): de raw_response.result */
export function paidWithLabel(provider: string, raw: Json | null): string {
  const result = asObject(asObject(raw).result);
  if (provider === "webpay") {
    const code = typeof result.payment_type_code === "string" ? result.payment_type_code : undefined;
    const installments = Number(result.installments_number ?? 0);
    return `${webpayCardLabel(code, installments)} vía Webpay Plus`;
  }
  if (provider === "flow") {
    const media = asObject(result.paymentData).media;
    return typeof media === "string" && media ? `${media} vía Flow` : "Flow";
  }
  return "transferencia bancaria";
}

export type BankRow = { id: string; label: string; value: string; copy: string };

/** Filas de *Datos para transferir*. `copy` es lo que se copia (sin puntos ni guiones donde sirve) */
export function bankRows(
  bank: { bank: string; accountType: string; accountNumber: string; holder: string; rut: string; email: string },
  total: number,
  orderNumber: number,
): BankRow[] {
  return [
    { id: "monto", label: "Monto", value: formatCLP(total), copy: String(total) },
    { id: "banco", label: "Banco", value: bank.bank, copy: bank.bank },
    { id: "tipo", label: "Tipo de cuenta", value: bank.accountType, copy: bank.accountType },
    { id: "numero", label: "Número de cuenta", value: bank.accountNumber, copy: bank.accountNumber.replace(/\D/g, "") },
    { id: "titular", label: "Titular", value: bank.holder, copy: bank.holder },
    { id: "rut", label: "RUT", value: bank.rut, copy: bank.rut },
    { id: "correo", label: "Correo", value: bank.email, copy: bank.email },
    { id: "mensaje", label: "Mensaje", value: `Pedido ${orderNumber}`, copy: `Pedido ${orderNumber}` },
  ];
}

/** Por qué no se completó el último intento (payments.raw_response.shop_reason) */
export type RejectionCause = "rejected" | "aborted" | "timeout" | "gateway_error";

export function rejectionCause(raw: Json | null): RejectionCause {
  const reason = asObject(raw).shop_reason;
  return reason === "aborted" || reason === "timeout" || reason === "gateway_error" ? reason : "rejected";
}

type Step = { title: string; detail: string };

export type RejectionCopy = {
  via: string;
  title: string;
  cause: string;
  steps: Step[];
};

const TRANSFER_STEP: Step = {
  title: "Paga por transferencia",
  detail: "Reservamos tu pedido por 48 horas mientras transfieres.",
};

/**
 * Textos de *Pago rechazado* (Webpay) y *Pago no completado* (Flow). Los de abortado, tiempo
 * agotado y error de conexión no están en el diseño: son propuestas aprobadas por el dueño (B14).
 */
export function rejectionCopy(provider: "webpay" | "flow", cause: RejectionCause): RejectionCopy {
  if (provider === "flow") {
    return {
      via: "Flow",
      title: "Tu pago en Flow no se completó",
      cause:
        cause === "gateway_error"
          ? "No pudimos conectar con Flow. Intenta de nuevo en unos minutos o elige otro medio de pago."
          : "El pago se canceló o se acabó el tiempo para completarlo en Flow. No hicimos ningún cargo.",
      steps: [
        { title: "Vuelve a intentarlo en Flow", detail: "Te llevamos de nuevo a Flow con el mismo monto." },
        { title: "Paga con tarjeta en Webpay Plus", detail: "Crédito o débito de cualquier banco." },
        TRANSFER_STEP,
      ],
    };
  }

  const causes: Record<RejectionCause, string> = {
    rejected: "El banco no autorizó la compra en Webpay Plus. No hicimos ningún cargo a tu tarjeta.",
    aborted: "Cancelaste el pago en Webpay Plus. No hicimos ningún cargo.",
    timeout: "Se acabó el tiempo para pagar en Webpay Plus. No hicimos ningún cargo.",
    gateway_error: "No pudimos conectar con Webpay Plus. Intenta de nuevo en unos minutos o elige otro medio de pago.",
  };
  return {
    via: "Webpay Plus",
    title: cause === "rejected" ? "Tu pago fue rechazado" : "Tu pago no se completó",
    cause: causes[cause],
    steps: [
      { title: "Prueba con otra tarjeta", detail: "Puedes pagar con crédito o débito de cualquier banco." },
      {
        title: "Revisa con tu banco",
        detail: "Confirma que tienes cupo y que la tarjeta está habilitada para compras por internet.",
      },
      TRANSFER_STEP,
    ],
  };
}

/** Botón de *Elige cómo pagar*: reintentar con el mismo medio, pagar con otro o ver los datos */
export function retryLabel(chosen: PaymentProvider, previous: PaymentProvider | null, total: number): string {
  if (chosen === "transfer") return "Ver datos para transferir";
  return chosen === previous ? `Reintentar pago ${formatCLP(total)}` : `Pagar ${formatCLP(total)}`;
}
