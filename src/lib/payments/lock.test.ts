import { describe, expect, it, vi } from "vitest";
import { createPaymentLock, paymentLockKey, type LockClient } from "./lock";

function fakeRedis(): LockClient & { keys: Map<string, string> } {
  const keys = new Map<string, string>();
  return {
    keys,
    async set(key, value, options) {
      if (options.NX && keys.has(key)) return null;
      keys.set(key, value);
      return "OK";
    },
    async del(key) {
      keys.delete(key);
      return 1;
    },
  };
}

describe("createPaymentLock", () => {
  it("una recarga del retorno no obtiene el lock mientras el commit sigue en curso (D-005)", async () => {
    const redis = fakeRedis();
    const lock = createPaymentLock(async () => redis);
    expect(await lock.acquire("webpay", "tok")).toBe("acquired");
    expect(redis.keys.has(paymentLockKey("webpay", "tok"))).toBe(true);
    expect(await lock.acquire("webpay", "tok")).toBe("busy");
    // Otro token u otra pasarela no se bloquean
    expect(await lock.acquire("flow", "tok")).toBe("acquired");
    await lock.release("webpay", "tok");
    expect(await lock.acquire("webpay", "tok")).toBe("acquired");
  });

  it("sin Redis es fail-open: unavailable (sigue el lock de la BD)", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const lock = createPaymentLock(() => Promise.reject(new Error("ECONNREFUSED")));
    expect(await lock.acquire("webpay", "tok")).toBe("unavailable");
    await expect(lock.release("webpay", "tok")).resolves.toBeUndefined();
    error.mockRestore();
  });

  it("si Redis no responde a tiempo, también es unavailable", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const lock = createPaymentLock(() => new Promise<LockClient>(() => {}), 10);
    expect(await lock.acquire("flow", "tok")).toBe("unavailable");
    error.mockRestore();
  });
});
