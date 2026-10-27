import type { Json } from "@/types/database";

// Dirección guardada en orders.shipping_address (place_order). Puro: lo usan las pantallas del
// pedido y los correos.

export type ShippingAddress = {
  type?: string;
  recipient_name?: string;
  line1?: string;
  line2?: string | null;
  city?: string;
  region?: string;
};

export function asAddress(value: Json): ShippingAddress {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as ShippingAddress) : {};
}

/** "Av. Providencia 1234, depto. 502, Providencia, Región Metropolitana" */
export function addressLine(address: ShippingAddress, withRegion = true): string {
  return [address.line1, address.line2, address.city, withRegion ? address.region : null].filter(Boolean).join(", ");
}
