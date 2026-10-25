import type { ButtonHTMLAttributes } from "react";
import Link from "next/link";
import { cx } from "./cx";
import { Icon, type IconName } from "./icon";
import styles from "./icon-button.module.css";

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: IconName;
  /** Obligatorio: nombre accesible ("Guardar en favoritos") */
  label: string;
  variant?: "secondary" | "ghost";
  size?: "sm" | "md";
  /** Toggle (favoritos): ícono relleno en brand cuando es true */
  pressed?: boolean;
  /** Renderiza un enlace (cuenta, favoritos, carro en el header) */
  href?: string;
};

// Solo para favoritos, buscar, cuenta, carro y cerrar
export function IconButton({
  icon,
  label,
  variant = "secondary",
  size = "md",
  pressed,
  href,
  className,
  type = "button",
  ...rest
}: IconButtonProps) {
  const classes = cx(
    styles.iconButton,
    variant === "ghost" && styles.ghost,
    size === "sm" && styles.sm,
    className,
  );
  const glyph = <Icon name={icon} size={size === "sm" ? 16 : 20} filled={pressed === true} />;

  if (href) {
    return (
      <Link href={href} className={classes} aria-label={label}>
        {glyph}
      </Link>
    );
  }

  return (
    <button
      {...rest}
      type={type}
      className={classes}
      aria-label={label}
      aria-pressed={typeof pressed === "boolean" ? pressed : undefined}
    >
      {glyph}
    </button>
  );
}
