import Form from "next/form";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import fieldStyles from "@/components/ui/field.module.css";
import { cx } from "@/components/ui/cx";
import { getCategories } from "@/lib/catalog/queries";
import { formatCLP } from "@/lib/format/clp";
import { STORE } from "@/lib/store";
import { CartLink } from "./cart-link";
import styles from "./header.module.css";

// Header de la tienda (templates Header y HeaderMovil). Responsivo: en móvil la navegación
// pasa a un menú desplegable y el buscador baja a su propia fila.
export async function Header() {
  const categories = await getCategories();
  const links = [
    ...categories.map((c) => ({ href: `/categorias/${c.slug}`, label: c.name })),
    { href: "/ofertas", label: "Ofertas" },
  ];

  return (
    <header className={styles.header}>
      <p className={styles.promo}>
        Despacho gratis sobre {formatCLP(STORE.freeShippingThreshold)}
        <span className={styles.promoExtra}>
          {" · "}
          <Link href="/ayuda/despacho">Revisa los plazos para tu comuna</Link>
        </span>
      </p>
      <div className={styles.bar}>
        <details className={styles.menu}>
          <summary className={styles.menuButton} aria-label="Abrir menú">
            <Icon name="menu" />
          </summary>
          <nav aria-label="Categorías" className={styles.menuPanel}>
            <ul>
              {links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </details>

        <Link href="/" className={styles.logo}>
          {STORE.name}
        </Link>

        <nav aria-label="Categorías" className={styles.nav}>
          <ul>
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <Form action="/buscar" role="search" className={styles.search}>
          <label htmlFor="buscar" className="sr-only">
            Buscar productos
          </label>
          <span className={styles.searchIcon}>
            <Icon name="search" />
          </span>
          <input
            id="buscar"
            name="q"
            type="search"
            placeholder="Busca tazas, mantas, velas…"
            className={cx(fieldStyles.input, styles.searchInput)}
          />
        </Form>

        <div className={styles.actions}>
          <IconButton href="/cuenta" icon="user" label="Mi cuenta" variant="ghost" />
          <IconButton
            href="/cuenta/favoritos"
            icon="heart"
            label="Favoritos"
            variant="ghost"
            className={styles.desktopOnly}
          />
          <CartLink />
        </div>
      </div>
    </header>
  );
}
