import { expect, test } from "vitest";
import { COMMUNE_COUNT, communesOf, isCommuneOf, isRegion, METROPOLITAN_REGION, REGIONS } from "./regions";

test("16 regiones y 346 comunas (SUBDERE)", () => {
  expect(REGIONS).toHaveLength(16);
  expect(COMMUNE_COUNT).toBe(346);
  expect(communesOf(METROPOLITAN_REGION)).toHaveLength(52);
});

test("sin despacho a Isla de Pascua, Juan Fernández ni Antártica", () => {
  const all = REGIONS.flatMap((r) => r.communes);
  expect(all).toHaveLength(343);
  expect(all).not.toContain("Isla de Pascua");
  expect(all).not.toContain("Juan Fernández");
  expect(all).not.toContain("Antártica");
  expect(new Set(all).size).toBe(all.length);
});

test("comunas ordenadas alfabéticamente dentro de cada región", () => {
  const rm = communesOf(METROPOLITAN_REGION);
  expect(rm[0]).toBe("Alhué");
  expect([...rm].sort((a, b) => a.localeCompare(b, "es"))).toEqual(rm);
});

test("la comuna tiene que ser de la región elegida", () => {
  expect(isRegion("Valparaíso")).toBe(true);
  expect(isRegion("Región Metropolitana")).toBe(false);
  expect(isCommuneOf(METROPOLITAN_REGION, "Providencia")).toBe(true);
  expect(isCommuneOf("Valparaíso", "Providencia")).toBe(false);
  expect(isCommuneOf("Valparaíso", "Isla de Pascua")).toBe(false);
  expect(communesOf("No existe")).toEqual([]);
});
