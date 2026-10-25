"use client";

import { useId, useState } from "react";
import { cx } from "./cx";
import styles from "./variant-picker.module.css";

export type VariantOption = {
  value: string;
  label: string;
  /** Color de la muestra, solo con type="color" */
  color?: string;
  disabled?: boolean;
};

export type VariantPickerProps = {
  label: string;
  type?: "size" | "color";
  options: VariantOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  className?: string;
};

// La leyenda repite la opción elegida ("Color: Arena"). Las agotadas siguen visibles, deshabilitadas.
export function VariantPicker({
  label,
  type = "size",
  options,
  value,
  defaultValue,
  onChange,
  className,
}: VariantPickerProps) {
  const name = useId();
  const [internal, setInternal] = useState(defaultValue);
  const current = value ?? internal;
  const selected = options.find((o) => o.value === current);
  const isColor = type === "color";

  function pick(next: string) {
    if (value === undefined) setInternal(next);
    onChange?.(next);
  }

  return (
    <fieldset className={cx(styles.picker, className)}>
      <legend className={styles.legend}>
        {label}
        {selected && <span className={styles.current}>: {selected.label}</span>}
      </legend>
      <div className={styles.options}>
        {options.map((o) => (
          <label key={o.value} className={styles.option}>
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={o.value === current}
              disabled={o.disabled}
              onChange={() => pick(o.value)}
            />
            {isColor ? (
              <span className={styles.swatch} title={o.label}>
                <span className={styles.dot} style={{ background: o.color }} />
                <span className="sr-only">
                  {o.label}
                  {o.disabled && " (agotado)"}
                </span>
              </span>
            ) : (
              <span className={styles.size}>
                {o.label}
                {o.disabled && <span className="sr-only"> (agotado)</span>}
              </span>
            )}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
