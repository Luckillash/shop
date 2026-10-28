"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, type ButtonProps } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";
import { useCartStore } from "@/store/cart-store";
import { useWishlistStore } from "@/store/wishlist-store";

// Cerrar sesión: el carro guardado queda en cart_items y el del navegador se vacía (D-018); los
// favoritos del navegador también (7.5)
export function SignOutButton({
  variant = "secondary",
  size,
  block,
  className,
}: Pick<ButtonProps, "variant" | "size" | "block" | "className">) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant={variant}
      size={size}
      block={block}
      className={className}
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          await signOut();
          useCartStore.getState().clear();
          useWishlistStore.getState().reset();
          router.replace("/");
          router.refresh();
        })
      }
    >
      {pending ? "Cerrando sesión" : "Cerrar sesión"}
    </Button>
  );
}
