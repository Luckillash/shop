"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import catalog from "@/components/catalog/catalog.module.css";
import emptyStyles from "@/components/catalog/empty-state.module.css";
import { Button } from "@/components/ui/button";
import { FreeShippingBar } from "@/components/ui/free-shipping-bar";
import { Icon } from "@/components/ui/icon";
import { Notice } from "@/components/ui/notice";
import { OrderSummary } from "@/components/ui/order-summary";
import { refreshCart } from "@/lib/cart/actions";
import type { AppliedCoupon } from "@/lib/cart/coupon";
import { cartChanged, reconcileCart } from "@/lib/cart/reconcile";
import { cartCount, cartSubtotal, productsLabel, shippingPreview, toCartLines } from "@/lib/cart/totals";
import { formatCLP } from "@/lib/format/clp";
import { STORE } from "@/lib/store";
import { useCartStore } from "@/store/cart-store";
import { useCartUi } from "@/store/cart-ui-store";
import { CartLines, UndoRemoveNotice } from "./cart-lines";
import { CouponForm } from "./coupon-form";
import { useHydrated } from "./use-hydrated";
import styles from "./cart.module.css";

type CartViewProps = {
  /** Bloque de entrega (plazos y cambios en 30 días), renderizado en el servidor */
  delivery: ReactNode;
  /** "Te podría gustar" (carro con productos) */
  recommendations: ReactNode;
  /** "Novedades" (Carro vacío) */
  newArrivals: ReactNode;
};

const REFRESH_DELAY_MS = 400;

// Templates Carro y Carro vacío. El carro vive en localStorage: antes de hidratar se muestra
// un placeholder. Al cargar, refreshCart corrige precios y stock con la BD; con un cupón,
// también recalcula el descuento cuando cambian las cantidades.
export function CartView({ delivery, recommendations, newArrivals }: CartViewProps) {
  const hydrated = useHydrated();
  const items = useCartStore((s) => s.items);
  const couponCode = useCartStore((s) => s.couponCode);
  const setCouponCode = useCartStore((s) => s.setCouponCode);
  const setRemoved = useCartUi((s) => s.setRemoved);
  const [changes, setChanges] = useState<string[]>([]);
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [couponNotice, setCouponNotice] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const lastRefresh = useRef<string | null>(null);

  const linesKey = items.map((i) => `${i.variantId}:${i.quantity}`).join(",");
  // Sin cupón basta con validar una vez al cargar; con cupón, cada vez que cambian las cantidades
  const refreshKey = couponCode ? `${couponCode}|${linesKey}` : "load";

  useEffect(() => {
    if (!hydrated || lastRefresh.current === refreshKey) return;
    const first = lastRefresh.current === null;

    // La clave se marca al disparar (no al programar), así un efecto cancelado vuelve a intentarlo
    const timer = setTimeout(() => {
      lastRefresh.current = refreshKey;
      startTransition(async () => {
        const before = useCartStore.getState();
        if (before.items.length === 0) return;
        try {
          const result = await refreshCart(toCartLines(before.items), before.couponCode);
          const current = useCartStore.getState();
          const fixed = reconcileCart(current.items, result.snapshots);
          if (cartChanged(current.items, fixed.items)) current.replaceItems(fixed.items);
          if (fixed.changes.length) setChanges((prev) => [...new Set([...prev, ...fixed.changes])]);

          const checked = result.coupon;
          if (!checked || current.couponCode !== before.couponCode) return;
          if (checked.ok) {
            setCoupon(checked.coupon);
          } else if (checked.reason !== "error" && checked.reason !== "rate_limited") {
            setCouponCode(null);
            setCoupon(null);
            setCouponNotice(`Quitamos el cupón ${before.couponCode}. ${checked.message}`);
          }
        } catch (error) {
          console.error("[cart] refreshCart", error);
        }
      });
    }, first ? 0 : REFRESH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [hydrated, refreshKey, setCouponCode]);

  // Al salir de la página ya no tiene sentido ofrecer Deshacer
  useEffect(() => () => setRemoved(null), [setRemoved]);

  if (!hydrated) {
    return <div className={styles.skeleton} aria-busy="true" aria-label="Cargando tu carro" />;
  }

  if (items.length === 0) {
    return (
      <>
        <UndoRemoveNotice />
        <EmptyCart />
        {newArrivals}
      </>
    );
  }

  const subtotal = cartSubtotal(items);
  const count = cartCount(items);
  const discount = couponCode && coupon ? coupon.discount : 0;

  return (
    <>
      <div className={styles.head}>
        <h1 className={catalog.title}>
          Tu carro <span className={styles.count}>· {productsLabel(count)}</span>
        </h1>
        <Link href="/" className={catalog.link}>
          Seguir comprando
        </Link>
      </div>

      <div className={styles.layout}>
        <div className={styles.list}>
          {/* El despacho gratis se mide después del cupón (D-011) */}
          <FreeShippingBar subtotal={subtotal - discount} threshold={STORE.freeShippingThreshold} />
          {changes.length > 0 && (
            <Notice tone="warning" title="Actualizamos tu carro">
              <ul>
                {changes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </Notice>
          )}
          {couponNotice && <Notice tone="warning">{couponNotice}</Notice>}
          <CartLines items={items} />
          <CouponForm
            coupon={coupon}
            onApplied={(applied) => {
              // El servidor ya lo validó con estas cantidades: no hace falta otro refreshCart
              lastRefresh.current = `${applied.code}|${linesKey}`;
              setCoupon(applied);
              setCouponNotice(null);
            }}
            onRemoved={() => setCoupon(null)}
          />
        </div>

        <div className={styles.aside}>
          <OrderSummary
            subtotal={subtotal}
            discount={discount}
            discountLabel={couponCode ? `Cupón ${couponCode}` : undefined}
            shipping={shippingPreview(subtotal - discount)}
            itemsCount={count}
            ctaHref="/checkout"
          />
          {delivery}
        </div>
      </div>

      {recommendations}
    </>
  );
}

// Template Carro vacío
function EmptyCart() {
  return (
    <section className={emptyStyles.state}>
      <span className={emptyStyles.icon}>
        <Icon name="cart" size={28} />
      </span>
      <h1 className={catalog.title}>Tu carro está vacío</h1>
      <p className={catalog.lead}>
        Agrega lo que te guste: sobre {formatCLP(STORE.freeShippingThreshold)} el despacho es gratis.
      </p>
      <div className={styles.emptyActions}>
        <Button href="/">Explorar la tienda</Button>
        <Button href="/cuenta/favoritos" variant="secondary">
          Ver mis favoritos
        </Button>
      </div>
    </section>
  );
}
