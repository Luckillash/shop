import { Suspense } from "react";
import type { Metadata } from "next";
import styles from "@/components/auth/auth.module.css";
import { cx } from "@/components/ui/cx";
import { NewPasswordForm } from "@/components/auth/password-forms";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { getSessionUser } from "@/lib/auth/session";
import { AUTH_MESSAGES } from "@/lib/auth/validation";

export const metadata: Metadata = { title: "Contraseña nueva", robots: { index: false } };

// Destino del enlace de recuperación (/auth/confirm crea la sesión antes de llegar aquí).
// Sin sesión, o con una anónima, el enlace venció o se abrió en otro navegador.
export default function NewPasswordPage() {
  return (
    <main className={cx(styles.main, styles.narrow)}>
      <section className={styles.panel} aria-labelledby="nueva-contrasena">
        <h1 id="nueva-contrasena" className={styles.title}>
          Crea una contraseña nueva
        </h1>
        <Suspense fallback={null}>
          <Content />
        </Suspense>
      </section>
    </main>
  );
}

async function Content() {
  const user = await getSessionUser();
  if (!user || user.isAnonymous) {
    return (
      <>
        <Notice tone="danger">{AUTH_MESSAGES.resetExpired}</Notice>
        <Button href="/ingresar/recuperar" size="lg" block>
          Pedir un enlace nuevo
        </Button>
      </>
    );
  }
  return (
    <>
      <p className={styles.lead}>Para la cuenta {user.email}.</p>
      <NewPasswordForm />
    </>
  );
}
