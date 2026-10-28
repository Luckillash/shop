"use client";

import { useId, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cx } from "./cx";
import { Icon } from "./icon";
import styles from "./field.module.css";

export type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  /** Siempre visible arriba del campo */
  label: string;
  hint?: ReactNode;
  /** Mensaje con la solución, no el diagnóstico. Marca aria-invalid */
  error?: ReactNode;
};

// Igual que TextField, para textos largos (Escribe tu opinión, 7.6).
export function TextArea({ label, hint, error, className, id, rows = 5, ...rest }: TextAreaProps) {
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
      <textarea
        rows={rows}
        {...rest}
        id={inputId}
        className={cx(styles.input, styles.textarea)}
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
