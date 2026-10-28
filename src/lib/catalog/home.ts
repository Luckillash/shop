import type { CatalogItem } from "./mappers";

// Última sección del Inicio (B34, D-032): Los más vendidos cuando hay suficientes, si no Destacados.

/** Productos de la sección: una fila de 4 en el artboard */
export const HOME_SECTION_SIZE = 4;

export type HomeProductSection = {
  id: "mas-vendidos" | "destacados";
  title: string;
  items: CatalogItem[];
};

/**
 * Fecha desde la que se cuentan las ventas (`BEST_SELLERS_SINCE`, D-032). Sin ella, o si no es una
 * fecha válida, no se consulta el ranking y el Inicio muestra Destacados.
 */
export function parseBestSellersSince(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Con menos de 4 vendidos no se completa con destacados: se muestra Destacados entero */
export function homeProductSection(
  bestSellers: CatalogItem[],
  featured: CatalogItem[],
  size = HOME_SECTION_SIZE,
): HomeProductSection {
  if (bestSellers.length >= size) {
    return { id: "mas-vendidos", title: "Los más vendidos", items: bestSellers.slice(0, size) };
  }
  return { id: "destacados", title: "Destacados", items: featured.slice(0, size) };
}
