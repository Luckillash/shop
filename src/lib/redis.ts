import "server-only";
import { createClient, type RedisClientType } from "redis";

// Reutiliza la conexión entre recargas en desarrollo (HMR)
const globalForRedis = globalThis as unknown as {
  redisClient?: Promise<RedisClientType>;
};

/** Tiempo máximo para abrir el socket (también si el host no responde) */
const CONNECT_TIMEOUT_MS = 2000;

function connect(): Promise<RedisClientType> {
  let connected = false;
  const client: RedisClientType = createClient({
    url: process.env.REDIS_URL ?? "redis://localhost:6379",
    socket: {
      connectTimeout: CONNECT_TIMEOUT_MS,
      // Sin esto, node-redis reintenta la conexión inicial para siempre y connect() nunca
      // rechaza (trampa 53). La primera vez falla de inmediato; si se cae después de haber
      // conectado, reintenta con espera creciente (hasta 2 s).
      reconnectStrategy: (retries, cause) => (connected ? Math.min(retries * 100, 2000) : cause),
    },
    // Mientras está desconectado, los comandos fallan en vez de quedar en cola esperando
    disableOfflineQueue: true,
  });
  client.on("error", (err) => console.error("[redis]", err));
  client.on("ready", () => {
    connected = true;
  });
  return client.connect();
}

export function getRedis(): Promise<RedisClientType> {
  globalForRedis.redisClient ??= connect().catch((err) => {
    // No cachear una conexión fallida: se reintenta en la próxima llamada
    globalForRedis.redisClient = undefined;
    throw err;
  });
  return globalForRedis.redisClient;
}
