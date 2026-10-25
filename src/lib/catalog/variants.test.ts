import { describe, expect, test } from "vitest";
import {
  attributeGroups,
  cartItemName,
  defaultVariant,
  findVariant,
  isOptionAvailable,
  lowStockMessage,
  variantDescription,
  type VariantInfo,
} from "./variants";

// Como la Taza de gres del seed: Terracota agotada, Verde pino con stock bajo
const taza: VariantInfo[] = [
  { id: "ter", sku: "CER-TAZ-TER", name: "Terracota", attributes: { color: "Terracota" }, price: 12490 },
  { id: "pin", sku: "CER-TAZ-PIN", name: "Verde pino", attributes: { color: "Verde pino" }, price: 12490 },
  { id: "are", sku: "CER-TAZ-ARE", name: "Arena", attributes: { color: "Arena" }, price: 12490 },
];
const stock = { ter: 0, pin: 2, are: 18 };
const unica: VariantInfo = { id: "u", sku: "X", name: "Única", attributes: {}, price: 1 };

describe("attributeGroups", () => {
  test("agrupa los colores con su muestra", () => {
    const [group] = attributeGroups(taza);
    expect(group.label).toBe("Color");
    expect(group.type).toBe("color");
    expect(group.options.map((o) => o.label)).toEqual(["Terracota", "Verde pino", "Arena"]);
    expect(group.options[0].color).toMatch(/^#/);
  });

  test("usa el nombre de la variante como etiqueta de la talla", () => {
    const tabla: VariantInfo[] = [
      { id: "l", sku: "COC-TAB-L", name: "Grande", attributes: { talla: "L" }, price: 32990 },
      { id: "m", sku: "COC-TAB-M", name: "Mediana", attributes: { talla: "M" }, price: 24990 },
    ];
    const [group] = attributeGroups(tabla);
    expect(group).toMatchObject({ label: "Tamaño", type: "size" });
    expect(group.options).toEqual([
      { value: "L", label: "Grande", color: undefined },
      { value: "M", label: "Mediana", color: undefined },
    ]);
  });

  test("una variante Única no genera selectores", () => {
    expect(attributeGroups([unica])).toEqual([]);
  });
});

describe("selección y stock", () => {
  test("la variante por defecto es la primera con stock", () => {
    expect(defaultVariant(taza, stock)?.id).toBe("pin");
    expect(defaultVariant(taza, null)?.id).toBe("ter");
    expect(defaultVariant(taza, { ter: 0, pin: 0, are: 0 })?.id).toBe("ter");
  });

  test("encuentra la variante de la selección", () => {
    expect(findVariant(taza, { color: "Arena" })?.sku).toBe("CER-TAZ-ARE");
    expect(findVariant(taza, { color: "Azul" })).toBeUndefined();
  });

  test("las opciones agotadas no están disponibles", () => {
    expect(isOptionAvailable(taza, stock, { color: "Arena" }, "color", "Terracota")).toBe(false);
    expect(isOptionAvailable(taza, stock, { color: "Arena" }, "color", "Verde pino")).toBe(true);
  });
});

test("lowStockMessage avisa con 3 unidades o menos", () => {
  expect(lowStockMessage(2, "color")).toBe("Quedan 2 unidades de este color");
  expect(lowStockMessage(1)).toBe("Queda 1 unidad");
  expect(lowStockMessage(4, "color")).toBeNull();
  expect(lowStockMessage(0, "color")).toBeNull();
});

test("cartItemName omite la variante Única", () => {
  expect(cartItemName("Taza de gres esmaltado", taza[2])).toBe("Taza de gres esmaltado · Arena");
  expect(cartItemName("Florero", unica)).toBe("Florero");
});

test("variantDescription arma la línea del CartItem", () => {
  expect(variantDescription(taza[2])).toBe("Color: Arena");
  expect(variantDescription({ name: "Grande", attributes: { talla: "L" } })).toBe("Tamaño: Grande");
  expect(variantDescription({ name: "M / Negro", attributes: { talla: "M", color: "Negro" } })).toBe(
    "Tamaño: M · Color: Negro",
  );
  expect(variantDescription(unica)).toBeNull();
});
