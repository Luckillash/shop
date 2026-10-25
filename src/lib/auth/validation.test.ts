import { expect, test } from "vitest";
import {
  AUTH_MESSAGES,
  safeNext,
  validateLogin,
  validateNewPassword,
  validateResetRequest,
  validateSignup,
} from "./validation";

test("validateLogin", () => {
  expect(validateLogin({ email: "Ana@Correo.cl", password: "x" })).toEqual({
    ok: true,
    data: { email: "ana@correo.cl", password: "x" },
  });
  expect(validateLogin({ email: "", password: "" })).toEqual({
    ok: false,
    errors: { email: AUTH_MESSAGES.email, password: AUTH_MESSAGES.password },
  });
});

test("validateSignup: nombre, correo y contraseña de 8 caracteres", () => {
  expect(validateSignup({ name: "", email: "ana@correo.cl", password: "1234567" })).toEqual({
    ok: false,
    errors: { name: AUTH_MESSAGES.name, password: AUTH_MESSAGES.newPassword },
  });
  expect(validateSignup({ name: " Ana ", email: "ana@correo.cl", password: "12345678", newsletter: "on" })).toEqual({
    ok: true,
    data: { name: "Ana", email: "ana@correo.cl", password: "12345678", newsletter: true },
  });
});

test("safeNext solo acepta rutas internas", () => {
  expect(safeNext("/checkout")).toBe("/checkout");
  expect(safeNext("https://otro.cl")).toBe("/");
  expect(safeNext("//otro.cl")).toBe("/");
  expect(safeNext("/\\otro.cl")).toBe("/");
  expect(safeNext(undefined, "/cuenta")).toBe("/cuenta");
});

test("validateResetRequest: solo un correo válido", () => {
  expect(validateResetRequest({ email: " Ana@Correo.cl " })).toEqual({ ok: true, data: { email: "ana@correo.cl" } });
  expect(validateResetRequest({ email: "ana@" })).toEqual({ ok: false, errors: { email: AUTH_MESSAGES.email } });
});

test("validateNewPassword: 8 caracteres y la misma en los dos campos", () => {
  expect(validateNewPassword({ password: "1234567", confirm: "1234567" })).toEqual({
    ok: false,
    errors: { password: AUTH_MESSAGES.newPassword },
  });
  expect(validateNewPassword({ password: "12345678", confirm: "12345679" })).toEqual({
    ok: false,
    errors: { confirm: AUTH_MESSAGES.passwordMismatch },
  });
  expect(validateNewPassword({ password: "12345678", confirm: "12345678" })).toEqual({
    ok: true,
    data: { password: "12345678" },
  });
});
