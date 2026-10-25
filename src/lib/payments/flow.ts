import "server-only";
import { flowConfig } from "./config";
import { signFlowParams, type FlowStatus } from "./flow-core";
import { GATEWAY_TIMEOUT_MS, GatewayError } from "./gateway-error";

// Cliente de la API REST de Flow: estilo RPC, POST form-urlencoded (no JSON) y GET con query,
// siempre con apiKey y la firma s. Los callbacks traen solo token: el estado sale de getStatus.

async function call<T>(method: "GET" | "POST", path: string, params: Record<string, string>): Promise<T> {
  const config = flowConfig();
  const all: Record<string, string> = { ...params, apiKey: config.apiKey };
  const body = new URLSearchParams({ ...all, s: signFlowParams(all, config.secretKey) });
  const url = method === "GET" ? `${config.baseUrl}${path}?${body}` : `${config.baseUrl}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : undefined,
      body: method === "POST" ? body : undefined,
      signal: AbortSignal.timeout(GATEWAY_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    throw new GatewayError("flow", `Flow no respondió: ${(error as Error).message}`);
  }
  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok) {
    const error = data as { code?: number; message?: string } | null;
    throw new GatewayError("flow", `Flow ${path}: ${response.status} ${error?.code ?? ""} ${error?.message ?? ""}`.trim(), response.status, data);
  }
  return data as T;
}

export type CreateFlowPayment = {
  /** payments.reference ("1007-1"): único por intento (D-013) */
  commerceOrder: string;
  subject: string;
  amount: number;
  /** Correo de contacto. Flow rechaza @example.com (trampa 34) */
  email: string;
  urlConfirmation: string;
  urlReturn: string;
  /** Segundos. Sin él, la orden de Flow no expira nunca (trampa 31) */
  timeout: number;
  optional?: Record<string, string>;
};

export function createPayment(input: CreateFlowPayment) {
  return call<{ url: string; token: string; flowOrder: number }>("POST", "/payment/create", {
    commerceOrder: input.commerceOrder,
    subject: input.subject,
    currency: "CLP",
    amount: String(Math.round(input.amount)),
    email: input.email,
    // 9 = todos los medios contratados
    paymentMethod: "9",
    urlConfirmation: input.urlConfirmation,
    urlReturn: input.urlReturn,
    timeout: String(input.timeout),
    // "optional", en singular, en payment/create
    ...(input.optional ? { optional: JSON.stringify(input.optional) } : {}),
  });
}

export function getStatus(token: string) {
  return call<FlowStatus>("GET", "/payment/getStatus", { token });
}

/** Reembolso. El campo es urlCallBack, con B mayúscula (trampa 35) */
export function createRefund(input: {
  refundCommerceOrder: string;
  receiverEmail: string;
  amount: number;
  urlCallBack: string;
  commerceTrxId: string;
}) {
  return call<{ token?: string; flowRefundOrder?: number | string; status?: string; amount?: number | string }>(
    "POST",
    "/refund/create",
    {
      refundCommerceOrder: input.refundCommerceOrder,
      receiverEmail: input.receiverEmail,
      amount: String(Math.round(input.amount)),
      urlCallBack: input.urlCallBack,
      commerceTrxId: input.commerceTrxId,
    },
  );
}

export function getRefundStatus(token: string) {
  return call<{ status?: string; amount?: number | string; flowRefundOrder?: number | string }>("GET", "/refund/getStatus", { token });
}
