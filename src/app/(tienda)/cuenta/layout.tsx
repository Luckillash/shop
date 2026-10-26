import { Suspense, type ReactNode } from "react";
import { AccountNav } from "@/components/account/account-nav";
import styles from "@/components/account/account.module.css";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { getFirstName } from "@/lib/orders/account";
import { getSessionUser } from "@/lib/auth/session";

// Layout de la cuenta: menú y contenido. No protege las páginas: cada una verifica la sesión no
// anónima (rutas-y-paginas.md#cuenta). El saludo lee la sesión, así que va en su propio <Suspense>.
export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <main className={styles.page}>
      <AccountNav
        greeting={
          <Suspense fallback={null}>
            <Greeting />
          </Suspense>
        }
      />
      <div className={styles.content}>
        {children}
        {/* En móvil, *Cerrar sesión* va al final (MisPedidosMovil) */}
        <div className={styles.mobileSignOut}>
          <SignOutButton variant="ghost" block />
        </div>
      </div>
    </main>
  );
}

async function Greeting() {
  const user = await getSessionUser();
  if (!user || user.isAnonymous) return null;
  const name = await getFirstName(user.id);
  return name ? `Hola, ${name}` : "Hola";
}
