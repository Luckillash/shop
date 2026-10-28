"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { TextField } from "@/components/ui/text-field";
import {
  createGuestAccount,
  resendGuestAccountEmail,
  type GuestAccountState,
  type ResendState,
} from "@/lib/auth/actions";
import { emailSentText, emailTakenText, GUEST_ACCOUNT_NEXT } from "@/lib/auth/guest-account";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/validation";
import styles from "./auth.module.css";

// Template ConfirmacionCrearCuenta: el invitado guarda sus datos con una contraseña. El correo es
// el del pedido y no se puede cambiar (la acción lo vuelve a leer del pedido). Con la
// confirmación de correo activada, el aviso final es *Revisa tu correo para terminar* y no
// *Listo, creamos tu cuenta* del diseño (D-027).

const IDLE: GuestAccountState = { status: "idle" };

type Props = {
  orderId: string;
  orderNumber: number;
  email: string;
  /** Correo que ya pidió y no confirma (al recargar la página) */
  pendingEmail: string | null;
  /** Título y texto de otro lugar (Escribe tu opinión, 7.6); por defecto, los de la Confirmación */
  title?: string;
  lead?: string;
};

export function GuestAccountForm({ orderId, orderNumber, email, pendingEmail, title, lead }: Props) {
  const [state, dispatch, pending] = useActionState(createGuestAccount, IDLE);
  const [newsletter, setNewsletter] = useState(false);

  if (pendingEmail || state.status === "sent") {
    return <EmailSent email={state.status === "sent" ? state.email : pendingEmail!} />;
  }
  if (state.status === "error" && state.emailTaken) {
    const text = emailTakenText(state.emailTaken);
    return (
      <Notice tone="warning" title={text.title}>
        {text.body}
        {/* Debajo del texto, como el enlace del aviso de la Confirmación: el action lateral angosta el texto en móvil */}
        <Link href={`/ingresar?volver=${encodeURIComponent(GUEST_ACCOUNT_NEXT)}`} className={styles.noticeLink}>
          Ingresar
        </Link>
      </Notice>
    );
  }

  const errors = state.status === "error" ? state.errors : {};

  // Formulario controlado: React 19 vaciaría la casilla al volver con errores (trampa 56)
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  return (
    <form
      className={styles.guestAccount}
      aria-labelledby="crear-cuenta"
      onSubmit={onSubmit}
      noValidate
      aria-busy={pending || undefined}
    >
      <div className={styles.guestHead}>
        <h2 id="crear-cuenta" className={styles.guestTitle}>
          {title ?? "Guarda tus datos para la próxima compra"}
        </h2>
        <p>{lead ?? `Solo falta una contraseña. El pedido N.º ${orderNumber} y tu dirección quedan en tu cuenta.`}</p>
      </div>
      {state.status === "error" && state.message && <Notice tone="danger">{state.message}</Notice>}
      <input type="hidden" name="order" value={orderId} />
      <div className={styles.guestFields}>
        <div className={styles.fixedField}>
          <span className={styles.fixedLabel}>Correo</span>
          <span className={styles.fixedValue}>{email}</span>
        </div>
        <TextField
          id="guest-password"
          name="password"
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          hint={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres.`}
          error={errors.password}
          disabled={pending}
          className={styles.guestPassword}
        />
      </div>
      {/* Para que el gestor de contraseñas guarde el correo junto con la contraseña */}
      <input type="email" name="username" value={email} autoComplete="username" readOnly hidden />
      <label className={styles.check}>
        <input
          type="checkbox"
          name="newsletter"
          checked={newsletter}
          onChange={(e) => setNewsletter(e.target.checked)}
          disabled={pending}
        />
        <span>Quiero recibir novedades y ofertas por correo.</span>
      </label>
      <div className={styles.guestActions}>
        <Button type="submit" variant="secondary" loading={pending}>
          {pending ? "Creando tu cuenta" : "Crear cuenta"}
        </Button>
        <span className={styles.legal}>
          Al crearla aceptas los <Link href="/ayuda/terminos">términos y condiciones</Link>.
        </span>
      </div>
    </form>
  );
}

const RESEND_IDLE: ResendState = { status: "idle" };

function EmailSent({ email }: { email: string }) {
  const [state, resend, pending] = useActionState(() => resendGuestAccountEmail(), RESEND_IDLE);
  const text = emailSentText(email);
  return (
    <Notice title={text.title}>
      {text.body}
      {state.status === "resent" && <span className={styles.noticeLine}>Te enviamos el correo de nuevo.</span>}
      {state.status === "error" && <span className={styles.noticeLine}>{state.message}</span>}
      <form action={resend} className={styles.noticeAction}>
        <Button type="submit" variant="ghost" size="sm" loading={pending}>
          {pending ? "Reenviando" : "Reenviar el correo"}
        </Button>
      </form>
    </Notice>
  );
}
