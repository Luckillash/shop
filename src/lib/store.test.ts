import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { STORE } from "./store";

// La dirección del retiro está en dos lugares (D-014): STORE.pickup y place_order. Este test avisa
// si se cambia uno y no el otro.
test("la dirección del retiro de STORE coincide con la de place_order", () => {
  const schema = readFileSync(join(process.cwd(), "documentación/03-base-de-datos/sql/ecommerce_schema.sql"), "utf8");
  const placeOrder = schema.slice(schema.indexOf("create or replace function public.place_order"));
  const pickup = placeOrder.slice(placeOrder.indexOf("'type',           'pickup'"), placeOrder.indexOf("else"));

  expect(pickup).toContain(`'store',          '${STORE.pickup.name}'`);
  expect(pickup).toContain(`'line1',          '${STORE.pickup.street}'`);
  expect(pickup).toContain(`'line2',          '${STORE.pickup.unit}'`);
  expect(pickup).toContain(`'city',           '${STORE.pickup.commune}'`);
  expect(STORE.pickup.address).toBe(`${STORE.pickup.street}, ${STORE.pickup.unit}, ${STORE.pickup.commune}`);
});
