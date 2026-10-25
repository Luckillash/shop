"use client";

import { useEffect } from "react";
import { useCartStore } from "@/store/cart-store";
import { usePaymentUi } from "@/store/payment-ui-store";

const CLEARED_KEY = "almacen:carro-vaciado";

function clearedOrders(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(CLEARED_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

// En las pantallas de resultado: *Volver al carro* vuelve a tener enlace y, con el pago aprobado o
// la transferencia registrada, se vacía el carro del navegador (el de la BD lo vació place_order).
// Solo una vez por pedido: si vuelve a abrir la Confirmación días después, no borra un carro nuevo.
export function PaymentSettled({ orderId, clearCart = false }: { orderId: string; clearCart?: boolean }) {
  useEffect(() => {
    usePaymentUi.getState().setPaying(false);
    if (!clearCart) return;
    const done = clearedOrders();
    if (done.includes(orderId)) return;
    useCartStore.getState().clear();
    try {
      localStorage.setItem(CLEARED_KEY, JSON.stringify([...done, orderId].slice(-20)));
    } catch {
      // Sin localStorage el carro igual se vació en esta pestaña
    }
  }, [orderId, clearCart]);
  return null;
}
