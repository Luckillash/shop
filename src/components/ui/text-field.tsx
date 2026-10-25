"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cx } from "./cx";
import { Icon } from "./icon";
import styles from "./field.module.css";

export type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  /** Siempre visible arriba del campo */
  label: string;
  hint?: ReactNode;
  /** Mensaje con la solución, no el diagnóstico. Marca aria-invalid */
  error?: ReactNode;
};

// Usa autoComplete, e inputMode="numeric" para RUT y teléfono.
export function TextField({ label, hint, error, className, id, type = "text", ...rest }: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cx(styles.field, error ? styles.invalid : undefined, className)}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
      </label>
      <input
        type={type}
        {...rest}
        id={inputId}
        className={styles.input}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      />
      {error && (
        <span className={styles.error} id={errorId}>
          <Icon name="alert" size={16} />
          {error}
        </span>
      )}
      {hint && (
        <span className={styles.hint} id={hintId}>
          {hint}
        </span>
      )}
    </div>
  );
}
