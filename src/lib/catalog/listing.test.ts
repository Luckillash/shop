import { describe, expect, test } from "vitest";
import { DEFAULT_FILTERS, listingHref, MAX_PAGE, normalizeQuery, parseListingParams, productCount } from "./listing";

describe("parseListingParams", () => {
  test("sin parámetros usa los valores por defecto", () => {
    expect(parseListingParams({})).toEqual(DEFAULT_FILTERS);
  });

  test("lee orden, disponibilidad, precio y página", () => {
    expect(
      parseListingParams({ orden: "menor-precio", disponible: "1", precio: "15000-30000", pagina: "2" }),
    ).toEqual({ sort: "menor-precio", inStock: true, price: "15000-30000", page: 2 });
  });

  test("ignora valores desconocidos y acota la página", () => {
    expect(parseListingParams({ orden: "x", precio: "gratis", pagina: "-3", disponible: "si" })).toEqual(
      DEFAULT_FILTERS,
    );
    expect(parseListingParams({ pagina: "9999" }).page).toBe(MAX_PAGE);
  });

  test("con valores repetidos usa el primero y respeta el orden por defecto de la página", () => {
    expect(parseListingParams({ orden: ["mayor-precio", "novedades"] }).sort).toBe("mayor-precio");
    expect(parseListingParams({}, "novedades").sort).toBe("novedades");
  });
});

describe("listingHref", () => {
  test("omite los valores por defecto y mantiene un orden fijo", () => {
    expect(listingHref("/categorias/ceramica", DEFAULT_FILTERS)).toBe("/categorias/ceramica");
    expect(
      listingHref("/ofertas", DEFAULT_FILTERS, { page: 2, price: "desde-30000", inStock: true, sort: "novedades" }),
    ).toBe("/ofertas?orden=novedades&disponible=1&precio=desde-30000&pagina=2");
  });

  test("el orden por defecto depende de la página", () => {
    const filters = parseListingParams({}, "novedades");
    expect(listingHref("/novedades", filters, {}, "novedades")).toBe("/novedades");
    expect(listingHref("/novedades", filters, { sort: "destacados" }, "novedades")).toBe(
      "/novedades?orden=destacados",
    );
  });
});

test("normalizeQuery recorta espacios y largo", () => {
  expect(normalizeQuery({ q: "  taza   de  gres " })).toBe("taza de gres");
  expect(normalizeQuery({})).toBe("");
  expect(normalizeQuery({ q: "a".repeat(200) })).toHaveLength(80);
});

test("productCount usa singular y plural", () => {
  expect(productCount(1)).toBe("1 producto");
  expect(productCount(12)).toBe("12 productos");
});
