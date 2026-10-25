---
title: "Entorno local: instalación, ejecución y servidores MCP"
description: "Cómo levantar el proyecto (Redis, npm run dev), qué scripts existen, cómo verificar que funciona y qué servidores MCP tiene disponibles un agente."
keywords: ["instalación", "npm run dev", "build", "lint", "redis", "docker", "health", "mcp", "supabase", "flow", "transbank", ".mcp.json"]
related: ["07-referencia/variables-de-entorno.md", "07-referencia/recursos-externos.md", "02-arquitectura/vision-de-arquitectura.md"]
source: ["_archivo/avance-del-proyecto.md §5", "package.json", ".mcp.json", ".claude/settings.local.json"]
estado: "vigente"
---

# Entorno local

> **Úsalo cuando:** necesitas ejecutar, compilar o verificar el proyecto, o saber qué herramientas MCP tienes.

## Requisitos

- Node.js 24 y npm 11 (las versiones con que se creó el proyecto).
- Un Redis accesible: local con Docker o en la nube.
- Para la base de datos: el proyecto de Supabase `nswchmyzgcutyehhuche`. Todavía no se usa desde la app.

## Pasos

```bash
# 1. Redis local
docker run -d -p 6379:6379 redis

# 2. Variables de entorno (ver 07-referencia/variables-de-entorno.md)
#    .env.local debe tener al menos REDIS_URL

# 3. Dependencias y servidor de desarrollo
npm install
npm run dev          # http://localhost:3000
```

Para verificar, abre `http://localhost:3000/api/health`:

| Respuesta | Significado |
|---|---|
| `200 {"redis":"PONG"}` | Redis responde |
| `503 {"redis":"unavailable","error":"..."}` | No hay conexión con Redis. Revisa `REDIS_URL` y que el contenedor esté corriendo |

## Scripts

| Comando | Qué hace | Cuándo usarlo |
|---|---|---|
| `npm run dev` | `next dev` con Turbopack. También regenera el bloque de `AGENTS.md` y los tipos `PageProps`/`LayoutProps` | Desarrollo |
| `npm run build` | `next build`: compila y valida los tipos de TypeScript | **Antes de dar una tarea por terminada** |
| `npm run start` | Sirve el build de producción | Probar el build |
| `npm run lint` | `eslint` (flat config: `core-web-vitals` + `typescript`) | Antes de terminar |
| `npm test` | `vitest` en modo watch | Mientras desarrollas |
| `npm run test:run` | `vitest run`: una sola pasada, termina con código ≠ 0 si algo falla | Antes de terminar y en CI |

## Tests (Vitest)

- Configuración en `vitest.config.mts`: `@vitejs/plugin-react`, entorno `jsdom`, alias `@/` con `resolve.tsconfigPaths` (Vite 8 lo hace sin plugin) y `include: src/**/*.test.{ts,tsx}`.
- Los tests van **junto al archivo que prueban**: `src/lib/format/rut.ts` → `rut.test.ts`.
- Importa las funciones de forma explícita (`import { describe, expect, test } from "vitest"`). No hay globals.
- Componentes: `@testing-library/react` (`render`, `screen`). Ejemplo: `src/app/page.test.tsx`.
- **Vitest no soporta Server Components `async`.** Pruébalos con tests E2E (Playwright; hay una guía en `node_modules/next/dist/docs/01-app/02-guides/testing/`) o prueba por separado la lógica que usan.
- Fechas: fija el instante en UTC (`new Date("2026-10-25T01:00:00Z")`) y verifica la salida en `America/Santiago`. No dependas de la zona horaria de la máquina.

## Servidores MCP del proyecto

Están en `.mcp.json` y habilitados en `.claude/settings.local.json`.

| Servidor | Tipo | Qué ofrece | Notas |
|---|---|---|---|
| `supabase` | HTTP (`mcp.supabase.com`) | `docs`, `account`, `database`, `debugging`, `development`, `functions`, `branching` sobre el proyecto `nswchmyzgcutyehhuche` | Pide autenticación la primera vez. Con él puedes aplicar el SQL, listar tablas y revisar logs y advisors |
| `flow` | stdio (`../flow/mcp/server.js`) | Una herramienta por endpoint: `flow_payment_create`, `flow_payment_getStatus`, `flow_refund_create`… | **Sandbox**. Firma y `apiKey` se añaden solos. Recursos `flow-docs://` |
| `transbank` | stdio (`../transbank/mcp/server.js`) | `tbk_webpay_plus_create`, `tbk_webpay_plus_commit`, `tbk_webpay_plus_status`, `tbk_webpay_plus_refund`… | Ambiente de **integración**. Recursos `tbk-docs://` |

> Los MCP de pagos sirven para **probar y explorar** las APIs. La tienda debe llamar a Flow y Transbank desde su propio código de servidor ([06-implementacion/](../06-implementacion/)), no a través del MCP.

## Datos de prueba de pagos

| Pasarela | Tarjeta | Otros datos |
|---|---|---|
| Webpay Plus (integración) | VISA `4051885600446623`, CVV `123` (aprobada) · MASTERCARD `5186059559590568` (rechazada) | RUT `11.111.111-1`, clave `123`. Código de comercio `597055555532` |
| Flow (sandbox) | `4051885600446623`, CVV `123` | RUT `11111111-1`, clave `123`. Monto mínimo $350. **No uses `@example.com`** en `email`: Flow lo rechaza (código 1620) |
