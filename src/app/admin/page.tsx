import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ActionFeedback } from "@/components/admin/action-feedback";
import styles from "@/components/admin/admin.module.css";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Notice } from "@/components/ui/notice";
import { openAlertsSummary, openAlertsTitle } from "@/lib/admin/alerts";
import {
  ADMIN_FILTERS,
  actionSummary,
  filterCounts,
  matchesFilter,
  matchesSearch,
  nextStepLabel,
  PAGE_SIZE,
  parseFilter,
  parseShown,
  paymentLabel,
  rowNote,
  shippingLabel,
  sortOrders,
  type AdminFilter,
} from "@/lib/admin/order-list";
import { getAdminOrders, getPaymentAlerts } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth/session";
import { formatCLP } from "@/lib/format/clp";
import { formatShortDateTime } from "@/lib/format/dates";
import { asAddress } from "@/lib/orders/address";
import { adminStatusBadge } from "@/lib/orders/order-status";

export const metadata: Metadata = { title: "Pedidos" };

// Template AdminPedidos. La lista móvil no tiene diseño: la tabla se desplaza a lo ancho. El filtro,
// la búsqueda y *Ver más* van en la URL (?estado=…&q=…&mostrar=…).
export default function AdminOrdersPage({ searchParams }: PageProps<"/admin">) {
  return (
    <main className={styles.main}>
      <Suspense fallback={<div className={styles.skeleton} aria-busy="true" aria-label="Cargando" />}>
        <Orders searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function href(params: { estado?: AdminFilter; q?: string; mostrar?: number }) {
  const search = new URLSearchParams();
  // Sin estado, una búsqueda mira todos: con búsqueda, *Necesitan una acción* va explícito
  if (params.estado && (params.estado !== "accion" || params.q)) search.set("estado", params.estado);
  if (params.q) search.set("q", params.q);
  if (params.mostrar && params.mostrar > PAGE_SIZE) search.set("mostrar", String(params.mostrar));
  const query = search.toString();
  return query ? `/admin?${query}` : "/admin";
}

async function Orders({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  await requireAdmin("/admin");
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  // Con una búsqueda y sin filtro elegido se busca en todos
  const filter = params.estado === undefined && q ? "todos" : parseFilter(params.estado);
  const shown = parseShown(params.mostrar);

  const [orders, alerts] = await Promise.all([getAdminOrders(), getPaymentAlerts(false, 50)]);
  const now = new Date();
  const found = orders.filter((o) => matchesSearch(o, q));
  const counts = filterCounts(found);
  const list = sortOrders(found.filter((o) => matchesFilter(o, filter)), filter);
  const visible = list.slice(0, shown);
  const filterLabel = ADMIN_FILTERS.find((f) => f.id === filter)!.label;

  return (
    <>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <h1 className={styles.title}>Pedidos</h1>
          <p className={styles.lead}>{actionSummary(now, filterCounts(orders).accion)}</p>
        </div>
        <form role="search" action="/admin" className={styles.search}>
          <label htmlFor="buscar-pedidos" className="sr-only">
            Buscar pedidos
          </label>
          <span className={styles.searchIcon}>
            <Icon name="search" size={20} />
          </span>
          <input
            id="buscar-pedidos"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Busca por N.º de pedido o correo"
            className={styles.searchInput}
            maxLength={80}
          />
        </form>
      </div>

      <ActionFeedback />

      {alerts.length > 0 && (
        <Notice tone="warning" title={openAlertsTitle(alerts.length)}>
          <span className={styles.block}>
            {openAlertsSummary(alerts.map((a) => a.kind))} <Link href="/admin/alertas" className={styles.strong}>Revisar alertas</Link>
          </span>
        </Notice>
      )}

      <nav aria-label="Filtrar por estado" className={styles.chips}>
        {ADMIN_FILTERS.map((f) => (
          <Link key={f.id} href={href({ estado: f.id, q })} className={styles.chip} aria-current={f.id === filter ? "page" : undefined}>
            {f.label} <span className={styles.chipCount}>{counts[f.id]}</span>
          </Link>
        ))}
      </nav>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <caption className="sr-only">
            {filterLabel}
            {filter === "accion" ? ", del más antiguo al más nuevo" : ", del más nuevo al más antiguo"}
            {q ? `, con la búsqueda «${q}»` : ""}
          </caption>
          <thead>
            <tr>
              <th scope="col">Pedido</th>
              <th scope="col">Cliente</th>
              <th scope="col">Pago y despacho</th>
              <th scope="col" className={styles.right}>
                Total
              </th>
              <th scope="col">Estado</th>
              <th scope="col">Siguiente paso</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className={styles.empty}>
                  {q ? `No hay pedidos con «${q}» en ${filterLabel.toLowerCase()}.` : "No hay pedidos en este filtro."}
                </td>
              </tr>
            )}
            {visible.map((order) => {
              const badge = adminStatusBadge(order.status, order.payment_method);
              const step = nextStepLabel(order);
              const detail = `/admin/pedidos/${order.order_number}`;
              const name = asAddress(order.shipping_address).recipient_name;
              return (
                <tr key={order.id}>
                  <td>
                    <Link href={detail} className={styles.orderLink}>
                      N.º {order.order_number}
                    </Link>
                    <span className={styles.note}>{formatShortDateTime(new Date(order.placed_at))}</span>
                  </td>
                  <td>
                    <span className={`${styles.block} ${styles.strong}`}>{name || "Sin nombre"}</span>
                    <span className={styles.note}>{order.contact_email}</span>
                  </td>
                  <td>
                    <span className={styles.block}>{paymentLabel(order)}</span>
                    <span className={styles.note}>{shippingLabel(order)}</span>
                  </td>
                  <td className={`${styles.right} ${styles.strong}`}>{formatCLP(Math.round(Number(order.total)))}</td>
                  <td>
                    <Badge tone={badge.tone} icon={badge.icon}>
                      {badge.label}
                    </Badge>
                    <span className={styles.note}>{rowNote(order, now)}</span>
                  </td>
                  <td>
                    {step ? (
                      <Button href={detail} variant="secondary" size="sm">
                        {step}
                        <span className="sr-only"> · pedido N.º {order.order_number}</span>
                      </Button>
                    ) : (
                      <span className={styles.nothing}>Nada pendiente</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {list.length > 0 && (
        <div className={styles.more}>
          <p>
            Mostrando {visible.length} de {list.length} {list.length === 1 ? "pedido" : "pedidos"}
          </p>
          {visible.length < list.length && (
            <Button href={href({ estado: filter, q, mostrar: shown + PAGE_SIZE })} variant="secondary" scroll={false}>
              Ver más pedidos
            </Button>
          )}
        </div>
      )}
    </>
  );
}
