import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createSupabasePublic } from "@/lib/supabase/public";
import {
  PAGE_SIZE,
  priceRange,
  type ListingFilters,
  type ListingScope,
} from "./listing";
import {
  groupVariantIds,
  toCatalogItems,
  toCLP,
  toMetadata,
  type CatalogItem,
  type CatalogRow,
  type ProductMetadata,
} from "./mappers";
import type { VariantInfo } from "./variants";

// Consultas del catálogo: cliente anónimo (sin cookies) para poder usar 'use cache'.
// Tags e invalidación en documentación/02-arquitectura/renderizado-y-cache.md.

// Categorías de primer nivel visibles en la tienda (RLS de anon: solo activas)
export async function getCategories() {
  "use cache";
  cacheLife("days");
  cacheTag("categories");

  const { data, error } = await createSupabasePublic()
    .from("categories")
    .select("id, name, slug, description, image_url")
    .is("parent_id", null)
    .order("sort_order");

  if (error) throw error;
  return data;
}

export async function getCategoryBySlug(slug: string) {
  "use cache";
  cacheLife("days");
  cacheTag("categories");

  const { data, error } = await createSupabasePublic()
    .from("categories")
    .select("id, name, slug, description")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// Agrega a cada fila el id de su variante si tiene una sola (para agregar desde la tarjeta)
async function withVariants(rows: CatalogRow[]): Promise<CatalogItem[]> {
  const ids = rows.flatMap((r) => (r.id ? [r.id] : []));
  if (ids.length === 0) return [];

  const { data, error } = await createSupabasePublic()
    .from("product_variants")
    .select("id, product_id")
    .in("product_id", ids)
    .eq("is_active", true);

  if (error) throw error;
  return toCatalogItems(rows, groupVariantIds(data));
}

export async function getFeaturedProducts(limit = 4): Promise<CatalogItem[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("products");

  const { data, error } = await createSupabasePublic()
    .from("product_catalog")
    .select("*")
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .order("name")
    .limit(limit);

  if (error) throw error;
  return withVariants(data);
}

/**
 * Productos por id, en el mismo orden de `ids` (Favoritos, 7.5). Cacheada con el tag del catálogo:
 * los favoritos de cada cliente se leen aparte, con su sesión. Los que ya no están en el catálogo
 * (inactivos o borrados) no vuelven.
 */
export async function getProductsByIds(ids: string[]): Promise<CatalogItem[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("products");
  if (ids.length === 0) return [];

  const { data, error } = await createSupabasePublic().from("product_catalog").select("*").in("id", ids);
  if (error) throw error;
  const items = await withVariants(data);
  const position = new Map(ids.map((id, index) => [id, index]));
  return items.sort((a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0));
}

export async function getNewProducts(limit = 4): Promise<CatalogItem[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("products");

  const { data, error } = await createSupabasePublic()
    .from("product_catalog")
    .select("*")
    .order("created_at", { ascending: false })
    .order("name")
    .limit(limit);

  if (error) throw error;
  return withVariants(data);
}

// Listado con filtros, orden y "Cargar más" (devuelve las páginas 1..page juntas)
export async function listProducts(
  scope: ListingScope,
  filters: ListingFilters,
): Promise<{ items: CatalogItem[]; total: number }> {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");
  if (scope.kind === "category") cacheTag(`category:${scope.slug}`);

  let query = createSupabasePublic().from("product_catalog").select("*", { count: "exact" });

  if (scope.kind === "category") query = query.eq("category_slug", scope.slug);
  if (scope.kind === "sale") query = query.not("compare_at_price", "is", null);
  if (filters.inStock) query = query.gt("total_stock", 0);
  if (filters.price) {
    const { min, max } = priceRange(filters.price);
    if (min != null) query = query.gte("min_price", min);
    if (max != null) query = query.lt("min_price", max);
  }

  switch (filters.sort) {
    case "menor-precio":
      query = query.order("min_price", { ascending: true });
      break;
    case "mayor-precio":
      query = query.order("min_price", { ascending: false });
      break;
    case "novedades":
      query = query.order("created_at", { ascending: false });
      break;
    case "mejor-evaluados":
      query = query
        .order("avg_rating", { ascending: false, nullsFirst: false })
        .order("review_count", { ascending: false });
      break;
    default:
      query = query.order("is_featured", { ascending: false }).order("created_at", { ascending: false });
  }

  // Desempate estable para que la paginación no repita ni salte productos
  const { data, count, error } = await query.order("name").range(0, filters.page * PAGE_SIZE - 1);

  if (error) throw error;
  return { items: await withVariants(data), total: count ?? data.length };
}

export async function getRelatedProducts(categoryId: string, excludeId: string, limit = 4): Promise<CatalogItem[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("products");

  const { data, error } = await createSupabasePublic()
    .from("product_catalog")
    .select("*")
    .eq("category_id", categoryId)
    .neq("id", excludeId)
    .order("is_featured", { ascending: false })
    .order("name")
    .limit(limit);

  if (error) throw error;
  return withVariants(data);
}

// Full-text en español + trigramas (función search_products, security invoker)
export async function searchProducts(q: string): Promise<CatalogItem[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");

  const { data, error } = await createSupabasePublic().rpc("search_products", { q, max_results: 24 });

  if (error) throw error;
  return withVariants(data);
}

export type ProductDetail = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  compareAt: number | null;
  metadata: ProductMetadata;
  brand: string | null;
  category: { id: string; name: string; slug: string } | null;
  images: { id: string; url: string; alt: string }[];
  /** Variantes activas, sin stock (el stock se lee aparte con getVariantStock) */
  variants: VariantInfo[];
};

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("products", `product:${slug}`);

  const { data, error } = await createSupabasePublic()
    .from("products")
    .select(
      `id, slug, name, description, base_price, compare_at_price, metadata,
       brand:brands(name),
       category:categories(id, name, slug),
       images:product_images(id, url, alt, sort_order),
       variants:product_variants(id, sku, name, attributes, price, is_active, created_at)`,
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const basePrice = toCLP(data.base_price);
  const variants = data.variants
    .filter((v) => v.is_active)
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.sku.localeCompare(b.sku))
    .map((v) => ({
      id: v.id,
      sku: v.sku,
      name: v.name,
      attributes: toMetadata(v.attributes),
      price: v.price == null ? basePrice : toCLP(v.price),
    }));
  const compareAt = data.compare_at_price == null ? null : toCLP(data.compare_at_price);

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    description: data.description,
    compareAt,
    metadata: toMetadata(data.metadata),
    brand: data.brand?.name ?? null,
    category: data.category,
    images: [...data.images]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((i) => ({ id: i.id, url: i.url, alt: i.alt ?? data.name })),
    variants,
  };
}

// Slugs para generateStaticParams de la Ficha (el catálogo es chico: se prerenderizan todos)
export async function getProductSlugs(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("products");

  const { data, error } = await createSupabasePublic().from("products").select("slug").eq("is_active", true);

  if (error) throw error;
  return data.map((p) => p.slug);
}

// Stock por variante: es lo que más cambia, por eso tiene vida corta y va en su propio <Suspense>
export async function getVariantStock(productId: string): Promise<Record<string, number>> {
  "use cache";
  cacheLife("seconds");
  cacheTag(`stock:${productId}`);

  const { data, error } = await createSupabasePublic()
    .from("product_variants")
    .select("id, stock")
    .eq("product_id", productId)
    .eq("is_active", true);

  if (error) throw error;
  return Object.fromEntries(data.map((v) => [v.id, v.stock]));
}

/**
 * Las 10 opiniones publicadas más recientes, con su firma (author_name, author_commune: M11), y el
 * promedio y el total de todas (product_catalog). Se invalida al publicar (updateTag, 7.6).
 */
export async function getReviews(productId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(`reviews:${productId}`);

  const supabase = createSupabasePublic();
  const [list, summary] = await Promise.all([
    supabase
      .from("reviews")
      .select("id, rating, title, body, author_name, author_commune, created_at")
      .eq("product_id", productId)
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.from("product_catalog").select("avg_rating, review_count").eq("id", productId).maybeSingle(),
  ]);

  if (list.error) throw list.error;
  if (summary.error) throw summary.error;
  const count = summary.data?.review_count ?? list.data.length;
  const average = summary.data?.avg_rating != null ? Number(summary.data.avg_rating) : null;
  return { items: list.data, count, average: count > 0 ? average : null };
}

export type ProductReview = Awaited<ReturnType<typeof getReviews>>["items"][number];
