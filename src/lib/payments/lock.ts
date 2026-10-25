// Lock de confirmación de pago en Redis (D-005): SET lock:pay:<provider>:<token> NX EX 60 antes del
// commit de Webpay o del getStatus de Flow, y DEL al terminar. Así una recarga del retorno o una
// confirmación repetida de Flow no confirman dos veces el mismo intento (trampa 29).
// Fail-open: sin Redis se sigue, porque el lock de la BD (claim_payment) cubre lo mismo; Redis
// solo evita llegar hasta la BD. Sin "server-only" para probarlo con un cliente falso.

export type LockClient = {
  set(key: string, value: string, options: { NX: true; EX: number }): Promise<string | null>;
  del(key: string): Promise<unknown>;
};

/** acquired = este proceso confirma · busy = otro lo está haciendo · unavailable = sin Redis */
export type LockResult = "acquired" | "busy" | "unavailable";

const LOCK_SECONDS = 60;
const REDIS_TIMEOUT_MS = 500;

export function paymentLockKey(provider: string, token: string): string {
  return `lock:pay:${provider}:${token}`;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Redis no respondió en ${ms} ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function createPaymentLock(getClient: () => Promise<LockClient>, timeoutMs = REDIS_TIMEOUT_MS) {
  return {
    async acquire(provider: string, token: string): Promise<LockResult> {
      try {
        const reply = await withTimeout(
          getClient().then((client) => client.set(paymentLockKey(provider, token), "1", { NX: true, EX: LOCK_SECONDS })),
          timeoutMs,
        );
        return reply === "OK" ? "acquired" : "busy";
      } catch (error) {
        console.error("[payment-lock] Redis no disponible, sigue con el lock de la BD:", error);
        return "unavailable";
      }
    },
    async release(provider: string, token: string): Promise<void> {
      try {
        await withTimeout(
          getClient().then((client) => client.del(paymentLockKey(provider, token))),
          timeoutMs,
        );
      } catch {
        // Vence solo en LOCK_SECONDS
      }
    },
  };
}
