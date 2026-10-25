import { create } from "zustand";

// Mientras se crea el pedido o se redirige a la pasarela, *Volver al carro* del header del
// checkout queda sin enlace (04-diseno/estados-y-mensajes.md). Sin persist.
type PaymentUiState = {
  paying: boolean;
  setPaying: (paying: boolean) => void;
};

export const usePaymentUi = create<PaymentUiState>()((set) => ({
  paying: false,
  setPaying: (paying) => set({ paying }),
}));
