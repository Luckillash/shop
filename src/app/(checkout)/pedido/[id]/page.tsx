import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { NumberedSteps, OrderAside, ResultLayout } from "@/components/payment/order-parts";
import { PaymentPending } from "@/components/payment/payment-pending";
import { PaymentSettled } from "@/components/payment/payment-settled";
import { RetryPayment } from "@/components/payment/retry-payment";
import styles from "@/components/payment/payment.module.css";
import { Button } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import { Icon } from "@/components/ui/icon";
import { Notice } from "@/components/ui/notice";
import { isShippingMethod, shippingMethodLabel } from "@/lib/checkout/shipping";
import { formatCLP } from "@/lib/format/clp";
import { estimatedDelivery } from "@/lib/orders/order-status";
import { isPaymentProvider, paidWithLabel } from "@/lib/payments/labels";
import { addressLine, asAddress, getOrderView, type OrderView } from "@/lib/payments/order-view";
import { latestAttempt, orderScreen, screenPath } from "@/lib/payments/screen";
import { STORE } from "@/lib/store";

export const metadata: Metadata = { title: "Tu pedido", robots: { index: false } };

// Resultado del pago (04-diseno/estados-y-mensajes.md): Confirmación, *Estamos confirmando tu
// pago*, pedido vencido y pago devuelto (B13). Pago rechazado y Transferencia pendiente tienen su
// propia URL. El RLS de orders solo deja ver los pedidos propios (también del invitado).
export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className={styles.main}>
      <Suspense fallback={<div className={styles.skeleton} aria-busy="true" aria-label="Cargando tu pedido" />}>
        <Order params={params} />
      </Suspense>
    </main>
  );
}

async function Order({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrderView(id);
  if (!order) notFound();

  const screen = orderScreen(order, new Date());
  if (screen === "rejected" || screen === "transfer") redirect(screenPath(order.id, screen));
  if (screen === "confirmed") return <Confirmation order={order} />;
  if (screen === "confirming") return <Confirming order={order} />;
  return <Closed order={order} refunded={screen === "refunded"} />;
}

function OrderNumber({ order, suffix }: { order: OrderView; suffix?: string }) {
  return (
    <p className={styles.orderNumber}>
      Pedido N.º {order.order_number}
      {suffix ? ` · ${suffix}` : ""}
    </p>
  );
}

function Confirmation({ order }: { order: OrderView }) {
  const address = asAddress(order.shipping_address);
  const method = isShippingMethod(order.shipping_method) ? order.shipping_method : "standard";
  const pickup = method === "pickup";
  const estimate = estimatedDelivery(order);
  const paid = order.payments.find((p) => p.status === "paid");
  const shipping = Number(order.shipping_total);
  const document = order.document_type === "factura" ? "Factura electrónica" : "Boleta electrónica";
  const day = estimate?.label.replace(/^(Llega|Disponible desde) el /, "") ?? "";

  return (
    <ResultLayout
      aside={
        <OrderAside
          order={order}
          title="Detalle del pedido"
          totalLabel="Total pagado"
          footnote={`Pagado con ${paid ? paidWithLabel(paid.provider, paid.raw_response) : "el medio elegido"} · ${document}`}
        />
      }
    >
      <PaymentSettled orderId={order.id} clearCart />
      <div className={styles.hero}>
        <span className={cx(styles.mark, styles.markSuccess)}>
          <Icon name="check" size={32} strokeWidth={2.25} />
        </span>
        <OrderNumber order={order} />
        <h1 className={styles.title}>Gracias, tu pedido está confirmado</h1>
        <p className={styles.lead}>
          Te enviamos el detalle a <strong>{order.contact_email}</strong>.
        </p>
      </div>

      <section className={styles.delivery} aria-labelledby="entrega">
        <Icon name="truck" size={24} />
        <div className={styles.deliveryBody}>
          <h2 id="entrega" className={styles.cardTitle}>
            {estimate?.label ?? shippingMethodLabel(method)}
          </h2>
          <p>{pickup ? STORE.pickup.address : addressLine(address)}</p>
          <p className={styles.small}>
            {shippingMethodLabel(method)} · {shipping === 0 ? "Gratis" : formatCLP(Math.round(shipping))}
          </p>
        </div>
      </section>

      <NumberedSteps
        id="que-viene"
        title="Qué viene ahora"
        steps={[
          { title: "Preparamos tu pedido", detail: "Revisamos y empacamos cada pieza con cuidado." },
          pickup
            ? { title: "Te avisamos cuando esté listo", detail: "Recibirás un correo cuando puedas retirarlo." }
            : { title: "Te avisamos cuando salga a despacho", detail: "Recibirás un correo con el enlace de seguimiento." },
          pickup
            ? { title: "Retíralo en la tienda", detail: `Desde el ${day}. ${STORE.pickup.hours}. ${STORE.pickup.instructions}` }
            : { title: "Llega a tu casa", detail: `El ${day}, entre las 9:00 y las 20:00.` },
        ]}
      />

      <div className={styles.actions}>
        <Button href="/" size="lg">
          Seguir comprando
        </Button>
      </div>
    </ResultLayout>
  );
}

function Confirming({ order }: { order: OrderView }) {
  const latest = latestAttempt(order.payments);
  const previous = latest && isPaymentProvider(latest.provider) ? latest.provider : null;
  return (
    <ResultLayout aside={<OrderAside order={order} title="Resumen del pedido" totalLabel="Total por pagar" />}>
      <PaymentSettled orderId={order.id} />
      <div className={styles.hero} role="status">
        <span className={cx(styles.mark, styles.markInfo)}>
          <Icon name="lock" size={32} />
        </span>
        <OrderNumber order={order} />
        <h1 className={styles.title}>Estamos confirmando tu pago</h1>
        <p className={styles.lead}>Esto puede tardar unos segundos. No hace falta que pagues de nuevo.</p>
      </div>
      <PaymentPending orderId={order.id} />
      <Notice title="¿No terminaste de pagar?">
        Si saliste de la pasarela sin pagar, elige cómo pagar abajo. No hicimos ningún cargo por el intento anterior.
      </Notice>
      <RetryPayment orderId={order.id} total={Math.round(Number(order.total))} previous={previous} />
    </ResultLayout>
  );
}

function Closed({ order, refunded }: { order: OrderView; refunded: boolean }) {
  return (
    <ResultLayout aside={<OrderAside order={order} title="Resumen del pedido" totalLabel="Total" />}>
      <PaymentSettled orderId={order.id} />
      <div className={styles.hero} role="alert">
        <span className={cx(styles.mark, refunded ? styles.markInfo : styles.markDanger)}>
          <Icon name={refunded ? "returns" : "alert"} size={32} />
        </span>
        <OrderNumber order={order} />
        <h1 className={styles.title}>{refunded ? "Te devolvimos el pago" : "Este pedido venció"}</h1>
        <p className={styles.lead}>
          {refunded
            ? "Recibimos tu pago después de que venció el plazo del pedido, y ya habíamos liberado los productos. Te devolvimos el monto completo: según tu banco, puede tardar unos días hábiles en verse en tu cuenta."
            : "Pasó el plazo para pagarlo y liberamos los productos. No hicimos ningún cargo."}
        </p>
      </div>
      <p className={styles.lead}>Si todavía los quieres, revisa tu carro: te mostramos el stock y el precio actuales.</p>
      <div className={styles.actions}>
        <Button href="/carro" size="lg">
          Volver al carro
        </Button>
        <Button href="/" variant="ghost" size="lg">
          Seguir comprando
        </Button>
      </div>
      <p className={styles.small}>
        ¿Tienes dudas? Escríbenos a <a href={`mailto:${STORE.contactEmail}`}>{STORE.contactEmail}</a> con el número
        de pedido.
      </p>
    </ResultLayout>
  );
}
