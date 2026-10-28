import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionFeedback } from "@/components/admin/action-feedback";
import styles from "@/components/admin/admin.module.css";
import { CancelOrderDialog } from "@/components/admin/cancel-order-dialog";
import { ConfirmTransferForm, ShipForm, StepButtonForm } from "@/components/admin/order-step-forms";
import { Breadcrumbs } from "@/components/catalog/breadcrumbs";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Notice } from "@/components/ui/notice";
import { orderHistory } from "@/lib/admin/history";
import { paymentLabel, pendingRefund } from "@/lib/admin/order-list";
import { getAdminOrder, getCustomerSummary, type AdminOrder } from "@/lib/admin/queries";
import { cancelPlan, refundPlan } from "@/lib/admin/validation";
import { requireAdmin } from "@/lib/auth/session";
import { isShippingMethod, shippingMethodLabel } from "@/lib/checkout/shipping";
import { formatCLP } from "@/lib/format/clp";
import { formatDeadline, formatShortDateTime } from "@/lib/format/dates";
import { formatChileanMobile } from "@/lib/format/phone";
import { formatRut } from "@/lib/format/rut";
import { itemImage } from "@/lib/orders/account";
import { addressLine, asAddress } from "@/lib/orders/address";
import { cancelReason, carrierTrackingUrl } from "@/lib/orders/customer-view";
import { adminNextStep, adminStatusBadge, estimatedDelivery, isCancellable } from "@/lib/orders/order-status";
import { STORE } from "@/lib/store";

export const metadata: Metadata = { title: "Pedido" };

// Template AdminPedido (tweak `estado`) y AdminPedidoMovil (la misma página en una columna). La
// tarjeta *Siguiente paso* tiene una sola acción primary según el estado (adminNextStep); un pedido
// anulado con un pago sin devolver ofrece reembolsarlo (el 1042, un reembolso fallido o una
// transferencia, decisión 5). El código HTTP real lo da el proxy (D-029).

const clp = (value: number | string) => formatCLP(Math.round(Number(value)));
const GATEWAY: Record<string, string> = { webpay: "Webpay Plus", flow: "Flow" };

export default function AdminOrderPage({ params }: PageProps<"/admin/pedidos/[orderNumber]">) {
  return (
    <main className={styles.main}>
      <Suspense fallback={<div className={styles.skeleton} aria-busy="true" aria-label="Cargando" />}>
        <OrderDetail params={params} />
      </Suspense>
    </main>
  );
}

async function OrderDetail({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  await requireAdmin(`/admin/pedidos/${orderNumber}`);
  const order = await getAdminOrder(orderNumber);
  if (!order) notFound();
  const customer = await getCustomerSummary(order);

  const badge = adminStatusBadge(order.status, order.payment_method);
  const method = isShippingMethod(order.shipping_method) ? order.shipping_method : "standard";
  const title = `Pedido N.º ${order.order_number}`;
  const name = asAddress(order.shipping_address).recipient_name ?? null;
  const plan = cancelPlan(order);
  const cancelProps = { orderId: order.id, orderNumber: order.order_number, customer: name, email: order.contact_email, plan };

  return (
    <>
      <div className={styles.detailHead}>
        <div className={styles.desktopOnly}>
          <Breadcrumbs items={[{ label: "Pedidos", href: "/admin" }, { label: title }]} />
        </div>
        <Link href="/admin" className={`${styles.backLink} ${styles.mobileOnly}`}>
          <span className={styles.backIcon}>
            <Icon name="chevronRight" size={16} />
          </span>
          Pedidos
        </Link>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{title}</h1>
          <Badge tone={badge.tone} icon={badge.icon}>
            {badge.label}
          </Badge>
        </div>
        <p className={styles.lead}>
          Creado el {formatDeadline(new Date(order.placed_at))} · {paymentLabel(order)} · {shippingMethodLabel(method)}
        </p>
      </div>

      <div className={styles.columns}>
        <div className={styles.primary}>
          <ActionFeedback />
          <section aria-labelledby="siguiente-paso" className={styles.step}>
            <p className={styles.eyebrow}>Siguiente paso</p>
            <NextStep order={order} cancel={cancelProps} />
          </section>
          <Products order={order} />
          <History order={order} />
          {isCancellable(order.status) && (
            <section aria-labelledby="anular" className={styles.cancelBox}>
              <div className={styles.cancelText}>
                <h2 id="anular" className={styles.cancelTitle}>
                  Anular el pedido
                </h2>
                <p className={styles.muted}>
                  Devuelve los productos al stock y libera el cupón. Si está pagado, reembolsa el total en la pasarela. No se puede
                  deshacer.
                </p>
              </div>
              <CancelOrderDialog {...cancelProps} triggerLabel="Anular pedido" triggerIcon="close" />
            </section>
          )}
        </div>
        <OrderData order={order} customer={customer} />
      </div>
    </>
  );
}

/** La fecha de *Llega el …* sin el verbo: *martes 27 de octubre* */
function deliveryDay(order: AdminOrder): string | null {
  return estimatedDelivery(order)?.label.replace(/^(Llega|Disponible desde) el /, "") ?? null;
}

function StepHeading({ children }: { children: ReactNode }) {
  return (
    <h2 id="siguiente-paso" className={styles.sectionTitle}>
      {children}
    </h2>
  );
}

function NextStep({ order, cancel }: { order: AdminOrder; cancel: Omit<Parameters<typeof CancelOrderDialog>[0], "triggerLabel"> }) {
  const pickup = order.shipping_method === "pickup";
  const total = clp(order.total);
  const day = deliveryDay(order);
  const email = order.contact_email;

  switch (adminNextStep(order.status, order.payment_method)) {
    case "confirm_transfer": {
      const deadline = order.expires_at ? new Date(order.expires_at) : null;
      const expired = deadline !== null && deadline <= new Date();
      return (
        <div className={styles.stepBody}>
          <div className={styles.stepText}>
            <StepHeading>Confirma la transferencia</StepHeading>
            <p className={styles.desktopOnly}>
              Revisa en la cartola que llegaron <strong>{total}</strong> con el mensaje <strong>«Pedido {order.order_number}»</strong>.{" "}
              {deadline &&
                (expired ? (
                  <>
                    La reserva venció el <strong>{formatDeadline(deadline)}</strong>: si la transferencia llegó antes, puedes confirmarla igual.
                  </>
                ) : (
                  <>
                    La reserva vence el <strong>{formatDeadline(deadline)}</strong>.
                  </>
                ))}
            </p>
          </div>
          <dl className={`${styles.facts} ${styles.mobileOnly}`}>
            <div className={styles.fact}>
              <dt>Monto exacto</dt>
              <dd>{total}</dd>
            </div>
            <div className={styles.fact}>
              <dt>Mensaje</dt>
              <dd>Pedido {order.order_number}</dd>
            </div>
            {deadline && (
              <div className={styles.fact}>
                <dt>{expired ? "Venció" : "Vence"}</dt>
                <dd>{formatDeadline(deadline)}</dd>
              </div>
            )}
          </dl>
          <ConfirmTransferForm
            orderId={order.id}
            secondary={<CancelOrderDialog {...cancel} triggerLabel="No llegó: anular pedido" triggerVariant="ghost" />}
          />
          <p className={styles.muted}>
            Al confirmar, el pedido pasa a <strong>Por preparar</strong>
            {email ? ` y le enviamos a ${email} el correo de pedido confirmado.` : "."}
          </p>
        </div>
      );
    }
    case "start_preparing":
      return (
        <div className={styles.stepBody}>
          <div className={styles.stepText}>
            <StepHeading>Prepara el pedido</StepHeading>
            <p>
              Pagado el {order.paid_at ? formatDeadline(new Date(order.paid_at)) : "—"} con {paymentLabel(order)}. Márcalo cuando empieces a
              empacarlo
              {day && (
                <>
                  ; {pickup ? "el cliente lo puede retirar desde el" : "la fecha de entrega que vio el cliente es el"} <strong>{day}</strong>
                </>
              )}
              .
            </p>
          </div>
          <StepButtonForm orderId={order.id} step="start" />
        </div>
      );
    case "mark_shipped":
      return (
        <div className={styles.stepBody}>
          <div className={styles.stepText}>
            <StepHeading>{pickup ? "Avisa que está listo para retirar" : "Marca el pedido como enviado"}</StepHeading>
            <p>
              {pickup ? (
                `Cuando esté empacado en el ${STORE.pickup.name}, márcalo y le avisamos al cliente por correo que puede retirarlo.`
              ) : (
                <>
                  Cuando el transportista lo retire, escribe el código de seguimiento.
                  {day && (
                    <>
                      {" "}
                      Debe llegar el <strong>{day}</strong>.
                    </>
                  )}
                </>
              )}
            </p>
          </div>
          <ShipForm orderId={order.id} pickup={pickup} />
          {email && !pickup && <p className={styles.muted}>Le enviaremos a {email} un correo con el transportista y el código.</p>}
        </div>
      );
    case "mark_delivered": {
      const trackingUrl = carrierTrackingUrl(order.carrier, order.tracking_number);
      const shipped = order.shipped_at ? formatDeadline(new Date(order.shipped_at)) : null;
      return (
        <div className={styles.stepBody}>
          <div className={styles.stepText}>
            <StepHeading>{pickup ? "Confirma el retiro" : "Confirma la entrega"}</StepHeading>
            <p>
              {pickup ? (
                `Listo para retirar desde el ${shipped ?? "—"}. Márcalo cuando el cliente lo retire.`
              ) : (
                <>
                  Enviado el {shipped ?? "—"}
                  {order.carrier && ` con ${order.carrier}`}
                  {order.tracking_number && (
                    <>
                      {" "}
                      · <span className={styles.mono}>{order.tracking_number}</span>
                    </>
                  )}
                  . Márcalo cuando el seguimiento diga que se entregó.
                </>
              )}
            </p>
          </div>
          <StepButtonForm
            orderId={order.id}
            step={pickup ? "pickedUp" : "deliver"}
            secondary={
              trackingUrl && (
                <Button href={trackingUrl} variant="ghost" iconEnd="chevronRight">
                  Ver en {order.carrier}
                </Button>
              )
            }
          />
        </div>
      );
    }
  }

  const refund = refundPlan(order);
  if (refund?.kind === "gateway") {
    return (
      <div className={styles.stepBody}>
        <div className={styles.stepText}>
          <StepHeading>Devuelve el pago</StepHeading>
          <p>
            El pedido está anulado, pero el pago de <strong>{clp(refund.amount)}</strong> en {refund.gateway} no se devolvió.
          </p>
        </div>
        <StepButtonForm orderId={order.id} step="refund" label={`Reembolsar ${clp(refund.amount)} en ${refund.gateway}`} />
      </div>
    );
  }
  if (refund?.kind === "transfer") {
    return (
      <div className={styles.stepBody}>
        <div className={styles.stepText}>
          <StepHeading>Devuélvele {clp(refund.amount)} por transferencia</StepHeading>
          <p>
            Pídele al cliente su banco, el tipo de cuenta, el número de cuenta y su RUT: si le avisaste por correo, te los envía a{" "}
            {STORE.contactEmail}. Cuando hagas la transferencia, márcalo aquí.
          </p>
        </div>
        <StepButtonForm orderId={order.id} step="transferRefunded" />
      </div>
    );
  }

  if (order.status === "pending") {
    const gateway = GATEWAY[order.payment_method ?? ""] ?? "la pasarela";
    return (
      <div className={styles.stepText}>
        <StepHeading>Esperando el pago</StepHeading>
        <p>
          El cliente está pagando con {gateway}.
          {order.expires_at && ` Si no paga antes del ${formatDeadline(new Date(order.expires_at))}, el pedido se anula solo y los productos vuelven al stock.`}
        </p>
      </div>
    );
  }

  if (order.status === "delivered") {
    return (
      <div className={styles.stepBody}>
        <StepHeading>Nada pendiente</StepHeading>
        <Notice tone="success" title={`${pickup ? "Retirado" : "Entregado"} el ${order.delivered_at ? formatDeadline(new Date(order.delivered_at)) : "—"}`} />
      </div>
    );
  }

  // Anulado o reembolsado, sin nada por devolver
  return (
    <div className={styles.stepBody}>
      <StepHeading>Nada pendiente</StepHeading>
      <Notice tone="danger" title={`Pedido anulado el ${order.cancelled_at ? formatDeadline(new Date(order.cancelled_at)) : "—"}`}>
        {cancelledSummary(order)}
      </Notice>
    </div>
  );
}

/** *Motivo: sin stock. Los productos volvieron al inventario y el reembolso de $X en Webpay Plus se completó. Le avisamos al cliente por correo.* */
function cancelledSummary(order: AdminOrder): string {
  const reason = cancelReason(order);
  const note = order.cancel_note?.trim();
  const why =
    reason === "vencio"
      ? "Venció el plazo para pagar."
      : reason === "cliente"
        ? "Lo anuló el cliente."
        : note
          ? `Motivo: «${note.replace(/\.$/, "")}».`
          : "Lo anuló la tienda, sin motivo para el cliente.";
  const refunded = order.payments.find((p) => p.status === "refunded");
  const money = refunded
    ? `Los productos volvieron al inventario y el reembolso de ${clp(refunded.amount)} ${refunded.provider === "transfer" ? "por transferencia" : `en ${GATEWAY[refunded.provider] ?? "la pasarela"}`} se completó.`
    : "Los productos volvieron al inventario. No hubo cobro.";
  const emailed = order.events.some((e) => e.kind === "email" && typeof e.data === "object" && e.data !== null && !Array.isArray(e.data) && e.data.template === "cancelled");
  return [why, money, emailed ? "Le avisamos al cliente por correo." : null].filter(Boolean).join(" ");
}

function Products({ order }: { order: AdminOrder }) {
  const count = order.items.reduce((n, item) => n + item.quantity, 0);
  return (
    <section aria-labelledby="productos" className={styles.section}>
      <h2 id="productos" className={styles.sectionTitle}>
        Productos<span className={styles.mobileOnly}> · {count}</span>
      </h2>
      <ul className={styles.items}>
        {order.items.map((item) => {
          const image = itemImage(item);
          const variant = item.variant_name && item.variant_name !== "Única" ? item.variant_name : null;
          return (
            <li key={item.id} className={styles.item}>
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element -- placehold.co responde SVG (D-015)
                <img src={image.url} alt={image.alt} className={styles.itemImage} loading="lazy" />
              ) : (
                <span className={styles.itemImage} />
              )}
              <div className={styles.itemBody}>
                <span className={styles.itemName}>{item.product_name}</span>
                <span className={styles.muted}>
                  {variant}
                  {variant && item.sku && " · "}
                  {item.sku && <span className={styles.sku}>SKU {item.sku}</span>}
                  <span className={styles.mobileOnly}>
                    {" "}
                    · {item.quantity} × {clp(item.unit_price)}
                  </span>
                </span>
              </div>
              <span className={styles.itemQty}>
                {item.quantity} × {clp(item.unit_price)}
              </span>
              <span className={styles.itemTotal}>{clp(item.line_total ?? Number(item.unit_price) * item.quantity)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function History({ order }: { order: AdminOrder }) {
  const entries = orderHistory(order, order.events);
  return (
    <section aria-labelledby="historial" className={styles.section}>
      <h2 id="historial" className={styles.sectionTitle}>
        Historial
      </h2>
      <ol className={styles.history}>
        {entries.map((entry, index) => (
          <li key={`${entry.at}-${index}`} className={styles.historyItem}>
            <span className={styles.historyWhen}>{formatShortDateTime(new Date(entry.at))}</span>
            <span>
              <strong className={styles.strong}>{entry.what}</strong>
              {entry.who && <span className={styles.cardText}> · {entry.who}</span>}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

const ATTEMPT_BADGE: Record<string, { label: string; tone: BadgeTone }> = {
  pending: { label: "Pendiente", tone: "warning" },
  paid: { label: "Pagado", tone: "success" },
  failed: { label: "No se completó", tone: "danger" },
  refunded: { label: "Reembolsado", tone: "neutral" },
  authorized: { label: "Autorizado", tone: "neutral" },
};

function OrderData({ order, customer }: { order: AdminOrder; customer: { hasAccount: boolean; previous: number } }) {
  const address = asAddress(order.shipping_address) as ReturnType<typeof asAddress> & { phone?: string };
  const pickup = order.shipping_method === "pickup";
  const method = isShippingMethod(order.shipping_method) ? order.shipping_method : "standard";
  const count = order.items.reduce((n, item) => n + item.quantity, 0);
  const shipping = Number(order.shipping_total);
  const estimate = estimatedDelivery(order);
  const owed = pendingRefund(order);
  const previous = customer.previous === 0 ? "Primer pedido" : customer.previous === 1 ? "1 pedido anterior" : `${customer.previous} pedidos anteriores`;

  return (
    <aside aria-label="Datos del pedido" className={styles.aside}>
      <div className={styles.card}>
        <div className={styles.cardBlock}>
          <h3 className={styles.cardTitle}>Cliente</h3>
          <p className={styles.cardText}>
            {[address.recipient_name, order.customer_rut ? `RUT ${formatRut(order.customer_rut)}` : null].filter(Boolean).join(" · ")}
            {order.contact_email && (
              <>
                <br />
                <a href={`mailto:${order.contact_email}`}>{order.contact_email}</a>
              </>
            )}
            {address.phone && (
              <>
                <br />
                {formatChileanMobile(address.phone)}
              </>
            )}
          </p>
          <p className={styles.muted}>
            {customer.hasAccount ? "Con cuenta" : "Compró como invitado"} · {previous}
          </p>
        </div>
        <div className={styles.cardBlock}>
          <h3 className={styles.cardTitle}>{pickup ? "Retiro en tienda" : "Despacho"}</h3>
          <p className={styles.cardText}>
            {pickup ? (
              <>
                {STORE.pickup.name}
                <br />
                {STORE.pickup.address}
              </>
            ) : (
              <>
                {addressLine({ ...address, city: undefined, region: undefined })}
                <br />
                {[address.city, address.region].filter(Boolean).join(", ")}
              </>
            )}
          </p>
          <p className={styles.muted}>{[shippingMethodLabel(method), estimate?.label].filter(Boolean).join(" · ")}</p>
        </div>
        {order.notes && (
          <div className={styles.cardBlock}>
            <h3 className={styles.cardTitle}>Nota del cliente</h3>
            <p className={styles.cardText}>{order.notes}</p>
          </div>
        )}
        <div className={styles.cardBlock}>
          <h3 className={styles.cardTitle}>Intentos de pago</h3>
          {order.payments.length === 0 ? (
            <p className={styles.cardText}>Sin intentos de pago.</p>
          ) : (
            <ul className={styles.attempts}>
              {order.payments.map((payment) => {
                const state = ATTEMPT_BADGE[payment.status] ?? ATTEMPT_BADGE.pending;
                return (
                  <li key={payment.id} className={styles.attempt}>
                    <span className={styles.attemptText}>
                      <span>{paymentLabel({ payment_method: payment.provider, payments: [payment] })}</span>
                      <span className={styles.muted}>
                        {formatShortDateTime(new Date(payment.created_at))}
                        {payment.reference && <> · <span className={styles.sku}>{payment.reference}</span></>}
                      </span>
                    </span>
                    <Badge tone={state.tone}>{owed === payment ? "Por devolver" : state.label}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <dl className={styles.totals}>
          <div className={styles.totalRow}>
            <dt>Subtotal ({count === 1 ? "1 producto" : `${count} productos`})</dt>
            <dd>{clp(order.subtotal)}</dd>
          </div>
          {Number(order.discount_total) > 0 && (
            <div className={`${styles.totalRow} ${styles.good}`}>
              <dt>Descuentos</dt>
              <dd>{clp(-order.discount_total)}</dd>
            </div>
          )}
          <div className={`${styles.totalRow} ${shipping === 0 ? styles.good : ""}`}>
            <dt>{pickup ? "Retiro" : "Despacho"}</dt>
            <dd>{shipping === 0 ? "Gratis" : clp(shipping)}</dd>
          </div>
          <div className={styles.totalRow}>
            <dt>IVA incluido</dt>
            <dd>{clp(Number(order.tax_total) > 0 ? order.tax_total : Math.round((Number(order.total) * 19) / 119))}</dd>
          </div>
          <div className={`${styles.totalRow} ${styles.grandTotal}`}>
            <dt>Total</dt>
            <dd>{clp(order.total)}</dd>
          </div>
        </dl>
        <p className={`${styles.muted} ${styles.cardBlock}`}>
          Documento: {order.document_type === "factura" ? "factura electrónica" : "boleta electrónica"} (se emite fuera de la tienda)
        </p>
      </div>
    </aside>
  );
}
