"use client";

import { useEffect, useId, useRef, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { FreeShippingBar } from "@/components/ui/free-shipping-bar";
import { IconButton } from "@/components/ui/icon-button";
import { Notice } from "@/components/ui/notice";
import { cartSubtotal } from "@/lib/cart/totals";
import { formatCLP } from "@/lib/format/clp";
import { STORE } from "@/lib/store";
import { useCartStore } from "@/store/cart-store";
import { useCartUi } from "@/store/cart-ui-store";
import { CartLines } from "./cart-lines";
import styles from "./cart.module.css";

// Template "Carro · drawer". Usa <dialog> modal: el navegador atrapa el foco, cierra con Esc,
// pone el resto de la página inerte y devuelve el foco al botón que lo abrió.
export function CartDrawer() {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const open = useCartUi((s) => s.open);
  const added = useCartUi((s) => s.added);
  const close = useCartUi((s) => s.close);
  const setRemoved = useCartUi((s) => s.setRemoved);
  const items = useCartStore((s) => s.items);
  const subtotal = cartSubtotal(items);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function handleClose() {
    close();
    setRemoved(null);
  }

  // Un clic en el velo (fuera del panel) o en un enlace (Ir a pagar, Ver carro, un producto) cierra
  function handleClick(event: MouseEvent<HTMLDialogElement>) {
    const target = event.target as HTMLElement;
    if (target === event.currentTarget || target.closest("a")) ref.current?.close();
  }

  return (
    // El clic en el velo es un atajo de mouse: el teclado cierra con Esc o con el botón Cerrar
    <dialog ref={ref} className={styles.drawer} aria-labelledby={titleId} onClose={handleClose} onClick={handleClick}>
      <div className={styles.drawerPanel}>
        <div className={styles.drawerHead}>
          <h2 id={titleId} className={styles.drawerTitle}>
            Tu carro
          </h2>
          <IconButton icon="close" label="Cerrar el carro" variant="ghost" onClick={() => ref.current?.close()} />
        </div>

        <div className={styles.drawerBody}>
          {added && <Notice tone="success">Agregaste {added} al carro</Notice>}
          {items.length > 0 ? (
            <FreeShippingBar subtotal={subtotal} threshold={STORE.freeShippingThreshold} />
          ) : (
            <p className={styles.muted}>Tu carro está vacío.</p>
          )}
          <CartLines items={items} />
        </div>

        {items.length > 0 && (
          <div className={styles.drawerFoot}>
            <p className={styles.subtotal}>
              <span>Subtotal</span>
              <strong>{formatCLP(subtotal)}</strong>
            </p>
            <p className={styles.note}>El despacho y los cupones se calculan en el siguiente paso.</p>
            <Button href="/checkout" size="lg" block iconEnd="chevronRight">
              Ir a pagar
            </Button>
            <Button href="/carro" variant="secondary" size="lg" block>
              Ver carro
            </Button>
          </div>
        )}
      </div>
    </dialog>
  );
}
