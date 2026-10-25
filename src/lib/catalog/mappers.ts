import type { Database, Json } from "@/types/database";

// Normaliza las filas de Supabase a lo que muestran las páginas.
// numeric llega como número o string: se pasa a CLP entero (trampa 14).

export type CatalogRow = Database["public"]["Views"]["product_catalog"]["Row"];

/** Producto en una grilla (ProductCard) */
export type CatalogItem = {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  image: string | null;
  /** Precio "desde": el menor entre las variantes activas */
  price: number;
  compareAt: number | null;
  rating: number | null;
  reviewCount: number;
  soldOut: boolean;
  /** Unidades disponibles (suma de las variantes activas): el máximo al agregar desde la tarjeta */
  stock: number;
  /** Si el producto tiene una sola variante activa, se puede agregar al carro desde la tarjeta */
  singleVariantId: string | null;
};

export function toCLP(value: number | string | null | undefined): number {
  return Math.round(Number(value ?? 0));
}

export function toCatalogItem(row: CatalogRow, variantIds: string[] = []): CatalogItem | null {
  if (!row.id || !row.slug || !row.name) return null;
  const price = toCLP(row.min_price ?? row.base_price);
  const compareAt = row.compare_at_price == null ? null : toCLP(row.compare_at_price);

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand_name,
    image: row.cover_image,
    price,
    compareAt: compareAt != null && compareAt > price ? compareAt : null,
    rating: row.avg_rating == null ? null : Number(row.avg_rating),
    reviewCount: row.review_count ?? 0,
    soldOut: (row.total_stock ?? 0) <= 0,
    stock: Math.max(0, row.total_stock ?? 0),
    singleVariantId: variantIds.length === 1 ? variantIds[0] : null,
  };
}

// Agrupa las variantes activas por producto: { productId: [variantId, …] }
export function groupVariantIds(variants: { id: string; product_id: string }[]): Record<string, string[]> {
  const byProduct: Record<string, string[]> = {};
  for (const v of variants) (byProduct[v.product_id] ??= []).push(v.id);
  return byProduct;
}

export function toCatalogItems(rows: CatalogRow[], variantIds: Record<string, string[]> = {}): CatalogItem[] {
  return rows.flatMap((row) => {
    const item = toCatalogItem(row, row.id ? variantIds[row.id] : []);
    return item ? [item] : [];
  });
}

// Bloque "Detalles" de la Ficha desde products.metadata (B18). El origen va en la descripción.
const DETAIL_LABELS: [key: string, label: string][] = [
  ["material", "Material"],
  ["capacidad", "Capacidad"],
  ["medidas", "Medidas"],
  ["duracion", "Duración"],
  ["cuidado", "Cuidado"],
];

export type ProductMetadata = Record<string, string>;

export function toMetadata(json: Json): ProductMetadata {
  if (!json || typeof json !== "object" || Array.isArray(json)) return {};
  return Object.fromEntries(
    Object.entries(json).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

export function productDetails(metadata: ProductMetadata): { label: string; value: string }[] {
  return DETAIL_LABELS.flatMap(([key, label]) => (metadata[key] ? [{ label, value: metadata[key] }] : []));
}

// "Hasta −25%": el mayor descuento entre los productos en oferta
export function maxDiscount(items: CatalogItem[]): number {
  return items.reduce(
    (max, i) => (i.compareAt ? Math.max(max, Math.round((1 - i.price / i.compareAt) * 100)) : max),
    0,
  );
}
