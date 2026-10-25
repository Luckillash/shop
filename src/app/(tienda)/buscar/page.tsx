import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import catalog from "@/components/catalog/catalog.module.css";
import emptyStyles from "@/components/catalog/empty-state.module.css";
import { ListingHeader } from "@/components/catalog/listing";
import { ProductGrid, ProductGridSkeleton } from "@/components/catalog/product-grid";
import { SearchForm } from "@/components/catalog/search-form";
import chipStyles from "@/components/ui/filter-chip.module.css";
import { Icon } from "@/components/ui/icon";
import { normalizeQuery, productCount } from "@/lib/catalog/listing";
import { getFeaturedProducts, searchProducts } from "@/lib/catalog/queries";

export const metadata: Metadata = { title: "Buscar" };

// Lista fija por ahora (contarlas en Redis queda como opción, D-005)
const POPULAR_SEARCHES = ["Tazas", "Mantas", "Velas", "Tablas", "Cojines"];

export default function SearchPage({ searchParams }: PageProps<"/buscar">) {
  return (
    <main className={catalog.main}>
      <Suspense fallback={<ProductGridSkeleton count={8} />}>
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function SearchResults({ searchParams }: Pick<PageProps<"/buscar">, "searchParams">) {
  const q = normalizeQuery(await searchParams);

  if (!q) {
    return (
      <section className={emptyStyles.state}>
        <h1 className={catalog.title}>¿Qué estás buscando?</h1>
        <SearchForm />
        <PopularSearches />
      </section>
    );
  }

  const items = await searchProducts(q.toLowerCase());

  if (items.length === 0) return <NoResults q={q} />;

  return (
    <>
      <ListingHeader
        breadcrumbs={[{ label: "Inicio", href: "/" }, { label: "Buscar" }]}
        title={`Resultados para "${q}"`}
      />
      <p className={catalog.muted} role="status">
        {productCount(items.length)}
      </p>
      <ProductGrid items={items} />
    </>
  );
}

// Template Sin resultados
async function NoResults({ q }: { q: string }) {
  const suggestions = await getFeaturedProducts(4);

  return (
    <>
      <section className={emptyStyles.state}>
        <span className={emptyStyles.icon}>
          <Icon name="search" size={28} />
        </span>
        <h1 className={catalog.title}>No encontramos resultados para &quot;{q}&quot;</h1>
        <p className={catalog.lead}>Revisa cómo lo escribiste o prueba con una palabra más general, como “taza” o “manta”.</p>
        <SearchForm defaultValue={q} />
        <PopularSearches />
      </section>
      <section className={catalog.section}>
        <h2 className={catalog.sectionTitle}>Te podría interesar</h2>
        <ProductGrid items={suggestions} />
      </section>
    </>
  );
}

function PopularSearches() {
  return (
    <>
      <h2 className={emptyStyles.subtitle}>Búsquedas populares</h2>
      <ul className={catalog.chips}>
        {POPULAR_SEARCHES.map((term) => (
          <li key={term}>
            <Link href={`/buscar?q=${encodeURIComponent(term.toLowerCase())}`} className={chipStyles.chip}>
              {term}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
