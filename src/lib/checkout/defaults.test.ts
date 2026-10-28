import { expect, test } from "vitest";
import { EMPTY_SHIPPING, shippingDefaultsFrom } from "./defaults";

const address = {
  id: "addr-1",
  recipient_name: "Camila Rojas",
  phone: "+56912345678",
  line1: "Av. Providencia 1234",
  line2: null,
  city: "Providencia",
  region: "Metropolitana de Santiago",
};

const profile = { full_name: "Camila Rojas", first_name: "Camila", last_name: "Rojas", phone: "+56987654321", rut: "12345678-5" };

test("con dirección: la dirección y el RUT del perfil (decisión 7a)", () => {
  expect(shippingDefaultsFrom(address, profile)).toEqual({
    ...EMPTY_SHIPPING,
    addressId: "addr-1",
    firstName: "Camila",
    lastName: "Rojas",
    rut: "12.345.678-5",
    phone: "+56 9 1234 5678",
    region: "Metropolitana de Santiago",
    commune: "Providencia",
    street: "Av. Providencia 1234",
    apartment: "",
  });
});

test("sin dirección: nombre, teléfono y RUT del perfil", () => {
  expect(shippingDefaultsFrom(null, profile)).toEqual({
    ...EMPTY_SHIPPING,
    firstName: "Camila",
    lastName: "Rojas",
    phone: "+56 9 8765 4321",
    rut: "12.345.678-5",
  });
});

test("sin RUT en el perfil, el campo queda vacío", () => {
  expect(shippingDefaultsFrom(address, { ...profile, rut: null }).rut).toBe("");
  expect(shippingDefaultsFrom(null, null)).toEqual(EMPTY_SHIPPING);
});
