"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./account.module.css";

// Secciones de la cuenta (MisPedidos): Mis pedidos (7.1) y Direcciones, Favoritos y Datos personales (7.5)
const LINKS = [
  { href: "/cuenta/pedidos", label: "Mis pedidos" },
  { href: "/cuenta/direcciones", label: "Direcciones" },
  { href: "/cuenta/favoritos", label: "Favoritos" },
  { href: "/cuenta/datos", label: "Datos personales" },
];

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

/**
 * Con la ruta actual: usePathname() en una ruta dinámica necesita su propio <Suspense>. En móvil
 * los chips se desplazan a lo ancho: el de la sección actual se lleva a la vista (Datos personales
 * queda fuera a 390 px).
 */
export function CurrentMenuLinks() {
  const pathname = usePathname();
  const marker = useRef<HTMLLIElement>(null);
  useEffect(() => {
    const current = marker.current?.closest("ul")?.querySelector<HTMLElement>("[aria-current]");
    const scroller = current?.closest("nav");
    if (!current || !scroller || scroller.scrollWidth <= scroller.clientWidth) return;
    scroller.scrollTo({ left: current.offsetLeft - scroller.clientWidth / 2 + current.offsetWidth / 2 });
  }, [pathname]);
  return (
    <>
      <MenuLinks pathname={pathname} />
      <li ref={marker} hidden />
    </>
  );
}
