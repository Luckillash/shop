import { Suspense } from "react";
import type { Metadata } from "next";
import { Benefits, GuestCheckoutButton, LoginForm, SignupForm } from "@/components/auth/auth-forms";
import styles from "@/components/auth/auth.module.css";
import { cx } from "@/components/ui/cx";
import { Notice } from "@/components/ui/notice";
import { safeNext } from "@/lib/auth/validation";
import { isProductId } from "@/lib/wishlist/state";

export const metadata: Metadata = { title: "Ingresar o crear cuenta", robots: { index: false } };

type SearchParams = Promise<{ volver?: string; error?: string; favorito?: string }>;

// Template Ingresar o crear cuenta. ?volver= lleva de vuelta (por ejemplo, al checkout). Los
// formularios dependen de searchParams, así que van dentro de <Suspense>. ?favorito= trae el
// producto que se quiso guardar sin cuenta (B23): se guarda al ingresar (D-030).
export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className={styles.main}>
      <Suspense fallback={<Columns next="/" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Content({ searchParams }: { searchParams: SearchParams }) {
  const { volver, error, favorito } = await searchParams;
  const favorite = isProductId(favorito) ? favorito : null;
  return (
    <>
      {error === "confirmacion" && (
        <Notice tone="danger">
          El enlace para confirmar tu correo no es válido o ya venció. Ingresa con tu correo y contraseña, o crea la
          cuenta otra vez.
        </Notice>
      )}
      {favorite && (
        <Notice tone="info">Ingresa o crea tu cuenta para guardar tus favoritos. Lo que elegiste se guarda al ingresar.</Notice>
      )}
      <Columns next={safeNext(volver)} favorite={favorite} />
    </>
  );
}

function Columns({ next, favorite = null }: { next: string; favorite?: string | null }) {
  return (
    <div className={styles.columns}>
      <section className={styles.panel} aria-labelledby="ingresar">
        <h1 id="ingresar" className={styles.title}>
          Ingresar
        </h1>
        <LoginForm next={next} favorite={favorite} />
        <GuestCheckoutButton />
      </section>
      <section className={cx(styles.panel, styles.promo)} aria-labelledby="crear-cuenta">
        <h2 id="crear-cuenta" className={styles.title}>
          Crear cuenta
        </h2>
        <Benefits />
        <SignupForm next={next} favorite={favorite} />
      </section>
    </div>
  );
}
