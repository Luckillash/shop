"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import type { IconName } from "@/components/ui/icon";
import { Notice } from "@/components/ui/notice";
import { Select } from "@/components/ui/select";
import { TextField } from "@/components/ui/text-field";
import {
  confirmTransfer,
  markDelivered,
  markShipped,
  markTransferRefunded,
  refundCancelledOrder,
  resolveAlert,
  startPreparing,
  type AdminActionState,
} from "@/lib/admin/actions";
import { OPERATION_MAX, TRACKING_MAX } from "@/lib/admin/validation";
import { CARRIERS } from "@/lib/orders/customer-view";
import { STORE } from "@/lib/store";
import { useAdminAction } from "./action-feedback";
import styles from "./admin.module.css";

// Formularios de la tarjeta *Siguiente paso* de AdminPedido (y AdminPedidoMovil). Solo envían el id
// del pedido y lo que escribe el admin: el estado, los montos y la transición los verifica la acción.
// La acción secundaria (*No llegó: anular pedido*, que trae su propio <form> en un <dialog>) va fuera
// del <form>: el botón primary se asocia con el atributo `form`, así no quedan formularios anidados.

/** *Confirmar pago recibido* con el N.º de operación opcional */
export function ConfirmTransferForm({ orderId, secondary }: { orderId: string; secondary?: React.ReactNode }) {
  const { submit, pending, error } = useAdminAction(confirmTransfer);
  const formId = useId();
  return (
    <div className={styles.stepBody}>
      <form id={formId} className={styles.stepBody} onSubmit={submit} noValidate aria-busy={pending || undefined}>
        <input type="hidden" name="orderId" value={orderId} />
        {error && !error.errors && <Notice tone="danger">{error.message}</Notice>}
        <TextField
          name="operation"
          label="Número de operación (opcional)"
          hint="Lo copias de la cartola. Queda en el historial del pedido."
          placeholder="Por ejemplo 000123456789"
          maxLength={OPERATION_MAX}
          autoComplete="off"
          error={error?.errors?.operation}
        />
      </form>
      <div className={styles.actions}>
        <Button type="submit" form={formId} size="lg" iconStart="check" loading={pending}>
          {pending ? "Confirmando" : "Confirmar pago recibido"}
        </Button>
        {secondary}
      </div>
    </div>
  );
}

type SimpleStep = {
  action: (prev: AdminActionState, formData: FormData) => Promise<AdminActionState>;
  label: string;
  pending: string;
  icon?: IconName;
};

const SIMPLE: Record<"start" | "deliver" | "pickedUp" | "refund" | "transferRefunded", SimpleStep> = {
  start: { action: startPreparing, label: "Empezar a preparar", pending: "Guardando" },
  deliver: { action: markDelivered, label: "Marcar como entregado", pending: "Guardando", icon: "check" },
  pickedUp: { action: markDelivered, label: "Marcar como retirado", pending: "Guardando", icon: "check" },
  refund: { action: refundCancelledOrder, label: "Reembolsar", pending: "Reembolsando", icon: "returns" },
  transferRefunded: { action: markTransferRefunded, label: "Ya devolví el dinero", pending: "Guardando", icon: "check" },
};

/** Un paso que es solo un botón (preparar, entregar, reembolsar, ya devolví el dinero) */
export function StepButtonForm({
  orderId,
  step,
  label,
  secondary,
}: {
  orderId: string;
  step: keyof typeof SIMPLE;
  /** Reemplaza el texto del botón (*Reembolsar $16.480 en Flow*) */
  label?: string;
  secondary?: React.ReactNode;
}) {
  const config = SIMPLE[step];
  const { submit, pending, error } = useAdminAction(config.action);
  const formId = useId();
  return (
    <div className={styles.stepBody}>
      <form id={formId} className={styles.contents} onSubmit={submit} aria-busy={pending || undefined}>
        <input type="hidden" name="orderId" value={orderId} />
        {error && <Notice tone="danger">{error.message}</Notice>}
      </form>
      <div className={styles.actions}>
        <Button type="submit" form={formId} size="lg" iconStart={config.icon} loading={pending}>
          {pending ? config.pending : (label ?? config.label)}
        </Button>
        {secondary}
      </div>
    </div>
  );
}

/** *Marcar como enviado* (transportista de CARRIERS y código) o, en el retiro, *listo para retirar* */
export function ShipForm({ orderId, pickup }: { orderId: string; pickup: boolean }) {
  const { submit, pending, error } = useAdminAction(markShipped);
  const [carrier, setCarrier] = useState<string>(CARRIERS[0].name);
  const own = carrier === STORE.name;
  return (
    <form className={styles.stepBody} onSubmit={submit} noValidate aria-busy={pending || undefined}>
      <input type="hidden" name="orderId" value={orderId} />
      {error && !error.errors && <Notice tone="danger">{error.message}</Notice>}
      {!pickup && (
        <div className={styles.fields}>
          <Select
            name="carrier"
            label="Transportista"
            options={CARRIERS.map((c) => ({ value: c.name, label: c.label }))}
            value={carrier}
            onChange={(event) => setCarrier(event.target.value)}
            error={error?.errors?.carrier}
          />
          <TextField
            name="tracking"
            label={own ? "Código de seguimiento (opcional)" : "Código de seguimiento"}
            placeholder="9845 1230 7716"
            hint="Tal como aparece en la etiqueta."
            maxLength={TRACKING_MAX}
            autoComplete="off"
            error={error?.errors?.tracking}
          />
        </div>
      )}
      <div className={styles.actions}>
        <Button type="submit" size="lg" iconStart={pickup ? "check" : "truck"} loading={pending}>
          {pending ? "Guardando" : pickup ? "Marcar como listo para retirar" : "Marcar como enviado"}
        </Button>
      </div>
    </form>
  );
}

/** *Marcar como resuelta* de AdminAlertas */
export function ResolveAlertForm({ alertId }: { alertId: string }) {
  const { submit, pending, error } = useAdminAction(resolveAlert);
  return (
    <form onSubmit={submit} aria-busy={pending || undefined}>
      <input type="hidden" name="alertId" value={alertId} />
      {error && <Notice tone="danger">{error.message}</Notice>}
      <Button type="submit" variant="secondary" size="sm" iconStart="check" loading={pending}>
        {pending ? "Guardando" : "Marcar como resuelta"}
      </Button>
    </form>
  );
}
