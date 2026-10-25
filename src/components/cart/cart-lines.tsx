"use client";

import { Button } from "@/components/ui/button";
import { CartItem } from "@/components/ui/cart-item";
import { Notice } from "@/components/ui/notice";
import { useCartStore, type CartItem as CartItemData } from "@/store/cart-store";
import { useCartUi } from "@/store/cart-ui-store";
import styles from "./cart.module.css";

// Lista del carro (drawer y /carro): cantidad con tope en el stock y Eliminar con Deshacer
export function CartLines({ items }: { items: CartItemData[] }) {
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const setRemoved = useCartUi((s) => s.setRemoved);

  function remove(item: CartItemData, index: number) {
    removeItem(item.variantId);
    setRemoved({ item, index });
  }

  return (
    <>
      <UndoRemoveNotice />
      {items.length > 0 && (
        <ul className={styles.lines} aria-label="Productos en tu carro">
          {items.map((item, index) => (
            <li key={item.variantId}>
              <CartItem
                title={item.name}
                variant={item.variantName ?? undefined}
                image={item.image}
                imageAlt={item.name}
                href={`/productos/${item.slug}`}
                price={item.unitPrice}
                compareAt={item.compareAt}
                quantity={item.quantity}
                max={item.maxQuantity}
                onQuantityChange={(n) => setQuantity(item.variantId, n)}
                onRemove={() => remove(item, index)}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// También se muestra en el Carro vacío, si se acaba de quitar el último producto
export function UndoRemoveNotice() {
  const removed = useCartUi((s) => s.removed);
  const setRemoved = useCartUi((s) => s.setRemoved);
  const restoreItem = useCartStore((s) => s.restoreItem);

  if (!removed) return null;

  return (
    <Notice
      action={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            restoreItem(removed.item, removed.index);
            setRemoved(null);
          }}
        >
          Deshacer
        </Button>
      }
    >
      Quitaste {removed.item.name} del carro.
    </Notice>
  );
}
