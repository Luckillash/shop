import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ActionFeedback } from "@/components/admin/action-feedback";
import styles from "@/components/admin/admin.module.css";
import { ResolveAlertForm } from "@/components/admin/order-step-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { alertCopy } from "@/lib/admin/alerts";
import { getAlertCounts, getPaymentAlerts, type PaymentAlertRow } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth/session";
import { formatCLP } from "@/lib/format/clp";
import { formatDeliveryDay, formatShortDateTime } from "@/lib/format/dates";

export const metadata: Metadata = { title: "Alertas de pago" };

// Template AdminAlertas: los casos que la tienda no pudo cerrar sola (payment_alerts, D-020).
// *Sin resolver* / *Resueltas* van en la URL (?ver=resueltas).
export default function AdminAlertsPage({ searchParams }: PageProps<"/admin/alertas">) {
  return (
    <main className={`${styles.main} ${styles.mainNarrow}`}>
      <Suspense fallback={<div className={styles.skeleton} aria-busy="true" aria-label="Cargando" />}>
        <Alerts searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const GATEWAY: Record<string, string> = { webpay: "Webpay Plus", flow: "Flow", transfer: "Transferencia" };

async function Alerts({ searchParams }: { searchParams: PageProps<"/admin/alertas">["searchParams"] }) {
  await requireAdmin("/admin/alertas");
  const resolved = (await searchParams).ver === "resueltas";
  const [alerts, counts, recent] = await Promise.all([
    getPaymentAlerts(resolved),
    getAlertCounts(),
    resolved ? Promise.resolve([]) : getPaymentAlerts(true, 5),
  ]);

  return (
    <>
      <div className={styles.headText}>
        <h1 className={styles.title}>Alertas de pago</h1>
        <p className={styles.lead}>
          Casos que la tienda no pudo cerrar sola. Revisa cada uno en la pasarela y márcalo como resuelto cuando esté en orden.
        </p>
      </div>

      <ActionFeedback />

      <nav aria-label="Filtrar alertas" className={styles.chips}>
        <Link href="/admin/alertas" className={styles.chip} aria-current={resolved ? undefined : "page"}>
          Sin resolver <span className={styles.chipCount}>{counts.open}</span>
        </Link>
        <Link href="/admin/alertas?ver=resueltas" className={styles.chip} aria-current={resolved ? "page" : undefined}>
          Resueltas <span className={styles.chipCount}>{counts.resolved}</span>
        </Link>
      </nav>

      {alerts.length === 0 ? (
        <p className={styles.lead}>{resolved ? "Todavía no hay alertas resueltas." : "No hay alertas sin resolver. Todo está en orden."}</p>
      ) : (
        <ul className={styles.alerts}>
          {alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </ul>
      )}

      {recent.length > 0 && (
        <section aria-labelledby="resueltas" className={styles.section}>
          <h2 id="resueltas" className={styles.smallTitle}>
            Resueltas hace poco
          </h2>
          <ul className={styles.resolvedList}>
            {recent.map((alert) => (
              <li key={alert.id} className={styles.resolvedItem}>
                <span>
                  <strong className={styles.strong}>{alertCopy(alert.kind, alert.payment?.provider ?? null).label}</strong>
                  {alert.order && (
                    <>
                      {" "}
                      ·{" "}
                      <Link href={`/admin/pedidos/${alert.order.order_number}`} className={styles.mono}>
                        N.º {alert.order.order_number}
                      </Link>
                    </>
                  )}
                </span>
                <span className={styles.cardText}>Resuelta el {formatDeliveryDay(new Date(alert.resolved_at!))}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

/** El error que devolvió la pasarela (detail.error de refund_failed), para saber por qué falló */
function gatewayError(detail: PaymentAlertRow["detail"]): string | null {
  if (!detail || typeof detail !== "object" || Array.isArray(detail)) return null;
  return typeof detail.error === "string" && detail.error.trim() ? detail.error.trim().slice(0, 300) : null;
}

function AlertCard({ alert }: { alert: PaymentAlertRow }) {
  const provider = alert.payment?.provider ?? null;
  const copy = alertCopy(alert.kind, provider);
  const orderNumber = alert.order?.order_number;
  return (
    <li className={styles.alert}>
      <div className={styles.alertHead}>
        <div className={styles.alertTitleRow}>
          <Badge tone={copy.tone} icon="alert">
            {copy.label}
          </Badge>
          <h2 className={styles.alertTitle}>{copy.title}</h2>
        </div>
        <span className={styles.muted}>{formatShortDateTime(new Date(alert.created_at))}</span>
      </div>
      <p className={styles.alertText}>{copy.what}</p>
      {gatewayError(alert.detail) && (
        <p className={styles.muted}>
          Respuesta de {(provider && GATEWAY[provider]) ?? "la pasarela"}: {gatewayError(alert.detail)}
        </p>
      )}
      {!alert.resolved_at && (
        <div className={styles.todo}>
          <strong>Qué hacer</strong>
          <span>{copy.todo}</span>
        </div>
      )}
      <dl className={styles.alertData}>
        {orderNumber && (
          <div>
            <dt>Pedido</dt>
            <dd>
              <Link href={`/admin/pedidos/${orderNumber}`} className={styles.orderLink}>
                N.º {orderNumber}
              </Link>
            </dd>
          </div>
        )}
        <div>
          <dt>Pasarela</dt>
          <dd>{(provider && GATEWAY[provider]) ?? "—"}</dd>
        </div>
        {alert.payment && (
          <div>
            <dt>Monto</dt>
            <dd>{formatCLP(Math.round(Number(alert.payment.amount)))}</dd>
          </div>
        )}
        {alert.payment?.reference && (
          <div>
            <dt>Referencia</dt>
            <dd className={styles.sku}>{alert.payment.reference}</dd>
          </div>
        )}
        {alert.resolved_at && (
          <div>
            <dt>Resuelta</dt>
            <dd>{formatShortDateTime(new Date(alert.resolved_at))}</dd>
          </div>
        )}
      </dl>
      <div className={styles.alertActions}>
        {!alert.resolved_at && <ResolveAlertForm alertId={alert.id} />}
        {orderNumber && (
          <Button href={`/admin/pedidos/${orderNumber}`} variant="ghost" size="sm" iconEnd="chevronRight">
            Ver el pedido
          </Button>
        )}
      </div>
    </li>
  );
}
