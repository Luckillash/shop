import { describe, expect, it } from "vitest";
import {
  canCreateAccountFrom,
  emailSentText,
  emailTakenText,
  GUEST_ACCOUNT_MESSAGES,
  guestAccountName,
  guestAccountView,
  orderStatusHref,
  validateGuestAccount,
} from "./guest-account";

describe("validateGuestAccount", () => {
  it("exige 8 caracteres en la contraseña", () => {
    expect(validateGuestAccount({ password: "1234567" })).toEqual({
      ok: false,
      errors: { password: GUEST_ACCOUNT_MESSAGES.password },
    });
    expect(validateGuestAccount({ password: undefined }).ok).toBe(false);
  });

  it("acepta la contraseña sin recortarla y lee la casilla de novedades", () => {
    expect(validateGuestAccount({ password: " clave 123 ", newsletter: "on" })).toEqual({
      ok: true,
      data: { password: " clave 123 ", newsletter: true },
    });
    expect(validateGuestAccount({ password: "12345678", newsletter: null })).toEqual({
      ok: true,
      data: { password: "12345678", newsletter: false },
    });
  });

  it("ignora un correo que venga en el formulario", () => {
    const result = validateGuestAccount({ password: "12345678", email: "otro@correo.cl" } as never);
    expect(result).toEqual({ ok: true, data: { password: "12345678", newsletter: false } });
  });
});

describe("canCreateAccountFrom", () => {
  it("solo con el pedido pagado (los estados de la Confirmación)", () => {
    for (const status of ["paid", "processing", "shipped", "delivered"]) expect(canCreateAccountFrom(status)).toBe(true);
    for (const status of ["pending", "cancelled", "refunded", "otro"]) expect(canCreateAccountFrom(status)).toBe(false);
  });
});

describe("guestAccountName", () => {
  it("usa el destinatario del pedido, sin espacios de más y hasta 80 caracteres", () => {
    expect(guestAccountName({ recipient_name: "  Ana   Pérez " })).toBe("Ana Pérez");
    expect(guestAccountName({ recipient_name: "a".repeat(90) })).toHaveLength(80);
  });

  it("devuelve null sin destinatario", () => {
    expect(guestAccountName({})).toBeNull();
    expect(guestAccountName({ recipient_name: "   " })).toBeNull();
    expect(guestAccountName({ recipient_name: 3 })).toBeNull();
    expect(guestAccountName(null)).toBeNull();
  });
});

describe("guestAccountView", () => {
  it("invitado dueño del pedido: formulario, o el aviso si ya pidió la cuenta", () => {
    expect(guestAccountView({ isAnonymous: true, ownsOrder: true, pendingEmail: null })).toBe("form");
    expect(guestAccountView({ isAnonymous: true, ownsOrder: true, pendingEmail: "ana@correo.cl" })).toBe("sent");
  });

  it("cuenta normal dueña del pedido: Ver estado del pedido", () => {
    expect(guestAccountView({ isAnonymous: false, ownsOrder: true, pendingEmail: null })).toBe("account");
  });

  it("sin sesión o con un pedido ajeno: nada", () => {
    expect(guestAccountView({ isAnonymous: null, ownsOrder: false, pendingEmail: null })).toBe("none");
    expect(guestAccountView({ isAnonymous: false, ownsOrder: false, pendingEmail: null })).toBe("none");
    expect(guestAccountView({ isAnonymous: true, ownsOrder: false, pendingEmail: null })).toBe("none");
  });
});

describe("textos", () => {
  it("correo enviado", () => {
    expect(emailSentText("ana@correo.cl")).toEqual({
      title: "Revisa tu correo para terminar",
      body: "Te enviamos un correo a ana@correo.cl para confirmar tu cuenta. Cuando abras el enlace, vas a ver este pedido en Mis pedidos. Si no lo ves, revisa la carpeta de spam.",
    });
  });

  it("correo con cuenta: pide ingresar y no promete sumar el pedido", () => {
    const text = emailTakenText("ana@correo.cl");
    expect(text.title).toBe("Ya hay una cuenta con ana@correo.cl");
    expect(text.body).toContain("no se suma a esa cuenta");
  });

  it("Ver estado del pedido lleva al Detalle de la cuenta", () => {
    expect(orderStatusHref(1037)).toBe("/cuenta/pedidos/1037");
  });
});
