import { expect, test } from "vitest";
import {
  charCount,
  formatAverage,
  latestDelivered,
  orderCommune,
  parseRating,
  purchaseLine,
  ratingWords,
  REVIEW_MESSAGES,
  reviewCountLabel,
  reviewErrorState,
  reviewLoginHref,
  reviewSignature,
  signatureHint,
  signatureName,
  validateReview,
} from "./review";

const BODY = "Linda taza, conserva bien el calor.";

test("ratingWords: la calificación en palabras del artboard", () => {
  expect(ratingWords(1)).toBe("1 de 5 · Mala");
  expect(ratingWords(3)).toBe("3 de 5 · Buena");
  expect(ratingWords(4)).toBe("4 de 5 · Muy buena");
  expect(ratingWords(5)).toBe("5 de 5 · Excelente");
});

test("parseRating solo acepta enteros de 1 a 5", () => {
  expect(parseRating("4")).toBe(4);
  expect(parseRating(5)).toBe(5);
  expect(parseRating("0")).toBeNull();
  expect(parseRating("6")).toBeNull();
  expect(parseRating("3.5")).toBeNull();
  expect(parseRating(null)).toBeNull();
  expect(parseRating("")).toBeNull();
});

test("validateReview: calificación, texto de 20 caracteres y título opcional", () => {
  expect(validateReview({ rating: "4", title: "  ", body: `  ${BODY}  ` }, false)).toEqual({
    ok: true,
    data: { rating: 4, title: null, body: BODY, firstName: null },
  });
  expect(validateReview({ rating: "5", title: " Linda   y resistente ", body: BODY }, false)).toMatchObject({
    ok: true,
    data: { title: "Linda y resistente" },
  });

  const empty = validateReview({ rating: null, title: "", body: "" }, false);
  expect(empty).toEqual({ ok: false, errors: { rating: REVIEW_MESSAGES.rating, body: REVIEW_MESSAGES.bodyShort } });

  expect(validateReview({ rating: "4", title: "", body: "x".repeat(19) }, false)).toMatchObject({
    errors: { body: REVIEW_MESSAGES.bodyShort },
  });
  expect(validateReview({ rating: "4", title: "", body: "x".repeat(20) }, false).ok).toBe(true);
  expect(validateReview({ rating: "4", title: "", body: "x".repeat(2001) }, false)).toMatchObject({
    errors: { body: REVIEW_MESSAGES.bodyLong },
  });
  expect(validateReview({ rating: "4", title: "x".repeat(81), body: BODY }, false)).toMatchObject({
    errors: { title: REVIEW_MESSAGES.titleLong },
  });
});

test("validateReview cuenta los caracteres como Postgres (un emoji es uno)", () => {
  expect(charCount("☕☕")).toBe(2);
  expect("😀".length).toBe(2);
  expect(charCount("😀")).toBe(1);
  // 10 emojis = 20 unidades UTF-16 pero 10 caracteres: no alcanza el mínimo
  expect(validateReview({ rating: "4", title: "", body: "😀".repeat(10) }, false).ok).toBe(false);
});

test("validateReview pide el nombre solo si la cuenta no lo tiene", () => {
  expect(validateReview({ rating: "4", title: "", body: BODY, firstName: "" }, true)).toEqual({
    ok: false,
    errors: { firstName: REVIEW_MESSAGES.firstName },
  });
  expect(validateReview({ rating: "4", title: "", body: BODY, firstName: "  Camila  " }, true)).toMatchObject({
    ok: true,
    data: { firstName: "Camila" },
  });
  // Sin pedirlo, lo que venga se ignora
  expect(validateReview({ rating: "4", title: "", body: BODY, firstName: "Otra" }, false)).toMatchObject({
    data: { firstName: null },
  });
});

test("signatureName: la regla de greetingName (y del trigger)", () => {
  expect(signatureName({ first_name: "María José", full_name: "María José Registro" })).toBe("María");
  expect(signatureName({ first_name: null, full_name: "Rocío Invitada Prueba" })).toBe("Rocío");
  expect(signatureName({ first_name: "  ", full_name: " Camila  Rojas " })).toBe("Camila");
  expect(signatureName({ first_name: null, full_name: null })).toBeNull();
  expect(signatureName(null)).toBeNull();
});

test("orderCommune: la comuna del despacho; nada en el retiro en tienda", () => {
  const delivery = { shipping_method: "standard", shipping_address: { type: "delivery", city: "Providencia" } };
  expect(orderCommune(delivery)).toBe("Providencia");
  expect(orderCommune({ shipping_method: "pickup", shipping_address: { type: "pickup", city: "Las Condes" } })).toBeNull();
  expect(orderCommune({ shipping_method: "standard", shipping_address: { type: "pickup", city: "Las Condes" } })).toBeNull();
  expect(orderCommune({ shipping_method: "express", shipping_address: { city: "  " } })).toBeNull();
  expect(orderCommune({ shipping_method: "express", shipping_address: null })).toBeNull();
});

test("latestDelivered: el entregado más reciente, como el trigger", () => {
  const a = { id: "1044", placed_at: "2026-10-27T22:05:51Z", delivered_at: "2026-10-27T22:08:10Z" };
  const b = { id: "1047", placed_at: "2026-10-27T22:05:51Z", delivered_at: "2026-10-27T22:15:22Z" };
  const c = { id: "sin fecha", placed_at: "2026-10-20T10:00:00Z", delivered_at: null };
  expect(latestDelivered([a, b, c])?.id).toBe("1047");
  expect(latestDelivered([c, a])?.id).toBe("1044");
  expect(latestDelivered([])).toBeNull();
});

test("reviewSignature y signatureHint: Nombre · Comuna, sin comuna en el retiro", () => {
  expect(reviewSignature("Camila", "Providencia")).toBe("Camila · Providencia");
  expect(reviewSignature("Camila", null)).toBe("Camila");
  expect(reviewSignature(null, null)).toBe("");
  expect(signatureHint("Camila", "Providencia")).toBe(
    "Mínimo 20 caracteres. Se publica con tu nombre y comuna: Camila · Providencia.",
  );
  expect(signatureHint("María", null)).toBe("Mínimo 20 caracteres. Se publica con tu nombre: María.");
  expect(signatureHint(null, "Providencia")).toBe(
    "Mínimo 20 caracteres. Se publica con tu nombre y comuna: tu nombre · Providencia.",
  );
});

test("purchaseLine: variante y fecha de compra en hora de Chile", () => {
  expect(purchaseLine("Color", "Pino", "2026-10-16T15:00:00Z")).toBe("Color: Pino · La compraste el 16 de octubre");
  // 00:30 UTC del 17 son las 21:30 del 16 en Santiago
  expect(purchaseLine("Color", "Pino", "2026-10-17T00:30:00Z")).toBe("Color: Pino · La compraste el 16 de octubre");
  expect(purchaseLine(null, "1 litro", "2026-10-27T22:05:51Z")).toBe("1 litro · La compraste el 27 de octubre");
  expect(purchaseLine(null, "Única", "2026-10-27T22:05:51Z")).toBe("La compraste el 27 de octubre");
});

test("reviewCountLabel, formatAverage y reviewLoginHref", () => {
  expect(reviewCountLabel(1)).toBe("Basado en 1 opinión");
  expect(reviewCountLabel(128)).toBe("Basado en 128 opiniones");
  expect(formatAverage(4.6)).toBe("4,6");
  expect(formatAverage(4)).toBe("4,0");
  expect(reviewLoginHref("/productos/taza-de-gres")).toBe("/ingresar?volver=%2Fproductos%2Ftaza-de-gres%23opiniones");
});

test("reviewErrorState traduce los errores de la BD", () => {
  expect(reviewErrorState({ code: "23505", message: "Ya publicaste…" })).toEqual({
    status: "error",
    errors: {},
    message: REVIEW_MESSAGES.duplicate,
  });
  expect(reviewErrorState({ code: "42501", message: "new row violates row-level security policy" })).toMatchObject({
    message: REVIEW_MESSAGES.notEligible,
  });
  expect(reviewErrorState({ code: "P0001", message: "review_author_name_missing" })).toEqual({
    status: "error",
    errors: { firstName: REVIEW_MESSAGES.firstName },
  });
  expect(reviewErrorState({ code: "23514", message: 'violates check constraint "reviews_title_length"' })).toMatchObject({
    errors: { title: REVIEW_MESSAGES.titleLong },
  });
  expect(reviewErrorState({ code: "23514", message: 'violates check constraint "reviews_body_length"' })).toMatchObject({
    errors: { body: REVIEW_MESSAGES.bodyShort },
  });
  expect(reviewErrorState({ code: "XX000" })).toMatchObject({ message: REVIEW_MESSAGES.generic });
});
