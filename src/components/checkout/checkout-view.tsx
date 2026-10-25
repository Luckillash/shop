"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useHydrated } from "@/components/cart/use-hydrated";
import { Notice } from "@/components/ui/notice";
import { refreshCart } from "@/lib/cart/actions";
import { cartChanged, reconcileCart } from "@/lib/cart/reconcile";
import { cartSubtotal, toCartLines } from "@/lib/cart/totals";
import type { ShippingSelection } from "@/lib/checkout/actions";
import type { ShippingDefaults } from "@/lib/checkout/defaults";
import { shippingCost } from "@/lib/checkout/shipping";
import { useCartStore } from "@/store/cart-store";
import { CheckoutSummary } from "./checkout-summary";
import { ContactStep } from "./contact-step";
import { StepIndicator, type StepKey } from "./parts";
import { PaymentStep } from "./payment-step";
import { ShippingStep } from "./shipping-step";
import styles from "./checkout.module.css";

type CheckoutViewProps = {
  /** Correo de la cuenta (null para invitados: lo escriben en Contacto) */
  email: string | null;
  defaults: ShippingDefaults;
};

// Checkout en 3 pasos en una sola URL: el paso actual vive en el estado. El carro sale de Zustand y
// se valida con refreshCart al entrar (precios, stock y cupón de la BD), igual que en /carro.
export function CheckoutView({ email: accountEmail, defaults }: CheckoutViewProps) {
  const router = useRouter();
  const hydrated = useHydrated();
  const items = useCartStore((s) => s.items);
  const couponCode = useCartStore((s) => s.couponCode);
  const [email, setEmail] = useState<string | null>(accountEmail);
  const [selection, setSelection] = useState<ShippingSelection | null>(null);
  const [step, setStep] = useState<StepKey>(accountEmail ? "shipping" : "contact");
  const [discount, setDiscount] = useState(0);
  const [changes, setChanges] = useState<string[]>([]);
  const [paying, setPaying] = useState(false);
  const [, startTransition] = useTransition();
  const lastRefresh = useRef<string | null>(null);
  // Se valida al entrar y otra vez si el servidor corrige el carro (el cupón depende de las cantidades)
  const refreshKey = `${couponCode ?? ""}|${items.map((i) => `${i.variantId}:${i.quantity}`).join(",")}`;

  // Carro vacío → /carro (salvo mientras se crea el pedido)
  useEffect(() => {
    if (hydrated && items.length === 0 && !paying) router.replace("/carro");
  }, [hydrated, items.length, paying, router]);

  // Precios, stock y cupón actuales
  useEffect(() => {
    if (!hydrated || lastRefresh.current === refreshKey) return;
    lastRefresh.current = refreshKey;
    startTransition(async () => {
      const before = useCartStore.getState();
      if (before.items.length === 0) return;
      try {
        const result = await refreshCart(toCartLines(before.items), before.couponCode);
        const current = useCartStore.getState();
        const fixed = reconcileCart(current.items, result.snapshots);
        if (cartChanged(current.items, fixed.items)) current.replaceItems(fixed.items);
        const notes = [...fixed.changes];
        if (result.coupon?.ok) {
          setDiscount(result.coupon.coupon.discount);
        } else if (result.coupon && result.coupon.reason !== "error" && result.coupon.reason !== "rate_limited") {
          current.setCouponCode(null);
          notes.push(`Quitamos el cupón ${before.couponCode}. ${result.coupon.message}`);
        }
        if (notes.length) setChanges(notes);
      } catch (error) {
        console.error("[checkout] refreshCart", error);
      }
    });
  }, [hydrated, refreshKey]);

  if (!hydrated || items.length === 0) {
    return <div className={styles.skeleton} aria-busy="true" aria-label="Cargando el checkout" />;
  }

  const subtotal = cartSubtotal(items);
  const appliedDiscount = couponCode ? Math.min(discount, subtotal) : 0;
  const base = subtotal - appliedDiscount;
  const shipping = selection ? shippingCost(selection.method, selection.address?.region ?? null, base) : null;
  const total = base + (shipping ?? 0);
  const done = new Set<StepKey>([
    ...(email ? (["contact"] as const) : []),
    ...(selection ? (["shipping"] as const) : []),
  ]);

  return (
    <div className={styles.layout}>
      <aside className={styles.aside}>
        <CheckoutSummary
          items={items}
          subtotal={subtotal}
          discount={appliedDiscount}
          couponCode={couponCode}
          shipping={shipping}
        />
      </aside>

      <div className={styles.steps}>
        <StepIndicator current={step} done={done} />
        {changes.length > 0 && (
          <Notice tone="warning" title="Actualizamos tu carro">
            <ul>
              {changes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </Notice>
        )}

        <ContactStep
          state={step === "contact" || !email ? "current" : "done"}
          email={email}
          onSaved={(value) => {
            setEmail(value);
            setStep(selection ? "payment" : "shipping");
          }}
          onEdit={() => setStep("contact")}
          editDisabled={paying}
        />

        <ShippingStep
          state={step === "shipping" ? "current" : selection ? "done" : "pending"}
          defaults={defaults}
          selection={selection}
          base={base}
          onSaved={(value) => {
            setSelection(value);
            setStep("payment");
          }}
          onEdit={() => setStep("shipping")}
          editDisabled={paying}
        />

        <PaymentStep
          state={step === "payment" && email && selection ? "current" : "pending"}
          email={email ?? ""}
          selection={selection}
          lines={toCartLines(items)}
          couponCode={couponCode}
          total={total}
          onPendingChange={setPaying}
          onCartChanged={(fixed, dropCoupon) => {
            const store = useCartStore.getState();
            if (fixed) store.replaceItems(fixed);
            if (dropCoupon) {
              store.setCouponCode(null);
              setDiscount(0);
            }
          }}
        />
      </div>
    </div>
  );
}
