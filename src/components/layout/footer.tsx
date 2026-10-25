import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import fieldStyles from "@/components/ui/field.module.css";
import { getCategories } from "@/lib/catalog/queries";
import { STORE } from "@/lib/store";
import styles from "./footer.module.css";

const HELP_LINKS = [
  { href: "/ayuda/despacho", label: "Despacho y plazos" },
  { href: "/ayuda/cambios-y-devoluciones", label: "Cambios y devoluciones" },
  { href: "/cuenta/pedidos", label: "Seguimiento de pedido" },
  { href: "/ayuda/preguntas-frecuentes", label: "Preguntas frecuentes" },
  { href: "/ayuda/contacto", label: "Contacto" },
];

const STORE_LINKS = [
  { href: "/ayuda/nosotros", label: "Nosotros" },
  { href: "/ayuda/terminos", label: "Términos y condiciones" },
  { href: "/ayuda/privacidad", label: "Política de privacidad" },
];

// Footer de la tienda (template Footer)
export async function Footer() {
  const categories = await getCategories();
  const shopLinks = [
    ...categories.map((c) => ({ href: `/categorias/${c.slug}`, label: c.name })),
    { href: "/ofertas", label: "Ofertas" },
  ];

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.columns}>
          <div className={styles.brand}>
            <Link href="/" className={styles.logo}>
              {STORE.name}
            </Link>
            <p className={styles.description}>
              Objetos para la casa: cerámica, textiles, velas y cocina, elegidos para el uso de todos los días.
            </p>
            {/* La suscripción todavía no tiene dónde guardarse (brecha B21): el formulario queda deshabilitado */}
            <form className={styles.newsletter}>
              <label htmlFor="newsletter" className={fieldStyles.label}>
                Recibe novedades y ofertas
              </label>
              <div className={styles.newsletterRow}>
                <input
                  id="newsletter"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="tu@correo.cl"
                  className={fieldStyles.input}
                  disabled
                />
                <Button variant="secondary" type="submit" disabled>
                  Suscribirme
                </Button>
              </div>
            </form>
          </div>
          <LinkColumn title="Tienda" links={shopLinks} />
          <LinkColumn title="Ayuda" links={HELP_LINKS} />
          <LinkColumn title={STORE.name} links={STORE_LINKS} />
        </div>
        <div className={styles.legal}>
          <span>
            © 2026 {STORE.name} · {STORE.legalName} · RUT {STORE.rut}
          </span>
          <span className={styles.secure}>
            <Icon name="lock" size={16} />
            Pago seguro con tarjeta de crédito, débito o transferencia
          </span>
        </div>
      </div>
    </footer>
  );
}

function LinkColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <nav aria-label={title} className={styles.column}>
      <h2 className={styles.columnTitle}>{title}</h2>
      <ul>
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href}>{l.label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
