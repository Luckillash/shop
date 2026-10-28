import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminNav } from "./admin-nav";
import styles from "./admin.module.css";

// Template AdminHeader: sin el header de la tienda. El número rojo son las alertas sin resolver
export function AdminHeader({ openAlerts }: { openAlerts: number }) {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <div className={styles.brand}>
          <Link href="/admin" className={styles.logo}>
            Almacén
          </Link>
          <Badge icon="lock">Administración</Badge>
        </div>
        <AdminNav openAlerts={openAlerts} />
        <div className={styles.headerActions}>
          <Button href="/" variant="ghost" size="sm">
            Ver la tienda
          </Button>
          <SignOutButton variant="ghost" size="sm" />
        </div>
      </div>
    </header>
  );
}
