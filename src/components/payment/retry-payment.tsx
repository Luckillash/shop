"use client";

import { startTransition, useActionState, useState, type FormEvent, type ReactNode } from "react";
import { OptionGroup } from "@/components/checkout/parts";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { retryPayment, type RetryState } from "@/lib/payments/actions";
import { PAYMENT_OPTIONS, redirectingLine, retryLabel, type PaymentProvider } from "@/lib/payments/labels";
import { usePaymentUi } from "@/store/payment-ui-store";
import styles from "./payment.module.css";
import { WebpayRedirect } from "./webpay-redirect";

const IDLE: RetryState = { status: "idle" };

/** retryPayment con useActionState. *Volver al carro* queda sin enlace hasta salir a la pasarela */
function useRetry(orderId: string) {
  const setPaying = usePaymentUi((s) => s.setPaying);
  const [state, action, pending] = useActionState(async (prev: RetryState, formData: FormData) => {
    setPaying(true);
    let next: RetryState = prev;
    try {
      next = await retryPayment(prev, formData);
      return next;
    } finally {
      if (next.status !== "webpay") setPaying(false);
    }
  }, IDLE);

  function pay(method: PaymentProvider) {
    const formData = new FormData();
    formData.set("orderId", orderId);
    formData.set("paymentMethod", method);
    startTransition(() => action(formData));
  }

  return { state, busy: pending || state.status === "webpay", pay };
}

type RetryPaymentProps = {
  orderId: string;
  total: number;
  /** Medio del intento anterior: queda preseleccionado */
  previous: PaymentProvider | null;
};

// *Elige cómo pagar* de Pago rechazado: reintenta con el mismo medio o cambia a otro sobre el
// mismo pedido (buy_order nuevo, D-013). Webpay vuelve con { url, token } para el formulario POST.
export function RetryPayment({ orderId, total, previous }: RetryPaymentProps) {
  const [method, setMethod] = useState<PaymentProvider>(previous ?? "webpay");
  const { state, busy, pay } = useRetry(orderId);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    pay(method);
  }

  return (
    <section className={styles.card} aria-labelledby="elige-como-pagar">
      <h2 id="elige-como-pagar" className={styles.cardTitle}>
        Elige cómo pagar
      </h2>
      <form className={styles.form} onSubmit={submit} noValidate aria-busy={busy || undefined}>
        {state.status === "error" && <Notice tone="danger">{state.message}</Notice>}
        <OptionGroup
          name="paymentMethod"
          legend="Medio de pago"
          options={PAYMENT_OPTIONS}
          value={method}
          onChange={(v) => setMethod(v as PaymentProvider)}
          disabled={busy}
        />
        <div className={styles.actions}>
          <Button type="submit" size="lg" iconStart="lock" loading={busy}>
            {busy ? "Pagando" : retryLabel(method, previous, total)}
          </Button>
          {busy ? (
            <span className={styles.disabledLink} aria-disabled="true">
              Volver al carro
            </span>
          ) : (
            <Button href="/carro" variant="ghost">
              Volver al carro
            </Button>
          )}
        </div>
        {busy && method !== "transfer" && (
          <p className={styles.statusLine} role="status">
            {redirectingLine(method, total)}
          </p>
        )}
        {state.status === "webpay" && <WebpayRedirect url={state.url} token={state.token} />}
      </form>
    </section>
  );
}

/** *Pagar con tarjeta en su lugar* (Transferencia pendiente): reintento directo con Webpay */
/** `secondary`: otra acción en la misma fila (*Ver estado del pedido*, B38) */
export function PayWithCardInstead({ orderId, total, secondary }: { orderId: string; total: number; secondary?: ReactNode }) {
  const { state, busy, pay } = useRetry(orderId);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    pay("webpay");
  }

  return (
    <form onSubmit={submit} className={styles.inlineForm}>
      {state.status === "error" && <Notice tone="danger">{state.message}</Notice>}
      <div className={styles.actions}>
        <Button type="submit" variant="secondary" size="lg" loading={busy}>
          {busy ? "Pagando" : "Pagar con tarjeta en su lugar"}
        </Button>
        {secondary}
      </div>
      {busy && (
        <p className={styles.statusLine} role="status">
          {redirectingLine("webpay", total)}
        </p>
      )}
      {state.status === "webpay" && <WebpayRedirect url={state.url} token={state.token} />}
    </form>
  );
}
