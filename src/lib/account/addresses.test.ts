import { describe, expect, test } from "vitest";
import { MESSAGES } from "@/lib/checkout/validation";
import { METROPOLITAN_REGION } from "@/lib/chile/regions";
import {
  ADDRESS_MESSAGES,
  addressFieldError,
  addressLines,
  addressTitle,
  addressValues,
  sortAddresses,
  validateAddress,
  type AddressRow,
} from "./addresses";

const input = {
  label: " Casa ",
  firstName: "Camila",
  lastName: "Rojas",
  phone: "9 1234 5678",
  region: METROPOLITAN_REGION,
  commune: "Providencia",
  street: "Av. Providencia 1234",
  apartment: "Depto. 502",
};

const row: AddressRow = {
  id: "a",
  label: "Casa",
  recipient_name: "Camila Rojas Soto",
  phone: "+56912345678",
  line1: "Av. Providencia 1234",
  line2: "Depto. 502",
  city: "Providencia",
  region: METROPOLITAN_REGION,
  is_default: true,
};

describe("validateAddress", () => {
  test("arma la fila de addresses como el checkout", () => {
    expect(validateAddress(input)).toEqual({
      ok: true,
      data: {
        label: "Casa",
        recipient_name: "Camila Rojas",
        phone: "+56912345678",
        line1: "Av. Providencia 1234",
        line2: "Depto. 502",
        city: "Providencia",
        region: METROPOLITAN_REGION,
        country: "CL",
      },
    });
  });

  test("el nombre de la dirección y el depto. son opcionales", () => {
    const result = validateAddress({ ...input, label: "", apartment: "" });
    expect(result.ok && [result.data.label, result.data.line2]).toEqual([null, null]);
  });

  test("las mismas validaciones del checkout: comuna de otra región, calle sin número, teléfono", () => {
    expect(validateAddress({ ...input, commune: "Viña del Mar", street: "Av. Providencia", phone: "1234" })).toEqual({
      ok: false,
      errors: { commune: ADDRESS_MESSAGES.commune, street: MESSAGES.streetNumber, phone: MESSAGES.phone },
    });
    expect(addressFieldError("region", { region: "Narnia" })).toBe(MESSAGES.region);
    expect(addressFieldError("firstName", {})).toBe(MESSAGES.firstName);
  });

  test("nombre de la dirección de más de 40 caracteres", () => {
    expect(addressFieldError("label", { label: "x".repeat(41) })).toBe(ADDRESS_MESSAGES.label);
  });
});

test("addressValues: para editar, con el teléfono formateado", () => {
  expect(addressValues(row)).toEqual({
    label: "Casa",
    firstName: "Camila",
    lastName: "Rojas Soto",
    phone: "+56 9 1234 5678",
    region: METROPOLITAN_REGION,
    commune: "Providencia",
    street: "Av. Providencia 1234",
    apartment: "Depto. 502",
    isDefault: true,
  });
});

test("addressTitle y addressLines (tarjeta)", () => {
  expect(addressTitle(row)).toBe("Casa");
  expect(addressTitle({ label: null, city: "Las Condes" })).toBe("Las Condes");
  expect(addressLines(row)).toEqual([
    "Camila Rojas Soto",
    "Av. Providencia 1234, Depto. 502",
    "Providencia, Región Metropolitana",
    "+56 9 1234 5678",
  ]);
  expect(addressLines({ ...row, line2: null, phone: null, region: "Valparaíso", city: "Viña del Mar" })).toEqual([
    "Camila Rojas Soto",
    "Av. Providencia 1234",
    "Viña del Mar, Valparaíso",
  ]);
});

test("sortAddresses: la principal primero, el resto en su orden", () => {
  const rows = [
    { id: "1", is_default: false },
    { id: "2", is_default: true },
    { id: "3", is_default: false },
  ];
  expect(sortAddresses(rows).map((r) => r.id)).toEqual(["2", "1", "3"]);
});
