import "server-only";
import { after } from "next/server";
import { sendOrderEmail } from "@/lib/email/order-emails";
import { getRedis } from "@/lib/redis";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { Database, Json } from "@/types/database";
import { siteUrl } from "./config";
import * as flow from "./flow";
import { flowOutcome, type FlowStatus } from "./flow-core";
import { GatewayError } from "./gateway-error";
import { createPaymentLock, type LockClient } from "./lock";
import type { PaymentProvider } from "./labels";
import * as webpay from "./webpay";
import { isFullyRefunded, webpayOutcome, type AttemptOutcome, type FailureReason, type WebpayResult } from "./webpay-core";

// Intentos de pago (06-implementacion/checkout-y-pedidos.md, pagos-webpay-plus.md, pagos-flow.md).
// Todo con el cliente admin: payments solo lo escribe el backend. Quien llama ya verificó que el
// pedido es del usuario (RLS de orders con su cliente) o es la pasarela / el cron.

type Payment = Database["public"]["Tables"]["payments"]["Row"];
type Admin = ReturnType<typeof createSupabaseAdmin>;

const lock = createPaymentLock(getRedis as unknown as () => Promise<LockClient>);

/** Flow: la orden expira a los 20 min (el pedido, a los 30: D-010) */
const FLOW_TIMEOUT_SECONDS = 1200;

export type StartResult =
  | { kind: "webpay"; url: string; token: string }
  | { kind: "flow"; url: string }
  | { kind: "transfer" };

export type AttemptFailure = "not_found" | "not_pending" | "expired" | "already_paid" | "too_many" | "gateway" | "unknown";

export class AttemptError extends Error {
  constructor(readonly reason: AttemptFailure, message: string) {
    super(message);
    this.name = "AttemptError";
  }
}

function asObject(value: Json | null | undefined): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

/** raw_response = lo que ya había (create) + la respuesta de la pasarela + el motivo propio */
function rawWith(payment: Payment, extra: Record<string, unknown>): Json {
  return { ...asObject(payment.raw_response), ...extra } as Json;
}

// ----- Crear un intento -----

/**
 * start_payment_attempt (bloquea el pedido, valida pending/vencimiento/doble pago, marca failed los
 * pending anteriores) y después la pasarela. El intento se inserta antes del token para reservar
 * el número n del buy_order; si la pasarela falla, queda failed con gateway_error.
 */
export async function startAttempt(orderId: string, provider: PaymentProvider): Promise<StartResult> {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.rpc("start_payment_attempt", { p_order_id: orderId, p_provider: provider });
  if (error) {
    const hint = error.hint as AttemptFailure | undefined;
    if (hint && ["not_found", "not_pending", "expired", "already_paid", "too_many"].includes(hint)) {
      throw new AttemptError(hint, error.message);
    }
    console.error("[payments] start_payment_attempt", error);
    throw new AttemptError("unknown", error.message);
  }
  const attempt = data[0];
  const amount = Math.round(Number(attempt.amount));

  if (provider === "transfer") {
    after(() => sendOrderEmail(orderId, "transfer"));
    return { kind: "transfer" };
  }

  try {
    if (provider === "webpay") {
      const created = await webpay.createTransaction({
        buyOrder: attempt.reference,
        sessionId: orderId,
        amount,
        returnUrl: `${siteUrl()}/api/pagos/webpay/retorno`,
      });
      await savePaymentToken(admin, attempt.payment_id, created.token, { create: { url: created.url } });
      return { kind: "webpay", url: created.url, token: created.token };
    }

    const created = await flow.createPayment({
      commerceOrder: attempt.reference,
      subject: `Pedido N.º ${attempt.order_number}`,
      amount,
      email: attempt.contact_email,
      urlConfirmation: `${siteUrl()}/api/pagos/flow/confirmacion`,
      urlReturn: `${siteUrl()}/api/pagos/flow/retorno`,
      timeout: FLOW_TIMEOUT_SECONDS,
      // Sin optional: Flow lo muestra al pagador en su checkout. El pedido sale del token
    });
    await savePaymentToken(admin, attempt.payment_id, created.token, { create: { flowOrder: created.flowOrder } });
    return { kind: "flow", url: `${created.url}?token=${encodeURIComponent(created.token)}` };
  } catch (error) {
    console.error(`[payments] ${provider} create`, error);
    await admin.rpc("settle_payment", {
      p_payment_id: attempt.payment_id,
      p_status: "failed",
      p_raw: { shop_reason: "gateway_error", error: error instanceof Error ? error.message : String(error) },
    });
    throw new AttemptError("gateway", error instanceof Error ? error.message : "Error de la pasarela");
  }
}

async function savePaymentToken(admin: Admin, paymentId: string, token: string, raw: Record<string, unknown>) {
  const { error } = await admin
    .from("payments")
    .update({ provider_payment_id: token, raw_response: raw as Json })
    .eq("id", paymentId);
  if (error) throw error;
}

// ----- Buscar intentos -----

export async function findPaymentByToken(provider: "webpay" | "flow", token: string): Promise<Payment | null> {
  const { data, error } = await createSupabaseAdmin()
    .from("payments")
    .select("*")
    .eq("provider", provider)
    .eq("provider_payment_id", token)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function findPaymentByReference(provider: "webpay" | "flow", reference: string): Promise<Payment | null> {
  const { data, error } = await createSupabaseAdmin()
    .from("payments")
    .select("*")
    .eq("provider", provider)
    .eq("reference", reference)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ----- Registrar el resultado -----

export type ReconcileResult =
  /** paid = el pedido quedó pagado; refunded = pago aprobado y devuelto (B13 o doble pago) */
  | { status: "paid" | "failed" | "pending" | "refunded"; orderId: string }
  /** Otro proceso está confirmando este intento (recarga, doble clic, confirmación repetida) */
  | { status: "busy"; orderId: string }
  /** La pasarela no respondió: el intento sigue pending */
  | { status: "error"; orderId: string };

async function settle(admin: Admin, payment: Payment, status: "paid" | "failed", raw: Json) {
  const { data, error } = await admin.rpc("settle_payment", { p_payment_id: payment.id, p_status: status, p_raw: raw });
  if (error) throw error;
  return data[0];
}

async function releaseClaim(admin: Admin, paymentId: string) {
  await admin.from("payments").update({ confirming_until: null }).eq("id", paymentId);
}

async function orderContact(admin: Admin, orderId: string) {
  const { data, error } = await admin
    .from("orders")
    .select("order_number, contact_email, total")
    .eq("id", orderId)
    .single();
  if (error) throw error;
  return data;
}

async function alert(admin: Admin, payment: Payment, kind: string, detail: Record<string, unknown>) {
  // Un reintento desde la administración (7.4) no suma otra alerta igual mientras siga abierta
  const { data: open } = await admin
    .from("payment_alerts")
    .select("id")
    .eq("payment_id", payment.id)
    .eq("kind", kind)
    .is("resolved_at", null)
    .limit(1);
  if (open && open.length > 0) {
    console.error(`[payments] ALERTA ${kind} (ya abierta) · pedido ${payment.order_id} · intento ${payment.reference}`, detail);
    return;
  }
  const { error } = await admin
    .from("payment_alerts")
    .insert({ order_id: payment.order_id, payment_id: payment.id, kind, detail: detail as Json });
  if (error) console.error("[payments] alerta", kind, error);
  console.error(`[payments] ALERTA ${kind} · pedido ${payment.order_id} · intento ${payment.reference}`, detail);
}

/**
 * Devuelve el pago en la pasarela, deja el intento refunded y lo registra en el historial (evento
 * `refund`, M9). Si falla, alerta refund_failed. `adminId`: quién lo pidió desde la administración
 */
async function refund(admin: Admin, payment: Payment, amount: number, adminId: string | null = null): Promise<boolean> {
  try {
    let response: unknown;
    if (payment.provider === "webpay") {
      try {
        response = await webpay.refundTransaction(payment.provider_payment_id!, amount);
      } catch (error) {
        // Transbank puede procesar el reembolso aunque no responda a tiempo (pedido 1029, 7.4), y un
        // reintento chocaría con la transacción ya anulada: antes de dar el reembolso por fallido, status
        const status = await webpay.getTransactionStatus(payment.provider_payment_id!).catch(() => null);
        if (!status || !isFullyRefunded(status)) throw error;
        response = { reconciled: status.status, balance: status.balance ?? 0, error: error instanceof Error ? error.message : String(error) };
      }
    } else {
      const contact = await orderContact(admin, payment.order_id);
      response = await flow.createRefund({
        refundCommerceOrder: `${payment.reference}-R`,
        receiverEmail: contact.contact_email ?? "",
        amount,
        urlCallBack: `${siteUrl()}/api/pagos/flow/reembolso`,
        commerceTrxId: payment.reference!,
      });
    }
    const { error } = await admin
      .from("payments")
      .update({ status: "refunded", raw_response: rawWith(payment, { refund: response }) })
      .eq("id", payment.id);
    if (error) throw error;
    const { error: eventError } = await admin.from("order_events").insert({
      order_id: payment.order_id,
      kind: "refund",
      actor: adminId ? "admin" : "system",
      actor_id: adminId,
      data: { provider: payment.provider, amount, reference: payment.reference },
    });
    if (eventError) console.error("[payments] No se registró el reembolso en order_events", eventError.message);
    return true;
  } catch (error) {
    await alert(admin, payment, "refund_failed", { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

/**
 * Administración (7.4): devuelve en la pasarela el pago `paid` de un pedido que la tienda anuló, o
 * el que quedó sin devolver (reembolso fallido, pedido 1042). El monto es el del intento, nunca
 * uno que venga del formulario. true = devuelto; false = falló (queda la alerta refund_failed).
 */
export async function refundOrderPayment(orderId: string, adminId: string): Promise<boolean> {
  const admin = createSupabaseAdmin();
  const { data: payment, error } = await admin
    .from("payments")
    .select("*")
    .eq("order_id", orderId)
    .eq("status", "paid")
    .in("provider", ["webpay", "flow"])
    .order("attempt", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!payment?.provider_payment_id) return false;
  return refund(admin, payment, Math.round(Number(payment.amount)), adminId);
}

/**
 * Aplica el resultado de la pasarela al intento. Con un pago aprobado revisa el pedido después
 * del trigger: anulado (venció mientras pagaba, B13) o ya pagado con otro intento (dos pestañas)
 * → reembolso automático + alerta (decisión del dueño, 2026-10-25).
 */
async function applyOutcome(
  admin: Admin,
  payment: Payment,
  outcome: AttemptOutcome,
  response: unknown,
  amount: number,
): Promise<ReconcileResult> {
  const orderId = payment.order_id;

  if (outcome.status === "pending") {
    await releaseClaim(admin, payment.id);
    return { status: "pending", orderId };
  }

  if (outcome.status === "failed") {
    await settle(admin, payment, "failed", rawWith(payment, { result: response, shop_reason: outcome.reason }));
    return { status: "failed", orderId };
  }

  if (outcome.status === "mismatch") {
    // Se cobró algo que no corresponde al intento: no se marca pagado (trampa 36)
    await alert(admin, payment, "amount_mismatch", { expected: { amount: Number(payment.amount), reference: payment.reference }, response });
    await settle(admin, payment, "failed", rawWith(payment, { result: response, shop_reason: "mismatch" }));
    await refund(admin, { ...payment, status: "failed" }, amount);
    return { status: "refunded", orderId };
  }

  const settled = await settle(admin, payment, "paid", rawWith(payment, { result: response }));
  if (!settled.changed) return { status: settled.payment_state === "paid" ? "paid" : "failed", orderId };

  const late = settled.order_state === "cancelled";
  const double = !late && settled.other_paid;
  if (late || double) {
    await alert(admin, payment, late ? "paid_after_cancel" : "double_payment", { order_state: settled.order_state, response });
    const refunded = await refund(admin, { ...payment, status: "paid" }, amount);
    if (refunded && late) after(() => sendOrderEmail(orderId, "late_refund"));
    return { status: refunded ? "refunded" : "paid", orderId };
  }

  after(() => sendOrderEmail(orderId, "confirmed"));
  return { status: "paid", orderId };
}

/** Toma el lock de Redis (fail-open) y el de la BD. false = otro proceso está confirmando */
async function claim(admin: Admin, payment: Payment): Promise<boolean> {
  const token = payment.provider_payment_id!;
  if ((await lock.acquire(payment.provider, token)) === "busy") return false;
  const { data, error } = await admin.rpc("claim_payment", { p_payment_id: payment.id, p_seconds: 60 });
  if (error) throw error;
  if (!data) await lock.release(payment.provider, token);
  return Boolean(data);
}

function expected(payment: Payment) {
  return { amount: Math.round(Number(payment.amount)), reference: payment.reference ?? "", orderId: payment.order_id };
}

/**
 * Webpay: commit (una sola vez por token) y, si falla, status. Lo usan el retorno (token_ws) y el
 * cron (`final`: el pedido venció, un intento sin terminar se da por fallido).
 */
export async function reconcileWebpay(payment: Payment, options: { final?: boolean } = {}): Promise<ReconcileResult> {
  const orderId = payment.order_id;
  if (payment.status !== "pending" || !payment.provider_payment_id) {
    return { status: payment.status === "paid" ? "paid" : payment.status === "refunded" ? "refunded" : "failed", orderId };
  }
  const admin = createSupabaseAdmin();
  if (!(await claim(admin, payment))) return { status: "busy", orderId };

  const token = payment.provider_payment_id;
  try {
    let result: WebpayResult;
    try {
      result = await webpay.commitTransaction(token);
    } catch (error) {
      // 422: ya confirmado, sin pagar todavía o reversado. Red: no sabemos. En ambos casos, status
      if (!(error instanceof GatewayError)) throw error;
      console.warn("[payments] webpay commit falló, se consulta status:", error.message);
      try {
        result = await webpay.getTransactionStatus(token);
      } catch (statusError) {
        console.error("[payments] webpay status", statusError);
        await releaseClaim(admin, payment.id);
        return { status: "error", orderId };
      }
    }
    return await applyOutcome(admin, payment, webpayOutcome(result, expected(payment), options.final), result, Math.round(Number(result.amount)));
  } finally {
    await lock.release("webpay", token);
  }
}

/** Webpay sin commit: el usuario anuló (TBK_TOKEN) o se acabó el tiempo del formulario */
export async function failWebpayAttempt(payment: Payment, reason: Extract<FailureReason, "aborted" | "timeout">, params: Record<string, string>) {
  if (payment.status !== "pending") return;
  await settle(createSupabaseAdmin(), payment, "failed", rawWith(payment, { result: params, shop_reason: reason }));
}

/** Flow: getStatus. Lo usan la confirmación, el retorno, la consulta de la página y el cron */
export async function reconcileFlow(payment: Payment, options: { final?: boolean } = {}): Promise<ReconcileResult> {
  const orderId = payment.order_id;
  // failed también: Flow puede cobrar un intento reemplazado por otro (settle_payment lo permite)
  if (!payment.provider_payment_id || (payment.status !== "pending" && payment.status !== "failed")) {
    return { status: payment.status === "paid" ? "paid" : "refunded", orderId };
  }
  const admin = createSupabaseAdmin();
  const token = payment.provider_payment_id;

  if (payment.status === "failed") {
    // Solo interesa si Flow lo cobró igual
    let status: FlowStatus;
    try {
      status = await flow.getStatus(token);
    } catch (error) {
      console.error("[payments] flow getStatus", error);
      return { status: "error", orderId };
    }
    const outcome = flowOutcome(status, expected(payment));
    if (outcome.status !== "paid" && outcome.status !== "mismatch") return { status: "failed", orderId };
    return applyOutcome(admin, payment, outcome, status, Math.round(Number(status.amount)));
  }

  if (!(await claim(admin, payment))) return { status: "busy", orderId };
  try {
    let status: FlowStatus;
    try {
      status = await flow.getStatus(token);
    } catch (error) {
      console.error("[payments] flow getStatus", error);
      await releaseClaim(admin, payment.id);
      return { status: "error", orderId };
    }
    return await applyOutcome(admin, payment, flowOutcome(status, expected(payment), options.final), status, Math.round(Number(status.amount)));
  } finally {
    await lock.release("flow", token);
  }
}
