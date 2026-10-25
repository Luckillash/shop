"use client";

import { startTransition, useActionState } from "react";
import { useRouter } from "next/navigation";
import type { AuthState } from "@/lib/auth/actions";
import { toCartLines } from "@/lib/cart/totals";
import { useCartStore } from "@/store/cart-store";

const IDLE: AuthState = { status: "idle" };

/**
 * Envuelve una acción de autenticación: le agrega el carro del cliente (para fusionarlo con
 * cart_items) y, al entrar, reemplaza el store con el carro fusionado y navega a `next`.
 */
export function useAuthAction(action: (prev: AuthState, formData: FormData) => Promise<AuthState>) {
  const router = useRouter();
  const [state, dispatch, pending] = useActionState(async (prev: AuthState, formData: FormData) => {
    formData.set("cart", JSON.stringify(toCartLines(useCartStore.getState().items)));
    const next = await action(prev, formData);
    if (next.status === "signed-in") {
      // Si la fusión falló, el servidor devuelve [] y se conserva el carro local
      if (next.items.length > 0) useCartStore.getState().replaceItems(next.items);
      router.replace(next.next);
      router.refresh();
    }
    return next;
  }, IDLE);

  /** Envía sin el reset automático de los formularios de React 19 (se conservan los valores) */
  function submit(formData: FormData) {
    startTransition(() => dispatch(formData));
  }

  return { state, submit, pending };
}
