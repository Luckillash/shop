import { afterEach, expect, test, vi } from "vitest";
import { clientIp, createRateLimiter, rateLimitKey, type RateLimitClient, type RateLimitRule } from "./rate-limit";

const rule: RateLimitRule = { action: "coupon", limit: 3, windowSeconds: 600 };

function fakeRedis() {
  const data = new Map<string, number>();
  const ttl = new Map<string, number>();
  const client: RateLimitClient = {
    get: async (key) => (data.has(key) ? String(data.get(key)) : null),
    incr: async (key) => {
      const next = (data.get(key) ?? 0) + 1;
      data.set(key, next);
      return next;
    },
    expire: async (key, seconds) => ttl.set(key, seconds),
  };
  return { client, ttl };
}

afterEach(() => {
  vi.restoreAllMocks();
});

test("bloquea al llegar al límite y la ventana empieza con el primer intento", async () => {
  const { client, ttl } = fakeRedis();
  const limiter = createRateLimiter(async () => client);

  for (let i = 0; i < 3; i++) {
    expect(await limiter.isLimited(rule, "1.2.3.4")).toBe(false);
    await limiter.hit(rule, "1.2.3.4");
  }
  expect(await limiter.isLimited(rule, "1.2.3.4")).toBe(true);
  expect(await limiter.isLimited(rule, "5.6.7.8")).toBe(false);
  expect(ttl.get(rateLimitKey(rule, "1.2.3.4"))).toBe(600);
  expect(ttl.size).toBe(1);
});

test("fail-open: si Redis falla o no responde a tiempo, deja pasar", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const failing = createRateLimiter(() => Promise.reject(new Error("ECONNREFUSED")));
  expect(await failing.isLimited(rule, "ip")).toBe(false);
  await expect(failing.hit(rule, "ip")).resolves.toBeUndefined();

  const hanging = createRateLimiter(() => new Promise<RateLimitClient>(() => {}), 20);
  expect(await hanging.isLimited(rule, "ip")).toBe(false);
});

test("clientIp toma la primera IP de x-forwarded-for", () => {
  expect(clientIp(new Headers({ "x-forwarded-for": "190.1.2.3, 10.0.0.1" }))).toBe("190.1.2.3");
  expect(clientIp(new Headers({ "x-real-ip": "190.9.9.9" }))).toBe("190.9.9.9");
  expect(clientIp(new Headers())).toBe("unknown");
});
