"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { wishlistLoginHref } from "@/lib/wishlist/state";
import { useWishlistStore } from "@/store/wishlist-store";

/**
 * Corazón conectado con wishlist_items (7.5). En el servidor y al hidratar está vacío; después lee
 * los favoritos. Sin cuenta, tocarlo lleva a Ingresar con `volver` y el producto pendiente (B23).
 * La ruta se lee de window.location al tocar: usePathname() rompe el build en la Ficha (trampa 76).
 */
export function useWishlist(productId: string) {
  const router = useRouter();
  const wishlisted = useWishlistStore((s) => s.status === "ready" && s.ids.includes(productId));
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void useWishlistStore.getState().ensureLoaded();
  }, []);

  async function toggle() {
    if (pending) return;
    setPending(true);
    const result = await useWishlistStore.getState().toggle(productId, !wishlisted);
    setPending(false);
    if (result === "signin") {
      router.push(wishlistLoginHref(`${window.location.pathname}${window.location.search}`, productId));
    }
  }

  return { wishlisted, toggle, pending };
}
