import Link from "next/link";
import { Button } from "@/components/ui/button";
import chipStyles from "@/components/ui/filter-chip.module.css";
import { getCategories } from "@/lib/catalog/queries";
import { SearchForm } from "./search-form";
import catalog from "./catalog.module.css";
import styles from "./empty-state.module.css";

// Template 404 (NoEncontrada): se usa en app/not-found.tsx y en (tienda)/not-found.tsx
export async function NotFoundContent() {
  const categories = await getCategories();

  return (
    <main className={catalog.main}>
      <section className={styles.state}>
        <p className={styles.code}>Error 404</p>
        <h1 className={catalog.title}>No encontramos esta página</h1>
        <p className={catalog.lead}>
          Puede que el enlace esté mal escrito o que el producto ya no esté a la venta. Busca lo que
          necesitas o vuelve al inicio.
        </p>
        <SearchForm id="buscar-404" />
        <Button href="/">Volver al inicio</Button>
        <ul className={catalog.chips} aria-label="Categorías">
          {categories.map((c) => (
            <li key={c.id}>
              <Link href={`/categorias/${c.slug}`} className={chipStyles.chip}>
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
