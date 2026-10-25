"use client";

import { useId, type ReactNode, type SelectHTMLAttributes } from "react";
import { cx } from "./cx";
import { Icon } from "./icon";
import styles from "./field.module.css";

export type SelectOption = { value: string; label: string; disabled?: boolean };

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: SelectOption[];
  /** Opción vacía inicial ("Elige tu región"); queda deshabilitada */
  placeholder?: string;
  hint?: ReactNode;
  error?: ReactNode;
};

// No existe en el design system: replica el patrón de los templates (al-field__input + chevronDown)
// con la misma API que TextField. Para Región, Comuna y Ordenar por.
export function Select({ label, options, placeholder, hint, error, className, id, ...rest }: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const hintId = `${selectId}-hint`;
  const errorId = `${selectId}-error`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;
  const hasValue = rest.value !== undefined || rest.defaultValue !== undefined;

  return (
    <div className={cx(styles.field, error ? styles.invalid : undefined, className)}>
      <label className={styles.label} htmlFor={selectId}>
        {label}
      </label>
      <div className={styles.selectWrap}>
        <select
          {...rest}
          // Sin valor inicial, muestra el placeholder
          defaultValue={hasValue ? rest.defaultValue : placeholder !== undefined ? "" : undefined}
          id={selectId}
          className={cx(styles.input, styles.select)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        >
          {placeholder !== undefined && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
        <Icon name="chevronDown" size={20} className={styles.chevron} />
      </div>
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
