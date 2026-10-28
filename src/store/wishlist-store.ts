import { create } from "zustand";
import { getWishlistState, setWishlisted } from "@/lib/wishlist/actions";
import { mayHaveSession, withWishlisted, type WishlistStatus } from "@/lib/wishlist/state";

// Favoritos en el navegador (7.5, D-030), sin persist: la fuente de verdad es wishlist_items.
// Se pregunta una sola vez por carga (el primer corazón que se monta), siempre después de hidratar:
// las páginas del catálogo siguen estáticas (trampa 62). Al ingresar o cerrar sesión, reset().

type WishlistState = {
  status: WishlistStatus;
  ids: string[];
  /** Pregunta por los favoritos si todavía no se sabe */
  ensureLoaded: () => Promise<void>;
  /** Guarda o quita; responde "signin" si hay que ingresar (invitado o sin sesión, B23) */
  toggle: (productId: string, wishlisted: boolean) => Promise<"ok" | "signin" | "error">;
  /** Refleja en el navegador un cambio ya guardado (lo hace /cuenta/favoritos) */
  sync: (productId: string, wishlisted: boolean) => void;
  reset: () => void;
};

let loading: Promise<void> | null = null;

export const useWishlistStore = create<WishlistState>()((set, get) => ({
  status: "idle",
  ids: [],

  ensureLoaded() {
    if (get().status !== "idle") return loading ?? Promise.resolve();
    if (!mayHaveSession(document.cookie)) {
      set({ status: "guest", ids: [] });
      return Promise.resolve();
    }
    set({ status: "loading" });
    loading = getWishlistState()
      .then((snapshot) => set(snapshot.signedIn ? { status: "ready", ids: snapshot.ids } : { status: "guest", ids: [] }))
      // Sin respuesta, el corazón se comporta como sin sesión: tocarlo vuelve a preguntar
      .catch(() => set({ status: "idle", ids: [] }))
      .finally(() => {
        loading = null;
      });
    return loading;
  },

  async toggle(productId, wishlisted) {
    await get().ensureLoaded();
    const { status } = get();
    if (status === "idle") return "error";
    if (status !== "ready") return "signin";
    const before = get().ids;
    set({ ids: withWishlisted(before, productId, wishlisted) });
    try {
      const result = await setWishlisted(productId, wishlisted);
      if (result.status === "ok") return "ok";
      if (result.status === "signin") {
        set({ status: "guest", ids: [] });
        return "signin";
      }
    } catch {
      // red caída: se deshace abajo
    }
    set({ ids: before });
    return "error";
  },

  sync(productId, wishlisted) {
    if (get().status === "ready") set({ ids: withWishlisted(get().ids, productId, wishlisted) });
  },

  reset() {
    set({ status: "idle", ids: [] });
  },
}));
