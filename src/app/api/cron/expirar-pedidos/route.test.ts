// @vitest-environment node
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { NextRequest } from "next/server";

const expireOrders = vi.fn();
const cleanupAnonymousUsers = vi.fn();
vi.mock("@/lib/payments/expire", () => ({ expireOrders }));
vi.mock("@/lib/auth/anon-cleanup", () => ({ cleanupAnonymousUsers }));

const { GET } = await import("./route");

const request = (authorization?: string) =>
  new Request("http://localhost/api/cron/expirar-pedidos", {
    headers: authorization ? { authorization } : {},
  }) as unknown as NextRequest;

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", "secreto");
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  expireOrders.mockResolvedValue({ checked: 1, cancelled: 1, recovered: 0, skipped: 0 });
  cleanupAnonymousUsers.mockResolvedValue({ checked: 2, deleted: 2, dryRun: false });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

test("sin el secreto: 401 y no corre nada", async () => {
  expect((await GET(request())).status).toBe(401);
  expect((await GET(request("Bearer otro"))).status).toBe(401);
  expect(expireOrders).not.toHaveBeenCalled();
  expect(cleanupAnonymousUsers).not.toHaveBeenCalled();
});

test("con el secreto: el resumen de los dos trabajos", async () => {
  const response = await GET(request("Bearer secreto"));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    expire: { checked: 1, cancelled: 1, recovered: 0, skipped: 0 },
    anonymous: { checked: 2, deleted: 2, dryRun: false },
  });
});

test("si falla la limpieza, los pedidos vencen igual (y al revés)", async () => {
  cleanupAnonymousUsers.mockRejectedValueOnce(new Error("bd"));
  let response = await GET(request("Bearer secreto"));
  expect(response.status).toBe(500);
  expect((await response.json()).expire).toEqual({ checked: 1, cancelled: 1, recovered: 0, skipped: 0 });

  expireOrders.mockRejectedValueOnce(new Error("bd"));
  response = await GET(request("Bearer secreto"));
  expect(response.status).toBe(500);
  expect((await response.json()).anonymous).toEqual({ checked: 2, deleted: 2, dryRun: false });
});
