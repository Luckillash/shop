import { describe, expect, test } from "vitest";
import { METROPOLITAN_REGION } from "@/lib/chile/regions";
import {
  errorSummary,
  MESSAGES,
  normalizeEmail,
  shippingFieldError,
  validateContact,
  validatePayment,
  validateShipping,
} from "./validation";

const valid = {
  firstName: "Ana",
  lastName: "Pérez",
  rut: "12.345.678-5",
  phone: "9 1234 5678",
  region: METROPOLITAN_REGION,
  commune: "Providencia",
  street: "Av. Providencia 1234",
  apartment: "",
  method: "standard",
};

test("normalizeEmail y validateContact", () => {
  expect(normalizeEmail("  Ana@Correo.CL ")).toBe("ana@correo.cl");
  expect(normalizeEmail("ana@correo")).toBeNull();
  expect(validateContact({ email: "nombre@" })).toEqual({ ok: false, errors: { email: MESSAGES.email } });
});

test("errorSummary", () => {
  expect(errorSummary(1, "continuar")).toBe("Revisa 1 dato para continuar");
  expect(errorSummary(3, "pagar")).toBe("Revisa 3 datos para pagar");
});

describe("validateShipping", () => {
  test("normaliza RUT y teléfono", () => {
    expect(validateShipping(valid)).toEqual({
      ok: true,
      data: {
        method: "standard",
        firstName: "Ana",
        lastName: "Pérez",
        rut: "12345678-5",
        phone: "+56912345678",
        address: { region: METROPOLITAN_REGION, commune: "Providencia", street: "Av. Providencia 1234", apartment: null },
      },
    });
  });

  test("mensajes del diseño, uno por campo", () => {
    const result = validateShipping({
      ...valid,
      firstName: " ",
      rut: "12.345.678-9",
      phone: "9123",
      commune: "",
      street: "Av. Providencia",
    });
    expect(!result.ok && result.errors).toEqual({
      firstName: MESSAGES.firstName,
      rut: MESSAGES.rut,
      phone: MESSAGES.phone,
      commune: MESSAGES.commune,
      street: MESSAGES.streetNumber,
    });
  });

  test("la comuna tiene que pertenecer a la región", () => {
    expect(shippingFieldError("commune", { ...valid, region: "Valparaíso" })).toBe(MESSAGES.commune);
  });

  test("retiro en tienda: no pide dirección", () => {
    const result = validateShipping({ ...valid, method: "pickup", region: "", commune: "", street: "" });
    expect(result.ok && result.data.address).toBeNull();
  });

  test("express solo en la Región Metropolitana", () => {
    const outside = validateShipping({ ...valid, method: "express", region: "Valparaíso", commune: "Viña del Mar" });
    expect(!outside.ok && outside.errors).toEqual({ method: MESSAGES.expressRegion });
    expect(validateShipping({ ...valid, method: "express" }).ok).toBe(true);
  });

  test("sin método de despacho", () => {
    const result = validateShipping({ ...valid, method: "" });
    expect(!result.ok && result.errors.method).toBe(MESSAGES.method);
  });
});

describe("validatePayment", () => {
  test("boleta: medio de pago y términos", () => {
    expect(validatePayment({ paymentMethod: "webpay", documentType: "boleta", terms: "on" })).toEqual({
      ok: true,
      data: { paymentMethod: "webpay", documentType: "boleta", invoice: null },
    });
    const missing = validatePayment({ documentType: "boleta" });
    expect(!missing.ok && missing.errors).toEqual({ paymentMethod: MESSAGES.paymentMethod, terms: MESSAGES.terms });
  });

  test("factura: razón social, RUT de la empresa y giro", () => {
    const missing = validatePayment({
      paymentMethod: "flow",
      documentType: "factura",
      terms: true,
      businessRut: "76.543.210-0",
    });
    expect(!missing.ok && missing.errors).toEqual({
      businessName: MESSAGES.businessName,
      businessRut: MESSAGES.rut,
      activity: MESSAGES.activity,
    });

    const ok = validatePayment({
      paymentMethod: "transfer",
      documentType: "factura",
      terms: "on",
      businessName: "Almacén SpA",
      businessRut: "76.543.210-3",
      activity: "Venta al por menor",
    });
    expect(ok.ok && ok.data.invoice).toEqual({
      business_name: "Almacén SpA",
      rut: "76543210-3",
      activity: "Venta al por menor",
    });
  });
});
