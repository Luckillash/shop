"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./account.module.css";

// Direcciones, Favoritos y Datos personales se agregan con sus páginas en la 7.5 (D-026): hasta
// entonces no se muestran, para no enlazar a un 404.
const LINKS = [{ href: "/cuenta/pedidos", label: "Mis pedidos" }];

/** Enlaces del menú. pathname null = respaldo del <Suspense> (sin sección marcada) */
export function MenuLinks({ pathname }: { pathname: string | null }) {
  return LINKS.map((link) => {
    const inside = pathname !== null && (pathname === link.href || pathname.startsWith(`${link.href}/`));
    return (
      <li key={link.href}>
        <Link
          href={link.href}
          className={styles.menuLink}
          // En el Detalle, *Mis pedidos* sigue marcado como la sección actual
          aria-current={pathname === link.href ? "page" : inside ? "true" : undefined}
        >
          {link.label}
        </Link>
      </li>
    );
  });
}

/** Con la ruta actual: usePathname() en una ruta dinámica necesita su propio <Suspense> */
export function CurrentMenuLinks() {
  return <MenuLinks pathname={usePathname()} />;
}
