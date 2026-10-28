"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Notice } from "@/components/ui/notice";
import { TextField } from "@/components/ui/text-field";
import { signIn, signUp, startGuestCheckout } from "@/lib/auth/actions";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/validation";
import { useCartStore } from "@/store/cart-store";
import { useHydrated } from "@/components/cart/use-hydrated";
import { useAuthAction } from "./use-auth-action";
import styles from "./auth.module.css";

// Template Ingresar o crear cuenta: dos columnas. Al entrar, el carro se fusiona con el guardado
// en la cuenta (D-018) y se vuelve a `next` (?volver=).

function formDataOf(event: FormEvent<HTMLFormElement>): FormData {
  event.preventDefault();
  return new FormData(event.currentTarget);
}

/** `favorite`: producto que se quiso guardar sin cuenta; la acción lo guarda al ingresar (7.5) */
export function LoginForm({ next, favorite = null }: { next: string; favorite?: string | null }) {
  const { state, submit, pending } = useAuthAction(signIn);
  const errors = state.status === "error" ? state.errors : {};
  const [email, setEmail] = useState("");

  return (
    <form className={styles.form} onSubmit={(e) => submit(formDataOf(e))} noValidate aria-busy={pending || undefined}>
      {state.status === "error" && state.message && <Notice tone="danger">{state.message}</Notice>}
      <input type="hidden" name="next" value={next} />
      {favorite && <input type="hidden" name="favorite" value={favorite} />}
      <TextField id="login-email" name="email" label="Correo" type="email" autoComplete="email" inputMode="email"
        spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} disabled={pending} />
      <TextField id="login-password" name="password" label="Contraseña" type="password" autoComplete="current-password"
        error={errors.password} disabled={pending} />
      <Link href="/ingresar/recuperar" className={styles.forgot}>
        ¿Olvidaste tu contraseña?
      </Link>
      <Button type="submit" size="lg" block loading={pending}>
        {pending ? "Ingresando" : "Ingresar"}
      </Button>
    </form>
  );
}

export function SignupForm({ next, favorite = null }: { next: string; favorite?: string | null }) {
  const { state, submit, pending } = useAuthAction(signUp);
  const errors = state.status === "error" ? state.errors : {};
  const [values, setValues] = useState({ name: "", email: "" });

  if (state.status === "confirm-email") {
    return (
      <Notice tone="success" title="Revisa tu correo">
        Te enviamos un enlace a {state.email} para confirmar tu cuenta. Al abrirlo, quedas con tu sesión iniciada.
        Revisa también la carpeta de spam.
      </Notice>
    );
  }

  return (
    <form className={styles.form} onSubmit={(e) => submit(formDataOf(e))} noValidate aria-busy={pending || undefined}>
      {state.status === "error" && state.message && <Notice tone="danger">{state.message}</Notice>}
      <input type="hidden" name="next" value={next} />
      {favorite && <input type="hidden" name="favorite" value={favorite} />}
      <TextField id="signup-name" name="name" label="Nombre" autoComplete="given-name" value={values.name}
        onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} error={errors.name} disabled={pending} />
      <TextField id="signup-email" name="email" label="Correo" type="email" autoComplete="email" inputMode="email"
        spellCheck={false} value={values.email} onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
        error={errors.email} disabled={pending} />
      <TextField id="signup-password" name="password" label="Contraseña" type="password" autoComplete="new-password"
        hint={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres.`} error={errors.password} disabled={pending} />
      <label className={styles.check}>
        <input type="checkbox" name="newsletter" disabled={pending} />
        <span>Quiero recibir novedades y ofertas por correo.</span>
      </label>
      <Button type="submit" variant="secondary" size="lg" block loading={pending}>
        {pending ? "Creando tu cuenta" : "Crear cuenta"}
      </Button>
      <p className={styles.legal}>
        Al crear tu cuenta aceptas los <Link href="/ayuda/terminos">términos y condiciones</Link> y la{" "}
        <Link href="/ayuda/privacidad">política de privacidad</Link>.
      </p>
    </form>
  );
}

/** *Comprar como invitado* (solo con productos en el carro): crea la sesión anónima y va al checkout */
export function GuestCheckoutButton() {
  const hydrated = useHydrated();
  const hasItems = useCartStore((s) => s.items.length > 0);
  const { state, submit, pending } = useAuthAction(startGuestCheckout);
  if (!hydrated || !hasItems) return null;

  return (
    <form className={styles.guest} onSubmit={(e) => submit(formDataOf(e))}>
      {state.status === "error" && state.message && <Notice tone="danger">{state.message}</Notice>}
      <Button type="submit" variant="ghost" loading={pending} iconEnd="chevronRight">
        {pending ? "Preparando tu compra" : "Comprar como invitado"}
      </Button>
    </form>
  );
}

export function Benefits() {
  return (
    <ul className={styles.benefits}>
      <li>
        <Icon name="truck" size={20} />
        Sigue el estado de tus pedidos
      </li>
      <li>
        <Icon name="check" size={20} />
        Guarda tus direcciones y compra más rápido
      </li>
      <li>
        <Icon name="heart" size={20} />
        Guarda tus favoritos
      </li>
    </ul>
  );
}
