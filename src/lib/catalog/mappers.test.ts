import { expect, test } from "vitest";
import { maxDiscount, productDetails, toCatalogItem, toCatalogItems, toMetadata, type CatalogRow } from "./mappers";

// numeric puede llegar como string desde PostgREST (trampa 14)
const row: CatalogRow = {
  id: "p1",
  slug: "manta-de-lana-tejida",
  name: "Manta de lana tejida",
  description: null,
  base_price: 39990,
  compare_at_price: "52990.00" as unknown as number,
  currency: "CLP",
  is_featured: true,
  category_id: "c1",
  category_slug: "textiles",
  category_name: "Textiles",
  brand_name: "Telar Andino",
  min_price: "39990.00" as unknown as number,
  total_stock: 10,
  cover_image: "https://placehold.co/1200x1500",
  avg_rating: null,
  review_count: 0,
  created_at: "2026-10-23T00:00:00Z",
};

test("toCatalogItem normaliza numeric a CLP entero y marca la oferta", () => {
  expect(toCatalogItem(row, ["v1", "v2"])).toMatchObject({
    price: 39990,
    compareAt: 52990,
    soldOut: false,
    stock: 10,
    rating: null,
    singleVariantId: null,
  });
  expect(toCatalogItem(row, ["v1"])?.singleVariantId).toBe("v1");
});

test("compare_at_price menor o igual al precio no es oferta, y sin stock es agotado", () => {
  expect(toCatalogItem({ ...row, compare_at_price: 39990, total_stock: 0 })).toMatchObject({
    compareAt: null,
    soldOut: true,
    stock: 0,
  });
});

test("toCatalogItems descarta filas sin id y usa las variantes de cada producto", () => {
  const items = toCatalogItems([row, { ...row, id: null }], { p1: ["v9"] });
  expect(items).toHaveLength(1);
  expect(items[0].singleVariantId).toBe("v9");
});

test("productDetails sigue el orden del diseño y omite el origen", () => {
  const metadata = toMetadata({ origen: "Pomaire", cuidado: "Lavavajillas", material: "Gres", otro: 3 });
  expect(productDetails(metadata)).toEqual([
    { label: "Material", value: "Gres" },
    { label: "Cuidado", value: "Lavavajillas" },
  ]);
  expect(toMetadata(null)).toEqual({});
});

test("maxDiscount devuelve el mayor −N%", () => {
  const items = toCatalogItems([row, { ...row, id: "p2", min_price: 16990, compare_at_price: 21990 }]);
  expect(maxDiscount(items)).toBe(25);
  expect(maxDiscount([])).toBe(0);
});
