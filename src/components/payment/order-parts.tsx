import type { ReactNode } from "react";
import { cx } from "@/components/ui/cx";
import { formatCLP } from "@/lib/format/clp";
import type { OrderView } from "@/lib/payments/order-view";
import styles from "./payment.module.css";

// Piezas compartidas de las pantallas de resultado del pago. Sin estado: Server Components.

const amount = (value: number) => formatCLP(Math.round(Number(value)));

function units(n: number) {
  return n === 1 ? "1 unidad" : `${n} unidades`;
}

/** Resumen lateral: *Detalle del pedido* / *Resumen del pedido* con su línea de total */
export function OrderAside({
  order,
  title,
  totalLabel,
  footnote,
}: {
  order: OrderView;
  title: string;
  totalLabel: string;
  footnote?: string;
}) {
  const count = order.items.reduce((n, item) => n + item.quantity, 0);
  const shipping = Number(order.shipping_total);
  return (
    <aside className={styles.aside} aria-labelledby="resumen-pedido">
      <h2 id="resumen-pedido" className={styles.cardTitle}>
        {title}
      </h2>
      <ul className={styles.lines}>
        {order.items.map((item) => (
          <li key={item.id} className={styles.line}>
            <span className={styles.lineName}>
              {item.product_name}
              <span>
                {item.variant_name && item.variant_name !== "Única" ? `${item.variant_name} · ` : ""}
                {units(item.quantity)}
              </span>
            </span>
            <span className={styles.lineAmount}>{amount(Number(item.unit_price) * item.quantity)}</span>
          </li>
        ))}
      </ul>
      <dl className={styles.rows}>
        <div className={styles.row}>
          <dt>Subtotal ({count === 1 ? "1 producto" : `${count} productos`})</dt>
          <dd>{amount(order.subtotal)}</dd>
        </div>
        {Number(order.discount_total) > 0 && (
          <div className={cx(styles.row, styles.good)}>
            <dt>Descuentos</dt>
            <dd>{amount(-order.discount_total)}</dd>
          </div>
        )}
        <div className={cx(styles.row, shipping === 0 && styles.good)}>
          <dt>Despacho</dt>
          <dd>{shipping === 0 ? "Gratis" : amount(shipping)}</dd>
        </div>
        <div className={cx(styles.row, styles.total)}>
          <dt>{totalLabel}</dt>
          <dd>{amount(order.total)}</dd>
        </div>
      </dl>
      {footnote && <p className={styles.footnote}>{footnote}</p>}
    </aside>
  );
}

/** *Qué viene ahora* / *Qué puedes hacer*: lista numerada */
export function NumberedSteps({ id, title, steps }: { id: string; title: string; steps: { title: string; detail: ReactNode }[] }) {
  return (
    <section className={styles.section} aria-labelledby={id}>
      <h2 id={id} className={styles.sectionTitle}>
        {title}
      </h2>
      <ol className={styles.steps}>
        {steps.map((step, i) => (
          <li key={step.title}>
            <span className={styles.stepNumber} aria-hidden="true">
              {i + 1}
            </span>
            <span className={styles.stepText}>
              <strong>{step.title}</strong>
              <span>{step.detail}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function ResultLayout({ children, aside }: { children: ReactNode; aside: ReactNode }) {
  return (
    <div className={styles.layout}>
      <div className={styles.content}>{children}</div>
      {aside}
    </div>
  );
}
