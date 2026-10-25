// Estado del Listado en la URL: ?orden=menor-precio&disponible=1&precio=15000-30000&pagina=2
// Así se puede compartir, funciona sin JS y sirve como clave de caché de listProducts.

/** Productos por página (el diseño muestra "Mostrando 8 de 12") */
export const PAGE_SIZE = 8;
/** Tope de "Cargar más": evita pedir rangos enormes con ?pagina=9999 */
export const MAX_PAGE = 20;

export const SORT_OPTIONS = [
  { value: "destacados", label: "Destacados" },
  { value: "menor-precio", label: "Menor precio" },
  { value: "mayor-precio", label: "Mayor precio" },
  { value: "novedades", label: "Novedades" },
  { value: "mejor-evaluados", label: "Mejor evaluados" },
] as const;

export type SortKey = (typeof SORT_OPTIONS)[number]["value"];

// Rangos sobre product_catalog.min_price: min incluido, max excluido
export const PRICE_RANGES = [
  { value: "hasta-15000", label: "Menos de $15.000", min: null, max: 15000 },
  { value: "15000-30000", label: "$15.000 a $30.000", min: 15000, max: 30000 },
  { value: "desde-30000", label: "Más de $30.000", min: 30000, max: null },
] as const;

export type PriceRangeKey = (typeof PRICE_RANGES)[number]["value"];

export type ListingFilters = {
  sort: SortKey;
  page: number;
  /** Disponibilidad: solo productos con stock */
  inStock: boolean;
  price: PriceRangeKey | null;
};

export const DEFAULT_FILTERS: ListingFilters = { sort: "destacados", page: 1, inStock: false, price: null };

/** Qué productos lista la página */
export type ListingScope =
  | { kind: "category"; slug: string }
  | { kind: "all" }
  | { kind: "sale" };

export type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isSortKey(value: string | undefined): value is SortKey {
  return SORT_OPTIONS.some((o) => o.value === value);
}

function isPriceRange(value: string | undefined): value is PriceRangeKey {
  return PRICE_RANGES.some((r) => r.value === value);
}

// Normaliza los searchParams: los valores desconocidos se ignoran (no fragmentan la caché)
export function parseListingParams(params: RawSearchParams, defaultSort: SortKey = "destacados"): ListingFilters {
  const sort = first(params.orden);
  const price = first(params.precio);
  const page = parseInt(first(params.pagina) ?? "", 10);

  return {
    sort: isSortKey(sort) ? sort : defaultSort,
    page: Number.isFinite(page) ? Math.min(Math.max(page, 1), MAX_PAGE) : 1,
    inStock: first(params.disponible) === "1",
    price: isPriceRange(price) ? price : null,
  };
}

// Arma la URL con un orden fijo de parámetros y sin los valores por defecto
export function listingHref(
  pathname: string,
  filters: ListingFilters,
  changes: Partial<ListingFilters> = {},
  defaultSort: SortKey = "destacados",
): string {
  const next = { ...filters, ...changes };
  const query = new URLSearchParams();
  if (next.sort !== defaultSort) query.set("orden", next.sort);
  if (next.inStock) query.set("disponible", "1");
  if (next.price) query.set("precio", next.price);
  if (next.page > 1) query.set("pagina", String(next.page));
  const qs = query.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function hasActiveFilters(filters: ListingFilters): boolean {
  return filters.inStock || filters.price !== null;
}

export function priceRange(key: PriceRangeKey) {
  return PRICE_RANGES.find((r) => r.value === key)!;
}

// Consulta de /buscar?q= tal como se muestra: sin espacios de más y con un largo máximo.
// La clave de caché usa además minúsculas ("  Taza " y "taza" son la misma búsqueda).
export function normalizeQuery(params: RawSearchParams): string {
  return (first(params.q) ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
}

/** "1 producto" / "12 productos" */
export function productCount(n: number): string {
  return `${n} ${n === 1 ? "producto" : "productos"}`;
}
