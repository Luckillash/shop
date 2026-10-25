import { formatCLP } from "@/lib/format/clp";
import { cx } from "./cx";
import { Icon } from "./icon";
import styles from "./free-shipping-bar.module.css";

export type FreeShippingBarProps = {
  subtotal: number;
  /** Umbral del despacho gratis (39990, ver src/lib/store.ts) */
  threshold: number;
  className?: string;
};

// Una por vista. "Te faltan $5.010 para el despacho gratis" → "Tu pedido tiene despacho gratis".
export function FreeShippingBar({ subtotal, threshold, className }: FreeShippingBarProps) {
  const missing = Math.max(0, threshold - subtotal);
  const percent = threshold ? Math.min(100, Math.round((subtotal / threshold) * 100)) : 100;
  const done = missing === 0;

  return (
    <div className={cx(styles.bar, done && styles.done, className)}>
      <p className={styles.message} aria-live="polite">
        <Icon name={done ? "check" : "truck"} size={20} className={done ? styles.doneIcon : undefined} />
        {done ? (
          <span>
            Tu pedido tiene <strong>despacho gratis</strong>
          </span>
        ) : (
          <span>
            Te faltan <strong>{formatCLP(missing)}</strong> para el despacho gratis
          </span>
        )}
      </p>
      <div
        className={styles.track}
        role="progressbar"
        aria-label="Avance hacia el despacho gratis"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className={styles.fill} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
