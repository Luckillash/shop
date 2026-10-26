"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { TextField } from "@/components/ui/text-field";
import {
  requestPasswordReset,
  updatePassword,
  type NewPasswordState,
  type ResetRequestState,
} from "@/lib/auth/actions";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/validation";
import styles from "./auth.module.css";

// *¿Olvidaste tu contraseña?*: pedir el enlace (/ingresar/recuperar) y crear la contraseña nueva
// (/ingresar/nueva-contrasena). Se envían con startTransition para que React 19 no vacíe el
// formulario cuando la acción devuelve errores (trampa 56).

function submitWith(dispatch: (formData: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  };
}

export function ResetRequestForm() {
  const [state, dispatch, pending] = useActionState(requestPasswordReset, { status: "idle" } as ResetRequestState);
  const [email, setEmail] = useState("");

  if (state.status === "sent") {
    return (
      <Notice tone="success" title="Revisa tu correo">
        Si hay una cuenta con {state.email}, te enviamos un enlace para crear una contraseña nueva. Vence en una hora.
        Revisa también la carpeta de spam.
      </Notice>
    );
  }

  const errors = state.status === "error" ? state.errors : {};
  return (
    <form className={styles.form} onSubmit={submitWith(dispatch)} noValidate aria-busy={pending || undefined}>
      {state.status === "error" && state.message && <Notice tone="danger">{state.message}</Notice>}
      <TextField id="reset-email" name="email" label="Correo" type="email" autoComplete="email" inputMode="email"
        spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email}
        disabled={pending} />
      <Button type="submit" size="lg" block loading={pending}>
        {pending ? "Enviando" : "Enviar enlace"}
      </Button>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, dispatch, pending] = useActionState(updatePassword, { status: "idle" } as NewPasswordState);

  if (state.status === "updated") {
    return (
      <div className={styles.form}>
        <Notice tone="success" title="Actualizamos tu contraseña">
          Ya puedes usarla para ingresar. Tu sesión sigue abierta en este dispositivo.
        </Notice>
        <Button href="/" size="lg" block>
          Seguir comprando
        </Button>
      </div>
    );
  }

  const errors = state.status === "error" ? state.errors : {};
  return (
    <form className={styles.form} onSubmit={submitWith(dispatch)} noValidate aria-busy={pending || undefined}>
      {state.status === "error" && state.message && <Notice tone="danger">{state.message}</Notice>}
      <TextField id="new-password" name="password" label="Contraseña nueva" type="password" autoComplete="new-password"
        hint={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres.`} error={errors.password} disabled={pending} />
      <TextField id="confirm-password" name="confirm" label="Repite la contraseña nueva" type="password"
        autoComplete="new-password" error={errors.confirm} disabled={pending} />
      <Button type="submit" size="lg" block loading={pending}>
        {pending ? "Guardando" : "Guardar contraseña"}
      </Button>
    </form>
  );
}
