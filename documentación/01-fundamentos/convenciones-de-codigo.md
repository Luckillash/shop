---
title: "Convenciones de código"
description: "Idioma, nombres, imports, separación servidor/cliente, estilos, manejo de dinero y fechas, y cómo dar una tarea por terminada."
keywords: ["convenciones", "naming", "idioma", "alias @/", "server-only", "use client", "css modules", "dinero", "CLP", "enteros", "fechas", "zona horaria", "definition of done"]
related: ["01-fundamentos/stack-y-versiones.md", "02-arquitectura/estructura-de-carpetas.md", "05-dominio/formatos-chile.md"]
source: ["src/lib/redis.ts", "src/store/cart-store.ts", "src/app/api/health/route.ts", "tsconfig.json", "_archivo/diseno-almacen.md §2.2, §6"]
estado: "vigente"
---

# Convenciones de código

> **Úsalo cuando:** vas a crear o editar archivos en `src/`. Sigue el estilo del código que ya existe.

## Idioma

| Qué | Idioma | Ejemplo |
|---|---|---|
| Identificadores (variables, funciones, tipos, archivos) | **Inglés** | `getRedis`, `useCartStore`, `CartItem`, `cart-store.ts` |
| Tablas y columnas SQL | **Inglés**, `snake_case` | `product_variants.compare_at_price` |
| Comentarios en código y SQL | **Español** | `// Reutiliza la conexión entre recargas en desarrollo (HMR)` |
| Textos de la interfaz | **Español de Chile**, se trata al cliente de tú y con *sentence case* | *Agregar al carro* (ver [04-diseno/principios-voz-y-accesibilidad.md](../04-diseno/principios-voz-y-accesibilidad.md)) |
| Mensajes de error de la base de datos | Español | `raise exception 'El carrito está vacío'` |
| Rutas URL | Español, en minúsculas y con guiones | `/carro`, `/checkout`, `/cuenta/pedidos` (ver [02-arquitectura/rutas-y-paginas.md](../02-arquitectura/rutas-y-paginas.md)) |
| Documentación | Español | Esta carpeta |

## Archivos y nombres

- Archivos y carpetas en `kebab-case`: `cart-store.ts`, `order-summary.tsx`.
- Componentes React en `PascalCase`, con un export nombrado por archivo: `export function OrderSummary()`. Las páginas y layouts usan `export default` (lo exige Next.js).
- Hooks de Zustand: `use<Nombre>Store`.
- Imports internos con el alias **`@/`** → `src/`: `import { getRedis } from "@/lib/redis"`.
- Comillas dobles, punto y coma, coma final en listas multilínea (el estilo de Prettier por defecto que ya usa el código).

## Servidor vs. cliente

- Todo módulo que use secretos, la base de datos o Redis debe empezar con **`import "server-only";`**.
- `"use client"` solo en hojas interactivas: botones, steppers, drawer, formularios con estado. Las páginas son Server Components.
- Las mutaciones van en **Server Actions** (`"use server"`), en archivos `actions.ts` junto a la ruta o en `src/lib/<dominio>/actions.ts`.
- Los Route Handlers (`route.ts`) solo se usan para lo que llega desde fuera: el retorno de Webpay, la confirmación de Flow, el health check y los crons.
- **Se vuelve a verificar la sesión dentro de cada Server Action y cada Route Handler.** El proxy y la UI no autorizan.
- Variables con prefijo `NEXT_PUBLIC_` = públicas (se incluyen en el bundle). Las llaves secretas nunca llevan ese prefijo.

## Estilos

- CSS Modules (`componente.module.css`) + tokens globales como variables CSS en `globals.css`.
- Usa los nombres de token del design system: `var(--surface)`, `var(--brand)`, `var(--space-4)`, `var(--radius-lg)`. No escribas colores en hex dentro de los módulos. Ver [04-diseno/tokens.md](../04-diseno/tokens.md).
- Tema oscuro con `@media (prefers-color-scheme: dark)` sobre los mismos tokens.

## Dinero

- **Los montos en CLP son enteros** en todo el código de la app: `number` sin decimales. El diseño, Webpay y Flow trabajan con enteros.
- En la base de datos los montos son `numeric(12,2)`. Al leerlos, normaliza con `Math.round(Number(x))`. Al enviarlos a una pasarela, envía un **entero**.
- Para mostrar un monto se usa siempre `formatCLP(amount)`, que devuelve `"$12.490"`. No armes el string a mano.
- El total se calcula en el servidor (en `place_order`), nunca en el cliente.

## Fechas

- La zona horaria del negocio es **`America/Santiago`**. Las fechas límite (por ejemplo, la reserva de 48 h) y las de entrega se calculan y se muestran en esa zona.
- En la base de datos se usa `timestamptz`. En la UI, fechas concretas: *Llega el jueves 24 de octubre* (ver [05-dominio/formatos-chile.md](../05-dominio/formatos-chile.md)).

## Comentarios

- Pocos y en español. Explican el *por qué*, no el *qué* (ver `src/lib/redis.ts`).

## Cuándo una tarea está terminada

1. `npm run build` termina sin errores (incluye la validación de TypeScript).
2. `npm run lint` no muestra errores.
3. `npm run test:run` pasa. Si agregaste lógica pura (formatos, cálculos, mapeos de estados de pago), agregaste su `*.test.ts` al lado ([entorno-local.md](entorno-local.md#tests-vitest)).
4. Si cambiaste el esquema: el SQL nuevo está en `03-base-de-datos/sql/` y está documentado en `03-base-de-datos/`.
5. Si la tarea cerró una brecha o tomó una decisión: actualiza [07-referencia/brechas-diseno-vs-datos.md](../07-referencia/brechas-diseno-vs-datos.md), [02-arquitectura/decisiones.md](../02-arquitectura/decisiones.md) y [08-estado/avance.md](../08-estado/avance.md).
