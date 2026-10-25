"use client";

import Link from "next/link";
import { cx } from "@/components/ui/cx";
import { Icon } from "@/components/ui/icon";
import { productsLabel } from "@/lib/cart/totals";
import { formatCLP } from "@/lib/format/clp";
import type { CartItem } from "@/store/cart-store";
import styles from "./checkout.module.css";

type CheckoutSummaryProps = {
  items: CartItem[];
  subtotal: number;
  discount: number;
  couponCode: string | null;
  /** null = "Por calcular" (falta elegir el despacho o la región) */
  shipping: number | null;
};

// Resumen del pedido: lateral en escritorio y plegado arriba en móvil (*Ver resumen del pedido*).
// Solo muestra: el total real lo calcula place_order.
export function CheckoutSummary(props: CheckoutSummaryProps) {
  const total = props.subtotal - props.discount + (props.shipping ?? 0);
  return (
    <>
      <details className={cx(styles.summary, styles.summaryDetails, styles.mobileOnly)}>
        <summary className={styles.summaryToggle}>
          <span>
            Ver resumen del pedido
            <Icon name="chevronDown" size={16} className={styles.chevron} />
          </span>
          <span>{formatCLP(total)}</span>
        </summary>
        <SummaryBody {...props} total={total} />
      </details>

      <section className={cx(styles.summary, styles.desktopOnly)} aria-labelledby="resumen-pedido">
        <h2 id="resumen-pedido" className={styles.summaryTitle}>
          Resumen del pedido
        </h2>
        <SummaryBody {...props} total={total} />
      </section>
    </>
  );
}

function SummaryBody({ items, subtotal, discount, couponCode, shipping, total }: CheckoutSummaryProps & { total: number }) {
  const count = items.reduce((n, i) => n + i.quantity, 0);
  return (
    <div className={styles.summaryBody}>
      <ul className={styles.lines}>
        {items.map((item) => (
          <li key={item.variantId} className={styles.line}>
            <span className={styles.thumb}>
              {/* eslint-disable-next-line @next/next/no-img-element -- placeholders SVG (D-015) */}
              {item.image && <img src={item.image} alt="" loading="lazy" />}
              <span className={styles.qty} aria-label={`${item.quantity} unidades`}>
                {item.quantity}
              </span>
            </span>
            <span>
              <span className={styles.lineName}>{item.name}</span>
              {item.variantName && <span className={cx(styles.muted)}> · {item.variantName}</span>}
            </span>
            <span className={styles.lineAmount}>{formatCLP(item.unitPrice * item.quantity)}</span>
          </li>
        ))}
      </ul>

      <dl className={styles.rows}>
        <div className={styles.row}>
          <dt>Subtotal ({productsLabel(count)})</dt>
          <dd>{formatCLP(subtotal)}</dd>
        </div>
        {discount > 0 && (
          <div className={cx(styles.row, styles.good)}>
            <dt>{couponCode ? `Cupón ${couponCode}` : "Descuentos"}</dt>
            <dd>{formatCLP(-discount)}</dd>
          </div>
        )}
        <div className={cx(styles.row, shipping === 0 && styles.good)}>
          <dt>Despacho</dt>
          <dd>{shipping == null ? "Por calcular" : shipping === 0 ? "Gratis" : formatCLP(shipping)}</dd>
        </div>
        <div className={cx(styles.row, styles.total)}>
          <dt>Total</dt>
          <dd>{formatCLP(total)}</dd>
        </div>
      </dl>

      {!couponCode && (
        <Link href="/carro" className={styles.link}>
          ¿Tienes un cupón de descuento?
        </Link>
      )}
      <p className={styles.summaryNote}>
        <Icon name="lock" size={16} />
        Pago seguro con Webpay Plus, Flow o transferencia.
      </p>
    </div>
  );
}
