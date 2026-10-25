import { formatCLP } from "@/lib/format/clp";
import type { CartItem } from "@/store/cart-store";
import { MAX_QUANTITY } from "./totals";

// Corrige el carro del cliente con los datos actuales de la BD (refreshCart) y arma los avisos.

/**
 * Estado actual de una variante en la BD. `available: false` si la variante o el producto ya no
 * están activos o no existen (el RLS de anon solo deja ver lo activo).
 */
export type CartSnapshot = { variantId: string; available: false } | AvailableSnapshot;

export type AvailableSnapshot = {
  variantId: string;
  available: true;
  productId: string;
  slug: string;
  name: string;
  variantName: string | null;
  image: string | null;
  unitPrice: number;
  compareAt: number | null;
  stock: number;
};

export type CartReconciliation = {
  items: CartItem[];
  /** Avisos para el Notice warning: "El precio de … cambió" */
  changes: string[];
};

function label(item: Pick<CartItem, "name" | "variantName">): string {
  return item.variantName ? `${item.name} (${item.variantName})` : item.name;
}

// Los ítems sin snapshot (agregados mientras la consulta estaba en curso) quedan igual.
export function reconcileCart(items: CartItem[], snapshots: CartSnapshot[]): CartReconciliation {
  const byId = new Map(snapshots.map((s) => [s.variantId, s]));
  const changes: string[] = [];
  const next: CartItem[] = [];

  for (const item of items) {
    const snap = byId.get(item.variantId);
    if (!snap) {
      next.push(item);
      continue;
    }
    if (!snap.available) {
      changes.push(`${label(item)} ya no está a la venta. Lo quitamos del carro.`);
      continue;
    }
    if (snap.stock <= 0) {
      changes.push(`Ya no quedan unidades de ${label(item)}. Lo quitamos del carro.`);
      continue;
    }

    const updated: CartItem = {
      ...item,
      productId: snap.productId,
      slug: snap.slug,
      name: snap.name,
      variantName: snap.variantName,
      image: snap.image,
      unitPrice: snap.unitPrice,
      compareAt: snap.compareAt,
      maxQuantity: Math.min(snap.stock, MAX_QUANTITY),
    };
    if (snap.unitPrice !== item.unitPrice) {
      changes.push(`El precio de ${label(updated)} cambió a ${formatCLP(snap.unitPrice)}.`);
    }
    if (item.quantity > updated.maxQuantity) {
      updated.quantity = updated.maxQuantity;
      changes.push(
        updated.maxQuantity === 1
          ? `Solo queda 1 unidad de ${label(updated)}. Ajustamos la cantidad.`
          : `Solo quedan ${updated.maxQuantity} unidades de ${label(updated)}. Ajustamos la cantidad.`,
      );
    }
    next.push(updated);
  }

  return { items: next, changes };
}

/** true si la corrección cambió algo que hay que guardar en el store */
export function cartChanged(before: CartItem[], after: CartItem[]): boolean {
  if (before.length !== after.length) return true;
  return before.some((item, i) => JSON.stringify(item) !== JSON.stringify(after[i]));
}
