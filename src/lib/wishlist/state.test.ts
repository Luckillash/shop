import { expect, test } from "vitest";
import { isProductId, mayHaveSession, savedCountLabel, wishlistLoginHref, withWishlisted } from "./state";

const ID = "8f3c2b1a-1234-4abc-9def-0123456789ab";

test("isProductId", () => {
  expect(isProductId(ID)).toBe(true);
  expect(isProductId("abc")).toBe(false);
  expect(isProductId(null)).toBe(false);
});

test("wishlistLoginHref: vuelve a la página y lleva el producto pendiente", () => {
  expect(wishlistLoginHref("/productos/manta-merino", ID)).toBe(`/ingresar?volver=%2Fproductos%2Fmanta-merino&favorito=${ID}`);
  expect(wishlistLoginHref("/buscar?q=taza", ID)).toBe(`/ingresar?volver=%2Fbuscar%3Fq%3Dtaza&favorito=${ID}`);
  expect(wishlistLoginHref("", "no-es-un-id")).toBe("/ingresar?volver=%2F");
});

test("withWishlisted: agrega al principio sin repetir y quita", () => {
  expect(withWishlisted(["a", "b"], "c", true)).toEqual(["c", "a", "b"]);
  expect(withWishlisted(["a", "b"], "b", true)).toEqual(["b", "a"]);
  expect(withWishlisted(["a", "b"], "a", false)).toEqual(["b"]);
});

test("mayHaveSession: cookie de Supabase, también en trozos", () => {
  expect(mayHaveSession("sb-abcdef-auth-token=base64-xyz")).toBe(true);
  expect(mayHaveSession("theme=dark; sb-abcdef-auth-token.0=base64-xyz")).toBe(true);
  expect(mayHaveSession("theme=dark; delivery_commune=Providencia")).toBe(false);
  expect(mayHaveSession("")).toBe(false);
});

test("savedCountLabel", () => {
  expect(savedCountLabel(1)).toBe("1 producto guardado");
  expect(savedCountLabel(4)).toBe("4 productos guardados");
});
