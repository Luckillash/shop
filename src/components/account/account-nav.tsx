import { Suspense, type ReactNode } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { CurrentMenuLinks, MenuLinks } from "./account-menu-links";
import styles from "./account.module.css";

// Menú de la cuenta (MisPedidos: columna de 220px; MisPedidosMovil: chips con scroll)
export function AccountNav({ greeting }: { greeting: ReactNode }) {
  return (
    <nav aria-label="Mi cuenta" className={styles.nav}>
      <p className={styles.greeting}>{greeting}</p>
      <ul className={styles.menu}>
        <Suspense fallback={<MenuLinks pathname={null} />}>
          <CurrentMenuLinks />
        </Suspense>
        <li className={styles.menuSignOut}>
          <SignOutButton variant="ghost" block className={styles.signOutLink} />
        </li>
      </ul>
    </nav>
  );
}
