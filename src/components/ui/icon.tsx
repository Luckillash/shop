import { cx } from "./cx";
import styles from "./icon.module.css";

// Set propio del design system: grilla de 24px, trazo 1.75, extremos redondeados
const PATHS = {
  cart: "M3 4h2.5l2.2 10.2a1.5 1.5 0 0 0 1.5 1.2h7.9a1.5 1.5 0 0 0 1.5-1.1L20.5 8H6.4M10.8 19.5a1.3 1.3 0 1 1-2.6 0a1.3 1.3 0 1 1 2.6 0M18.3 19.5a1.3 1.3 0 1 1-2.6 0a1.3 1.3 0 1 1 2.6 0",
  heart: "M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.2a4.2 4.2 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z",
  star: "M12 3.5l2.6 5.4 5.9.7-4.4 4 1.2 5.9L12 16.6l-5.3 2.9 1.2-5.9-4.4-4 5.9-.7z",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  check: "M5 12.5l4.5 4.5L19 7",
  close: "M6 6l12 12M18 6L6 18",
  trash: "M4 7h16M9.5 7V4.5h5V7M6.5 7l.8 12.5h9.4L17.5 7M10 11v5M14 11v5",
  truck: "M3 6h11v9.5H3zM14 9.5h3.6L21 13v2.5h-7M8.6 17.5a1.6 1.6 0 1 1-3.2 0a1.6 1.6 0 1 1 3.2 0M18.6 17.5a1.6 1.6 0 1 1-3.2 0a1.6 1.6 0 1 1 3.2 0",
  returns: "M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11",
  alert: "M12 4l9 16H3zM12 10v4M12 17h.01",
  info: "M21 12a9 9 0 1 1-18 0a9 9 0 1 1 18 0M12 11v5M12 8h.01",
  search: "M17 10.5a6.5 6.5 0 1 1-13 0a6.5 6.5 0 1 1 13 0M15.2 15.2L20 20",
  tag: "M3.5 12.3V4.5a1 1 0 0 1 1-1h7.8l8.2 8.2a1 1 0 0 1 0 1.4l-6.6 6.6a1 1 0 0 1-1.4 0zM8 8h.01",
  image: "M4 5h16v14H4zM4 16l4.5-4.5 3.5 3.5 2.5-2.5L20 18M15.5 9.5h.01",
  lock: "M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3",
  user: "M16 8a4 4 0 1 1-8 0a4 4 0 1 1 8 0M4.5 20a7.5 7.5 0 0 1 15 0",
  menu: "M4 7h16M4 12h16M4 17h16",
  chevronRight: "M9 6l6 6-6 6",
  chevronDown: "M6 9l6 6 6-6",
} as const;

export type IconName = keyof typeof PATHS;

export const ICON_NAMES = Object.keys(PATHS) as IconName[];

export type IconProps = {
  name: IconName;
  /** 16 en controles pequeños, 20 por defecto, 24 en el header */
  size?: number;
  /** Solo si el ícono va solo y significa algo; si no, queda oculto a lectores de pantalla */
  label?: string;
  strokeWidth?: number;
  filled?: boolean;
  className?: string;
};

export function Icon({ name, size = 20, label, strokeWidth = 1.75, filled, className }: IconProps) {
  return (
    <svg
      className={cx(styles.icon, className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
