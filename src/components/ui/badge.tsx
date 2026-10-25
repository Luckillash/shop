import type { ReactNode } from "react";
import { cx } from "./cx";
import { Icon, type IconName } from "./icon";
import styles from "./badge.module.css";

export type BadgeTone = "neutral" | "new" | "sale" | "success" | "warning" | "danger";

export type BadgeProps = {
  tone?: BadgeTone;
  /** Los tonos de estado (success, warning, danger) siempre llevan ícono */
  icon?: IconName;
  children: ReactNode;
  className?: string;
};

export function Badge({ tone = "neutral", icon, children, className }: BadgeProps) {
  return (
    <span className={cx(styles.badge, tone !== "neutral" && styles[tone], className)}>
      {icon && <Icon name={icon} size={14} strokeWidth={2} />}
      {children}
    </span>
  );
}
