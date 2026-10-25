import type { CatalogItem } from "@/lib/catalog/mappers";
import { CatalogProductCard } from "./catalog-product-card";
import styles from "./product-grid.module.css";

// Grilla de tarjetas: 2 columnas en móvil, 3 o 4 en escritorio según `columns`
export function ProductGrid({ items, columns = 4 }: { items: CatalogItem[]; columns?: 3 | 4 }) {
  return (
    <ul className={columns === 3 ? `${styles.grid} ${styles.three}` : styles.grid}>
      {items.map((item) => (
        <li key={item.id} className={styles.cell}>
          <CatalogProductCard item={item} />
        </li>
      ))}
    </ul>
  );
}

// Placeholder de la grilla mientras llegan los datos (fallback de <Suspense>)
export function ProductGridSkeleton({ count = 4, columns = 4 }: { count?: number; columns?: 3 | 4 }) {
  return (
    <ul className={columns === 3 ? `${styles.grid} ${styles.three}` : styles.grid} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className={styles.cell}>
          <div className={styles.skeleton} />
        </li>
      ))}
    </ul>
  );
}
