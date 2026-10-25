"use client";

import { useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { Select } from "@/components/ui/select";
import {
  PRICE_RANGES,
  SORT_OPTIONS,
  hasActiveFilters,
  listingHref,
  type ListingFilters,
  type SortKey,
} from "@/lib/catalog/listing";
import styles from "./listing.module.css";

type ListingControlsProps = {
  filters: ListingFilters;
  /** Ruta del listado sin query ("/categorias/ceramica") */
  pathname: string;
  defaultSort: SortKey;
  /** Resultados: se atenúan mientras llega la página nueva */
  children: ReactNode;
};

// Filtros (Disponibilidad, Precio) y orden. Todo vive en la URL: cada cambio navega a la URL
// nueva y vuelve a la página 1. Tipo y Color esperan la migración M5 (B17).
export function ListingControls({ filters, pathname, defaultSort, children }: ListingControlsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function go(changes: Partial<ListingFilters>) {
    const href = listingHref(pathname, filters, { ...changes, page: 1 }, defaultSort);
    startTransition(() => router.push(href, { scroll: false }));
  }

  return (
    <div className={styles.layout}>
      <aside className={styles.filters} aria-label="Filtros">
        <fieldset className={styles.group}>
          <legend className={styles.groupTitle}>Disponibilidad</legend>
          <div className={styles.chips}>
            <FilterChip selected={filters.inStock} onChange={(on) => go({ inStock: on })}>
              Con stock
            </FilterChip>
          </div>
        </fieldset>
        <fieldset className={styles.group}>
          <legend className={styles.groupTitle}>Precio</legend>
          <div className={styles.chips}>
            {PRICE_RANGES.map((range) => (
              <FilterChip
                key={range.value}
                selected={filters.price === range.value}
                onChange={(on) => go({ price: on ? range.value : null })}
              >
                {range.label}
              </FilterChip>
            ))}
          </div>
        </fieldset>
        {hasActiveFilters(filters) && (
          <Button
            variant="ghost"
            size="sm"
            iconStart="close"
            onClick={() => go({ inStock: false, price: null })}
            className={styles.clear}
          >
            Limpiar filtros
          </Button>
        )}
      </aside>

      <div className={styles.results} aria-busy={pending || undefined} data-pending={pending || undefined}>
        <div className={styles.toolbar}>
          <Select
            label="Ordenar por"
            options={[...SORT_OPTIONS]}
            value={filters.sort}
            onChange={(e) => go({ sort: e.target.value as SortKey })}
            className={styles.sort}
          />
        </div>
        {children}
      </div>
    </div>
  );
}
