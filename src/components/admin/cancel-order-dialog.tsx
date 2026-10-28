"use client";

import { useRef, useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Notice } from "@/components/ui/notice";
import { Select } from "@/components/ui/select";
import { TextField } from "@/components/ui/text-field";
import { cancelOrder } from "@/lib/admin/actions";
import { CANCEL_MOTIVES, NOTE_MAX, type CancelPlan } from "@/lib/admin/validation";
import { useAdminAction } from "./action-feedback";
import styles from "./admin.module.css";

// Template AdminAnularPedido: <dialog> modal (foco atrapado, Esc cierra). El motivo es el texto que
// lee el cliente (cancel_note); el plan del dinero lo calcula la página y lo vuelve a calcular la
// acción con el pedido de la BD.

type Props = {
  orderId: string;
  orderNumber: number;
  customer: string | null;
  email: string | null;
  plan: CancelPlan;
  triggerLabel: string;
  triggerVariant?: ButtonProps["variant"];
  triggerIcon?: ButtonProps["iconStart"];
};

export function CancelOrderDialog({ orderId, orderNumber, customer, email, plan, triggerLabel, triggerVariant = "secondary", triggerIcon }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [motive, setMotive] = useState<string>(CANCEL_MOTIVES[0].id);
  const close = () => dialog.current?.close();
  const { submit, pending, error } = useAdminAction(cancelOrder, close);
  const titleId = `anular-${orderNumber}-${triggerVariant}`;

  return (
    <>
      <Button variant={triggerVariant} iconStart={triggerIcon} onClick={() => dialog.current?.showModal()}>
        {triggerLabel}
      </Button>
      <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId}>
        <form className={styles.dialogForm} onSubmit={submit} noValidate aria-busy={pending || undefined}>
          <input type="hidden" name="orderId" value={orderId} />
          <div className={styles.dialogHead}>
            <div className={styles.headText}>
              <h2 id={titleId} className={styles.sectionTitle}>
                ¿Anular el pedido N.º&nbsp;{orderNumber}?
              </h2>
              <p className={styles.lead}>{[customer, plan.paidWith].filter(Boolean).join(" · ")}</p>
            </div>
            <IconButton icon="close" label="Cerrar" variant="ghost" onClick={close} />
          </div>
          {error && !error.errors && <Notice tone="danger">{error.message}</Notice>}
          <Select
            name="motive"
            label="Motivo"
            options={CANCEL_MOTIVES.map((m) => ({ value: m.id, label: m.label }))}
            value={motive}
            onChange={(event) => setMotive(event.target.value)}
            hint={
              motive === "ninguno"
                ? "El cliente leerá «Tuvimos que anular tu pedido. Lo sentimos.»"
                : "Lo verá el cliente en el correo de anulación y en Mis pedidos."
            }
          />
          {motive === "otro" && (
            <TextField
              name="note"
              label="Escribe el motivo"
              hint="Escríbelo para el cliente, de tú."
              maxLength={NOTE_MAX}
              autoComplete="off"
              error={error?.errors?.note}
            />
          )}
          {email && (
            <label className={styles.check}>
              <input type="checkbox" name="notify" defaultChecked />
              <span>Avisar al cliente por correo a {email}</span>
            </label>
          )}
          <Notice tone="warning" title="Esto no se puede deshacer">
            {plan.notice}
          </Notice>
          <div className={styles.dialogActions}>
            <Button variant="secondary" onClick={close}>
              Volver al pedido
            </Button>
            <Button type="submit" iconStart="close" loading={pending}>
              {pending ? "Anulando" : plan.confirmLabel}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
