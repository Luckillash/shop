"use client";

import { startTransition, useActionState, useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { TextField } from "@/components/ui/text-field";
import { changePassword, saveProfile, setNewsletter, type PasswordState, type ProfileState } from "@/lib/account/actions";
import {
  MAX_NAME,
  PROFILE_FIELDS,
  PROFILE_MESSAGES,
  profileFieldError,
  type ProfileField,
  type ProfileValues,
} from "@/lib/account/profile";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/validation";
import type { FieldErrors } from "@/lib/checkout/validation";
import { formatChileanMobile } from "@/lib/format/phone";
import { formatRut } from "@/lib/format/rut";
import styles from "./account.module.css";

// Template DatosPersonales / DatosPersonalesMovil (7.5): *Tus datos*, *Contraseña* y *Correos de la
// tienda*. Formularios controlados (React 19 vacía los no controlados al volver con errores, trampa 56).

const PROFILE_IDLE: ProfileState = { status: "idle" };

export function ProfileForm({ initial, email, contactEmail }: { initial: ProfileValues; email: string; contactEmail: string }) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors<ProfileField>>({});
  const focusField = useRef<ProfileField | null>(null);
  const [state, action, pending] = useActionState(async (prev: ProfileState, formData: FormData) => {
    const next = await saveProfile(prev, formData);
    setErrors(next.status === "error" ? next.errors : {});
    if (next.status === "error") focusField.current = PROFILE_FIELDS.find((field) => next.errors[field]) ?? null;
    return next;
  }, PROFILE_IDLE);

  // El primer campo con error recibe el foco cuando el fieldset deja de estar deshabilitado
  useEffect(() => {
    if (pending || !focusField.current) return;
    document.getElementById(`profile-${focusField.current}`)?.focus();
    focusField.current = null;
  }, [pending]);
  const [dirty, setDirty] = useState(false);

  function set(field: ProfileField, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    setDirty(true);
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function blur(field: ProfileField, format?: (value: string) => string) {
    if (!values[field]) return;
    const error = profileFieldError(field, values);
    setErrors((e) => ({ ...e, [field]: error ?? undefined }));
    if (!error && format) setValues((v) => ({ ...v, [field]: format(v[field]) }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData();
    for (const field of PROFILE_FIELDS) formData.set(field, values[field]);
    setDirty(false);
    startTransition(() => action(formData));
  }

  return (
    <form className={styles.box} onSubmit={submit} noValidate aria-labelledby="tus-datos" aria-busy={pending || undefined}>
      <h2 id="tus-datos" className={styles.boxTitle}>
        Tus datos
      </h2>
      {state.status === "saved" && !dirty && <Notice tone="success">{PROFILE_MESSAGES.saved}</Notice>}
      {state.status === "error" && state.message && <Notice tone="danger">{state.message}</Notice>}
      <fieldset className={styles.fieldset} disabled={pending}>
        <legend className="sr-only">Tus datos</legend>
        <div className={styles.fieldGrid}>
          <TextField id="profile-firstName" label="Nombre" autoComplete="given-name" maxLength={MAX_NAME}
            value={values.firstName} error={errors.firstName}
            onChange={(e) => set("firstName", e.target.value)} onBlur={() => blur("firstName")} />
          <TextField id="profile-lastName" label="Apellido" autoComplete="family-name" maxLength={MAX_NAME}
            value={values.lastName} error={errors.lastName} onChange={(e) => set("lastName", e.target.value)} />
          <TextField id="profile-phone" label="Teléfono" type="tel" inputMode="tel" autoComplete="tel"
            placeholder="+56 9 1234 5678" value={values.phone} error={errors.phone}
            onChange={(e) => set("phone", e.target.value)} onBlur={() => blur("phone", formatChileanMobile)} />
          <TextField id="profile-rut" label="RUT (opcional)" inputMode="numeric" autoComplete="off" placeholder="12.345.678-5"
            hint="Para tu boleta o factura. No lo compartimos." value={values.rut} error={errors.rut}
            onChange={(e) => set("rut", e.target.value)} onBlur={() => blur("rut", formatRut)} />
        </div>
      </fieldset>
      <div className={styles.readonly}>
        <span className={styles.readonlyLabel}>Correo</span>
        <span className={styles.readonlyValue}>{email}</span>
        <span className={styles.note}>Es tu usuario para ingresar. Para cambiarlo, escríbenos a {contactEmail}.</span>
      </div>
      <div className={styles.formActions}>
        <Button type="submit" loading={pending}>
          {pending ? "Guardando" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}

const PASSWORD_IDLE: PasswordState = { status: "idle" };

/** Contraseña nueva: un campo (artboard). Al cambiarla se cierran las demás sesiones */
export function PasswordForm() {
  const [password, setPassword] = useState("");
  const [state, action, pending] = useActionState(async (prev: PasswordState, formData: FormData) => {
    const next = await changePassword(prev, formData);
    if (next.status === "changed") setPassword("");
    return next;
  }, PASSWORD_IDLE);
  const error = state.status === "error" ? state.errors.password : undefined;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData();
    formData.set("password", password);
    startTransition(() => action(formData));
  }

  return (
    <form className={styles.box} onSubmit={submit} noValidate aria-labelledby="contrasena" aria-busy={pending || undefined}>
      <div className={styles.boxHeading}>
        <h2 id="contrasena" className={styles.boxTitle}>
          Contraseña
        </h2>
        <p className={styles.mutedSmall}>Cerraremos tu sesión en los demás dispositivos.</p>
      </div>
      {state.status === "changed" && <Notice tone="success">{PROFILE_MESSAGES.passwordChanged}</Notice>}
      {state.status === "error" && state.message && <Notice tone="danger">{state.message}</Notice>}
      <TextField id="new-password" label="Contraseña nueva" type="password" autoComplete="new-password"
        hint={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres.`} value={password} error={error} disabled={pending}
        onChange={(e) => setPassword(e.target.value)} />
      <div className={styles.formActions}>
        <Button type="submit" variant="secondary" loading={pending}>
          {pending ? "Cambiando la contraseña" : "Cambiar contraseña"}
        </Button>
      </div>
    </form>
  );
}

/**
 * *Correos de la tienda* (decisión 7b): se guarda al marcar o desmarcar (el artboard no tiene botón).
 * profiles.newsletter_opt_in_at queda con la fecha de ese momento o vacía.
 */
export function NewsletterToggle({ initialOptedIn }: { initialOptedIn: boolean }) {
  const [optedIn, setOptedIn] = useState(initialOptedIn);
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; message: string } | null>(null);
  const [pending, startAction] = useTransition();

  function change(next: boolean) {
    setOptedIn(next);
    setFeedback(null);
    startAction(async () => {
      const result = await setNewsletter(next).catch(() => ({ ok: false as const, message: PROFILE_MESSAGES.generic }));
      if (result.ok) {
        setOptedIn(result.optedInAt !== null);
        setFeedback({ tone: "success", message: result.optedInAt ? PROFILE_MESSAGES.newsletterOn : PROFILE_MESSAGES.newsletterOff });
      } else {
        setOptedIn(!next);
        setFeedback({ tone: "danger", message: result.message });
      }
    });
  }

  return (
    <section className={styles.box} aria-labelledby="correos-tienda" aria-busy={pending || undefined}>
      <h2 id="correos-tienda" className={styles.boxTitle}>
        Correos de la tienda
      </h2>
      <label className={styles.check}>
        <input type="checkbox" checked={optedIn} disabled={pending} onChange={(e) => change(e.target.checked)} />
        <span>
          Quiero recibir novedades y ofertas por correo.
          <span className={styles.checkHint}>Los correos de tus pedidos te llegan siempre.</span>
        </span>
      </label>
      {feedback && <Notice tone={feedback.tone}>{feedback.message}</Notice>}
    </section>
  );
}
