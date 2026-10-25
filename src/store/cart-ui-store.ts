import { create } from "zustand";
import type { CartItem } from "./cart-store";

// Estado de UI del carro (sin persist): el drawer, que abre "Agregar al carro", y el último
// ítem eliminado, para ofrecer Deshacer aunque el carro haya quedado vacío.
type CartUiState = {
  open: boolean;
  /** Nombre de lo que se acaba de agregar, para el Notice "Agregaste … al carro" */
  added: string | null;
  removed: { item: CartItem; index: number } | null;
  show: (added: string) => void;
  close: () => void;
  setRemoved: (removed: CartUiState["removed"]) => void;
};

export const useCartUi = create<CartUiState>()((set) => ({
  open: false,
  added: null,
  removed: null,
  show: (added) => set({ open: true, added, removed: null }),
  close: () => set({ open: false }),
  setRemoved: (removed) => set({ removed }),
}));
