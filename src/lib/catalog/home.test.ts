import { describe, expect, test } from "vitest";
import { homeProductSection, parseBestSellersSince } from "./home";
import type { CatalogItem } from "./mappers";

function item(id: string): CatalogItem {
  return {
    id,
    slug: id,
    name: id,
    brand: null,
    image: null,
    price: 10000,
    compareAt: null,
    rating: null,
    reviewCount: 0,
    soldOut: false,
    stock: 5,
    singleVariantId: null,
  };
}

const featured = ["d1", "d2", "d3", "d4"].map(item);

describe("homeProductSection", () => {
  test("con 4 vendidos muestra Los más vendidos en el orden del ranking", () => {
    const sellers = ["v3", "v1", "v4", "v2"].map(item);
    const section = homeProductSection(sellers, featured);
    expect(section.id).toBe("mas-vendidos");
    expect(section.title).toBe("Los más vendidos");
    expect(section.items.map((i) => i.id)).toEqual(["v3", "v1", "v4", "v2"]);
  });

  test("con más de 4 vendidos muestra solo los 4 primeros", () => {
    const section = homeProductSection(["v1", "v2", "v3", "v4", "v5"].map(item), featured);
    expect(section.items.map((i) => i.id)).toEqual(["v1", "v2", "v3", "v4"]);
  });

  test("con 1 a 3 vendidos vuelve a Destacados sin mezclar", () => {
    const section = homeProductSection(["v1", "v2", "v3"].map(item), featured);
    expect(section).toEqual({ id: "destacados", title: "Destacados", items: featured });
  });

  test("sin vendidos muestra Destacados", () => {
    expect(homeProductSection([], featured).title).toBe("Destacados");
  });
});

describe("parseBestSellersSince", () => {
  test("sin valor o con un valor inválido no hay fecha", () => {
    expect(parseBestSellersSince(undefined)).toBeNull();
    expect(parseBestSellersSince("  ")).toBeNull();
    expect(parseBestSellersSince("lanzamiento")).toBeNull();
  });

  test("normaliza la fecha a ISO", () => {
    expect(parseBestSellersSince("2026-11-01T03:00:00Z")).toBe("2026-11-01T03:00:00.000Z");
    expect(parseBestSellersSince(" 2026-11-01T00:00:00-03:00 ")).toBe("2026-11-01T03:00:00.000Z");
  });
});
