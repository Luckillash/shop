import { create } from "zustand";
import { persist } from "zustand/middleware";
import { MAX_QUANTITY } from "@/lib/cart/totals";

// Carro del cliente: solo para mostrar. Precios, stock y cupón los vuelve a calcular
// la base de datos (refreshCart en /carro y place_order en el checkout).
export type CartItem = {
  /** product_variants.id */
  variantId: string;
  productId: string;
  /** Para enlazar a /productos/[slug] */
  slug: string;
  /** products.name */
  name: string;
  /** "Color: Arena" · null si el producto no tiene opciones ("Única") */
  variantName: string | null;
  image: string | null;
  /** CLP entero: coalesce(variant.price, base_price) */
  unitPrice: number;
  compareAt: number | null;
  quantity: number;
  /** Stock al agregar (o al validar el carro), con tope en MAX_QUANTITY */
  maxQuantity: number;
};

export const CART_STORAGE_VERSION = 1;

type CartState = {
  items: CartItem[];
  /** Código del cupón aplicado en /carro; el descuento se recalcula en el servidor */
  couponCode: string | null;
  /** Suma `quantity` si la variante ya está en el carro, con tope en maxQuantity */
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  /** Cantidad exacta, ajustada a [1, maxQuantity] */
  setQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  /** Deshacer *Eliminar*: vuelve a poner el ítem en su posición */
  restoreItem: (item: CartItem, index: number) => void;
  /** Reemplaza los ítems con los corregidos contra la BD */
  replaceItems: (items: CartItem[]) => void;
  setCouponCode: (code: string | null) => void;
  clear: () => void;
};

type PersistedCart = Pick<CartState, "items" | "couponCode">;

export function clampToStock(quantity: number, maxQuantity: number): number {
  const max = Math.max(1, Math.min(maxQuantity, MAX_QUANTITY));
  return Math.max(1, Math.min(max, Math.floor(quantity) || 1));
}

// Versión 0 (fase 3): ítems con `id`, `name` y `price`, sin variante ni máximo. Se descartan.
export function migrateCart(persisted: unknown, version: number): PersistedCart {
  if (version < CART_STORAGE_VERSION || !persisted || typeof persisted !== "object") {
    return { items: [], couponCode: null };
  }
  return persisted as PersistedCart;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      couponCode: null,
      addItem: (item, quantity = 1) =>
        set((state) => {
          const existing = state.items.find((i) => i.variantId === item.variantId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.variantId === item.variantId
                  ? { ...i, ...item, quantity: clampToStock(i.quantity + quantity, item.maxQuantity) }
                  : i,
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: clampToStock(quantity, item.maxQuantity) }] };
        }),
      setQuantity: (variantId, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.variantId === variantId ? { ...i, quantity: clampToStock(quantity, i.maxQuantity) } : i,
          ),
        })),
      removeItem: (variantId) =>
        set((state) => ({ items: state.items.filter((i) => i.variantId !== variantId) })),
      restoreItem: (item, index) =>
        set((state) => {
          if (state.items.some((i) => i.variantId === item.variantId)) return state;
          const items = [...state.items];
          items.splice(Math.min(index, items.length), 0, item);
          return { items };
        }),
      replaceItems: (items) => set({ items }),
      setCouponCode: (couponCode) => set({ couponCode }),
      clear: () => set({ items: [], couponCode: null }),
    }),
    {
      name: "cart",
      version: CART_STORAGE_VERSION,
      migrate: migrateCart,
      partialize: (state): PersistedCart => ({ items: state.items, couponCode: state.couponCode }),
    },
  ),
);
