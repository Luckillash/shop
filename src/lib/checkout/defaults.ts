import type { ShippingMethod } from "./shipping";

/** Datos para precargar el paso Despacho (la dirección guardada del usuario) */
export type ShippingDefaults = {
  addressId: string | null;
  firstName: string;
  lastName: string;
  rut: string;
  phone: string;
  region: string;
  commune: string;
  street: string;
  apartment: string;
  method: ShippingMethod | "";
};

export const EMPTY_SHIPPING: ShippingDefaults = {
  addressId: null,
  firstName: "",
  lastName: "",
  rut: "",
  phone: "",
  region: "",
  commune: "",
  street: "",
  apartment: "",
  method: "",
};
