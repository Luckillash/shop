import { formatCLP } from "@/lib/format/clp";
import { Badge } from "./badge";
import { cx } from "./cx";
import styles from "./price.module.css";

export type PriceProps = {
  /** Precio actual en CLP (entero) */
  amount: number;
  /** Precio normal: si es mayor que amount, se muestra como oferta */
  compareAt?: number | null;
  size?: "sm" | "md" | "lg";
  /** Sufijo como "c/u" o "/ kg" */
  unit?: string;
  /** Muestra la insignia −N% en oferta. Por defecto true */
  showDiscount?: boolean;
  className?: string;
};

export function discountPercent(amount: number, compareAt: number): number {
  return Math.round((1 - amount / compareAt) * 100);
}

// En oferta: precio en `sale`, el anterior tachado y −N%. Nunca "Antes/Ahora".
export function Price({ amount, compareAt, size = "md", unit, showDiscount = true, className }: PriceProps) {
  const onSale = compareAt != null && compareAt > amount;

  return (
    <div className={cx(styles.price, size !== "md" && styles[size], onSale && styles.sale, className)}>
      <span className={styles.now}>
        {onSale && <span className="sr-only">Precio oferta </span>}
        {formatCLP(amount)}
      </span>
      {unit && <span className={styles.unit}>{unit}</span>}
      {onSale && (
        <s className={styles.was}>
          <span className="sr-only">Precio normal </span>
          {formatCLP(compareAt)}
        </s>
      )}
      {onSale && showDiscount && (
        <Badge tone="sale" className={styles.badge}>
          −{discountPercent(amount, compareAt)}%
        </Badge>
      )}
    </div>
  );
}
