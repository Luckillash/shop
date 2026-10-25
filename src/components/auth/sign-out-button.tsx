"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";
import { useCartStore } from "@/store/cart-store";

// Cerrar sesión: el carro guardado queda en cart_items y el del navegador se vacía (D-018)
export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="secondary"
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          await signOut();
          useCartStore.getState().clear();
          router.replace("/");
          router.refresh();
        })
      }
    >
      {pending ? "Cerrando sesión" : "Cerrar sesión"}
    </Button>
  );
}
