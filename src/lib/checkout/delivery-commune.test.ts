import { expect, test } from "vitest";
import { METROPOLITAN_REGION } from "@/lib/chile/regions";
import {
  deliveryCommuneCookie,
  parseDeliveryCommune,
  readDeliveryCommune,
  serializeDeliveryCommune,
} from "./delivery-commune";

const nunoa = { region: METROPOLITAN_REGION, commune: "Ñuñoa" };

test("la comuna de despacho va y vuelve de la cookie", () => {
  expect(parseDeliveryCommune(serializeDeliveryCommune(nunoa))).toEqual(nunoa);
});

test("una cookie vacía, alterada o con una comuna sin despacho se ignora", () => {
  expect(parseDeliveryCommune(undefined)).toBeNull();
  expect(parseDeliveryCommune("no-es-json")).toBeNull();
  expect(parseDeliveryCommune(JSON.stringify({ region: METROPOLITAN_REGION, commune: "Providencia" }))).toBeNull();
  expect(parseDeliveryCommune(JSON.stringify(["Valparaíso", "Providencia"]))).toBeNull();
  expect(parseDeliveryCommune(JSON.stringify(["Valparaíso", "Isla de Pascua"]))).toBeNull();
});

test("se escribe y se lee desde document.cookie, entre otras cookies", () => {
  const written = deliveryCommuneCookie(nunoa, true);
  expect(written).toMatch(/^comuna_despacho=[^;]+; Max-Age=31536000; Path=\/; SameSite=Lax; Secure$/);
  const pair = written.split(";")[0];
  expect(readDeliveryCommune(`sb-x-auth-token=abc; ${pair}; otra=1`)).toEqual(nunoa);
  expect(readDeliveryCommune("otra=1")).toBeNull();
  expect(readDeliveryCommune("comuna_despacho=%E0%A4%A")).toBeNull();
});
