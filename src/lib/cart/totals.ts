import { STORE } from "@/lib/store";
import type { CartItem } from "@/store/cart-store";

// Totales que muestran el drawer y /carro. Solo para mostrar: el total real lo calcula place_order.

/** Tope de unidades por línea, aunque haya más stock (el mismo del QuantityStepper) */
export const MAX_QUANTITY = 99;

/** Lo que el servidor necesita del carro: variante y cantidad (nunca el precio del cliente) */
export type CartLine = { variantId: string; quantity: number };

export function toCartLines(items: CartItem[]): CartLine[] {
  return items.map((i) => ({ variantId: i.variantId, quantity: i.quantity }));
}

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((total, i) => total + i.unitPrice * i.quantity, 0);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((total, i) => total + i.quantity, 0);
}

/**
 * Despacho en el resumen del carro: 0 (Gratis) desde el umbral, null (Por calcular) bajo él.
 * `base` es el subtotal después del cupón, como en place_order (D-011). El costo real depende
 * de la comuna y del método (checkout).
 */
export function shippingPreview(base: number): number | null {
  return base >= STORE.freeShippingThreshold ? 0 : null;
}

/** "1 producto" · "3 productos" (cuenta unidades, como el contador del header) */
export function productsLabel(count: number): string {
  return `${count} ${count === 1 ? "producto" : "productos"}`;
}
