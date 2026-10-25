import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { NumberedSteps, OrderAside, ResultLayout } from "@/components/payment/order-parts";
import { PaymentSettled } from "@/components/payment/payment-settled";
import { RetryPayment } from "@/components/payment/retry-payment";
import styles from "@/components/payment/payment.module.css";
import { cx } from "@/components/ui/cx";
import { Icon } from "@/components/ui/icon";
import { Notice } from "@/components/ui/notice";
import { isShippingMethod, shippingMethodLabel } from "@/lib/checkout/shipping";
import { isPaymentProvider, rejectionCause, rejectionCopy } from "@/lib/payments/labels";
import { addressLine, asAddress, getOrderView } from "@/lib/payments/order-view";
import { latestAttempt, orderScreen, screenPath } from "@/lib/payments/screen";
import { STORE } from "@/lib/store";

export const metadata: Metadata = { title: "Pago no completado", robots: { index: false } };

// Templates PagoRechazado (Webpay) y PagoRechazadoFlow (caso="flow"). El pedido sigue pending y
// con el stock reservado: *Elige cómo pagar* crea un intento nuevo sobre el mismo pedido.
export default function RejectedPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className={styles.main}>
      <Suspense fallback={<div className={styles.skeleton} aria-busy="true" aria-label="Cargando tu pedido" />}>
        <Rejected params={params} />
      </Suspense>
    </main>
  );
}

async function Rejected({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrderView(id);
  if (!order) notFound();

  const screen = orderScreen(order, new Date());
  if (screen !== "rejected") redirect(screenPath(order.id, screen));

  const latest = latestAttempt(order.payments);
  const previous = latest && isPaymentProvider(latest.provider) ? latest.provider : null;
  // Una transferencia reemplazada por otro medio que falló cae en el texto de Webpay
  const gateway = previous === "flow" ? "flow" : "webpay";
  const copy = rejectionCopy(gateway, latest ? rejectionCause(latest.raw_response) : "gateway_error");
  const address = asAddress(order.shipping_address);
  const method = isShippingMethod(order.shipping_method) ? order.shipping_method : "standard";
  const total = Math.round(Number(order.total));
  const free = Number(order.shipping_total) === 0 && method !== "pickup";

  return (
    <ResultLayout
      aside={
        <OrderAside
          order={order}
          title="Resumen del pedido"
          totalLabel="Total por pagar"
          footnote={[
            shippingMethodLabel(method),
            method === "pickup" ? STORE.pickup.address : [address.recipient_name, addressLine(address, false)].filter(Boolean).join(" · "),
          ].join(" · ")}
        />
      }
    >
      <PaymentSettled orderId={order.id} />
      <div className={styles.hero} role="alert">
        <span className={cx(styles.mark, styles.markDanger)}>
          <Icon name="alert" size={32} />
        </span>
        <p className={styles.orderNumber}>
          Pedido N.º {order.order_number} · {copy.via}
        </p>
        <h1 className={styles.title}>{copy.title}</h1>
        <p className={styles.lead}>{copy.cause}</p>
      </div>

      <Notice title="Tu pedido sigue guardado">
        {method === "pickup"
          ? "Mantuvimos tus productos y el retiro en tienda. Solo falta pagar."
          : free
            ? "Mantuvimos tus productos, la dirección de despacho y el despacho gratis. Solo falta pagar."
            : "Mantuvimos tus productos y la dirección de despacho. Solo falta pagar."}
      </Notice>

      <NumberedSteps id="que-puedes-hacer" title="Qué puedes hacer" steps={copy.steps} />

      <RetryPayment orderId={order.id} total={total} previous={previous} />

      <p className={styles.small}>
        ¿Ves un cargo en tu cuenta? Escríbenos a <a href={`mailto:${STORE.contactEmail}`}>{STORE.contactEmail}</a> con
        el número de pedido y lo revisamos.
      </p>
    </ResultLayout>
  );
}
