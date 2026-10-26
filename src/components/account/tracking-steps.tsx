import { cx } from "@/components/ui/cx";
import { Icon } from "@/components/ui/icon";
import type { TrackingStep } from "@/lib/orders/customer-view";
import styles from "./account.module.css";

const STATE_LABEL = { done: "hecho", current: "en curso", pending: "pendiente" } as const;

// Línea de tiempo del Detalle de pedido: 4 columnas en escritorio (DetallePedido) y vertical en
// móvil (DetallePedidoMovil). El paso en curso lleva aria-current="step".
export function TrackingSteps({ steps }: { steps: TrackingStep[] }) {
  return (
    <ol aria-label="Estado del despacho" className={styles.steps}>
      {steps.map((step, index) => {
        const next = steps[index + 1];
        return (
          <li key={step.name} className={styles.step} aria-current={step.state === "current" ? "step" : undefined}>
            <div className={styles.stepTrack}>
              <span className={cx(styles.stepMark, styles[`step_${step.state}`])}>
                {step.state === "done" && <Icon name="check" size={16} />}
                {step.state === "current" && <Icon name={step.name === "En camino" ? "truck" : "info"} size={16} />}
              </span>
              {next && (
                <span
                  aria-hidden="true"
                  className={cx(styles.stepLine, step.state === "done" && next.state !== "pending" && styles.stepLineDone)}
                />
              )}
            </div>
            <div className={styles.stepText}>
              <strong className={styles.stepName}>
                {step.name}
                <span className="sr-only"> ({STATE_LABEL[step.state]})</span>
              </strong>
              {step.detail && <span className={styles.muted}>{step.detail}</span>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
