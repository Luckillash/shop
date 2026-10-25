"use client";

import type { ReactNode } from "react";
import { cx } from "@/components/ui/cx";
import { Icon } from "@/components/ui/icon";
import { Notice } from "@/components/ui/notice";
import { errorSummary, type FieldErrors } from "@/lib/checkout/validation";
import styles from "./checkout.module.css";

// Piezas compartidas por los 3 pasos del checkout.

export type StepKey = "contact" | "shipping" | "payment";

export const STEP_LABELS: Record<StepKey, string> = {
  contact: "Contacto",
  shipping: "Despacho",
  payment: "Pago",
};

const ORDER: StepKey[] = ["contact", "shipping", "payment"];

/** Indicador: listo (check), actual (aria-current) o pendiente. En móvil, "Paso 2 de 3 · Despacho" */
export function StepIndicator({ current, done }: { current: StepKey; done: Set<StepKey> }) {
  const index = ORDER.indexOf(current);
  return (
    <>
      <ol className={styles.indicator} aria-label="Pasos de la compra">
        {ORDER.map((step, i) => (
          <li key={step} aria-current={step === current ? "step" : undefined}>
            <span className={cx(styles.dot, done.has(step) && step !== current && styles.dotDone)}>
              {done.has(step) && step !== current ? <Icon name="check" size={16} /> : i + 1}
            </span>
            <span className={styles.indicatorLabel}>
              {STEP_LABELS[step]}
              {done.has(step) && step !== current && <span className="sr-only"> (listo)</span>}
            </span>
          </li>
        ))}
      </ol>
      <p className={styles.mobileStep}>
        Paso {index + 1} de 3 · {STEP_LABELS[current]}
      </p>
    </>
  );
}

type StepCardProps = {
  step: StepKey;
  number: number;
  state: "current" | "done" | "pending";
  /** Botón *Editar* de un paso completado */
  onEdit?: () => void;
  editDisabled?: boolean;
  children?: ReactNode;
};

export function StepCard({ step, number, state, onEdit, editDisabled, children }: StepCardProps) {
  const titleId = `paso-${step}`;
  return (
    <section className={cx(styles.step, state === "pending" && styles.stepPending)} aria-labelledby={titleId}>
      <div className={styles.stepHead} aria-current={state === "current" ? "step" : undefined}>
        <span className={cx(styles.dot, state === "done" && styles.dotDone)}>
          {state === "done" ? <Icon name="check" size={16} /> : number}
        </span>
        <h2 id={titleId} className={styles.stepTitle}>
          {STEP_LABELS[step]}
        </h2>
        {state === "done" && onEdit && (
          <button
            type="button"
            className={styles.link}
            onClick={onEdit}
            disabled={editDisabled}
            aria-label={`Editar ${STEP_LABELS[step].toLowerCase()}`}
          >
            Editar
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

/** Notice danger "Revisa N datos para continuar" con un enlace a cada campo. El botón sigue activo */
export function ErrorSummary({
  errors,
  order,
  labels,
  action,
}: {
  errors: FieldErrors;
  order: readonly string[];
  labels: Record<string, string>;
  action: "continuar" | "pagar";
}) {
  const fields = order.filter((f) => errors[f]);
  if (fields.length === 0) return null;
  return (
    <Notice tone="danger" title={errorSummary(fields.length, action)}>
      <ul className={styles.errorList}>
        {fields.map((f) => (
          <li key={f}>
            <a href={`#${f}`}>{labels[f]}</a>
          </li>
        ))}
      </ul>
    </Notice>
  );
}

export type OptionItem = {
  value: string;
  title: string;
  detail?: ReactNode;
  price?: ReactNode;
  disabled?: boolean;
};

/** Grupo de radios con forma de tarjeta (tipo de despacho, medio de pago, documento) */
export function OptionGroup({
  name,
  legend,
  options,
  value,
  onChange,
  error,
  inline,
  disabled,
}: {
  name: string;
  legend: string;
  options: OptionItem[];
  value: string | null;
  onChange: (value: string) => void;
  error?: string;
  inline?: boolean;
  disabled?: boolean;
}) {
  const errorId = `${name}-error`;
  return (
    <fieldset
      className={cx(styles.fieldset, error && styles.invalid)}
      id={name}
      tabIndex={-1}
      aria-describedby={error ? errorId : undefined}
      disabled={disabled}
    >
      <legend className={styles.legend}>{legend}</legend>
      <div className={cx(styles.options, inline && styles.inline)}>
        {options.map((o) => (
          <label key={o.value} className={styles.option}>
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              disabled={o.disabled}
              onChange={() => onChange(o.value)}
            />
            <span className={styles.optionBody}>
              <span className={styles.optionTitle}>{o.title}</span>
              {o.detail && <span className={styles.optionDetail}>{o.detail}</span>}
            </span>
            {o.price != null && <span className={styles.optionPrice}>{o.price}</span>}
          </label>
        ))}
      </div>
      {error && (
        <span className={styles.fieldError} id={errorId}>
          <Icon name="alert" size={16} />
          {error}
        </span>
      )}
    </fieldset>
  );
}
