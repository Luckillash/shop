import { expect, test } from "vitest";
import { safeNext } from "@/lib/auth/validation";
import { guardedRoute, loginPath, needsLogin } from "./proxy-routes";

test("guardedRoute: Detalle, administración y el resto de la cuenta", () => {
  expect(guardedRoute("/cuenta/pedidos/1045")).toEqual({ kind: "order-detail", orderNumber: "1045" });
  expect(guardedRoute("/cuenta/pedidos/1045/")).toEqual({ kind: "order-detail", orderNumber: "1045" });
  expect(guardedRoute("/admin")).toEqual({ kind: "admin" });
  expect(guardedRoute("/admin/pedidos/1045")).toEqual({ kind: "admin" });
  for (const path of ["/cuenta", "/cuenta/", "/cuenta/pedidos", "/cuenta/direcciones", "/cuenta/favoritos", "/cuenta/datos"]) {
    expect(guardedRoute(path)).toEqual({ kind: "account" });
  }
});

test("guardedRoute: no toca las demás rutas", () => {
  for (const path of ["/", "/ingresar", "/checkout", "/cuentas", "/cuenta-nueva", "/administracion", "/productos/taza"]) {
    expect(guardedRoute(path)).toBeNull();
  }
});

test("needsLogin: sin sesión o invitado", () => {
  expect(needsLogin(undefined)).toBe(true);
  expect(needsLogin({})).toBe(true);
  expect(needsLogin({ sub: "u1", is_anonymous: true })).toBe(true);
  expect(needsLogin({ sub: "u1", is_anonymous: false })).toBe(false);
  expect(needsLogin({ sub: "u1" })).toBe(false);
});

test("loginPath: vuelve a la ruta y su query, y Ingresar la acepta", () => {
  expect(loginPath("/cuenta/datos")).toBe("/ingresar?volver=%2Fcuenta%2Fdatos");
  const path = loginPath("/cuenta/favoritos", "?orden=precio&x=1");
  expect(path).toBe("/ingresar?volver=%2Fcuenta%2Ffavoritos%3Forden%3Dprecio%26x%3D1");
  const volver = new URL(path, "https://audazia.dev").searchParams.get("volver");
  expect(volver).toBe("/cuenta/favoritos?orden=precio&x=1");
  expect(safeNext(volver)).toBe("/cuenta/favoritos?orden=precio&x=1");
});
