import { couponFailureReason, couponMessage } from "@/lib/cart/coupon";

// Errores de place_order → mensaje para el Notice del paso Pago. place_order manda un hint estable
// (ecommerce_schema.sql §11) y sus textos dicen "carrito" (trampa 17), así que no se muestran tal cual.

export type OrderFailure = {
  message: string;
  /** El carro del cliente quedó desactualizado (stock, producto inactivo, cupón): hay que refrescarlo */
  refreshCart: boolean;
  /** El cupón ya no sirve: hay que quitarlo del carro */
  dropCoupon: boolean;
};

export const GENERIC_ORDER_ERROR = "No pudimos crear tu pedido. Vuelve a intentarlo en unos minutos.";

export function orderFailure(error: { hint?: string | null; details?: string | null }): OrderFailure {
  const product = error.details?.trim();
  switch (error.hint) {
    case "stock":
      return {
        message: `Ya no quedan suficientes unidades de ${product || "un producto"}. Ajustamos tu carro: revísalo y vuelve a pagar.`,
        refreshCart: true,
        dropCoupon: false,
      };
    case "unavailable":
      return {
        message: `${product || "Un producto"} ya no está a la venta. Lo quitamos del carro: revísalo y vuelve a pagar.`,
        refreshCart: true,
        dropCoupon: false,
      };
    case "empty_cart":
      return { message: "Tu carro está vacío. Agrega productos para comprar.", refreshCart: true, dropCoupon: false };
    case "express_region":
      return {
        message: "El despacho express es solo para la Región Metropolitana. Vuelve al paso Despacho y elige otro tipo.",
        refreshCart: false,
        dropCoupon: false,
      };
    case "address":
      return {
        message: "No encontramos la dirección de despacho. Vuelve al paso Despacho y guárdala otra vez.",
        refreshCart: false,
        dropCoupon: false,
      };
    case "auth":
      return { message: "Tu sesión terminó. Vuelve a ingresar para comprar.", refreshCart: false, dropCoupon: false };
    case "input":
      return { message: "Faltan datos del pedido. Revisa los pasos anteriores.", refreshCart: false, dropCoupon: false };
    case "invalid":
    case "exhausted":
    case "used":
    case "min_order": {
      const reason = couponFailureReason(error.hint);
      const minOrder = reason === "min_order" ? Number(error.details) || undefined : undefined;
      return {
        message: `${couponMessage(reason, minOrder)} Quitamos el cupón: revisa el total y vuelve a pagar.`,
        refreshCart: true,
        dropCoupon: true,
      };
    }
    default:
      return { message: GENERIC_ORDER_ERROR, refreshCart: false, dropCoupon: false };
  }
}
