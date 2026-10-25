import type { ReactNode } from "react";
import { cx } from "./cx";
import { Icon, type IconName } from "./icon";
import styles from "./notice.module.css";

export type NoticeTone = "info" | "success" | "warning" | "danger";

export type NoticeProps = {
  tone?: NoticeTone;
  title?: ReactNode;
  children?: ReactNode;
  icon?: IconName;
  /** Una acción pequeña, normalmente un Button ghost */
  action?: ReactNode;
  className?: string;
};

const DEFAULT_ICON: Record<NoticeTone, IconName> = {
  info: "info",
  success: "check",
  warning: "alert",
  danger: "alert",
};

// danger se anuncia con role="alert"; el resto con role="status".
export function Notice({ tone = "info", title, children, icon, action, className }: NoticeProps) {
  return (
    <div
      className={cx(styles.notice, tone !== "info" && styles[tone], className)}
      role={tone === "danger" ? "alert" : "status"}
    >
      <Icon name={icon ?? DEFAULT_ICON[tone]} size={20} className={styles.icon} />
      <div className={styles.body}>
        {title && <strong className={styles.title}>{title}</strong>}
        {children}
      </div>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
