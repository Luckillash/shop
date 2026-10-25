import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import styles from "@/components/auth/auth.module.css";
import { cx } from "@/components/ui/cx";
import { ResetRequestForm } from "@/components/auth/password-forms";
import { Notice } from "@/components/ui/notice";
import { AUTH_MESSAGES } from "@/lib/auth/validation";

export const metadata: Metadata = { title: "Recuperar contraseña", robots: { index: false } };

type SearchParams = Promise<{ error?: string }>;

// *¿Olvidaste tu contraseña?*: pide el correo y envía el enlace (requestPasswordReset).
// ?error=enlace llega desde /auth/confirm cuando el enlace venció o ya se usó.
export default function ResetPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className={cx(styles.main, styles.narrow)}>
      <section className={styles.panel} aria-labelledby="recuperar">
        <h1 id="recuperar" className={styles.title}>
          Recupera tu contraseña
        </h1>
        <p className={styles.lead}>Escribe el correo de tu cuenta y te enviaremos un enlace para crear una contraseña nueva.</p>
        <Suspense fallback={null}>
          <ExpiredLinkNotice searchParams={searchParams} />
        </Suspense>
        <ResetRequestForm />
        <p className={styles.lead}>
          <Link href="/ingresar" className={styles.inlineLink}>
            Volver a Ingresar
          </Link>
        </p>
      </section>
    </main>
  );
}

async function ExpiredLinkNotice({ searchParams }: { searchParams: SearchParams }) {
  const { error } = await searchParams;
  return error === "enlace" ? <Notice tone="danger">{AUTH_MESSAGES.resetExpired}</Notice> : null;
}
