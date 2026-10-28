import { describe, expect, test } from "vitest";
import {
  fullNameOf,
  greetingName,
  PROFILE_MESSAGES,
  profileFieldError,
  profileValues,
  validatePasswordChange,
  validateProfile,
} from "./profile";

const empty = { full_name: null, first_name: null, last_name: null, phone: null, rut: null, newsletter_opt_in_at: null };

describe("validateProfile", () => {
  test("normaliza nombre, teléfono y RUT para guardar", () => {
    expect(validateProfile({ firstName: "  María José ", lastName: "Pérez  Soto", phone: "9 1234 5678", rut: "12.345.678-5" })).toEqual({
      ok: true,
      data: { first_name: "María José", last_name: "Pérez Soto", full_name: "María José Pérez Soto", phone: "+56912345678", rut: "12345678-5" },
    });
  });

  test("el apellido, el teléfono y el RUT son opcionales", () => {
    expect(validateProfile({ firstName: "Camila", lastName: "", phone: "", rut: "" })).toEqual({
      ok: true,
      data: { first_name: "Camila", last_name: null, full_name: "Camila", phone: null, rut: null },
    });
  });

  test("RUT con K minúscula", () => {
    const result = validateProfile({ firstName: "Ana", rut: "10.000.013-k" });
    expect(result.ok && result.data.rut).toBe("10000013-K");
  });

  test("errores: sin nombre, teléfono incompleto y dígito verificador", () => {
    expect(validateProfile({ firstName: " ", phone: "9 1234", rut: "11.111.111-2" })).toEqual({
      ok: false,
      errors: { firstName: PROFILE_MESSAGES.firstName, phone: PROFILE_MESSAGES.phone, rut: PROFILE_MESSAGES.rut },
    });
    expect(profileFieldError("rut", { rut: "11.111.111-1" })).toBeNull();
    expect(profileFieldError("lastName", { lastName: "" })).toBeNull();
  });
});

describe("profileValues", () => {
  test("separa full_name cuando la cuenta todavía no tiene nombre y apellido", () => {
    expect(profileValues({ ...empty, full_name: "Rocío Fernández Díaz" })).toEqual({
      firstName: "Rocío",
      lastName: "Fernández Díaz",
      phone: "",
      rut: "",
    });
  });

  test("usa las columnas separadas y muestra teléfono y RUT con formato", () => {
    expect(
      profileValues({
        ...empty,
        full_name: "María José Pérez",
        first_name: "María José",
        last_name: "Pérez",
        phone: "+56912345678",
        rut: "12345678-5",
      }),
    ).toEqual({ firstName: "María José", lastName: "Pérez", phone: "+56 9 1234 5678", rut: "12.345.678-5" });
  });

  test("sin perfil, vacío", () => {
    expect(profileValues(null)).toEqual({ firstName: "", lastName: "", phone: "", rut: "" });
  });
});

test("greetingName: first_name o la primera palabra de full_name", () => {
  expect(greetingName({ first_name: "María José", full_name: "María José Pérez" })).toBe("María");
  expect(greetingName({ first_name: null, full_name: "Camila Rojas" })).toBe("Camila");
  expect(greetingName({ first_name: " ", full_name: null })).toBeNull();
  expect(greetingName(null)).toBeNull();
});

test("fullNameOf", () => {
  expect(fullNameOf("Camila", "Rojas")).toBe("Camila Rojas");
  expect(fullNameOf("Camila", null)).toBe("Camila");
});

test("validatePasswordChange: mínimo 8 caracteres", () => {
  expect(validatePasswordChange({ password: "corta" })).toEqual({ ok: false, errors: { password: PROFILE_MESSAGES.password } });
  expect(validatePasswordChange({ password: "suficiente" })).toEqual({ ok: true, data: { password: "suficiente" } });
  expect(validatePasswordChange({ password: null }).ok).toBe(false);
});
