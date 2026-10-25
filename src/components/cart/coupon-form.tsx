"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { applyCoupon } from "@/lib/cart/actions";
import type { AppliedCoupon } from "@/lib/cart/coupon";
import { toCartLines } from "@/lib/cart/totals";
import { useCartStore } from "@/store/cart-store";
import styles from "./cart.module.css";

type CouponFormProps = {
  /** Cupón validado por el servidor (null mientras se revisa o si no hay) */
  coupon: AppliedCoupon | null;
  onApplied: (coupon: AppliedCoupon) => void;
  onRemoved: () => void;
};

// Cupón del template Carro: TextField + "Aplicar cupón" → "Aplicando". El descuento lo calcula
// el servidor (validate_coupon) y place_order lo vuelve a calcular al crear el pedido.
export function CouponForm({ coupon, onApplied, onRemoved }: CouponFormProps) {
  const couponCode = useCartStore((s) => s.couponCode);
  const setCouponCode = useCartStore((s) => s.setCouponCode);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (couponCode) {
    return (
      <div className={styles.coupon}>
        <p className={styles.applied}>
          <span>
            Cupón <span className={styles.code}>{couponCode}</span>{" "}
            {coupon ? "aplicado" : <span className={styles.muted}>(revisando)</span>}
            {coupon?.description && <span className={styles.muted}> · {coupon.description}</span>}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCouponCode(null);
              onRemoved();
            }}
          >
            Quitar cupón
          </Button>
        </p>
      </div>
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code") ?? "").trim();
    if (!code) {
      setError("Escribe el código de tu cupón.");
      return;
    }
    startTransition(async () => {
      try {
        const result = await applyCoupon(code, toCartLines(useCartStore.getState().items));
        if (result.ok) {
          setError(null);
          setCouponCode(result.coupon.code);
          onApplied(result.coupon);
        } else {
          setError(result.message);
        }
      } catch {
        setError("No pudimos revisar el cupón. Vuelve a intentarlo.");
      }
    });
  }

  return (
    <form className={styles.coupon} onSubmit={submit} noValidate>
      <TextField
        label="Cupón de descuento"
        name="code"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={40}
        error={error ?? undefined}
        onChange={() => error && setError(null)}
      />
      <Button type="submit" variant="secondary" loading={pending} className={styles.couponButton}>
        {pending ? "Aplicando" : "Aplicar cupón"}
      </Button>
    </form>
  );
}
