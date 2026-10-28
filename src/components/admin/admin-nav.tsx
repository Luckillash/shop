"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./admin.module.css";

// Pedidos (la lista y cada pedido) y Alertas de pago, con la página actual marcada
export function AdminNav({ openAlerts }: { openAlerts: number }) {
  const pathname = usePathname();
  const onAlerts = pathname.startsWith("/admin/alertas");
  return (
    <nav aria-label="Administración" className={styles.nav}>
      <ul className={styles.navList}>
        <li>
          <Link href="/admin" className={styles.navLink} aria-current={onAlerts ? undefined : "page"}>
            Pedidos
          </Link>
        </li>
        <li>
          <Link href="/admin/alertas" className={styles.navLink} aria-current={onAlerts ? "page" : undefined}>
            Alertas de pago
            {openAlerts > 0 && (
              <>
                <span className={styles.count} aria-hidden="true">
                  {openAlerts}
                </span>
                <span className="sr-only">
                  {openAlerts === 1 ? "1 sin resolver" : `${openAlerts} sin resolver`}
                </span>
              </>
            )}
          </Link>
        </li>
      </ul>
    </nav>
  );
}
