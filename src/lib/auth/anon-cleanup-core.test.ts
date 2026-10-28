import { expect, test } from "vitest";
import { anonCleanupEnabled, parseCleanupResult } from "./anon-cleanup-core";

test("anonCleanupEnabled: solo borra con true explícito", () => {
  expect(anonCleanupEnabled("true")).toBe(true);
  expect(anonCleanupEnabled(" TRUE ")).toBe(true);
  expect(anonCleanupEnabled(undefined)).toBe(false);
  expect(anonCleanupEnabled("")).toBe(false);
  expect(anonCleanupEnabled("1")).toBe(false);
  expect(anonCleanupEnabled("false")).toBe(false);
});

test("parseCleanupResult: lee { checked, deleted } y rechaza otra forma", () => {
  expect(parseCleanupResult({ checked: 3, deleted: 3 }, false)).toEqual({ checked: 3, deleted: 3, dryRun: false });
  expect(parseCleanupResult({ checked: 2, deleted: 0 }, true)).toEqual({ checked: 2, deleted: 0, dryRun: true });
  expect(() => parseCleanupResult(null, false)).toThrow();
  expect(() => parseCleanupResult({ checked: "3", deleted: 0 }, false)).toThrow();
  expect(() => parseCleanupResult([], false)).toThrow();
});
