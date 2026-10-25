"use client";

import { useActionState, useState, startTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { saveContact, type ContactState } from "@/lib/checkout/actions";
import { validateContact } from "@/lib/checkout/validation";
import { StepCard } from "./parts";
import styles from "./checkout.module.css";

type ContactStepProps = {
  state: "current" | "done";
  email: string | null;
  onSaved: (email: string) => void;
  onEdit: () => void;
  editDisabled?: boolean;
};

const IDLE: ContactState = { status: "idle" };

// Paso 1: el correo donde llegan la boleta y el seguimiento
export function ContactStep({ state, email, onSaved, onEdit, editDisabled }: ContactStepProps) {
  const [value, setValue] = useState(email ?? "");
  const [error, setError] = useState<string | undefined>();
  const [, action, pending] = useActionState(async (prev: ContactState, formData: FormData) => {
    const next = await saveContact(prev, formData);
    setError(next.status === "error" ? next.errors.email : undefined);
    if (next.status === "saved") onSaved(next.email);
    return next;
  }, IDLE);

  if (state === "done") {
    return (
      <StepCard step="contact" number={1} state="done" onEdit={onEdit} editDisabled={editDisabled}>
        <p className={styles.done}>{email}</p>
      </StepCard>
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData();
    formData.set("email", value);
    startTransition(() => action(formData));
  }

  return (
    <StepCard step="contact" number={1} state="current">
      <form className={styles.form} onSubmit={submit} noValidate>
        <TextField
          id="email"
          label="Correo"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          value={value}
          hint="Ahí te enviamos la boleta y el seguimiento de tu pedido."
          error={error}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            const checked = validateContact({ email: value });
            setError(value && !checked.ok ? checked.errors.email : undefined);
          }}
        />
        <div className={styles.actions}>
          <Button type="submit" size="lg" loading={pending}>
            {pending ? "Guardando" : "Continuar al despacho"}
          </Button>
        </div>
      </form>
    </StepCard>
  );
}
