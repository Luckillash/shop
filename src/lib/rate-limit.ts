// Rate limiting con ventana fija en Redis (D-005): INCR + EXPIRE sobre rl:<acción>:<ip|usuario>.
// Fail-open: si Redis no responde a tiempo, deja pasar y lo registra. Lo crítico (cupones,
// stock, totales) lo vuelve a validar PostgreSQL, así que una caída de Redis no abre un agujero.
// Sin "server-only" para poder probarlo con un cliente falso: el cliente real lo pasa la acción.

/** Lo mínimo de node-redis que se usa */
export type RateLimitClient = {
  get(key: string): Promise<string | null>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
};

export type RateLimitRule = {
  /** "coupon" → rl:coupon:<id> */
  action: string;
  /** Intentos permitidos dentro de la ventana */
  limit: number;
  windowSeconds: number;
};

/** Aplicar cupón: 10 códigos inexistentes cada 10 minutos por IP */
export const COUPON_RATE_LIMIT: RateLimitRule = { action: "coupon", limit: 10, windowSeconds: 600 };

/** Ingresar: 10 intentos fallidos cada 15 minutos por IP (contra la fuerza bruta de contraseñas) */
export const LOGIN_RATE_LIMIT: RateLimitRule = { action: "login", limit: 10, windowSeconds: 900 };

/** Crear cuenta: 5 por hora por IP */
export const SIGNUP_RATE_LIMIT: RateLimitRule = { action: "signup", limit: 5, windowSeconds: 3600 };

/** *¿Olvidaste tu contraseña?*: 5 correos por hora por IP (cada uno envía un correo real) */
export const RESET_RATE_LIMIT: RateLimitRule = { action: "reset", limit: 5, windowSeconds: 3600 };

/** Comprar como invitado (sesiones anónimas de Supabase, D-008): 10 por hora por IP */
export const GUEST_RATE_LIMIT: RateLimitRule = { action: "guest", limit: 10, windowSeconds: 3600 };

/** Crear pedidos (cada uno reserva stock): 10 por hora por usuario */
export const ORDER_RATE_LIMIT: RateLimitRule = { action: "order", limit: 10, windowSeconds: 3600 };

/** Reintentar el pago o cambiar de medio (cada intento llama a la pasarela): 20 por hora por usuario */
export const PAYMENT_RATE_LIMIT: RateLimitRule = { action: "payment", limit: 20, windowSeconds: 3600 };

/** Cambiar la contraseña desde Datos personales: 5 intentos por hora por usuario (7.5) */
export const PASSWORD_RATE_LIMIT: RateLimitRule = { action: "password", limit: 5, windowSeconds: 3600 };

/** Publicar o editar una opinión (7.6): 10 por hora por usuario */
export const REVIEW_RATE_LIMIT: RateLimitRule = { action: "review", limit: 10, windowSeconds: 3600 };

const REDIS_TIMEOUT_MS = 500;

export function rateLimitKey(rule: RateLimitRule, id: string): string {
  return `rl:${rule.action}:${id}`;
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

export function createRateLimiter(getClient: () => Promise<RateLimitClient>, timeoutMs = REDIS_TIMEOUT_MS) {
  async function run<T>(fallback: T, task: (client: RateLimitClient) => Promise<T>): Promise<T> {
    try {
      return await withTimeout(
        getClient().then((client) => task(client)),
        timeoutMs,
      );
    } catch (error) {
      console.error("[rate-limit] Redis no disponible, se deja pasar:", error);
      return fallback;
    }
  }

  return {
    /** true si ya se alcanzó el límite (no cuenta un intento) */
    isLimited(rule: RateLimitRule, id: string): Promise<boolean> {
      return run(false, async (client) => Number((await client.get(rateLimitKey(rule, id))) ?? 0) >= rule.limit);
    },
    /** Cuenta un intento; la ventana empieza con el primero */
    hit(rule: RateLimitRule, id: string): Promise<void> {
      return run(undefined, async (client) => {
        const key = rateLimitKey(rule, id);
        const count = await client.incr(key);
        if (count === 1) await client.expire(key, rule.windowSeconds);
      });
    },
  };
}

/** IP del cliente desde los encabezados del proxy (en producción, el proxy debe sobrescribirlos) */
export function clientIp(headers: Pick<Headers, "get">): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}
