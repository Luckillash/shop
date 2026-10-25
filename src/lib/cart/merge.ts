import type { CartItem } from "@/store/cart-store";
import type { CartSnapshot } from "./reconcile";
import { MAX_QUANTITY, type CartLine } from "./totals";

// Sincronización del carro con cart_items (D-018, fase 5): fusión al iniciar sesión y ajuste al
// stock antes de escribir. Funciones puras; las acciones están en actions.ts.

/**
 * Fusión al iniciar sesión: por variante, la cantidad mayor entre el carro del cliente y el de la
 * BD. Primero las líneas del cliente (en su orden), después las que solo estaban en la BD.
 */
export function mergeLines(client: CartLine[], stored: CartLine[]): CartLine[] {
  const merged = new Map<string, number>();
  for (const line of [...client, ...stored]) {
    merged.set(line.variantId, Math.max(merged.get(line.variantId) ?? 0, line.quantity));
  }
  return [...merged].map(([variantId, quantity]) => ({ variantId, quantity }));
}

/** Solo las variantes a la venta y con stock, con la cantidad ajustada al stock (lo que se escribe) */
export function clampToSnapshots(lines: CartLine[], snapshots: CartSnapshot[]): CartLine[] {
  const byId = new Map(snapshots.map((s) => [s.variantId, s]));
  const result: CartLine[] = [];
  for (const line of lines) {
    const snap = byId.get(line.variantId);
    if (!snap?.available || snap.stock <= 0) continue;
    result.push({ variantId: line.variantId, quantity: Math.min(line.quantity, snap.stock, MAX_QUANTITY) });
  }
  return result;
}

/** Ítems del store a partir de las líneas ya ajustadas y los datos de la BD (reemplaza el carro del cliente) */
export function toCartItems(lines: CartLine[], snapshots: CartSnapshot[]): CartItem[] {
  const byId = new Map(snapshots.map((s) => [s.variantId, s]));
  return lines.flatMap((line): CartItem[] => {
    const snap = byId.get(line.variantId);
    if (!snap?.available) return [];
    return [
      {
        variantId: snap.variantId,
        productId: snap.productId,
        slug: snap.slug,
        name: snap.name,
        variantName: snap.variantName,
        image: snap.image,
        unitPrice: snap.unitPrice,
        compareAt: snap.compareAt,
        quantity: line.quantity,
        maxQuantity: Math.min(snap.stock, MAX_QUANTITY),
      },
    ];
  });
}
