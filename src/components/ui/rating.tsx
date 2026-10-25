import { cx } from "./cx";
import { Icon } from "./icon";
import styles from "./rating.module.css";

export type RatingProps = {
  /** 0–5, admite decimales */
  value: number;
  count?: number;
  size?: "md" | "lg";
  showValue?: boolean;
  className?: string;
};

export function ratingLabel(value: number, count?: number): string {
  const shown = value.toFixed(1).replace(".", ",");
  return `${shown} de 5 estrellas${count !== undefined ? `, ${count} opiniones` : ""}`;
}

// Siempre con conteo. Sin opiniones, no se muestra el componente (lo decide quien lo usa).
export function Rating({ value, count, size = "md", showValue = true, className }: RatingProps) {
  const clamped = Math.max(0, Math.min(5, value || 0));
  const iconSize = size === "lg" ? 20 : 16;
  const shown = clamped.toFixed(1).replace(".", ",");

  return (
    <span className={cx(styles.rating, className)} role="img" aria-label={ratingLabel(clamped, count)}>
      <span className={styles.stars} aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => {
          const fill = Math.max(0, Math.min(1, clamped - i));
          return (
            <span key={i} className={styles.star}>
              <Icon name="star" size={iconSize} strokeWidth={1.5} />
              <span className={styles.fill} style={{ width: `${fill * 100}%` }}>
                <Icon name="star" size={iconSize} strokeWidth={1.5} filled className={styles.fillIcon} />
              </span>
            </span>
          );
        })}
      </span>
      {showValue && (
        <span className={styles.value} aria-hidden="true">
          {shown}
        </span>
      )}
      {count !== undefined && <span aria-hidden="true">({count})</span>}
    </span>
  );
}
