import { toCLP, toMetadata } from "@/lib/catalog/mappers";
import { variantDescription } from "@/lib/catalog/variants";
import type { Json } from "@/types/database";
import { MAX_QUANTITY, type CartLine } from "./totals";
import type { AvailableSnapshot, CartSnapshot } from "./reconcile";

// Filas de product_variants (con su producto) → CartSnapshot, y validación de lo que manda el cliente.

export type VariantRow = {
  id: string;
  name: string;
  attributes: Json;
  price: number | string | null;
  stock: number;
  is_active: boolean;
  product: {
    id: string;
    slug: string;
    name: string;
    base_price: number | string;
    compare_at_price: number | string | null;
    is_active: boolean;
    images: { url: string; sort_order: number }[];
  } | null;
};

export function toSnapshot(row: VariantRow): AvailableSnapshot | null {
  const product = row.product;
  if (!product || !row.is_active || !product.is_active) return null;
  const unitPrice = row.price == null ? toCLP(product.base_price) : toCLP(row.price);
  const compareAt = product.compare_at_price == null ? null : toCLP(product.compare_at_price);
  const cover = [...product.images].sort((a, b) => a.sort_order - b.sort_order)[0];

  return {
    variantId: row.id,
    available: true,
    productId: product.id,
    slug: product.slug,
    name: product.name,
    variantName: variantDescription({ name: row.name, attributes: toMetadata(row.attributes) }),
    image: cover?.url ?? null,
    unitPrice,
    compareAt: compareAt != null && compareAt > unitPrice ? compareAt : null,
    stock: Math.max(0, row.stock),
  };
}

/** Un snapshot por id pedido: los que no volvieron de la BD quedan como no disponibles */
export function toSnapshots(variantIds: string[], rows: VariantRow[]): CartSnapshot[] {
  const byId = new Map(rows.map((r) => [r.id, toSnapshot(r)]));
  return variantIds.map((variantId) => byId.get(variantId) ?? { variantId, available: false });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Máximo de líneas distintas que se aceptan en una consulta */
export const MAX_CART_LINES = 50;

// El cliente no es confiable: solo ids válidos, sin repetir, y cantidades enteras en [1, 99]
export function sanitizeLines(input: unknown): CartLine[] {
  if (!Array.isArray(input)) return [];
  const lines = new Map<string, number>();
  for (const raw of input.slice(0, MAX_CART_LINES)) {
    if (!raw || typeof raw !== "object") continue;
    const { variantId, quantity } = raw as Record<string, unknown>;
    if (typeof variantId !== "string" || !UUID.test(variantId)) continue;
    const qty = typeof quantity === "number" && Number.isFinite(quantity) ? Math.floor(quantity) : 0;
    if (qty < 1) continue;
    lines.set(variantId, Math.min(qty, MAX_QUANTITY));
  }
  return [...lines].map(([variantId, quantity]) => ({ variantId, quantity }));
}

/** Subtotal con los precios de la BD; las líneas no disponibles no suman */
export function serverSubtotal(lines: CartLine[], snapshots: CartSnapshot[]): number {
  const byId = new Map(snapshots.map((s) => [s.variantId, s]));
  return lines.reduce((total, line) => {
    const snap = byId.get(line.variantId);
    if (!snap?.available || snap.stock <= 0) return total;
    return total + snap.unitPrice * Math.min(line.quantity, snap.stock);
  }, 0);
}
