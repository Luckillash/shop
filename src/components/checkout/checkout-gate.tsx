"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthAction } from "@/components/auth/use-auth-action";
import { useHydrated } from "@/components/cart/use-hydrated";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { startGuestCheckout } from "@/lib/auth/actions";
import { useCartStore } from "@/store/cart-store";
import styles from "./checkout.module.css";

// Sin sesión: *Ingresar* o *Comprar como invitado* (sesión anónima, D-008). place_order necesita
// auth.uid(), así que el checkout siempre corre con una sesión.
export function CheckoutGate() {
  const { state, submit, pending } = useAuthAction(startGuestCheckout);
  const router = useRouter();
  const hydrated = useHydrated();
  const empty = useCartStore((s) => s.items.length === 0);

  useEffect(() => {
    if (hydrated && empty) router.replace("/carro");
  }, [hydrated, empty, router]);

  return (
    <div className={styles.gate}>
      {state.status === "error" && state.message && (
        <Notice tone="danger" className={styles.full}>
          {state.message}
        </Notice>
      )}
      <section className={styles.gateCard} aria-labelledby="gate-ingresar">
        <h2 id="gate-ingresar" className={styles.stepTitle}>
          ¿Ya tienes cuenta?
        </h2>
        <p>Ingresa para usar tus direcciones guardadas y seguir tus pedidos.</p>
        <Button href="/ingresar?volver=/checkout" size="lg" block>
          Ingresar
        </Button>
      </section>
      <section className={styles.gateCard} aria-labelledby="gate-invitado">
        <h2 id="gate-invitado" className={styles.stepTitle}>
          Comprar como invitado
        </h2>
        <p>No necesitas crear una cuenta: te pediremos tu correo para enviarte la boleta y el seguimiento.</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit(new FormData());
          }}
        >
          <Button type="submit" variant="secondary" size="lg" block loading={pending}>
            {pending ? "Preparando tu compra" : "Continuar como invitado"}
          </Button>
        </form>
      </section>
    </div>
  );
}
