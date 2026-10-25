"use client";

import { useId, type ReactNode } from "react";
import { formatCLP } from "@/lib/format/clp";
import { Button } from "./button";
import { cx } from "./cx";
import { Icon } from "./icon";
import styles from "./order-summary.module.css";

export type OrderSummaryProps = {
  subtotal: number;
  /** Pesos descontados, en positivo */
  discount?: number;
  discountLabel?: string;
  /** null/undefined = "Por calcular", 0 = "Gratis" */
  shipping?: number | null;
  itemsCount?: number;
  title?: string;
  ctaLabel?: string;
  onCheckout?: () => void;
  /** Si se da, el botón es un enlace (por ejemplo, a /checkout) */
  ctaHref?: string;
  loading?: boolean;
  /** Línea de confianza bajo el botón; false la oculta */
  note?: ReactNode | false;
  className?: string;
};

export function orderTotal(subtotal: number, discount = 0, shipping?: number | null): number {
  return subtotal - discount + (typeof shipping === "number" ? shipping : 0);
}

// Solo muestra: el total real del pedido lo calcula place_order en la base de datos.
export function OrderSummary({
  subtotal,
  discount = 0,
  discountLabel = "Descuentos",
  shipping,
  itemsCount,
  title = "Resumen del pedido",
  ctaLabel = "Ir a pagar",
  onCheckout,
  ctaHref,
  loading,
  note,
  className,
}: OrderSummaryProps) {
  const titleId = useId();
  const total = orderTotal(subtotal, discount, shipping);
  const shippingText = shipping == null ? "Por calcular" : shipping === 0 ? "Gratis" : formatCLP(shipping);
  const subtotalLabel = itemsCount
    ? `Subtotal (${itemsCount} ${itemsCount === 1 ? "producto" : "productos"})`
    : "Subtotal";

  return (
    <section className={cx(styles.summary, className)} aria-labelledby={titleId}>
      <h2 className={styles.title} id={titleId}>
        {title}
      </h2>
      <dl className={styles.rows}>
        <div className={styles.row}>
          <dt>{subtotalLabel}</dt>
          <dd>{formatCLP(subtotal)}</dd>
        </div>
        {discount > 0 && (
          <div className={cx(styles.row, styles.good)}>
            <dt>{discountLabel}</dt>
            <dd>{formatCLP(-discount)}</dd>
          </div>
        )}
        <div className={cx(styles.row, shipping === 0 && styles.good)}>
          <dt>Despacho</dt>
          <dd>{shippingText}</dd>
        </div>
        <div className={cx(styles.row, styles.total)}>
          <dt>Total</dt>
          <dd>{formatCLP(total)}</dd>
        </div>
      </dl>
      <Button
        variant="primary"
        size="lg"
        block
        href={ctaHref}
        onClick={onCheckout}
        loading={loading}
        iconEnd="chevronRight"
      >
        {ctaLabel}
      </Button>
      {note !== false && (
        <p className={styles.note}>
          <Icon name="lock" size={16} />
          {note ?? "Pago seguro con tarjeta de crédito, débito o transferencia."}
        </p>
      )}
    </section>
  );
}
