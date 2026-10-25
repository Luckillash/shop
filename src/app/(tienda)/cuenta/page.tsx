import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import styles from "@/components/auth/auth.module.css";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Mi cuenta", robots: { index: false } };

// Provisoria (fase 5): correo y *Cerrar sesión*. Mis pedidos, Direcciones y Datos personales llegan
// en la fase 7 (rutas-y-paginas.md#cuenta). Requiere una sesión no anónima.
export default function AccountPage() {
  return (
    <main className={styles.main}>
      <Suspense fallback={null}>
        <Account />
      </Suspense>
    </main>
  );
}

async function Account() {
  const user = await getSessionUser();
  if (!user || user.isAnonymous) redirect("/ingresar?volver=/cuenta");

  return (
    <section className={styles.account} aria-labelledby="mi-cuenta">
      <h1 id="mi-cuenta" className={styles.title}>
        Mi cuenta
      </h1>
      <p className={styles.lead}>Ingresaste como {user.email}.</p>
      <Button href="/">Seguir comprando</Button>
      <SignOutButton />
    </section>
  );
}
