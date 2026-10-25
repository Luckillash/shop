import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { NumberedSteps, OrderAside, ResultLayout } from "@/components/payment/order-parts";
import { PaymentSettled } from "@/components/payment/payment-settled";
import { PayWithCardInstead } from "@/components/payment/retry-payment";
import { TransferDetails } from "@/components/payment/transfer-details";
import styles from "@/components/payment/payment.module.css";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import { deliveryEstimate, isShippingMethod, shippingMethodLabel } from "@/lib/checkout/shipping";
import { formatCLP } from "@/lib/format/clp";
import { formatDeadline, formatDeliveryDay, formatTime } from "@/lib/format/dates";
import { bankDetails } from "@/lib/payments/config";
import { bankRows } from "@/lib/payments/labels";
import { addressLine, asAddress, getOrderView } from "@/lib/payments/order-view";
import { orderScreen, screenPath } from "@/lib/payments/screen";
import { STORE } from "@/lib/store";

export const metadata: Metadata = { title: "Transferencia pendiente", robots: { index: false } };

// Template TransferenciaPendiente. Reserva de 48 h (expires_at, D-010) en hora de Chile. Los datos
// bancarios salen de las variables BANK_* (los reales del dueño). Un admin confirma la
// transferencia (payments → paid) y el cron anula el pedido si vence.
export default function TransferPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className={styles.main}>
      <Suspense fallback={<div className={styles.skeleton} aria-busy="true" aria-label="Cargando tu pedido" />}>
        <Transfer params={params} />
      </Suspense>
    </main>
  );
}

async function Transfer({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrderView(id);
  if (!order) notFound();

  const now = new Date();
  const screen = orderScreen(order, now);
  if (screen !== "transfer") redirect(screenPath(order.id, screen));

  const total = Math.round(Number(order.total));
  const deadline = new Date(order.expires_at!);
  const address = asAddress(order.shipping_address);
  const method = isShippingMethod(order.shipping_method) ? order.shipping_method : "standard";
  const estimate = deliveryEstimate(method, address.region ?? null, now);
  const document = order.document_type === "factura" ? "Factura electrónica" : "Boleta electrónica";

  return (
    <ResultLayout
      aside={
        <OrderAside
          order={order}
          title="Detalle del pedido"
          totalLabel="Total a transferir"
          footnote={[
            shippingMethodLabel(method),
            method === "pickup" ? STORE.pickup.address : addressLine(address, false),
            document,
          ].join(" · ")}
        />
      }
    >
      <PaymentSettled orderId={order.id} clearCart />
      <div className={styles.hero}>
        <div className={styles.eyebrow}>
          <Badge tone="warning" icon="alert">
            Pago pendiente
          </Badge>
          <span className={styles.orderNumber}>Pedido N.º {order.order_number}</span>
        </div>
        <h1 className={styles.title}>Transfiere {formatCLP(total)} para confirmar tu pedido</h1>
        <p className={styles.lead}>
          Reservamos tus productos por 48 horas, hasta el <strong>{formatDeadline(deadline)}</strong>. También te
          enviamos estos datos a <strong>{order.contact_email}</strong>.
        </p>
      </div>

      <TransferDetails rows={bankRows(bankDetails(), total, order.order_number)} />

      <Notice
        tone="warning"
        title={`Transfiere el monto exacto antes del ${formatDeliveryDay(deadline)}, ${formatTime(deadline)}`}
      >
        Escribe «Pedido {order.order_number}» en el mensaje de la transferencia. Si no la recibimos a tiempo,
        liberamos los productos y anulamos el pedido sin costo para ti.
      </Notice>

      <NumberedSteps
        id="que-viene"
        title="Qué viene ahora"
        steps={[
          { title: "Transfiere desde tu banco", detail: "Desde cualquier banco, con los datos de arriba." },
          {
            title: "Confirmamos tu pago",
            detail: "Te avisamos por correo en menos de un día hábil y te enviamos la boleta.",
          },
          method === "pickup"
            ? { title: "Preparamos tu pedido", detail: "Te avisamos cuando puedas retirarlo en la tienda." }
            : {
                title: "Despachamos tu pedido",
                detail: estimate ? `Si transfieres hoy, ${estimate.label.toLowerCase()}.` : "Te avisamos cuando salga a despacho.",
              },
        ]}
      />

      <PayWithCardInstead orderId={order.id} total={total} />
    </ResultLayout>
  );
}
