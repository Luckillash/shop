"use client";

import { useState } from "react";
import { cx } from "./cx";
import { Icon } from "./icon";
import styles from "./quantity-stepper.module.css";

export type QuantityStepperProps = {
  value?: number;
  defaultValue?: number;
  min?: number;
  /** Stock disponible */
  max?: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md";
  /** Nombre accesible; en el carro incluye el producto ("Cantidad de Taza…") */
  label?: string;
  className?: string;
};

export function clampQuantity(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

// En el mínimo, "−" se deshabilita (para quitar se usa Eliminar). Sobre el máximo, se ajusta al máximo.
export function QuantityStepper({
  value,
  defaultValue,
  min = 1,
  max = 99,
  onChange,
  size = "md",
  label = "Cantidad",
  className,
}: QuantityStepperProps) {
  const [internal, setInternal] = useState(defaultValue ?? min);
  const current = value ?? internal;

  function set(n: number) {
    const next = clampQuantity(n, min, max);
    if (value === undefined) setInternal(next);
    onChange?.(next);
  }

  return (
    <div className={cx(styles.stepper, size === "sm" && styles.sm, className)} role="group" aria-label={label}>
      <button
        type="button"
        className={styles.button}
        onClick={() => set(current - 1)}
        disabled={current <= min}
        aria-label="Quitar uno"
      >
        <Icon name="minus" size={16} strokeWidth={2} />
      </button>
      <input
        className={styles.input}
        type="text"
        inputMode="numeric"
        value={current}
        aria-label={label}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
          if (!Number.isNaN(n)) set(n);
        }}
      />
      <button
        type="button"
        className={styles.button}
        onClick={() => set(current + 1)}
        disabled={current >= max}
        aria-label="Agregar uno"
      >
        <Icon name="plus" size={16} strokeWidth={2} />
      </button>
    </div>
  );
}
