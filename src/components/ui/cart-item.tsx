"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCLP } from "@/lib/format/clp";
import { cx } from "./cx";
import { Icon } from "./icon";
import { Price } from "./price";
import { QuantityStepper } from "./quantity-stepper";
import styles from "./cart-item.module.css";

export type CartItemProps = {
  title: string;
  /** "Color: Arena" */
  variant?: string;
  image?: string | null;
  imageAlt?: string;
  href?: string;
  /** Precio unitario; la línea muestra precio × cantidad */
  price: number;
  compareAt?: number | null;
  quantity: number;
  max?: number;
  onQuantityChange?: (quantity: number) => void;
  onRemove?: () => void;
  className?: string;
};

export function CartItem({
  title,
  variant,
  image,
  imageAlt,
  href,
  price,
  compareAt,
  quantity,
  max,
  onQuantityChange,
  onRemove,
  className,
}: CartItemProps) {
  const [internalQty, setInternalQty] = useState(quantity);
  const controlled = onQuantityChange !== undefined;
  const qty = controlled ? quantity : internalQty;

  function setQty(n: number) {
    if (controlled) onQuantityChange(n);
    else setInternalQty(n);
  }

  return (
    <div className={cx(styles.item, className)}>
      <div className={styles.thumb}>
        {/* Ver la nota sobre next/image en product-card.tsx */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {image && <img src={image} alt={imageAlt ?? ""} />}
      </div>
      <div className={styles.info}>
        {href ? (
          <Link className={styles.title} href={href}>
            {title}
          </Link>
        ) : (
          <span className={styles.title}>{title}</span>
        )}
        {variant && <span className={styles.meta}>{variant}</span>}
        {qty > 1 && <span className={styles.meta}>{formatCLP(price)} c/u</span>}
        <div className={styles.actions}>
          <QuantityStepper size="sm" value={qty} max={max} onChange={setQty} label={`Cantidad de ${title}`} />
          <button type="button" className={styles.remove} onClick={onRemove}>
            <Icon name="trash" size={16} />
            Eliminar
          </button>
        </div>
      </div>
      <div className={styles.price}>
        <Price
          size="sm"
          amount={price * qty}
          compareAt={compareAt ? compareAt * qty : undefined}
          showDiscount={false}
          className={styles.priceStack}
        />
      </div>
    </div>
  );
}
