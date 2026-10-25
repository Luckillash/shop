import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  hasActiveFilters,
  listingHref,
  parseListingParams,
  productCount,
  type ListingScope,
  type RawSearchParams,
  type SortKey,
} from "@/lib/catalog/listing";
import { listProducts } from "@/lib/catalog/queries";
import { Breadcrumbs, type Crumb } from "./breadcrumbs";
import { ListingControls } from "./listing-controls";
import { ProductGrid, ProductGridSkeleton } from "./product-grid";
import catalog from "./catalog.module.css";
import styles from "./listing.module.css";

// Template Listado: cabecera (migas, título) en el static shell y resultados dentro de <Suspense>,
// porque dependen de searchParams.

export function ListingHeader({
  breadcrumbs,
  title,
  description,
}: {
  breadcrumbs: Crumb[];
  title: string;
  description?: string | null;
}) {
  return (
    <header className={styles.header}>
      <Breadcrumbs items={breadcrumbs} />
      <h1 className={catalog.title}>{title}</h1>
      {description && <p className={catalog.lead}>{description}</p>}
    </header>
  );
}

type ListingBodyProps = {
  scope: ListingScope;
  searchParams: Promise<RawSearchParams>;
  pathname: string;
  defaultSort?: SortKey;
  /** Texto cuando el listado no tiene productos ni siquiera sin filtros */
  emptyText?: ReactNode;
};

export async function ListingBody({
  scope,
  searchParams,
  pathname,
  defaultSort = "destacados",
  emptyText = "Todavía no hay productos en esta sección.",
}: ListingBodyProps) {
  const filters = parseListingParams(await searchParams, defaultSort);
  const { items, total } = await listProducts(scope, filters);
  const filtered = hasActiveFilters(filters);

  return (
    <ListingControls filters={filters} pathname={pathname} defaultSort={defaultSort}>
      <p className={styles.count} role="status">
        {productCount(total)}
      </p>

      {items.length === 0 ? (
        <div className={styles.empty}>
          <Icon name="search" size={32} strokeWidth={1.5} />
          <p className={styles.emptyTitle}>
            {filtered ? "No hay productos con estos filtros" : emptyText}
          </p>
          {filtered && (
            <Button variant="secondary" href={listingHref(pathname, filters, { inStock: false, price: null, page: 1 }, defaultSort)} scroll={false}>
              Limpiar filtros
            </Button>
          )}
        </div>
      ) : (
        <ProductGrid items={items} columns={3} />
      )}

      {total > 0 && (
        <div className={styles.more}>
          <p>
            Mostrando {items.length} de {total}
          </p>
          <progress
            className={styles.progress}
            value={items.length}
            max={total}
            aria-label={`Mostrando ${items.length} de ${total} productos`}
          />
          {items.length < total && (
            <Button
              variant="secondary"
              href={listingHref(pathname, filters, { page: filters.page + 1 }, defaultSort)}
              scroll={false}
            >
              Cargar más productos
            </Button>
          )}
        </div>
      )}
    </ListingControls>
  );
}

export function ListingSkeleton() {
  return (
    <div className={styles.layout}>
      <div className={styles.filters} />
      <div className={styles.results}>
        <ProductGridSkeleton count={6} columns={3} />
      </div>
    </div>
  );
}
