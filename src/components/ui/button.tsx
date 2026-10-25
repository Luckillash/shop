import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cx } from "./cx";
import { Icon, type IconName } from "./icon";
import styles from "./button.module.css";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** primary = la única acción principal de la vista; secondary = el resto; ghost = baja énfasis */
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  /** Ocupa todo el ancho del contenedor */
  block?: boolean;
  /** Spinner, mantiene el ancho, ignora clics y marca aria-busy. El texto va en gerundio ("Pagando") */
  loading?: boolean;
  iconStart?: IconName;
  iconEnd?: IconName;
  /** Renderiza un enlace (next/link) en vez de un <button> */
  href?: string;
  /** Solo con href: false mantiene el scroll al navegar ("Cargar más productos") */
  scroll?: boolean;
  children: ReactNode;
};

// Sin estado ni efectos: sirve en Server y Client Components.
export function Button({
  variant = "primary",
  size = "md",
  block,
  loading = false,
  iconStart,
  iconEnd,
  href,
  scroll,
  className,
  children,
  type = "button",
  onClick,
  ...rest
}: ButtonProps) {
  const iconSize = size === "sm" ? 16 : 20;
  const classes = cx(
    styles.button,
    styles[variant],
    size !== "md" && styles[size],
    block && styles.block,
    loading && styles.loading,
    className,
  );
  const content = (
    <>
      {loading ? (
        <span className={styles.spinner} aria-hidden="true" />
      ) : (
        iconStart && <Icon name={iconStart} size={iconSize} />
      )}
      <span>{children}</span>
      {!loading && iconEnd && <Icon name={iconEnd} size={iconSize} />}
    </>
  );

  if (href) {
    return (
      <Link href={href} scroll={scroll} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button
      {...rest}
      // En espera no envía el formulario otra vez ni dispara onClick (tampoco con el teclado)
      type={loading ? "button" : type}
      onClick={loading ? undefined : onClick}
      className={classes}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
    >
      {content}
    </button>
  );
}
