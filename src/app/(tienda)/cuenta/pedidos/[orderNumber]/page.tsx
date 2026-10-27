import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { TrackingSteps } from "@/components/account/tracking-steps";
import styles from "@/components/account/account.module.css";
import { Breadcrumbs } from "@/components/catalog/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import { getSessionUser } from "@/lib/auth/session";
import { isShippingMethod, shippingMethodLabel } from "@/lib/checkout/shipping";
import { formatCLP } from "@/lib/format/clp";
import { formatFullDate } from "@/lib/format/dates";
import { getMyOrder, itemImage, type AccountOrder } from "@/lib/orders/account";
import { carrierTrackingUrl, orderStatusLine, trackingTimeline } from "@/lib/orders/customer-view";
import { customerStatusBadge } from "@/lib/orders/order-status";
import { isPaymentProvider, PAYMENT_OPTIONS, paidWithLabel } from "@/lib/payments/labels";
import { addressLine, asAddress } from "@/lib/payments/order-view";
import { STORE } from "@/lib/store";

export const metadata: Metadata = { title: "Detalle del pedido", robots: { index: false } };

// Template DetallePedido / DetallePedidoMovil. El shell sale con 200 antes de leer el pedido: el
// código HTTP real (redirect sin sesión, 404 con un pedido ajeno) lo da el proxy en la carga directa
// (src/lib/supabase/proxy.ts, D-026). Aquí se vuelve a verificar todo: el RLS y user_id.

const amount = (value: number | string) => formatCLP(Math.round(Number(value)));
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export default function OrderDetailPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  return (
    <Suspense fallback={<div className={styles.skeleton} aria-busy="true" aria-label="Cargando tu pedido" />}>
      <OrderDetail params={params} />
    </Suspense>
  );
}

async function OrderDetail({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  if (!/^\d{1,12}$/.test(orderNumber)) notFound();
  const user = await getSessionUser();
  if (!user || user.isAnonymous) redirect(`/ingresar?volver=/cuenta/pedidos/${orderNumber}`);

  const order = await getMyOrder(user.id, orderNumber);
  if (!order) notFound();

  const now = new Date();
  const badge = customerStatusBadge(order.status);
  const title = `Pedido N.º ${order.order_number}`;

  return (
    <div className={styles.detail}>
      <div className={styles.heading}>
        <div className={styles.desktopOnly}>
          <Breadcrumbs
            items={[{ label: "Mi cuenta", href: "/cuenta/pedidos" }, { label: "Mis pedidos", href: "/cuenta/pedidos" }, { label: title }]}
          />
        </div>
        <Link href="/cuenta/pedidos" className={cx(styles.backLink, styles.mobileOnly)}>
          Mis pedidos
        </Link>
        <div className={styles.titleRow}>
          <h1 className={styles.detailTitle}>{title}</h1>
          <Badge tone={badge.tone} icon={badge.icon}>
            {badge.label}
          </Badge>
        </div>
        <p className={styles.lead}>Comprado el {formatFullDate(new Date(order.placed_at))}</p>
      </div>

      <Status order={order} now={now} />

      <div className={styles.detailColumns}>
        <Products order={order} />
        <OrderData order={order} />
      </div>
    </div>
  );
}

/** Seguimiento (pagado en adelante) o qué pasó con el pedido (pendiente, anulado, reembolsado) */
function Status({ order, now }: { order: AccountOrder; now: Date }) {
  const steps = trackingTimeline(order, now);
  const line = orderStatusLine(order, now);
  const method = isShippingMethod(order.shipping_method) ? order.shipping_method : "standard";

  if (!steps) {
    const payable = order.status === "pending" && !(order.expires_at && new Date(order.expires_at) <= now);
    return (
      <section aria-labelledby="estado" className={styles.panel}>
        <div className={styles.panelTop}>
          <h2 id="estado" className={styles.panelTitle}>
            {line}
          </h2>
          {/* /pedido/[id] lleva a la pantalla que corresponde: transferencia, pago rechazado o confirmando */}
          {payable && (
            <Button href={`/pedido/${order.id}`} iconEnd="chevronRight">
              {order.payment_method === "transfer" ? "Ver datos para transferir" : `Pagar ${amount(order.total)}`}
            </Button>
          )}
        </div>
      </section>
    );
  }

  const trackingUrl = carrierTrackingUrl(order.carrier, order.tracking_number);
  const shipment =
    order.carrier && order.tracking_number ? (
      <>
        Despacha {order.carrier} · Código de seguimiento <span className={styles.code}>{order.tracking_number}</span>
      </>
    ) : method === "pickup" ? (
      `${shippingMethodLabel(method)} · ${STORE.pickup.address}`
    ) : (
      shippingMethodLabel(method)
    );

  return (
    <section aria-labelledby="seguimiento" className={styles.panel}>
      <div className={styles.panelTop}>
        <div className={styles.panelText}>
          <h2 id="seguimiento" className={styles.panelTitle}>
            {line}
          </h2>
          <p className={styles.mutedSmall}>{shipment}</p>
        </div>
        {/* El despacho propio no tiene página de seguimiento: el botón no se muestra */}
        {trackingUrl && (
          <Button href={trackingUrl} variant="secondary" iconEnd="chevronRight" className={styles.trackButton}>
            Seguir el envío
          </Button>
        )}
      </div>
      <TrackingSteps steps={steps} />
    </section>
  );
}

function units(n: number) {
  return n === 1 ? "1 unidad" : `${n} unidades`;
}

function Products({ order }: { order: AccountOrder }) {
  return (
    <section aria-labelledby="productos" className={styles.products}>
      <h2 id="productos" className={styles.panelTitle}>
        Productos
      </h2>
      <ul className={styles.items}>
        {order.items.map((item) => {
          const image = itemImage(item);
          const href = item.product ? `/productos/${item.product.slug}` : null;
          const variant = item.variant_name && item.variant_name !== "Única" ? `${item.variant_name} · ` : "";
          return (
            <li key={item.id} className={styles.item}>
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element -- placehold.co responde SVG (D-015)
                <img src={image.url} alt={image.alt} className={styles.itemImage} loading="lazy" />
              ) : (
                <span className={styles.itemImage} />
              )}
              <div className={styles.itemBody}>
                {href ? (
                  <Link href={href} className={styles.itemName}>
                    {item.product_name}
                  </Link>
                ) : (
                  <span className={styles.itemName}>{item.product_name}</span>
                )}
                <span className={styles.muted}>
                  {variant}
                  {units(item.quantity)}
                </span>
                <span className={cx(styles.itemTotal, styles.mobileOnly)}>{amount(Number(item.unit_price) * item.quantity)}</span>
                {/* Lleva a la Ficha: ahí se elige la variante y se ven el precio y el stock de hoy */}
                {href && (
                  <div className={cx(styles.itemAction, styles.desktopOnly)}>
                    <Button href={href} variant="ghost" size="sm" iconStart="cart">
                      Volver a comprar<span className="sr-only"> {item.product_name}</span>
                    </Button>
                  </div>
                )}
              </div>
              <span className={cx(styles.itemTotal, styles.desktopOnly)}>{amount(Number(item.unit_price) * item.quantity)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function paymentText(order: AccountOrder): string {
  const document = order.document_type === "factura" ? "Factura electrónica" : "Boleta electrónica";
  const paid = order.payments.find((p) => p.status === "paid" || p.status === "refunded");
  if (paid && order.paid_at !== null) return `${capitalize(paidWithLabel(paid.provider, paid.raw_response))} · ${document}`;
  const option = PAYMENT_OPTIONS.find((o) => isPaymentProvider(order.payment_method) && o.value === order.payment_method);
  return `${option?.title ?? "Sin pagar"} · ${document}`;
}

function OrderData({ order }: { order: AccountOrder }) {
  const address = asAddress(order.shipping_address);
  const pickup = order.shipping_method === "pickup";
  const count = order.items.reduce((n, item) => n + item.quantity, 0);
  const shipping = Number(order.shipping_total);
  const paid = order.paid_at !== null;
  const subject = encodeURIComponent(`Pedido N.º ${order.order_number}`);

  return (
    <aside aria-label="Datos del pedido" className={styles.aside}>
      <div className={styles.dataCard}>
        <div className={styles.dataBlock}>
          <h3 className={styles.dataTitle}>{pickup ? "Retiro en tienda" : "Dirección de despacho"}</h3>
          {pickup ? (
            <p className={styles.dataText}>
              {STORE.pickup.name}
              <br />
              {STORE.pickup.address}
              <br />
              {STORE.pickup.hours}
            </p>
          ) : (
            <p className={styles.dataText}>
              {address.recipient_name}
              {address.recipient_name && <br />}
              {addressLine(address, false)}
              <br />
              {address.region}
            </p>
          )}
        </div>
        <div className={styles.dataBlock}>
          <h3 className={styles.dataTitle}>Pago</h3>
          <p className={styles.dataText}>{paymentText(order)}</p>
        </div>
        <dl className={styles.totals}>
          <div className={styles.totalRow}>
            <dt>Subtotal ({count === 1 ? "1 producto" : `${count} productos`})</dt>
            <dd>{amount(order.subtotal)}</dd>
          </div>
          {Number(order.discount_total) > 0 && (
            <div className={cx(styles.totalRow, styles.good)}>
              <dt>Descuentos</dt>
              <dd>{amount(-order.discount_total)}</dd>
            </div>
          )}
          <div className={cx(styles.totalRow, shipping === 0 && styles.good)}>
            <dt>{pickup ? "Retiro" : "Despacho"}</dt>
            <dd>{shipping === 0 ? "Gratis" : amount(shipping)}</dd>
          </div>
          <div className={cx(styles.totalRow, styles.grandTotal)}>
            <dt>{paid ? "Total pagado" : "Total"}</dt>
            <dd>{amount(order.total)}</dd>
          </div>
        </dl>
      </div>
      {/* *Descargar boleta* queda oculto hasta tener el proveedor de boleta electrónica (D-012) */}
      {/* Las páginas de Ayuda todavía no existen: el correo de la tienda con el número en el asunto */}
      <Button href={`mailto:${STORE.contactEmail}?subject=${subject}`} variant="ghost" block>
        Necesito ayuda con este pedido
      </Button>
    </aside>
  );
}
