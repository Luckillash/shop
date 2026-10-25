"use client";

import { useSyncExternalStore } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { useCartStore } from "@/store/cart-store";
import styles from "./header.module.css";

function cartCount(): number {
  return useCartStore.getState().items.reduce((total, item) => total + item.quantity, 0);
}

export function cartLabel(count: number): string {
  if (count === 0) return "Carro";
  return `Carro, ${count} ${count === 1 ? "producto" : "productos"}`;
}

// El carro vive en localStorage: en el servidor (y durante la hidratación) el contador es 0,
// y useSyncExternalStore lo actualiza en el cliente sin errores de hidratación.
export function CartLink() {
  const count = useSyncExternalStore(useCartStore.subscribe, cartCount, () => 0);

  return (
    <div className={styles.cart}>
      <IconButton href="/carro" icon="cart" label={cartLabel(count)} variant="ghost" />
      {count > 0 && (
        <span className={styles.cartCount} aria-hidden="true">
          {count}
        </span>
      )}
    </div>
  );
}
