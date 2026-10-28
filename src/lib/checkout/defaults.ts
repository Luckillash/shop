import { profileValues, type ProfileRow } from "@/lib/account/profile";
import { formatChileanMobile } from "@/lib/format/phone";
import { formatRut } from "@/lib/format/rut";
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

/** Dirección guardada que precarga el paso Despacho (la principal o la última) */
export type SavedAddress = {
  id: string;
  recipient_name: string;
  phone: string | null;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
};

/** Lo que el perfil aporta al checkout (Datos personales, 7.5) */
export type ProfileDefaults = Omit<ProfileRow, "newsletter_opt_in_at">;

/**
 * Precarga del paso Despacho: la dirección guardada y, del perfil, el RUT (decisión 7a) y, si no hay
 * dirección, el nombre y el teléfono. El checkout no escribe nada en el perfil.
 */
export function shippingDefaultsFrom(address: SavedAddress | null, profile: ProfileDefaults | null): ShippingDefaults {
  const rut = profile?.rut ? formatRut(profile.rut) : "";
  if (address) {
    const [firstName = "", ...rest] = address.recipient_name.trim().split(/\s+/);
    return {
      ...EMPTY_SHIPPING,
      addressId: address.id,
      firstName,
      lastName: rest.join(" "),
      rut,
      phone: address.phone ? formatChileanMobile(address.phone) : "",
      region: address.region ?? "",
      commune: address.city,
      street: address.line1,
      apartment: address.line2 ?? "",
    };
  }
  return profile ? { ...EMPTY_SHIPPING, ...profileValues(profile) } : EMPTY_SHIPPING;
}
