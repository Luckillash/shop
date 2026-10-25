import Link from "next/link";
import catalog from "@/components/catalog/catalog.module.css";
import { ProductGrid } from "@/components/catalog/product-grid";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { DEFAULT_FILTERS } from "@/lib/catalog/listing";
import { maxDiscount } from "@/lib/catalog/mappers";
import { getCategories, getFeaturedProducts, getNewProducts, listProducts } from "@/lib/catalog/queries";
import { formatCLP } from "@/lib/format/clp";
import { STORE } from "@/lib/store";
import styles from "./page.module.css";

const BENEFITS: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "truck",
    title: `Despacho gratis sobre ${formatCLP(STORE.freeShippingThreshold)}`,
    text: "A todo Chile continental con Starken.",
  },
  { icon: "returns", title: "30 días para cambios", text: "Si no es lo que esperabas, lo cambias o lo devuelves." },
  { icon: "lock", title: "Pago seguro", text: "Tarjeta de crédito, débito o transferencia." },
];

// Template Inicio. Todo sale de consultas con 'use cache': la página entera es parte del static shell.
export default async function Home() {
  const [categories, newProducts, featured, sale] = await Promise.all([
    getCategories(),
    getNewProducts(4),
    getFeaturedProducts(4),
    listProducts({ kind: "sale" }, DEFAULT_FILTERS),
  ]);
  const discount = maxDiscount(sale.items);

  return (
    <main className={catalog.main}>
      <section className={styles.hero}>
        <p className={catalog.overline}>Hecho por talleres de Chile</p>
        <h1 className={styles.heroTitle}>Objetos para la casa, hechos con calma</h1>
        <p className={catalog.lead}>
          Cerámica de Pomaire, mantas de Chiloé, velas de soya y utensilios de madera nativa.
        </p>
        <div className={styles.heroActions}>
          <Button href="/novedades" size="lg">
            Ver novedades
          </Button>
          <Button href="/ofertas" variant="secondary" size="lg">
            Ver ofertas
          </Button>
        </div>
      </section>

      <ul className={styles.benefits}>
        {BENEFITS.map((b) => (
          <li key={b.icon} className={styles.benefit}>
            <Icon name={b.icon} size={24} />
            <div>
              <p className={styles.benefitTitle}>{b.title}</p>
              <p className={catalog.muted}>{b.text}</p>
            </div>
          </li>
        ))}
      </ul>

      <section className={catalog.section} aria-labelledby="categorias">
        <h2 id="categorias" className={catalog.sectionTitle}>
          Explora por categoría
        </h2>
        <ul className={styles.categories}>
          {categories.map((c) => (
            <li key={c.id}>
              <Link href={`/categorias/${c.slug}`} className={styles.category}>
                <span className={styles.categoryMedia}>
                  {c.image_url ? (
                    // Placeholders SVG de placehold.co: next/image queda para las fotos reales (D-015)
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.image_url} alt="" loading="lazy" />
                  ) : (
                    <Icon name="image" size={32} strokeWidth={1.25} />
                  )}
                </span>
                <span className={styles.categoryName}>{c.name}</span>
                {c.description && <span className={catalog.muted}>{c.description}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className={catalog.section} aria-labelledby="lo-nuevo">
        <div className={catalog.sectionHead}>
          <h2 id="lo-nuevo" className={catalog.sectionTitle}>
            Lo nuevo
          </h2>
          <Link href="/novedades" className={catalog.link}>
            Ver todo
          </Link>
        </div>
        <ProductGrid items={newProducts} />
      </section>

      {discount > 0 && (
        <section className={styles.saleBanner}>
          <div>
            <p className={styles.saleTitle}>Hasta −{discount}% en productos seleccionados</p>
            <p>Precios rebajados mientras haya stock.</p>
          </div>
          <Button href="/ofertas" variant="secondary">
            Ver ofertas
          </Button>
        </section>
      )}

      <section className={catalog.section} aria-labelledby="destacados">
        <h2 id="destacados" className={catalog.sectionTitle}>
          Destacados
        </h2>
        <ProductGrid items={featured} />
      </section>
    </main>
  );
}
